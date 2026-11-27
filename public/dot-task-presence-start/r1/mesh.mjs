import {stateAt} from './plan.mjs';
const steps=[0,.09,.21,.35,.50,.65,.79,.92,1], bands=[-1,-.61,-.22,0,.31,.65,1];
const sat=x=>Math.max(0,Math.min(1,x));
const m=(a,b,x)=>a+(b-a)*x;
const ink=[.26,.18,.10], mid=[.90,.53,.20], high=[1.34,1.08,.58];
export function buildPresence(e,t,opt){
 const q=stateAt(t,opt);if(!q.alpha||!e)return new Float32Array();
 const out=[];
 function point(u,v){
  const body=Math.sin(u*Math.PI), sweep=Math.exp(-((u-q.reach*.90)**2)/.024),
    x=.27+(u*.73)*(opt?.reduced?1:m(.36,1,q.reach)),
    y=.49-.19*u+.055*body+v*(.025+.092*body);
  const rib=sat(1-Math.abs(v-.03)*1.4), feather=sat((1-Math.abs(v))*.95);
  const col=ink.map((ci,k)=>m(m(ci,mid[k],(.27+.5*rib)*body),high[k],q.contact*sweep*rib*.77));
  return [x,y,...col,q.alpha*body*feather*(.48+.4*rib),.11+.53*body*rib*(.4+.6*sweep),0];
 }
 for(let i=0;i<steps.length-1;i++)for(let j=0;j<bands.length-1;j++){
  const [u,v]=[steps[i],steps[i+1]], [x,y]=[bands[j],bands[j+1]];
  const a=point(u,x),b=point(v,x),c=point(v,y),d=point(u,y);out.push(...a,...b,...c,...a,...c,...d)
 }
 return new Float32Array(out);
}
