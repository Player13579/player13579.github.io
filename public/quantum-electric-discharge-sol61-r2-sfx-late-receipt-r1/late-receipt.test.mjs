import test from 'node:test';
import assert from 'node:assert/strict';
import {createSnapAudio,renderQuantumDischargePcm} from './audio.mjs';

const base={causeId:'cause-a',seed:123,ageMs:0,completed:true,mainFrameVisible:true,sourceTargetVisible:true,controls:{sourceEmission:true,verify:false}};
function make(sampleRate=48000,{verify=false}={}){
  const counts={contexts:0,buffers:0,sources:0,starts:[],stops:0,disconnects:0,closes:0};
  class FakeAudioContext{
    constructor(){counts.contexts++;this.state='suspended';this.sampleRate=sampleRate;this.currentTime=2;this.destination={}}
    async resume(){this.state='running'} async close(){this.state='closed';counts.closes++}
    createBuffer(channels,length,rate){counts.buffers++;assert.equal(channels,1);return {length,sampleRate:rate,copyToChannel(data,channel){assert.equal(channel,0);this.data=data}}}
    createBufferSource(){counts.sources++;return {connect(){return this},disconnect(){counts.disconnects++},start(...args){counts.starts.push(args)},stop(){counts.stops++}}}
  }
  const audio=createSnapAudio({verify,AudioContextType:FakeAudioContext,isCurrentReceipt:r=>r===receipt});let receipt=base;
  return {audio,counts,setReceipt:r=>{receipt=r}};
}

test('source PCM tail is exact zero and timing derives from producer output',()=>{
  const pcm=renderQuantumDischargePcm(123,48000);let last=-1;for(let i=pcm.length-1;i>=0;i--)if(pcm[i]!==0){last=i;break}
  assert.equal(pcm.length,50400);assert.ok(last>=0);assert.equal(pcm.subarray(last+1).every(x=>x===0),true);assert.ok(last/48<280);assert.ok((last+1)/48<280.1);
});

test('279.9ms stays on actual nonzero PCM path; duplicate is blocked after one scheduled node',async()=>{
  const h=make();const r={...base,ageMs:279.9};h.setReceipt(r);assert.equal(await h.audio.enable(),true);const first=h.audio.play(r);assert.equal(first.status,'scheduled');assert.equal(first.played,true);assert.ok(first.lastNonzeroSample>Math.floor(279.9*48));assert.equal(h.counts.buffers,1);assert.equal(h.counts.sources,1);assert.equal(h.counts.starts.length,1);assert.equal(h.audio.snapshot().admittedCauseCount,1);assert.equal(h.audio.play(r).status,'duplicate-played-cause');assert.equal(h.counts.sources,1);await h.audio.dispose();assert.equal(h.counts.stops,1);assert.equal(h.counts.disconnects,1);assert.equal(h.counts.closes,1);
});

test('280ms derives the expired audible window; no buffer/source or played-cause admission',async()=>{
  const h=make();const r={...base,causeId:'cause-boundary',ageMs:280};h.setReceipt(r);await h.audio.enable();const got=h.audio.play(r);assert.equal(got.status,'expired-audible-window');assert.equal(got.played,false);assert.ok(got.lastNonzeroSample<Math.floor(280*48));assert.equal(h.counts.buffers,0);assert.equal(h.counts.sources,0);assert.equal(h.audio.snapshot().activeSources,0);assert.equal(h.audio.snapshot().admittedCauseCount,0);assert.equal(h.audio.snapshot().silentTailSkippedCauseCount,1);assert.equal(h.audio.play(r).status,'duplicate-expired-audible-window');assert.equal(h.audio.snapshot().silentTailSkippedCauseCount,1);assert.equal(h.counts.sources,0);
});

test('1049ms is expired-audible-window, not the 1050ms VFX lifetime gate',async()=>{
  const h=make();const r={...base,causeId:'cause-late',ageMs:1049};h.setReceipt(r);await h.audio.enable();const got=h.audio.play(r);assert.equal(got.status,'expired-audible-window');assert.equal(h.audio.snapshot().admittedCauseCount,0);assert.equal(h.counts.buffers,0);assert.equal(h.counts.sources,0);assert.equal(got.lastNonzeroSample,renderQuantumDischargePcm(123,48000).findLastIndex(x=>x!==0));
});

test('missing, NaN and negative age are rejected without consuming played or skip state',async()=>{
  for(const age of [undefined,NaN,-0.1]){const h=make();const r={...base,causeId:'invalid-age',ageMs:age};if(age===undefined)delete r.ageMs;h.setReceipt(r);await h.audio.enable();assert.equal(h.audio.play(r).status,'rejected-receipt');assert.equal(h.audio.snapshot().admittedCauseCount,0);assert.equal(h.audio.snapshot().silentTailSkippedCauseCount,0);assert.equal(h.counts.buffers,0);assert.equal(h.counts.sources,0);await h.audio.dispose()}
});

test('verify remains muted; reset is a fresh consumer lifetime and disposed instance cannot restart',async()=>{
  const muted=make(48000,{verify:true});muted.setReceipt(base);assert.equal(await muted.audio.enable(),false);assert.equal(muted.audio.play(base).status,'verify-muted');assert.equal(muted.counts.contexts,0);assert.equal(muted.counts.sources,0);
  const first=make();const skipped={...base,causeId:'session-reset',ageMs:280};first.setReceipt(skipped);await first.audio.enable();assert.equal(first.audio.play(skipped).status,'expired-audible-window');await first.audio.dispose();assert.equal(first.audio.play(skipped).status,'disposed');
  const next=make();const fresh={...base,causeId:'session-reset',ageMs:279.9};next.setReceipt(fresh);await next.audio.enable();assert.equal(next.audio.play(fresh).status,'scheduled');assert.equal(next.audio.snapshot().admittedCauseCount,1);assert.equal(next.audio.snapshot().silentTailSkippedCauseCount,0);await next.audio.dispose();
});
