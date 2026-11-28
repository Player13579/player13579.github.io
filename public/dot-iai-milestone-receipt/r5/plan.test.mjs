import assert from 'node:assert/strict';
import {TYPE,VERSION,receipt,envelope,phaseAt,VISUAL_MS,FIRST_SOUND_MS} from './plan.mjs';
import {handEdge,lightAt,basis,Mesh,buildReceipt,fillSfx,fixtureReceipt,receipt as fixture} from './effect.mjs';
assert.equal(VERSION,'dot-iai-milestone-receipt-r5');
const at=1780000000000, clock={selfId:'p1',serverNow:at+136};
const base={type:TYPE,variant:'ec-500',id:'magic_fixture',playerId:'p1',x:7,y:11,at,radius:122};
assert.equal(receipt(base,clock).causeId,base.id);
let rejected=0;
for(const variant of ['hacker','acquired','mystery-box','vending','ec-499','ec-501','']){assert.equal(receipt({...base,variant},clock),null);rejected++;}
for(const type of ['iai-destruction-attack','action-vending','action-dodge','instant-substitution-acquired','ability-entitlement','instant-fire-acquired','fighter-energy-charge']){assert.equal(receipt({...base,type},clock),null);rejected++;}
for(const o of [{playerId:'p2'},{radius:90},{id:'naked'},{at:at-1000},{at:at+270},{x:Infinity}]){assert.equal(receipt({...base,...o},clock),null);rejected++;}
assert.equal(receipt(base,{...clock,serverNow:at-5}).active,false);
assert.equal(receipt(base,{...clock,serverNow:at+820}),null);rejected++;
assert.equal(phaseAt(NaN),'off');
assert.equal(envelope(-1).phase,'off');
assert.equal(envelope(VISUAL_MS).phase,'off');
assert(envelope(120).front<envelope(213).front);
assert(envelope(135).extent<envelope(246).extent);
assert(envelope(246).settled>envelope(135).settled);
assert(envelope(650).settled<envelope(300).settled);
assert.equal(envelope(105,{reduced:true}).extent,envelope(300,{reduced:true}).extent);
const raw=fixtureReceipt(2),v=fixture(raw,raw.at);assert.ok(v);
const palm=basis(v).p;
function geometry(t,reduced,ev=v){
 const m=new Mesh();const r=buildReceipt(m,ev,t,{reduced});const use=m.data.subarray(0,m.length);
 assert.equal(use.length,r.triangles*24);
 assert(use.every(Number.isFinite));assert(r.lum>=0&&r.lum<=.5);
 let lo=Infinity,hi=-Infinity,maxY=-Infinity,left=Infinity,rgbSum=0,weight=0,centroid=0;
 for(let i=0;i<m.length;i+=8){
  const a=m.data[i+5],x=m.data[i]-palm[0],y=m.data[i+1]-palm[1];
  assert(a>=0&&a<=1);assert(m.data[i+6]>=0);assert(x>-.25&&x<.115);assert(y>-.21&&y<.08);
  if(a>.08){lo=Math.min(x,lo);hi=Math.max(x,hi);maxY=Math.max(y,maxY);left=Math.min(left,Math.hypot(x,y));}
  const w=a*(.21*m.data[i+2]+.72*m.data[i+3]+.07*m.data[i+4]);centroid+=w*x;weight+=w;rgbSum+=w;
 }
 return {use,r,lo,hi,maxY,left,rgbSum,centroid:centroid/weight};
}
let mesh=0,invar=0;
for(const reduced of [false,true]){
 for(let t=-1;t<=VISUAL_MS+1;t++){
  const out=geometry(t,reduced);assert.equal(out.r.triangles===0,t<=0||t>=VISUAL_MS);
  mesh++;
 }
 for(const t of [1,95,154,244,392,650,819]){
  const a=geometry(t,reduced,{...v,charges:0,activation:false});
  const b=geometry(t,reduced,{...v,charges:100,activation:true,damage:42,x:-1e6,y:1e6,sourceId:'other',targetId:'p2'});
  assert.deepEqual(a,b);invar++;
 }
}
const early=geometry(154,false),contact=geometry(244,false),rest=geometry(392,false),reduced=geometry(154,true);
assert(early.lo<-.14,'starts on the cuff');
assert(contact.centroid>early.centroid+.05&&rest.centroid>early.centroid+.08,'moves inward along actual hand, not from detached space');
assert(rest.hi<.111&&rest.left<.10,'finishes on the exposed hand');
assert(reduced.hi<.111&&reduced.lo>-.245);
assert(early.rgbSum>1&&contact.rgbSum>1&&rest.rgbSum>1);
{
 const first=envelope(110),middle=envelope(290);
 assert(lightAt(.27,first)>lightAt(.91,first));
 assert(lightAt(.92,middle)>lightAt(.17,middle));
 assert(handEdge(0,.37)[0]<handEdge(1,.37)[0]);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const s=fillSfx(rate,'ec-500',9),s2=fillSfx(rate,'other',9);
 assert.deepEqual(s,s2);assert.equal(s.data.length,Math.round(.61*rate));
 assert(s.data.every(Number.isFinite));assert.equal(Math.abs(s.data[0]),0);assert.equal(Math.abs(s.data.at(-1)),0);assert(s.peak>.05&&s.peak<.24);
 const start=Math.floor(FIRST_SOUND_MS/1000*rate);
 let t=0;for(let i=0;i<s.data.length;i++)if(Math.abs(s.data[i])>Math.abs(s.data[t]))t=i;
 assert(t>=start&&t<start+Math.ceil(.026*rate));
}
console.log(JSON.stringify({rejected,mesh,invar,audioRates:6,phases:[early,contact,rest,reduced].map(x=>[x.lo,x.hi,x.centroid,x.left,x.rgbSum])}));
