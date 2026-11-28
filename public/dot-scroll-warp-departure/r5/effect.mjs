import {VERSION,TYPE,LIFE,stateAt,admit} from './plan.mjs';
export {VERSION,TYPE,LIFE};
export const HEIGHT=1.70, CSS_PX_PER_M=64/HEIGHT;
const cap=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{const x=cap((t-a)/(b-a));return x*x*(3-2*x)};
const OWNER='fixture';
export function receipt(e,now=Date.now()){
 const o=admit(e,{owner:OWNER,now});
 return o?Object.freeze({...o,dx:0,tier:'departure',playerId:OWNER}):null;
}
export function fixtureReceipt(serial){
 return {id:'magic_dot_scroll_departure_'+serial,type:TYPE,x:0,y:0,at:Date.now(),
 radius:125,durationMs:0,playerId:OWNER,variant:'',targetX:5,targetY:2,targetId:''};
}
export function basis(){return {floor:[0,0],p:[.4,-.865],shoulder:[0,-1.14],e:[1,0]}}
export class Mesh {
  constructor(){this.data=new Float32Array(2048);this.length=0}
  vertex(p,c,a=1,k=0){const i=this.length;if(i+8>this.data.length){const next=new Float32Array(this.data.length*2);next.set(this.data);this.data=next}this.data.set([p[0],p[1],c[0],c[1],c[2],cap(a),k,0],i);this.length=i+8}
  tri(a,b,c,ca,cb=ca,cc=ca,aa=1,ab=aa,ac=aa,ka=0,kb=ka,kc=ka){this.vertex(a,ca,aa,ka);this.vertex(b,cb,ab,kb);this.vertex(c,cc,ac,kc)}
  quad(a,b,c,d,ca,cb=ca,cc=ca,cd=cb,aa=1,ab=aa,ac=aa,ad=ab,ka=0,kb=ka,kc=ka,kd=kb){this.tri(a,b,c,ca,cb,cc,aa,ab,ac,ka,kb,kc);this.tri(a,c,d,ca,cc,cd,aa,ac,ad,ka,kc,kd)}
  polygon(points, shade, light, normal, albedo=1){const c=points.map(p=>lit(shade,p,light,normal,albedo));for(let i=1;i<points.length-1;i++)this.tri(points[0],points[i],points[i+1],c[0],c[i],c[i+1])}
}
const warm=[.45,1,.69];
const add=(p,d,s)=>[p[0]+d[0]*s,p[1]+d[1]*s];
const mul=(c,q)=>[c[0]*q,c[1]*q,c[2]*q];
const unit=(x,y)=>{const d=Math.hypot(x,y)||1;return [x/d,y/d]};
const move=(arr,p)=>arr.map(q=>[q[0]+p[0],q[1]+p[1]]);
function lit(color,pos,lights,normal,albedo){
  if(!lights?.length)return color;
  let r=0;for(const light of lights){
    const u=light.p[0]-pos[0], v=light.p[1]-pos[1], d=u*u+v*v, reach=1-smooth(.04,.62,d);
    r+=light.lum*reach*Math.max(.055,(u*normal[0]+v*normal[1]+.18)/(Math.sqrt(d+.09)))/(1+14*d);
  }
  return color.map((c,i)=>c+warm[i]*r*albedo*(.14+.62*Math.sqrt(c)));
}
function disc(g,p,rx,ry,color,alpha=1,k=0,edge=.0,n=18){
  for(let i=0;i<n;i++){let a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;g.tri(p,[p[0]+rx*Math.cos(a),p[1]+ry*Math.sin(a)],[p[0]+rx*Math.cos(b),p[1]+ry*Math.sin(b)],color,color,color,alpha,alpha*edge,alpha*edge,k)}
}
function strip(g,a,b,w1,w2,col,light,base=.85) {
  const n=unit(a[1]-b[1],b[0]-a[0]);
  const l=add(a,n,w1),r=add(a,n,-w1),s=add(b,n,-w2),t=add(b,n,w2);
  g.polygon([l,r,s,t],col,light,n,base);
}
export function drawFixture(g,b){
  const p=b.floor;
  disc(g,[p[0]-.02,p[1]+.02],.51,.148,[.035,.05,.065],.22,0,0,24);
}
// A stationary optical afterprint. Its inner empty area opens, never a moved object.
// Human-scale residual mask: asymmetric shoulder/head cut and a split at the feet,
 // with no geometrically perfect aperture.
const skin=[[-.34,-.36],[-.21,-.46],[-.19,-.61],[-.085,-.73],
 [.11,-.72],[.18,-.62],[.171,-.45],[.37,-.34],[.32,.08],[.25,.63],
 [.05,.66],[.018,.37],[-.09,.65],[-.30,.62],[-.29,.17],[-.36,-.05]];
const anchor=[-.02,-.79];
export function absence(t,{reduced=false}={}){
 const r=smooth(124,490,t);
 return {hole:reduced?.70:mix(.035,.93,r),glow:smooth(45,124,t)*(1-smooth(384,654,t))};
}
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const s=stateAt(t,{reduced}),from=g.length;
 if(s.alpha<=0)return {p:anchor,contact:anchor,lum:0,stage:s.stage,triangles:0};
 const v=absence(t,{reduced});
 const matte=[.027,.06,.106], facing=[.11,.74,1.10], center=[.29,1.27,1.72], dusk=[.08,.28,.46];
 for(let i=0;i<skin.length;i++){
  const j=(i+1)%skin.length;
  const at=(n,r)=>{
   const [x,y]=skin[n], ellipse=Math.hypot(x/.34,y/.65)||1, loss=smooth(.49,.96,r);
   return [anchor[0]+mix(x/ellipse,x,loss)*r,anchor[1]+mix(y/ellipse,y,loss)*r];
  };
  const rate=n=>reduced?v.hole:Math.min(1,v.hole+smooth(.39,.94,v.hole)*[.32,.14,.53,.31,.56,.23,.52,.18,.41,.47,.32,.54,.38,.26,.45,.35][n]);
  const I=rate(i), J=rate(j);
  const ri=(x)=>I+(1-I)*x, rj=(x)=>J+(1-J)*x;
  const a=s.alpha, depth=v.glow;
  g.quad(at(i,I),at(j,J),at(j,rj(.28)),at(i,ri(.28)),matte,matte,center,center,0,0,a*.91,a*.91,0,0,.037,.037);
  g.quad(at(i,ri(.28)),at(j,rj(.28)),at(j,rj(.76)),at(i,ri(.76)),center,center,facing,facing,a*.91,a*.91,a*.74,a*.74,
   .037*depth,.037*depth,.026*depth,.026*depth);
  g.quad(at(i,ri(.76)),at(j,rj(.76)),at(j,1),at(i,1),facing,facing,dusk,dusk,a*.74,a*.74,a*.27,a*.27,.026*depth,.026*depth,0,0);

 }
 return {p:anchor,contact:anchor,lum:0,stage:s.stage,progress:v.hole,triangles:(g.length-from)/24,branches:[]};
}
export function fillSfx(rate){
 const data=new Float32Array(Math.round(rate*.48));let peak=0,seed=541,low=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const n=(seed>>>0)/2147483648-1;low+=.075*(n-low);
  const release=smooth(0,.042,t)*(1-smooth(.085,.27,t));
  const color=2*Math.PI*(233*t-64*t*t);
  data[i]=(.048*Math.sin(color)+.016*Math.sin(color*1.49)+.034*low)*release;
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
