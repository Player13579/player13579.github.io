import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DURATION_MS, dischargeChannels } from './channels.mjs';
import { DischargeRuntime, audioEligible } from './runtime.mjs';
import { createSnapAudio } from './audio.mjs';
import { createFramePump } from './frame-pump.mjs';

globalThis.GPUShaderStage={VERTEX:1,FRAGMENT:2};
globalThis.GPUBufferUsage={UNIFORM:1,COPY_DST:2,STORAGE:4};
globalThis.GPUTextureUsage={RENDER_ATTACHMENT:1,TEXTURE_BINDING:2};
const coords={source:[100,150],target:[500,150]};
const sig=entries=>entries.map(x=>`${x.binding}:${x.buffer?.type||x.texture?.sampleType||x.sampler?.type}`).join(',');
function strictPass(){let pipeline;const groups=new Map();return {setPipeline(p){pipeline=p;groups.clear()},setBindGroup(i,g){const layouts=pipeline?.desc?.layout?.bindGroupLayouts||[],expected=layouts[i];if(!expected)throw new Error(`pipeline has no explicit layout at group index ${i}`);if(expected!==g.layout)throw new Error(`bind group incompatible with pipeline layout at group index ${i}`);groups.set(i,g)},draw(){const layouts=pipeline?.desc?.layout?.bindGroupLayouts||[];for(let i=0;i<layouts.length;i++)if(!groups.has(i))throw new Error(`No bind group set at group index ${i}.`);},end(){}}}
function fixture({compileError=false,failPipeline=false,failBufferAt=0,failBindGroup=false,failWrite=false,errorScope=false,queueFailure=false}={}){
  let loseDevice;const lost=new Promise(resolve=>{loseDevice=resolve});
  const queue={writes:[],submits:[],waits:0,onSubmittedWorkDone(){this.waits++;if(queueFailure){loseDevice({reason:'mock queue loss'});return Promise.reject(new Error('queue failed'))}return Promise.resolve()},writeBuffer(b,o,data){if(failWrite)throw new Error('write failed');this.writes.push(new Float32Array(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)))},submit(cmd){this.submits.push(cmd)}};
  const destroyed=[],scopeStack=[],layouts=[],pipelineCalls=[],textures=[],events=[];let unconfigured=0,poppedScopes=0;
  const device={queue,lost,
    createShaderModule({code}){return {code,async getCompilationInfo(){return {messages:compileError?[{type:'error',message:'invalid WGSL'}]:[]}}}},
    createBindGroupLayout({entries}){const layout={entries:[...entries],signature:sig(entries)};layouts.push(layout);return layout},
    createPipelineLayout({bindGroupLayouts}){return {bindGroupLayouts}},
    createRenderPipeline(desc){if(failPipeline)throw new Error('pipeline rejected');const entry=desc.fragment.entryPoint,groups=desc.layout.bindGroupLayouts;
      if(entry==='fs'){assert.equal(sig(groups[0].entries),'0:uniform,1:read-only-storage')}
      if(entry==='screenFs'){assert.equal(groups.length,2);assert.equal(sig(groups[1].entries),'0:uniform,1:float,2:filtering')}
      const pipeline={desc,getBindGroupLayout:i=>groups[i]};pipelineCalls.push(pipeline);return pipeline},
    createBuffer(desc){if(failBufferAt===this.bufferCount+1)throw new Error('buffer allocation failed');this.bufferCount=(this.bufferCount||0)+1;const resource={desc,destroy(){destroyed.push('buffer')}};return resource},
    createTexture(desc){events.push('texture-create');const texture={desc,destroyed:false,createView(){return {texture,dimension:'2d'}},destroy(){this.destroyed=true;events.push('texture-destroy');destroyed.push('texture')}};textures.push(texture);return texture},
    createSampler(){return {sampler:true,type:'filtering'}},
    createBindGroup({layout,entries}){const given=entries.map(x=>x.binding).sort((a,b)=>a-b),wanted=layout.entries.map(x=>x.binding).sort((a,b)=>a-b);
      const typeOf=(spec,resource)=>spec.buffer?(resource?.buffer?.desc?.usage&GPUBufferUsage.UNIFORM?'uniform':resource?.buffer?.desc?.usage&GPUBufferUsage.STORAGE?'read-only-storage':null):spec.texture?(resource?.texture?.desc?.format==='rgba16float'&&resource?.dimension==='2d'?'float':null):spec.sampler?resource?.type:null;
      const typesMatch=layout.entries.every(spec=>{const actual=entries.find(x=>x.binding===spec.binding);const kind=spec.buffer?.type||spec.texture?.sampleType||spec.sampler?.type;return actual&&typeOf(spec,actual.resource)===kind});
      if(failBindGroup||given.length!==wanted.length||given.some((v,i)=>v!==wanted[i])||!typesMatch)throw new Error(`bind-group layout mismatch: expected ${wanted} with compatible resource types; got ${given}`);return {layout,entries}},
    createCommandEncoder(){return {beginRenderPass(){return strictPass()},finish(){return {}}}},
    pushErrorScope(type){scopeStack.push(type)},async popErrorScope(){if(!scopeStack.length)throw new Error('unbalanced popErrorScope');scopeStack.pop();poppedScopes++;return errorScope===true||errorScope===poppedScopes?new Error('GPU validation error'):null},destroy(){destroyed.push('device')}};
  const gpu={async requestAdapter(){return {async requestDevice(){return device}}},getPreferredCanvasFormat(){return 'bgra8unorm'}};
  const context={configure(){},unconfigure(){unconfigured++},getCurrentTexture(){return {createView(){return {canvas:true}}}}};
  const canvas={width:640,height:300,getContext(n){return n==='webgpu'?context:null}};
  let tick=100;const runtime=new DischargeRuntime({canvas,gpu,now:()=>++tick});
  return {runtime,queue,destroyed,scopeStack,layouts,pipelineCalls,textures,events,context,get unconfigured(){return unconfigured},canvas,strictPass};
}

