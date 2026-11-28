import {stateAt} from './plan.mjs';
const mix=(a,b,t)=>a+(b-a)*t,N=20;
export function outline(reach){
 return Array.from({length:N},(_,i)=>{
  const a=2*Math.PI*i/N,v=(1+Math.sin(a))/2,h=Math.cos(a);
  const width=.155+(.106*reach)*(1-.70*v);
  return [h*width*(.59+.43*v)+.056*(1-v)*(1-reach),-.372-(.445-.273*reach)*(1-v)];
 });
}
export function buildMarker(e,t,{reduced=false}={}){
 const q=stateAt(t,{reduced});
 if(!q.alpha||!e)return new Float32Array();
 const a=[],o=outline(q.reach),c=[.009,-.372-(.445-.273*q.reach)*.42];
 const ink=[.036,.069,.112], teal=[.13,.40,.53], rim=[.55,.93,.98];
 const p=(v,r)=>{
   const x=mix(c[0],v[0],r), y=mix(c[1],v[1],r);
   const vFrac=(y+.82)/.45, side=.52+.42*Math.max(-.8,Math.min(1,-x/.20));
   const hot=(1-r*.82)*side*(.55+.45*q.contact);
   const col=ink.map((n,i)=>mix(mix(n,teal[i],.58*side+.20*vFrac),rim[i],hot));
   const alpha=q.alpha*(r===1?.47:r===.67?.95:.98);
   return [x,y,...col,alpha,.12*hot,0];
 };
 for(let i=0;i<N;i++){
   const A=o[i],B=o[(i+1)%N],C=p(c,0),ah=p(A,.67),bh=p(B,.67),af=p(A,1),bf=p(B,1);
   a.push(...C,...ah,...bh,...ah,...af,...bf,...ah,...bf,...bh);
 }
 return new Float32Array(a);
}
