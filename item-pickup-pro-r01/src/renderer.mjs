import { uploadVisibilityMask, isBoundVisibilityEvidence, visibleFieldWitness } from './visibility.mjs';
import { MAX_ACTIVE, PRESENTATION_MS } from './timeline.mjs';
const BYTES_PER_INSTANCE = 64;
const premultipliedBlend = {
  color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
};
const additiveBlend = {
  color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }
};
function renderAttachment(view) {
  return { view, loadOp: 'clear', storeOp: 'store', clearValue: { r:0,g:0,b:0,a:0 } };
}
function aligned(n, alignment = 256) { return Math.ceil(n/alignment)*alignment; }
export function srgbToLinear(value) {
  return value <= 0.04045 ? value/12.92 : ((value+0.055)/1.055)**2.4;
}

export class PickupRenderer {
  static async create({ canvas = null, device = null, width = 128, height = 64, powerPreference = 'high-performance' } = {}) {
    let adapter = null;
    if (!device) {
      if (!globalThis.isSecureContext || !navigator.gpu) throw new Error('WebGPUには対応ブラウザとsecure context（localhost/HTTPS）が必要です');
      adapter = await navigator.gpu.requestAdapter({ powerPreference });
      if (!adapter) throw new Error('WebGPU adapterを取得できません');
      device = await adapter.requestDevice();
    }
    const renderer = new PickupRenderer(device,canvas,width,height);
    renderer.adapterInfo = adapter?.info ? {
      vendor: adapter.info.vendor, architecture: adapter.info.architecture,
      device: adapter.info.device, description: adapter.info.description,
      isFallbackAdapter: adapter.info.isFallbackAdapter ?? adapter.isFallbackAdapter ?? null
    } : null;
    try { await renderer.initialize(); return renderer; }
    catch (error) { renderer.dispose(); throw error; }
  }
  constructor(device,canvas,width,height) {
    this.device = device; this.canvas = canvas;
    this.context = canvas?.getContext('webgpu') ?? null;
    this.format = this.context ? navigator.gpu.getPreferredCanvasFormat() : 'rgba8unorm';
    this.width = width; this.height = height; this.frameToken = 0; this.ready = false; this.disposed = false;
    this.errors = []; this.compilation = []; this.faultListeners = new Set();
    this.onError = event => { this.errors.push(String(event.error?.message || event.error)); this.ready = false; for (const f of this.faultListeners) f('gpu_error'); };
    device.addEventListener('uncapturederror',this.onError);
    device.lost.then(info => { if (this.disposed) return; this.errors.push(`device_lost:${info.reason}:${info.message}`); this.ready=false; for (const f of this.faultListeners) f('device_lost'); });
  }
  async initialize() {
    const sourceURLs = [new URL('./shaders/field.wgsl',import.meta.url),new URL('./shaders/composite.wgsl',import.meta.url)];
    const sources = await Promise.all(sourceURLs.map(async url => { const r = await fetch(url); if (!r.ok) throw new Error(`shader load ${r.status}`); return r.text(); }));
    const modules = sources.map((code,i) => this.device.createShaderModule({ label: i===0?'PH1 field':'OBS composite',code }));
    for (let i=0;i<modules.length;i++) {
      const info = await modules[i].getCompilationInfo();
      const messages = info.messages.map(m=>({type:m.type,message:m.message,lineNum:m.lineNum,linePos:m.linePos}));
      this.compilation.push({ shader: i===0?'field.wgsl':'composite.wgsl', messages });
      if (messages.some(m=>m.type==='error')) throw new Error(JSON.stringify(this.compilation));
    }
    this.device.pushErrorScope('validation');
    this.fieldPipeline = await this.device.createRenderPipelineAsync({
      label:'PH1 main/internal/boundary/local light',layout:'auto',
      vertex:{module:modules[0],entryPoint:'field_vertex'},
      fragment:{module:modules[0],entryPoint:'field_fragment',targets:[
        {format:'rgba16float',blend:premultipliedBlend},{format:'rgba16float',blend:additiveBlend},{format:'rgba16float',blend:additiveBlend}
      ]},primitive:{topology:'triangle-list',cullMode:'none'}
    });
    this.compositePipeline = await this.device.createRenderPipelineAsync({
      label:'OBS source-bound composite',layout:'auto',
      vertex:{module:modules[1],entryPoint:'composite_vertex'},
      fragment:{module:modules[1],entryPoint:'composite_fragment',targets:[{format:this.format}]},
      primitive:{topology:'triangle-list'}
    });
    const validationError = await this.device.popErrorScope();
    if (validationError) throw new Error(validationError.message);
    this.frameUniform = this.device.createBuffer({label:'field frame',size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.compositeUniform = this.device.createBuffer({label:'composite frame',size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.instanceBuffer = this.device.createBuffer({label:'receipt instances',size:BYTES_PER_INSTANCE*MAX_ACTIVE,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
    this.sampler = this.device.createSampler({
      label:'OBS finite-kernel sampler',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge',addressModeW:'clamp-to-edge',
      magFilter:'linear',minFilter:'linear',mipmapFilter:'nearest',lodMinClamp:0,lodMaxClamp:0,maxAnisotropy:1
    });
    this.resize(this.width,this.height); this.ready = true;
  }
  resize(width,height) {
    if (!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>this.device.limits.maxTextureDimension2D||height>this.device.limits.maxTextureDimension2D) throw new RangeError('render size');
    this.width=width; this.height=height;
    for (const key of ['bodyTexture','emissionTexture','lightTexture','outputTexture']) this[key]?.destroy();
    const make = (label,format) => this.device.createTexture({label,size:[width,height],format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});
    this.bodyTexture=make('PH1 premultiplied body','rgba16float');
    this.emissionTexture=make('PH1 emission','rgba16float');
    this.lightTexture=make('PH1 local irradiance','rgba16float');
    this.outputTexture=make('OBS final output',this.format);
    if (this.canvas) {
      this.canvas.width=width; this.canvas.height=height;
      this.context.configure({device:this.device,format:this.format,colorSpace:'srgb',alphaMode:'opaque',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_DST});
    }
  }
  /**
   * sceneView: opaque linear RGB、visibilityView/receiverView: 0..1の既存mask。
   * render attachmentは生成するが、外部画像テクスチャ素材を要求しない。
   * 戻り値はqueue提出の記録であり、実displayの画素合格ではない。
   */
  render(draws, { sceneView, visibilityView, receiverView, visibilityEvidence, roomClip, kernelPx=1.15, debugChannel=0 } = {}) {
    if (this.disposed || !this.ready || this.errors.length) return {submitted:false,ids:[],reason:'renderer_not_ready'};
    if (!Array.isArray(draws)) return {submitted:false,ids:[],reason:'draws_not_array'};
    if (!sceneView || !visibilityView || !receiverView) return {submitted:false,ids:[],reason:'host_input_missing'};
    if (!Array.isArray(roomClip) || roomClip.length!==4 || !roomClip.every(Number.isFinite)) return {submitted:false,ids:[],reason:'room_clip_missing'};
    if (!Number.isFinite(kernelPx) || kernelPx<=0 || !Number.isFinite(debugChannel)) return {submitted:false,ids:[],reason:'composite_parameter_invalid'};
    const visible = draws.filter(d => d.ageMs>0 && d.ageMs<PRESENTATION_MS &&
      [d.origin,d.axisX,d.axisY].every(v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)) &&
      Array.isArray(d.clip)&&d.clip.length===4&&d.clip.every(Number.isFinite));
    if (visible.length>MAX_ACTIVE) return {submitted:false,ids:[],reason:'draw_capacity'};
    const packed = new Float32Array(Math.max(1,visible.length)*16);
    visible.forEach((d,i)=>{
      packed.set([...d.origin,...d.axisX,...d.axisY,d.ageMs,d.reducedMotion?1:0,...d.clip,0,0,0,0],i*16);
    });
    const gpu = this.device;
    gpu.queue.writeBuffer(this.frameUniform,0,new Float32Array([this.width,this.height,0,0]));
    gpu.queue.writeBuffer(this.compositeUniform,0,new Float32Array([this.width,this.height,kernelPx,debugChannel,...roomClip]));
    gpu.queue.writeBuffer(this.instanceBuffer,0,packed);
    const fieldGroup = gpu.createBindGroup({layout:this.fieldPipeline.getBindGroupLayout(0),entries:[
      {binding:0,resource:{buffer:this.frameUniform}},{binding:1,resource:{buffer:this.instanceBuffer}},{binding:2,resource:visibilityView}
    ]});
    const compositeGroup = gpu.createBindGroup({layout:this.compositePipeline.getBindGroupLayout(0),entries:[
      {binding:0,resource:{buffer:this.compositeUniform}},{binding:1,resource:this.sampler},
      {binding:2,resource:this.bodyTexture.createView()},{binding:3,resource:this.emissionTexture.createView()},
      {binding:4,resource:this.lightTexture.createView()},{binding:5,resource:sceneView},
      {binding:6,resource:visibilityView},{binding:7,resource:receiverView}
    ]});
    try {
      const encoder = gpu.createCommandEncoder({label:'pickup frame'});
      const fieldPass = encoder.beginRenderPass({label:'PH1 independent outputs',colorAttachments:[
        renderAttachment(this.bodyTexture.createView()),renderAttachment(this.emissionTexture.createView()),renderAttachment(this.lightTexture.createView())
      ]});
      fieldPass.setPipeline(this.fieldPipeline); fieldPass.setBindGroup(0,fieldGroup);
      if (visible.length) fieldPass.draw(6,visible.length);
      fieldPass.end();
      const finalPass = encoder.beginRenderPass({label:'OBS composite',colorAttachments:[renderAttachment(this.outputTexture.createView())]});
      finalPass.setPipeline(this.compositePipeline); finalPass.setBindGroup(0,compositeGroup); finalPass.draw(3); finalPass.end();
      if (this.context) encoder.copyTextureToTexture({texture:this.outputTexture},{texture:this.context.getCurrentTexture()},[this.width,this.height]);
      gpu.queue.submit([encoder.finish()]);
      const submittedMonoMs = performance.now();
      this.frameToken++;
      const audioEligibleIds = debugChannel===0 && isBoundVisibilityEvidence(visibilityEvidence,visibilityView)
        ? visible.filter(d=>visibleFieldWitness(d,this.width,this.height,visibilityEvidence.sample)).map(d=>d.id) : [];
      return {submitted:true,ids:debugChannel===0?visible.map(d=>d.id):[],audioEligibleIds,frameToken:this.frameToken,submittedMonoMs};
    } catch(error) {
      this.errors.push(String(error)); this.ready=false;
      for (const f of this.faultListeners) f('submit_failed');
      return {submitted:false,ids:[],reason:'submit_failed'};
    }
  }
  /** 検査専用のreadback。これを音のtriggerに使わない。 */
  async readback(kind='output') {
    const texture = ({output:this.outputTexture,body:this.bodyTexture,emission:this.emissionTexture,light:this.lightTexture})[kind];
    if (!texture) throw new Error('unknown readback target');
    const isHalf = kind!=='output'; const pixelBytes = isHalf?8:4;
    const bytesPerRow = aligned(this.width*pixelBytes);
    const buffer = this.device.createBuffer({size:bytesPerRow*this.height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    try {
      const encoder=this.device.createCommandEncoder();
      encoder.copyTextureToBuffer({texture},{buffer,bytesPerRow,rowsPerImage:this.height},[this.width,this.height]);
      this.device.queue.submit([encoder.finish()]);
      await buffer.mapAsync(GPUMapMode.READ);
      const padded=new Uint8Array(buffer.getMappedRange());
      const pixels=new Uint8Array(this.width*this.height*pixelBytes);
      for(let y=0;y<this.height;y++) pixels.set(padded.subarray(y*bytesPerRow,y*bytesPerRow+this.width*pixelBytes),y*this.width*pixelBytes);
      if (!isHalf && this.format.startsWith('bgra')) for(let i=0;i<pixels.length;i+=4) [pixels[i],pixels[i+2]]=[pixels[i+2],pixels[i]];
      return {width:this.width,height:this.height,format:isHalf?'rgba16float':'rgba8unorm',pixels};
    } finally { buffer.unmap(); buffer.destroy(); }
  }
  dispose() {
    if(this.disposed)return; this.disposed=true;this.ready=false;
    for(const key of ['bodyTexture','emissionTexture','lightTexture','outputTexture','frameUniform','compositeUniform','instanceBuffer']) this[key]?.destroy();
    this.device.removeEventListener('uncapturederror',this.onError); this.context?.unconfigure();
  }
}

/** samplerの入力面。場面の物体・地面・アイテムではない、明暗比較用の既知入力。 */
export function createTestInputs(device,width,height,srgb=[0.06,0.08,0.12],{receiver=true,visible=true}={}) {
  const scene=device.createTexture({label:'TEST ONLY linear diffuse input',size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  const values=srgb.map(srgbToLinear);
  const encoder=device.createCommandEncoder();
  const pass=encoder.beginRenderPass({colorAttachments:[{view:scene.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:values[0],g:values[1],b:values[2],a:1}}]});
  pass.end();device.queue.submit([encoder.finish()]);
  function solidMask(label,value) {
    const tex=device.createTexture({label,size:[1,1],format:'r8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});
    device.queue.writeTexture({texture:tex},new Uint8Array([value?255:0]),{},[1,1]); return tex;
  }
  const vis=uploadVisibilityMask(device,{width:1,height:1,values:new Uint8Array([visible?255:0])}),rec=solidMask('TEST ONLY receiver',receiver);
  return {sceneView:scene.createView(),visibilityView:vis.view,visibilityEvidence:vis.evidence,receiverView:rec.createView(),roomClip:[0,0,width,height],
    dispose(){scene.destroy();vis.dispose();rec.destroy();}};
}
