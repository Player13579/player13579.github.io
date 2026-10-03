import { DURATION_MS, packUniforms, sample } from './plan.mjs';
import { WORLD_WGSL, POST_WGSL } from './shader.mjs';

const TARGET_FORMAT = 'rgba16float';
const UNIFORM_BYTES = 32 * Float32Array.BYTES_PER_ELEMENT;
const BUFFER_UNIFORM_COPY = 0x0040 | 0x0008;
const TARGET_USAGE = 0x0004 | 0x0010;
const FULL_RGBA = 0xf;
const requireValue = (value, message) => { if (!value) throw new Error(message); return value; };
const dimensions = canvas => {
  const dpr = Math.max(1, Number(globalThis.devicePixelRatio) || 1);
  const width=Math.max(1,Math.round((canvas.clientWidth||960)*dpr));
  const height=Math.max(1,Math.round((canvas.clientHeight||480)*dpr));
  return { width,height,scale:0.9*Math.min(width/960,height/480),devicePixelRatio:dpr };
};
const compileMessages = info => (info?.messages || []).map(m => ({ type: m.type || 'unknown',
  line: m.lineNum || 0, column: m.linePos || 0, message: String(m.message || '').slice(0, 1000) }));

export async function createExcaliburZeroRenderer(canvas, { gpu = globalThis.navigator?.gpu,
  onDiagnostic = () => {} } = {}) {
  requireValue(canvas?.getContext, 'WebGPU canvas required');
  requireValue(gpu?.requestAdapter, 'WebGPU unsupported');
  const snapshot = { adapter: 'pending', device: 'pending', pipeline: 'pending', disposed: false,
    deviceLost: false, viewport: { width: 0, height: 0, scale: 1 }, submittedFrames: 0,
    completedFrames: 0, latestSubmittedFrame: null, latestCompletedFrame: null,
    compilationMessages: [], errors: [], warnings: [] };
  const adapter = requireValue(await gpu.requestAdapter(), 'No WebGPU adapter available');
  snapshot.adapter = 'ready';
  const device = await adapter.requestDevice();
  try {
  snapshot.device = 'ready';
  const context = requireValue(canvas.getContext('webgpu'), 'Canvas has no WebGPU context');
  const presentationFormat = gpu.getPreferredCanvasFormat();
  context.configure({ device, format: presentationFormat, alphaMode: 'opaque' });
  let disposed = false, lost = false, resizeObserver = null;
  let worldUniform = null, postUniform = null, sampler = null;
  let worldPipeline = null, postPipeline = null, worldRadiance = null, worldKeySource = null;
  let radianceView = null, keySourceView = null, worldBindGroup = null, postBindGroup = null;
  let lifetime = Promise.resolve();
  let pendingGPU = Promise.resolve();
  let extent = { width: 0, height: 0, scale: 1 };
  const report = (type, error) => {
    const record = Object.freeze({ type, message: String(error?.message || error).slice(0, 1200) });
    if (type === 'error' || type === 'device-lost') snapshot.errors.push(record);
    else snapshot.warnings.push(record);
    if (snapshot.errors.length > 32) snapshot.errors.shift();
    if (snapshot.warnings.length > 32) snapshot.warnings.shift();
    try { onDiagnostic(record); } catch { /* diagnostic observers cannot interrupt rendering */ }
  };
  device.addEventListener?.('uncapturederror', event => report('error', event.error || event));
  device.lost?.then(info => {
    if (disposed) return;
    lost = true; snapshot.deviceLost = true; snapshot.device = 'lost';
    report('device-lost', `WebGPU device lost (${info?.reason || 'unknown'}): ${info?.message || ''}`);
  }).catch(error => report('error', error));

  const worldModule = device.createShaderModule({ label: 'Excalibur zero WORLD radiance+key-source', code: WORLD_WGSL });
  const postModule = device.createShaderModule({ label: 'Excalibur zero POST flare+ghost', code: POST_WGSL });
  for (const [label, module] of [['WORLD', worldModule], ['POST', postModule]]) {
    if (!module.getCompilationInfo) continue;
    const messages = compileMessages(await module.getCompilationInfo());
    snapshot.compilationMessages.push(...messages.map(row => ({ ...row, module: label })));
    const errors = messages.filter(row => row.type === 'error');
    snapshot.warnings.push(...messages.filter(row => row.type === 'warning').map(row => ({ ...row, module: label })));
    if (errors.length) throw new Error(`${label} WGSL compile error: ${errors.map(row => `${row.line}:${row.column} ${row.message}`).join('; ')}`);
  }
  const worldLayout = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: 2,
    buffer: { type: 'uniform', minBindingSize: UNIFORM_BYTES } }] });
  const postLayout = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: 2, buffer: { type: 'uniform', minBindingSize: UNIFORM_BYTES } },
    { binding: 1, visibility: 2, texture: { sampleType: 'float' } },
    { binding: 2, visibility: 2, texture: { sampleType: 'float' } },
    { binding: 3, visibility: 2, sampler: { type: 'filtering' } },
  ] });
  const worldLayoutGroup = device.createPipelineLayout({ bindGroupLayouts: [worldLayout] });
  const postLayoutGroup = device.createPipelineLayout({ bindGroupLayouts: [postLayout] });
  worldUniform = device.createBuffer({ label: 'Excalibur zero 32-float WORLD uniform', size: UNIFORM_BYTES, usage: BUFFER_UNIFORM_COPY });
  postUniform = device.createBuffer({ label: 'Excalibur zero 32-float POST uniform', size: UNIFORM_BYTES, usage: BUFFER_UNIFORM_COPY });
  sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });

  const validationScope = async build => {
    device.pushErrorScope?.('validation');
    let result;
    try { result = await build(); }
    catch (error) { try { await device.popErrorScope?.(); } catch {} throw error; }
    const scoped = await device.popErrorScope?.();
    if (scoped) throw new Error(scoped.message || 'WebGPU validation failure');
    return result;
  };
  worldPipeline = await validationScope(() => device.createRenderPipelineAsync({
    label: 'Excalibur zero WORLD two-target pipeline', layout: worldLayoutGroup,
    vertex: { module: worldModule, entryPoint: 'vs' }, fragment: { module: worldModule, entryPoint: 'fs', targets: [
      { format: TARGET_FORMAT, writeMask: FULL_RGBA }, { format: TARGET_FORMAT, writeMask: FULL_RGBA },
    ] }, primitive: { topology: 'triangle-list' },
  }));
  postPipeline = await validationScope(() => device.createRenderPipelineAsync({
    label: 'Excalibur zero POST radiance+key-source pipeline', layout: postLayoutGroup,
    vertex: { module: postModule, entryPoint: 'vs' }, fragment: { module: postModule, entryPoint: 'fs', targets: [{ format: presentationFormat }] },
    primitive: { topology: 'triangle-list' },
  }));
  snapshot.pipeline = 'ready';

  const destroyTarget = target => { try { target?.destroy(); } catch {} };
  function rebuildTargets() {
    if (disposed || lost) return;
    const next = dimensions(canvas);
    if (next.width === extent.width && next.height === extent.height && next.scale === extent.scale) return;
    const previous = [worldRadiance, worldKeySource];
    extent = next; Object.assign(snapshot.viewport, next);
    canvas.width = next.width; canvas.height = next.height;
    worldRadiance = device.createTexture({ label: 'Excalibur zero linear radiance', size: [next.width, next.height],
      format: TARGET_FORMAT, usage: TARGET_USAGE });
    worldKeySource = device.createTexture({ label: 'Excalibur zero isolated hand key-source', size: [next.width, next.height],
      format: TARGET_FORMAT, usage: TARGET_USAGE });
    radianceView = worldRadiance.createView(); keySourceView = worldKeySource.createView();
    worldBindGroup = device.createBindGroup({ layout: worldLayout, entries: [{ binding: 0, resource: { buffer: worldUniform } }] });
    postBindGroup = device.createBindGroup({ layout: postLayout, entries: [
      { binding: 0, resource: { buffer: postUniform } }, { binding: 1, resource: radianceView },
      { binding: 2, resource: keySourceView }, { binding: 3, resource: sampler },
    ] });
    if (previous.some(Boolean)) {
      const retire = Promise.all([lifetime,pendingGPU]).then(() => previous.forEach(destroyTarget));
      lifetime = retire.catch(error => report('error', error));
    }
  }
  rebuildTargets();
  if (globalThis.ResizeObserver) {
    resizeObserver = new ResizeObserver(rebuildTargets); resizeObserver.observe(canvas);
  }

  function immutableSnapshot() {
    return Object.freeze({ ...snapshot, viewport: Object.freeze({ ...snapshot.viewport }),
      latestSubmittedFrame: snapshot.latestSubmittedFrame && Object.freeze({ ...snapshot.latestSubmittedFrame }),
      latestCompletedFrame: snapshot.latestCompletedFrame && Object.freeze({ ...snapshot.latestCompletedFrame }),
      compilationMessages: Object.freeze(snapshot.compilationMessages.map(row => Object.freeze({ ...row }))),
      errors: Object.freeze(snapshot.errors.map(row => Object.freeze({ ...row }))),
      warnings: Object.freeze(snapshot.warnings.map(row => Object.freeze({ ...row }))) });
  }
  function render(receipt, effectAgeMs, { view = {}, controls = {}, causeGeneration = 0, causeId = receipt?.causeId } = {}) {
    if (disposed) throw new Error('renderer disposed');
    if (lost) throw new Error('WebGPU device lost');
    if (snapshot.errors.length) throw new Error(`WebGPU runtime error: ${snapshot.errors.at(-1).message}`);
    rebuildTargets();
    if (extent.width <= 0 || extent.height <= 0) throw new Error('positive presentation extent required');
    const effectiveView = { ...view, width: extent.width, height: extent.height, scale: extent.scale };
    const uniforms = packUniforms(receipt, effectAgeMs, effectiveView, controls);
    if (!(uniforms instanceof Float32Array) || uniforms.length !== 32 || uniforms.byteLength !== UNIFORM_BYTES)
      throw new Error('frozen plan returned an invalid 32-float uniform ABI');
    const sampled = sample(receipt, effectAgeMs, controls);
    const uniformAge = uniforms[2];
    device.queue.writeBuffer(worldUniform, 0, uniforms);
    device.queue.writeBuffer(postUniform, 0, uniforms);
    device.pushErrorScope?.('validation');
    let encoder;
    try {
      encoder = device.createCommandEncoder({ label: 'Excalibur zero WORLD MRT + POST' });
      const worldPass = encoder.beginRenderPass({ label: 'WORLD: clear radiance and key-source; draw source-bound E', colorAttachments: [
        { view: radianceView, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } },
        { view: keySourceView, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } },
      ] });
      worldPass.setPipeline(worldPipeline); worldPass.setBindGroup(0, worldBindGroup); worldPass.draw(3); worldPass.end();
      const postPass = encoder.beginRenderPass({ label: 'POST: source-driven flare and internal-reflection ghosts', colorAttachments: [
        { view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0.025, g: 0.035, b: 0.06, a: 1 } },
      ] });
      postPass.setPipeline(postPipeline); postPass.setBindGroup(0, postBindGroup); postPass.draw(3); postPass.end();
      device.queue.submit([encoder.finish()]);
    } catch (error) {
      void device.popErrorScope?.().catch?.(() => {}); throw error;
    }
    const sequence = ++snapshot.submittedFrames;
    const frame = { sequence, causeId: String(causeId || ''), causeGeneration,
      effectAgeMs: Number(effectAgeMs), uniformAge, source: Object.freeze({ ...receipt.source }),
      pathEnd: Object.freeze({ ...receipt.pathEnd }), direction: Object.freeze({ ...receipt.direction }),
      controls: Object.freeze({ ...controls }), view: Object.freeze({ ...effectiveView, hand:Object.freeze({ ...effectiveView.hand }), opticalCenter:Object.freeze({ ...effectiveView.opticalCenter }) }), viewport: Object.freeze({ ...extent }),
      presentationFormat, worldFormat: TARGET_FORMAT, targetCount: 2, passes: 2,
      submitted: true, completed: false };
    snapshot.latestSubmittedFrame = frame;
    const gpuDone = device.queue.onSubmittedWorkDone();
    pendingGPU = gpuDone.catch(() => {});
    const completion = gpuDone.then(async () => {
      const scopeError = await device.popErrorScope?.();
      if (scopeError) throw new Error(scopeError.message || 'GPU validation scope failed after submit');
      if (sequence > snapshot.completedFrames) snapshot.completedFrames = sequence;
      const completed = { ...frame, completed: true, completedAt: performance.now() };
      snapshot.latestCompletedFrame = completed;
      return Object.freeze(completed);
    }).catch(error => { report('error', error); throw error; });
    return Object.freeze({ ...frame, completion });
  }
  async function dispose() {
    if (disposed) return;
    disposed = true; snapshot.disposed = true; resizeObserver?.disconnect(); resizeObserver = null;
    try { await device.queue.onSubmittedWorkDone(); await pendingGPU; } catch (error) { report('warning', error); }
    await lifetime;
    destroyTarget(worldRadiance); destroyTarget(worldKeySource);
    worldRadiance = worldKeySource = radianceView = keySourceView = worldBindGroup = postBindGroup = null;
    try { worldUniform?.destroy(); } catch {} try { postUniform?.destroy(); } catch {}
    worldUniform = postUniform = null;
    try { device.destroy(); } catch {}
  }
  return Object.freeze({ render, dispose, get snapshot() { return immutableSnapshot(); },
    get device() { return device; }, get extent() { return Object.freeze({ ...extent }); }, get durationMs() { return DURATION_MS; } });
  } catch (error) {
    // Until the renderer is returned, this initializer owns the acquired device.
    // Releasing it here covers shader compilation, layout, pipeline, and target failures.
    try { resizeObserver?.disconnect(); } catch {}
    try { device.destroy(); } catch {}
    throw error;
  }
}