test('creative geometry gates hidden endpoints, is stable per seed and ends at 1050ms',()=>{
  assert.equal(DURATION_MS,1050);assert.equal(dischargeChannels({ageMs:1,...coords}).length,0);
  assert.ok(dischargeChannels({ageMs:1,...coords,sourceVisible:true,targetVisible:true}).length>0);
  const a=dischargeChannels({ageMs:180,...coords,seed:8,sourceVisible:true,targetVisible:true});
  assert.deepEqual(a,dischargeChannels({ageMs:180,...coords,seed:8,sourceVisible:true,targetVisible:true}));
  for(const ageMs of [0,1050,NaN])assert.equal(dischargeChannels({ageMs,...coords,sourceVisible:true,targetVisible:true}).length,0);
});

test('preview pump keeps one RAF chain through idle gap and restarts the next cause without duplicate loops',async()=>{
  const callbacks=[];let completeFirst,runs=0;
  const pump=createFramePump(cb=>callbacks.push(cb),()=>{runs++;if(runs===1)return new Promise(resolve=>{completeFirst=resolve})});
  pump.schedule();pump.schedule();assert.equal(callbacks.length,1);
  callbacks.shift()();assert.equal(runs,1);pump.schedule();pump.schedule();assert.equal(callbacks.length,0);
  completeFirst();await new Promise(resolve=>setImmediate(resolve));assert.equal(callbacks.length,1);
  callbacks.shift()();await new Promise(resolve=>setImmediate(resolve));assert.equal(runs,2);assert.equal(callbacks.length,0);
  pump.schedule();assert.equal(callbacks.length,1);pump.dispose();callbacks.shift()();await new Promise(resolve=>setImmediate(resolve));assert.equal(runs,2);
  const preview=await readFile(new URL('./preview.html',import.meta.url),'utf8');
  assert.match(preview,/import \{DURATION_MS\} from '\.\/channels\.mjs'/);
  assert.match(preview,/if\(age>=DURATION_MS\)[\s\S]{0,160}setTimeout\(replay,900\)\}scheduleFrame\(\)/);
  assert.doesNotMatch(preview,/age>=1950/);
});

