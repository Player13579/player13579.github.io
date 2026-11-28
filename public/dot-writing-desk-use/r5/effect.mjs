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
// The existing top and front use one bend in the surface at v=1.
// Carry the same longitudinal footprint across that bend. No new plane is shown
// free of the tabletop, and the lips/feet/outline are unchanged.
const U=[.08,.12,.17,.22,.27,.32,.38,.44,.50,.56,.62,.68,.73,.78,.83,.89];
const TOP=[.55,.60,.65,.70,.76,.82,.88,.93,.97,1];
const FRONT=[0,.08,.17,.26,.36,.46,.56,.64,.72,.80,.88,.95,1];
const face=(u,z)=>{const p=surface(u,1);return [p[0],p[1]+z*.10]};
const tint=(a,b,f)=>a.map((x,i)=>mix(x,b[i],f));
const width=(u,w=.36)=>1-smooth(.54,1,Math.abs((u-.477)/w));
export function response(u,t,q,front){
 const rise=(.90+.10*q.pulse), across=width(u,front?.37:.35);
 if(front){
  const envelope=(1-smooth(.22+.56*q.settle,.38+.60*q.settle,t))*(1-smooth(.85,1,t));
  const on=q.frontAlpha*across*envelope;
  const middle=.14+.45*q.settle+.08*(u-.5);
  const reflected=.38+.55*Math.exp(-(((t-middle)/.37)**2));
  const fine=(1-smooth(.16,.48,t))*.13*q.pulse;
  const v=cap(rise*reflected+fine);
  return {a:q.alpha*on*.99,color:tint([.33,.21,.15],[1.28,.91,.54],v),k:q.alpha*on*(.11+.32*v)};
 }
 const toward=smooth(.56,.94,t);
 const settle=1-.63*(q.settle**2);
 const on=across*(toward**.80)*q.capAlpha;
 const warm=tint([.37,.27,.20],[1.08,.92,.73],(toward*.67+.32)*rise);
 return {a:q.alpha*on*.84,color:warm,k:q.alpha*on*(.075+.21*toward)*settle};
}
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),p=face(.477,.34),before=g.length;
 if(q.alpha<=0)return {p,contact:p,lum:0,stage:q.phase,triangles:0};
 let peak=0;
 for(const [rows,pick,front] of [[TOP,surface,false],[FRONT,face,true]]){
  const knots=U.map(u=>rows.map(v=>({p:pick(u,v),...response(u,v,q,front)})));
  for(let i=0;i<U.length-1;i++)for(let j=0;j<rows.length-1;j++){
   const f=[knots[i][j],knots[i+1][j],knots[i+1][j+1],knots[i][j+1]];
   if(!f.some(x=>x.a>0))continue;
   peak=Math.max(peak,...f.map(x=>x.k));
   g.quad(...f.map(x=>x.p),...f.map(x=>x.color),...f.map(x=>x.a),...f.map(x=>x.k));
  }
 }
 return {p,contact:p,lum:peak,stage:q.phase,progress:q.settle,triangles:(g.length-before)/24,branches:[]};
}
// One short material contact, with a broad, quickly damped hollow apronal resonance.
// Mono and event-serial; no communication pulse or second separate notification.
export function fillSfx(rate){
 const data=new Float32Array(Math.round(rate*.50));let peak=0,seed=0xad8a5513,low=0,band=0;
 const w=Math.PI*2, k0=1-Math.exp(-w*247/rate),k1=1-Math.exp(-w*1350/rate);
 for(let i=0;i<data.length;i++){
  const t=i/rate;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const n=(seed/2147483648)-1;low+=(n-low)*k0;band+=(n-band)*k1;
  const inWood=smooth(.007,.046,t)*Math.exp(-4.8*t)*(1-smooth(.205,.453,t));
  const brush=smooth(.017,.048,t)*(1-smooth(.083,.163,t));
  data[i]=inWood*(.043*Math.sin(w*(119*t-11*t*t))+.018*Math.sin(w*(307*t-43*t*t)))+.054*brush*(band-low);
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
