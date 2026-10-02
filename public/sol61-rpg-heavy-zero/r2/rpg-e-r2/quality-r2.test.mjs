import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {plan,synthesizePCM,createPass,VFX_WGSL,VERSION} from './rpg-e.mjs';
import {makePreview} from './preview-fixture.mjs';
let checks=0;
const ok=(v,label)=>{assert(v,label);checks++;};
const at=(age,variant='normal',reduced=false)=>{const i=makePreview();i.rawActorClock=i.receipt.eClockStartedAt+age;i.motionAgeMs=age;i.receipt.source.variant=variant;i.receipt.source.radius=variant==='enhance'?360:300;i.reducedMotion=reduced;return {i,p:plan(i)};};
ok(VERSION==='sol-rpg-heavy-quality-r2','new identity distinct from frozen r1');
for(const variant of ['normal','enhance'])for(const reduced of [false,true])for(const age of [0,18,65,180,300,359,400,600,700,900,1039,1040,1099,1100,1199,1200]){
 const {p}=at(age,variant,reduced);
 ok(['planned','omitted'].includes(p.status),'valid source clock has finite terminal classification');
 if(p.status==='planned')for(const f of p.fields){ok([f.center.x,f.center.y,f.sx,f.sy,f.age].every(Number.isFinite),'finite geometric field');ok(f.age===age,'no wall fallback extends event');}
 if(age>=1200)ok(p.reason==='expired','strict original event expiry unchanged');
}
for(const variant of ['normal','enhance']){
 const age=variant==='normal'?620:700;const {p}=at(age,variant);
 ok(p.fields.length===1&&p.fields[0].kind===3,'fire closes while physically separate smoke continues');
 const expiry=variant==='normal'?1040:1100;ok(at(expiry-1,variant).p.status==='planned','smoke reaches defined finite tail');
 ok(at(expiry,variant).p.status==='omitted','smoke terminal boundary');
 const {i}=at(600,variant);i.receipt.attempts=[];ok(plan(i).status==='omitted','no attempt cannot invent lingering explosion');
 const {i:concealed}=at(600,variant);concealed.receipt.attempts[0].visible=false;ok(plan(concealed).status==='omitted','smoke cannot disclose concealed target');
}
const {i}=at(180);const first=i.receipt.attempts[0];i.receipt.attempts=Array.from({length:64},(_,k)=>({...first,id:'test-'+k,position:{x:first.position.x+k,y:first.position.y}}));
ok(plan(i).fields.length===130,'64 distinct explicit attempts remain bounded');
i.receipt.attempts.push({...first,id:'overflow'});ok(plan(i).status==='blocked','attempt capacity rejects instead of evicts');
for(const role of ['launch','impact'])for(const rate of [8000,44100,48000,192000]){
 const pcm=synthesizePCM(role,rate);ok(pcm.length===Math.ceil((role==='launch'?.36:.52)*rate),'role finite PCM duration');
 ok(pcm[0]===0&&pcm.at(-1)===0&&pcm.every(Number.isFinite),'closed finite waveform');
 let peak=0;for(const x of pcm)peak=Math.max(peak,Math.abs(x));ok(peak<=.08500001&&peak>.08,'unchanged peak budget');
 const again=synthesizePCM(role,rate);ok(Buffer.from(pcm.buffer).equals(Buffer.from(again.buffer)),'reproducible waveform');
}
const errorMessage={type:'error',message:'diagnostic fixture',lineNum:22,linePos:7,offset:200,length:8};
await assert.rejects(createPass({device:{createShaderModule:()=>({getCompilationInfo:async()=>({messages:[errorMessage]})})}}),e=>{ok(JSON.stringify(e.shaderDiagnostics)===JSON.stringify([errorMessage]),'actual compiler message fields retained');return true;});
ok(VFX_WGSL.includes('for(var i=0u;i<20u;i++)')&&VFX_WGSL.includes('transmittance*=1.0-opacity'),'bounded local front-to-back volume integration');
console.log(JSON.stringify({status:'pass',checks,version:VERSION,actualWgslCompilation:'not_run',actualGpuPixels:'not_run',listening:'not_run',pcmSha256:Object.fromEntries(['launch','impact'].map(r=>[r,crypto.createHash('sha256').update(Buffer.from(synthesizePCM(r).buffer)).digest('hex')]))},null,2));
