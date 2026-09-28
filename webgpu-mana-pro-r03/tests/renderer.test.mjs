// Mock descriptors and JS command sequencing only. This is NOT WGSL compilation or GPU execution.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {ManaRenderer} from '../src/renderer.js';
globalThis.GPUBufferUsage={UNIFORM:1,COPY_DST:2,STORAGE:4};globalThis.GPUTextureUsage={RENDER_ATTACHMENT:1,TEXTURE_BINDING:2,COPY_SRC:4};globalThis.GPUShaderStage={VERTEX:1,FRAGMENT:2};
const originalFetch=globalThis.fetch;globalThis.fetch=async u=>({ok:true,text:()=>fs.readFile(u,'utf8')});
test.after(()=>{globalThis.fetch=originalFetch;});
function mockDevice(){
 const log={buffers:[],textures:[],samplers:[],pipelines:[],writes:[],passes:[],submits:[],groups:[]};
 const d={log,limits:{maxTextureDimension2D:8192},lost:new Promise(()=>{}),addEventListener(){},removeEventListener(){},pushErrorScope(){},async popErrorScope(){return null;},
 createShaderModule:desc=>({desc,async getCompilationInfo(){return {messages:[]};}}),
 createBindGroupLayout:desc=>({desc}),createPipelineLayout:desc=>({desc}),
 async createRenderPipelineAsync(desc){log.pipelines.push(desc);return {desc};},
 createSampler(desc){log.samplers.push(desc);return {desc};},
 createBuffer(desc){const b={desc,destroyed:false,destroy(){this.destroyed=true;}};log.buffers.push(b);return b;},
 createTexture(desc){const t={desc,destroyed:false,createView:()=>({}),destroy(){this.destroyed=true;}};log.textures.push(t);return t;},
 createBindGroup(desc){log.groups.push(desc);return {desc};},
 createCommandEncoder(){return {beginRenderPass(desc){const p={desc,draws:[],setPipeline(){},setBindGroup(){},draw(...a){this.draws.push(a);},end(){}};log.passes.push(p);return p;},finish(){return {};}};},
 queue:{writeBuffer(buffer,offset,data){log.writes.push({buffer,offset,data:new Float32Array(data)});},submit(cs){log.submits.push(cs);}}
 };return d;
}
const fixture=()=>({key:'k',causeId:'c',eventId:'e',beneficiaryPlayerId:'b',actorPlayerId:'a',body:{x:0,y:0,heightPx:64},ageMs:600,durationMs:1500,radiusPx:82,rate:1});
const view={width:320,height:274,scale:1,dpr:1,originX:190,originY:170};
async function setup(){const d=mockDevice();const r=await ManaRenderer.create({device:d,format:'bgra8unorm-srgb'});return {d,r};}
test('mock descriptor: float16 procedural targets and source-over pipelines',async()=>{const {d,r}=await setup();assert.equal(d.log.pipelines[0].fragment.targets[0].format,'rgba16float');assert.equal(d.log.pipelines[0].fragment.targets[0].blend.color.srcFactor,'one');assert.equal(d.log.pipelines[1].fragment.targets[0].format,'bgra8unorm-srgb');r.dispose();});
test('mock descriptor: explicit coverage sampler, no anisotropy or mip chain',async()=>{const {d,r}=await setup();assert.deepEqual(d.log.samplers[0],{label:'procedural-coverage-linear-clamp',magFilter:'linear',minFilter:'linear',mipmapFilter:'nearest',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge',lodMinClamp:0,lodMaxClamp:0,maxAnisotropy:1});r.dispose();});
test('mock sequence: separate back/front buffers and two cleared targets',async()=>{const {d,r}=await setup();r.prepare([fixture()],view);assert.notEqual(r.layers.back.buffer,r.layers.front.buffer);assert.equal(d.log.passes.length,2);assert.ok(d.log.passes.every(p=>p.desc.colorAttachments[0].loadOp==='clear'));assert.equal(d.log.submits.length,1);r.dispose();});
test('mock viewport: H64 CSS size independent of DPR storage size',async()=>{const {d,r}=await setup();r.prepare([fixture()],{...view,dpr:2});assert.deepEqual(r.size,[640,548]);assert.deepEqual([...d.log.writes[0].data.slice(0,4)],[320,274,1,2]);r.dispose();});
test('mock storage: JS instance payload is a multiple of 80 bytes',async()=>{const {d,r}=await setup();r.prepare([fixture()],view);assert.ok(d.log.writes.slice(1).every(w=>w.data.byteLength%80===0));r.dispose();});
test('mock cleanup: invalidated prepared images cannot be drawn',async()=>{const {r}=await setup();r.prepare([fixture()],view);let draws=0;const pass={setPipeline(){},setBindGroup(){},draw(){draws++;}};r.drawBehindCharacters(pass);r.drawAboveCharacters(pass);assert.ok(draws>0);r.invalidate();draws=0;r.drawBehindCharacters(pass);r.drawAboveCharacters(pass);assert.equal(draws,0);r.dispose();});
test('mock empty snapshot: clears both targets, no ghost geometry',async()=>{const {d,r}=await setup();r.prepare([fixture()],view);r.prepare([],view);assert.deepEqual(r.counts,{back:0,front:0});assert.ok(d.log.passes.slice(-2).every(p=>p.draws.length===0));r.dispose();});
test('mock resize: old procedural textures destroyed',async()=>{const {d,r}=await setup();r.prepare([],view);const old=[...d.log.textures];r.prepare([],{...view,width:400});assert.ok(old.every(t=>t.destroyed));r.dispose();assert.ok(d.log.textures.every(t=>t.destroyed));});
test('mock viewport: invalid and over-limit inputs rejected',async()=>{const {r}=await setup();assert.throws(()=>r.prepare([],{...view,scale:0}),RangeError);assert.throws(()=>r.prepare([],{...view,width:10000}),RangeError);assert.throws(()=>r.prepare([],{...view,cameraX:NaN}),RangeError);r.dispose();});
test('mock device disposal: buffers destroyed and double dispose safe',async()=>{const {d,r}=await setup();r.prepare([fixture()],view);r.dispose();r.dispose();assert.ok(d.log.buffers.every(b=>b.destroyed));assert.throws(()=>r.prepare([],view),/not usable/);});
