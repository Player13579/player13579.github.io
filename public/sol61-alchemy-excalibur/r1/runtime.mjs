import { DURATION_MS, VARIANTS, freezeReceipt, makeFixture, packUniforms, sample } from './plan.mjs';
import { WORLD_WGSL, POST_WGSL } from './shader.mjs';

const WORLD_FORMAT = 'rgba16float';
const BUFFER_UNIFORM_COPY = 0x0040 | 0x0008;
const TEXTURE_BINDING_RENDER = 0x0004 | 0x0010;
const FULL_RGBA = 0xf;

function requireValue(value, message) { if (!value) throw new Error(message); return value; }
function dims(canvas) {
  const dpr = Math.max(1, Number(globalThis.devicePixelRatio) || 1);
  return { width: Math.max(1, Math.round((canvas.clientWidth || 980) * dpr)),
    height: Math.max(1, Math.round((canvas.clientHeight || 620) * dpr)), scale: dpr };
}
function compilationErrors(info) {
  return (info?.messages || []).filter(row => row.type === 'error').map(row =>
    `${row.lineNum || 0}:${row.linePos || 0} ${row.message}`);
}

export async function createExcaliburRenderer(canvas, { gpu = globalThis.navigator?.gpu,
  onDiagnostic = () => {} } = {}) {
  requireValue(canvas?.getContext, 'WebGPU canvas is required');
  requireValue(gpu?.requestAdapter, 'WebGPU is unsupported');
  const diagnostics = { adapter: 'pending', device: 'pending', pipeline: 'pending',
    submittedFrames: 0, completedFrames: 0, errors: [], warnings: [], lastFrame: null };
  const adapter = requireValue(await gpu.requestAdapter(), 'No WebGPU adapter');
  diagnostics.adapter = 'ready';
  const device = await adapter.requestDevice();
  diagnostics.device = 'ready';
  let disposed = false;
  let lost = false;
  let worldTexture = null;
  let worldView = null;
  let worldUniform = null;
  let postUniform = null;
  let worldPipeline = null;
  let postPipeline = null;
  let worldBindGroup = null;
  let postBindGroup = null;
  let sampler = null;
  let resizeObserver = null;
  let lifetime = Promise.resolve();
  const size = { width: 0, height: 0, scale: 1 };
  const context = requireValue(canvas.getContext('webgpu'), 'Canvas has no WebGPU context');
  const format = gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });
  const reportError = error => {
    const message = error?.message || String(error);
    diagnostics.errors.push(message);
    diagnostics.errors = diagnostics.errors.slice(-64);
    onDiagnostic(Object.freeze({ type: 'error', message }));
  };
  device.addEventListener?.('uncapturederror', event => reportError(event.error || event));
  device.lost?.then(info => {
    if (disposed) return;
    lost = true;
    reportError(new Error(`WebGPU device lost: ${info?.reason || 'unknown'} ${info?.message || ''}`));
  }).catch(reportError);

  const worldModule = device.createShaderModule({ label: 'excalibur PH1 world', code: WORLD_WGSL });
  const postModule = device.createShaderModule({ label: 'excalibur OBS1 post', code: POST_WGSL });
  for (const [label, module] of [['world', worldModule], ['post', postModule]]) {
    if (module.getCompilationInfo) {
      const info = await module.getCompilationInfo();
      const errors = compilationErrors(info);
      if (errors.length) throw new Error(`${label} WGSL compilation failed: ${errors.join('; ')}`);
      diagnostics.warnings.push(...(info.messages || []).filter(row => row.type === 'warning').map(row => `${label}: ${row.message}`));
    }
  }

  const worldLayout = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: 2,
    buffer: { type: 'uniform', minBindingSize: 128 } }] });
  const postLayout = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: 2, buffer: { type: 'uniform', minBindingSize: 128 } },
    { binding: 1, visibility: 2, texture: { sampleType: 'float' } },
    { binding: 2, visibility: 2, sampler: { type: 'filtering' } }
  ] });
  const worldPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [worldLayout] });
  const postPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [postLayout] });
  const validationScope = async build => {
    device.pushErrorScope?.('validation');
    let value;
    try { value = await build(); }
    catch (error) { try { await device.popErrorScope?.(); } catch {} throw error; }
    const scopeError = await device.popErrorScope?.();
    if (scopeError) throw new Error(scopeError.message || 'WebGPU pipeline validation failed');
    return value;
  };
  worldPipeline = await validationScope(() => device.createRenderPipelineAsync({
    label: 'excalibur PH1 additive world', layout: worldPipelineLayout,
    vertex: { module: worldModule, entryPoint: 'vertexMain' },
    fragment: { module: worldModule, entryPoint: 'fragmentMain', targets: [{ format: WORLD_FORMAT,
      blend: { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
        alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } }, writeMask: FULL_RGBA }] },
    primitive: { topology: 'triangle-list' }
  }));
  postPipeline = await validationScope(() => device.createRenderPipelineAsync({
    label: 'excalibur OBS1 source-bound post', layout: postPipelineLayout,
    vertex: { module: postModule, entryPoint: 'vertexMain' },
    fragment: { module: postModule, entryPoint: 'fragmentMain', targets: [{ format }] },
    primitive: { topology: 'triangle-list' }
  }));
  diagnostics.pipeline = 'ready';
  worldUniform = device.createBuffer({ label: 'excalibur world params', size: 128, usage: BUFFER_UNIFORM_COPY });
  postUniform = device.createBuffer({ label: 'excalibur post params', size: 128, usage: BUFFER_UNIFORM_COPY });
  sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });

  function rebuildWorldTarget() {
    if (disposed || lost) return;
    const next = dims(canvas);
    if (next.width === size.width && next.height === size.height && next.scale === size.scale) return;
    const old = worldTexture;
    Object.assign(size, next);
    canvas.width = next.width; canvas.height = next.height;
    worldTexture = device.createTexture({ label: 'excalibur PH1 linear HDR source', size: [next.width, next.height],
      format: WORLD_FORMAT, usage: TEXTURE_BINDING_RENDER });
    worldView = worldTexture.createView();
    worldBindGroup = device.createBindGroup({ layout: worldLayout, entries: [{ binding: 0, resource: { buffer: worldUniform } }] });
    postBindGroup = device.createBindGroup({ layout: postLayout, entries: [
      { binding: 0, resource: { buffer: postUniform } }, { binding: 1, resource: worldView }, { binding: 2, resource: sampler }
    ] });
    if (old) {
      const retire = lifetime.then(() => { try { old.destroy(); } catch {} });
      lifetime = retire.catch(reportError);
    }
  }
  rebuildWorldTarget();
  if (globalThis.ResizeObserver) {
    resizeObserver = new ResizeObserver(rebuildWorldTarget);
    resizeObserver.observe(canvas);
  }

  async function render(receipt, effectClockNow, options = {}) {
    if (disposed) throw new Error('renderer disposed');
    if (lost) throw new Error('WebGPU device is lost');
    if (diagnostics.errors.length) throw new Error(`WebGPU diagnostic: ${diagnostics.errors.at(-1)}`);
    rebuildWorldTarget();
    const p = sample(receipt, effectClockNow, options);
    const uniforms = packUniforms(receipt, effectClockNow, { ...options, width: size.width, height: size.height, scale: size.scale });
    device.queue.writeBuffer(worldUniform, 0, uniforms);
    device.queue.writeBuffer(postUniform, 0, uniforms);
    device.pushErrorScope?.('validation');
    let encoder;
    try {
      encoder = device.createCommandEncoder({ label: 'excalibur single-frame PH1 + OBS1' });
      const worldPass = encoder.beginRenderPass({ label: 'PH1 world', colorAttachments: [{ view: worldView,
        loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
      worldPass.setPipeline(worldPipeline); worldPass.setBindGroup(0, worldBindGroup); worldPass.draw(3); worldPass.end();
      const postPass = encoder.beginRenderPass({ label: 'OBS1 to presentation', colorAttachments: [{
        view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store',
        clearValue: { r: 0.018, g: 0.027, b: 0.041, a: 1 }
      }] });
      postPass.setPipeline(postPipeline); postPass.setBindGroup(0, postBindGroup); postPass.draw(3); postPass.end();
      device.queue.submit([encoder.finish()]);
      diagnostics.submittedFrames += 1;
    } catch (error) {
      try { await device.popErrorScope?.(); } catch {}
      reportError(error); throw error;
    }
    let scopeResult;
    try { scopeResult = device.popErrorScope?.(); }
    catch (error) { reportError(error); throw error; }
    const completed = Promise.all([Promise.resolve(scopeResult), device.queue.onSubmittedWorkDone()]).then(([scopeError]) => {
      if (scopeError) throw new Error(scopeError.message || 'WebGPU validation error after submission');
      diagnostics.completedFrames += 1;
      diagnostics.lastFrame = Object.freeze({ id: receipt.id, age: p.age, submitted: true, completed: true, passes: 2,
        width: size.width, height: size.height, queue: 'completed' });
      return diagnostics.lastFrame;
    }).catch(error => { reportError(error); throw error; });
    lifetime = completed.catch(() => {});
    const submitted = Object.freeze({ id: receipt.id, age: p.age, submitted: true, completed: false, passes: 2,
      width: size.width, height: size.height, queue: 'pending', completion: completed });
    diagnostics.lastFrame = submitted;
    return submitted;
  }

  async function dispose() {
    if (disposed) return;
    disposed = true;
    resizeObserver?.disconnect(); resizeObserver = null;
    try { await lifetime; } catch {}
    try { await device.queue.onSubmittedWorkDone(); } catch (error) { reportError(error); }
    try { worldTexture?.destroy(); } catch {}
    try { worldUniform?.destroy(); postUniform?.destroy(); } catch {}
    try { context.unconfigure?.(); } catch {}
    try { device.destroy?.(); } catch {}
  }

  return Object.freeze({ render, dispose, get snapshot() { return Object.freeze({ ...diagnostics,
    errors: Object.freeze([...diagnostics.errors]), warnings: Object.freeze([...diagnostics.warnings]),
    width: size.width, height: size.height, deviceLost: lost }); }, get device() { return device; } });
}

export { DURATION_MS, VARIANTS, freezeReceipt, makeFixture, sample, packUniforms };
