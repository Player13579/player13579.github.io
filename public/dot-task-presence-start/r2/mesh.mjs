import {stateAt} from './plan.mjs';
const A=[0,.09,.22,.37,.49,.64,.78,.90,1],B=[-1,-.65,-.34,-.10,.12,.38,.68,1];
const mix=(a,b,t)=>a+(b-a)*t;
const sat=x=>Math.max(0,Math.min(1,x));
const shadow=[.077,.108,.20], body=[.25,.36,.89], pale=[.69,1.09,1.39];
export function buildPresence(receipt,t,options={}){
 const q=stateAt(t,options);if(!q.alpha||!receipt)return new Float32Array();
 const out=[];
 for(const s of [0,1]){
  const point=(u,v)=>{
   const uMask=Math.sin(u*Math.PI)**.35, low=s*.144, shift=(1-q.reach)*(s?.225:.32);
   const x=.32+.70*u+v*.027*uMask+(1-q.reach)*.028*s;
   const y=.36+low-.11*u+.03*Math.sin(Math.PI*u)+v*(.012+.052*uMask)-shift;
   const crease=Math.exp(-((v+.32)**2)/.092), edge=Math.max(0,1-Math.abs(v)), blade=Math.exp(-((u-q.reach*.94)**2)/.063);
   const rim=(.20+.50*crease)*edge, ray=blade*edge*q.contact;
   const c=shadow.map((a,k)=>mix(mix(a,body[k],.5+rim*.37),pale[k],sat(rim*.38+ray*.41)));
   return [x,y,...c,q.alpha*(.51+.34*edge)*uMask*(.66+.31*rim),.12+.33*ray+.22*rim,0];
  };
  for(let i=0;i<A.length-1;i++)for(let j=0;j<B.length-1;j++){
    const x=point(A[i],B[j]),y=point(A[i+1],B[j]),z=point(A[i+1],B[j+1]),w=point(A[i],B[j+1]);
    out.push(...x,...y,...z,...x,...z,...w);
  }
 }
 return new Float32Array(out);
}
