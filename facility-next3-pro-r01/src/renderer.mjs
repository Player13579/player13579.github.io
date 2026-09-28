import {MAX_EVENTS,MASK_SIZE,LIFE_MS,intersectsView,validView} from './contract.mjs';
const FORMAT='rgba16float';
/** GPUは専有/借用を区別。失敗をゲームの停止・再読込命令へ変換しない。 */
export class GPUHub {
  static async create({device=null,onDiagnostic=()=>{}}={}){
    const hub=new GPUHub();hub.onDiagnostic=onDiagnostic;hub.owned=!device;hub.device=device;hub.errors=[];hub.lost=false;hub.disposed=false;hub.adapterInfo=null;
    try{
      if(!hub.device){
        if(!navigator.gpu)throw new Error('WebGPUが利用できません。HTTPSまたはlocalhostと対応ブラウザーが必要です');
        const adapter=await navigator.gpu.requestAdapter({powerPreference:'low-power'});
        if(!adapter)throw new Error('WebGPU adapterを取得できません');
        hub.adapterInfo=adapter.info?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description}:null;
        hub.device=await adapter.requestDevice();
      }
      hub.format=navigator.gpu.getPreferredCanvasFormat();
      hub.errorListener=event=>{hub.errors.push(event.error.message);onDiagnostic({type:'gpu_error',message:event.error.message});};
      hub.device.addEventListener('uncapturederror',hub.errorListener);
      hub.device.lost.then(info=>{if(!hub.disposed){hub.lost=true;onDiagnostic({type:'device_lost',reason:info.reason,message:info.message});}});
      const codes=await Promise.all(['../shaders/facilities.wgsl','../shaders/display.wgsl'].map(async path=>{const r=await fetch(new URL(path,import.meta.url));if(!r.ok)throw new Error(`shader read ${r.status}`);return r.text();}));
      hub.device.pushErrorScope('validation');
      const modules=codes.map((code,i)=>hub.device.createShaderModule({label:i?'OBS2 display':'PH1 PH2 + OBS1',code}));
      hub.compilation=await Promise.all(modules.map(async m=>[...(await m.getCompilationInfo()).messages].map(x=>({type:x.type,message:x.message,line:x.lineNum,column:x.linePos}))));
      const compileErrors=hub.compilation.flat().filter(x=>x.type==='error');
      if(compileErrors.length){await hub.device.popErrorScope();throw new Error(JSON.stringify(compileErrors));}
      const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
      hub.effectPipeline=await hub.device.createRenderPipelineAsync({label:'facility world + local observer',layout:'auto',vertex:{module:modules[0],entryPoint:'vs'},fragment:{module:modules[0],entryPoint:'fs',targets:[{format:FORMAT,blend}]},primitive:{topology:'triangle-list'}});
      hub.displayPipeline=await hub.device.createRenderPipelineAsync({label:'transparent display transform',layout:'auto',vertex:{module:modules[1],entryPoint:'vs'},fragment:{module:modules[1],entryPoint:'fs',targets:[{format:hub.format}]},primitive:{topology:'triangle-list'}});
      const error=await hub.device.popErrorScope();if(error)throw new Error(error.message);
      return hub;
    }catch(error){hub.dispose();throw error;}
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.device?.removeEventListener('uncapturederror',this.errorListener);if(this.owned)this.device?.destroy();}
}
export class FacilityRenderer {
  constructor(canvas,hub,{masksFor,onDiagnostic=()=>{}}={}){
    if(!canvas||!hub?.device||typeof masksFor!=='function')throw new TypeError('canvas / GPUHub / masksForが必要です');
    this.canvas=canvas;this.hub=hub;this.device=hub.device;this.masksFor=masksFor;this.onDiagnostic=onDiagnostic;this.disposed=false;
    this.context=canvas.getContext('webgpu');if(!this.context)throw new Error('GPUCanvasContextがありません');
    try {
    this.context.configure({device:this.device,format:hub.format,alphaMode:'premultiplied',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
    this.frameBuffer=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:'world camera screen'});
    this.eventBuffer=this.device.createBuffer({size:32*MAX_EVENTS,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:'bounded facility events'});
    this.maskTexture=this.device.createTexture({size:[MASK_SIZE,MASK_SIZE,MAX_EVENTS],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST,label:'host visibility receiver protected masks'});
    this.sampler=this.device.createSampler({minFilter:'linear',magFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
    this.effectGroup=this.device.createBindGroup({layout:hub.effectPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.frameBuffer}},{binding:1,resource:{buffer:this.eventBuffer}},{binding:2,resource:this.maskTexture.createView({dimension:'2d-array'})},{binding:3,resource:this.sampler}]});
    this.lastMasks=[];this.hdr=null;this.lastPresentation=null;
    this.stats={frames:0,drawnEvents:0,culledEvents:0,missingMask:0,resizes:0,readbacks:0};
    }catch(error){this.dispose();throw error;}
  }
  resize(width,height,dpr=1){
    if(this.disposed)return;
    if(![width,height,dpr].every(Number.isFinite)||width<=0||height<=0||dpr<=0)throw new RangeError('invalid dimensions');
    const w=Math.max(1,Math.round(width*dpr)),h=Math.max(1,Math.round(height*dpr));
    if(w>this.device.limits.maxTextureDimension2D||h>this.device.limits.maxTextureDimension2D)throw new RangeError('texture limit exceeded');
    if(this.hdr&&this.canvas.width===w&&this.canvas.height===h)return;
    this.hdr?.destroy();this.canvas.width=w;this.canvas.height=h;
    this.hdr=this.device.createTexture({size:[w,h],format:FORMAT,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING,label:'linear premultiplied facility color'});
    this.displayGroup=this.device.createBindGroup({layout:this.hub.displayPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:this.hdr.createView()}]});
    this.stats.resizes++;
  }
  render(events,view,{reducedMotion=false,dpr=1}={}){
    if(this.disposed||this.hub.lost||this.hub.disposed)return {rendered:false,reason:'GPU_unavailable'};
    if(!validView(view))return {rendered:false,reason:'invalid_view'};
    this.resize(view.width,view.height,dpr);
    const alive=events.filter(e=>Number.isFinite(e.ageMs)&&e.ageMs>=0&&e.ageMs<LIFE_MS);
    const visible=alive.filter(e=>intersectsView(e,view)).sort((a,b)=>a.y-b.y||a.startMs-b.startMs).slice(0,MAX_EVENTS);
    this.stats.culledEvents=alive.length-visible.length;
    const valid=[];
    for(const e of visible){
      let masks;try{masks=this.masksFor(e,view);}catch(error){this.onDiagnostic({type:'mask_error',message:String(error)});}
      if(!(masks instanceof Uint8Array)||masks.byteLength!==MASK_SIZE*MASK_SIZE*4){this.stats.missingMask++;continue;}
      const i=valid.length;
      // 同じ配列をin-placeで変更するホストは新しい参照を返す。契約に記載。
      if(this.lastMasks[i]!==masks){this.device.queue.writeTexture({texture:this.maskTexture,origin:[0,0,i]},masks,{bytesPerRow:MASK_SIZE*4,rowsPerImage:MASK_SIZE},[MASK_SIZE,MASK_SIZE,1]);this.lastMasks[i]=masks;}
      valid.push(e);
    }
    const packed=new Float32Array(Math.max(1,valid.length)*8),density=new Map();for(const e of valid)density.set(e.objectId,(density.get(e.objectId)||0)+1);
    valid.forEach((e,i)=>packed.set([e.x,e.y,e.ageMs/1000,e.kind,e.radius,reducedMotion?1:0,1/Math.sqrt(density.get(e.objectId)),e.seed],i*8));
    this.device.queue.writeBuffer(this.eventBuffer,0,packed);
    this.device.queue.writeBuffer(this.frameBuffer,0,new Float32Array([this.canvas.width,this.canvas.height,view.cameraX,view.cameraY,view.zoom*dpr,0,0,0]));
    const encoder=this.device.createCommandEncoder({label:'facility nonblocking frame'});
    const world=encoder.beginRenderPass({colorAttachments:[{view:this.hdr.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
    world.setPipeline(this.hub.effectPipeline);world.setBindGroup(0,this.effectGroup);if(valid.length)world.draw(6,valid.length);world.end();
    // 0描画でも透明clearを提出する。前フレームを残して停止像にしない。
    this.lastPresentation=this.context.getCurrentTexture();
    const display=encoder.beginRenderPass({colorAttachments:[{view:this.lastPresentation.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
    display.setPipeline(this.hub.displayPipeline);display.setBindGroup(0,this.displayGroup);display.draw(3);display.end();
    this.device.queue.submit([encoder.finish()]);this.stats.frames++;this.stats.drawnEvents=valid.length;
    return {rendered:true,drawnEvents:valid.length,culledEvents:this.stats.culledEvents};
  }
  /** 実GPU提出結果を読む。CPU代替画像を画素合格に使わない。 */
  async readback(){
    if(!this.lastPresentation||this.disposed)throw new Error('描画済みGPU textureが必要です');
    const width=this.canvas.width,height=this.canvas.height,stride=Math.ceil(width*4/256)*256;
    const buffer=this.device.createBuffer({size:stride*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    try{
      const encoder=this.device.createCommandEncoder();encoder.copyTextureToBuffer({texture:this.lastPresentation},{buffer,bytesPerRow:stride,rowsPerImage:height},[width,height]);this.device.queue.submit([encoder.finish()]);
      await buffer.mapAsync(GPUMapMode.READ);const raw=new Uint8Array(buffer.getMappedRange()),pixels=new Uint8Array(width*height*4);
      for(let y=0;y<height;y++)pixels.set(raw.subarray(y*stride,y*stride+width*4),y*width*4);
      if(this.hub.format.startsWith('bgra'))for(let i=0;i<pixels.length;i+=4){const r=pixels[i];pixels[i]=pixels[i+2];pixels[i+2]=r;}
      buffer.unmap();this.stats.readbacks++;return {width,height,pixels};
    }finally{buffer.destroy();}
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.hdr?.destroy();this.maskTexture?.destroy();this.frameBuffer?.destroy();this.eventBuffer?.destroy();this.context.unconfigure();this.lastMasks=[];this.lastPresentation=null;}
}
