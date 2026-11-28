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
// One reversible optical impression in the tabletop; no simulated input or new object.
// UV support stays inside the existing tabletop. The same shallow profile, lit to
// different degrees, is used every time regardless of network coordinates or luck payload.
const U=[.26,.31,.36,.40,.44,.49,.54,.60,.67,.73,.78,.82,.86,.90,.94,.96];
const V=[.12,.19,.25,.31,.36,.41,.47,.53,.59,.64,.68,.72,.76,.80,.84,.90];
export function section(u,v,q){
 const y=(v-.51)/.33, x=(u-.625)/.298+.16*y;
 const d=Math.sqrt(x**4+y*y);
 const bounded=(1-smooth(.82,1.08,d));
 const shadow=(1-smooth(-.66,-.02,y))*.71+.19;
 const soil=bounded*(.60+.32*shadow);
 const border=(1-smooth(.42,.99,Math.abs(x)))*(1-smooth(.86,1.12,d));
 const front=.47-.66*(1-q.settle)+.12*x*x+.11*x;
 const nearPeak=Math.exp(-(((y-front)/.285)**2));
 const chamfer=Math.exp(-(((y-(.76+.05*x))/.22)**2));
 const inner=Math.exp(-(((y-.14)/.74)**2));
 const intensity=border*(.56*nearPeak+.33*chamfer+.18*inner)*(.64+.36*q.pulse);
 const surround=bounded*.42*(.12+.88*smooth(-.38,.22,y))*inner;
 const dark=[.052,.049,.046], facing=[1.03,1.17,1.16];
 const fraction=cap(1.41*intensity+.30*surround);
 const color=dark.map((a,i)=>mix(a,facing[i],fraction));
 return {a:q.alpha*cap(soil+.39*intensity), color, k:q.alpha*.30*intensity, intensity, shadow:shadow*bounded};
}
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),p=surface(.625,.53),from=g.length;
 if(q.alpha<=0)return {p,contact:p,lum:0,stage:q.phase,triangles:0};
 const samples=U.map(u=>V.map(v=>({p:surface(u,v),...section(u,v,q)})));
 let peak=0;
 for(let i=0;i<U.length-1;i++)for(let j=0;j<V.length-1;j++){
  const four=[samples[i][j],samples[i+1][j],samples[i+1][j+1],samples[i][j+1]];
  if(!four.some(x=>x.a>0))continue;
  peak=Math.max(peak,...four.map(x=>x.k));
  g.quad(...four.map(x=>x.p),...four.map(x=>x.color),...four.map(x=>x.a),...four.map(x=>x.k));
 }
 return {p,contact:p,lum:peak,stage:q.phase,progress:q.settle,triangles:(g.length-from)/24,branches:[]};
}
// Clean, localized surface response: broad low press and filtered contact texture.
// No communication chime, repetition, additional output or sound tail after 500ms.
export function fillSfx(rate){
 const data=new Float32Array(Math.round(rate*.50));let peak=0,seed=0x1c9a80cf,slow=0,mid=0;
 const tau=Math.PI*2;
 for(let i=0;i<data.length;i++){
  const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const raw=(seed/2147483648)-1;
  slow+=(raw-slow)*(1-Math.exp(-tau*270/rate));mid+=(raw-mid)*(1-Math.exp(-tau*1240/rate));
  const heard=smooth(.005,.035,t)*Math.exp(-6.2*t)*(1-smooth(.24,.48,t));
  const thumb=smooth(.004,.016,t)*(1-smooth(.026,.097,t));
  data[i]=heard*(.042*Math.sin(tau*(174*t-40*t*t))+.013*Math.sin(tau*(358*t-76*t*t)))+.045*thumb*(mid-slow);
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
