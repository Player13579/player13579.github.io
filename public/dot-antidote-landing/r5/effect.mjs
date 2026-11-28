import {TYPE,VERSION,LIFE,admit,stateAt} from './plan.mjs';
export {TYPE,VERSION,LIFE};
export const HEIGHT=1.70, CSS_PX_PER_M=64/HEIGHT;
const cap=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const q=cap((x-a)/(b-a));return q*q*(3-2*q)};
const mix=(a,b,q)=>a+(b-a)*q;
const cMix=(a,b,q)=>a.map((x,i)=>mix(x,b[i],q));
export function receipt(raw,now=Date.now()){
 const x=admit(raw,now);return x?Object.freeze({...x,tier:raw.variant,dx:0}):null;
}
export function fixtureReceipt(serial,tier,defaultTier='0'){
 const variant=String(tier??defaultTier)==='1'?'1':'0';
 return {type:TYPE,id:'magic_dot_antidote_'+serial,x:0,y:0,playerId:'fixture-source',radius:120+30*Number(variant),variant,at:Date.now()};
}
export function basis(){return {p:[0,0]}}
export function drawFixture(){}
export class Mesh {
  constructor(){this.data=new Float32Array(2048);this.length=0}
  vertex(p,c,a=1,k=0){const i=this.length;if(i+8>this.data.length){const next=new Float32Array(this.data.length*2);next.set(this.data);this.data=next}this.data.set([p[0],p[1],c[0],c[1],c[2],cap(a),k,0],i);this.length=i+8}
  tri(a,b,c,ca,cb=ca,cc=ca,aa=1,ab=aa,ac=aa,ka=0,kb=ka,kc=ka){this.vertex(a,ca,aa,ka);this.vertex(b,cb,ab,kb);this.vertex(c,cc,ac,kc)}
  quad(a,b,c,d,ca,cb=ca,cc=ca,cd=cb,aa=1,ab=aa,ac=aa,ad=ab,ka=0,kb=ka,kc=ka,kd=kb){this.tri(a,b,c,ca,cb,cc,aa,ab,ac,ka,kb,kc);this.tri(a,c,d,ca,cc,cd,aa,ac,ad,ka,kc,kd)}
}
// Single top-down optical imprint: four rounded corners of one continuous plane.
// The center is never cut out. No actor, fragments, projectile, treatment result,
// chemical appearance or lasting ground is modeled.
const TAU=Math.PI*2, SIDES=38;
const RINGS=[.14,.30,.45,.59,.72,.86,.94,1];
const body=[.16,.51,.42],deep=[.015,.118,.115],light=[.43,1.18,.96],peakTint=[.83,1.42,1.16];
export function relief(a,r,q,{reduced=false}={}){
 const h=(Math.cos(4*a-.42)+1)*.5;
 const skew=(Math.cos(2*a+.66)+1)*.5;
 const radius=.845+.134*h+.011*skew;
 const n=reduced?.30:q.recede;
 const edgeRenew=(1-smooth(.875,.998,r));
 const inner=1-smooth(.0,.70,r);
 // Broad four facets share center radiance; none acts as an independently moving ribbon.
 const faceBend=smooth(.17,.81,r);
 const face=.5+.5*Math.cos(2*a+.78);
 const sheet=.19+.14*inner+(.055+.32*face)*faceBend;
 const returnLamp=smooth(.05,.48,n)*(1-smooth(.55,1,n));
 const lightCenter=(.39+.33*returnLamp)*(1-smooth(.08,.71,r));
 const rim=smooth(.63,.83,r)*(1-smooth(.89,.999,r));
 const breadth=.055+.075*skew+rim*(.07+.19*face)*(.80+.20*h)*(1-.4*n);
 const contact=q.light*(sheet+lightCenter+edgeRenew*breadth*smooth(.07,.74,r));
 const v=cap(contact);
 const colored=cMix(deep,body,cap(.22+.52*inner+.22*h+.12*face));
 const value=cMix(cMix(colored,light,v),peakTint,.25*v*v);
 const alpha=q.opacity*edgeRenew*(.215+.25*inner+.11*faceBend*h)+
  .080*q.opacity*(1-smooth(.88,.995,r));
 return {radius,value,alpha,radiance:q.opacity*edgeRenew*(.036+.102*v),contact:v};
}
export function buildReceipt(g,ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),before=g.length,p=[0,0];
 if(q.opacity<=0)return {p,contact:p,lum:0,stage:q.stage,triangles:0};
 const scale=ev.radius*q.shown/40, views=[];
 const source=relief(0,0,q,{reduced});
 const center=source.value;
 let lum=source.radiance;
 for(let i=0;i<SIDES;i++){
  const a=TAU*i/SIDES, ca=Math.cos(a),sa=Math.sin(a);
  views.push(RINGS.map(r=>{
   const optics=relief(a,r,q,{reduced});
   lum=Math.max(lum,optics.radiance);
   const d=r*optics.radius*scale;
   return {p:[ca*d,sa*d],c:optics.value,a:optics.alpha,k:optics.radiance};
  }));
 }
 for(let i=0;i<SIDES;i++){
  const v=views[i],w=views[(i+1)%SIDES];
  g.tri(p,v[0].p,w[0].p,center,v[0].c,w[0].c,source.alpha,v[0].a,w[0].a,source.radiance,v[0].k,w[0].k);
  for(let j=0;j<v.length-1;j++){
   const f=[v[j],v[j+1],w[j+1],w[j]];
   g.quad(...f.map(x=>x.p),...f.map(x=>x.c),...f.map(x=>x.a),...f.map(x=>x.k));
  }
 }
 return {p,contact:p,stage:q.stage,progress:scale,lum,triangles:(g.length-before)/24};
}
// Two related components of a single short ground-contact sound under one envelope.
export function fillSfx(rate,_tier,seed=1){
 const data=new Float32Array(Math.ceil(rate*.395));let current=(seed|0)||7,low=0,wide=0,peak=0;
 const k0=1-Math.exp(-TAU*302/rate),k1=1-Math.exp(-TAU*1710/rate);
 for(let i=0;i<data.length;i++){
  const t=i/rate;current^=current<<13;current^=current>>>17;current^=current<<5;
  const white=(current>>>0)/2147483648-1;
  low+=(white-low)*k0;wide+=(white-wide)*k1;
  const onset=smooth(0,.008,t)*(1-smooth(.241,.386,t));
  const bed=.143*Math.sin(TAU*(162*t-110*t*t))*Math.exp(-14.3*t);
  const pressure=.095*(wide-low)*smooth(.016,.041,t)*(1-smooth(.095,.243,t));
  const body=.035*Math.sin(TAU*(291*t-231*t*t))*Math.exp(-17*t);
  data[i]=onset*(bed+pressure+body);peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
