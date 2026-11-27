import {VERSION,TYPE,LIFE,stateAt,admit} from './plan.mjs';
export {VERSION,TYPE,LIFE};
export const HEIGHT=1.70, CSS_PX_PER_M=64/HEIGHT;
const cap=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{const x=cap((t-a)/(b-a));return x*x*(3-2*x)};
const OWNER='fixture';
export function receipt(e,now=Date.now()){
 const o=admit(e,{owner:OWNER,now});
 return o?Object.freeze({...o,dx:0,tier:'bind',playerId:OWNER}):null;
}
export function fixtureReceipt(serial){
 return {id:'magic_dot_fighter_ec_bind_'+serial,type:TYPE,x:0,y:0,at:Date.now(),
 radius:92,durationMs:620,playerId:OWNER,variant:'throw:remaining-ec-0',targetX:10,targetY:0,targetId:''};
}
export function basis(){return {floor:[0,0],p:[.4,-.865],shoulder:[0,-1.14],e:[1,0]}}
export class Mesh {
  constructor(){this.data=new Float32Array(2048);this.length=0}
  vertex(p,c,a=1,k=0){const i=this.length;if(i+8>this.data.length){const next=new Float32Array(this.data.length*2);next.set(this.data);this.data=next}this.data.set([p[0],p[1],c[0],c[1],c[2],cap(a),k,0],i);this.length=i+8}
  tri(a,b,c,ca,cb=ca,cc=ca,aa=1,ab=aa,ac=aa,ka=0,kb=ka,kc=ka){this.vertex(a,ca,aa,ka);this.vertex(b,cb,ab,kb);this.vertex(c,cc,ac,kc)}
  quad(a,b,c,d,ca,cb=ca,cc=ca,cd=cb,aa=1,ab=aa,ac=aa,ad=ab,ka=0,kb=ka,kc=ka,kd=kb){this.tri(a,b,c,ca,cb,cc,aa,ab,ac,ka,kb,kc);this.tri(a,c,d,ca,cc,cd,aa,ac,ad,ka,kc,kd)}
  polygon(points, shade, light, normal, albedo=1){const c=points.map(p=>lit(shade,p,light,normal,albedo));for(let i=1;i<points.length-1;i++)this.tri(points[0],points[i],points[i+1],c[0],c[i],c[i+1])}
}
const warm=[.19,.56,1.0];
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
export function drawFixture(g,b,lights){
  const p=b.floor;
  disc(g,[p[0]-.04,p[1]-.015],.52,.16,[.006,.008,.011],.53,0,0,28);
  const face=b.e[0]<0?-1:1;
  const part=(pts,col,no,al=.975)=>g.polygon(move(pts.map(([x,y])=>[face*x,y]),p),col,lights,[face*no[0],no[1]],al);
  part([[-.29,-.65],[-.02,-.66],[-.10,-.27],[-.20,-.05],[-.48,-.01],[-.43,-.12],[-.33,-.22]],[.04,.062,.086],[-.4,.6]);
  part([[-.025,-.64],[.18,-.68],[.257,-.37],[.36,-.095],[.28,-.015],[.10,-.04],[.085,-.19],[-.064,-.37]],[.052,.076,.108],[.48,.1]);
  part([[-.41,-.12],[-.29,-.1],[-.22,-.044],[-.25,0],[-.49,0],[-.51,-.044]],[.062,.088,.115],[.25,-.6]);
  part([[.14,-.133],[.27,-.13],[.38,-.062],[.44,-.044],[.45,0],[.13,0]],[.074,.102,.133],[.45,-.4]);
  part([[-.28,-1.17],[-.43,-1.08],[-.41,-.845],[-.21,-.72],[-.16,-.92],[-.22,-1.09]],[.041,.071,.099],[-.72,-.11]);
  part([[-.205,-1.24],[.052,-1.28],[.258,-1.15],[.215,-.91],[.128,-.68],[-.15,-.67],[-.25,-.87],[-.33,-1.08]],[.06,.087,.121],[.24,-.4]);
  part([[-.24,-1.15],[.054,-1.22],[.20,-1.155],[.145,-1.005],[-.079,-.96],[-.254,-1.01]],[.114,.153,.185],[.58,-.22]);
  part([[-.12,-.99],[.138,-1.012],[.121,-.782],[-.124,-.752],[-.22,-.829]],[.077,.111,.14],[.45,.21]);
  part([[-.201,-.762],[.172,-.782],[.181,-.682],[.08,-.63],[-.093,-.64],[-.21,-.689]],[.163,.101,.062],[.36,-.43],.46);
  part([[-.196,-1.40],[-.176,-1.58],[-.059,-1.70],[.128,-1.68],[.21,-1.56],[.217,-1.405],[.112,-1.307],[-.058,-1.32]],[.085,.112,.144],[.46,-.55]);
  part([[-.175,-1.577],[-.053,-1.70],[.118,-1.68],[.174,-1.583],[-.067,-1.532]],[.16,.192,.224],[.48,-.53]);
  part([[-.068,-1.532],[.182,-1.583],[.213,-1.506],[.169,-1.462],[-.063,-1.473]],[.022,.041,.06],[.45,.2]);
  part([[.08,-1.525],[.181,-1.544],[.187,-1.516],[.089,-1.491]],[.354,.264,.18],[.44,-.5]);
  // One proximal straight fixture, not a player animation: fork position follows receipt bearing.
  const elbow=add(b.shoulder,[.24,.29],1), glove=b.p;
  strip(g,add(b.shoulder,b.e,.09),elbow,.122,.100,[.125,.154,.182],lights,.72);
  strip(g,elbow,glove,.091,.064,[.083,.12,.154],lights,.71);
  disc(g,glove,.080,.075,lit([.128,.157,.181],glove,lights,b.e,1),1,0,1,8);
}
export function buildReceipt(g,ev,t,{reduced=false}={}){
 const life=ev.liveMs??LIFE,q=stateAt(t,life,{reduced}),from=g.length,p=basis().p;
 if(q.alpha<=0)return {p,contact:p,lum:0,stage:q.phase,triangles:0};
 const phase=t/life, shut=reduced?1:smooth(.135,.59,phase);
 const dark=[.064,.043,.112], violet=[.48,.29,1.42], amber=[1.82,.86,.25], glint=[3.8,2.4,1.16];
 const contact=[p[0]+.075,p[1]-.012];
 const points=(w,side)=>{
  const r=Math.sin(w*Math.PI), spread=(1-shut)*.26+.021;
  return [contact[0]+w*(.44-.14*shut)+.07*side*r,contact[1]+side*(spread+r*(.31-.19*shut))-.11*w];
 };
 const gain=q.alpha*(1-smooth(.68,.96,phase)*.62);
 for(const s of [-1,1]){
  const wave=reduced?1:smooth(.04,.33,phase);
  for(let i=0;i<22;i++){
   const u=i/22,v=(i+1)/22;
   const A=points(u,s),B=points(v,s);
   const root=(h,pt)=>[pt[0]-.05*Math.sin(Math.PI*h),contact[1]-.11*h];
   const C=root(v,B),D=root(u,A);
   const ae=gain*wave*Math.sin(Math.PI*u)**.59,be=gain*wave*Math.sin(Math.PI*v)**.59;
   g.quad(A,B,C,D,dark,dark,s<0?violet:amber,s<0?violet:amber,0,0,be*.76,ae*.76,0,0,.16,.16);
   const edge=(h,f)=>[h[0]+.013,h[1]-s*f];
   g.quad(A,B,edge(B,.038),edge(A,.038),violet,violet,glint,glint,ae*.22,be*.22,be*.55,ae*.55,.05,.05,.18,.18);
  }
 }
 const overlap=q.alpha*smooth(.36,.58,phase)*(1-smooth(.72,.97,phase));
 for(let i=0;i<12;i++){
  const a=i/12,b=(i+1)/12;
  const k=u=>[contact[0]+u*.30,contact[1]-.11*u];
  const P=k(a),Q=k(b),w=.031*(.35+.65*Math.sin(Math.PI*b));
  g.quad(P,Q,[Q[0],Q[1]+w],[P[0],P[1]+w],glint,glint,amber,violet,overlap*.55,overlap*.58,0,0,.20,.20,0,0);
 }
 return {p,contact,lum:overlap*.43,stage:q.phase,progress:shut,triangles:(g.length-from)/24,branches:[{p:contact,lum:overlap*.39}]};
}
export function fillSfx(rate,liveMs=LIFE){
 const duration=Math.min(.35,liveMs/1000-.03);
 const data=new Float32Array(Math.round(rate*duration));let peak=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate, h=t-.112;
  const a=smooth(0,.024,t)*(1-smooth(.08,.14,t));
  const b=h>0?smooth(0,.018,h)*Math.exp(-16*h):0;
  data[i]=(.027*a*Math.sin(2*Math.PI*352*t)+.016*a*Math.sin(2*Math.PI*415*t)+b*(.042*Math.sin(2*Math.PI*475*h)+.020*Math.sin(2*Math.PI*708*h)))*(1-smooth(duration-.05,duration-.002,t));
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
