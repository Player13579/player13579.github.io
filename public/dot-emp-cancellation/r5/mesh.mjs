import {stateAt} from './plan.mjs';
const edge=[.105,.37,.49], body=[.19,.61,.68], apex=[.74,1.47,1.60];
export function buildEnds(e,t,o={}){
 const q=stateAt(t,o);if(!q.alpha||!Number.isFinite(e?.axis))return new Float32Array();
 const a=e.axis, c=Math.cos(a),s=Math.sin(a),out=[];
 const fall=.40*(o.reduced?.49:q.reach)-.18;
 const map=(x,y,rgb,fade,bloom=.04)=>[c*x-s*y,s*x+c*y+fall,...rgb,q.alpha*fade,bloom,0];
 const put=(...p)=>p.forEach(v=>out.push(...v));
 const quad=(a,b,c,d)=>put(a,b,c,a,c,d);
 const mix=(a,b,x)=>a.map((v,i)=>v+(b[i]-v)*x);
 // Same local motion is added in screen space to every point: neither panel moves relative to the other.
 for(const side of [-1,1]){
  const P=(x,y,col,f,k)=>map(side*(.53+x),side*.04+y,col,f,k);
  const ridge=mix(body,apex,.22+.42*q.contact);
  const A=P(-.37,-.03,body,.82,.073), B=P(-.24,-.235,edge,.51,.015), C=P(.38,-.155,body,.80,.065);
  const D=P(.40,.105,edge,.62,.019), E=P(-.27,.16,body,.65,.04), F=P(-.16,-.01,ridge,.94,.12), G=P(.29,-.025,ridge,.89,.11);
  put(A,B,F,C,D,G,E,A,F);
  quad(B,C,G,F);
  quad(F,G,D,E);
 }
 return new Float32Array(out);
}
