/** WebGPUだけ。Canvasのpresent texture以外にGPUTextureを一切作らない。 */
const FLOATS_PER_EFFECT = 16;
export function packFrame(frames) {
  const data = new Float32Array(frames.length*FLOATS_PER_EFFECT);
  for (let i=0;i<frames.length;i++) {
    const f = frames[i];
    let neighbors = 1;
    for (let j=0;j<frames.length;j++) if (i!==j) {
      const g = frames[j];
      if (Math.hypot(f.x-g.x,f.y-g.y)<(f.scale+g.scale)*40.5) neighbors++;
    }
    const sourceScale = 40.5*f.scale*f.shape;
    data.set([f.x,f.y,f.scale,f.ageMs,
      f.source,f.medium,f.shape,f.lens,
      f.variantIndex,f.reducedMotion ? 1 : 0,1/Math.sqrt(neighbors),0,
      f.x+f.sourceLocal[0]*sourceScale,f.y+f.sourceLocal[1]*sourceScale,0,0],i*FLOATS_PER_EFFECT);
  }
  return data;
}
export class NativeWebGPURequired extends Error {
  constructor(reason) { super(reason); this.name = 'NativeWebGPURequired'; }
}
function isSoftware(info) { return /swiftshader|llvmpipe|lavapipe|software|microsoft basic render/i.test([info?.vendor,info?.device,info?.description,info?.architecture].join(' ')); }
/** 既存WebGPU passにも差し込める。独立previewとゲーム接続を同一視しない。 */
export class SwitchGPURenderer {
  #device; #uniform; #storage; #bindGroup; #pipelines; #capacity; #count = 0; #previousCount = 0; #disposed = false;
  constructor(device,format,capacity) { this.#device=device; this.format=format; this.#capacity=capacity; }
  static async create({device,format,capacity = 512,shaderCode = null} = {}) {
    if (!device) throw new TypeError('GPUDevice_required');
    if (!['bgra8unorm-srgb','rgba8unorm-srgb','rgba16float'].includes(format)) throw new TypeError('linear_blending_target_required');
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity>4096) throw new RangeError('invalid_capacity');
    const r = new SwitchGPURenderer(device,format,capacity);
    if (shaderCode === null) {
      const response = await fetch(new URL('./shaders/switch.wgsl',import.meta.url));
      if (!response.ok) throw new Error('shader_load_failed');
      shaderCode = await response.text();
    }
    const module = device.createShaderModule({label:'Independent switch-E / PH1+PH2+OBS1-3',code:shaderCode});
    const info = await module.getCompilationInfo();
    r.compilationMessages = info.messages.map(x=>({type:x.type,line:x.lineNum,column:x.linePos,message:x.message}));
    if (info.messages.some(x=>x.type==='error')) throw new Error('WGSL_compilation_failed: '+JSON.stringify(r.compilationMessages));
    device.pushErrorScope('validation');
    try {
      r.#uniform = device.createBuffer({label:'switch-E globals',size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      r.#storage = device.createBuffer({label:'receipt-only switch-E state',size:capacity*64,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
      const layout = device.createBindGroupLayout({entries:[
        {binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},
        {binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'read-only-storage'}}]});
      const pipelineLayout = device.createPipelineLayout({bindGroupLayouts:[layout]});
      const blend = {color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
      r.#pipelines = await Promise.all([['vsWorld','fsWorld'],['vsLens','fsLens']].map(([vertex,fragment])=>device.createRenderPipelineAsync({
        label:fragment==='fsWorld'?'world field / medium':'source-bound lens observations',layout:pipelineLayout,
        vertex:{module,entryPoint:vertex},fragment:{module,entryPoint:fragment,targets:[{format,blend}]},primitive:{topology:'triangle-list'}})));
      r.#bindGroup = device.createBindGroup({layout,entries:[{binding:0,resource:{buffer:r.#uniform}},{binding:1,resource:{buffer:r.#storage}}]});
    } catch (error) {
      await device.popErrorScope(); r.dispose(); throw error;
    }
    const validationError = await device.popErrorScope();
    if (validationError) { r.dispose(); throw new Error(validationError.message); }
    return r;
  }
  prepare(frames,{width,height,dpr = 1}) {
    if (this.#disposed) throw new Error('renderer_disposed');
    if (![width,height,dpr].every(x=>Number.isFinite(x)&&x>0)) throw new RangeError('invalid_viewport');
    if (frames.length>this.#capacity) throw new RangeError('renderer_capacity_exceeded');
    this.#count=frames.length;
    if (this.#previousCount>frames.length) this.#device.queue.writeBuffer(this.#storage,frames.length*64,new Float32Array((this.#previousCount-frames.length)*FLOATS_PER_EFFECT));
    this.#previousCount=frames.length;
    this.#device.queue.writeBuffer(this.#uniform,0,new Float32Array([width,height,dpr,0]));
    if (frames.length) this.#device.queue.writeBuffer(this.#storage,0,packFrame(frames));
  }
  encodeWorld(pass) {
    if (!this.#count || this.#disposed) return;
    pass.setPipeline(this.#pipelines[0]); pass.setBindGroup(0,this.#bindGroup); pass.draw(6,this.#count);
  }
  encodeLens(pass) {
    if (!this.#count || this.#disposed) return;
    pass.setPipeline(this.#pipelines[1]); pass.setBindGroup(0,this.#bindGroup); pass.draw(6,this.#count*3);
  }
  /** 秘匿時のCPU転送状態も消す。GPU読戻しは行わない。 */
  forget() {
    this.#count=0; this.#previousCount=0;
    if (!this.#disposed && this.#storage) this.#device.queue.writeBuffer(this.#storage,0,new Float32Array(this.#capacity*FLOATS_PER_EFFECT));
  }
  dispose() { if (this.#disposed) return; this.#disposed=true; this.#uniform?.destroy(); this.#storage?.destroy(); }
}

export async function createCanvasSurface(canvas,{capacity=512,onLost = () => {}} = {}) {
  if (!globalThis.navigator?.gpu) throw new NativeWebGPURequired('WebGPU_unavailable_no_fallback');
  const adapter = await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  if (!adapter) throw new NativeWebGPURequired('native_adapter_unavailable_no_fallback');
  const info = adapter.info ?? {};
  if (isSoftware(info)) throw new NativeWebGPURequired('software_adapter_rejected');
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) { device.destroy(); throw new NativeWebGPURequired('webgpu_context_unavailable'); }
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  const viewFormat = `${canvasFormat}-srgb`;
  if (!['bgra8unorm-srgb','rgba8unorm-srgb'].includes(viewFormat)) { device.destroy(); throw new NativeWebGPURequired('unsupported_present_format'); }
  let renderer;
  try {
    renderer = await SwitchGPURenderer.create({device,format:viewFormat,capacity});
    context.configure({device,format:canvasFormat,viewFormats:[viewFormat],alphaMode:'opaque',colorSpace:'srgb',usage:GPUTextureUsage.RENDER_ATTACHMENT});
  } catch (error) { renderer?.dispose(); context.unconfigure(); device.destroy(); throw error; }
  if (canvas.style) canvas.style.visibility='visible';
  let disposed=false, lost=false;
  let backdrop = {r:0.0056,g:0.0097,b:0.0160,a:1};
  const surface = {
    device,renderer,adapterInfo:{vendor:info.vendor??'',architecture:info.architecture??'',device:info.device??'',description:info.description??''},
    render(frames,{width,height,dpr=1,background='dark'}) {
      if (disposed || lost) return false;
      if (![width,height,dpr].every(x=>Number.isFinite(x)&&x>0)) throw new RangeError('invalid_viewport');
      backdrop = background==='light' ? {r:0.8550,g:0.8714,b:0.7991,a:1} : {r:0.0056,g:0.0097,b:0.0160,a:1};
      const max = device.limits.maxTextureDimension2D;
      const physicalWidth=Math.max(1,Math.round(width*dpr)),physicalHeight=Math.max(1,Math.round(height*dpr));
      if (physicalWidth>max || physicalHeight>max) throw new RangeError('canvas_exceeds_device_limit');
      if (canvas.width!==physicalWidth || canvas.height!==physicalHeight) { canvas.width=physicalWidth; canvas.height=physicalHeight; }
      renderer.prepare(frames,{width,height,dpr});
      const encoder=device.createCommandEncoder({label:'switch-E native frame'});
      const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView({format:viewFormat}),clearValue:backdrop,loadOp:'clear',storeOp:'store'}]});
      renderer.encodeWorld(pass); renderer.encodeLens(pass); pass.end(); device.queue.submit([encoder.finish()]); return true;
    },
    clear() {
      if (disposed || lost) return;
      renderer.forget();
      const encoder=device.createCommandEncoder({label:'privacy clear'});
      const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView({format:viewFormat}),clearValue:backdrop,loadOp:'clear',storeOp:'store'}]});
      pass.end(); device.queue.submit([encoder.finish()]);
    },
    dispose() { if (disposed) return; surface.clear(); disposed=true; renderer.dispose(); context.unconfigure(); device.destroy(); }
  };
  device.lost.then(reason=>{
    lost=true; renderer.dispose(); context.unconfigure();
    // lost後の最後のフレームを秘匿actorの残像として保持しない。代替描画はしない。
    if (canvas.style) canvas.style.visibility='hidden';
    if (!disposed) onLost({reason:reason.reason,message:reason.message});
  });
  return surface;
}
