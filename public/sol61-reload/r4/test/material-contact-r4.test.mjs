import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {planReloadFrame,packReloadUniform,sampleReloadMechanism,SHADER_ENTRIES,UNIFORM_BYTES} from '../creative/reload-e-sol61-r4.mjs';
import {contactAt,startContactMs,GEOMETRY} from '../creative/reload-contact-model.mjs';
import {fresnel,F0,metalProbe,MATERIAL_WGSL} from '../creative/reload-material-model.mjs';
import {makeMockGpu,createReloadRenderer,planReloadInput} from '../mock-gpu.mjs';
const shader=fs.readFileSync(new URL('../creative/reload-e-sol61-r4.wgsl',import.meta.url),'utf8');
const input=(ageMs,extra={})=>({causeId:'r4-contact',clockKind:'fixture',phase:'start',weaponId:'smg',ageMs,pending:true,viewport:[640,360],anchor:[320,180],heightPx:64,sourceOn:true,obsOn:true,mainOn:true,visibility:1,...extra});
test('receiving response starts at actual revised leading-face contact; same geometry across start/complete/reduced',()=>{
 for(const reducedMotion of [false,true]){
  const touch=startContactMs(reducedMotion),before=sampleReloadMechanism(planReloadFrame(input(touch-.001,{reducedMotion}))),after=sampleReloadMechanism(planReloadFrame(input(touch+.001,{reducedMotion})));
  assert.equal(before.contactFraction,0);assert.ok(after.contactFraction>0);assert.ok(before.supplyTopYH<0);assert.ok(after.supplyTopYH>0);
  for(const phase of ['start','complete'])for(let ageMs=0;ageMs<=700;ageMs+=.5){const p=sampleReloadMechanism(planReloadFrame(input(ageMs,{phase,reducedMotion}))),m=contactAt({phase,ageMs,reducedMotion});assert.ok(Math.abs(p.supplyCenterYH-m.centerYH)<1e-12);assert.ok(p.contactFraction>=0&&p.contactFraction<=1);}
 }
 assert.equal(GEOMETRY.halfHeight,.30);assert.match(shader,/aligned=ease\(max\(0\.0,centerY\+0\.30\)\/0\.05\)/);assert.doesNotMatch(shader,/approach-0\.70/);
});
test('Fresnel/view/roughness/light actually alter finite conductor response, including opposite light edge',()=>{
 assert.deepEqual(fresnel(F0,1),F0);assert.deepEqual(fresnel(F0,0),[1,1,1]);assert.deepEqual(metalProbe({light:[0,0,-1]}),[0,0,0]);
 const low=metalProbe({light:[0,0,1],roughness:.18}),high=metalProbe({light:[0,0,1],roughness:.8});assert.ok(low[0]>high[0]*100);
 assert.notDeepEqual(metalProbe({normal:[.5,0,1]}),metalProbe({normal:[-.5,0,1]}));assert.notDeepEqual(metalProbe({view:[.6,0,1]}),metalProbe());
 for(const roughness of [.18,.28,.8])for(let k=0;k<360;k+=7){const a=k*Math.PI/180,x=metalProbe({light:[Math.sin(a),0,Math.cos(a)],roughness});assert.ok(x.every(v=>Number.isFinite(v)&&v>=0));}
 assert.throws(()=>metalProbe({roughness:0}));assert.throws(()=>metalProbe({light:[0,0,0]}));
});
test('direct hemispherical reflection at normal view conserves energy within declared numerical approximation',()=>{
 const n=512,d=Math.PI/(2*n);for(const roughness of [.18,.28,.5,.8]){const sum=[0,0,0];for(let i=0;i<n;i++){const theta=(i+.5)*d,r=metalProbe({light:[Math.sin(theta),0,Math.cos(theta)],roughness});r.forEach((v,c)=>sum[c]+=v*Math.sin(theta)*d*2*Math.PI);}assert.ok(sum.every(x=>x>0&&x<1));}
});
test('same material WGSL is in actual producer; reflection is separate from emitted source and final encoding once',()=>{
 assert.ok(shader.includes(MATERIAL_WGSL));const emission=shader.slice(shader.indexOf('let receiverLight'),shader.indexOf('return o;',shader.indexOf('let receiverLight')));assert.doesNotMatch(emission,/Metal|metalRadiance/);
 assert.match(shader,/supplyMetal\*supply\*\(1\.0-receiver\)/);assert.match(shader,/displayEncode\(display\)\*alpha,alpha/);assert.equal((shader.match(/displayEncode\(display\)/g)||[]).length,1);
 for(const gate of ['reflectionOn'])assert.equal(packReloadUniform(planReloadFrame(input(400,{material:{[gate]:false}})))[15],0);
 const u=packReloadUniform(planReloadFrame(input(400,{material:{roughness:.8,keyIntensity:0,environmentIntensity:0,keyDirection:[0,0,-1]}})));assert.ok(Math.abs(u[23]-.8)<1e-7);assert.deepEqual(Array.from(u.slice(20,23)),[0,0,-1]);assert.deepEqual(Array.from(u.slice(24,26)),[0,0]);
 for(const material of [{roughness:0},{keyIntensity:5},{keyDirection:[0,0,0]},{reflectionOn:1}])assert.throws(()=>planReloadFrame(input(10,{material})));
});
test('actual R4 host preserves four native-resolution passes and material ABI; non-sRGB format is guarded',async()=>{
 const m=makeMockGpu();const r=await createReloadRenderer({canvas:m.canvas,gpu:m.gpu,shaderSource:shader,shaderEntries:SHADER_ENTRIES,uniformBytes:UNIFORM_BYTES,packReloadUniform});await r.resize({width:640,height:360});
 const p=planReloadInput(input(400),planReloadFrame),res=await r.render(p,{awaitCompletion:true,verifyEmission:true});assert.equal(res.submitted,true);assert.equal(res.completed,true);assert.deepEqual(m.log.passLabels,['world+emission','blur-x','blur-y','composite']);assert.ok(m.log.bufferBytes.includes(128));assert.equal(r.snapshot().canvasFormat,'bgra8unorm');await r.dispose();
 const bad=makeMockGpu();bad.gpu.getPreferredCanvasFormat=()=> 'bgra8unorm-srgb';await assert.rejects(createReloadRenderer({canvas:bad.canvas,gpu:bad.gpu,shaderSource:shader,shaderEntries:SHADER_ENTRIES,uniformBytes:UNIFORM_BYTES,packReloadUniform}),/non-sRGB/);assert.equal(bad.log.configured,false);
});
test('known early completion jump stays explicit; no covert transition repair or fabricated shared cause',()=>{
 const early=sampleReloadMechanism(planReloadFrame(input(80))),complete=sampleReloadMechanism(planReloadFrame(input(0,{phase:'complete',causeId:'new-receipt'})));assert.ok((complete.supplyCenterYH-early.supplyCenterYH)*64>30);assert.equal(complete.supplyCenterYH,-.25);
});
