import {stateAt} from './plan.mjs';
const mix=(a,b,q)=>a+(b-a)*q;
const tint=(a,b,k)=>a.map((c,i)=>mix(c,b[i],k));
const satin=[.12,.49,.59], teal=[.32,1.27,1.27], gold=[1.49,.98,.32], ochre=[.75,.47,.16];
const clamp=x=>Math.max(0,Math.min(1,x));
export function buildMarker(effect,t,{reduced=false}={}){
 const q=stateAt(t,{reduced});if(!q.alpha||!effect)return new Float32Array();
 const out=[];
 function grid(a,b,fn) {
  for(let i=0;i<a.length-1;i++)for(let j=0;j<b.length-1;j++){
   const p=fn(a[i],b[j]),r=fn(a[i+1],b[j]),s=fn(a[i+1],b[j+1]),u=fn(a[i],b[j+1]);
   for(const k of [p,r,s,p,s,u])out.push(...k);
  }
 }
 const rise=reduced?0:.046*(1-q.reach), top=-.73+rise;
 const surface=[0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1], width=[-1,-.48,0,.48,1];
 for(const side of [-1,1])grid(surface,width,(u,v)=>{
   const shape=Math.sin(u*Math.PI), x=side*(.028+.115*shape)+.065*(1-u)+v*(.015+.018*shape);
   const y=top+.42*(1-u)+.044*side*shape;
   const z=reduced?.27:Math.exp(-((u-q.reach-.04)**2)/.037);
   const ridge=1-.82*Math.abs(v), f=clamp(.23+.7*z+.15*ridge);
   return [x,y,...tint(satin,teal,f),q.alpha*(.42+.36*z)*ridge*(.75+.25*shape),.14+.66*z*ridge,0];
 });
 // Two faces of one fixed end cap. The peak moves to the seam only once.
 grid([-1,-.70,-.35,0,.35,.70,1],[-1,-.5,0,.5,1],(u,v)=>{
   const taper=1-.89*Math.abs(u), middle=1-.79*Math.abs(v);
   return [u*.075,top+(v*.137)*taper,...tint(ochre,gold,middle*(.55+.42*q.contact)),
    q.alpha*taper*middle*(.55+.40*q.contact),.14+.66*middle*q.contact,0];
 });
 return new Float32Array(out);
}
