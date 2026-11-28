import {stateAt} from './plan.mjs';
const U=[-1,-.82,-.54,-.24,0,.24,.54,.82,1], V=[-1,-.72,-.30,.20,.57,.81,1];
const lerp=(a,b,t)=>a+(b-a)*t;
const dark=[.048,.115,.141], pigment=[.16,.60,.60], lip=[.48,.86,.81];
export function buildPresence(receipt,t,options={}){
 const q=stateAt(t,options);
 if(!q.alpha||!receipt)return new Float32Array();
 const out=[], skew=.181*(1-q.reach);
 const point=(u,v)=>{
   const taper=Math.max(0,1-u*u)**.56;
   const x=-.627+.319*u, y=.012+u*skew+(.028+.052*taper)*v;
   const edgeFade=Math.min(1,Math.max(0,(1-Math.abs(v))*2.8));
   const sheen=taper*(1-Math.min(1,Math.abs(v+.25)));
   const c=dark.map((a,k)=>lerp(lerp(a,pigment[k],.35+.52*sheen),lip[k],(.20+.12*q.contact)*sheen));
   return [x,y,...c,q.alpha*(.15+.78*taper)*(.26+.74*edgeFade),.05,0];
 };
 for(let i=0;i<U.length-1;i++)for(let j=0;j<V.length-1;j++){
   const a=point(U[i],V[j]),b=point(U[i+1],V[j]),c=point(U[i+1],V[j+1]),d=point(U[i],V[j+1]);
   out.push(...a,...b,...c,...a,...c,...d);
 }
 return new Float32Array(out);
}