test('display shader scatters sampled emission with four axis taps at 3/7px and retains direct emission',async()=>{
  const source=await readFile(new URL('./runtime.mjs',import.meta.url),'utf8');
  assert.match(source,/let segmentMeta=seg\[ii\*2u\+1u\]/);assert.doesNotMatch(source,/\bmeta\b/);
  assert.match(source,/textureSampleLevel\(emission,emissionSampler,uv,0\.0\)\.rgb/);
  const taps=source.match(/textureSampleLevel\(emission,emissionSampler,uv[+-]vec2f\([37]\.0,0\.0\)\*texel,0\.0\)/g)||[];
  const vertical=source.match(/textureSampleLevel\(emission,emissionSampler,uv[+-]vec2f\(0\.0,[37]\.0\)\*texel,0\.0\)/g)||[];
  assert.equal(taps.length,4);assert.equal(vertical.length,4);
  assert.match(source,/\(a3\+b3\+c3\+d3\)\*0\.075\+\(a7\+b7\+c7\+d7\)\*0\.035/);
  assert.match(source,/direct\+localScatter\*display\.observerOn/);assert.doesNotMatch(source,/localPsf/);
});

test('strict explicit layouts bind the observer uniform, sampled texture and used sampler; controls and submission data remain causal',async()=>{
  const f=fixture();f.runtime.start({id:'c1'});const receipt=await f.runtime.render({...coords,ageMs:180,sourceVisible:true,targetVisible:true,observerScatter:true});
  assert.equal(receipt.causeId,'c1');assert.ok(receipt.completedAt>=receipt.submittedAt);assert.equal(f.scopeStack.length,0);
  assert.deepEqual(f.layouts.map(x=>x.signature),['0:uniform,1:read-only-storage','0:uniform,1:float,2:filtering']);
  assert.equal(f.queue.writes[1][4],1);assert.equal(f.queue.writes[2][0],1);
  const packet=f.queue.writes.find(w=>w.length===128*8),expected=dischargeChannels({ageMs:180,...coords,seed:1,sourceVisible:true,targetVisible:true});
  assert.deepEqual(packet.slice(0,expected.length),expected);
  assert.equal(audioEligible(receipt),true);await f.runtime.dispose();assert.equal(f.unconfigured,1);assert.ok(f.destroyed.includes('device'));
});

test('explicit two-group display pipeline binds group 0 and group 1 before draw; missing group 0 is rejected',async()=>{
  const f=fixture();f.runtime.start({id:'display-groups'});const receipt=await f.runtime.render({...coords,ageMs:180,sourceVisible:true,targetVisible:true});
  assert.ok(receipt?.completed);assert.equal(f.queue.submits.length,1);await f.runtime.dispose();
  const pass=f.strictPass(),group0={},group1={};pass.setPipeline({desc:{layout:{bindGroupLayouts:[group0,group1]}}});pass.setBindGroup(1,{layout:group1});
  assert.throws(()=>pass.draw(),/No bind group set at group index 0/);
});

