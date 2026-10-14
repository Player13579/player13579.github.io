import * as E from './source/ability-entitlement.mjs';
import {packStatusCardBaselineUniform} from './source/status-card-baseline.mjs';
const $=s=>document.querySelector(s), canvas=$('#view'), stage=$('#stage'), card=$('#status'), report=$('#report');
const verify=new URL(location.href).searchParams.has('verify');
const enc=new TextEncoder(), hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function digest(s){return hex(await crypto.subtle.digest('SHA-256',enc.encode(s)))}
async function digestBytes(b){return hex(await crypto.subtle.digest('SHA-256',b))}
const files=['permission-source.wgsl','display-observer.wgsl','composite.wgsl'];
const source=await (await fetch('./source/ability-entitlement.mjs')).text();
const sourceHash=await digest(source), shaders=await Promise.all(files.map(async name=>{const text=await(await fetch('./source/'+name)).text();return {name,text,hash:await digest(text)}}));
const expectedCreative={source:'9fae7d9df3b8dafd770c162e847053288da1ce860e0e4f0b13466f8d843fff57',shaders:{'permission-source.wgsl':'d871916c892b045de41ca63c69375884ec66d8a92c8643af1a433d91da46a735','display-observer.wgsl':'bcd333d4916fb212c36a17b371cac6cc7cdcf5122d4d9bfb903bcb8e08e05bc9','composite.wgsl':'015eceb83966367a589d58cf51634b951ae0452b64574269b01b98eab811f3a5'}};
if(sourceHash!==expectedCreative.source||shaders.some(x=>x.hash!==expectedCreative.shaders[x.name]))throw Error('Creative source pin mismatch');
const baselineText=await(await fetch('./source/status-card-baseline.wgsl')).text(),hostBaselineShaderHash=await digest(baselineText);
let gpu,device,context,fmt,sourceTex,blurHTex,blurVTex,sceneTex,srcPipe,blurPipe,compPipe,baselinePipe,dispPipe,srcBind,blurHBind,blurVBind,compBind,baselineBind,dispBind;
let gate=E.createAdmissionGate(), cause=null, start=0, heldAge=0, diagnosticAge=null, raf=0, sequence=0, disposed=Boolean(window.__dvaGalleryStartupContext?.retired), held=false, observer=true, enabled=true, near=true, sparkle=true, reduced=false, audioCtx=null, audioBuf=null, audioPlayed=new Set(), muted=verify, submissions=[], completed=[], ready=false;

