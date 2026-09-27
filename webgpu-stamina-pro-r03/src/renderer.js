import { GPU_CONTRACT as G, packVolumes, packBody } from './gpu-contract.js';

function layoutEntry(b) {
  const e = { binding: b.binding, visibility: GPUShaderStage.FRAGMENT };
  if (b.kind === 'uniform' || b.kind === 'read-only-storage') e.buffer = { type: b.kind, minBindingSize: b.minBytes };
  else if (b.kind === 'texture') e.texture = { sampleType: 'float', viewDimension: '2d', multisampled: false };
  else e.sampler = { type: 'filtering' };
  return e;
}
function serialAdapterInfo(adapter) {
  const i = adapter.info ?? {};
  return { vendor: i.vendor ?? '', architecture: i.architecture ?? '', device: i.device ?? '', description: i.description ?? '',
    isFallbackAdapter: adapter.isFallbackAdapter ?? null,
    qualification: /swiftshader|llvmpipe|software|lavapipe/i.test(`${i.description} ${i.architecture}`) ? 'software_backend_not_hardware_quality' : 'reviewer_confirmation_required' };
}
export async function createBackend({ onDiagnostic = () => {} } = {}) {
  const diagnostic = { revision: '0.3.0', api: 'WebGPU', adapter: null, shaderCompilation: {}, pipelineCreation: {},
    renderedFrames: 0, renderQuality: 'not_run', listening: 'not_run', qualityAdoption: 'not_approved', gameIntegration: 'not_approved', errors: [] };
  const notify = () => onDiagnostic(structuredClone(diagnostic));
  if (!globalThis.navigator?.gpu) throw new Error('WebGPUが利用できません。対応Chromeのlocalhost/HTTPSで開いてください。CPU代替描画はありません。');
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('WebGPU adapterを取得できません。描画はnot_runです。');
  diagnostic.adapter = serialAdapterInfo(adapter); notify();
  const device = await adapter.requestDevice({ label: 'CORELOAD-r0.3' });
  const format = navigator.gpu.getPreferredCanvasFormat();
  const backend = { device, format, diagnostic, layouts: {}, pipelines: {}, failed: false, notify };
  device.addEventListener('uncapturederror', e => { diagnostic.errors.push({ source:'uncaptured', message:e.error.message }); backend.failed = true; notify(); });
  device.lost.then(info => { backend.failed = true; diagnostic.errors.push({ source:'device_lost', reason:info.reason, message:info.message }); notify(); });
  for (const specification of G.passes) {
    const url = new URL(`../shaders/${specification.shader}`, import.meta.url);
    const response = await fetch(url); if (!response.ok) throw new Error(`Shader fetch failed: ${url.pathname}: ${response.status}`);
    const code = await response.text();
    device.pushErrorScope('validation');
    let scopeClosed = false;
    try {
      const shader = device.createShaderModule({ label: specification.shader, code });
      const info = await shader.getCompilationInfo();
      const messages = info.messages.map(m => ({ type:m.type, message:m.message, lineNum:m.lineNum, linePos:m.linePos, offset:m.offset, length:m.length }));
      diagnostic.shaderCompilation[specification.name] = { status: messages.some(m=>m.type==='error')?'fail':'pass', messages };
      notify();
      if (messages.some(m=>m.type==='error')) throw new Error(`${specification.shader}: ${messages.filter(m=>m.type==='error').map(m=>`L${m.lineNum}:${m.linePos} ${m.message}`).join('\n')}`);
      const bindGroupLayout = device.createBindGroupLayout({ label: `${specification.name}-bindings`, entries: specification.bindings.map(layoutEntry) });
      backend.layouts[specification.name] = bindGroupLayout;
      const pipelineLayout = device.createPipelineLayout({ label: `${specification.name}-layout`, bindGroupLayouts: [bindGroupLayout] });
      const pipeline = await device.createRenderPipelineAsync({ label: `CORELOAD-${specification.name}`, layout: pipelineLayout,
        vertex: { module: shader, entryPoint: specification.vertex },
        fragment: { module: shader, entryPoint: specification.fragment, targets: specification.outputs.map(()=>({ format: specification.format==='canvas-preferred'?format:specification.format })) },
        primitive: { topology:'triangle-list', cullMode:'none' }, multisample: { count: G.samples } });
      const scopeError = await device.popErrorScope(); scopeClosed = true;
      if (scopeError) throw new Error(scopeError.message);
      backend.pipelines[specification.name] = pipeline;
      diagnostic.pipelineCreation[specification.name] = { status:'pass', format: specification.format==='canvas-preferred'?format:specification.format, entryPoint:specification.fragment };
      notify();
    } catch (error) {
      if (!scopeClosed) { const scoped = await device.popErrorScope(); if (scoped) diagnostic.errors.push({ source:specification.name, message:scoped.message }); }
      diagnostic.pipelineCreation[specification.name] = { status:'fail', message:error.message };
      diagnostic.errors.push({ source:specification.name, message:error.message }); notify(); throw error;
    }
  }
  backend.sampler = device.createSampler({ label:'render-target-linear-clamp', magFilter:'linear', minFilter:'linear', mipmapFilter:'nearest', addressModeU:'clamp-to-edge', addressModeV:'clamp-to-edge' });
  return backend;
}

