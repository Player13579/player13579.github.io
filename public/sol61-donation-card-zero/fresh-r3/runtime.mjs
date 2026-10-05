import * as Plan from './source/plan.mjs';
import { WORLD_WGSL, FILTER_WGSL, POST_WGSL } from './source/shader.mjs';
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

export class DonationRenderer {
  static async create(canvas,{gpu=globalThis.navigator?.gpu,onStartupPhase=()=>{},onFailure=()=>{}}={}){
    const renderer=new DonationRenderer(canvas,{gpu,onStartupPhase,onFailure});
    try{await renderer.initialize();return renderer;}catch(error){try{await renderer.dispose();}catch{}throw error;}
  }
  constructor(canvas,{gpu,onStartupPhase=()=>{},onFailure=()=>{}}={}){
    this.canvas=canvas;this.gpu=gpu;this.onStartupPhase=onStartupPhase;this.onFailure=onFailure;
    this.device=null;this.context=null;this.ready=false;this.disposed=false;this.generation=1;this.targetGeneration=0;
    this.frames=[];this.diagnostics=[];this.submitCount=0;this.uniform=null;this.worldPipeline=null;this.filterPipeline=null;this.postPipeline=null;this.sampler=null;
    this.targets=null;this.worldBind=null;this.filterBind=null;this.postBind=null;this.extent=null;this.disposePromise=null;
  }
  async initialize(){
    this.onStartupPhase('adapter');
    if(!this.gpu)throw Object.assign(new Error('WebGPU is unavailable'),{code:'WEBGPU_UNSUPPORTED',unsupported:true});
    const adapter=await this.gpu.requestAdapter();if(!adapter)throw Object.assign(new Error('WebGPU adapter unavailable'),{code:'WEBGPU_ADAPTER_UNAVAILABLE',unsupported:true});
    if(this.disposed)throw Object.assign(new Error('Startup cancelled'),{code:'STARTUP_CANCELLED'});
    this.onStartupPhase('device');this.device=await adapter.requestDevice();
    this.context=this.canvas.getContext('webgpu');if(!this.context)throw Object.assign(new Error('WebGPU canvas context unavailable'),{code:'WEBGPU_CANVAS_UNSUPPORTED',unsupported:true});
    this.format=this.gpu.getPreferredCanvasFormat();this.context.configure({device:this.device,format:this.format,alphaMode:'premultiplied'});
    this.device.addEventListener?.('uncapturederror',event=>this.diagnostics.push({module:'device',message:String(event.error?.message||event.error)}));
    this.device.lost?.then(info=>{if(this.disposed)return;this.generation++;this.targetGeneration++;this.ready=false;this.diagnostics.push({module:'device-lost',message:info?.message||'WebGPU device lost'});});
    this.onStartupPhase('assets');
    const worldModule=this.device.createShaderModule({label:`${Plan.VERSION}/world`,code:WORLD_WGSL});
    const filterModule=this.device.createShaderModule({label:`${Plan.VERSION}/filter`,code:FILTER_WGSL});
    const postModule=this.device.createShaderModule({label:`${Plan.VERSION}/post`,code:POST_WGSL});
    for(const [name,module] of [['world',worldModule],['filter',filterModule],['post',postModule]]){
      const info=await module.getCompilationInfo();const errors=(info.messages||[]).filter(row=>row.type==='error');
      this.diagnostics.push({module:name,messages:(info.messages||[]).map(row=>({type:row.type,message:row.message,lineNum:row.lineNum,linePos:row.linePos}))});
      if(errors.length)throw Object.assign(new Error(`${name} WGSL compile failed: ${errors.map(row=>row.message).join('; ')}`),{code:'WGSL_COMPILE_FAILED'});
    }
    this.onStartupPhase('pipelines');
    this.device.pushErrorScope?.('validation');
    this.worldPipeline=await this.device.createRenderPipelineAsync({label:`${Plan.VERSION}/world-mrt`,layout:'auto',vertex:{module:worldModule,entryPoint:'vs'},fragment:{module:worldModule,entryPoint:'fs',targets:[{format:HDR_FORMAT},{format:HDR_FORMAT}]},primitive:{topology:'triangle-list'}});
    this.filterPipeline=await this.device.createRenderPipelineAsync({label:`${Plan.VERSION}/source-filter`,layout:'auto',vertex:{module:filterModule,entryPoint:'vs'},fragment:{module:filterModule,entryPoint:'fs',targets:[{format:HDR_FORMAT}]},primitive:{topology:'triangle-list'}});
    this.postPipeline=await this.device.createRenderPipelineAsync({label:`${Plan.VERSION}/post`,layout:'auto',vertex:{module:postModule,entryPoint:'vs'},fragment:{module:postModule,entryPoint:'fs',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
    const validation=await this.device.popErrorScope?.();if(validation)throw Object.assign(new Error(`WebGPU pipeline validation failed: ${validation.message}`),{code:'PIPELINE_VALIDATION_FAILED'});
    this.uniform=this.device.createBuffer({label:`${Plan.VERSION}/52-float-uniform`,size:UNIFORM_BYTES,usage:bufferUsage().UNIFORM|bufferUsage().COPY_DST});
    this.sampler=this.device.createSampler({magFilter:'linear',minFilter:'linear'});
    this.worldBind=this.device.createBindGroup({layout:this.worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform,size:UNIFORM_BYTES}}]});
    this.resize();this.ready=true;return this;
  }
  resize(){
    if(!this.device||this.disposed)return false;
    const next=extentFor(this.canvas);if(this.extent&&next.width===this.extent.width&&next.height===this.extent.height&&next.dpr===this.extent.dpr)return false;
    const texUsage=usage().RENDER_ATTACHMENT|usage().TEXTURE_BINDING;
    let world,raw,filtered,filterBind,postBind;
    try{
      world=this.device.createTexture({label:`${Plan.VERSION}/world-hdr`,size:{width:next.width,height:next.height},format:HDR_FORMAT,usage:texUsage});
      raw=this.device.createTexture({label:`${Plan.VERSION}/radiator-raw-hdr`,size:{width:next.width,height:next.height},format:HDR_FORMAT,usage:texUsage});
      filtered=this.device.createTexture({label:`${Plan.VERSION}/radiator-filtered-hdr`,size:{width:next.width,height:next.height},format:HDR_FORMAT,usage:texUsage});
      const worldView=world.createView(),rawView=raw.createView(),filteredView=filtered.createView();
      filterBind=this.device.createBindGroup({layout:this.filterPipeline.getBindGroupLayout(0),entries:[
        {binding:1,resource:rawView},{binding:2,resource:this.sampler}
      ]});
      postBind=this.device.createBindGroup({layout:this.postPipeline.getBindGroupLayout(0),entries:[
        {binding:0,resource:{buffer:this.uniform,size:UNIFORM_BYTES}},
        {binding:1,resource:worldView},{binding:2,resource:filteredView},{binding:3,resource:this.sampler},{binding:4,resource:rawView}
      ]});
      this.canvas.width=next.width;this.canvas.height=next.height;
    }catch(error){world?.destroy();raw?.destroy();filtered?.destroy();throw error;}
    const old=this.targets;this.targets={world,raw,filtered};this.filterBind=filterBind;this.postBind=postBind;this.extent=next;this.targetGeneration++;
    try{old?.world.destroy();old?.raw.destroy();old?.filtered.destroy();}catch{}
    return true;
  }
  isCurrent(snapshot){return !this.disposed&&this.ready&&snapshot.generation===this.generation&&snapshot.targetGeneration===this.targetGeneration&&snapshot.targets===this.targets&&snapshot.filterBind===this.filterBind&&snapshot.postBind===this.postBind&&snapshot.width===this.canvas.width&&snapshot.height===this.canvas.height;}
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
    const snapshot={generation:this.generation,targetGeneration:this.targetGeneration,targets:this.targets,filterBind:this.filterBind,postBind:this.postBind,width:this.canvas.width,height:this.canvas.height};
    this.device.queue.writeBuffer(this.uniform,0,uniforms);
    const output=this.context.getCurrentTexture(),encoder=this.device.createCommandEncoder({label:`${Plan.VERSION}/frame`});
    let pass=encoder.beginRenderPass({label:'Donation world MRT',colorAttachments:[
      {view:this.targets.world.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'},
      {view:this.targets.raw.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}
    ]});pass.setPipeline(this.worldPipeline);pass.setBindGroup(0,this.worldBind);pass.draw(3);pass.end();
    pass=encoder.beginRenderPass({label:'Donation source filter',colorAttachments:[{view:this.targets.filtered.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(this.filterPipeline);pass.setBindGroup(0,this.filterBind);pass.draw(3);pass.end();
    pass=encoder.beginRenderPass({label:'Donation POST',colorAttachments:[{view:output.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(this.postPipeline);pass.setBindGroup(0,this.postBind);pass.draw(3);pass.end();
    const command=encoder.finish();if(!this.isCurrent(snapshot)){this.diagnostics.push({module:'frame-guard',message:'stale render generation rejected before submit'});return false;}
    this.device.queue.submit([command]);this.submitCount++;this.frames.push({submit:this.submitCount,generation:this.generation,targetGeneration:this.targetGeneration,width:this.canvas.width,height:this.canvas.height,ageMs:input.ageMs,causeId:input.receipt?.id,sourceOn:input.sourceOn===true,passes:3,passOrder:['world','filter','post'],targetFormat:HDR_FORMAT});if(this.frames.length>180)this.frames.shift();return true;
  }
  async dispose(){
    if(this.disposePromise)return this.disposePromise;this.disposed=true;this.ready=false;this.generation++;this.targetGeneration++;
    this.disposePromise=(async()=>{try{await this.device?.queue?.onSubmittedWorkDone();}catch(error){this.diagnostics.push({module:'dispose-queue',message:String(error?.message||error)});}const targets=this.targets;this.targets=null;try{targets?.world.destroy();}finally{try{targets?.raw.destroy();}finally{targets?.filtered.destroy();}}this.uniform?.destroy();this.uniform=null;this.context?.unconfigure?.();this.device?.destroy?.();this.context=null;this.device=null;})();
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
    const state={generation:renderer.generation,targetGeneration:renderer.targetGeneration,targets:renderer.targets,filterBind:renderer.filterBind,postBind:renderer.postBind,width:renderer.canvas.width,height:renderer.canvas.height};
    const row=[...renderer.frames].reverse().find(frame=>frame?.submit>submitCounts[index]&&frame?.passes>=1&&frame?.causeId===receiptId&&frame?.sourceOn===true&&Number.isFinite(frame.ageMs)&&frame.ageMs>=0&&frame.ageMs<playback.plan.DURATION_MS&&frame.generation===state.generation&&frame.targetGeneration===state.targetGeneration&&frame.width===state.width&&frame.height===state.height&&renderer.isCurrent(state));
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
