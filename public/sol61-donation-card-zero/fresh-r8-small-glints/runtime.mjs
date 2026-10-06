import * as Plan from './source/plan.mjs';
import {RECONSTRUCTION_WIDTH,RECONSTRUCTION_FLOOR} from './source/glints.mjs';
import { WORLD_WGSL, DOWNSAMPLE_WGSL, FILTER_X_WGSL, FILTER_Y_WGSL, OPTICAL_WGSL, POST_WGSL } from './source/shader.mjs';
import { DonationSound } from './source/sfx-design.mjs';

const HDR_FORMAT='rgba16float';
const UNIFORM_BYTES=52*4;
const usage=()=>globalThis.GPUTextureUsage;
const bufferUsage=()=>globalThis.GPUBufferUsage;

function extentFor(canvas,dpr=globalThis.devicePixelRatio||1){
  const r=canvas.getBoundingClientRect();
  if(!Number.isFinite(r.width)||!Number.isFinite(r.height)||r.width<=0||r.height<=0)throw new Error('Donation canvas must have a positive CSS extent');
  if(!Number.isFinite(dpr)||dpr<=0)throw new Error('Donation device pixel ratio must be positive');
  return {cssWidth:r.width,cssHeight:r.height,width:Math.max(1,Math.round(r.width*dpr)),height:Math.max(1,Math.round(r.height*dpr)),dpr};
}

