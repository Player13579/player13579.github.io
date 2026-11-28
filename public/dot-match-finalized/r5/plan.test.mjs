import a from 'node:assert/strict';
import {admit,LIFE,stateAt} from './plan.mjs';
import {receipt,fixtureReceipt,Mesh,buildReceipt,fillSfx,RAIL,UI} from './effect.mjs';
const q=fixtureReceipt(1),id=admit(q).id;
for(const n of [2,3,4])a.equal(admit({...q,sequence:n,currentSequence:n}).id,id);
a.notEqual(admit(fixtureReceipt(2)).id,id);
for(const phase of ['playing','meeting'])a.equal(admit({...q,before:{...q.before,phase}}).id,id);
for(const k of ['roomId','selfId','round','start','generation'])for(const side of ['before','after']){
 const previous=q[side][k];
 a.equal(admit({...q,[side]:{...q[side],[k]:typeof previous==='number'?previous+1:'other'}}),null);
}
for(const p of [{stale:true},{source:'restore'},{currentSequence:2},{before:{...q.before,phase:'ended'}},{after:{...q.after,winner:'none'}},{after:{...q.after,winner:null}},{observedAt:q.after.start-1}])a.equal(admit({...q,...p}),null);
const stable=(r,t,o)=>{ const g=new Mesh();buildReceipt(g,r,t,o); return [...g.data.subarray(0,g.length)];};
let states=0, comparisons=0;
for(const reduced of [false,true]){
 let top=0;
 for(let t=0;t<=LIFE;t++){
  const o={reduced},state=stateAt(t,o);
  if(t===0||t===LIFE)a.equal(stable(q,t,o).length,0);
  else if(reduced)a.equal(state.narrow,0);else{a.ok(state.narrow>=top);top=state.narrow}
  const data=stable(q,t,o);
  for(let i=0;i<data.length;i+=8){const x=data[i],y=data[i+1];a.ok(x<UI.left&&x>=RAIL.left-.000001&&x<=RAIL.right+.000001&&y>=RAIL.top-.000001&&y<=RAIL.bottom+.000001)}
  for(const winner of ['attackers','defenders','idea']){
   const x=receipt({...q,after:{...q.after,winner,score:t,finishReason:'unrelated',count:2}},q.observedAt);
   a.equal(x.id,id);a.deepEqual(stable(x,t,o),data);comparisons++;
  }
  states++;
 }
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.ok(peak>.025&&peak<.15&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log({rejections:17,states,comparisons,stableSessionIdAcrossResponseChanges:true,geometryRailOnly:true,audioRates:6});
for(const t of [154,291,498,720]){
 const v=stable(q,t,{});
 const activeX=v.filter((_,i)=>i%8===0&&v[i+5]>.025);
 const w=Math.max(...activeX)-Math.min(...activeX);
 if(t===154)a.ok(w>.28);
 if(t===720)a.ok(w<.065);
}