const ownedResources=new Set(),destroyedResources=new Set(),pendingTasks=new Set(),audioVoices=new Set(),audioGains=new Set(),cleanupErrors=[];
let initSettled=false,initialTimer=0,cleanupPromise=null,cleanupProof=null,contextAcquired=false,contextUnconfigured=false,deviceDestroyCalled=false,ownedLoss=null;
const own=x=>{ownedResources.add(x);return x};
function destroyOwned(x){if(!x||destroyedResources.has(x))return;x.destroy();destroyedResources.add(x)}
function tracked(p){pendingTasks.add(p);p.then(()=>pendingTasks.delete(p),()=>pendingTasks.delete(p));return p}
function lifecycleSnapshot(){return {closed:disposed,initSettled,pendingTasks:pendingTasks.size,resourcesCreated:ownedResources.size,resourcesDestroyed:destroyedResources.size,contextAcquired,contextUnconfigured,deviceDestroyCalled,ownedLoss,rafActive:!!raf,initialTimerActive:!!initialTimer,audioVoices:audioVoices.size,audioGains:audioGains.size,audioContextState:audioCtx?.state??'absent'}}
const cssViewport=()=>{const r=canvas.getBoundingClientRect(),dpr=device?.limits?.maxTextureDimension2D?Math.min(devicePixelRatio||1,2):1;const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;resizeTargets(w,h)}return {cssWidth:r.width,cssHeight:r.height,width:w,height:h,dpr:w/r.width}};
function tex(w,h,label){return own(device.createTexture({label,size:[w,h],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}))}
function resizeTargets(w,h){if(!device)return;for(const t of [sourceTex,blurHTex,blurVTex,sceneTex])destroyOwned(t);sourceTex=tex(w,h,'permission source');blurHTex=tex(w,h,'observer horizontal');blurVTex=tex(w,h,'observer vertical');sceneTex=tex(w,h,'HDR fixture scene');if(srcPipe){makeBinds()}}
function module(text,label){return device.createShaderModule({label,code:text})}
function pipeline(shader,format='rgba16float',blend){return device.createRenderPipeline({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format,...(blend?{blend}:{})}]},primitive:{topology:'triangle-list'}})}
async function scopedPipeline(shader,format='rgba16float',blend){device.pushErrorScope('validation');const p=pipeline(shader,format,blend);const err=await device.popErrorScope();if(err)throw Error(`Pipeline validation failed: ${err.message}`);return p}
let creativeModules=[];
function makeBinds(){

const layout=(p)=>p.getBindGroupLayout(0);let uw=own(device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})),bh=own(device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})),bv=own(device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})),cu=own(device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})),cardU=own(device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));
srcBind=device.createBindGroup({layout:layout(srcPipe),entries:[{binding:0,resource:{buffer:uw}}]});
blurHBind=device.createBindGroup({layout:layout(blurPipe),entries:[{binding:0,resource:sourceTex.createView()},{binding:1,resource:{buffer:bh}}]});blurVBind=device.createBindGroup({layout:layout(blurPipe),entries:[{binding:0,resource:blurHTex.createView()},{binding:1,resource:{buffer:bv}}]});
compBind=device.createBindGroup({layout:layout(compPipe),entries:[{binding:0,resource:sourceTex.createView()},{binding:1,resource:blurVTex.createView()},{binding:2,resource:{buffer:cu}}]});baselineBind=device.createBindGroup({layout:layout(baselinePipe),entries:[{binding:0,resource:{buffer:cardU}}]});dispBind=device.createBindGroup({layout:layout(dispPipe),entries:[{binding:0,resource:sceneTex.createView()}]});
for(const b of Object.values(device._r774Buffers||{}))destroyOwned(b);device._r774Buffers={uw,bh,bv,cu,cardU};}
function pass(encod,view,pipe,bind,clear=[0,0,0,0],loadOp='clear'){const p=encod.beginRenderPass({colorAttachments:[{view,clearValue:{r:clear[0],g:clear[1],b:clear[2],a:clear[3]},loadOp,storeOp:'store'}]});p.setPipeline(pipe);p.setBindGroup(0,bind);p.draw(3);p.end()}
function frameRegistration(admitted){const c=canvas.getBoundingClientRect(),r=card.getBoundingClientRect(),frameId=sequence+1,source=[240,210],sourceHeight=64,targetVisible=card.isConnected&&getComputedStyle(card).visibility!=='hidden'&&getComputedStyle(card).display!=='none'&&Number(getComputedStyle(card).opacity)>0&&r.width>=40&&r.height>=24&&r.right>c.left&&r.left<c.right&&r.bottom>c.top&&r.top<c.bottom,sourceVisible=source[0]+sourceHeight>0&&source[0]<c.width&&source[1]+sourceHeight>0&&source[1]<c.height;return {coordinateSpace:'canvas-css',frameId,sourceFrameId:frameId,targetFrameId:frameId,roomId:'fixture-room-1',sessionId:'fixture-session-1',playerId:'fixture-self-1',abilityId:admitted.abilityId,sourceRegistrationId:'fixture-self-projection-1',sourceGeneration:1,source,sourceHeight,targetRegistrationId:'fixture-status-card-1',targetGeneration:1,targetSemantic:'ability-product-owned-status',sourceVisible,targetVisible,targetRect:{x:r.left-c.left,y:r.top-c.top,width:r.width,height:r.height}}}
function frame(){
 raf=0;
 if(disposed||!device)return;
 const v=cssViewport(),active=!!cause,age=active?(diagnosticAge!==null?diagnosticAge:(held?heldAge:performance.now()-start)):0;
 const registration=frameRegistration(cause||{abilityId:'gunner-special-ammo'});
 let plan=null,uniform=null;
 if(active){
  const refreshed=E.refreshFramePlan(cause,age,registration,{sourceEnabled:enabled,nearEnabled:near,sparkleEnabled:sparkle,observerEnabled:observer,reducedMotion:reduced});
  if(!refreshed.ok){report.textContent=JSON.stringify({refreshRejected:refreshed.reason,causeKey:cause.causeKey,ageMs:age},null,2);retireCause();}
  else{plan=refreshed.plan;uniform=E.packUniforms(plan,v);}
 }
 const {uw,bh,bv,cu,cardU}=device._r774Buffers;
 if(plan)device.queue.writeBuffer(uw,0,uniform);else device.queue.writeBuffer(uw,0,new Uint8Array(80));
 const dims=new Float32Array([v.width,v.height,2*v.dpr,0]);
 device.queue.writeBuffer(bh,0,dims);device.queue.writeBuffer(bh,16,new Float32Array([1,0,0,0]));device.queue.writeBuffer(bv,0,dims);device.queue.writeBuffer(bv,16,new Float32Array([0,1,0,0]));device.queue.writeBuffer(cu,0,new Float32Array([plan&&observer?1:0,0,0,0]));
 const target=plan?.targetRect??registration.targetRect;
 const cardParams=packStatusCardBaselineUniform(v,target,registration.targetVisible);device.queue.writeBuffer(cardU,0,cardParams);
 const e=device.createCommandEncoder({label:plan?'R3 cause frame plus UI baseline':'R3 persistent UI baseline'});
 pass(e,sourceTex.createView(),srcPipe,srcBind);
 pass(e,blurHTex.createView(),blurPipe,blurHBind);
 pass(e,blurVTex.createView(),blurPipe,blurVBind);
 pass(e,sceneTex.createView(),baselinePipe,baselineBind,[0.012,0.025,0.03,1]);
 pass(e,sceneTex.createView(),compPipe,compBind,[0,0,0,0],'load');
 pass(e,context.getCurrentTexture().createView(),dispPipe,dispBind,[0,0,0,1]);
 device.queue.submit([e.finish()]);
 if(plan&&cause){
  const rec={sequence:++sequence,causeKey:cause.causeKey,ageMs:age,phase:E.phase(age),plan:{causeKey:plan.causeKey,roomId:plan.roomId,sessionId:plan.sessionId,playerId:plan.playerId,abilityId:plan.abilityId,source:[...plan.source],sourceHeight:plan.sourceHeight,sourceRegistrationId:plan.sourceRegistrationId,sourceGeneration:plan.sourceGeneration,targetRect:{...plan.targetRect},targetRegistrationId:plan.targetRegistrationId,targetGeneration:plan.targetGeneration,frameRegistrationId:plan.frameRegistrationId,coordinateSpace:plan.coordinateSpace,gates:{sourceEnabled:enabled,nearEnabled:near,sparkleEnabled:sparkle,observerEnabled:observer}},uniforms:Array.from(uniform),uniformHash:null,sourceHash,shaderHashes:shaders.map(x=>x.hash),hostBaselineShaderHash,viewport:{...v},submittedAt:performance.now()};submissions.push(rec);
  tracked(device.queue.onSubmittedWorkDone().then(async()=>{rec.uniformHash=await digestBytes(uniform);completed.push({...rec,completedAt:performance.now()})}).catch(x=>{report.textContent='GPU completion error: '+x}));
  const liveSubmission=rec;tracked(device.queue.onSubmittedWorkDone().then(()=>{if(!ready&&cause?.causeKey===liveSubmission.causeKey){ready=true;report.textContent=JSON.stringify({ready:true,edition:E.EDITION,causeKey:cause.causeKey,sourceHash,shaderHashes:shaders.map(x=>x.hash),hostBaselineShaderHash,firstCompletedSequence:liveSubmission.sequence},null,2)}}).catch(()=>{}));
  if(age>=E.LIFE_MS)retireCause();
 }
 if(!disposed)raf=requestAnimationFrame(frame)
}
function admissionInput(id){const r=card.getBoundingClientRect(),s=canvas.getBoundingClientRect();return {kind:'successful-new-self-ability-entitlement',success:true,duplicate:false,initialSeeding:false,abilityId:'gunner-special-ammo',playerId:'fixture-self-1',roomId:'fixture-room-1',sessionId:'fixture-session-1',authorityTimeMs:Date.now(),beforeEntitlements:[],afterEntitlements:['gunner-special-ammo'],transactionId:id,target:{abilityId:'gunner-special-ammo',playerId:'fixture-self-1',roomId:'fixture-room-1',sessionId:'fixture-session-1',registrationId:'fixture-status-card-1',generation:1,visible:true,semantic:'ability-product-owned-status',rect:{x:r.left-s.left,y:r.top-s.top,width:r.width,height:r.height}},sourceProjectedPosition:[240,210],sourceRegistrationHeight:64,sourceRegistrationId:'fixture-self-projection-1',sourceGeneration:1,fixtureOnly:true}}
function fixture(id){if(disposed)return;retireCause();const input=admissionInput(id),context={selfId:'fixture-self-1',roomId:'fixture-room-1',sessionId:'fixture-session-1',authorityNowMs:input.authorityTimeMs,targetGeneration:1,sourceGeneration:1,sourceRegistrationId:'fixture-self-projection-1',authoritativeEntitlements:['gunner-special-ammo']};const result=gate.accept(input,context);if(!result.ok)throw Error('Fixture admission refused: '+result.reason);cause=result;start=performance.now();heldAge=0;diagnosticAge=null;held=false;observer=true;enabled=true;near=true;reduced=false;ready=false;if(audioCtx?.state==='running'&&!muted)void playAudio();}
function retireCause(){cause=null;held=false;stopAudio()}
function stopAudio(){if(audioCtx){for(const s of audioCtx._sources||[]){try{s.stop()}catch{}try{s.disconnect()}catch{}}audioCtx._sources=[]}}
async function playAudio(){if(disposed)return;const admitted=cause;if(!admitted||verify||muted)return;audioCtx??=new AudioContext();if(audioCtx.state!=='running'){try{await tracked(audioCtx.resume())}catch{return}}const state={running:audioCtx.state==='running',visible:!document.hidden,muted,verify,targetGeneration:1};const age=performance.now()-start,plan=E.samplePlan(admitted,age);if(disposed||admitted!==cause||!E.audioAdmission(plan,state)||audioPlayed.has(admitted.causeKey))return;audioBuf??=audioCtx.createBuffer(1,Math.ceil(audioCtx.sampleRate*E.SFX_DURATION_SECONDS),audioCtx.sampleRate);audioBuf.copyToChannel(E.synthesizeSfx(audioCtx.sampleRate),0);const s=audioCtx.createBufferSource(),g=audioCtx.createGain();audioVoices.add(s);audioGains.add(g);s.onended=()=>{audioVoices.delete(s);audioGains.delete(g);s.disconnect();g.disconnect()};s.buffer=audioBuf;g.gain.value=.4;s.connect(g).connect(audioCtx.destination);s.start();audioPlayed.add(admitted.causeKey);(audioCtx._sources??=[]).push(s)}
async function init(){if(!navigator.gpu)throw Error('WebGPU unavailable');gpu=navigator.gpu;const a=await gpu.requestAdapter();if(disposed)return;if(!a)throw Error('No WebGPU adapter');device=await a.requestDevice();if(disposed)return;context=canvas.getContext('webgpu');contextAcquired=!!context;fmt=gpu.getPreferredCanvasFormat();context.configure({device,format:fmt,alphaMode:'opaque'});cssViewport();
 const mods=shaders.map(x=>module(x.text,x.name));creativeModules=mods;for(const m of mods){const info=await m.getCompilationInfo();const errors=info.messages.filter(x=>x.type==='error');if(errors.length)throw Error('WGSL compile failed: '+JSON.stringify(errors))}srcPipe=await scopedPipeline(mods[0]);blurPipe=await scopedPipeline(mods[1]);compPipe=await scopedPipeline(mods[2],'rgba16float',{color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'zero',dstFactor:'one',operation:'add'}});const baselineModule=module(baselineText,'R3 status-card baseline');const baselineInfo=await baselineModule.getCompilationInfo();if(baselineInfo.messages.some(x=>x.type==='error'))throw Error('Baseline WGSL compile failed: '+JSON.stringify(baselineInfo.messages));baselinePipe=await scopedPipeline(baselineModule);const displayCode=`@group(0) @binding(0) var image:texture_2d<f32>; struct O{@builtin(position) p:vec4f}; @vertex fn vs(@builtin(vertex_index)n:u32)->O{var a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:O;o.p=vec4f(a[n],0,1);return o;} @fragment fn fs(@builtin(position)p:vec4f)->@location(0) vec4f{let x=textureLoad(image,vec2i(p.xy),0).rgb;let mapped=x/(vec3f(1)+max(x,vec3f(0)));return vec4f(pow(max(mapped,vec3f(0)),vec3f(1.0/2.2)),1);}`;const displayModule=module(displayCode,'host display conversion');const displayInfo=await displayModule.getCompilationInfo();if(displayInfo.messages.some(x=>x.type==='error'))throw Error('Host display WGSL compile failed');dispPipe=await scopedPipeline(displayModule,navigator.gpu.getPreferredCanvasFormat());makeBinds();await device.queue.onSubmittedWorkDone();if(disposed)return;$('#report').textContent=JSON.stringify({ready:false,edition:E.EDITION,model:'GPT-6.1-Sol new creative and neutral host adaptation; historical base by GPT-6-Luna',sourceHash,shaders:shaders.map(({name,hash})=>({name,hash})),hostBaselineShaderHash,composition:'opaque status-card baseline pass then R3 additive E LOAD pass; CSS shadow removed',compilation:'actual getCompilationInfo and validation scopes passed; pending live cause frame'},null,2);raf=requestAnimationFrame(frame);initialTimer=setTimeout(()=>{initialTimer=0;if(!disposed&&!cause)fixture('fixture-intent-001')},1000)}
