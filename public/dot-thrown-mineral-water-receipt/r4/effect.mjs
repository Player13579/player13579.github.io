import {VERSION,LIFE,stateAt,admit} from './plan.mjs';
const TYPE='local-thrown-mineral-water-preview';
export {VERSION,TYPE,LIFE};
export const HEIGHT=1.70, CSS_PX_PER_M=64/HEIGHT;
const cap=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{const x=cap((t-a)/(b-a));return x*x*(3-2*x)};
const OWNER='fixture-self';
export function receipt(raw,now=Date.now()){
 const v=admit(raw);if(!v||raw.selfId!==OWNER||!Number.isFinite(now)||now<v.at||now-v.at>=LIFE)return null;
 return Object.freeze({id:v.id,at:v.at,age:now-v.at,x:0,y:0,dx:0,tier:'water',playerId:OWNER});
}
export function fixtureReceipt(serial){
 const stamp=Date.now(),n=typeof serial==='number'?serial:1;
 return {source:'authoritative-event-replay',phase:'playing',stale:false,selfId:OWNER,observedAt:stamp,event:{id:'magic_dot_thrown_water_r4_'+n,type:'gain-stamina',effectKind:'stamina',radius:82,durationMs:1500,variant:'mineral-water:thrown',playerId:OWNER,at:stamp-1}};
}
export function basis(){return {floor:[0,0],p:[.4,-.865],shoulder:[0,-1.14],e:[1,0]}}
export class Mesh {
  constructor(){this.data=new Float32Array(2048);this.length=0}
  vertex(p,c,a=1,k=0){const i=this.length;if(i+8>this.data.length){const next=new Float32Array(this.data.length*2);next.set(this.data);this.data=next}this.data.set([p[0],p[1],c[0],c[1],c[2],cap(a),k,0],i);this.length=i+8}
  tri(a,b,c,ca,cb=ca,cc=ca,aa=1,ab=aa,ac=aa,ka=0,kb=ka,kc=ka){this.vertex(a,ca,aa,ka);this.vertex(b,cb,ab,kb);this.vertex(c,cc,ac,kc)}
  quad(a,b,c,d,ca,cb=ca,cc=ca,cd=cb,aa=1,ab=aa,ac=aa,ad=ab,ka=0,kb=ka,kc=ka,kd=kb){this.tri(a,b,c,ca,cb,cc,aa,ab,ac,ka,kb,kc);this.tri(a,c,d,ca,cc,cd,aa,ac,ad,ka,kc,kd)}
  polygon(points, shade, light, normal, albedo=1){const c=points.map(p=>lit(shade,p,light,normal,albedo));for(let i=1;i<points.length-1;i++)this.tri(points[0],points[i],points[i+1],c[0],c[i],c[i+1])}
}
const warm=[.48,.94,.91];
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
const gel=[.022,.20,.29], blue=[.083,.50,.64], contactTint=[.088,.375,.439], silver=[.49,.99,1.18];
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),n=g.length,p=[.288,-.083],a=q.opacity;
 if(a<=0)return {p,contact:p,lum:0,stage:'off',triangles:0,branches:[]};
 const set=1-q.drain;
 // Profile runs along the shoe rather than vertically above it. The lower
 // contact edge stays at the fixture; the interior is neither trail nor ring.
 const span=reduced?.459:.389+.100*smooth(0,103,t)-.108*q.drain;
 const advance=reduced?.0:.024*(1-smooth(192,441,t));
 const ridge=(u)=>.47+.13*Math.sin(u*Math.PI-.61);
 const taper=u=>Math.pow(Math.max(0,Math.sin(Math.PI*u)),.68);
 const crest=reduced?.49:mix(.79,.23,q.reach);
 const near=(u,v)=>{
   const k=taper(u);
   const x=.108+span*(u-.008)+advance + .027*k*(v-.49);
   const attached=-.046-.072*Math.sin(Math.PI*u*.96+.06)+.037*u;
   const width=k*(.126+.074*smooth(.25,.75,u))*(reduced?.82:.63+.37*set);
   const xfall=.022*Math.sin(u*3.63)*k*v;
   return [x-xfall,attached+width*(v-.58)+.025*k*(1-v)*(1-v)];
 };
 const band=(u,v)=>{
   const k=taper(u),line=Math.exp(-(((v-ridge(u))/.135)**2));
   const sweep=Math.exp(-(((u-crest)/.205)**2));
   const ripple=q.light*sweep;
   const body=.44+.17*Math.sin(u*4.2+.15)-.21*v;
   const material=.15+.41*line+.051*sweep;
   return {c:gel.map((c,i)=>mix(mix(c,mix(blue[i],contactTint[i],1-body),.49+.25*(1-v)),silver[i],material*(.31+.52*ripple))),
           a:a*k*(.27+.38*line+.26*ripple*line)*(1-Math.pow(Math.abs(2*v-1),2.3)),
           emit:k*line*(.05+.20*ripple)};
 };
 const slides=[0,.08,.22,.40,.53,.67,.80,.92,1];
 for(let i=0;i<22;i++)for(let j=0;j<slides.length-1;j++){
  const u=i/22,v=(i+1)/22,h=slides[j],k=slides[j+1];
  const points=[[u,h],[v,h],[v,k],[u,k]],data=points.map(q=>band(...q));
  g.quad(...points.map(q=>near(...q)),...data.map(x=>x.c),...data.map(x=>x.a),...data.map(x=>x.emit));
 }
 const glintP=near(crest,ridge(crest));
 // Reflected light stays at the foot and is small against the body fixture.
 return {p,contact:p,lum:a*(.075+.12*q.light),stage:t<132?'contact':t<532?'return':'settle',progress:q.reach,
  triangles:(g.length-n)/24,branches:[{p:glintP,lum:a*(.035+.10*q.light)}]};
}
export function fillSfx(rate){
 const n=Math.round(rate*.96),data=new Float32Array(n),tau=2*Math.PI;let peak=0,lo=0,hi=0,r=0xfa8bb0c5;
 const low=1-Math.exp(-tau*445/rate),band=1-Math.exp(-tau*1920/rate);
 for(let i=0;i<n;i++){
  const t=i/rate,u=t-.061;
  r^=r<<13;r^=r>>>17;r^=r<<5;
  const x=(r>>>0)/2147483648-1;lo+=low*(x-lo);hi+=band*(x-hi);
  if(u<0)continue;
  const attack=smooth(0,.054,u),rest=1-smooth(.402,.79,u);
  const k=attack*rest,water=(hi-lo)*.100*(1-smooth(.04,.242,u));
  const small=Math.sin(tau*(273*u-98*u*u))*.064*Math.exp(-11*u);
  const slip=Math.sin(tau*(519*u-321*u*u))*.041*smooth(.032,.100,u)*Math.exp(-8*u);
  data[i]=k*(water+small+slip);
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
