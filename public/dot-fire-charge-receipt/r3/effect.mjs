import {VERSION,TYPE,VISUAL_MS,envelope,receipt as admit} from './plan.mjs';
export {VERSION,TYPE};
export const LIFE=VISUAL_MS, HEIGHT=1.70, CSS_PX_PER_M=64/HEIGHT;
const cap=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{const x=cap((t-a)/(b-a));return x*x*(3-2*x)};
const lerp=(a,b,t)=>a.map((x,i)=>mix(x,b[i],t));
const OWNER='fixture-recipient';
export function receipt(x, now=Date.now()) {
 const info=admit(x,{selfId:OWNER,serverNow:now});
 return info?Object.freeze({id:info.causeId,at:info.at,x:info.x,y:info.y,tier:x.variant,dx:0,playerId:OWNER}):null;
}
export function fixtureReceipt(serial,tier) {
 return {id:'magic_dot_fire_charge_'+serial,type:TYPE,x:0,y:0,at:Date.now(),radius:124,playerId:OWNER,variant:tier==='mystery-box'?tier:'vending'};
}
export function basis(_ev) {
 const floor=[0,0],p=[.40,-.865],shoulder=[0,-1.14],e=[1,0];
 return {floor,p,shoulder,e,map:(u,v)=>[p[0]+u,p[1]+v]};
}
export class Mesh {
  constructor(){this.data=new Float32Array(2048);this.length=0}
  vertex(p,c,a=1,k=0){const i=this.length;if(i+8>this.data.length){const next=new Float32Array(this.data.length*2);next.set(this.data);this.data=next}this.data.set([p[0],p[1],c[0],c[1],c[2],cap(a),k,0],i);this.length=i+8}
  tri(a,b,c,ca,cb=ca,cc=ca,aa=1,ab=aa,ac=aa,ka=0,kb=ka,kc=ka){this.vertex(a,ca,aa,ka);this.vertex(b,cb,ab,kb);this.vertex(c,cc,ac,kc)}
  quad(a,b,c,d,ca,cb=ca,cc=ca,cd=cb,aa=1,ab=aa,ac=aa,ad=ab,ka=0,kb=ka,kc=ka,kd=kb){this.tri(a,b,c,ca,cb,cc,aa,ab,ac,ka,kb,kc);this.tri(a,c,d,ca,cc,cd,aa,ac,ad,ka,kc,kd)}
  polygon(points, shade, light, normal, albedo=1){const c=points.map(p=>lit(shade,p,light,normal,albedo));for(let i=1;i<points.length-1;i++)this.tri(points[0],points[i],points[i+1],c[0],c[i],c[i+1])}
}
const ivory=[7.9,4.65,2.56], orange=[2.55,.63,.127], bronze=[.65,.14,.025];
const white=[13,8.3,4.85], warm=[1,.45,.12];
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
export function buildCharge(g,ev,t,{reduced=false}={}) {
 const b=basis(ev), q=envelope(t,{reduced}), from=g.length;
 if(!q.drawPetal)return {p:b.p,contact:b.p,lum:0,stage:q.phase,triangles:0};
 const turn=smooth(48,215,t), lay=smooth(161,326,t), shed=smooth(231,451,t), ash=smooth(393,635,t);
 const glow=q.heat*(1-.57*ash);
 const mouth=[.34,.071,.074], top=[2.68,.56,.13], deep=[.106,.050,.065], edge=[3.42,.53,.082];
 const at=(u,v)=>b.map(u,v-.027);
 let last=null;
 for(let i=0;i<=14;i++){
  const f=i/14,sin=Math.sin(Math.PI*f), c=Math.cos(Math.PI*f);
  // A single U-shaped skin conforming to the hand at its finish, without
  // an enclosed body, detached orb or a traveling spark.
  const extent=1-.58*lay, swing=reduced?.148:mix(.264,.156,turn);
  const u=.052+sin*swing*extent-.025*lay*(1-sin);
  const v=(-.215+.321*f)*(1-.10*lay)+.055*turn*sin*(1-lay);
  const width=(.042+.074*sin)*(1-.68*shed);
  const front=glow*Math.exp(-Math.pow((f-(1-q.lineProgress))/.33,2));
  const cooling=1-smooth(.50,.99,f)*ash;
  const x={in:at(u-width*.56,v+width*.089*c),lip:at(u,v),far:at(u+width*.69,v-width*.20*c),
   lipColor:lerp(top,edge,front*.73),alpha:q.darkBody*(.32+.60*sin)*cooling*(1-.72*ash)};
  if(last){
   g.quad(last.in,x.in,x.lip,last.lip,deep,deep,x.lipColor,last.lipColor,last.alpha*.64,x.alpha*.64,x.alpha,last.alpha,.015,.015,.48*glow,.48*glow);
   g.quad(last.lip,x.lip,x.far,last.far,last.lipColor,x.lipColor,mouth,mouth,last.alpha,x.alpha,x.alpha*.43*(1-shed),last.alpha*.43*(1-shed),.48*glow,.48*glow,.02,.02);
  }last=x;
 }
 return {p:at(.105,-.027),contact:b.p,lum:glow*.53,stage:q.phase,progress:lay,triangles:(g.length-from)/24};
}
export function fillSfx(rate,_variant,seed=1){
 const data=new Float32Array(Math.round(rate*.43));let q=seed|0,lp=0,peak=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate;q^=q<<13;q^=q>>>17;q^=q<<5;
  const n=(q>>>0)/2147483648-1;lp+=.18*(n-lp);
  const rub=smooth(.028,.057,t)*(1-smooth(.107,.163,t));
  const d=t-.164,end=1-smooth(.34,.429,t);
  const seat=d<0?0:smooth(0,.0025,d)*(.27*Math.sin(Math.PI*2*540*d)*Math.exp(-d*50)+.09*(n-lp)*Math.exp(-d*136));
  data[i]=end*(.12*rub*lp+seat);peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
