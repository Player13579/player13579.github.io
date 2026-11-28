import {stateAt} from './plan.mjs';
const U=Array.from({length:17},(_,i)=>(i-8)/8);
const V=[-1,-.8,-.52,-.21,.16,.48,.76,1], lerp=(a,b,t)=>a+(b-a)*t;
const dim=[.047,.092,.129], surface=[.17,.49,.67], core=[.68,1.15,1.29];
export function buildPresence(receipt,t,options={}){
 const q=stateAt(t,options);
 if(!q.alpha||!receipt)return new Float32Array();
 // 固定した足元の接触点から、一枚の弧状膜の面積だけが左右非対称に増える。
 const out=[];
 const point=(u,v)=>{
   const angularSpan=u<0?lerp(.45,1.03,q.reach):lerp(.50,1.58,q.reach);
   const a=1.37+u*angularSpan;
   const taper=Math.max(0,1-u*u)**.66;
   const thickness=.035+.145*taper;
   const x=-.057+(.432+v*thickness)*Math.cos(a);
   const y=.365+(.203+v*thickness*.60)*Math.sin(a);
   const coverage=Math.pow(Math.max(0,1-v*v),.52)*taper;
   const peak=Math.max(0,1-Math.abs(v+.29))*taper;
   const c=dim.map((z,k)=>lerp(lerp(z,surface[k],.48+.46*coverage),core[k],(.30+.23*q.contact)*peak));
   return [x,y,...c,q.alpha*coverage*(.59+.31*q.contact),.18+.29*peak,0];
 };
 for(let i=0;i<U.length-1;i++)for(let j=0;j<V.length-1;j++){
   const a=point(U[i],V[j]),b=point(U[i+1],V[j]),c=point(U[i+1],V[j+1]),d=point(U[i],V[j+1]);
   out.push(...a,...b,...c,...a,...c,...d);
 }
 return new Float32Array(out);
}
