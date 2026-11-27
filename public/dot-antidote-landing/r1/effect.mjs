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
const N=72,TAU=Math.PI*2;
const pool=[.123,.34,.25], body=[.089,.68,.49], seam=[.70,2.34,1.63], crest=[.24,1.19,.94], ink=[.024,.091,.071];
export function buildReceipt(g,ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),from=g.length,p=[0,0];
 if(q.opacity<=0)return {p,contact:p,lum:0,stage:q.stage,triangles:0};
 // The preview calibration is 40 world units per fixture meter. X and Y
 // use the same scale; the envelope never exceeds the authoritative radius.
 const R=ev.radius/40, step=TAU/N;
 const point=(a,r)=>[Math.cos(a)*r*R,Math.sin(a)*r*R];
 const spread=q.outer-q.inner;
 const sample=(a,b)=>{
   const grain=.5+.5*Math.sin(3*a+.61*Math.cos(5*a))*.68+.11*Math.sin(11*a-1.4);
   const weight=cap(grain);
   const wild=(1.-smooth(.33,1.,q.outer))*.065*(.49+.51*Math.sin(5*a+.4));
   const edge=q.outer*(1.-wild);
   const inside=Math.min(q.inner*(.95+.045*Math.cos(6*a+.7)),edge*.966);
   const w=edge-inside;
   return [
    {p:point(a,inside),c:pool,z:0,h:0},
    {p:point(a,inside+w*.18),c:cMix(pool,body,weight),z:q.opacity*(.37+.17*weight),h:.1},
    {p:point(a,inside+w*(.63+.13*Math.sin(4*a+b))),c:cMix(body,crest,weight),z:q.opacity*(.48+.14*weight),h:.20*q.light},
    {p:point(a,Math.min(edge-.045*w,inside+w*.913)),c:cMix(crest,seam,weight),z:q.opacity*(.56+.22*weight),h:.29*q.light},
    {p:point(a,Math.max(inside,edge-.030*spread)),c:ink,z:q.opacity*(.49+.18*weight),h:0},
    {p:point(a,edge),c:ink,z:0,h:0},
   ];
 };
 for(let i=0;i<N;i++){
  const A=sample(i*step,t*.009),B=sample((i+1)*step,t*.009);
  for(let j=0;j<5;j++){let a=A[j],b=A[j+1],c=B[j+1],d=B[j];g.quad(a.p,b.p,c.p,d.p,a.c,b.c,c.c,d.c,a.z,b.z,c.z,d.z,a.h,b.h,c.h,d.h)}
 }
 return {p,contact:p,stage:q.stage,progress:q.outer*R,lum:q.light,triangles:(g.length-from)/24};
}
export function fillSfx(rate,_variant,seed=1){
 const data=new Float32Array(Math.ceil(rate*.419));let prev=0, high=0, low=0,peak=0,rand=seed|0;
 for(let i=0;i<data.length;i++){
  const t=i/rate;rand^=rand<<13;rand^=rand>>>17;rand^=rand<<5;
  const n=(rand>>>0)/2147483648-1;
  low+=(1-Math.exp(-TAU*325/rate))*(n-low);high+=(1-Math.exp(-TAU*2050/rate))*(n-high);
  const front=smooth(0,.006,t), impact=Math.exp(-36*t), damp=1-smooth(.29,.414,t);
  const liquid=Math.sin(TAU*(330*t-370*t*t))*.16*impact;
  const surface=(high-low)*(.112*impact+.104*smooth(.033,.075,t)*(1-smooth(.10,.3,t)));
  const tiny=Math.sin(TAU*(680*t-700*t*t))*.049*Math.exp(-23*t);
  data[i]=front*damp*(liquid+surface+tiny+.028*(n-prev)*impact);prev=n;peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
