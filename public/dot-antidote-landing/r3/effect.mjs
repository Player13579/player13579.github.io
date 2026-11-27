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
const low=[.041,.46,.29], ink=[.026,.105,.080], span=[.36,1.41,.93], sheen=[.92,2.28,1.32];
// Each row gives one interval of extra membrane thickness, not a separate impact.
const sheets=[
 [-2.92,-1.61,.45,.95,6,220],
 [-1.51,-.82,.61,.89,19,272],
 [-.77, .31,.44,.99,0,320],
 [.37,1.29,.68,.96,25,260],
 [1.33,2.70,.46,.98,10,357],
 [2.76,3.38,.62,.86,23,310]
];
export function buildReceipt(g,ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),from=g.length,p=[0,0];
 if(q.opacity<=0)return {p,contact:p,lum:0,stage:q.stage,triangles:0};
 const R=ev.radius/40;
 const polar=(a,r)=>[Math.cos(a)*r*R,Math.sin(a)*r*R];
 const D=reduced?1:.23+.77*smooth(0,199,t);
 const sub=(a,r)=>polar(a,r*D);
 const lowerU=q.opacity*(1-smooth(266,502,t));
 const lowerEdge=a=>.94+.05*Math.cos(a*3+.8)+.01*Math.sin(a*7-.55);
 for(let i=0;i<68;i++){
  const a=i/68*TAU,b=(i+1)/68*TAU,ra=lowerEdge(a),rb=lowerEdge(b);
  const z=.16+.08*Math.sin(2*a+.70);
  g.tri(p,sub(a,ra*.85),sub(b,rb*.85),low,span,span,lowerU*.17,lowerU*(.25+z),lowerU*(.25+z),.01,.02,.02);
  g.quad(sub(a,ra*.85),sub(a,ra),sub(b,rb),sub(b,rb*.85),low,ink,ink,low,lowerU*.35,0,0,lowerU*.35,.02,0,0,.02);
 }
 for(const [lo,hi,base,reach,delay,clear] of sheets){
  const flight=reduced?1:smooth(delay,182+delay,t);
  const end=clear+115,fuzz=smooth(delay,delay+75,t)*(1-smooth(clear,end,t))*q.opacity;
  if(fuzz<=0)continue;
  const count=11;
  const profile=j=>{
   const u=j/count,a=lo+(hi-lo)*u,w=Math.pow(Math.sin(u*Math.PI),1.12);
   const draw=.27+.73*flight;
   const shape=Math.min(1,reach-(reach-base)*(.20*(1-w)+.067*Math.sin(9*u+lo)**2));
   const offset=reduced?0:.21*(1-flight)*Math.sin(a+.8);
   const out=shape*draw, inside=out*(.74-.1*w);
   const tilt=Math.sin(u*Math.PI*.91+.52)**2;
   const h=cMix(span,sheen,tilt*.6);
   return [
    [polar(a+offset,inside*.89),low,0,0],
    [polar(a+offset,inside),ink,fuzz*w*.48,.0],
    [polar(a+offset*.82,inside+(out-inside)*(.39+.28*tilt)),h,fuzz*w*(.22+.40*tilt),.13*q.light],
    [polar(a+offset*.79,out*.993),span,fuzz*w*.42,.06*q.light],
    [polar(a+offset*.78,out),span,0,0]
   ];
  };
  for(let i=0;i<count;i++){
   const A=profile(i),B=profile(i+1);
   for(let j=0;j<4;j++){
    const [a,b,c,d]=[A[j],A[j+1],B[j+1],B[j]];
    g.quad(a[0],b[0],c[0],d[0],a[1],b[1],c[1],d[1],a[2],b[2],c[2],d[2],a[3],b[3],c[3],d[3]);
   }
  }
 }
 return {p,contact:p,stage:q.stage,progress:D*R,lum:q.light,triangles:(g.length-from)/24};
}
export function fillSfx(rate,_variant,seed=1){
 const data=new Float32Array(Math.ceil(rate*.395));let prev=0, high=0, low=0,peak=0,rand=seed|0;
 for(let i=0;i<data.length;i++){
  const t=i/rate;rand^=rand<<13;rand^=rand>>>17;rand^=rand<<5;
  const n=(rand>>>0)/2147483648-1;
  low+=(1-Math.exp(-TAU*325/rate))*(n-low);high+=(1-Math.exp(-TAU*2050/rate))*(n-high);
  const front=smooth(0,.006,t), impact=Math.exp(-42*t), damp=1-smooth(.26,.391,t);
  const liquid=Math.sin(TAU*(322*t-590*t*t))*.16*impact;
  const surface=(high-low)*(.112*impact+.104*smooth(.029,.082,t)*(1-smooth(.105,.24,t)));
  const tiny=Math.sin(TAU*(680*t-700*t*t))*.049*Math.exp(-23*t);
  data[i]=front*damp*(liquid+surface+tiny+.028*(n-prev)*impact);prev=n;peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
