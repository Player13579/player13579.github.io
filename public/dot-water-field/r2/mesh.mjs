import {stateAt} from './plan.mjs';
const TAU=Math.PI*2;
const angles=32, rings=[0,.21,.42,.62,.80,.94,1];
const mix=(a,b,t)=>a+(b-a)*t;
const sat=x=>Math.max(0,Math.min(1,x));
const gauss=(x,r)=>Math.exp(-((x/r)**2));
const color=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
const low=[.025,.13,.22], mid=[.045,.39,.47], sky=[.32,.96,1.08];
export function buildWaterSheet(field,t,opt={}){
 const q=stateAt(field,t,opt);
 if(!q.opacity||!q.front||!Number.isFinite(field?.radius)||field.radius<40)return new Float32Array();
 const out=[], R=field.radius;
 // Visual flow direction is fixed to the scene plane, never to the thrower.
 const cs=.912, sn=-.410;
 const points=(side,i,j)=>{
  const a=(j%angles)/angles*TAU, u=rings[i], c=Math.cos(a),s=Math.sin(a);
  const rear=side<0, skew=rear?.11:-.15, lag=rear?1:mix(.25,1,q.front);
  const stretch=q.front*lag;
  const x=(rear?-.31:.37)*q.front+c*u*(rear?.65:.50)*stretch;
  const y=skew*q.front+s*u*(rear?.67:.51)*stretch+.16*c*u*stretch;
  const rr=Math.hypot(x,y), fit=rr>.975?.975/rr:1;
  const border=sat((1-u)/.13);
  const well=sat((1-Math.abs(y-.17-.20*x))*.91);
  const tongue=gauss(u-mix(.25,.79,q.front),.17)*q.caustic;
  const reflection=gauss(y-(rear?.06:-.05)-.21*x,.16)*sat((.91-u)/.25);
  const lip=gauss(u-.87,.076)*sat(.25+.36*c-.45*s);
  const shade=gauss(u-.82,.12)*sat(.17+.57*s-.28*c);
  const body=sat(.24+well*.26+reflection*.32);
  const rgb=color(color(low,mid,body*(1-.46*shade)),sky,sat(.60*reflection+.62*tongue+.61*lip));
  const opacity=q.opacity*border*(.28+.23*body+.17*tongue+.18*lip)*(rear?1:.84);
  const emit=q.opacity*border*(.05+.16*body+.34*tongue+.36*reflection+.17*lip);
  return [(cs*x-sn*y)*R*fit,(sn*x+cs*y)*R*fit,...rgb,sat(opacity),emit,0];
 };
 for(const side of [-1,1])for(let i=0;i<angles;i++){
  const p=(j,k)=>points(side,j,k);
  out.push(...p(0,0),...p(1,i),...p(1,i+1));
  for(let j=1;j<rings.length-1;j++)out.push(...p(j,i),...p(j+1,i),...p(j+1,i+1),...p(j,i),...p(j+1,i+1),...p(j,i+1));
 }
 return new Float32Array(out);
}
