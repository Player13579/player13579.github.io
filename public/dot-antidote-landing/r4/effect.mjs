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
const TAU=Math.PI*2;
const wet=[.085,.73,.32], dense=[.021,.173,.105], underside=[.17,.38,.18], clarity=[.38,1.25,.61], pale=[.69,1.69,.97];
const rotation=-.56,C=Math.cos(rotation),S=Math.sin(rotation);
const cuts=31;
function edge(u,side){
 const half=Math.sqrt(Math.max(0,1-u*u));
 return half*(.96+.021*Math.cos(u*6.9+side*.8)+.012*Math.sin(u*15.1+side*2.1));
}
function taper(u){return Math.pow(Math.max(0,1-u*u),.51);}
function seam(u){
 // Broad inflection cut into one sheet, not a forward-facing ripple.
 return .15*Math.sin(u*2.65-.32)+.044*Math.sin(u*6.9+.76);
}
export function slitAt(t,reduced=false){
 const aperture=reduced?.46:smooth(53,229,t)*(.56-.28*smooth(264,490,t));
 const separations=reduced?0:smooth(135,335,t);
 return {aperture,separations};
}
export function buildReceipt(g,ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),from=g.length,p=[0,0];
 if(q.opacity<=0)return {p,contact:p,lum:0,stage:q.stage,triangles:0};
 const R=ev.radius/40,L=q.outer*R;
 const point=(u,v)=>[(u*C-v*S)*L,(u*S+v*C)*L];
 const {aperture,separations}=slitAt(t,reduced);
 const wetness=q.opacity*(1-smooth(215,605,t));
 const reflectTime=smooth(18,88,t)*(1-smooth(166,527,t));
 for(const side of [-1,1]){
  const sideFade=1-smooth(side<0?288:335,side<0?549:610,t);
  if(sideFade<=0)continue;
  const row=u=>{
   const h=edge(u,side);
   const tilt=seam(u)*h;
   const wave=(.84+.10*Math.sin(7.3*u+side*.89)+.06*Math.sin(12.7*u-side));
   const recessed=side<0 ? .085 : .025;
   const lo=tilt+side*h*(aperture*wave+recessed*separations);
   const hi=side*h;
   const centerTint=.47+.16*Math.sin(3.8*u+side*.52);
   const gap=hi-lo;
   const edgeMask=taper(u);
   // Two longer, oblique specular faces separated by the unpainted ground.
   // Only the narrow lip catches light; the body remains substantially translucent.
   const specPos=side<0?-.31:.28;
   const spec=Math.pow(Math.max(0,1-Math.abs(u-specPos)/(.86+.08*side)),.76);
   const decay=side<0?.80+.2*(1-smooth(145,300,t)):1;
   const lip=Math.max(0,aperture-.14)*1.78;
   const core=sideFade*wetness*edgeMask;
   const shine=sideFade*reflectTime*edgeMask*spec*decay*lip;
   const P=(f,color,alpha,coupling=0)=>[point(u,lo+gap*f),color,alpha,coupling];
   return [
    P(0,dense,0),
    P(.10,underside,core*(.11+.10*lip)),
    P(.22,cMix(clarity,pale,spec*.6),core*.075+shine*.53,.072*shine),
    P(.46,cMix(underside,wet,centerTint),core*(.44-.10*side)),
    P(.82,cMix(dense,wet,.40+.11*Math.cos(4*u)),core*(.37-.09*side)),
    P(1,dense,0),
   ];
  };
  for(let j=0;j<cuts;j++){
   const a=row(-1+2*j/cuts),b=row(-1+2*(j+1)/cuts);
   for(let k=0;k<a.length-1;k++){
    const A=a[k],B=a[k+1],D=b[k],C=b[k+1];
    g.quad(A[0],B[0],C[0],D[0],A[1],B[1],C[1],D[1],A[2],B[2],C[2],D[2],A[3],B[3],C[3],D[3]);
   }
  }
 }
 // During the first contact, bridge the near-dry center with a single broad
 // flat fluid patch. It expires before the parting reflections peak.
 const contact=q.opacity*(1-smooth(64,183,t))*(reduced?.61:1);
 if(contact>0){
  const M=reduced?.20:Math.min(.27,.045+.25*smooth(12,119,t));
  const point0=(a,l)=>point(Math.cos(a)*l,Math.sin(a)*l*.52);
  for(let i=0;i<30;i++){
   const a=TAU*i/30,b=TAU*(i+1)/30;
   const qa=point0(a,M*.56),qb=point0(b,M*.56),ra=point0(a,M),rb=point0(b,M);
   g.tri(p,qa,qb,wet,clarity,clarity,contact*.21,contact*.36,contact*.36);
   g.quad(qa,ra,rb,qb,clarity,wet,wet,clarity,contact*.36,0,0,contact*.36);
  }
 }
 return {p,contact:p,stage:q.stage,progress:L,lum:reflectTime,triangles:(g.length-from)/24};
}
export function fillSfx(rate,_variant,seed=1){
 const data=new Float32Array(Math.ceil(rate*.395));let slow=0,fast=0,peak=0,prev=0,rand=seed|0;
 const lo=1-Math.exp(-TAU*540/rate),hi=1-Math.exp(-TAU*2380/rate);
 for(let i=0;i<data.length;i++){
  const t=i/rate;
  rand^=rand<<13;rand^=rand>>>17;rand^=rand<<5;
  const n=(rand>>>0)/2147483648-1;
  slow+=lo*(n-slow);fast+=hi*(n-fast);
  const limits=smooth(0,.004,t)*(1-smooth(.254,.391,t));
  const liquid=.205*Math.sin(TAU*(238*t-423*t*t))*Math.exp(-40*t);
  const slip=(fast-slow)*.19*smooth(.036,.075,t)*(1-smooth(.094,.218,t));
  const touch=(n-prev)*.028*Math.exp(-46*t);
  const softOnset=.033*Math.sin(TAU*(560*t-590*t*t))*Math.exp(-22*t);
  data[i]=limits*(liquid+slip+touch+softOnset);
  peak=Math.max(peak,Math.abs(data[i]));prev=n;
 }
 return {data,peak};
}
