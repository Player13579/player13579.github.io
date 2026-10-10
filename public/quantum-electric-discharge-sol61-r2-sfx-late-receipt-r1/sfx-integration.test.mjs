import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAudioReceiptCurrentness} from './audio-preview-guard.mjs';
import {createSnapAudio,renderQuantumDischargePcm} from './audio.mjs';
import {audioEligible} from './runtime.mjs';
const base={causeId:'preview-1',seed:123,ageMs:77,completed:true,mainFrameVisible:true,sourceTargetVisible:true,controls:{sourceEmission:true,targetVisible:true,verify:false}};
const controls={sourceEmission:true,observerScatter:true,reducedMotion:false,targetVisible:true};
let receipt=base,pending={causeId:base.causeId,ageMs:base.ageMs,controls:{...controls,verify:false}},causeId=base.causeId,playing=true,verify=false,ready=true;
const runtime={get ready(){return ready},get lastReceipt(){return receipt}};
const guard=createAudioReceiptCurrentness({runtime,getPendingFrame:()=>pending,getCurrentCauseId:()=>causeId,getControls:()=>controls,getPlaying:()=>playing,isVerify:()=>verify});
assert.equal(guard(base),true);
for(const [label,mutate] of [['expired cause',()=>{playing=false}],['wrong cause',()=>{causeId='preview-2'}],['stale exact receipt',()=>{receipt=null}],['verify',()=>{verify=true}],['changed emission',()=>{controls.sourceEmission=false}],['changed observer',()=>{controls.observerScatter=false}],['age mismatch',()=>{pending={...pending,ageMs:78} }]]){
  receipt=base;pending={causeId:base.causeId,ageMs:base.ageMs,controls:{...controls,sourceEmission:true,observerScatter:true,reducedMotion:false,targetVisible:true,verify:false}};causeId=base.causeId;playing=true;verify=false;ready=true;Object.assign(controls,{sourceEmission:true,observerScatter:true,reducedMotion:false,targetVisible:true});mutate();assert.equal(guard(base),false,label);
}
let constructed=0,starts=[];
class FakeAudioContext{constructor(){constructed++;this.state='suspended';this.sampleRate=8000;this.currentTime=1;this.destination={}}async resume(){this.state='running'}async close(){this.state='closed'}createBuffer(_channels,length,sampleRate){return {length,sampleRate,copyToChannel(data){this.data=data}}}createBufferSource(){return {connect(){return this},disconnect(){},start(...args){starts.push(args)},stop(){}}}}
verify=false;receipt=base;pending={causeId:base.causeId,ageMs:base.ageMs,controls:{...controls,verify:false}};causeId=base.causeId;playing=true;
const audio=createSnapAudio({verify:false,AudioContextType:FakeAudioContext,isCurrentReceipt:guard});assert.equal(await audio.enable(),true);assert.equal(audio.play(base).status,'scheduled');assert.deepEqual(starts[0],[1,base.ageMs/1000]);assert.equal(audio.play(base).status,'duplicate-played-cause','one source per cause');assert.equal(audio.play({...base,causeId:'preview-2'}).status,'rejected-receipt','reconstructed receipt not current');
receipt={...base,ageMs:1050};pending={...pending,ageMs:1050};assert.equal(audio.play(receipt).status,'rejected-receipt','expired event cannot sound');
await audio.dispose();
const beforeVerify=constructed;const verifyAudio=createSnapAudio({verify:true,AudioContextType:FakeAudioContext,isCurrentReceipt:()=>true});assert.equal(await verifyAudio.enable(),false);assert.equal(verifyAudio.play(base).status,'verify-muted');assert.equal(constructed,beforeVerify);assert.equal(starts.length,1);
const pcm=renderQuantumDischargePcm(1,8000);assert.equal(pcm.length,8400);assert.ok(pcm.some(x=>x!==0));assert.ok(pcm.every(Number.isFinite));
const html=await readFile(new URL('./preview.html',import.meta.url),'utf8');
assert.match(html,/import \{createFramePump\} from '\.\/frame-pump\.mjs'/);assert.match(html,/if\(age>=DURATION_MS\)[\s\S]{0,160}setTimeout\(replay,900\)\}scheduleFrame\(\)/);assert.match(html,/audioReceiptIsCurrent\(receipt\)&&audioEligible\(receipt,\{verify\}\)\)audioOutcome=sound\.play\(receipt\)/);assert.match(html,/audioOutcome\?\.status==='expired-audible-window'/);assert.match(html,/Promise\.allSettled\(\[runtime\.dispose\(\),sound\.dispose\(\)\]\)/);assert.doesNotMatch(html,/sound\.play\(causeNo\)/);assert.match(html,/<link rel="icon" href="data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+">/);
console.log('SFX integration checks passed: exact current completed receipt, stale/expired/verify rejection, one sound per cause, 1050+900 RAF lifetime, late-window status, data favicon and disposal.');
