import {stateAt} from "./plan.mjs";
const lerp=(a,b,t)=>a+(b-a)*t;
const sat=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=sat(x);return x*x*(3-2*x)};
const saffron=[1.57,.79,.19], blush=[.76,.28,.27], honey=[1.66,1.19,.51];
const tint=(a,b,k)=>a.map((v,i)=>lerp(v,b[i],k));
const along=[-1,-.88,-.70,-.48,-.24,0,.24,.48,.70,.88,1];
const across=[-1,-.66,-.28,0,.28,.66,1];
export function buildRibbon(effect,t,options={}){
 const q=stateAt(t,options);
 if(!q.alpha||!Number.isFinite(effect?.axis))return new Float32Array(0);
 const out=[],co=Math.cos(effect.axis),si=Math.sin(effect.axis);
 const push=([x,y,c,a,k])=>out.push(co*x-si*y,si*x+co*y,...c,sat(a),k,0);
 function grid(xs,ys,fn){
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){
   const a=fn(xs[i],ys[j]),b=fn(xs[i+1],ys[j]),c=fn(xs[i+1],ys[j+1]),d=fn(xs[i],ys[j+1]);
   [a,b,c,a,c,d].forEach(push);
  }
 }
 // Two narrow parallel lobes. The leading seam travels with each lobe.
 for(const side of [-1,1]){
   grid([-1,-.65,-.28,0,.28,.65,1],[-1,0,1],(u,v)=>{
    const bend=side*.11*u*u*(1-q.reach);
    const x=side*lerp(.72,.045,q.reach)+bend+v*.061;
    const y=u*lerp(.57,.39,q.reach);
    const h=smooth(1-Math.abs(u))*(1-.79*Math.abs(v));
    return [x,y,tint(blush,saffron,h),q.alpha*(1-smooth((q.reach-.48)/.52))*h*.88,h*.52];
   });
 }
 // A single satin band opens from the center, with transparent tapered ends.
 const length=lerp(.24,options.reduced?1.20:1.78,q.vanish);
 grid(along,across,(u,v)=>{
  const taper=Math.sqrt(Math.max(0,1-u*u));
  const x=.12*Math.sin(u*Math.PI)*q.vanish+v*taper*lerp(.094,.24,q.vanish);
  const y=u*length;
  const moving=Math.exp(-Math.pow((Math.abs(u)-lerp(.04,.89,q.vanish))*5.4,2));
  const core=smooth(1-Math.abs(v));
  const edge=smooth((1-Math.abs(u))*.9);
  const c=tint(tint(blush,saffron,core),honey,moving*core*.72);
  return [x,y,c,q.alpha*q.contact*edge*(.43+.50*core)*(1-.82*Math.abs(v)),core*(.16+.55*moving)];
 });
 return new Float32Array(out);
}
