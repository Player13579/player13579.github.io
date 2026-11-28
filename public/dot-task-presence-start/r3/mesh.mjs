import {stateAt} from './plan.mjs';
// One continuous short, beveled upright plane; no closed shape, duplicate or prop.
const U=[0,.08,.20,.36,.52,.68,.82,.93,1], V=[-1,-.72,-.30,.20,.57,.81,1];
const lerp=(a,b,t)=>a+(b-a)*t;
const dark=[.018,.193,.194], pigment=[.13,.64,.51], edge=[.39,.91,.70];
export function buildPresence(receipt,t,options={}){
 const q=stateAt(t,options);
 if(!q.alpha||!receipt)return new Float32Array();
 const reach=.071+.929*q.reach;
 const out=[];
 const point=(u,v)=>{
   const endFade=(Math.sin(Math.PI*u))**.42;
   const edgeFade=Math.min(1,Math.max(0,(1-Math.abs(v))*2.7));
   const columnWidth=.065+.105*endFade;
   const x=-.64-.202*u*u+columnWidth*v;
   const y=.102-.763*u*reach+.027*v*endFade*reach;
   const fold=(1-Math.abs(v-.33)/1.5)*endFade;
   const lip=Math.exp(-((v-.57)**2)/.018)*endFade;
   const local=.08+.14*fold+.42*lip+.11*q.contact*lip;
   const c=dark.map((a,k)=>lerp(lerp(a,pigment[k],.28+.63*fold),edge[k],local));
   return [x,y,...c,q.alpha*endFade*(.10+.87*edgeFade),.07+.13*fold*q.contact,0];
 };
 for(let i=0;i<U.length-1;i++)for(let j=0;j<V.length-1;j++){
   const a=point(U[i],V[j]),b=point(U[i+1],V[j]),c=point(U[i+1],V[j+1]),d=point(U[i],V[j+1]);
   out.push(...a,...b,...c,...a,...c,...d);
 }
 return new Float32Array(out);
}