const MAX_SCISSOR_EXTENT=16384,MAX_SCISSOR_COORD=2**20;
export function opticalSupportScissor(u,{width,height,lowWidth,lowHeight}={}){
  const full=reason=>({kind:'full',reason});
  if(!(u instanceof Float32Array)||u.length!==52)return full('uniform-layout');
  if(![width,height,lowWidth,lowHeight].every(Number.isInteger)||width<1||height<1||width>MAX_SCISSOR_EXTENT||height>MAX_SCISSOR_EXTENT||lowWidth!==Math.ceil(width/4)||lowHeight!==Math.ceil(height/4))return full('target-extent');
  if(!u.every(Number.isFinite))return full('nonfinite-uniform');
  const scale=u[2];
  if(u[0]!==width||u[1]!==height||scale<.5||scale>16)return full('packed-extent-or-scale');
  if(u[36]!==Math.fround(.75)||u[37]!==Math.fround(Plan.RAY_EXTENT)||u[39]!==Math.fround(Math.PI/8)||
    ![0,Math.fround(.28)].includes(u[38])||![0,1].includes(u[40])||![0,1].includes(u[41])||![0,1].includes(u[42])||![0,1].includes(u[43]))return full('optical-abi');
  const coordinateOk=value=>Math.abs(value)<=MAX_SCISSOR_COORD;
  const sourceRects=[];
  const addRaw=(cx,cy,hx,hy)=>{
    if(![cx,cy,hx,hy].every(Number.isFinite)||![cx,cy,hx,hy].every(coordinateOk)||hx<0||hy<0)return false;
    const minX=Math.max(0,Math.floor(cx-hx-2)),maxX=Math.min(width-1,Math.ceil(cx+hx+2));
    const minY=Math.max(0,Math.floor(cy-hy-2)),maxY=Math.min(height-1,Math.ceil(cy+hy+2));
    if(minX<=maxX&&minY<=maxY)sourceRects.push({minX,maxX,minY,maxY});
    return true;
  };
  if(u[4]<=.5||u[40]<=.5||u[43]<=.5)return {kind:'empty',reason:'inactive-source-or-main'};
  const aa=Math.max(.25,.70/scale);
  if(u[5]>0&&u[41]>.5&&!addRaw(u[8],u[9],scale*(u[10]+aa),scale*(u[11]+aa)))return full('card-source-bounds');
  if(u[15]>0&&!addRaw(u[12],u[13],scale*(16+aa),scale*(8.5+aa)))return full('receiver-source-bounds');
  for(let i=0;i<5;i++){
    const p=16+i*4;
    if(u[p+3]>0&&!addRaw(u[p],u[p+1],9.2*scale+.25,9.2*scale+.25))return full('coin-source-bounds');
  }
  if(sourceRects.length===0)return {kind:'empty',reason:'no-clipped-source'};
  const raw=sourceRects.reduce((a,r)=>({minX:Math.min(a.minX,r.minX),maxX:Math.max(a.maxX,r.maxX),minY:Math.min(a.minY,r.minY),maxY:Math.max(a.maxY,r.maxY)}),{minX:width,maxX:-1,minY:height,maxY:-1});
  const b0={minX:Math.floor(raw.minX/4),maxX:Math.floor(raw.maxX/4),minY:Math.floor(raw.minY/4),maxY:Math.floor(raw.maxY/4)};
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const shaderRadiusF32=Math.fround(Math.fround(3*Math.fround(Math.max(Math.fround(RECONSTRUCTION_FLOOR),Math.fround(Math.fround(RECONSTRUCTION_WIDTH)*scale))))/4);
  const shaderRadius=Math.min(128,Math.ceil(shaderRadiusF32));
  const jsRadius=Math.min(128,Math.ceil(3*Math.max(RECONSTRUCTION_FLOOR,RECONSTRUCTION_WIDTH*scale)/4));
  const radius=Math.min(128,Math.max(shaderRadius,jsRadius)+(shaderRadius===jsRadius?0:1));
  const by={minX:clamp(b0.minX-(radius+4),0,lowWidth-1),maxX:clamp(b0.maxX+(radius+4),0,lowWidth-1),
    minY:clamp(b0.minY-(radius+4),0,lowHeight-1),maxY:clamp(b0.maxY+(radius+4),0,lowHeight-1)};
  const angle=u[39],ax0x=Math.sin(angle),ax0y=-Math.cos(angle),ax1x=Math.cos(angle),ax1y=Math.sin(angle);
  const mx=Math.max(Math.abs(ax0x),Math.abs(ax1x)),my=Math.max(Math.abs(ax0y),Math.abs(ax1y));
  const rayOn=u[38]>0,nearOn=u[42]>.5;
  if(!rayOn&&!nearOn)return {kind:'empty',reason:'optics-disabled'};
  const dx=rayOn?Math.abs(u[37])*scale*mx*lowWidth/width:0;
  const dy=rayOn?Math.abs(u[37])*scale*my*lowHeight/height:0;
  const nx=nearOn?2*Math.abs(u[36])*scale*lowWidth/width:0;
  const ny=nearOn?2*Math.abs(u[36])*scale*lowHeight/height:0;
  if(![dx,dy,nx,ny].every(Number.isFinite))return full('optical-offset-bounds');
  const ex=Math.ceil(Math.max(dx,nx))+2,ey=Math.ceil(Math.max(dy,ny))+2;
  const correction={minX:clamp(by.minX-ex,0,lowWidth-1),maxX:clamp(by.maxX+ex,0,lowWidth-1),
    minY:clamp(by.minY-ey,0,lowHeight-1),maxY:clamp(by.maxY+ey,0,lowHeight-1)};
  if(![correction.minX,correction.maxX,correction.minY,correction.maxY].every(Number.isInteger)||correction.minX>correction.maxX||correction.minY>correction.maxY)return full('invalid-final-scissor');
  return {kind:'scissor',x:correction.minX,y:correction.minY,width:correction.maxX-correction.minX+1,height:correction.maxY-correction.minY+1,
    bounds:correction,rawBounds:raw,lowSourceBounds:b0,reconstructionRadius:radius};
}

