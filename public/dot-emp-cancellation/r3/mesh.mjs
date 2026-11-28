import {stateAt} from './plan.mjs';
const dark=[.09,.22,.34], middle=[.14,.60,.73], bright=[.53,1.38,1.61];
const blend=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export function buildEnds(e,t,o={}){
 const q=stateAt(t,o);if(!q.alpha||!Number.isFinite(e?.axis))return new Float32Array();
 const a=e.axis,c=Math.cos(a),s=Math.sin(a),out=[];
 // Static convex bounds; the transparent pocket alone moves. Panels share no bridging geometry.
 for(const side of [-1,1]){
  const x0=.50*side,y0=-.075*side;
  const p=(x,y,color,fade=1,bloom=.08)=>{
   const px=x0+side*(x+.27*y),py=y0+y;
   return [px*c-py*s,px*s+py*c,...color,q.alpha*fade,bloom,0];
  };
  const put=(...pts)=>pts.forEach(v=>out.push(...v));
  const quad=(a,b,c,d)=>put(a,b,c,a,c,d);
  const d=.40*q.reach;
  const rows=[[-.48,0],[-.32,0],[-.16,0],[0,d],[.16,0],[.32,0],[.48,0]];
  for(let i=0;i<rows.length-1;i++){
   const get=([y,g])=>{
    const inner=-.30+g, band=.048+.038*g/.40;
    const rim=blend(middle,bright,.24+.50*q.contact*(g>0));
    const end=(Math.abs(y)>.47?.35:.92);
    return [p(inner,y,rim,.91*end,.17),p(inner+band,y,middle,.89*end,.1),p(.225,y,middle,.69*end,.049),p(.30,y,dark,.53*end,.025)];
   };
   const A=get(rows[i]),B=get(rows[i+1]);
   for(let n=0;n<3;n++)quad(A[n],A[n+1],B[n+1],B[n]);
  }
 }
 return new Float32Array(out);
}