export class CoreloadRenderer {
  constructor(backend, canvas) {
    this.backend = backend; this.device = backend.device; this.canvas = canvas;
    this.context = canvas.getContext('webgpu'); if (!this.context) throw new Error('canvas WebGPU context unavailable');
    this.context.configure({ device:this.device, format:backend.format, alphaMode:'opaque', usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC });
    this.uniform = this.buffer('globals',G.uniformBytes); this.volumeBuffer = this.buffer('analytic-volumes',G.volumeCapacity*G.volumeStrideBytes,true);
    this.bodyBuffer = this.buffer('analytic-body',G.bodyCapacity*G.bodyStrideBytes,true);
    this.blurX = this.buffer('blur-x',16); this.blurY = this.buffer('blur-y',16); this.compositeSettings = this.buffer('composite',16);
    this.sceneBinding = this.device.createBindGroup({ layout:backend.layouts.scene, entries:[
      {binding:0,resource:{buffer:this.uniform}}, {binding:1,resource:{buffer:this.volumeBuffer}}, {binding:2,resource:{buffer:this.bodyBuffer}} ] });
    this.textures = []; this.currentSize = ''; this.frames = 0;
  }
  buffer(label,size,storage=false) { return this.device.createBuffer({ label, size, usage:GPUBufferUsage.COPY_DST|(storage?GPUBufferUsage.STORAGE:GPUBufferUsage.UNIFORM) }); }
  resize(width,height) {
    const stamp = `${width}x${height}`; if (stamp === this.currentSize) return;
    this.currentSize = stamp; this.canvas.width = width; this.canvas.height = height;
    for (const texture of this.textures) texture.destroy();
    const makeTexture = label => this.device.createTexture({ label, size:[width,height], format:G.intermediateFormat,
      usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING, sampleCount:1 });
    [this.sceneTexture,this.seedTexture,this.blurTextureX,this.blurTextureY] = ['scene-HDR','visible-emission','bloom-x','bloom-y'].map(makeTexture);
    this.textures = [this.sceneTexture,this.seedTexture,this.blurTextureX,this.blurTextureY];
    this.views = this.textures.map(t=>t.createView());
    const blurBinding = (view,buffer) => this.device.createBindGroup({ layout:this.backend.layouts.blur, entries:[
      {binding:0,resource:view},{binding:1,resource:this.backend.sampler},{binding:2,resource:{buffer}} ] });
    this.blurBindingX = blurBinding(this.views[1],this.blurX); this.blurBindingY = blurBinding(this.views[2],this.blurY);
    this.compositeBinding = this.device.createBindGroup({ layout:this.backend.layouts.composite, entries:[
      {binding:0,resource:this.views[0]},{binding:1,resource:this.views[3]},{binding:2,resource:this.backend.sampler},{binding:3,resource:{buffer:this.compositeSettings}} ] });
  }
  draw({ volumes=[], parts=[], width=256, height=176, scale=1, foot=122, lightBackground=false,
    cameraX=0, bloom=true, receivingLight=true, floor=true, raySteps=40 } = {}) {
    if (this.backend.failed) throw new Error('Device/pipeline failed; rendering stopped, no CPU fallback.');
    if (!(scale>0 && width>0 && height>0)) throw new RangeError('invalid viewport');
    this.resize(width,height);
    const uniforms = new Float32Array([width,height,scale,foot, volumes.length,parts.length,lightBackground?1:0,0,
      bloom ? 0.65 : 0,receivingLight?1:0,0,0, cameraX,floor?1:0,raySteps,0]);
    this.device.queue.writeBuffer(this.uniform,0,uniforms);
    this.device.queue.writeBuffer(this.volumeBuffer,0,packVolumes(volumes));
    this.device.queue.writeBuffer(this.bodyBuffer,0,packBody(parts));
    this.device.queue.writeBuffer(this.blurX,0,new Float32Array([1/width,0,scale,0]));
    this.device.queue.writeBuffer(this.blurY,0,new Float32Array([0,1/height,scale,0]));
    this.device.queue.writeBuffer(this.compositeSettings,0,new Float32Array([bloom ? 0.65 : 0,0,0,0]));
    const encoder = this.device.createCommandEncoder({ label:'CORELOAD-frame' });
    const render = (label,pipeline,binding,views) => {
      const renderPass = encoder.beginRenderPass({ label, colorAttachments: views.map(view=>({view,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}})) });
      renderPass.setPipeline(pipeline); renderPass.setBindGroup(0,binding); renderPass.draw(3); renderPass.end();
    };
    render('world-transport',this.backend.pipelines.scene,this.sceneBinding,[this.views[0],this.views[1]]);
    render('OBS-horizontal',this.backend.pipelines.blur,this.blurBindingX,[this.views[2]]);
    render('OBS-vertical',this.backend.pipelines.blur,this.blurBindingY,[this.views[3]]);
    const presentTexture = this.context.getCurrentTexture();
    render('OBS-display',this.backend.pipelines.composite,this.compositeBinding,[presentTexture.createView()]);
    this.device.queue.submit([encoder.finish()]);
    this.frames++; this.backend.diagnostic.renderedFrames++;
  }
  async snapshotBlob() {
    await this.device.queue.onSubmittedWorkDone();
    return new Promise((resolve,reject)=>this.canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('GPU canvas snapshot failed')), 'image/png'));
  }
  dispose() {
    for (const t of this.textures) t.destroy();
    for (const b of [this.uniform,this.volumeBuffer,this.bodyBuffer,this.blurX,this.blurY,this.compositeSettings]) b.destroy();
    this.context.unconfigure();
  }
}
