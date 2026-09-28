import { CONTRACT } from './contract.js';
export function canvasVisible(canvas) {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible' || !canvas.isConnected) return false;
  const r = canvas.getBoundingClientRect();
  if (!(r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.left < innerWidth && r.top < innerHeight)) return false;
  for (let e = canvas; e instanceof Element; e = e.parentElement) {
    const s = getComputedStyle(e);
    if (e.hidden || s.display === 'none' || s.visibility !== 'visible' || Number(s.opacity) === 0 || s.contentVisibility === 'hidden') return false;
  }
  return true;
}
/** WebGPU-only。preview自身の描画先。record()は既存ゲームの同形式passへ利用できる。 */
export class ManaRenderer {
  static async create(canvas, options = {}) {
    if (!globalThis.navigator?.gpu) throw new Error('WebGPU unavailable. フォールバック描画は行いません。');
    const adapter = options.adapter ?? await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('WebGPU adapter unavailable');
    const device = options.device ?? await adapter.requestDevice();
    const r = new ManaRenderer(canvas, device, options);
    r.adapterInfo = adapter.info ? { vendor: adapter.info.vendor, architecture: adapter.info.architecture, device: adapter.info.device, description: adapter.info.description, isFallbackAdapter: adapter.info.isFallbackAdapter ?? null } : {};
    try { await r.init(); return r; } catch (e) { r.destroy(); throw e; }
  }
  constructor(canvas, device, options) {
    this.canvas = canvas; this.device = device; this.options = options;
    this.lost = false; this.busy = false; this.errors = []; this.compilation = [];
    this.ownsDevice = !options.device;
    this.onError = e => { e.preventDefault(); this.errors.push(String(e.error.message)); this.lost = true; };
    device.addEventListener('uncapturederror', this.onError);
    device.lost.then(info => { this.lost = true; this.lossReason = info.message; options.onLost?.(info); });
  }
  async init() {
    const { device:d } = this;
    this.context = this.canvas.getContext('webgpu');
    if (!this.context) throw new Error('No WebGPU context');
    this.format = this.options.format ?? navigator.gpu.getPreferredCanvasFormat();
    this.viewFormat = this.format.endsWith('-srgb') ? this.format : `${this.format}-srgb`;
    this.context.configure({ device:d, format:this.format, viewFormats:[this.viewFormat], alphaMode:'opaque', usage:GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
    const response = await fetch(new URL('../shaders/mana.wgsl', import.meta.url));
    if (!response.ok) throw new Error('Shader HTTP '+response.status);
    this.shaderSource = await response.text();
    const module = d.createShaderModule({ label:'mana-original-analytic', code:this.shaderSource });
    const info = await module.getCompilationInfo();
    this.compilation = Array.from(info.messages, m => ({ type:m.type, line:m.lineNum, position:m.linePos, message:m.message }));
    if (this.compilation.some(m => m.type === 'error')) throw new Error(JSON.stringify(this.compilation));
    this.frame = d.createBuffer({ size:16, usage:GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.instances = d.createBuffer({ size:CONTRACT.maxActive * 48, usage:GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const layout = d.createBindGroupLayout({ entries:[
      { binding:0, visibility:GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer:{type:'uniform'} },
      { binding:1, visibility:GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer:{type:'read-only-storage'} }
    ] });
    this.bind = d.createBindGroup({ layout, entries:[{binding:0,resource:{buffer:this.frame}},{binding:1,resource:{buffer:this.instances}}] });
    const pipelineLayout = d.createPipelineLayout({ bindGroupLayouts:[layout] });
    const base = { layout:pipelineLayout, vertex:{module,entryPoint:'vs'}, primitive:{topology:'triangle-list'} };
    d.pushErrorScope('validation');
    this.bodyPipeline = await d.createRenderPipelineAsync({ ...base, label:'PH1-PH2-color-volume', fragment:{module,entryPoint:'body',targets:[{format:this.viewFormat,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]} });
    this.lightPipeline = await d.createRenderPipelineAsync({ ...base, label:'PH3-OBS1-bound-radiance', fragment:{module,entryPoint:'radiance',targets:[{format:this.viewFormat,blend:{color:{srcFactor:'one',dstFactor:'one'},alpha:{srcFactor:'zero',dstFactor:'one'}}}]} });
    this.bgPipeline = await d.createRenderPipelineAsync({ layout:pipelineLayout,vertex:{module,entryPoint:'bgVS'},fragment:{module,entryPoint:'bgFS',targets:[{format:this.viewFormat}]} });
    const error = await d.popErrorScope(); if (error) throw new Error(error.message);
    this.query = d.createQuerySet({type:'occlusion',count:CONTRACT.maxActive});
    this.queryResolve = d.createBuffer({size:CONTRACT.maxActive*8,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC});
    this.queryRead = d.createBuffer({size:CONTRACT.maxActive*8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
  }
  prepare(effects, options = {}) {
    if (effects.length > CONTRACT.maxActive) throw new RangeError('Too many effects');
    const values = new Float32Array(effects.length * 12);
    effects.forEach((e, i) => {
      const r = e.recipient ?? CONTRACT.recipient;
      const a = [e.x,e.y,e.scale,e.seconds,r.x,r.y,r.radiusX,r.radiusY,Number(e.reducedMotion),e.gain ?? 1,0,0];
      if (!a.every(Number.isFinite) || e.scale <= 0 || r.radiusX <= 0 || r.radiusY <= 0) throw new TypeError('Invalid render parameters');
      values.set(a, i * 12);
    });
    this.device.queue.writeBuffer(this.frame,0,new Float32Array([this.canvas.width,this.canvas.height,CONTRACT.duration,options.background === 'light' ? 1 : 0]));
    if (values.length) this.device.queue.writeBuffer(this.instances,0,values);
  }
  /** prepare()後、同じlinear/sRGB契約の既存passへ追加。既存地形・キャラを生成しない。 */
  record(pass, effects, { query = false } = {}) {
    pass.setBindGroup(0,this.bind);
    pass.setPipeline(this.lightPipeline);
    if (effects.length) pass.draw(6,effects.length);
    pass.setPipeline(this.bodyPipeline);
    for (let i=0; i<effects.length; i++) {
      if (query) pass.beginOcclusionQuery(i);
      pass.draw(6,1,0,i);
      if (query) pass.endOcclusionQuery();
    }
  }
  /** 正のocclusion sampleとvalidation/fenceを確認。OSのscanout確認APIではない。 */
  async render(effects, { background='dark', evidence=false, capture=false, allowHidden=false, isCurrent=()=>true } = {}) {
    if (this.lost || this.busy) return { status:'not-submitted', proofs:[] };
    if (!allowHidden && !canvasVisible(this.canvas)) return { status:'hidden', proofs:[] };
    effects=effects.filter(isCurrent);
    this.busy=true;
    const d=this.device; let readback=null, scopePopped=false;
    d.pushErrorScope('validation');
    try {
      this.prepare(effects,{background});
      const texture=this.context.getCurrentTexture();
      const encoder=d.createCommandEncoder({label:'mana-visible-frame'});
      const pass=encoder.beginRenderPass({colorAttachments:[{view:texture.createView({format:this.viewFormat}),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}], ...(evidence && effects.length ? {occlusionQuerySet:this.query} : {}) });
      pass.setBindGroup(0,this.bind); pass.setPipeline(this.bgPipeline); pass.draw(3);
      this.record(pass,effects,{query:evidence}); pass.end();
      if (evidence && effects.length) {
        encoder.resolveQuerySet(this.query,0,effects.length,this.queryResolve,0);
        encoder.copyBufferToBuffer(this.queryResolve,0,this.queryRead,0,effects.length*8);
      }
      const bytesPerRow=Math.ceil(this.canvas.width*4/256)*256;
      if (capture) {
        readback=d.createBuffer({size:bytesPerRow*this.canvas.height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
        encoder.copyTextureToBuffer({texture},{buffer:readback,bytesPerRow,rowsPerImage:this.canvas.height},[this.canvas.width,this.canvas.height,1]);
      }
      d.queue.submit([encoder.finish()]);
      const validation = d.popErrorScope(); scopePopped=true;
      await d.queue.onSubmittedWorkDone();
      const error=await validation;
      if (error || this.lost) throw new Error(error?.message ?? 'Device lost');
      let proofs=[];
      if (evidence && effects.length) {
        await this.queryRead.mapAsync(GPUMapMode.READ,0,effects.length*8);
        const samples=new BigUint64Array(this.queryRead.getMappedRange(0,effects.length*8));
        proofs=effects.map((e,i)=>({id:e.id,token:e.token,samples:Number(samples[i]),seconds:e.seconds}));
        this.queryRead.unmap();
      }
      let pixels=null;
      if (readback) {
        await readback.mapAsync(GPUMapMode.READ);
        const raw=new Uint8Array(readback.getMappedRange()); pixels=new Uint8Array(this.canvas.width*this.canvas.height*4);
        for (let y=0;y<this.canvas.height;y++) pixels.set(raw.subarray(y*bytesPerRow,y*bytesPerRow+this.canvas.width*4),y*this.canvas.width*4);
        if (this.format.startsWith('bgra')) for(let i=0;i<pixels.length;i+=4) {const r=pixels[i];pixels[i]=pixels[i+2];pixels[i+2]=r;}
        readback.unmap();
      }
      // fence待機中の死亡/透明化/session切替。証拠を取り消し、次の提示を空にする。
      if (effects.some(e=>!isCurrent(e))) {
        const clean=d.createCommandEncoder();
        const blank=clean.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView({format:this.viewFormat}),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
        blank.setBindGroup(0,this.bind);blank.setPipeline(this.bgPipeline);blank.draw(3);blank.end();d.queue.submit([clean.finish()]);
        return {status:'revoked-after-submit',proofs:[],pixels:null};
      }
      if (!allowHidden && !canvasVisible(this.canvas)) return {status:'hidden-after-submit',proofs:[],pixels};
      return {status:'submitted',proofs,pixels,width:this.canvas.width,height:this.canvas.height};
    } catch(error) {
      this.errors.push(String(error.message)); return {status:'failed',error:String(error.message),proofs:[]};
    } finally {
      if (!scopePopped) await d.popErrorScope();
      readback?.destroy(); this.busy=false;
    }
  }
  destroy() {
    this.lost=true; this.device.removeEventListener('uncapturederror',this.onError);
    this.context?.unconfigure(); this.query?.destroy(); this.frame?.destroy(); this.instances?.destroy(); this.queryResolve?.destroy(); this.queryRead?.destroy();
    if(this.ownsDevice) this.device.destroy();
  }
}
