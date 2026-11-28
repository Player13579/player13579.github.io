import {VERSION,TYPE,LIFE,DESK,stateAt,admit} from './plan.mjs';
export {VERSION,TYPE,LIFE};
export const HEIGHT=1.70, CSS_PX_PER_M=64/HEIGHT;
const cap=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{const x=cap((t-a)/(b-a));return x*x*(3-2*x)};
const OWNER='fixture';
export function receipt(e,now=Date.now()){
 const o=admit(e,{owner:OWNER,now});
 return o?Object.freeze({...o,dx:0,tier:'receipt',playerId:OWNER}):null;
}
export function fixtureReceipt(serial){
 const uid = Math.max(0,Number(serial)||0).toString(16).padStart(12,'0');
 return {id:'magic_'+uid,type:TYPE,at:Date.now(),radius:100,durationMs:0,playerId:OWNER,
   objectId:DESK,objectCausalId:'map-object:'+DESK+':object_use_'+uid,effectKind:'luckBoost',
   variant:'',targetX:null,targetY:null,targetId:''};
}
export function basis(){return {floor:[0,0],p:[0,-.63],shoulder:[0,-1.04],e:[1,0]}}
export class Mesh {
  constructor(){this.data=new Float32Array(2048);this.length=0}
  vertex(p,c,a=1,k=0){const i=this.length;if(i+8>this.data.length){const next=new Float32Array(this.data.length*2);next.set(this.data);this.data=next}this.data.set([p[0],p[1],c[0],c[1],c[2],cap(a),k,0],i);this.length=i+8}
  tri(a,b,c,ca,cb=ca,cc=ca,aa=1,ab=aa,ac=aa,ka=0,kb=ka,kc=ka){this.vertex(a,ca,aa,ka);this.vertex(b,cb,ab,kb);this.vertex(c,cc,ac,kc)}
  quad(a,b,c,d,ca,cb=ca,cc=ca,cd=cb,aa=1,ab=aa,ac=aa,ad=ab,ka=0,kb=ka,kc=ka,kd=kb){this.tri(a,b,c,ca,cb,cc,aa,ab,ac,ka,kb,kc);this.tri(a,c,d,ca,cc,cd,aa,ac,ad,ka,kc,kd)}
  
}
// One fixed anonymous tabletop in an oblique 2D gallery projection.
const surface=(u,v)=>[-.61+1.22*u+.23*v,-.75+.28*v-.105*u];
export function drawFixture(g){
 const a=surface(0,0), b=surface(1,0), c=surface(1,1), d=surface(0,1);
 const edge=([x,y])=>[x,y+.10], foot=([x,y])=>[x,y+.32];
 const upper=[.15,.123,.106], near=[.222,.177,.135], side=[.071,.062,.062];
 g.quad(d,c,edge(c),edge(d),near,near,side,side,1,1,1,1);
 g.quad(c,b,edge(b),edge(c),side,side,side,side,1,1,1,1);
 g.quad(edge(d),edge(surface(.09,1)),foot(surface(.09,1)),foot(d),side);
 g.quad(edge(surface(.90,1)),edge(c),foot(c),foot(surface(.90,1)),side);
 g.quad(a,b,c,d,upper,upper,near,near,1,1,1,1);
 g.quad(surface(.04,.90),surface(.96,.90),surface(.96,.94),surface(.04,.94),near);
}
// A finite elastic change of the desktop's reflectance, not an added button or raised object.
// Three adjacent grain normals share an optical sheet and one time/deformation profile.
const X=[-1,-.94,-.84,-.72,-.58,-.44,-.33,-.25,-.17,-.09,-.02,.04,.11,.20,.31,.44,.58,.72,.83,.93,1];
const W=[-.23,-.193,-.153,-.113,-.095,-.065,-.035,-.008,.018,.040,.067,.102,.122,.15,.183,.215,.235];
export function grainAt(x,w,q){
 const taper=1-smooth(.66,1,Math.abs(x));
 const fold=1-smooth(.012,.565,Math.abs(x+.105));
 const recovery=1-smooth(.01,.62,Math.abs(x-.29));
 const axis=.503+.125*x+q.settle*(-.225*fold+.057*recovery);
 const y=w*(1-.15*Math.max(0,q.settle)*fold), v=axis+y;
 const f=(center,width)=>Math.exp(-(((w-center)/width)**2));
 const alcove=1-smooth(.11,.232,Math.abs(w));
 const paperless=1-smooth(.72,1,Math.abs(x+.03));
 const red=f(-.116,.058)*.42+(f(.033,.052)*.73+f(.135,.034)*.53)*
       (.83+.17*fold);
 const bright=cap(red+.16*alcove)*(.68+.32*q.pulse);
 const valleys=f(-.028,.042)*.75+f(.083,.023)*.54;
 const shade=[.108,.106,.104], plane=[.22,.25,.235], rose=[1.02,.84,.66];
 const body=plane.map((c,i)=>mix(c,shade[i],cap(valleys)));
 const color=body.map((c,i)=>mix(c,rose[i],bright));
 return {u:.446+.306*x,v,color,a:q.alpha*taper*alcove*(.68+.29*paperless),k:.27*q.alpha*taper*bright*alcove,bright,taper,fold,axis};
}
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),p=surface(.44,.49),before=g.length;
 if(q.alpha<=0)return {p,contact:p,lum:0,stage:q.phase,triangles:0};
 const knots=X.map(x=>W.map(w=>{const q3=grainAt(x,w,q);return {p:surface(q3.u,q3.v),...q3};}));
 let peak=0;
 for(let i=0;i<X.length-1;i++)for(let j=0;j<W.length-1;j++){
  const four=[knots[i][j],knots[i+1][j],knots[i+1][j+1],knots[i][j+1]];
  if(!four.some(x=>x.a>0))continue;
  peak=Math.max(peak,...four.map(x=>x.k));
  g.quad(...four.map(x=>x.p),...four.map(x=>x.color),...four.map(x=>x.a),...four.map(x=>x.k));
 }
 return {p,contact:p,lum:peak,stage:q.phase,progress:q.settle,triangles:(g.length-before)/24,branches:[]};
}
// A short dry flex of the same surface. The noise band has neither a bright notification
// chirp nor a repeating staccato; silence after the reserved half-second is exact.
export function fillSfx(rate){
 const data=new Float32Array(Math.round(rate*.50));let peak=0,seed=0x71bb693a,lo=0,mi=0;
 const twopi=Math.PI*2, kLo=1-Math.exp(-twopi*222/rate),kMi=1-Math.exp(-twopi*911/rate);
 for(let i=0;i<data.length;i++){
  const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const x=(seed/2147483648)-1;
  lo+=(x-lo)*kLo;mi+=(x-mi)*kMi;
  const surface=smooth(.012,.054,t)*Math.exp(-7.5*t)*(1-smooth(.22,.435,t));
  const tactile=smooth(.026,.081,t)*(1-smooth(.104,.217,t));
  data[i]=surface*(.050*Math.sin(twopi*(138*t-16*t*t))+.011*Math.sin(twopi*(217*t+18*t*t)))+.059*tactile*(mi-lo);
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