async function snapshot(){const last=submissions.at(-1);const done=last&&completed.find(x=>x.sequence===last.sequence);report.textContent=JSON.stringify({ready:!!done,causeKey:cause?.causeKey??null,submitted:last??null,completed:done??null,counts:{submitted:submissions.length,completed:completed.length},retired:disposed,verify,muted},null,2)}
function retire(){
 if(cleanupPromise)return cleanupPromise;disposed=true;cancelAnimationFrame(raf);raf=0;clearTimeout(initialTimer);initialTimer=0;retireCause();stopAudio();
 cleanupPromise=(async()=>{
  await initPromise;while(pendingTasks.size)await Promise.allSettled([...pendingTasks]);
  const audioErrors=[];for(const s of audioVoices){try{s.stop()}catch(e){if(e?.name!=='InvalidStateError')audioErrors.push(String(e))}try{s.disconnect()}catch(e){audioErrors.push(String(e))}}audioVoices.clear();for(const g of audioGains){try{g.disconnect()}catch(e){audioErrors.push(String(e))}}audioGains.clear();
  if(audioCtx&&audioCtx.state!=='closed'){try{await audioCtx.close()}catch(e){audioErrors.push(String(e))}}
  let drained=false;if(device){try{await device.queue.onSubmittedWorkDone();drained=true}catch(e){cleanupErrors.push('queue: '+e)}}
  for(const r of ownedResources){try{destroyOwned(r)}catch(e){cleanupErrors.push('resource: '+e)}}
  if(contextAcquired){try{context.unconfigure();contextUnconfigured=true}catch(e){cleanupErrors.push('context: '+e)}}
  if(device){try{device.destroy();deviceDestroyCalled=true;ownedLoss=await device.lost;if(ownedLoss?.reason!=='destroyed')cleanupErrors.push('Unexpected owned device loss '+ownedLoss?.reason)}catch(e){cleanupErrors.push('device: '+e)}}
  cleanupErrors.push(...audioErrors);
  cleanupProof={proofSchema:'ability-gallery-retirement/v1',disposeSettled:true,closed:disposed,initSettled,creationClosed:true,pendingInit:0,pendingRender:pendingTasks.size,pumpStopped:!raf&&!initialTimer,resourcesCreated:ownedResources.size,resourcesDestroyed:destroyedResources.size,resourcesDisposed:ownedResources.size===destroyedResources.size,contextState:contextAcquired?(contextUnconfigured?'unconfigured':'configured'):'not-acquired',cleanupErrors:[...cleanupErrors],audio:{disposeSettled:true,contextState:audioCtx?.state??'absent',voicesRemaining:audioVoices.size,gainsRemaining:audioGains.size,cleanupErrors:audioErrors},teardown:device?'disposed':'never-created',deviceLifecycle:device?'destroyed-loss-settled':'never-created',variant:device?'destroyed':'no-device',device:device?{status:'destroyed-loss-settled',drained,destroyCalled:deviceDestroyCalled,lostReason:ownedLoss?.reason}:null};
  if(cleanupErrors.length||!cleanupProof.resourcesDisposed||!cleanupProof.pumpStopped||!['absent','closed'].includes(cleanupProof.audio.contextState))throw Object.assign(Error('Ability cleanup incomplete'),{lifecycle:cleanupProof});
  report.textContent='Retired; actual owned queue/resource/context/device/audio cleanup completed.';return cleanupProof;
 })();return cleanupPromise;
}
for(const b of document.querySelectorAll('button'))b.onclick=()=>{if(disposed)return;switch(b.dataset.action){case'replay':fixture('fixture-replay-'+crypto.randomUUID());break;case'hold':if(!held){heldAge=Math.max(0,performance.now()-start);held=true}else{start=performance.now()-heldAge;held=false}break;case'setage':diagnosticAge=Math.max(0,Math.min(1200,Number(document.querySelector('#diagnostic-age').value)||0));observer=true;enabled=true;near=true;reduced=false;break;case'clearage':diagnosticAge=null;break;case'observer':observer=!observer;break;case'source':enabled=!enabled;break;case'near':near=!near;break;case'sparkle':sparkle=!sparkle;break;case'variant':reduced=!reduced;break;case'audio':muted=verify||!muted;if(!muted)void playAudio();break;case'snapshot':snapshot();break;case'retire':void retire();break}};
device?.lost?.then(info=>{if(!disposed){disposed=true;cancelAnimationFrame(raf);retireCause();report.textContent='Device lost: '+JSON.stringify(info)}});
addEventListener('resize',()=>{if(!disposed)cssViewport()});document.addEventListener('visibilitychange',()=>{if(document.hidden)void retire().catch(()=>{})});
const initPromise=Promise.resolve().then(()=>disposed?undefined:init()).catch(e=>{report.textContent='Not ready: '+e.stack;}).finally(()=>{initSettled=true});
window.__dvaAbilityHostReady=initPromise;
initPromise.then(()=>{if(device)device.lost.then(info=>{if(!disposed){report.textContent='Device lost: '+JSON.stringify(info);void retire().catch(()=>{})}})});


