import {stateAt} from './plan.mjs';
const L=[0,.07,.16,.31,.47,.63,.78,.9,.95,1], W=[-1,-.69,-.30,0,.34,.68,1];
const from=[.085,.24,.55], to=[.088,.49,.54], peak=[.62,1.17,1.23];
const m=(a,b,t)=>a+(b-a)*t;
const clip=x=>Math.max(0,Math.min(1,x));
export function buildEnds(e,t,o={}){
 const q=stateAt(t,o);
 if(!q.alpha||!Number.isFinite(e?.axis))return new Float32Array();
 const out=[], xAxis=Math.cos(e.axis),yAxis=Math.sin(e.axis);
 const put=([x,y,rgb,a,glow])=>out.push(xAxis*x-yAxis*y,yAxis*x+xAxis*y,...rgb,clip(a),glow,0);
 function ribbons(i,j,x,y){
   return [i,j,x,i,x,y];
 }
 for(const s of [-1,1]){
  const evalPoint=(u,v)=>{
   const gap=m(o.reduced?.22:.57,.032,q.reach), span=m(1.13,.045,q.vanish);
   const x=s*(gap+u*span), wing=Math.sin(u*Math.PI), center=s*(.035+.083*wing)*(1-q.reach*.68);
   const y=center+v*(.045+.23*wing)*(1-.62*q.vanish);
   const flow=Math.exp(-((u-m(.85,.12,q.reach))**2)/.15);
   const edge=clip((1-u)/.18)*clip((u+.09)/.22);
   const tube=1-.79*Math.abs(v);
   const col=from.map((a,i)=>m(m(a,to[i],(s>0?.77:.24)*tube),peak[i],flow*tube*.53+q.contact*.18));
   const a=q.alpha*edge*(.31+.56*tube)*(.52+.48*flow)*(1-.94*q.vanish);
   return [x,y,col,a,.09+.43*flow*tube];
  };
  for(let i=0;i<L.length-1;i++)for(let j=0;j<W.length-1;j++){
   const u=evalPoint(L[i],W[j]),v=evalPoint(L[i+1],W[j]),w=evalPoint(L[i+1],W[j+1]),x=evalPoint(L[i],W[j+1]);
   ribbons(u,v,w,x).forEach(put);
  }
 }
 // A narrow transverse hinge flashes once, with no outward afterimage.
 for(let j=0;j<4;j++){
   const cap=(u,s)=>{const r=1-u*u;return [s*.032*q.contact*r,u*.26,peak,q.alpha*q.contact*r*(1-q.vanish)*.77,.19+.48*r*q.contact]};
   const x=j*.5-1,y=x+.5;
   ribbons(cap(x,-1),cap(x,1),cap(y,1),cap(y,-1)).forEach(put);
 }
 return new Float32Array(out)
}
