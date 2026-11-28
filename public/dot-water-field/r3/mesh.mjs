import {stateAt} from './plan.mjs';
const N=48,rings=[0,.15,.30,.45,.60,.75,.86,.92,.96,1],TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
const mix=(a,b,t)=>a+(b-a)*t;
const tint=(a,b,t)=>a.map((v,k)=>mix(v,b[k],t));
const deep=[.025,.105,.18], bank=[.09,.39,.49], sheen=[.39,1.00,1.19];
const band=(d,w)=>Math.exp(-((d/w)**2));
export function buildWaterSheet(f,t,opt={}){
 const s=stateAt(f,t,opt);
 if(!s.opacity||!Number.isFinite(f?.radius)||f.radius<40)return new Float32Array();
 const out=new Float32Array(N*(3+6*(rings.length-2))*8);
 let off=0;
 const cs=.942,sn=-.334;
 function p(j,k){
  const a=(k%N)*TAU/N,u=rings[j], c=Math.cos(a),n=Math.sin(a);
  const outline=.83+.067*Math.cos(3*a+.62)+.036*Math.cos(5*a+1.02);
  const X=outline*u*c,Y=outline*u*n*.77;
  // Depth tint, substrate visibility and reflected lobe are separate.
  const depth=clamp(1.18-Math.hypot((X+.214)*1.28,(Y-.10)*1.53));
  const shallows=clamp(1-depth*1.26);
  const offset=mix(.29,.055,s.settled);
  const axis=Y+.34*X+.13*X*X;
  const lobe=band(axis-offset,.15)*(.32+.68*band(X-.13,.56));
  const transient=opt.reduced ? 0 : band(axis-offset+.17,.10)*s.caustic*.26;
  const staticEdge=band(u-.94,.044)*clamp(.15+.59*c-.50*n);
  const edge=clamp((1-u)/.081);
  const lamp=clamp(.67*lobe+transient+.43*staticEdge);
  const rgb=tint(tint(deep,bank,.24+.57*shallows),sheen,lamp);
  const alpha=s.opacity*edge*(.44+.26*depth+.14*lamp);
  const returned=s.opacity*edge*(.07+.61*lamp);
  return [(cs*X-sn*Y)*f.radius,(sn*X+cs*Y)*f.radius,...rgb,alpha,returned,0];
 }
 function push(...vs){for(const v of vs){out.set(v,off);off+=8;}}
 for(let i=0;i<N;i++){
  push(p(0,0),p(1,i),p(1,i+1));
  for(let j=1;j<rings.length-1;j++){
   const a=p(j,i),b=p(j+1,i),c=p(j+1,i+1),d=p(j,i+1);
   push(a,b,c,a,c,d);
  }
 }
 return out;
}
