import assert from 'node:assert/strict';
import {createHumanTransmutationRenderer} from '../core.mjs';
import {makeFixture} from '../fixture.mjs';
globalThis.GPUTextureUsage={TEXTURE_BINDING:1,COPY_DST:2,RENDER_ATTACHMENT:4,COPY_SRC:8};globalThis.GPUBufferUsage={UNIFORM:1,COPY_DST:2};
Object.defineProperty(globalThis,'navigator',{value:{gpu:{getPreferredCanvasFormat:()=> 'bgra8unorm'}},configurable:true});
const writes=[],passes=[],pipelines=[],submissions=[];let textureNo=0;
const device={
 createShaderModule:({code})=>({code,getCompilationInfo:async()=>({messages:[]})}),
 pushErrorScope(){},popErrorScope:async()=>null,
 createRenderPipelineAsync:async desc=>{pipelines.push(desc);return {desc,getBindGroupLayout:()=>({})};},
 createBuffer:desc=>({desc,destroy(){}}),createSampler:()=>({}),createBindGroup:desc=>desc,
 createTexture:desc=>({id:++textureNo,desc,createView(){return {texture:this};},destroy(){}}),
 createCommandEncoder:()=>({beginRenderPass(desc){const p={desc,pipeline:null,bind:null,draws:0};passes.push(p);return {setPipeline(x){p.pipeline=x;},setBindGroup(i,x){p.bind=x;},draw(n){p.draws+=n;},end(){}};},finish:()=>({})}),
 queue:{writeBuffer(buffer,offset,data){writes.push({buffer,data:Array.from(data)});},submit(data){submissions.push(data);},onSubmittedWorkDone:async()=>{}},
};
const canvas={width:0,height:0,getContext:()=>({configure(){},getCurrentTexture:()=>({createView:()=>({canvas:true})}),unconfigure(){}})};
const input=makeFixture();const r=await createHumanTransmutationRenderer({canvas,device,original:{createView:()=>({original:true})},originalRegistration:input.sprite});
assert.equal(pipelines[0].fragment.targets.length,3);
for(const [options,expected] of [[{},[1,1,1]], [{observerEnabled:false},[1,0,1]], [{sourceEnabled:false},[0,1,1]], [{glintsEnabled:false},[1,1,0]]]){
 const before=passes.length;
 const receipt=await r.render({input,elapsedMs:390,width:960,height:600,...options});
 assert.equal(receipt.version,'human-transmutation-sol61-r5');assert.equal(receipt.actualActorHeight,64);assert.equal(receipt.causeId,input.event.id);assert.equal(receipt.targetId,'revived-philia');assert.equal(receipt.passes,4);assert.equal(receipt.queueCompleted,true);
 assert.deepEqual([+receipt.sourceEnabled,+receipt.observerEnabled,+receipt.glintsEnabled],expected);
 const [world,x,y,present]=passes.slice(before);assert.equal(world.desc.colorAttachments.length,3);assert.equal(world.draws,3);
 assert.equal(present.bind.entries.find(e=>e.binding===5).resource.texture,world.desc.colorAttachments[2].view.texture,'The final pass consumes exactly the glint attachment written by this frame');
 const params=writes.slice(-4)[0].data;assert.equal(params[17],expected[0]);assert.equal(params[18],expected[1]);assert.equal(params[22],expected[2]);
}
let last=await r.render({input,elapsedMs:1200,width:960,height:600});assert.equal(last.active,false);assert.equal(writes.slice(-4)[0].data[21],0);
last=await r.render({input:{...input,target:{...input.target,invisible:true}},elapsedMs:390,width:960,height:600});assert.equal(last.actorVisible,false);assert.equal(writes.slice(-4)[0].data[20],0);
const moved={...input,target:{...input.target,bodyScreen:{x:611,y:307}}};last=await r.render({input:moved,elapsedMs:390,width:960,height:600});assert.notEqual(last.spriteRect.x,(await r.render({input,elapsedMs:390,width:960,height:600})).spriteRect.x);
r.dispose();console.log(JSON.stringify({status:'pass',submitted:submissions.length,checks:['actual-core-3-MRT-write-and-4-pass-consumption','same-frame-cause-target-registration','source-observer-glints-controls-through-live-render','finite-expiry-active-uniform-zero','hidden-target-visibility-zero','target-movement-changes-source-projection'],evidence:'CPU-device-double-calls-real-core; no native WGSL compilation or quality claim'}));
