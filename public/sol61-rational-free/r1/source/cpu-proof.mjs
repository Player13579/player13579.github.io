import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CONTRACT,createReceiptStore,phaseAt,sampleField,uniforms,SFX_SCORE,synthesizeSfx,createSfxPlayer} from './artist.mjs';
const results=[];
function test(name,fn){fn();results.push({name,status:'pass',kind:'CPU-only'});}
const evt={type:'action-rational-free',id:11,causeId:'ability-11',playerId:'rational',x:60,y:80,radius:145,duration:0,at:500};
const store=createReceiptStore();const receipt=store.receive(evt,10000,'session-1:11').record;
test('success identity and producer metadata preserved',()=>{assert.equal(receipt.x,60);assert.equal(receipt.y,80);assert.equal(receipt.serverAt,500);assert.equal(receipt.durationMs,1200);assert.equal(receipt.semantic,'ability-cost-waived');assert.equal(receipt.causeId,'ability-11');});
test('duplicate receipt never resets presentation clock',()=>{const q=store.receive({...evt,x:1000},80000,'session-1:11');assert.equal(q.status,'duplicate');assert.equal(q.record.receivedAtMs,10000);assert.equal(q.record.x,60);});
test('different receipt at same time and source remains independent',()=>{assert.equal(store.receive(evt,10000,'session-1:12').status,'accepted');assert.equal(store.size,2);});
test('typed invalid inputs cannot fabricate a gain receipt',()=>{assert.equal(store.receive({...evt,type:'gain-mana'},0,'x').status,'ignored-type');assert.equal(store.receive({...evt,playerId:''},0,'x').status,'invalid-receipt');assert.equal(store.receive({...evt,x:NaN},0,'x').status,'invalid-receipt');assert.equal(store.receive(evt,0,'').status,'invalid-receipt');});
test('finite lifecycle and receive time independent of server delay',()=>{assert.equal(phaseAt(receipt,9999).alive,false);assert.equal(phaseAt(receipt,10000).alive,true);assert.equal(phaseAt(receipt,11199).alive,true);assert.equal(phaseAt(receipt,11200).alive,false);assert.equal(phaseAt(receipt,10000).ageMs,0);assert.equal(phaseAt(receipt,11201).gate,0);});
test('uniform mapping preserves registered H64 geometry and pass flags',()=>{const v=uniforms(receipt,10600,{viewportPx:[640,480],anchorPx:[320,320],actorHeightPx:64,actorRectH:[-.3,-1,.3,0],atlasUv:[.1,.2,.3,.4],pass:0});assert.equal(v.length,48);assert.equal(v.byteLength,192);assert.equal(v[4],64);assert.equal(v[5],.5);assert.equal(v[17],0);assert.equal(v[2],320);});
test('all CPU field values finite across whole life and support region',()=>{for(let ms=-20;ms<=1260;ms+=5){for(let y=-1.12;y<.12;y+=.024){for(let x=-.65;x<.85;x+=.03){for(const z of Object.values(sampleField([x,y],ms/1200)))assert.ok(Number.isFinite(z));}}}});
const slices=[];
test('primary field persists during all designed active stages, independently of stars/OBS',()=>{
  for(const ms of [96,190,192,194,360,502,504,506,720,982,984,986,1080,1176,1199]){
    let count=0,max=0,minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;
    for(let iy=0;iy<100;iy++)for(let ix=0;ix<100;ix++){
      const p=[-.65+ix*.015,-1.12+iy*.0124],v=sampleField(p,ms/1200).main;
      if(v>.05){count++;minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0]);miny=Math.min(miny,p[1]);maxy=Math.max(maxy,p[1]);}max=Math.max(max,v);
    }
    // At 1199 ms the fade is near zero; checking nonzero math does not claim visibility.
    assert.ok(max>0,`main unexpectedly zero at ${ms}`);
    if(ms>=192 && ms<=1080)assert.ok(count>5,`main support missing at ${ms}`);
    slices.push({ms,peakMain:max,samplesAbove005:count,projectedMathBoundsH:count?[minx,miny,maxx,maxy]:null,observation:'CPU-math-only-not-visible-area'});
  }
});
const pcm=synthesizeSfx(48000);
test('finite original stereo score fits exact visual lifetime',()=>{assert.equal(pcm.left.length,57600);assert.equal(pcm.right.length,57600);assert.equal(pcm.durationMs,1200);assert.equal(pcm.left.at(-1),0);assert.equal(pcm.right.at(-1),0);assert.equal(pcm.left[0],0);assert.ok(SFX_SCORE.every(v=>v.onsetMs+v.durationMs<=1200));});
let peak=0,energy=0;
test('finite non-silent PCM without CPU clipping',()=>{for(const a of [pcm.left,pcm.right])for(const v of a){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));energy+=v*v;}assert.ok(peak>0 && peak<1);assert.ok(energy>0);});
const scheduled=[];const context={state:'running',sampleRate:48000,currentTime:1,createBuffer:()=>({copyToChannel(){}}),createBufferSource:()=>({connect(){},disconnect(){},start(...v){scheduled.push(['start',...v]);},stop(...v){scheduled.push(['stop',...v]);}}),destination:{}};
test('same receipt sound once; exact remaining stop interval',()=>{const p=createSfxPlayer(context);assert.equal(p.play(receipt,{nowMs:10600}),'started');assert.equal(p.play(receipt,{nowMs:10600}),'duplicate');assert.deepEqual(scheduled[0],['start',1,.6]);assert.deepEqual(scheduled[1],['stop',1.6]);p.stop();});
test('verify owns zero audio with consumed start',()=>{scheduled.length=0;const p=createSfxPlayer(context,{verify:true});assert.equal(p.play(receipt),'muted');assert.equal(p.play(receipt),'duplicate');assert.equal(scheduled.length,0);});
test('suspended audio does not replay stale success after unlock',()=>{const ctx={...context,state:'suspended'},p=createSfxPlayer(ctx);assert.equal(p.play(receipt),'gesture-required-consumed');ctx.state='running';assert.equal(p.play(receipt),'duplicate');});
test('expired sound cannot begin after the finite receipt',()=>{const p=createSfxPlayer(context);assert.equal(p.play(receipt,{nowMs:11200}),'expired');});
// Write an auditable source-produced WAV; no human-listening claim is attached.
const bytes=Buffer.alloc(44+57600*4);bytes.write('RIFF',0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(2,22);bytes.writeUInt32LE(48000,24);bytes.writeUInt32LE(192000,28);bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(bytes.length-44,40);
for(let i=0;i<57600;i++){bytes.writeInt16LE(Math.round(pcm.left[i]*32767),44+i*4);bytes.writeInt16LE(Math.round(pcm.right[i]*32767),46+i*4);}
fs.writeFileSync(new URL('./rational-free-r1.wav',import.meta.url),bytes);
const report={version:CONTRACT.version,tests:results,passed:results.length,failed:0,slices,pcm:{sampleRate:48000,channels:2,count:57600,peak,energy,durationMs:1200},limitations:['CPU samples are unoccluded field math, not GPU pixels or visible area.','WGSL compilation and real draw count not run.','Dark/light H64, continuous RAF and actual actor registration not run.','Subjective SFX listening not run.','Gallery/game/adoption not run.']};
fs.writeFileSync(new URL('./CPU-PROOF.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:results.length,failed:0,peak,durationMs:1200,limits:report.limitations}));
