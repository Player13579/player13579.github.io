import {LIMITS,H64_SCALE} from './contract.mjs';
import {canvasVisible,canvasVisibleRect} from './visibility.mjs';
const alignedRow=w=>Math.ceil(w*4/256)*256;
const themeId={dark:0,light:1,both:2};
async function text(url){const r=await fetch(url);if(!r.ok)throw new Error(`shader fetch ${r.status}`);return r.text();}
/** WebGPU以外へフォールバックしない。画像ファイル・Canvas2Dを使わない。 */
export class ManaRenderer{
  static async create(canvas,{onFatal=()=>{}}={}){
    if(!globalThis.navigator?.gpu)throw new Error('WebGPUがありません。HTTPS/localhostと対応ブラウザーを確認してください。');
    const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('WebGPU adapterを取得できません');
    const device=await adapter.requestDevice();const r=new ManaRenderer(canvas,adapter,device,onFatal);
    await r.initialize();return r;
  }
  constructor(canvas,adapter,device,onFatal){
    this.canvas=canvas;this.adapter=adapter;this.device=device;this.onFatal=onFatal;this.busy=false;this.generation=1;this.dead=false;this.disposed=false;
    this.diagnostics={shaderCompilation:'not_run',gpuSubmission:'not_run',qualityObservation:'not_run',adapter:{vendor:adapter.info?.vendor,architecture:adapter.info?.architecture,device:adapter.info?.device,description:adapter.info?.description},messages:[]};
    device.lost.then(info=>{if(this.disposed)return;this.dead=true;this.invalidate('device-lost');this.onFatal(`device lost: ${info.message}`);});
    device.addEventListener('uncapturederror',e=>{this.dead=true;this.invalidate('uncaptured-error');this.onFatal(e.error?.message||'GPU error');});
  }
  async initialize(){
    const d=this.device;
    const sources=await Promise.all([text(new URL('../shaders/mana.wgsl',import.meta.url)),text(new URL('../shaders/present.wgsl',import.meta.url))]);
    d.pushErrorScope('validation');
    try{
      const modules=sources.map((code,i)=>d.createShaderModule({label:i?'r03-present':'r03-mana',code}));
      for(const module of modules){
        const info=await module.getCompilationInfo();
        this.diagnostics.messages.push(...info.messages.map(m=>({type:m.type,line:m.lineNum,column:m.linePos,message:m.message})));
      }
      if(this.diagnostics.messages.some(m=>m.type==='error'))throw new Error('WGSL compilation failed: '+JSON.stringify(this.diagnostics.messages));
      this.compute=await d.createComputePipelineAsync({label:'r03-field-and-witness',layout:'auto',compute:{module:modules[0],entryPoint:'render'}});
      this.format=navigator.gpu.getPreferredCanvasFormat();
      this.present=await d.createRenderPipelineAsync({label:'r03-present',layout:'auto',vertex:{module:modules[1],entryPoint:'vertex'},fragment:{module:modules[1],entryPoint:'fragment',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
      this.context=this.canvas.getContext('webgpu');if(!this.context)throw new Error('GPUCanvasContextを取得できません');
      this.context.configure({device:d,format:this.format,alphaMode:'opaque',colorSpace:'srgb'});
      this.uniform=d.createBuffer({label:'r03-uniform',size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      this.instances=d.createBuffer({label:'r03-events',size:LIMITS.active*32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
      this.witness=d.createBuffer({label:'r03-witness',size:LIMITS.active*2*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST});
      this.readback=d.createBuffer({label:'r03-witness-readback',size:LIMITS.active*2*4,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST});
    }catch(e){await d.popErrorScope();this.diagnostics.shaderCompilation='failed';throw e;}
    const error=await d.popErrorScope();if(error){this.diagnostics.shaderCompilation='failed';throw new Error(error.message);}
    this.diagnostics.shaderCompilation='pass';this.resize();
  }
  resize(){
    const w=this.canvas.width,h=this.canvas.height;if(w===this.width&&h===this.height)return;
    if(w<1||h<1||w>this.device.limits.maxTextureDimension2D||h>this.device.limits.maxTextureDimension2D)throw new RangeError('canvas size outside device limits');
    this.image?.destroy();this.pixelReadback?.destroy();this.width=w;this.height=h;const d=this.device;
    this.image=d.createTexture({label:'r03-procedural-frame-not-image-asset',size:[w,h],format:'rgba8unorm',usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});
    this.computeBind=d.createBindGroup({layout:this.compute.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}},{binding:1,resource:{buffer:this.instances}},{binding:2,resource:this.image.createView()},{binding:3,resource:{buffer:this.witness}}]});
    this.presentBind=d.createBindGroup({layout:this.present.getBindGroupLayout(0),entries:[{binding:0,resource:this.image.createView()}]});
    this.pixelReadback=d.createBuffer({label:'r03-optional-pixel-readback',size:alignedRow(w)*h,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
  }
  invalidate(reason='invalidated'){this.generation++;this.canvas.style.visibility='hidden';this.diagnostics.lastInvalidation=reason;}
  async draw(frame,{theme='both',scale=H64_SCALE,footY=this.canvas.height*.77,camera={x:0,y:0},layers=31,verify=false,readPixels=false,current=()=>true,visibility=()=>canvasVisible(this.canvas,{ignoreOwnVisibility:true})}={}){
    if(this.busy)return null;if(this.dead||this.disposed)throw new Error('GPU renderer unavailable');
    if(!frame||frame.items.length>LIMITS.active||!Number.isFinite(scale)||scale<=0)throw new TypeError('Invalid frame or scale');
    this.busy=true;const gen=this.generation;const d=this.device;let scope=false;
    try{
      this.resize();if(!current()||!visibility()){this.invalidate('stale-or-hidden-before-proof');return null;}
      const u=new ArrayBuffer(64),f=new Float32Array(u),v=new Uint32Array(u);
      f.set([this.width,this.height,scale,footY,camera.x,camera.y,0,0]);
      const clip=canvasVisibleRect(this.canvas,{ignoreOwnVisibility:true});if(!clip){this.invalidate('no-visible-pixel-rect');return null;}f.set(clip,12);
      v.set([frame.items.length,themeId[theme]??2,layers,verify?1:0],8);
      const data=new ArrayBuffer(LIMITS.active*32),df=new Float32Array(data),du=new Uint32Array(data);
      frame.items.forEach((e,i)=>{if(![e.worldX,e.worldY,e.phase,e.opacity].every(Number.isFinite))throw new TypeError('Nonfinite event');df.set([e.worldX,e.worldY,e.phase,e.opacity],i*8);du.set([e.token,e.reducedMotion?1:0,0,0],i*8+4);});
      d.queue.writeBuffer(this.uniform,0,u);d.queue.writeBuffer(this.instances,0,data);
      d.pushErrorScope('validation');scope=true;
      const encoder=d.createCommandEncoder({label:'r03-compute-proof'});encoder.clearBuffer(this.witness);
      const pass=encoder.beginComputePass();pass.setPipeline(this.compute);pass.setBindGroup(0,this.computeBind);pass.dispatchWorkgroups(Math.ceil(this.width/8),Math.ceil(this.height/8));pass.end();
      encoder.copyBufferToBuffer(this.witness,0,this.readback,0,LIMITS.active*2*4);
      if(readPixels)encoder.copyTextureToBuffer({texture:this.image},{buffer:this.pixelReadback,bytesPerRow:alignedRow(this.width),rowsPerImage:this.height},[this.width,this.height]);
      d.queue.submit([encoder.finish()]);await this.readback.mapAsync(GPUMapMode.READ);
      const counts=new Uint32Array(this.readback.getMappedRange().slice(0));this.readback.unmap();
      let pixels=null;
      if(readPixels){await this.pixelReadback.mapAsync(GPUMapMode.READ);const mapped=new Uint8Array(this.pixelReadback.getMappedRange());pixels=new Uint8Array(this.width*this.height*4);for(let y=0;y<this.height;y++)pixels.set(mapped.subarray(y*alignedRow(this.width),y*alignedRow(this.width)+this.width*4),y*this.width*4);this.pixelReadback.unmap();}
      const err=await d.popErrorScope();scope=false;if(err)throw new Error(err.message);
      // offscreen検査からpresentまでの間に死亡・非表示・セッション変更した古いフレームを表示しない。
      if(gen!==this.generation||!current()||!visibility()){this.invalidate('stale-or-hidden-frame');return null;}
      d.pushErrorScope('validation');scope=true;
      const pe=d.createCommandEncoder({label:'r03-visible-present'});
      const rp=pe.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
      rp.setPipeline(this.present);rp.setBindGroup(0,this.presentBind);rp.draw(3);rp.end();d.queue.submit([pe.finish()]);
      await d.queue.onSubmittedWorkDone();const pErr=await d.popErrorScope();scope=false;if(pErr)throw new Error(pErr.message);
      if(gen!==this.generation||!current()||!visibility()){this.invalidate('stale-or-hidden-frame');return null;}
      this.canvas.style.visibility='visible';
      const isVisible=canvasVisible(this.canvas);this.diagnostics.gpuSubmission='pass';
      const visibleTokens=frame.items.filter((_,i)=>counts[i]>=3||counts[64+i]>=3).map(e=>e.token);
      return {kind:'webgpu-visible-frame',frame,gpuSucceeded:true,canvasVisible:isVisible,verify,visibleTokens,counts:Array.from(counts),pixels,width:this.width,height:this.height};
    }catch(e){
      if(this.readback.mapState==='mapped')this.readback.unmap();if(this.pixelReadback?.mapState==='mapped')this.pixelReadback.unmap();
      if(scope)try{await d.popErrorScope();}catch{}
      this.diagnostics.gpuSubmission='failed';this.invalidate('gpu-error');this.onFatal(e.message);throw e;
    }finally{this.busy=false;}
  }
  dispose(){this.disposed=true;this.invalidate('disposed');this.image?.destroy();this.uniform?.destroy();this.instances?.destroy();this.witness?.destroy();this.readback?.destroy();this.pixelReadback?.destroy();this.context?.unconfigure();this.device.destroy();}
}
