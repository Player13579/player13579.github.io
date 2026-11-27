import {stateAt} from './plan.mjs';
const mix=(a,b,t)=>a+(b-a)*t;
const clip=x=>Math.max(0,Math.min(1,x));
const blend=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
const ink=[.035,.18,.25], satin=[.12,.66,.65], light=[.38,1.19,1.04], gold=[1.43,.93,.38];
const length=[0,.12,.29,.43,.60,.79,.92,1], width=[-1,-.55,0,.55,1];
export function buildMarker(e,t,{reduced=false}={}){
 const q=stateAt(t,{reduced});if(!q.alpha||!e)return new Float32Array();
 const out=[];
 function grid(A,B,point){
  for(let i=0;i<A.length-1;i++)for(let j=0;j<B.length-1;j++){
    const a=point(A[i],B[j]),b=point(A[i+1],B[j]),c=point(A[i+1],B[j+1]),d=point(A[i],B[j+1]);
    for(const p of [a,b,c,a,c,d])out.push(...p)
  }
 }
 const gap=mix(.114,.026,q.reach);
 for(const side of [-1,1])grid(length,width,(u,v)=>{
   const taper=Math.sin(u*Math.PI)**.4;
   const bend=u<.43?u/.43:1-(u-.43)*1.04;
   const section=(.035+.053*taper)*(1-.2*bend);
   const x=side*(gap+.235*bend+v*section);
   const y=-.69+.235*u-.047*bend+side*v*.071*taper*(.63+.37*q.reach);
   const groove=clip(1-Math.abs(v-.09)*1.65);
   const internal=groove*(.68+.32*q.contact);
   const shaded=blend(ink,satin,.28+.54*taper*(1-Math.abs(v)));
   const c=blend(shaded,light,internal*.57);
   const opacity=q.alpha*taper*(.47+.31*groove)*(1-.35*Math.max(0,Math.abs(v)-.6));
   return [x,y,...c,opacity,.12+.58*internal,0];
 });
 // One gold closure spans the small gap; all brightness is local to the marker.
 grid([-1,-.77,-.43,0,.43,.77,1],[-1,0,1],(u,v)=>{
    const cap=clip(1-Math.abs(u));
    return [u*mix(.024,.126,q.contact),-.69+.054*Math.abs(u)+v*.029*(.51+.49*cap),
     ...blend([.28,.19,.13],gold,cap*(.38+.62*q.contact)),
     q.alpha*cap*(.17+.81*q.contact)*(1-.65*Math.abs(v)),(.28+.45*q.contact)*cap,0];
 });
 return new Float32Array(out);
}
