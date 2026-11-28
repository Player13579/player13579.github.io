import {strict as A} from 'node:assert';
import {admit,stateAt,TYPE,LIFE} from './plan.mjs';
const at=1795772844000, base={id:'magic_demo',type:TYPE,playerId:'thrower',targetId:'',x:340,y:802,at};
for(const variant of ['0','1']){
 const radius=120+30*Number(variant),e={...base,variant,radius};
 A.deepEqual(admit(e,at+10),{id:e.id,x:e.x,y:e.y,at,radius,ageMs:10});
 for(const patch of [{radius:radius+1},{id:''},{type:'bottle-shards'},{type:'status-poison-cleared'},{type:'action-item-use'},{variant:1},{variant:'01'},{variant:'2'},{x:Infinity},{targetId:'somebody'}]) A.equal(admit({...e,...patch},at),null);
 A.equal(admit(e,at-126),null); A.equal(admit(e,at+LIFE),null);
}
for (const reduced of [false,true]) {
 let last=0;
 for(let t=0;t<LIFE;t++) {const s=stateAt(t,{reduced}); A.ok(s.inner>=0 && s.inner<s.outer && s.outer<=1); A.ok(s.outer>=last); A.ok(s.opacity>=0&&s.opacity<=1);last=s.outer}
 A.equal(stateAt(-1,{reduced}).stage,'off');A.equal(stateAt(LIFE,{reduced}).stage,'off');
}
console.log('two authoritative sizes, rejected unrelated causes, finite bounded effect envelope');
const {Mesh,buildReceipt,fillSfx}=await import('./effect.mjs');
for(const radius of [120,150])for(const reduced of [false,true]){
 for(let t=1;t<LIFE;t++){
  const g=new Mesh(), z=buildReceipt(g,{radius},t,{reduced});
  A.ok(z.triangles>0&&z.triangles<=710&&g.length===z.triangles*24);
  for(let i=0;i<g.length;i+=8){
   A.ok(Math.hypot(g.data[i],g.data[i+1])<=radius/40+0.000002);
   for(let j=0;j<8;j++)A.ok(Number.isFinite(g.data[i+j]));
  }
 }
 for(const t of [-1,0,LIFE,1000])A.equal(buildReceipt(new Mesh(),{radius},t,{reduced}).triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate,'0',3141);
 A.ok(data.every(Number.isFinite)&&peak>.06&&peak<.5);
 A.equal(Math.abs(data[0]),0);A.equal(Math.abs(data.at(-1)),0);
}
console.log('2436 active meshes, exact radius bounded, 710 triangles maximum, six audio sample rates');
const {slitAt,receipt}=await import('./effect.mjs');
const {createHash}=await import('node:crypto');
const sha=b=>createHash('sha256').update(b).digest('hex');
const mes=(ev,t,opts)=>{const m=new Mesh();const z=buildReceipt(m,ev,t,opts);return [m.data.slice(0,m.length),z];};
const r4raw={...base,radius:120,variant:'0'};
for(const r of [r4raw,{...r4raw,radius:150,variant:'1'}]){
 A.ok(receipt(r,at)?.radius===r.radius);
 for(const t of [1,28,72,106,174,215,305,442,575,609]){
  const a=receipt(r,at+t),b=receipt({...r,healed:true,recipientCount:700,hp:800,dx:500,damage:-50,playerId:'unrelated-thrower'},at+t);
  for(const reduced of [false,true]) A.deepEqual(mes(a,t,{reduced}),mes(b,t,{reduced}));
 }
}
A.equal(slitAt(40).aperture,0);
A.ok(slitAt(205).aperture>.44);
A.ok(slitAt(490).aperture<slitAt(205).aperture);
A.equal(slitAt(1,true).aperture,slitAt(609,true).aperture);
const signal=fillSfx(48000,'0',3141).data, boosted=fillSfx(48000,'1',3141).data;
A.deepEqual(signal,boosted);
const rms=x=>Math.sqrt(x.reduce((s,v)=>s+v*v,0)/x.length);
A.ok(rms(signal.slice(0,4800))>10*rms(signal.slice(-4800)));
console.log(JSON.stringify({soundLengthMs:395,audioSHA48K:sha(Buffer.from(signal.buffer)),rms:rms(signal),maskedMetadataComparisons:40,geometryBudget:710}));
