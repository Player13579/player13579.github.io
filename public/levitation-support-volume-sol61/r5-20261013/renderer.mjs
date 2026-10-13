import { uniformFor, VERSION } from './model.mjs';

const SOURCE_URL = new URL('./source.wgsl', import.meta.url);
const GAUSSIAN_X_URL = new URL('./gaussian-x.wgsl', import.meta.url);
const OBSERVER_URL = new URL('./observer.wgsl', import.meta.url);
const SCENE_WGSL = /* wgsl */`
struct Scene { viewport: vec2f, body: vec2f, feet: vec2f, bright: f32, pad: f32 };
@group(0) @binding(0) var<uniform> s: Scene;
struct VOut { @builtin(position) position: vec4f };
@vertex fn vsMain(@builtin(vertex_index) i:u32)->VOut {
  let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o:VOut; o.position=vec4f(p[i],0.,1.); return o;
}
fn sdSegment(p:vec2f,a:vec2f,b:vec2f,r:f32)->f32 {
  let d=b-a; let t=clamp(dot(p-a,d)/max(dot(d,d),.0001),0.,1.); return length(p-(a+t*d))-r;
}
fn ellipse(p:vec2f,c:vec2f,r:vec2f)->f32 { return (length((p-c)/r)-1.)*min(r.x,r.y); }
@fragment fn fsMain(@builtin(position) frag:vec4f)->@location(0) vec4f {
  let p=frag.xy; let span=s.feet-s.body;
  let scale=max(.01,length(span)/32.);
  let head=ellipse(p,s.body-vec2f(0.,24.*scale),vec2f(6.8,8.)*scale);
  let torso=sdSegment(p,s.body-vec2f(0.,10.*scale),s.body+vec2f(0.,12.*scale),5.3*scale);
  let shoulder=s.body-vec2f(0.,7.*scale); let hip=s.body+vec2f(0.,11.*scale);
  let armL=sdSegment(p,shoulder,shoulder+vec2f(-10.,12.)*scale,2.5*scale);
  let armR=sdSegment(p,shoulder,shoulder+vec2f(10.,12.)*scale,2.5*scale);
  let legL=sdSegment(p,hip+vec2f(-2.,0.)*scale,s.feet+vec2f(-4.,-2.8)*scale,2.8*scale);
  let legR=sdSegment(p,hip+vec2f(2.,0.)*scale,s.feet+vec2f(4.,-2.8)*scale,2.8*scale);
  let d=min(min(head,torso),min(min(armL,armR),min(legL,legR)));
  let mask=1.-smoothstep(-.7*scale,.7*scale,d);
  let dark=s.bright<.5;
  let bg=select(vec3f(.88,.92,.96),vec3f(.035,.052,.075),dark);
  let subject=select(vec3f(.16,.20,.27),vec3f(.61,.70,.79),dark);
  // A flat diagnostic backdrop has no inferred floor or game-world geometry.
  let wash=0.025*(1.-clamp(p.y/max(s.viewport.y,1.),0.,1.));
  let background=bg+vec3f(wash);
  let color=mix(background,subject,mask);
  
  return vec4f(color,1.);
}
`;

async function shaderSource(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`shader fetch failed (${response.status}): ${url.pathname}`);
  return await response.text();
}
function compileInfo(module, label) {
  return module.getCompilationInfo().then(info => {
    const errors = info.messages.filter(m => m.type === 'error');
    if (errors.length) throw new Error(`${label} WGSL compile failed: ${errors.map(e => `${e.lineNum}:${e.linePos} ${e.message}`).join('; ')}`);
    return { label, warnings: info.messages.filter(m => m.type === 'warning').length };
  });
}

