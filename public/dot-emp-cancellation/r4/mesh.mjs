import {stateAt} from './plan.mjs';
const shade=[.115,.32,.44], base=[.15,.64,.75], core=[.63,1.55,1.72];
export function buildEnds(e,t,o={}){
 const q=stateAt(t,o);if(!q.alpha||!Number.isFinite(e?.axis))return new Float32Array();
 const a=e.axis,c=Math.cos(a),s=Math.sin(a),out=[];
 const phase=Math.PI*.50*(o.reduced?.59:q.reach);
 const w=.88*Math.cos(phase)+.075*Math.sin(phase);
 const mix=(a,b,v)=>a.map((x,j)=>x+(b[j]-x)*v);
 // Opposed hand-independent notices, each rotates about its own fixed long axis.
 for(const k of [-1,1]){
  const x0=k*.57,y0=k*.09;
  const v=(x,y,rgb,fade,bloom)=>{
   const xx=x0+x*w+k*.14*y,yy=y0+y+k*.095*x*Math.sin(phase);
   return [xx*c-yy*s,xx*s+yy*c,...rgb,q.alpha*fade,bloom,0];
  };
  const put=(...p)=>p.forEach(z=>out.push(...z));
  const mixFront=mix(base,core,.13+.49*q.contact);
  const A=v(0,-.46,base,.78,.04), B=v(k*.41,-.04,base,.81,.048), C=v(0,.44,base,.72,.047), D=v(k*-.41,.037,shade,.67,.043);
  const N=v(k*.075,0,mixFront,.94,.09+.16*q.contact), S=v(k*.015,0,shade,.89,.042);
  put(A,B,N,B,C,N,C,D,S,D,A,S,A,N,S,C,S,N);
 }
 return new Float32Array(out);
}
