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
const N=80,TAU=Math.PI*2;
const deep=[.023,.153,.120], fluid=[.14,.88,.67], caustic=[1.36,2.38,1.62], shadow=[.021,.075,.063];
export function buildReceipt(g,ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),from=g.length,p=[0,0];
 if(q.opacity<=0)return {p,contact:p,lum:0,stage:q.stage,triangles:0};
 const R=ev.radius/40,step=TAU/N,surge=reduced?1:smooth(0,178,t);
 const rimLoss=smooth(256,470,t), midLoss=smooth(330,LIFE,t);
 const polar=(a,r)=>[Math.cos(a)*r*R,Math.sin(a)*r*R];
 const wav=(x,a)=>.64*Math.sin(x*4+.64*Math.cos(a*3))+.24*Math.cos(x*7-.55)+.12*Math.sin(x*11);
 function xsect(a){
  const vein=cap(.52+.63*wav(a,a));
  const nose=(.16+.84*surge)*(1-(1-surge)*.25*(1-vein));
  const r0=0,r1=nose*.21,r2=nose*(.43+.11*vein),r3=nose*(.76+.092*vein),r4=nose*.993,r5=nose;
  const phase=reduced?0:.14*(1-surge);
  const contact=(part,s)=>polar(a+phase*part*(.55+.45*Math.sin(5*a)),s);
  const light=q.light;
  const U=q.opacity, breakWidth=(1-rimLoss)*(1-rimLoss), breadth=cap(.62+.55*vein);
  const head=rimLoss*(1-vein)*.03;
  return [
   [contact(0,r0),fluid,U*.37*(1-midLoss),.02],
   [contact(.3,r1),cMix(deep,fluid,vein),U*(.37+.27*vein)*(1-midLoss),.10*light],
   [contact(.6,r2),cMix(deep,caustic,vein*.82),U*(.22+.50*vein)*(1-midLoss),.155*light],
   [contact(.9,r3),cMix(fluid,caustic,vein*.60),U*(.23+.66*vein)*breadth*(breakWidth+head),.17*light],
   [contact(1,r4),shadow,U*(.16+.43*vein)*breakWidth,0],
   [contact(1,r5),shadow,0,0]
  ];
 }
 for(let i=0;i<N;i++){
  const A=xsect(i*step),B=xsect((i+1)*step);
  for(let j=0;j<5;j++){
   const [a,b,c,d]=[A[j],A[j+1],B[j+1],B[j]];
   if(j===0)g.tri(a[0],b[0],c[0],a[1],b[1],c[1],a[2],b[2],c[2],a[3],b[3],c[3]);
   else g.quad(a[0],b[0],c[0],d[0],a[1],b[1],c[1],d[1],a[2],b[2],c[2],d[2],a[3],b[3],c[3],d[3]);
  }
 }
 return {p,contact:p,stage:q.stage,progress:(.16+.84*surge)*R,lum:q.light,triangles:(g.length-from)/24};
}
export function fillSfx(rate,_variant,seed=1){
 const data=new Float32Array(Math.ceil(rate*.455));let prev=0, high=0, low=0,peak=0,rand=seed|0;
 for(let i=0;i<data.length;i++){
  const t=i/rate;rand^=rand<<13;rand^=rand>>>17;rand^=rand<<5;
  const n=(rand>>>0)/2147483648-1;
  low+=(1-Math.exp(-TAU*325/rate))*(n-low);high+=(1-Math.exp(-TAU*2050/rate))*(n-high);
  const front=smooth(0,.006,t), impact=Math.exp(-42*t), damp=1-smooth(.30,.450,t);
  const liquid=Math.sin(TAU*(300*t-285*t*t))*.16*impact;
  const surface=(high-low)*(.112*impact+.104*smooth(.039,.102,t)*(1-smooth(.14,.36,t)));
  const tiny=Math.sin(TAU*(680*t-700*t*t))*.049*Math.exp(-23*t);
  data[i]=front*damp*(liquid+surface+tiny+.028*(n-prev)*impact);prev=n;peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
