import {stateAt} from './plan.mjs';
const N=64, rings=[0,.075,.145,.215,.285,.350,.417,.488,.558,.629,.700,.769,.837,.899,.951,1],TAU=Math.PI*2;
const limit=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const h=limit((x-a)/(b-a));return h*h*(3-2*h)};
const g=(x,w)=>Math.exp(-((x/w)**2));
const mix=(a,b,t)=>a+(b-a)*t;
// R3's exact continuous shoreline envelope. R4 changes sampling density
// and the material only, never the geometric law or canonical field bounds. R5 shares the exact R4 samples.
const nodes=rings.flatMap(u=>Array.from({length:N},(_,k)=>{
 const a=k*TAU/N,c=Math.cos(a),n=Math.sin(a),bound=.83+.067*Math.cos(3*a+.62)+.036*Math.cos(5*a+1.02);
 const x=bound*u*c,y=bound*u*n*.77;
 const shade=limit(1.16-Math.hypot((x-.105)*1.49,(y+.082)*1.45));
 const edge=limit((1-u)/.062);
 return [.942*x+.334*y,-.334*x+.942*y,x,y,shade,edge,c,n,u];
}));
const triangles=[];
const idx=(j,k)=>j*N+k%N;
for(let i=0;i<N;i++){
 triangles.push(0,idx(1,i),idx(1,i+1));
 for(let j=1;j<rings.length-1;j++){
  const a=idx(j,i),b=idx(j+1,i),c=idx(j+1,i+1),d=idx(j,i+1);
  triangles.push(a,b,c,a,c,d);
 }
}
const deep=[.021,.133,.183], shelf=[.086,.343,.399], light=[.53,.98,1.05], inner=[.361,.713,.742];
function material(data,settled,transient,reduced){
 const [,,x,y,shade,extent,,,u]=data;
 const roll=reduced?0:transient*Math.cos((1.42*settled+.058)*Math.PI);
 const bowlX=x-.06-roll*.16,bowlY=y+.086+roll*.085;
 const bowl=g(bowlX+.13*bowlY,.369)*g(bowlY-.21*bowlX,.282);
 const lateral=g(x+.333-.31*y,.29)*g(y-.085,.28);
 const wide=g((x-.22+.18*y+roll*.10),.33)*g(y-.141+roll*.048,.33);
 const split=smooth(.14,.47,u);
 const fresnel=limit((wide*.51+lateral*.22)*(1-.55*bowl)+(.1+.11*transient)*shade);
 const lit=limit(.51*fresnel+.42*wide+.16*transient*split);
 const base=deep.map((c,k)=>mix(c,shelf[k],limit(.68*(1-bowl)+.37*shade)));
 const coat=light.map((c,k)=>mix(inner[k],c,lit));
 const transmitted=base.map((c,k)=>mix(c,coat[k],lit*.82));
 const plane=extent*limit(.83+.14*shade+.06*lit);
 const refract=extent*(.37+.51*bowl+roll*(.93+.37*lateral));
 const observation=extent*lit*(.08+.14*transient);
 return [...transmitted,plane,observation,refract];
}
const stable=nodes.map(n=>material(n,1,0,true));
export const VERTEX_COUNT=triangles.length;
export function buildWaterSheet(f,t,opt={}){
 const q=stateAt(f,t,opt);
 if(!q.opacity||!Number.isFinite(f?.radius)||f.radius<40)return new Float32Array();
 const calc=opt.reduced||q.settled===1&&q.caustic===0?stable:nodes.map(n=>material(n,q.settled,q.caustic,false));
 const out=new Float32Array(VERTEX_COUNT*8);let o=0;
 for(const i of triangles){
  const d=nodes[i],v=calc[i];
  out[o++]=d[0]*f.radius;
  out[o++]=d[1]*f.radius;
  out[o++]=v[0];out[o++]=v[1];out[o++]=v[2];
  out[o++]=v[3]*q.opacity;out[o++]=v[4]*q.opacity;out[o++]=v[5];
 }
 return out;
}