export class DonationRenderer {
  static async create(canvas,{gpu=globalThis.navigator?.gpu,onStartupPhase=()=>{},onFailure=()=>{}}={}){
    const renderer=new DonationRenderer(canvas,{gpu,onStartupPhase,onFailure});
    try{await renderer.initialize();return renderer;}catch(error){try{await renderer.dispose();}catch{}throw error;}
  }
  constructor(canvas,{gpu,onStartupPhase=()=>{},onFailure=()=>{}}={}){
    this.canvas=canvas;this.gpu=gpu;this.onStartupPhase=onStartupPhase;this.onFailure=onFailure;
    this.device=null;this.context=null;this.ready=false;this.disposed=false;this.generation=1;this.targetGeneration=0;
    this.failureError=null;this.startupValidationScope=false;
    this.frames=[];this.diagnostics=[];this.submitCount=0;this.uniform=null;this.worldPipeline=null;this.downsamplePipeline=null;this.filterXPipeline=null;this.filterYPipeline=null;this.opticalPipeline=null;this.postPipeline=null;this.sampler=null;
    this.targets=null;this.worldBind=null;this.downsampleBind=null;this.filterXBind=null;this.filterYBind=null;this.opticalBind=null;this.postBind=null;this.extent=null;this.disposePromise=null;
  }
  async initialize(){
    this.onStartupPhase('adapter');
    if(!this.gpu)throw Object.assign(new Error('WebGPU is unavailable'),{code:'WEBGPU_UNSUPPORTED',unsupported:true});
    const adapter=await this.gpu.requestAdapter();if(!adapter)throw Object.assign(new Error('WebGPU adapter unavailable'),{code:'WEBGPU_ADAPTER_UNAVAILABLE',unsupported:true});
    if(this.disposed)throw Object.assign(new Error('Startup cancelled'),{code:'STARTUP_CANCELLED'});
    this.onStartupPhase('device');this.device=await adapter.requestDevice();
    this.context=this.canvas.getContext('webgpu');if(!this.context)throw Object.assign(new Error('WebGPU canvas context unavailable'),{code:'WEBGPU_CANVAS_UNSUPPORTED',unsupported:true});
    this.format=this.gpu.getPreferredCanvasFormat();this.context.configure({device:this.device,format:this.format,alphaMode:'premultiplied'});
    const ownerDevice=this.device,ownerGeneration=this.generation;
    this.device.addEventListener?.('uncapturederror',event=>{
      const message=String(event.error?.message??event.error??'WebGPU uncaptured error');
      const current=!this.disposed&&this.device===ownerDevice&&this.generation===ownerGeneration;
      this.diagnostics.push({module:'device',message,rendererGeneration:ownerGeneration,
        deviceOwner:`${Plan.VERSION}/renderer-${ownerGeneration}`,
        ownership:current?'current':'stale-or-disposed'});
      if(!current)return;
      const error=Object.assign(new Error(message),{code:'WEBGPU_UNCAPTURED_ERROR',gpuError:event.error,
        rendererGeneration:ownerGeneration});
      this.failureError=error;this.ready=false;
      try{this.onFailure(error,{rendererGeneration:ownerGeneration,deviceOwner:`${Plan.VERSION}/renderer-${ownerGeneration}`});}catch{}
    });
    this.device.lost?.then(info=>{if(this.disposed)return;this.generation++;this.targetGeneration++;this.ready=false;this.diagnostics.push({module:'device-lost',message:info?.message||'WebGPU device lost'});});
    this.onStartupPhase('assets');
    const worldModule=this.device.createShaderModule({label:`${Plan.VERSION}/world`,code:WORLD_WGSL});
    const downsampleModule=this.device.createShaderModule({label:`${Plan.VERSION}/source-downsample-4x4`,code:DOWNSAMPLE_WGSL});
    const filterXModule=this.device.createShaderModule({label:`${Plan.VERSION}/filter-x`,code:FILTER_X_WGSL});
    const filterYModule=this.device.createShaderModule({label:`${Plan.VERSION}/filter-y`,code:FILTER_Y_WGSL});
    const opticalModule=this.device.createShaderModule({label:`${Plan.VERSION}/optical-response`,code:OPTICAL_WGSL});
    const postModule=this.device.createShaderModule({label:`${Plan.VERSION}/post`,code:POST_WGSL});
    for(const [name,module] of [['world',worldModule],['downsample',downsampleModule],['filter-x',filterXModule],['filter-y',filterYModule],['optical',opticalModule],['post',postModule]]){
      const info=await module.getCompilationInfo();const errors=(info.messages||[]).filter(row=>row.type==='error');
      this.diagnostics.push({module:name,messages:(info.messages||[]).map(row=>({type:row.type,message:row.message,lineNum:row.lineNum,linePos:row.linePos}))});
      if(errors.length)throw Object.assign(new Error(`${name} WGSL compile failed: ${errors.map(row=>row.message).join('; ')}`),{code:'WGSL_COMPILE_FAILED'});
    }
    this.onStartupPhase('pipelines');
    if(typeof this.device.pushErrorScope!=='function'||typeof this.device.popErrorScope!=='function')
      throw Object.assign(new Error('WebGPU validation error scopes are required for Donation startup'),{code:'VALIDATION_SCOPE_UNAVAILABLE'});
    const startupDevice=this.device;
    startupDevice.pushErrorScope('validation');this.startupValidationScope=true;
    let initError=null,validationError=null;
    try{
      this.worldPipeline=await this.device.createRenderPipelineAsync({label:`${Plan.VERSION}/world-mrt`,layout:'auto',vertex:{module:worldModule,entryPoint:'vs'},fragment:{module:worldModule,entryPoint:'fs',targets:[{format:HDR_FORMAT},{format:HDR_FORMAT}]},primitive:{topology:'triangle-list'}});
      this.downsamplePipeline=await this.device.createRenderPipelineAsync({label:`${Plan.VERSION}/source-downsample-4x4`,layout:'auto',vertex:{module:downsampleModule,entryPoint:'vs'},fragment:{module:downsampleModule,entryPoint:'fs',targets:[{format:HDR_FORMAT}]},primitive:{topology:'triangle-list'}});
      this.filterXPipeline=await this.device.createRenderPipelineAsync({label:`${Plan.VERSION}/source-filter-x`,layout:'auto',vertex:{module:filterXModule,entryPoint:'vs'},fragment:{module:filterXModule,entryPoint:'fs',targets:[{format:HDR_FORMAT}]},primitive:{topology:'triangle-list'}});
      this.filterYPipeline=await this.device.createRenderPipelineAsync({label:`${Plan.VERSION}/source-filter-y`,layout:'auto',vertex:{module:filterYModule,entryPoint:'vs'},fragment:{module:filterYModule,entryPoint:'fs',targets:[{format:HDR_FORMAT}]},primitive:{topology:'triangle-list'}});
      this.opticalPipeline=await this.device.createRenderPipelineAsync({label:`${Plan.VERSION}/optical-response`,layout:'auto',vertex:{module:opticalModule,entryPoint:'vs'},fragment:{module:opticalModule,entryPoint:'fs',targets:[{format:HDR_FORMAT}]},primitive:{topology:'triangle-list'}});
      this.postPipeline=await this.device.createRenderPipelineAsync({label:`${Plan.VERSION}/post`,layout:'auto',vertex:{module:postModule,entryPoint:'vs'},fragment:{module:postModule,entryPoint:'fs',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
      this.uniform=this.device.createBuffer({label:`${Plan.VERSION}/52-float-uniform`,size:UNIFORM_BYTES,usage:bufferUsage().UNIFORM|bufferUsage().COPY_DST});
      this.sampler=this.device.createSampler({magFilter:'linear',minFilter:'linear'});
      this.worldBind=this.device.createBindGroup({layout:this.worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform,size:UNIFORM_BYTES}}]});
      this.resize();
    }catch(error){initError=error;}
    try{validationError=await startupDevice.popErrorScope();this.startupValidationScope=false;}
    catch(error){this.startupValidationScope=false;if(!initError)initError=error;}
    if(validationError){
      const message=String(validationError.message??validationError);
      this.diagnostics.push({module:'startup-validation',message,
        rendererGeneration:this.generation,deviceOwner:`${Plan.VERSION}/renderer-${this.generation}`,
        phase:'initial-pipelines-bindings-and-resize'});
      if(!initError)initError=Object.assign(new Error(message),{code:'PIPELINE_VALIDATION_FAILED',
        gpuError:validationError,rendererGeneration:this.generation});
    }
    if(initError)throw initError;
    if(this.failureError)throw this.failureError;
    if(this.disposed||this.device!==startupDevice)
      throw Object.assign(new Error('Donation startup owner retired before validation completed'),{code:'STARTUP_CANCELLED'});
    this.ready=true;return this;
  }
  resize(){
    if(!this.device||this.disposed)return false;
    const next=extentFor(this.canvas);if(this.extent&&next.width===this.extent.width&&next.height===this.extent.height&&next.dpr===this.extent.dpr)return false;
    const texUsage=usage().RENDER_ATTACHMENT|usage().TEXTURE_BINDING;
    const lowWidth=Math.ceil(next.width/4),lowHeight=Math.ceil(next.height/4);
    let world,raw,sourceLow,filterX,filterY,correction,worldView,rawView,sourceLowView,xView,yView,correctionView,downsampleBind,filterXBind,filterYBind,opticalBind,postBind;
    try{
      world=this.device.createTexture({label:Plan.VERSION+"/"+"world-hdr",size:{width:next.width,height:next.height},format:HDR_FORMAT,usage:texUsage});
      raw=this.device.createTexture({label:Plan.VERSION+"/"+"radiator-raw-hdr",size:{width:next.width,height:next.height},format:HDR_FORMAT,usage:texUsage});
      sourceLow=this.device.createTexture({label:Plan.VERSION+"/"+"radiator-box4-hdr",size:{width:lowWidth,height:lowHeight},format:HDR_FORMAT,usage:texUsage});
      filterX=this.device.createTexture({label:Plan.VERSION+"/"+"radiator-x-hdr",size:{width:lowWidth,height:lowHeight},format:HDR_FORMAT,usage:texUsage});
      filterY=this.device.createTexture({label:Plan.VERSION+"/"+"radiator-y-hdr",size:{width:lowWidth,height:lowHeight},format:HDR_FORMAT,usage:texUsage});
      correction=this.device.createTexture({label:Plan.VERSION+"/"+"optical-correction-hdr",size:{width:lowWidth,height:lowHeight},format:HDR_FORMAT,usage:texUsage});
      worldView=world.createView();rawView=raw.createView();sourceLowView=sourceLow.createView();xView=filterX.createView();yView=filterY.createView();correctionView=correction.createView();
      const filterUniform={binding:0,resource:{buffer:this.uniform,size:UNIFORM_BYTES}};
      // DOWNSAMPLE_WGSL declares common `u` but never reads it; auto layout
      // therefore exposes only its rawRadiators binding at 1.
      downsampleBind=this.device.createBindGroup({layout:this.downsamplePipeline.getBindGroupLayout(0),entries:[{binding:1,resource:rawView}]});
      filterXBind=this.device.createBindGroup({layout:this.filterXPipeline.getBindGroupLayout(0),entries:[filterUniform,{binding:1,resource:sourceLowView},{binding:2,resource:this.sampler}]});
      filterYBind=this.device.createBindGroup({layout:this.filterYPipeline.getBindGroupLayout(0),entries:[filterUniform,{binding:1,resource:xView},{binding:2,resource:this.sampler}]});
      opticalBind=this.device.createBindGroup({layout:this.opticalPipeline.getBindGroupLayout(0),entries:[filterUniform,{binding:1,resource:yView},{binding:2,resource:this.sampler}]});
      postBind=this.device.createBindGroup({layout:this.postPipeline.getBindGroupLayout(0),entries:[filterUniform,{binding:1,resource:worldView},{binding:2,resource:correctionView},{binding:3,resource:this.sampler},{binding:4,resource:rawView}]});
      this.canvas.width=next.width;this.canvas.height=next.height;
    }catch(error){world?.destroy();raw?.destroy();sourceLow?.destroy();filterX?.destroy();filterY?.destroy();correction?.destroy();throw error;}
    const old=this.targets;this.targets={world,raw,sourceLow,filterX,filterY,correction,worldView,rawView,sourceLowView,filterXView:xView,filterYView:yView,correctionView,lowWidth,lowHeight};this.downsampleBind=downsampleBind;this.filterXBind=filterXBind;this.filterYBind=filterYBind;this.opticalBind=opticalBind;this.postBind=postBind;this.extent=next;this.targetGeneration++;
    try{old?.world.destroy();old?.raw.destroy();old?.sourceLow.destroy();old?.filterX.destroy();old?.filterY.destroy();old?.correction.destroy();}catch{}
    return true;
  }
  isCurrent(snapshot){return !this.disposed&&this.ready&&snapshot.generation===this.generation&&snapshot.targetGeneration===this.targetGeneration&&snapshot.targets===this.targets&&snapshot.downsampleBind===this.downsampleBind&&snapshot.filterXBind===this.filterXBind&&snapshot.filterYBind===this.filterYBind&&snapshot.opticalBind===this.opticalBind&&snapshot.postBind===this.postBind&&snapshot.width===this.canvas.width&&snapshot.height===this.canvas.height;}
  clear(){
    if(!this.device||!this.context||this.disposed)return false;
    const output=this.context.getCurrentTexture();const encoder=this.device.createCommandEncoder({label:`${Plan.VERSION}/clear`});
    const pass=encoder.beginRenderPass({colorAttachments:[{view:output.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});pass.end();
    this.device.queue.submit([encoder.finish()]);this.submitCount++;this.frames.push({submit:this.submitCount,clear:true});return true;
  }
  render(input,view,controls={}){
    if(!this.ready||this.disposed)return false;
    this.resize();
    const uniforms=Plan.packUniforms(input,{...view,width:this.canvas.width,height:this.canvas.height},controls);
    if(!(uniforms instanceof Float32Array)||uniforms.byteLength!==UNIFORM_BYTES)throw new TypeError('Fresh Donation planner must return exactly 52 float32 uniform values');
    if(!Number.isFinite(uniforms[2])||uniforms[2]<=0)throw Object.assign(new RangeError('Donation viewport scale is unsupported after float32 packing'),{code:'UNSUPPORTED_VIEWPORT_SCALE',unsupported:true});
    const opticalScissor=opticalSupportScissor(uniforms,{width:this.canvas.width,height:this.canvas.height,
      lowWidth:this.targets.lowWidth,lowHeight:this.targets.lowHeight});
    const snapshot={generation:this.generation,targetGeneration:this.targetGeneration,targets:this.targets,downsampleBind:this.downsampleBind,filterXBind:this.filterXBind,filterYBind:this.filterYBind,opticalBind:this.opticalBind,postBind:this.postBind,width:this.canvas.width,height:this.canvas.height};
    this.device.queue.writeBuffer(this.uniform,0,uniforms);
    const output=this.context.getCurrentTexture(),encoder=this.device.createCommandEncoder({label:`${Plan.VERSION}/frame`});
    let pass=encoder.beginRenderPass({label:'Donation world MRT',colorAttachments:[
      {view:this.targets.worldView,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'},
      {view:this.targets.rawView,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}
    ]});pass.setPipeline(this.worldPipeline);pass.setBindGroup(0,this.worldBind);pass.draw(3);pass.end();
    pass=encoder.beginRenderPass({label:'Donation zero-extended 4x4 source box',colorAttachments:[{view:this.targets.sourceLowView,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(this.downsamplePipeline);pass.setBindGroup(0,this.downsampleBind);pass.draw(3);pass.end();
    pass=encoder.beginRenderPass({label:'Donation X reconstruction quarter resolution',colorAttachments:[{view:this.targets.filterXView,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(this.filterXPipeline);pass.setBindGroup(0,this.filterXBind);pass.draw(3);pass.end();
    pass=encoder.beginRenderPass({label:'Donation Y reconstruction quarter resolution',colorAttachments:[{view:this.targets.filterYView,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(this.filterYPipeline);pass.setBindGroup(0,this.filterYBind);pass.draw(3);pass.end();
    pass=encoder.beginRenderPass({label:'Donation optical correction quarter resolution',colorAttachments:[{view:this.targets.correctionView,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(this.opticalPipeline);pass.setBindGroup(0,this.opticalBind);if(opticalScissor.kind==='scissor')pass.setScissorRect(opticalScissor.x,opticalScissor.y,opticalScissor.width,opticalScissor.height);if(opticalScissor.kind!=='empty')pass.draw(3);pass.end();
    pass=encoder.beginRenderPass({label:'Donation POST',colorAttachments:[{view:output.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(this.postPipeline);pass.setBindGroup(0,this.postBind);pass.draw(3);pass.end();
    const command=encoder.finish();if(!this.isCurrent(snapshot)){this.diagnostics.push({module:'frame-guard',message:'stale render generation rejected before submit'});return false;}
    this.device.queue.submit([command]);this.submitCount++;this.frames.push({submit:this.submitCount,generation:this.generation,targetGeneration:this.targetGeneration,width:this.canvas.width,height:this.canvas.height,correctionWidth:this.targets.lowWidth,correctionHeight:this.targets.lowHeight,ageMs:input.ageMs,causeId:input.receipt?.id,sourceOn:input.sourceOn===true,passes:6,passOrder:['world','source-downsample-4x4','filter-x-quarter','filter-y-quarter','optical-response-quarter','post'],targetFormat:HDR_FORMAT,opticalDraw:opticalScissor.kind!=='empty',opticalScissor:opticalScissor.kind==='scissor'?{x:opticalScissor.x,y:opticalScissor.y,width:opticalScissor.width,height:opticalScissor.height}:opticalScissor.kind});if(this.frames.length>180)this.frames.shift();return true;
  }
  async dispose(){
    if(this.disposePromise)return this.disposePromise;this.disposed=true;this.ready=false;this.generation++;this.targetGeneration++;
    this.disposePromise=(async()=>{try{await this.device?.queue?.onSubmittedWorkDone();}catch(error){this.diagnostics.push({module:'dispose-queue',message:String(error?.message||error)});}const targets=this.targets;this.targets=null;for(const name of ['world','raw','sourceLow','filterX','filterY','correction']){try{targets?.[name]?.destroy();}catch{}}this.uniform?.destroy();this.uniform=null;this.context?.unconfigure?.();this.device?.destroy?.();this.context=null;this.device=null;})();
    return this.disposePromise;
  }
}

export class DonationPlayback {
  constructor(renderers,{verify=false,plan=Plan,raf=globalThis.requestAnimationFrame?.bind(globalThis),caf=globalThis.cancelAnimationFrame?.bind(globalThis),now=()=>performance.now(),audio=new DonationSound({verify})}={}){
    this.renderers=renderers;this.plan=plan;this.raf=raf;this.caf=caf;this.now=now;this.sound=audio;this.gate=new plan.ReceiptGate();
    this.generation=1;this.running=false;this.input=null;this.rafId=0;this.startedAt=0;this.timeMs=-1;this.disposed=false;this.controls={raysOn:true,cardOn:true,nearOn:true};
  }
  draw(ageMs=this.timeMs){if(this.disposed||!this.input)return false;this.timeMs=ageMs;const input={...this.input,ageMs};const width=this.renderers[0]?.canvas.width||384,height=this.renderers[0]?.canvas.height||256;const scale=Math.min(width/384,height/256);const view={width,height,scale,camera:{x:0,y:0},origin:{x:(width-384*scale)/2,y:(height-256*scale)/2}};return this.renderers.every(renderer=>renderer.render(input,view,this.controls));}
  receive(input,{audio=false}={}){
    if(this.disposed)return false;const admitted=this.gate.receive(input?.receipt);if(!admitted.accepted)return false;
    this.cancel(false);this.input={...input,receipt:admitted.receipt,ageMs:0,sceneOn:true};this.running=true;this.startedAt=this.now();const token=++this.generation;
    if(audio)this.sound.start(admitted.receipt,{ageMs:0});
    const frame=()=>{if(this.disposed||token!==this.generation||!this.running)return;const ageMs=this.now()-this.startedAt;this.draw(Math.min(this.plan.DURATION_MS,ageMs));if(ageMs<this.plan.DURATION_MS)this.rafId=this.raf(frame);else{this.running=false;this.rafId=0;this.sound.cancel();}};
    if(!this.raf)throw new Error('requestAnimationFrame is unavailable');this.rafId=this.raf(frame);return true;
  }
  hold(ageMs){if(this.disposed||!Number.isFinite(ageMs))return false;this.cancel(false);if(this.input)this.draw(ageMs);return true;}
  cancel(clear=true){this.generation++;this.running=false;if(this.rafId)this.caf?.(this.rafId);this.rafId=0;this.sound.cancel();if(clear&&this.input)this.draw(this.plan.DURATION_MS);return true;}
  async dispose(){if(this.disposed)return;this.disposed=true;this.cancel(false);this.gate.dispose();await this.sound.dispose();await Promise.all(this.renderers.map(renderer=>renderer.dispose()));this.input=null;}
  snapshot(){return {version:this.plan.VERSION,ready:this.renderers.length>0&&this.renderers.every(renderer=>renderer.ready&&!renderer.disposed),verify:this.sound.snapshot().verify,running:this.running,timeMs:this.timeMs,causeId:this.input?.receipt?.id,generation:this.generation,diagnostics:this.renderers.flatMap(renderer=>renderer.diagnostics),renderers:this.renderers.map(renderer=>({ready:renderer.ready&&!renderer.disposed,submitCount:renderer.submitCount,frames:renderer.frames,canvas:[renderer.canvas.width,renderer.canvas.height]})),audio:this.sound.snapshot()};}
}

export async function confirmFirstFrameProof({playback,playbackGeneration,receiptId,submitCounts,isActive=()=>true}={}){
  if(!playback||!Array.isArray(playback.renderers)||!Array.isArray(submitCounts)||playback.renderers.length===0||submitCounts.length!==playback.renderers.length)return null;
  const validPlayback=()=>isActive()&&!playback.disposed&&playback.generation===playbackGeneration&&playback.input?.receipt?.id===receiptId&&playback.input?.sourceOn===true;
  if(!validPlayback())return null;
  const observed=playback.renderers.map((renderer,index)=>{
    const state={generation:renderer.generation,targetGeneration:renderer.targetGeneration,targets:renderer.targets,downsampleBind:renderer.downsampleBind,filterXBind:renderer.filterXBind,filterYBind:renderer.filterYBind,opticalBind:renderer.opticalBind,postBind:renderer.postBind,width:renderer.canvas.width,height:renderer.canvas.height};
    const fullPassOrder=['world','source-downsample-4x4','filter-x-quarter','filter-y-quarter','optical-response-quarter','post'];
    const row=[...renderer.frames].reverse().find(frame=>frame?.submit>submitCounts[index]&&frame?.passes===6&&JSON.stringify(frame.passOrder)===JSON.stringify(fullPassOrder)&&frame?.causeId===receiptId&&frame?.sourceOn===true&&Number.isFinite(frame.ageMs)&&frame.ageMs>=0&&frame.ageMs<playback.plan.DURATION_MS&&frame.generation===state.generation&&frame.targetGeneration===state.targetGeneration&&frame.width===state.width&&frame.height===state.height&&renderer.isCurrent(state));
    return {renderer,row,state};
  });
  if(observed.some(item=>!item.row))return null;
  await Promise.all(playback.renderers.map(renderer=>renderer.device.queue.onSubmittedWorkDone()));
  if(!validPlayback())return null;
  if(!observed.every(({renderer,row,state})=>renderer.frames.includes(row)&&renderer.isCurrent(state)))return null;
  const canvases=observed.map(item=>item.renderer.canvas);
  if(!canvases.every(canvas=>canvas?.isConnected===true))return null;
  const extents=canvases.map(canvas=>canvas.getBoundingClientRect());
  if(!extents.every(rect=>Number.isFinite(rect.width)&&Number.isFinite(rect.height)&&rect.width>0&&rect.height>0))return null;
  const first=observed[0];
  return Object.freeze({recorded:true,submitted:observed.every(({row})=>Number.isSafeInteger(row.submit)&&row.submit>0),completed:true,canvasConnected:true,passes:Math.min(...observed.map(({row})=>row.passes)),viewportWidth:first.state.width,viewportHeight:first.state.height,submit:first.row.submit,generation:first.row.generation,targetGeneration:first.row.targetGeneration,playbackGeneration,causeId:receiptId,sourceOn:true,ageMs:first.row.ageMs});
}
