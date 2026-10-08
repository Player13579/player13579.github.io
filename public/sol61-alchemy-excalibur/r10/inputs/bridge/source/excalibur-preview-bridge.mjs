import * as r9Plan from '../inputs/r9/excalibur-r8-creative-plan.mjs';
import * as r9Shader from '../inputs/r9/excalibur-r8-creative-shader.mjs';
import * as r10Plan from '../inputs/r10/excalibur-r8-creative-plan.mjs';
import * as r10Shader from '../inputs/r10/excalibur-r8-creative-shader.mjs';
import { wrapObserver } from '../inputs/r10/excalibur-r8-engineering-shaders.mjs';
import { createExcaliburR8ReleaseLedger } from '../inputs/r10/excalibur-r8-release-ledger.mjs';
import { createUniformRetirement } from '../inputs/r10/excalibur-r8-uniform-retirement.mjs';

export const SCOPE = 'standalone-preview-only';
export const ATLAS = Object.freeze({
  'white-hood': Object.freeze({width:1684,height:934,version:'v483',sha256:'8ebdbe28d6959adcb713f9dc90b391ec33fb26ec762fef23418b7c8eb4f90449'}),
  'blue-dress': Object.freeze({width:1695,height:928,version:'v483',sha256:'f5d21668fe72b36cc0d01ca84a7e20ea83a45f9d7341ddf7bdd6ab77af25d733'}),
  'male-bot': Object.freeze({width:1774,height:887,version:'v465',sha256:'7c969920eb217aa9398ea80361de87f65beffac0051dd8499128d531e0b7d8eb'})
});
// Exact registered source-pixel landmarks from sealed R10 source/app.js.
export const LANDMARKS = Object.freeze({
  'white-hood': Object.freeze([[307,548,280,601,32,868],[650,455,710,458,1139,458],[1273,527,1320,571,1661,789]].map(Object.freeze)),
  'blue-dress': Object.freeze([[222,548,178,590,25,759],[775,455,724,462,499,486],[1448,568,1480,605,1623,772]].map(Object.freeze)),
  'male-bot': Object.freeze([[412,424,418,375,452,157],[955,440,1008,429,1214,385],[1540,453,1572,408,1646,195]].map(Object.freeze))
});
const finite = Number.isFinite;
const same = (a,b) => Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((n,i)=>n===b[i]);
const affine = m => Array.isArray(m)&&m.length===6&&m.every(finite)&&Math.abs(m[0]*m[3]-m[1]*m[2])>1e-12;
const apply = (m,p) => Object.freeze({x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]});
const inverse = m => {const d=m[0]*m[3]-m[1]*m[2];return [m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];};
const clear = Object.freeze({r:0,g:0,b:0,a:0});

async function compile(device,label,code,layout) {
  const module=device.createShaderModule({label,code});
  const compilation=await module.getCompilationInfo();
  const errors=compilation.messages.filter(m=>m.type==='error');
  if(errors.length)throw new Error(`${label}: ${errors.map(m=>`${m.lineNum}:${m.linePos} ${m.message}`).join('\n')}`);
  const pipeline=await device.createRenderPipelineAsync({label,layout,
    vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:'rgba16float',writeMask:15},{format:'rgba16float',writeMask:15}]},
    primitive:{topology:'triangle-list'}});
  return {pipeline,compilation};
}

