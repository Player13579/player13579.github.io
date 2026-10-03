import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {plan,poseMouth,poseRearExhaust,assertCurrent,VFX_WGSL,LIGHT_POST_WGSL,createPass,synthesizePCM,createAudioOwner} from './physical/rpg-e.mjs';
import {physical,makePreview} from './preview-fixture.mjs';
let checks=0;const check=(condition,label)=>{assert(condition,label);checks++;};
for(const frame of physical.frames){const data=fs.readFileSync(new URL('./motion-male-left/'+frame.file,import.meta.url));
  check(crypto.createHash('sha256').update(data).digest('hex')===frame.sha256,'approved source actual hash');}
const input=makePreview(),p=plan(input);
check(p.status==='planned'&&p.scope==='preview-only','explicit hypothetical source lease');
check(p.fields.length===4&&p.endpoints.length===2,'launch plus actual hypothetical successful outcome only');
check(!p.fields.some(f=>f.center.x===input.receipt.source.targetX&&f.center.y===input.receipt.source.targetY),'aim endpoint is not impact');
check(p.fields.find(f=>f.kind===0).center.x===poseMouth(input.poseLease,20).x,'real approved mouth anchor');
check(p.fields.find(f=>f.kind===1).center.x===poseRearExhaust(input.poseLease,20).x,'rear exhaust is not face/mouth halo');
for(const mutate of [i=>i.receipt.source.radius=301,i=>i.receipt.source.variant='gbo',i=>i.rawActorClock=NaN,
  i=>i.receipt.eClockRoomId='other',i=>i.poseLease.poseHashes[0]='forged',i=>i.receipt.attempts[0].outcome='lethal',
  i=>i.receipt.provenance='real-game-receipt']){const i=makePreview();mutate(i);i.rawActorClock=finiteOr(i.rawActorClock,NaN);check(plan(i).status==='blocked','invalid source/pose before culling');}
function finiteOr(v,fallback){return v===undefined?fallback:v;}
const expiredMalformed=makePreview();expiredMalformed.rawActorClock=5000;expiredMalformed.receipt.eClockStartedAt='1000';check(plan(expiredMalformed).status==='blocked','expired malformed source retained');
const retired=makePreview();retired.rawActorClock=2200;check(plan(retired).reason==='expired','1200E-clock boundary');
const longMotion=makePreview();longMotion.rawActorClock=1300;longMotion.motionAgeMs=280;check(!plan(longMotion).bodyActionActive,'E does not extend260 body');
const noTargets=makePreview();noTargets.receipt.attempts=[];check(plan(noTargets).fields.length===2,'valid launch without fake hit');
const invisible=makePreview();invisible.context.sourceVisible=false;check(plan(invisible).endpoints.every(e=>e.role==='impact'),'source privacy independent');
invisible.receipt.attempts[0].visible=false;check(plan(invisible).status==='omitted','all endpoints concealed');
const changed=makePreview();changed.receipt.source.x++;assert.throws(()=>assertCurrent(p,changed));checks++;
for(const role of ['launch','impact']){const pcm=synthesizePCM(role);check(pcm.every(Number.isFinite),'finite PCM');
 check(Math.max(...pcm.map(Math.abs))<=0.08500001,'bounded peak');check(pcm[0]===0&&pcm.at(-1)===0,'finite closed envelope');}
check(VFX_WGSL.includes('premultiplied')&&!VFX_WGSL.includes('texture_2d'),'no new E image texture');
check(LIGHT_POST_WGSL.includes('worldNormal')&&LIGHT_POST_WGSL.includes('worldPosition')&&LIGHT_POST_WGSL.includes('cosine'),'surface dynamic light not halo surrogate');

globalThis.GPUBufferUsage={UNIFORM:64,STORAGE:128};
const buffers=[],draws=[];let complete,queueSubmits=0;
const completion=new Promise(resolve=>complete=resolve);
const device={createShaderModule:({code})=>({code,getCompilationInfo:async()=>({messages:[]})}),
 createRenderPipelineAsync:async()=>({getBindGroupLayout:()=>({})}),createBindGroup:()=>({}),
 createBuffer:({size})=>{const b={data:new ArrayBuffer(size),dead:false,getMappedRange(){return this.data},unmap(){},destroy(){this.dead=true}};buffers.push(b);return b;},
 queue:{submit(){queueSubmits++},onSubmittedWorkDone:()=>completion}};
const encoder={beginRenderPass:()=>({setPipeline(){},setBindGroup(){},draw(...a){draws.push(a)},end(){}}),finish:()=>({})};
const pass=await createPass({device});const sourceCurrent=()=>{assertCurrent(p,input);return true;};
const prepared=pass.prepare(p,{viewport:{width:980,height:620},camera:{x:500,y:700,zoom:1},sourceCurrent});
const targetView={};const recorded=prepared.record(encoder,targetView,{lightingLease:{device,scope:'physical-surface-inputs',isCurrent:()=>true,
 baseRadiance:{},albedo:{},worldNormal:{},worldPosition:{}}});
check(draws.length===2&&draws[0][0]===3&&draws[1][1]===4,'actual API records postlight then VFX geometry');
const submitted=pass.submit(recorded);check(queueSubmits===1&&pass.isSubmitted(submitted)&&!pass.isSubmitted({...submitted}),'exact one-shot owned queue receipt');
assert.throws(()=>pass.submit(recorded));checks++;
prepared.release();check(buffers.every(b=>!b.dead),'GPU references survive until actual completion');complete();await completion;await Promise.resolve();check(buffers.every(b=>b.dead),'all buffers retire once completion');
let starts=0;const context={state:'running',sampleRate:48000,createBuffer:()=>({copyToChannel(){}}),createBufferSource:()=>({connect(){},disconnect(){},start(){starts++},stop(){}})};
const audio=createAudioOwner({context,destination:{},isSubmitted:pass.isSubmitted});
check(!audio.admit({...submitted},'launch',{unlocked:true}),'forged submit receipt cannot sound');
check(audio.admit(submitted,'launch',{unlocked:true}),'finite sound only after exact source submit');
check(!audio.admit(submitted,'launch',{unlocked:true})&&starts===1,'poll duplicates silent');
check(!audio.admit(submitted,'impact',{unlocked:true,verify:true,endpointId:'preview-attempt-1'}),'verification silent');
check(!audio.admit(submitted,'impact',{unlocked:true,endpointId:'preview-attempt-1'}),'gated sound consumed no later replay');
audio.destroy();pass.destroy();
const stalePass=await createPass({device});let current=true;
const stalePrepared=stalePass.prepare(p,{viewport:{width:980,height:620},camera:{x:500,y:700,zoom:1},sourceCurrent:()=>current});
const staleRecorded=stalePrepared.record(encoder,{});current=false;
assert.throws(()=>stalePass.submit(staleRecorded));checks++;
check(queueSubmits===1,'source invalidated after record cannot queue old frame');stalePrepared.release();stalePass.destroy();
console.log(JSON.stringify({checks,status:'pass',shaderCompilation:'mock-api-only-not-real-WGSL-compile',gpuSubmission:'mock-only',gameIntegration:'unimplemented',scope:'preview-only'},null,2));
