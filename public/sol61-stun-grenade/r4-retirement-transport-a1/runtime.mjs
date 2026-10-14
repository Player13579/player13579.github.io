import {VERSION,packUniforms,UNIFORM_BYTES} from './source/plan.mjs';
import {WORLD,OPTICS,POST} from './source/shaders.mjs';
const HDR='rgba16float';
export class StunRenderer{
 constructor(canvas,{onStage=()=>{}}={}){this.canvas=canvas;this.onStage=onStage;this.device=null;this.context=null;this.targets=null;this.generation=1;this.sequence=0;this.targetGeneration=0;this.disposed=false;this.ready=false;this.errors=[];this.lastSubmitted=null;this.lastCompleted=null;this.pending=new Set();this.resourcesCreated=0;this.resourcesDestroyed=0;this.deviceLostInfo=null;this.deviceLostPromise=null;this.disposePromise=null;this.retirementProof=null;this.deviceDestroyCalls=0;this.queueDrainCount=0;this.contextUnconfigured=false;}
 async initialize(){
  const owner=this.generation;const current=()=>{if(this.disposed||this.generation!==owner)throw new Error('startup owner retired');};
  if(!navigator.gpu)throw new Error('WebGPU required');this.onStage('adapter');const adapter=await navigator.gpu.requestAdapter();current();if(!adapter)throw new Error('WebGPU adapter unavailable');
  this.onStage('device');this.device=await adapter.requestDevice();current();this.context=this.canvas.getContext('webgpu');if(!this.context)throw new Error('WebGPU context unavailable');
  const device=this.device;device.addEventListener('uncapturederror',event=>this.errors.push(String(event.error?.message??event.error)));
  this.deviceLostPromise=device.lost.then(info=>{this.deviceLostInfo={reason:String(info?.reason??''),message:String(info?.message??'')};if(!this.disposed){this.ready=false;this.errors.push('device lost: '+info.message);}return this.deviceLostInfo;});
  this.format=navigator.gpu.getPreferredCanvasFormat();this.context.configure({device,format:this.format,alphaMode:'premultiplied'});
  this.uniform=device.createBuffer({size:UNIFORM_BYTES,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.resourcesCreated++;this.sampler=device.createSampler({magFilter:'linear',minFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
  this.onStage('pipelines');device.pushErrorScope('validation');let error;
  try{
   const modules=[WORLD,OPTICS,POST].map((code,i)=>device.createShaderModule({label:VERSION+'/shader'+i,code}));
   for(let i=0;i<modules.length;i++){const info=await modules[i].getCompilationInfo();current();for(const message of info.messages){if(message.type==='error')throw new Error(`WGSL ${i}:${message.lineNum}:${message.linePos} ${message.message}`);}}
   this.pipelines=[];for(let i=0;i<modules.length;i++){this.pipelines.push(await device.createRenderPipelineAsync({label:VERSION+'/pass'+i,layout:'auto',vertex:{module:modules[i],entryPoint:'vs'},fragment:{module:modules[i],entryPoint:'fs',targets:i===0?[{format:HDR},{format:HDR}]:[{format:i===1?HDR:this.format}]},primitive:{topology:'triangle-list'}}));current();}
  }catch(e){error=e;}
  const scope=await device.popErrorScope();current();if(error)throw error;if(scope)throw new Error(scope.message);this.ready=true;return this;
 }
 async resize(width,height){
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||Math.min(width,height)<=0)throw new TypeError('positive integer backing extent');
  if(this.targets?.width===width&&this.targets?.height===height)return;
  const device=this.device,old=this.targets;this.canvas.width=width;this.canvas.height=height;
  const make=label=>{const r=device.createTexture({label:VERSION+'/'+label,size:[width,height],format:HDR,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT});this.resourcesCreated++;return r;};
  const world=make('world'),source=make('source'),optical=make('optical');
  const bind=(pass,entries)=>device.createBindGroup({layout:this.pipelines[pass].getBindGroupLayout(0),entries});
  const uniform={binding:0,resource:{buffer:this.uniform}};
  const bindings=[bind(0,[uniform]),bind(1,[uniform,{binding:1,resource:source.createView()},{binding:2,resource:this.sampler}]),bind(2,[uniform,{binding:1,resource:world.createView()},{binding:2,resource:source.createView()},{binding:3,resource:optical.createView()},{binding:4,resource:this.sampler}])];
  this.targets={width,height,world,source,optical,bindings,generation:++this.targetGeneration};
  if(old){await device.queue.onSubmittedWorkDone();this.queueDrainCount++;for(const name of ['world','source','optical']){old[name].destroy();this.resourcesDestroyed++;}}
 }
 render(input,view,controls){
  if(this.disposed||!this.ready||!this.targets)throw new Error('renderer not active');
  const owner=this.generation,target=this.targets,device=this.device,sequence=++this.sequence;
  const uniforms=packUniforms(input,{...view,width:target.width,height:target.height},controls);device.queue.writeBuffer(this.uniform,0,uniforms);
  const encoder=device.createCommandEncoder({label:VERSION+'/frame'+sequence});
  const attach=texture=>({view:texture.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'});
  let pass=encoder.beginRenderPass({label:'stun-world-source',colorAttachments:[attach(target.world),attach(target.source)]});pass.setPipeline(this.pipelines[0]);pass.setBindGroup(0,target.bindings[0]);pass.draw(3);pass.end();
  const opticalDraw=uniforms[7]>.5&&uniforms[15]>.5&&uniforms[16]>.5&&(uniforms[8]>0||uniforms[9]>0);
  const support=Math.ceil((Math.max(25,uniforms[13]*1.6)+uniforms[32]+uniforms[14]+uniforms[26]+4*uniforms[27]+5)*uniforms[2]);
  const left=Math.max(0,Math.floor(uniforms[4]-support)),top=Math.max(0,Math.floor(uniforms[5]-support)),right=Math.min(target.width,Math.ceil(uniforms[4]+support)),bottom=Math.min(target.height,Math.ceil(uniforms[5]+support));
  pass=encoder.beginRenderPass({label:'stun-source-bound-optics',colorAttachments:[attach(target.optical)]});pass.setPipeline(this.pipelines[1]);pass.setBindGroup(0,target.bindings[1]);if(opticalDraw&&right>left&&bottom>top){pass.setScissorRect(left,top,right-left,bottom-top);pass.draw(3);}pass.end();
  pass=encoder.beginRenderPass({label:'stun-final-display',colorAttachments:[attach(this.context.getCurrentTexture())]});pass.setPipeline(this.pipelines[2]);pass.setBindGroup(0,target.bindings[2]);pass.draw(3);pass.end();
  const submitted={versionId:VERSION,causeId:input.cause.id,ageMs:input.ageMs,generation:owner,targetGeneration:target.generation,sequence,submit:sequence,passes:3,passOrder:['world-source','source-bound-optics','final-display'],opticalDraw:opticalDraw&&right>left&&bottom>top,opticalScissor:[left,top,Math.max(0,right-left),Math.max(0,bottom-top)],width:target.width,height:target.height,viewportWidth:target.width,viewportHeight:target.height,recorded:true,submitted:true,completed:false,canvasConnected:this.canvas.isConnected,sourceOn:controls.sourceOn!==false,observerOn:controls.observerOn!==false};
  device.queue.submit([encoder.finish()]);this.lastSubmitted=submitted;
  const completion=device.queue.onSubmittedWorkDone().then(()=>{
   if(this.disposed||this.generation!==owner||this.targets!==target||!this.canvas.isConnected)return {...submitted,stale:true};
   const proof=Object.freeze({...submitted,completed:true,canvasConnected:this.canvas.isConnected});if((this.lastCompleted?.sequence??0)<sequence)this.lastCompleted=proof;return proof;
  });this.pending.add(completion);completion.then(()=>this.pending.delete(completion),e=>{this.pending.delete(completion);this.errors.push(String(e.message??e));});return completion;
 }
 invalidate(){this.generation++;this.lastCompleted=null;}
 snapshot(){return {versionId:VERSION,ready:this.ready&&!this.disposed,generation:this.generation,targetGeneration:this.targetGeneration,submits:this.sequence,pending:this.pending.size,canvas:[this.canvas.width,this.canvas.height],lastSubmitted:this.lastSubmitted,lastCompleted:this.lastCompleted,errors:[...this.errors]};}
 dispose(){if(this.disposePromise)return this.disposePromise;this.disposePromise=(async()=>{if(this.retirementProof)return this.retirementProof;this.disposed=true;this.ready=false;this.invalidate();const device=this.device,context=this.context,pendingAtRetire=this.pending.size;await Promise.allSettled([...this.pending]);const pendingSettled=this.pending.size===0;let queueDrained=false,queueError=null;try{if(device){await device.queue.onSubmittedWorkDone();this.queueDrainCount++;queueDrained=true;}}catch(error){queueError=String(error?.message??error);this.errors.push('queue drain: '+queueError);}for(const name of ['world','source','optical']){const resource=this.targets?.[name];if(resource){try{resource.destroy();this.resourcesDestroyed++;}catch(error){this.errors.push('texture destroy: '+String(error?.message??error));}}}this.targets=null;if(this.uniform){try{this.uniform.destroy();this.resourcesDestroyed++;}catch(error){this.errors.push('uniform destroy: '+String(error?.message??error));}}let contextUnconfigured=false;if(context){try{context.unconfigure();this.contextUnconfigured=true;contextUnconfigured=true;}catch(error){this.errors.push('unconfigure: '+String(error?.message??error));}}let destroyCalled=false,lostInfo=this.deviceLostInfo;if(device){try{device.destroy();this.deviceDestroyCalls++;destroyCalled=true;}catch(error){this.errors.push('device destroy: '+String(error?.message??error));}try{lostInfo=await this.deviceLostPromise;}catch(error){this.errors.push('lost promise: '+String(error?.message??error));}}const p={status:device&&pendingSettled&&queueDrained&&destroyCalled&&contextUnconfigured&&lostInfo?.reason==='destroyed'&&this.resourcesDestroyed===this.resourcesCreated?'destroyed-loss-settled':'retirement-incomplete',sameOwnedDevice:!!device&&device===this.device,pendingAtRetire,pendingSettled,pendingCount:this.pending.size,queueDrained,queueDrainCount:this.queueDrainCount,queueError,resourcesCreated:this.resourcesCreated,resourcesDestroyed:this.resourcesDestroyed,resourcesDisposed:this.resourcesCreated>0&&this.resourcesCreated===this.resourcesDestroyed,contextUnconfigured,destroyCalls:this.deviceDestroyCalls,destroyCalled,lostSettled:!!lostInfo,lostReason:lostInfo?.reason??null,cleanupErrors:[...this.errors]};this.retirementProof=p;return p;})();return this.disposePromise;}
}
