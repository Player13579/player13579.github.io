import {stateAt} from './plan.mjs';
const smooth=x=>{const u=Math.max(0,Math.min(1,x));return u*u*(3-2*u)};
const ink=[.051,.10,.16], enamel=[.18,.51,.67], silver=[.73,1.04,1.09];
export function buildMarker(e,t,{reduced=false}={}){
 const q=stateAt(t,{reduced});
 if(!q.alpha||!e)return new Float32Array();
 // One stationary, gently bent enamel plane. The opening clips the mesh from its
 // center outward. Retained surface coordinates never translate or fold.
 const a=[], opening=.93*q.reach;
 const u=[0,.09,.23,.39,.57,.76,.90,1], v=[-1,-.60,-.18,.27,.64,1];
 function point(side,r,k){
  const u=opening+(1-opening)*r, x=side*u;
  const end=Math.max(0,1-u)**.57;
  const spread=(.089+.018*x)*end;
  const y=-.624-.080*x+.026*x*x+k*spread;
  const slope=smooth((k+.95)*.64);
  const sheen=Math.max(0,1-Math.abs(k+.20)*1.37);
  const c=ink.map((f,i)=>f+(enamel[i]-f)*slope+(silver[i]-enamel[i])*sheen*(.34+.29*q.contact));
  const rim=smooth((1-Math.abs(k))/.61);
  const edge=opening>0?smooth(r/.18):1;
  const alpha=q.alpha*end*edge*(.45+.52*rim);
  return [x*.404,y,...c,alpha,.15+sheen*.36,0];
 }
 for(const side of [-1,1])for(let i=0;i<u.length-1;i++)for(let j=0;j<v.length-1;j++){
   const z=(j,k)=>point(side,u[j],v[k]);
   const q=z(i,j),r=z(i+1,j),s=z(i+1,j+1),w=z(i,j+1);
   a.push(...q,...r,...s,...q,...s,...w);
 }
 return new Float32Array(a);
}