window.__dvaAbilityEntitlementE=Object.freeze({
 versionId:E.EDITION,lifeMs:E.LIFE_MS,replay:()=>fixture("fixture-api-"+crypto.randomUUID()),
 setAge:age=>{if(disposed)return false;if(!Number.isFinite(age)||age<0||age>1200)throw Error("diagnostic age");diagnosticAge=age;return age;},
 clearAge:()=>{diagnosticAge=null;},options:v=>{if(disposed)return false;if(typeof v.sourceEnabled==="boolean")enabled=v.sourceEnabled;if(typeof v.nearEnabled==="boolean")near=v.nearEnabled;if(typeof v.observerEnabled==="boolean")observer=v.observerEnabled;if(typeof v.sparkleEnabled==="boolean")sparkle=v.sparkleEnabled;if(typeof v.reducedMotion==="boolean")reduced=v.reducedMotion;},
 snapshot:()=>({versionId:E.EDITION,lifeMs:E.LIFE_MS,ready,disposed,verify,muted,diagnosticAge,causeKey:cause?.causeKey??null,submitted:submissions.at(-1)??null,completed:completed.at(-1)??null,counts:{submitted:submissions.length,completed:completed.length},sourceHash,shaders:shaders.map(({name,hash})=>({name,hash})),hostBaselineShaderHash}),lifecycleSnapshot,retire
});