export async function createLevitationRenderer({ canvas, verify = false, onDeviceLost = () => {}, onProgress = () => {}, onDeviceCreated = () => {} } = {}) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('canvas #effect required');
  if (!navigator.gpu) throw new Error('WebGPU is required for Levitation E');
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('WebGPU adapter unavailable');
  onProgress('adapter');
  const device = await adapter.requestDevice();
  onProgress('device');
  const context = canvas.getContext('webgpu');
  if (!context) throw new Error('canvas WebGPU context unavailable');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });
  onDeviceCreated(device, context);
  const [sourceCode, gaussianCode, observerCode] = await Promise.all([
    shaderSource(SOURCE_URL), shaderSource(GAUSSIAN_X_URL), shaderSource(OBSERVER_URL)
  ]);
  onProgress('assets');
  const sourceModule = device.createShaderModule({ label: `${VERSION} source`, code: sourceCode });
  const gaussianModule = device.createShaderModule({ label: `${VERSION} Gaussian X`, code: gaussianCode });
  const observerModule = device.createShaderModule({ label: `${VERSION} observer`, code: observerCode });
  const sceneModule = device.createShaderModule({ label: `${VERSION} synthetic opaque fixture`, code: SCENE_WGSL });
  const infos = await Promise.all([
    compileInfo(sourceModule, 'source'), compileInfo(gaussianModule, 'Gaussian X'),
    compileInfo(observerModule, 'observer'), compileInfo(sceneModule, 'fixture scene')
  ]);
  const fullScreen = module => ({
    layout: 'auto', vertex: { module, entryPoint: 'vsMain' },
    fragment: { module, entryPoint: 'fsMain', targets: [{ format: 'rgba16float' }] },
    primitive: { topology: 'triangle-list' }
  });
  const sourcePipeline = device.createRenderPipeline(fullScreen(sourceModule));
  const gaussianPipeline = device.createRenderPipeline(fullScreen(gaussianModule));
  const observerPipeline = device.createRenderPipeline({
    layout: 'auto', vertex: { module: observerModule, entryPoint: 'vsMain' },
    fragment: { module: observerModule, entryPoint: 'fsMain', targets: [{ format }] },
    primitive: { topology: 'triangle-list' }
  });
  const scenePipeline = device.createRenderPipeline({
    layout: 'auto', vertex: { module: sceneModule, entryPoint: 'vsMain' },
    fragment: { module: sceneModule, entryPoint: 'fsMain', targets: [{ format: 'rgba16float' }] },
    primitive: { topology: 'triangle-list' }
  });
  onProgress('pipelines');
  const uniformBuffer = device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const sceneBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  let textures = null, physical = null, disposed = false, submission = 0, latestFence = Promise.resolve(null), lastReceipt = null;
  let deviceLost = null, resolveLost;
  const deviceLostSettled = new Promise(resolve => { resolveLost = resolve; });
  device.lost.then(info => { deviceLost = { reason: info.reason, message: info.message }; onDeviceLost(deviceLost); resolveLost(deviceLost); });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    if (physical?.width === width && physical?.height === height) return { width, height, pixelRatio: dpr };
    if (textures) for (const t of Object.values(textures)) t.destroy();
    const createTexture = label => device.createTexture({
      label, size: [width, height], format: 'rgba16float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    });
    textures = { scene: createTexture('synthetic opaque scene input'), source: createTexture('Levitation HDR source'), gaussian: createTexture('Levitation Gaussian X') };
    physical = { width, height };
    return { width, height, pixelRatio: dpr };
  }
  function bind(pipeline, entries) {
    return device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries });
  }
  function pass(encoder, label, view, pipeline, group) {
    const p = encoder.beginRenderPass({ label, colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    p.setPipeline(pipeline); p.setBindGroup(0, group); p.draw(3); p.end();
  }

  async function render({ actor, nowMs, sourceOn = true, observerOn = true, reducedMotion = false, brightBackground = false } = {}) {
    if (disposed) throw new Error('Levitation renderer disposed');
    if (deviceLost) throw new Error(`WebGPU device lost: ${deviceLost.reason}`);
    const viewport = resize();
    const computed = uniformFor({ actor, nowMs, width: viewport.width, height: viewport.height, pixelRatio: viewport.pixelRatio,
      sourceOn, observerOn, reducedMotion });
    device.queue.writeBuffer(uniformBuffer, 0, computed.uniformBytes);
    const sceneUniform = new Float32Array([viewport.width, viewport.height,
      viewport.width * 0.5, Math.max(32 * viewport.pixelRatio, viewport.height * 0.4166667),
      viewport.width * 0.5, Math.max(32 * viewport.pixelRatio, viewport.height * 0.5055556),
      Number(brightBackground), 0]);
    // Fixture-only geometry: the measured axis is 32 CSS px and the head extends 32 px above it.
    // This renders 64 CSS px of visible silhouette without inferring a floor.
    sceneUniform[2] = computed.uniform[6]; sceneUniform[3] = computed.uniform[7];
    sceneUniform[4] = computed.uniform[4]; sceneUniform[5] = computed.uniform[5];
    device.queue.writeBuffer(sceneBuffer, 0, sceneUniform);
    const sourceView = textures.source.createView(), gaussianView = textures.gaussian.createView(), sceneView = textures.scene.createView();
    const sceneGroup = bind(scenePipeline, [{ binding: 0, resource: { buffer: sceneBuffer } }]);
    const sourceGroup = bind(sourcePipeline, [{ binding: 0, resource: { buffer: uniformBuffer } }]);
    const gaussianGroup = bind(gaussianPipeline, [{ binding: 0, resource: { buffer: uniformBuffer } }, { binding: 1, resource: textures.source.createView() }]);
    const observerGroup = bind(observerPipeline, [
      { binding: 0, resource: { buffer: uniformBuffer } }, { binding: 1, resource: textures.source.createView() },
      { binding: 2, resource: textures.gaussian.createView() }, { binding: 3, resource: textures.scene.createView() }
    ]);
    const encoder = device.createCommandEncoder({ label: `${VERSION} frame ${submission + 1}` });
    pass(encoder, 'synthetic opaque fixture scene (WebGPU)', sceneView, scenePipeline, sceneGroup);
    pass(encoder, 'Levitation WORLD source', sourceView, sourcePipeline, sourceGroup);
    pass(encoder, 'Levitation Gaussian X', gaussianView, gaussianPipeline, gaussianGroup);
    const target = context.getCurrentTexture().createView();
    pass(encoder, 'Levitation OBSERVER + bounded output clamp', target, observerPipeline, observerGroup);
    const thisSubmission = ++submission;
    device.queue.submit([encoder.finish()]);
    const frameReceipt = Object.freeze({ versionId: VERSION, submission: thisSubmission, sourceId: computed.sourceId,
      causeId: computed.causeId, generation: computed.generation, sourceAgeMs: computed.sourceAgeMs, stage: computed.stage,
      source: Boolean(sourceOn), observer: Boolean(observerOn), sameEncoder: true, completed: false, queueCompleted: false, bodyWorld: computed.bodyWorld,
      feetWorld: computed.feetWorld, uniformByteLength: computed.uniformByteLength, pixelWidth: viewport.width,
      pixelHeight: viewport.height, pixelRatio: viewport.pixelRatio,
      fixtureHeightCss: Math.hypot(computed.uniform[6] - computed.uniform[4], computed.uniform[7] - computed.uniform[5]) * 2 / viewport.pixelRatio,
      syntheticFixture: Boolean(actor.synthetic), verify: Boolean(verify), brightBackground: Boolean(brightBackground),
      sourceEnabled: Boolean(sourceOn), observerEnabled: Boolean(observerOn) });
    latestFence = device.queue.onSubmittedWorkDone().then(() => {
      const completed = Object.freeze({ ...frameReceipt, completed: true, queueCompleted: true });
      if (!lastReceipt || completed.submission > lastReceipt.submission) lastReceipt = completed;
      return completed;
    });
    await latestFence;
    return lastReceipt;
  }
  async function fence() { await latestFence; return lastReceipt; }
  async function dispose() {
    if (disposed) return { completed: false };
    await fence(); disposed = true;
    for (const t of Object.values(textures ?? {})) t.destroy();
    uniformBuffer.destroy(); sceneBuffer.destroy(); context.unconfigure(); device.destroy();
    const settledLost = await deviceLostSettled;
    return { completed: true, lastReceipt, deviceStatus: deviceLost?.reason ?? settledLost?.reason ?? 'unknown' };
  }
  return Object.freeze({ device, adapter, format, warnings: infos, render, fence, dispose,
    get lastReceipt() { return lastReceipt; }, get deviceLost() { return deviceLost; },
    get deviceStatus() { return deviceLost ? 'destroyed-loss-settled' : 'alive'; },
    get physicalSize() { return physical && { ...physical }; } });
}




