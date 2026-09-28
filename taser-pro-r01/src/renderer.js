import {SHADERS} from './shaders.js';
const MAX_INSTANCES = 128;
const PREMULTIPLIED = {color: {srcFactor: 'one', dstFactor: 'one-minus-src-alpha'}, alpha: {srcFactor: 'one', dstFactor: 'one-minus-src-alpha'}};
const ADDITIVE = {color: {srcFactor: 'one', dstFactor: 'one'}, alpha: {srcFactor: 'one', dstFactor: 'one'}};

/** WebGPU専用。Canvas2Dや静止画への偽装フォールバックは行わない。 */
export class ContactRenderer {
  constructor(canvas) {
    this.canvas = canvas; this.device = null; this.ready = false; this.errors = [];
    this.stats = {frames: 0, instances: 0, drawCalls: 0, textureBytes: 0, encodeMs: [], shaderMessages: []};
    this.inFlight = 0; this.backpressureSkips = 0; this.width = 0; this.height = 0; this.pixelRatio = 1; this.resourceTextures = [];
  }
  async init() {
    if (!globalThis.isSecureContext || !navigator.gpu) throw new Error('WebGPUを利用できません。localhostまたはHTTPSの対応ブラウザーで開いてください。');
    const adapter = await navigator.gpu.requestAdapter({powerPreference: 'high-performance'});
    if (!adapter) throw new Error('WebGPU adapterが取得できません。GPU設定とドライバーを確認してください。');
    const info = adapter.info ?? {};
    this.adapterInfo = {vendor: info.vendor ?? '', architecture: info.architecture ?? '', device: info.device ?? '',
      description: info.description ?? '', isFallbackAdapter: info.isFallbackAdapter ?? adapter.isFallbackAdapter ?? null,
      features: [...adapter.features]};
    const description = Object.values(this.adapterInfo).join(' ');
    this.adapterInfo.classification = this.adapterInfo.isFallbackAdapter === true || /swiftshader|llvmpipe|software/i.test(description)
      ? 'software-adapter' : this.adapterInfo.isFallbackAdapter === false ? 'non-fallback-adapter' : 'unidentified-adapter';
    this.device = await adapter.requestDevice();
    const d = this.device;
    d.addEventListener('uncapturederror', e => { this.errors.push(e.error.message); this.ready = false; });
    d.lost.then(info => { this.errors.push(`device-lost: ${info.reason}: ${info.message}`); this.ready = false; });
    this.context = this.canvas.getContext('webgpu');
    if (!this.context) throw new Error('GPUCanvasContext取得失敗');
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({device: d, format: this.format, alphaMode: 'opaque', colorSpace: 'srgb',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC});
    this.globalBuffer = d.createBuffer({label:'共通座標・描画条件',size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.instanceBuffer = d.createBuffer({label:'許可済み対象のみ',size:MAX_INSTANCES*48,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
    this.blurHUniform = d.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.blurVUniform = d.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.displayUniform = d.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.sampler = d.createSampler({minFilter:'linear',magFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
    const module = async (label, code) => {
      const m=d.createShaderModule({label,code}); const c=await m.getCompilationInfo();
      for (const v of c.messages) this.stats.shaderMessages.push({label,type:v.type,line:v.lineNum,column:v.linePos,message:v.message});
      if (c.messages.some(x=>x.type==='error')) throw new Error(`${label}: ${c.messages.map(x=>x.message).join('; ')}`);
      return m;
    };
    d.pushErrorScope('validation');
    const fixture=await module('診断用対象 / Eではない',SHADERS.common+SHADERS.fixture);
    const contact=await module('PH1接触場・PH2対象応答',SHADERS.common+SHADERS.contact);
    const blur=await module('OBS1 / source-bound PSF',SHADERS.blur);
    const composite=await module('OBS2 / 局所shoulder + sRGB',SHADERS.composite);
    const pipe=(mod,vertex,fragment,targets)=>d.createRenderPipelineAsync({layout:'auto',vertex:{module:mod,entryPoint:vertex},
      fragment:{module:mod,entryPoint:fragment,targets},primitive:{topology:'triangle-list'}});
    this.backgroundPipeline=await pipe(fixture,'fullVertex','backgroundFragment',[{format:'rgba16float'},{format:'rgba8unorm'}]);
    this.fixturePipeline=await pipe(fixture,'instanceVertex','fixtureFragment',[
      {format:'rgba16float',blend:PREMULTIPLIED},{format:'rgba8unorm',blend:PREMULTIPLIED}]);
    this.contactPipeline=await pipe(contact,'instanceVertex','contactFragment',[
      {format:'rgba16float',blend:PREMULTIPLIED},{format:'rgba16float',blend:ADDITIVE}]);
    this.blurPipeline=await pipe(blur,'vertex','fragment',[{format:'rgba16float'}]);
    this.compositePipeline=await pipe(composite,'vertex','fragment',[{format:this.format}]);
    const validation=await d.popErrorScope(); if(validation)throw new Error(validation.message);
    this.ready=true; this.resize(1024,512,Math.min(globalThis.devicePixelRatio||1,2));
    return this;
  }
  resize(cssWidth,cssHeight,pixelRatio=1) {
    if (!this.device) return;
    const pr=Math.max(.5,Math.min(pixelRatio,2));
    const width=Math.max(2,Math.min(3072,Math.round(cssWidth*pr)));
    const height=Math.max(2,Math.min(1536,Math.round(cssHeight*pr)));
    if(width===this.width&&height===this.height&&pr===this.pixelRatio)return;
    this.width=width;this.height=height;this.pixelRatio=pr;
    this.canvas.width=width;this.canvas.height=height;
    for(const t of this.resourceTextures)t.destroy();this.resourceTextures=[];
    const tex=(label,format,usage)=>{const t=this.device.createTexture({label,size:[width,height],format,usage});this.resourceTextures.push(t);return t;};
    const rt=GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING;
    this.scene=tex('検査背景と対象', 'rgba16float',rt);
    this.mask=tex('対象・前景・保護マスク','rgba8unorm',rt);
    this.material=tex('PHの面coverage / premultiplied','rgba16float',rt);
    this.emission=tex('PHの放射量 / 非coverage','rgba16float',rt);
    this.glareH=tex('OBS1 horizontal','rgba16float',rt);
    this.glareV=tex('OBS1 vertical','rgba16float',rt);
    this.output=tex('実画素readback',this.format,GPUTextureUsage.COPY_DST|GPUTextureUsage.COPY_SRC);
    const d=this.device;
    const group=(pipeline,entries)=>d.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries});
    const uniforms=[{binding:0,resource:{buffer:this.globalBuffer}},{binding:1,resource:{buffer:this.instanceBuffer}}];
    // auto-layoutはentry pointごとに使用bindingを推定する。
    this.backgroundGroup=group(this.backgroundPipeline,[uniforms[0]]);
    this.fixtureGroup=group(this.fixturePipeline,uniforms);
    this.contactGroup=group(this.contactPipeline,[...uniforms,{binding:2,resource:this.mask.createView()}]);
    this.blurHGroup=group(this.blurPipeline,[{binding:0,resource:this.emission.createView()},{binding:1,resource:this.sampler},{binding:2,resource:{buffer:this.blurHUniform}}]);
    this.blurVGroup=group(this.blurPipeline,[{binding:0,resource:this.glareH.createView()},{binding:1,resource:this.sampler},{binding:2,resource:{buffer:this.blurVUniform}}]);
    this.compositeGroup=group(this.compositePipeline,[...[
      this.scene,this.material,this.emission,this.glareV,this.mask].map((t,binding)=>({binding,resource:t.createView()})),
      {binding:5,resource:{buffer:this.displayUniform}}]);
    this.stats.textureBytes=width*height*(8*5+4*2);
  }
  /** recordsは公開許可を通した表示インスタンス。raw eventを渡さない。 */
  render(records,{world=true,bloom=true,receiver=true,bench=false}={}) {
    if(!this.ready)throw new Error(this.errors.at(-1)||'GPU not ready');
    if(this.inFlight>=2){this.backpressureSkips++;return false;}
    if(!Array.isArray(records)||records.length>MAX_INSTANCES)throw new RangeError('display instance capacity');
    const start=performance.now(),d=this.device,pr=this.pixelRatio;
    const data=new Float32Array(records.length*12);
    for(let i=0;i<records.length;i++) {
      const r=records[i];
      if(![r.x,r.y,r.scale,r.ageMs,...r.clip].every(Number.isFinite)||r.scale<=0)throw new TypeError('invalid authorized display instance');
      data.set([r.x*pr,r.y*pr,r.scale*pr,r.ageMs/1000,...r.clip.map(x=>x*pr),
        r.reduced?1:0,r.partialOccluder?1:0,r.showTarget?1:0,r.effect?1:0],i*12);
    }
    if(data.length)d.queue.writeBuffer(this.instanceBuffer,0,data);
    d.queue.writeBuffer(this.globalBuffer,0,new Float32Array([this.width,this.height,pr,0,world?1:0,bloom?1:0,receiver?1:0,bench?1:0]));
    d.queue.writeBuffer(this.blurHUniform,0,new Float32Array([1.2*pr,0,1,0]));
    d.queue.writeBuffer(this.blurVUniform,0,new Float32Array([0,1.2*pr,0,0]));
    d.queue.writeBuffer(this.displayUniform,0,new Float32Array([bloom?.115:0,.85,0,0]));
    const encoder=d.createCommandEncoder({label:'action-taser finite frame'});
    const attachment=(t)=>({view:t.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'});
    let pass=encoder.beginRenderPass({label:'検査scene・mask',colorAttachments:[attachment(this.scene),attachment(this.mask)]});
    pass.setPipeline(this.backgroundPipeline);pass.setBindGroup(0,this.backgroundGroup);pass.draw(3);
    if(records.length){pass.setPipeline(this.fixturePipeline);pass.setBindGroup(0,this.fixtureGroup);pass.draw(6,records.length);}pass.end();
    pass=encoder.beginRenderPass({label:'world / materialと放射を分離',colorAttachments:[attachment(this.material),attachment(this.emission)]});
    if(records.length){pass.setPipeline(this.contactPipeline);pass.setBindGroup(0,this.contactGroup);pass.draw(6,records.length);}pass.end();
    // source近傍だけにPSFを計算。空白全画面へ9tapを二重に走らせない。
    const regions=bloom?records.filter(r=>r.effect&&r.ageMs>=0&&r.ageMs<1200).map(r=>{
      const hx=(34*r.scale+8)*pr,hy=(28*r.scale+8)*pr;
      const left=Math.max(0,Math.floor(Math.max(r.x*pr-hx,r.clip[0]*pr)));
      const top=Math.max(0,Math.floor(Math.max(r.y*pr-hy,r.clip[1]*pr)));
      const right=Math.min(this.width,Math.ceil(Math.min(r.x*pr+hx,r.clip[2]*pr)));
      const bottom=Math.min(this.height,Math.ceil(Math.min(r.y*pr+hy,r.clip[3]*pr)));
      return [left,top,Math.max(0,right-left),Math.max(0,bottom-top)];
    }).filter(r=>r[2]>0&&r[3]>0):[];
    const full=(label,target,pipeline,group,rects=null)=>{
      const p=encoder.beginRenderPass({label,colorAttachments:[attachment(target)]});p.setPipeline(pipeline);p.setBindGroup(0,group);
      if(rects){for(const rect of rects){p.setScissorRect(...rect);p.draw(3);}}else p.draw(3);p.end();
    };
    full('OBS1 horizontal / bounded source regions',this.glareH,this.blurPipeline,this.blurHGroup,regions);
    full('OBS1 vertical / bounded source regions',this.glareV,this.blurPipeline,this.blurVGroup,regions);
    const presentTexture=this.context.getCurrentTexture();
    full('OBS2 display',presentTexture,this.compositePipeline,this.compositeGroup);
    encoder.copyTextureToTexture({texture:presentTexture},{texture:this.output},[this.width,this.height]);
    d.queue.submit([encoder.finish()]);
    this.inFlight++;d.queue.onSubmittedWorkDone().then(()=>{this.inFlight--;},()=>{this.inFlight--;});
    this.stats.frames++;this.stats.instances=records.length;this.stats.drawCalls=(records.length?4:2)+regions.length*2;
    this.stats.encodeMs.push(performance.now()-start);if(this.stats.encodeMs.length>240)this.stats.encodeMs.shift();return true;
  }
  async readPixels() {
    // readback中のresizeで行幅が変わらないよう、提出時の寸法とtextureを固定する。
    const d=this.device,width=this.width,height=this.height,format=this.format,texture=this.output;
    const row=Math.ceil(width*4/256)*256;
    const buffer=d.createBuffer({label:'GPU readback evidence',size:row*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    try {
      const e=d.createCommandEncoder();e.copyTextureToBuffer({texture},{buffer,bytesPerRow:row,rowsPerImage:height},[width,height]);d.queue.submit([e.finish()]);
      await buffer.mapAsync(GPUMapMode.READ);const raw=new Uint8Array(buffer.getMappedRange());const out=new Uint8Array(width*height*4);
      for(let y=0;y<height;y++)out.set(raw.subarray(y*row,y*row+width*4),y*width*4);
      if(format==='bgra8unorm')for(let i=0;i<out.length;i+=4){const x=out[i];out[i]=out[i+2];out[i+2]=x;}
      buffer.unmap();return {width,height,bytes:out};
    } finally {buffer.destroy();}
  }

  async benchmark(records,{frames=60,warmup=12}={}) {
    await this.device.queue.onSubmittedWorkDone();
    const samples=[];
    for(let n=0;n<warmup+frames;n++){
      const t=performance.now();this.render(records,{bench:true});await this.device.queue.onSubmittedWorkDone();
      if(n>=warmup)samples.push(performance.now()-t);
    }
    const sorted=[...samples].sort((a,b)=>a-b);const pick=q=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*q))];
    return {kind:'host_encode_submit_queue_complete_ms_NOT_GPU_TIMESTAMP',frames,warmup,displayInstances:records.length,
      framebuffer:[this.width,this.height],pixelRatio:this.pixelRatio,medianMs:pick(.5),p95Ms:pick(.95),maxMs:pick(1),
      samplesMs:samples,adapter:this.adapterInfo,textureBytes:this.stats.textureBytes};
  }
  diagnostics(){const a=[...this.stats.encodeMs].sort((x,y)=>x-y);return {adapter:this.adapterInfo,framebuffer:[this.width,this.height],
    pixelRatio:this.pixelRatio,inFlight:this.inFlight,backpressureSkips:this.backpressureSkips,frames:this.stats.frames,drawCalls:this.stats.drawCalls,instances:this.stats.instances,textureBytes:this.stats.textureBytes,
    cpuEncodeMedianMs:a.length?a[Math.floor(a.length*.5)]:null,errors:[...this.errors],shaderMessages:this.stats.shaderMessages,
    note:'CPU encode値を実GPU時間や実機FPSとは呼ばない'};}
  dispose(){this.ready=false;for(const t of this.resourceTextures)t.destroy();this.device?.destroy();}
}