test('source-off, invalid lifetime, absent cause and empty channel all clear old canvas content without receipts',async()=>{
  const f=fixture();f.runtime.start({id:'live'});const initial=await f.runtime.render({...coords,ageMs:180,sourceVisible:true,targetVisible:true});assert.ok(initial);
  const before=f.queue.submits.length;
  assert.equal(await f.runtime.render({...coords,ageMs:200,sourceVisible:true,targetVisible:true,sourceEmission:false}),null);
  assert.equal(await f.runtime.render({...coords,ageMs:1050,sourceVisible:true,targetVisible:true}),null);
  assert.equal(await f.runtime.render({...coords,ageMs:0,sourceVisible:true,targetVisible:true}),null);
  f.runtime.stop();assert.equal(await f.runtime.render({...coords,ageMs:200,sourceVisible:true,targetVisible:true}),null);
  assert.ok(f.queue.submits.length>=before+4);assert.equal(f.runtime.lastReceipt,null);await f.runtime.dispose();
});

test('verify preserves observer visuals and constructs no AudioContext or sound source',async()=>{
  const f=fixture();f.runtime.start({id:'verify'});const receipt=await f.runtime.render({...coords,ageMs:300,sourceVisible:true,targetVisible:true,verify:true,observerScatter:true});
  assert.equal(receipt.controls.observerScatter,true);assert.equal(receipt.controls.verify,true);assert.equal(f.queue.writes[2][0],1);assert.equal(audioEligible(receipt),false);
  let contexts=0,starts=0;
  class FakeAudioContext{constructor(){contexts++;this.state='suspended';this.sampleRate=10;this.currentTime=0;this.destination={}}async resume(){this.state='running'}createBuffer(){return {getChannelData:()=>new Float32Array(2)}}node(){return {connect(){return this},start(){starts++},stop(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}}createBufferSource(){return this.node()}createBiquadFilter(){return this.node()}createGain(){return this.node()}createOscillator(){return this.node()}}
  const audio=createSnapAudio({verify:true,AudioContextType:FakeAudioContext});assert.equal(await audio.enable(),false);assert.equal(audio.play(),false);assert.equal(contexts,0);assert.equal(starts,0);await f.runtime.dispose();
});

test('WGSL compilation and pipeline failures balance scopes and release partial device ownership',async()=>{
  for(const options of [{compileError:true},{failPipeline:true},{failBufferAt:2}]){const f=fixture(options);f.runtime.start({id:'x'});await assert.rejects(f.runtime.render({...coords,ageMs:180,sourceVisible:true,targetVisible:true}));assert.equal(f.scopeStack.length,0);assert.ok(f.destroyed.includes('device'));assert.equal(f.unconfigured,1);if(options.failBufferAt)assert.equal(f.destroyed.filter(x=>x==='buffer').length,1);}
});

test('draw failures balance validation scopes, dispose partial targets, and never return success',async()=>{
  for(const options of [{failBindGroup:true},{failWrite:true},{errorScope:2}]){const f=fixture(options);f.runtime.start({id:'x'});await assert.rejects(f.runtime.render({...coords,ageMs:180,sourceVisible:true,targetVisible:true}));assert.equal(f.scopeStack.length,0);assert.equal(f.runtime.lastReceipt,null);assert.ok(f.textures.every(t=>t.destroyed));await f.runtime.dispose();}
});

test('resize allocates replacement before destroying in-use target; queue failure cannot yield a receipt',async()=>{
  const f=fixture();f.runtime.start({id:'a'});await f.runtime.render({...coords,ageMs:180,sourceVisible:true,targetVisible:true});const old=f.textures[0];
  f.canvas.width=800;const eventStart=f.events.length;await f.runtime.render({...coords,ageMs:200,sourceVisible:true,targetVisible:true});assert.equal(old.destroyed,true);assert.equal(f.textures.length,2);assert.ok(f.events.indexOf('texture-create',eventStart)<f.events.lastIndexOf('texture-destroy'));await f.runtime.dispose();
  const bad=fixture({queueFailure:true});bad.runtime.start({id:'bad'});await assert.rejects(bad.runtime.render({...coords,ageMs:180,sourceVisible:true,targetVisible:true}));assert.equal(bad.runtime.lastReceipt,null);assert.equal(bad.scopeStack.length,0);await bad.runtime.dispose();
});
