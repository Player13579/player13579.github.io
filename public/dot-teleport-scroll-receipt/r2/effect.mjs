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
 return {id:'magic_dot_teleport_scroll_'+serial,type:TYPE,x:0,y:0,at:Date.now(),radius:124,playerId:OWNER,variant:tier==='mystery-box'?tier:'vending'};
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
const white=[13,8.3,4.85], warm=[.26,.72,1.0];
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
export function buildScroll(g,ev,t,{reduced=false}={}) {
 const b=basis(ev), q=envelope(t,{reduced}), from=g.length;
 if(!q.drawPetal)return {p:b.p,contact:b.p,lum:0,stage:q.phase,triangles:0};
 const gather=smooth(183,507,t), late=smooth(455,772,t);
 // Orthographic corners of one accordion-folded route diagram; each panel
 // shares both hinge vertices with the next. No real map or destination.
 const paint=[[.070,.181,.199],[.055,.282,.288],[.065,.219,.238],[.059,.149,.201]];
 const glow=[.34,1.26,1.51], dim=[.12,.42,.52], scan=[1.02,1.63,1.67];
 const glowA=q.heat;
 const section=[];
 for(let i=0;i<=4;i++){
   const x=i/4, pucker=i%2===1?1:0;
   const w=mix(.57,.238,gather)*(.84+.16*smooth(23,133,t));
   const lift=(reduced?.185:.325)*(1-.50*gather), height=mix(.33,.183,gather);
   const u=.035+x*w, v= -lift-.054*x+.069*x*gather;
   const z=pucker*(.022+.136*gather), drift=Math.sin(Math.PI*x)*.044*(1-gather);
   section.push({lo:b.map(u+.025*z,v+.46*height+z+drift),hi:b.map(u-.018*z,v-.54*height+z+drift)});
 }
 const at=(i,u,v)=>{
   const a=section[i],b=section[i+1];
   return lerp(lerp(a.hi,b.hi,u),lerp(a.lo,b.lo,u),v);
 };
 const face=q.darkBody*(1-.52*late);
 for(let i=0;i<4;i++){
   const f=section[i],n=section[i+1],glowAmt=glowA*(1-.64*late), c=paint[i], f2=face*(.82+.07*(i%2));
   g.quad(f.hi,n.hi,n.lo,f.lo,c,c,c,c,f2,f2,f2,f2);
   // A single broken-bend route stays joined across every hinge. It has
   // no origin marker, coordinate frame or destination icon.
   const route=[.71,.44,.49,.28,.42], lip=.014+.041*(1.-gather);
   const from=route[i],to=route[i+1],bend=mix(from,to,.43)+(i===1?.07:-.041);
   const ink=lerp([.26,.73,.78],[.90,1.87,1.71],glowAmt*.82), under=[.050,.140,.174];
   for(const [u1,v1,u2,v2] of [[0,from,.44,bend],[.44,bend,1,to]]){
    const c=face*(.59+.27*glowAmt);
    g.quad(at(i,u1,v1-lip*1.83),at(i,u2,v2-lip*1.83),at(i,u2,v2+lip*1.83),at(i,u1,v1+lip*1.83),under,under,under,under,c*.72,c*.72,c*.72,c*.72);
    g.quad(at(i,u1,v1-lip),at(i,u2,v2-lip),at(i,u2,v2+lip),at(i,u1,v1+lip),ink,ink,ink,ink,c,c,c,c,.18,.18,.18,.18);
   }
   const contour=lerp(dim,glow,glowAmt*.80), edge=face*(.36+.42*glowAmt);
   for(const v of [0,1]){
     const w=v===0?.043:-.032;
     g.quad(at(i,.001,v),at(i,.999,v),at(i,.999,v+w),at(i,.001,v+w),contour,contour,contour,contour,edge,edge,edge,edge,.21,.21,.11,.11);
   }
   if(i===2&&glowAmt>.01){
     g.quad(at(i,0,0),at(i,.08,0),at(i,.08,1),at(i,0,1),scan,contour,contour,scan,face*.26*glowAmt,face*.11*glowAmt,face*.11*glowAmt,face*.26*glowAmt,.31,.10,.10,.31);
   }
 }
 return {p:b.map(.14,-.11),contact:b.p,lum:.34*q.heat,stage:q.phase,progress:gather,triangles:(g.length-from)/24};
}
export function fillSfx(rate,_variant,seed=1){
 const data=new Float32Array(Math.round(rate*.59));let q=seed|0,p=0,hi=0,peak=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate;q^=q<<13;q^=q>>>17;q^=q<<5;
  const n=(q>>>0)/2147483648-1;p+=.10*(n-p);hi+=.46*(n-hi);
  const brush=(hi-p)*.13*smooth(.035,.072,t)*(1-smooth(.21,.268,t))*(.7+.3*Math.sin(t*109)**2);
  const d=t-.244;
  const crease=d<0?0:smooth(0,.002,d)*(.115*(hi-p)*Math.exp(-d*62)+.25*Math.sin(Math.PI*2*678*d)*Math.exp(-d*29)+.084*Math.sin(Math.PI*2*1031*d)*Math.exp(-d*37));
  data[i]=(brush+crease)*(1-smooth(.47,.587,t));peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