export async function createExcaliburPreviewBridge({renderer,textureCache,edition='r10',onCommitted=null}={}) {
  if(!['r9','r10'].includes(edition))throw new TypeError('Exact r9 or r10 edition required');
  if(renderer?.state!=='ready'||!renderer.device||!Number.isSafeInteger(renderer.deviceGeneration)||renderer.deviceGeneration<1||
    typeof renderer.registerTextureTarget!=='function'||typeof renderer.registerSampledMaterial!=='function'||
    typeof renderer.encodeLinearHDRLayer!=='function'||typeof textureCache?.materialFor!=='function')
    throw new TypeError('Current shared renderer and actual player texture cache required');
  const device=renderer.device,deviceGeneration=renderer.deviceGeneration;
  const shaders=edition==='r10'?r10Shader:r9Shader;
  const planner=edition==='r10'?r10Plan.planExcaliburR10Preview:args=>{
    if(args.source.previewOnly!==true||args.frame.previewOnly!==true)throw new TypeError('R9 previewOnly required');
    return Object.freeze({...r9Plan.planExcaliburR8(args),scope:SCOPE});
  };
  const worldLayout=device.createBindGroupLayout({entries:[
    {binding:0,visibility:2,buffer:{type:'uniform',minBindingSize:224}},
    {binding:1,visibility:2,texture:{sampleType:'float',viewDimension:'2d'}},
    {binding:2,visibility:2,sampler:{type:'filtering'}}]});
  const observerLayout=device.createBindGroupLayout({entries:[
    {binding:0,visibility:2,buffer:{type:'uniform',minBindingSize:224}},
    {binding:1,visibility:2,texture:{sampleType:'float',viewDimension:'2d'}},
    {binding:2,visibility:2,texture:{sampleType:'float',viewDimension:'2d'}},
    {binding:3,visibility:2,sampler:{type:'filtering'}},
    {binding:4,visibility:2,texture:{sampleType:'float',viewDimension:'2d'}}]});
  const [world,observer]=await Promise.all([
    compile(device,`Excalibur ${edition} preview world MRT`,shaders.WORLD_WGSL,device.createPipelineLayout({bindGroupLayouts:[worldLayout]})),
    compile(device,`Excalibur ${edition} preview observer snapshot`,wrapObserver(shaders.OBSERVER_WGSL),device.createPipelineLayout({bindGroupLayouts:[observerLayout]}))]);
  const sampler=device.createSampler({magFilter:'linear',minFilter:'linear',mipmapFilter:'nearest'});
  const sets=new Map(),materials=new Map(),causes=new Map(),frameRecords=new WeakMap();
  // Private preview ledger. It is never the game's acceptedSources collection.
  const ledger=createExcaliburR8ReleaseLedger();
  let destroyed=false,lost=false,serial=0,nextToken=0;
  device.lost.then(()=>{lost=true;for(const id of causes.keys())ledger.retire(id);causes.clear();},()=>{lost=true;causes.clear();});
  const ready=()=>!destroyed&&!lost&&renderer.state==='ready'&&renderer.device===device&&renderer.deviceGeneration===deviceGeneration;
  function physical(viewport,lease=viewport?.targetLease) {
    try{return Boolean(ready()&&lease&&viewport.targetLease===lease&&lease.isCurrent()===true&&
      lease.device===device&&lease.deviceGeneration===deviceGeneration&&viewport.device===device&&viewport.deviceGeneration===deviceGeneration&&
      Number.isSafeInteger(lease.generation)&&lease.generation>0&&viewport.generation===lease.generation&&viewport.targetGeneration===lease.generation&&
      viewport.pixelWidth===lease.width&&viewport.pixelHeight===lease.height&&lease.width>0&&lease.height>0&&
      viewport.width===lease.logicalWidth&&viewport.height===lease.logicalHeight&&
      [viewport.width,viewport.height,viewport.dpr].every(n=>finite(n)&&n>0)&&affine(viewport.worldToLogical)&&affine(viewport.logicalToPixel));}catch{return false;}
  }
  function currentSet(set,viewport) {
    const lease=viewport.targetLease;
    return Boolean(set&&physical(viewport)&&set.targetIdentity===lease.targetIdentity&&set.generation===lease.generation&&
      set.width===lease.width&&set.height===lease.height&&Object.values(set.handles).every(h=>h.generation===lease.generation&&h.deviceGeneration===deviceGeneration&&h.width===lease.width&&h.height===lease.height)&&
      Object.values(set.leases).every(l=>l.isCurrent()&&l.device===device&&l.deviceGeneration===deviceGeneration&&l.generation===lease.generation));
  }
  function materialFor(command) {
    const pin=ATLAS[command?.identity];
    if(!pin||command.assetPath!==`assets/generated/physical-motion-${command.identity}-slash-${pin.version}-webgpu-alpha-v1.png`||command.assetSha256!==pin.sha256||
      command.image?.naturalWidth!==pin.width||command.image?.naturalHeight!==pin.height)throw new Error('Unregistered atlas path/hash/dimensions');
    const supplied=textureCache.materialFor(command);
    if(supplied.device!==device||supplied.image!==command.image||supplied.assetPath!==command.assetPath||supplied.sourceSha256?.toLowerCase()!==pin.sha256||
      supplied.width!==pin.width||supplied.height!==pin.height||supplied.isCurrent()!==true)throw new Error('Actual uploaded atlas cache mismatch');
    const id=`excalibur-preview:${edition}:atlas:${pin.sha256}`;
    let item=materials.get(id);
    if(!item||item.texture!==supplied.texture||item.cacheEpoch!==supplied.cacheEpoch||!item.isCurrent()){
      item?.registration.unregister();
      item={...supplied,id,registration:renderer.registerSampledMaterial(id,supplied.texture,supplied)};
      materials.set(id,item);
    }
    return item;
  }
  async function removeSet(id,set) {
    sets.delete(id);for(const h of Object.values(set.handles))h.unregister();
    try{await device.queue.onSubmittedWorkDone();}catch{}
    for(const t of Object.values(set.textures))t.destroy();
  }
  async function prepare({viewport,sourceIds=[],prewarmCommands=[]}={}) {
    const request=++serial;
    if(!physical(viewport))return false;
    const ids=new Set(sourceIds.map(String));
    if(ids.size>32||[...ids].some(id=>!id))throw new RangeError('Preview source cap is 32');
    const lease=viewport.targetLease;
    for(const command of prewarmCommands)materialFor(command);
    for(const [id,set] of [...sets])if(!ids.has(id)||!currentSet(set,viewport)){
      await removeSet(id,set);ledger.retire(id);causes.delete(id);
      if(request!==serial||!physical(viewport,lease))return false;
    }
    for(const id of ids)if(!sets.has(id)){
      const token=++nextToken,textures={},handles={},leases={},targetIds={};
      try{
        for(const name of ['main','source','observer','backdrop']){
          if(request!==serial||!physical(viewport,lease))throw new Error('Stale preview target allocation');
          const key=`excalibur-preview:${edition}:${token}:${name}`;targetIds[name]=key;
          textures[name]=device.createTexture({label:key,size:[lease.width,lease.height],format:'rgba16float',usage:0x14});
          handles[name]=renderer.registerTextureTarget(key,textures[name],{width:lease.width,height:lease.height,format:'rgba16float',encoderOnly:true,generation:lease.generation,device});
          leases[name]=handles[name].captureLease();
        }
      }catch(error){await removeSet(id,{textures,handles});if(request!==serial||!physical(viewport,lease))return false;throw error;}
      sets.set(id,{textures,handles,leases,ids:targetIds,targetIdentity:lease.targetIdentity,generation:lease.generation,width:lease.width,height:lease.height});
      if(!currentSet(sets.get(id),viewport)){await removeSet(id,sets.get(id));return false;}
    }
    if(request!==serial||!physical(viewport,lease))return false;
    return Object.freeze({scope:SCOPE,edition,targetGeneration:lease.generation,sourceCount:sets.size});
  }
  function descriptorFor(command,source,action,viewport) {
    const pose=command?.excaliburPoseIndex,s=command?.sprite,scale=command?.excaliburPoseScale,origin=command?.excaliburPoseOrigin;
    const support=r10Plan.SOURCE_SUPPORT[command?.identity],marks=LANDMARKS[command?.identity]?.[pose];
    if(!support||!marks||command.movementMode!=='alchemy-excalibur-slash'||command.exAction!==action||action?.poseIndex!==pose||action.poseScale!==scale||
      action.kind!=='slash'||action.motionId!=='alchemy-excalibur'||action.sourceEffectId!==source.id||action.roomId!==source.roomId||action.generation!==source.localGeneration||
      action.targetGeneration!==viewport.generation||!finite(action.progress)||action.progress<0||action.progress>=1||
      String(command.sourceEffectId)!==String(source.id)||String(command.playerId)!==String(source.playerId)||command.excaliburRoomId!==source.roomId||
      !same(s?.crop,support.crops[pose])||!same(s.sourceSize,support.size)||!affine(s.transform)||!finite(scale)||scale<=0||
      origin?.x!==s.crop[2]/2||origin?.y!==s.crop[3]||s.x!==-origin.x*scale||s.y!==-origin.y*scale||s.w!==s.crop[2]*scale||s.h!==s.crop[3]*scale)return null;
    const extensions=command.extensions;
    if(!Array.isArray(extensions)||extensions.length!==(pose===1?1:0))return null;
    if(pose===1){const p=extensions[0],ps=p?.sprite;
      if(!p?.bladePatch||p.image!==command.image||!same(ps?.crop,support.patch)||!same(ps.transform,s.transform)||ps.sourceSize!==s.sourceSize||ps.mode!==s.mode||ps.color!==s.color||
        String(p.sourceEffectId)!==String(source.id)||String(p.playerId)!==String(source.playerId)||p.movementMode!==command.movementMode||
        ps.x!==(ps.crop[0]-s.crop[0]-s.crop[2]/2)*scale||ps.y!==(ps.crop[1]-s.crop[1]-s.crop[3])*scale||ps.w!==ps.crop[2]*scale||ps.h!==ps.crop[3]*scale)return null;}
    const inv=inverse(viewport.worldToLogical);
    const points=[0,1,2].map(i=>{
      const sourcePoint=Object.freeze([marks[2*i],marks[2*i+1]]),local=Object.freeze({x:(sourcePoint[0]-s.crop[0]-origin.x)*scale,y:(sourcePoint[1]-s.crop[1]-origin.y)*scale});
      const logical=apply(s.transform,local);return Object.freeze({source:sourcePoint,local,logical,world:apply(inv,logical),pixel:apply(viewport.logicalToPixel,logical)});
    });
    return Object.freeze({sourceEffectId:String(source.id),ownerId:String(source.playerId),roomId:source.roomId,generation:viewport.generation,deviceGeneration,
      poseIndex:pose,spriteCommand:command,grip:points[0],root:points[1],tip:points[2],scope:SCOPE});
  }
  function record({frame,target='main',viewport,source,command=null,action=null,eAgeSeconds,pathEndWorld,
    currentState,mainOn=true,sourceOn=true,observerOn=true,held=false,releaseBoundary=.52}={}) {
    if(source?.previewOnly!==true)throw new TypeError('Explicit previewOnly source required');
    if(source.type!=='alchemy-excalibur'||!source.id||!source.playerId||!source.roomId||!Number.isSafeInteger(source.localGeneration)||
      !finite(source.startedAt)||!finite(source.duration)||source.duration<1200)return false;
    const id=String(source.id),set=sets.get(id),lease=viewport?.targetLease;
    const capturedDpr=globalThis.devicePixelRatio;
    const stateCurrent=()=>{try{return currentState?.targetLease===lease&&currentState.isCurrent()===true&&currentState.ownerAlive===true&&currentState.ownerVisible===true&&currentState.connectedVisible===true;}catch{return false;}};
    const current=()=>physical(viewport,lease)&&target===lease.targetId&&currentSet(set,viewport)&&stateCurrent()&&
      (!finite(capturedDpr)||globalThis.devicePixelRatio===capturedDpr);
    if(!current()||typeof frame?.addEncoder!=='function'||typeof frame?.sprite!=='function'||!finite(eAgeSeconds)||eAgeSeconds<0||eAgeSeconds>=source.duration/1000)return false;
    let seen=frameRecords.get(frame);if(!seen){seen=new Set();frameRecords.set(frame,seen);}if(seen.has(id))return false;
    const previous=causes.get(id);
    if(previous&&previous.source!==source)throw new Error('Preview cause identity reused without retire');
    const descriptor=command?descriptorFor(command,source,action,viewport):null;
    if(command&&!descriptor)return false;
    const material=command?materialFor(command):previous?.material;
    if(!material||material.isCurrent()!==true)return false;
    let release=ledger.acceptedRelease(source),candidate=null;
    if(descriptor?.poseIndex===2&&!release)candidate=ledger.candidate({source,descriptor,action,releaseBoundary,eAgeSeconds,pathEndWorld});
    if(candidate)release=candidate;
    let bodyQueued=false;
    const callbacks=ledger.frameCallbacks({source,descriptor,packet:candidate});
    // The bridge owns these real same-frame body/patch enqueue calls. External
    // receipt-shaped bodyEnqueued or poseWillSubmit inputs are never accepted.
    if(command){frame.sprite(target,{...command.sprite,texture:material.texture});for(const patch of command.extensions)frame.sprite(target,{...patch.sprite,texture:material.texture});bodyQueued=true;}
    const plan=planner({source,descriptor,action,release,frame:{previewOnly:true,roomId:source.roomId,localGeneration:source.localGeneration,
      sourceCurrent:current(),ownerAlive:currentState.ownerAlive,ownerVisible:currentState.ownerVisible,connectedVisible:currentState.connectedVisible,
      viewport,expectedGeneration:lease.generation,targetGeneration:lease.generation,deviceGeneration,expectedDeviceGeneration:deviceGeneration,
      eEffectNow:source.startedAt+eAgeSeconds*1000,poseWillSubmit:d=>bodyQueued&&d===descriptor,
      releaseEncodedWithPose:(p,d)=>bodyQueued&&callbacks.releaseEncodedWithPose(p,d),acceptedRelease:p=>ledger.acceptedRelease(source)===p,
      mainOn,sourceOn,observerOn,held}});
    if(!plan.active)return false;
    if(plan.uniforms.length!==56||plan.uniforms.byteLength!==224||![...plan.uniforms].every(finite))throw new Error('Exact 56-float uniform ABI required');
    seen.add(id);const cause=previous||{source,material};cause.material=material;causes.set(id,cause);
    const uniform=device.createBuffer({label:`Excalibur ${edition} preview ${id}`,size:224,usage:0x48});
    device.queue.writeBuffer(uniform,0,plan.uniforms);
    const retirement=createUniformRetirement({device,buffer:uniform});
    const ids=set.ids;
    const guard=()=>current()&&causes.get(id)===cause&&material.isCurrent()&&(!command||bodyQueued);
    try{
      frame.addEncoder({label:`Excalibur ${edition} preview world ${id}`,reads:[],writes:[ids.main,ids.source],materials:[material.id],initializes:[ids.main,ids.source],targetGeneration:lease.generation,
        encode(encoder,info){if(!guard())throw new Error('Preview world ownership stale');const registered=info.material(material.id);
          const group=device.createBindGroup({layout:worldLayout,entries:[{binding:0,resource:{buffer:uniform,offset:0,size:224}},{binding:1,resource:registered.view},{binding:2,resource:sampler}]});
          const pass=encoder.beginInitializedRenderPass({label:`Excalibur ${edition} preview world MRT`,colorAttachments:[ids.main,ids.source].map(target=>({target,loadOp:'clear',clearValue:clear,storeOp:'store'}))});
          pass.setPipeline(world.pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();},onAbandon:retirement.abandon,onProofError:retirement.proofError});
      frame.addEncoder({label:`Excalibur ${edition} preview observer ${id}`,reads:[ids.main,ids.source,target],writes:[ids.observer,ids.backdrop],initializes:[ids.observer,ids.backdrop],targetGeneration:lease.generation,
        encode(encoder,info){if(!guard())throw new Error('Preview observer ownership stale');const group=device.createBindGroup({layout:observerLayout,entries:[
          {binding:0,resource:{buffer:uniform,offset:0,size:224}},{binding:1,resource:info.view(ids.main)},{binding:2,resource:info.view(ids.source)},{binding:3,resource:sampler},{binding:4,resource:info.view(target)}]});
          const pass=encoder.beginInitializedRenderPass({label:`Excalibur ${edition} preview observer snapshot`,colorAttachments:[ids.observer,ids.backdrop].map(target=>({target,loadOp:'clear',clearValue:clear,storeOp:'store'}))});
          pass.setPipeline(observer.pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();},onAbandon:retirement.abandon,onProofError:retirement.proofError});
      frame.addEncoder({label:`Excalibur ${edition} preview HDR ${id}`,reads:[ids.observer,ids.backdrop],writes:[target],completedFrameTarget:target,
        encode(encoder,info){if(!guard())throw new Error('Preview HDR ownership stale');renderer.encodeLinearHDRLayer(encoder,{backdropView:info.view(ids.backdrop),hdrView:info.view(ids.observer),targetView:info.view(target),
          width:lease.width,height:lease.height,backdropEncoding:'display-sRGB',targetFormat:info.targetFormat(target)});},
        onSubmitted(proof){const completed=proof?.completedFrame;if(typeof completed?.accept!=='function')return;
          return completed.accept(guard).then(async valid=>{if(!valid||!guard())return null;
            const accepted=candidate?await ledger.observeSubmission({source,packet:candidate,proof,isCurrent:guard}):false;
            if(!guard())return null;const receipt=Object.freeze({scope:SCOPE,edition,source,packet:ledger.acceptedRelease(source),releaseAccepted:accepted,completedFrame:completed,isCurrent:guard,
              eAgeSeconds,poseIndex:descriptor?.poseIndex??null,targetGeneration:lease.generation,uniformBytes:224,status:'preview-frame-completed'});onCommitted?.(receipt);return receipt;
          });},onRetire:retirement.afterSubmission,onAbandon:retirement.abandon,onProofError:retirement.proofError});
    }catch(error){retirement.dispose();throw error;}
    return Object.freeze({scope:SCOPE,edition,causeId:id,bodyLive:bodyQueued,releaseCandidate:Boolean(candidate),releaseWorld:plan.releaseWorld,passes:3,uniformBytes:224,proofStatus:'queued; actual completed-frame proof pending'});
  }
  function retire(sourceOrId){const id=typeof sourceOrId==='string'?sourceOrId:String(sourceOrId?.id??'');ledger.retire(id);causes.delete(id);}
  async function destroy(){if(destroyed)return;destroyed=true;serial++;for(const id of causes.keys())ledger.retire(id);causes.clear();
    try{await device.queue.onSubmittedWorkDone();}catch{}
    for(const [id,set] of [...sets])await removeSet(id,set);
    for(const material of materials.values())material.registration.unregister();materials.clear();sampler.destroy?.();}
  return Object.freeze({scope:SCOPE,edition,prepare,record,recordTail:args=>record({...args,command:null,action:null}),retire,destroy,
    compilation:Object.freeze({world:world.compilation,observer:observer.compilation}),
    get acceptedCount(){return [...causes.values()].filter(c=>ledger.acceptedRelease(c.source)).length;},get sourceCount(){return causes.size;}});
}
