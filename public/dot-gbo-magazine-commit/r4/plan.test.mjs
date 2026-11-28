import assert from 'node:assert/strict';
import {receipt,fixtureReceipt,buildReceipt,Mesh,LIFE,fillSfx} from './effect.mjs';
const e=fixtureReceipt(4),now=e.at;
assert.ok(receipt(e,now));
for(const patch of [
 {type:'regular-shot'},{type:'weapon-destroyed'},{type:'slash'},{type:'throw'},{type:'heavy-use'},{variant:'magazine-commit:weapon:destroyed'},
 {variant:'magazine-commit:weapon:launcher'},{variant:'magazine-commit'},{variant:'regular-shot'},{variant:'magazine-commit:weapon:smg:hit'},
 {radius:176},{durationMs:800},{playerId:'other'},{id:'unsafe'},{x:NaN},{at:now+126},{at:now-LIFE},
]){
 assert.equal(receipt({...e,...patch},now),null);
}
function capture(t,reduced=false,r=receipt(e,now)){
 const g=new Mesh();const m=buildReceipt(g,r,t,{reduced});
 const data=Array.from(g.data.subarray(0,g.length));
 assert(data.every(Number.isFinite));
 return {m,data,positions:data.filter((_,i)=>i%8<2)};
}
for(const reduced of [false,true])for(let t=-1;t<=LIFE;t++){
 const {m}=capture(t,reduced);assert.equal(m.triangles,t>0&&t<1130?16:0);
}
for(const t of [100,215,370,490,650]){
 const base=capture(t);
 for(const w of ['handgun','smg','assault','sniper']){
  const r=receipt({...e,variant:'magazine-commit:weapon:'+w,x:42,y:-19,outcome:'hit',count:99},now);
  assert(r);assert.deepEqual(capture(t,false,r),base);
 }
}
assert.equal(capture(100).m.progress,0);
assert.ok(capture(370).m.progress>.5&&capture(370).m.progress<1);
assert.notDeepEqual(capture(100).positions,capture(370).positions);
const vertices=t=>{const d=capture(t).positions;return d.filter((_,i)=>Math.floor(i/12)%2===1)};
for(const parity of [0,1]){
 const outer=t=>{const d=vertices(t).filter((_,i)=>i%2===parity);return [Math.min(...d),Math.max(...d)];};
 assert.deepEqual(outer(100),outer(490));
}
const centerVertices=t=>{const d=capture(t).positions;let n=0;for(let i=0;i<d.length;i+=2)if(Math.abs(d[i]-.505)<1e-6&&Math.abs(d[i+1]+1.135)<1e-6)n++;return n;};
assert(centerVertices(100)>0&&centerVertices(490)===0);
assert.deepEqual(capture(490).positions,capture(850).positions);
assert.deepEqual(capture(100,true).positions,capture(850,true).positions);
for(const sampleRate of [22050,32000,44100,48000,88200,96000]){
 const {data,peak}=fillSfx(sampleRate,e.variant,41);
 assert(peak>0&&peak<.35&&data.every(Number.isFinite));assert.equal(Math.abs(data[0])+Math.abs(data.at(-1)),0);
}
console.log('17 rejects; 2904 finite mesh frames; four variant and outcome invariance; motion and reduced; six audio rates PASS');
