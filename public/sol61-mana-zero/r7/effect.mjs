import {DESIGN,normalizedReceipt,ReceiptGate,state} from './design.mjs';
import {supports,scissor} from './projection.mjs';
export const version=DESIGN.id,durationMs=DESIGN.lifetimeMs;
export {normalizedReceipt,ReceiptGate,supports,scissor,state};
export function acceptOwnedReceipt(gate,event,ownerId){if(!event||ownerId!==event.playerId)return null;return gate.accept(event)}
const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
const additive={color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one',operation:'add'}};
export async function createRenderer(canvas,diagnostic={}){
 if(!navigator.gpu)throw Error('WebGPU unavailable');
 const usages=GPUTextureUsage;
 const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('WebGPU adapter unavailable');
 const ai=adapter.info;diagnostic.adapter={vendor:ai?.vendor??null,architecture:ai?.architecture??null,device:ai?.device??null,description:ai?.description??null,isFallbackAdapter:ai?.isFallbackAdapter??adapter.isFallbackAdapter??null};
 if(diagnostic.adapter.isFallbackAdapter===true)throw Error('Fallback software adapter rejected');
 const device=await adapter.requestDevice();diagnostic.gpuErrors=[];device.addEventListener('uncapturederror',e=>{const error={name:e.error?.name??'GPUError',message:e.error?.message??String(e.error)};if(!diagnostic.gpuErrors.some(x=>x.name===error.name&&x.message===error.message))diagnostic.gpuErrors.push(error)});device.lost.then(x=>{if(x.reason!=='destroyed')diagnostic.gpuErrors.push({name:'DeviceLost',message:x.message})});
 const load=async p=>{const r=await fetch(new URL(p+'?revision='+version,import.meta.url));if(!r.ok)throw Error('Shader HTTP '+r.status);return r.text()};
 const world=device.createShaderModule({label:version+' world',code:await load('./world.wgsl')}),post=device.createShaderModule({label:version+' post',code:await load('./post.wgsl')});
 for(const [label,module] of [['world',world],['post',post]]){const info=await module.getCompilationInfo();diagnostic[label+'Compilation']=info.messages.map(m=>({type:m.type,message:m.message,line:m.lineNum}));if(info.messages.some(m=>m.type==='error'))throw Error(label+' WGSL: '+JSON.stringify(diagnostic[label+'Compilation']));}
 const format=navigator.gpu.getPreferredCanvasFormat(),ctx=canvas.getContext('webgpu');ctx.configure({device,format,alphaMode:'opaque'});
 const worldPipeline=(vs,fs,targets,blendMode)=>device.createRenderPipeline({layout:'auto',vertex:{module:world,entryPoint:vs},fragment:{module:world,entryPoint:fs,targets:targets.map((format,i)=>({format,blend:blendMode[i]}))},primitive:{topology:'triangle-list'}});
 const volumeBack=worldPipeline('volumeVS','backFS',['rgba16float','rgba16float'],[blend,blend]),volumeFront=worldPipeline('volumeVS','frontFS',['rgba16float','rgba16float'],[blend,blend]);
 const bodyPipe=worldPipeline('bodyVS','bodyFS',['rgba16float','rgba16float'],[blend,blend]);
 const pointBack=worldPipeline('pointVS','pointBackFS',['rgba16float','rgba16float'],[additive,additive]),pointFront=worldPipeline('pointVS','pointFrontFS',['rgba16float','rgba16float'],[additive,additive]);
 const postPipe=(fs,target,blendMode)=>device.createRenderPipeline({layout:'auto',vertex:{module:post,entryPoint:'fullVS'},fragment:{module:post,entryPoint:fs,targets:[{format:target,...(blendMode?{blend:blendMode}:{})}]},primitive:{topology:'triangle-list'}});
 const blurH=postPipe('horizontal','rgba16float'),blurV=postPipe('vertical','rgba16float'),composite=postPipe('composite',format);
 const bitmap=await createImageBitmap(await fetch(new URL('./assets/sophia-front-five-v753.png',import.meta.url)).then(r=>{if(!r.ok)throw Error('Actor asset HTTP '+r.status);return r.blob()}),{premultiplyAlpha:'none'});
 if(bitmap.width!==768||bitmap.height!==512)throw Error('Unexpected original actor atlas dimensions');
 const actor=device.createTexture({size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:usages.TEXTURE_BINDING|usages.COPY_DST|usages.RENDER_ATTACHMENT});device.queue.copyExternalImageToTexture({source:bitmap},{texture:actor},[bitmap.width,bitmap.height]);bitmap.close();
 const sampler=device.createSampler({minFilter:'linear',magFilter:'linear'}),uniform=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 function tex(w,h){return device.createTexture({size:[w,h],format:'rgba16float',usage:usages.RENDER_ATTACHMENT|usages.TEXTURE_BINDING});}
 let targets=[],width=0,height=0,destroyed=false,receiptGate=new ReceiptGate(),active=null;
 function resize(){const w=canvas.width,h=canvas.height;if(w===width&&h===height)return;width=w;height=h;for(const t of targets)t.destroy();targets=[tex(w,h),tex(w,h),tex(w,h),tex(w,h)];diagnostic.targetSize=[w,h];}
 const worldBindings=new Map();function worldBind(pipeline){let bind=worldBindings.get(pipeline);if(bind)return bind;const entries=[{binding:0,resource:{buffer:uniform}}];if(pipeline===bodyPipe)entries.push({binding:1,resource:actor.createView()},{binding:2,resource:sampler});bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries});worldBindings.set(pipeline,bind);return bind;}
 function postBind(p,scene,emission,near){const entries=[{binding:0,resource:{buffer:uniform}},{binding:3,resource:near.createView()},{binding:4,resource:sampler}];if(p===composite)entries.push({binding:1,resource:scene.createView()},{binding:2,resource:emission.createView()});return device.createBindGroup({layout:p.getBindGroupLayout(0),entries})}
 function worldPass(enc,pipeline,loadOp,clear){const pass=enc.beginRenderPass({colorAttachments:targets.slice(0,2).map((t,i)=>({view:t.createView(),loadOp,storeOp:'store',...(loadOp==='clear'?{clearValue:clear[i]}:{})}))});pass.setPipeline(pipeline);pass.setBindGroup(0,worldBind(pipeline));return pass;}
 function drawWorld(enc,pipeline,instances,box,center,loadOp='load',clear){const pass=worldPass(enc,pipeline,loadOp,clear);if(box&&pipeline===volumeBack||box&&pipeline===volumeFront){const r=scissor(box,center,width,height);pass.setScissorRect(...r)}pass.draw(6,instances);pass.end()}
 function fullscreen(enc,pipeline,bind,target,clear=true){const pass=enc.beginRenderPass({colorAttachments:[{view:target.createView(),loadOp:clear?'clear':'load',storeOp:'store',...(clear?{clearValue:{r:0,g:0,b:0,a:0}}:{})}]});pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end()}
 function render(elapsedMs,options={}){
  if(destroyed)return false;resize();const dpr=options.dpr??globalThis.devicePixelRatio??1,H=height/(2*dpr),k=H*dpr/64,elapsed=Math.max(0,elapsedMs)/1000,live=active&&(options.ownerId===undefined||active.ownerId===options.ownerId)&&elapsedMs<durationMs;
  if(active&&(!live||options.visible===false||options.dead===true||options.ownerAvailable===false))active=null;
  const source=options.source!==false&&!!active,actorOn=options.actor!==false,incident=options.incident!==false,points=options.points!==false,near=options.near!==false&&options.obs!==false,front=options.front!==false,back=options.back!==false,stars=options.stars!==false;
  device.queue.writeBuffer(uniform,0,new Float32Array([width,height,H*dpr,dpr,elapsed,source?1:0,options.reducedMotion?1:0,stars?1:0,source?1:0,actorOn?1:0,incident?1:0,points?1:0,near?1:0,front?1:0,back?1:0,0]));
  const center=[width*.5,height*.5],s=supports(H,dpr),enc=device.createCommandEncoder();
  const clear=worldPass(enc,volumeBack,'clear',[{r:options.background==='light'?.68:.015,g:options.background==='light'?.68:.02,b:options.background==='light'?.68:.035,a:1},{r:0,g:0,b:0,a:0}]);clear.setScissorRect(0,0,width,height);clear.end();
  if(back){drawWorld(enc,volumeBack,1,s.field,center);if(points)drawWorld(enc,pointBack,3,s.source,center)}
  drawWorld(enc,bodyPipe,1,s.body,center); // restore full viewport/scissor for the original actor pass
  if(front){drawWorld(enc,volumeFront,1,s.field,center);if(points)drawWorld(enc,pointFront,3,s.source,center)}
  // Blur targets are full-cleared; bounded source support is expressed by the projection contract.
  const nearTarget=targets[2],blurTarget=targets[3];fullscreen(enc,blurH,postBind(blurH,targets[0],targets[1],targets[1]),nearTarget,true);
  fullscreen(enc,blurV,postBind(blurV,targets[0],targets[1],nearTarget),blurTarget,true);
  const out=ctx.getCurrentTexture();const pass=enc.beginRenderPass({colorAttachments:[{view:out.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(composite);pass.setBindGroup(0,postBind(composite,targets[0],targets[1],blurTarget));pass.draw(3);pass.end();device.queue.submit([enc.finish()]);diagnostic.submits=(diagnostic.submits||0)+1;return true;
 }
 function acceptReceipt(event,ownerId){const q=acceptOwnedReceipt(receiptGate,event,ownerId);if(!q)return null;active={ownerId:q.ownerId,sessionId:q.sessionId,causeId:q.causeId,receipt:q,startedAt:performance.now()};return active;}
 return {render,acceptReceipt,done:()=>device.queue.onSubmittedWorkDone(),get active(){return active},destroy(){if(destroyed)return;destroyed=true;active=null;for(const t of targets)t.destroy();actor.destroy();uniform.destroy();ctx.unconfigure();device.destroy()}};
}
