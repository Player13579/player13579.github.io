import {stateAt} from './plan.mjs';
const sat=x=>Math.max(0,Math.min(1,x));
const mix=(a,b,t)=>a+(b-a)*t;
const blend=(a,b,t)=>a.map((c,i)=>mix(c,b[i],t));
const copper=[.39,.16,.23], berry=[1.13,.355,.49], brass=[1.35,.97,.58];
const uList=[-1,-.8,-.55,-.30,-.12,.12,.30,.55,.8,1];
const vList=[0,.13,.3,.53,.74,.90,1];
function g(t){t=sat(t);return t*t*(3-2*t);}
export function buildBridge(e,t,o={}){
 const q=stateAt(t,o);
 if(!q.alpha||!Number.isFinite(e?.axis))return new Float32Array();
 const d=[Math.cos(e.axis),Math.sin(e.axis)], out=[];
 function push([x,y,rgb,a,glow]){out.push(d[0]*x-d[1]*y,d[1]*x+d[0]*y,...rgb,sat(a),glow,0)}
 for(const side of [-1,1]){
  const vertex=(u,v)=>{
   const join=q.reach;
   const crest=Math.sin(u*Math.PI)*.11;
   const gap=mix(o.reduced?.22:.64,0,join);
   const width=(.26+.15*(1-u*u))*(.83+.17*q.contact);
   const tooth=.067*Math.sin(u*Math.PI*2)*join;
   const fold=(v<.53?v/.53:mix(1,.53,(v-.53)/.47));
   const x=side*(gap+width*v)+tooth*(1-v);
   const y=u*.69+side*crest*v+side*(1-join)*.12*v;
   const crossing=Math.exp(-(((u*.51+.5)-mix(.19,.81,q.vanish))**2)/.021);
   const edge=g((1-Math.abs(u))/.34);
   const shear=.58+.42*fold;
   const heat=q.contact*(.5+.5*crossing)*(1-.56*v);
   const c=blend(blend(copper,berry,shear*.78),brass,heat*.78);
   let alpha=q.alpha*edge*(.30+.55*fold)*(1-.79*g((v-.72)/.28))*(.58+.42*heat);
   if(v<.15)alpha*=mix(.30,1,join);
   return [x,y,c,alpha,.13+.42*heat+.22*fold];
  };
  for(let i=0;i<uList.length-1;i++)for(let j=0;j<vList.length-1;j++){
   const a=vertex(uList[i],vList[j]),b=vertex(uList[i+1],vList[j]),c=vertex(uList[i+1],vList[j+1]),d=vertex(uList[i],vList[j+1]);
   for(const p of [a,b,c,a,c,d])push(p)
  }
 }
 // One planar seam, broadening briefly while both folded faces remain visible.
 for(let k=0;k<4;k++){
  const y=(k/4*2-1),z=((k+1)/4*2-1), point=(u,side)=>{
   const fy=u*.68,h=(1-u*u), x=.067*Math.sin(u*Math.PI*2)+side*h*(.015+.095*q.contact);
   return [x,fy,brass,q.alpha*q.contact*h*.81,.43+.21*h];
  };
  const a=point(y,-1),b=point(y,1),c=point(z,1),d=point(z,-1);
  for(const p of [a,b,c,a,c,d])push(p);
 }
 return new Float32Array(out)
}
