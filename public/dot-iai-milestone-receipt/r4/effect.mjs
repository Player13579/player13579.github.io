import {VERSION,TYPE,VISUAL_MS,envelope,FIRST_SOUND_MS,receipt as admit} from './plan.mjs';
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
 return {id:'magic_dot_iai_milestone_r4_'+serial,type:TYPE,x:0,y:0,at:Date.now(),radius:122,playerId:OWNER,variant:'ec-500'};
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
const warm=[.64,.49,1.0];
const add=(p,d,s)=>[p[0]+d[0]*s,p[1]+d[1]*s];
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
// Movement is a contraction of one connected, curved volume in projection,
// not a rendered trajectory of a flying object. Use graded emissive/absorptive
// widths on a shared mesh; the soft outer boundary is not a second effect.
const violet=[.22,.105,.50], silica=[1.20,.65,2.24], pearl=[2.37,1.25,3.35];
const cross=[-1,-.65,-.30,0,.30,.65,1], segments=14;
function sweep(g,b,q){
 if(q.intake<=0||q.extent<=0)return;
 const rows=[];
 for(let i=0;i<=segments;i++){
  const s=i/segments,u=s*q.extent;
  const x=.046+.63*u,y=.018+.047*u+.287*u*u;
  const nx=x+.0001,ny=y+.0001*(.047+.574*u)/.63;
  const n=unit(y-ny,nx-x);
  const w=(.064+.109*Math.pow(Math.sin(Math.PI*s),.86)+.045*s)*(.44+.56*Math.sqrt(q.extent));
  const crown=Math.exp(-Math.pow((s-q.front)/.39,2));
  const skirt=(1-.74*s)*smooth(0,.15,1-s);
  rows.push(cross.map(v=>{
   const center=Math.pow(Math.max(0,1-v*v),1.38);
   const ridge=Math.exp(-Math.pow((v-.18)/.61,2));
   const yWeight=.21+.77*crown;
   const c=lerp(violet,lerp(silica,pearl,.49*ridge),.29+.64*yWeight);
   return {p:b.map(...add([x,y],n,v*w)),c,
     a:q.intake*skirt*center*(.50+.43*yWeight),
     k:.55*q.intake*crown*center};
  }));
 }
 const quad=(a,b,c,d)=>g.quad(a.p,b.p,c.p,d.p,a.c,b.c,c.c,d.c,a.a,b.a,c.a,d.a,a.k,b.k,c.k,d.k);
 for(let i=0;i<segments;i++)for(let j=1;j<cross.length;j++)quad(rows[i][j-1],rows[i+1][j-1],rows[i+1][j],rows[i][j]);
}
function palm(g,b,q){
 if(q.settled<=0)return;
 // All of this stays next to the exposed glove seam at H64. Declared in
 // fixture-local meters; never uses sender, amount, charge lifetime or result.
 const c=b.map(.046,.018), a=q.settled;
 const radii=[0,.55,1], circles=[];
 const rim=16;
 for(const r of radii){
  const pts=[];
  for(let i=0;i<rim;i++){
   const t=i/rim*2*Math.PI, u=Math.cos(t),v=Math.sin(t);
   pts.push(add(add(c,[.109,.071],r*u),[-.087,.116],r*v));
  } circles.push(pts);
 }
 const mid=lerp(silica,pearl,.32), outer=[.51,.29,.95];
 for(let i=0;i<rim;i++){
  const j=(i+1)%rim, f=.77+.23*Math.cos(i/rim*2*Math.PI-.56), h=.77+.23*Math.cos(j/rim*2*Math.PI-.56);
  const a1=.52*a*f,a2=.52*a*h;
  g.tri(c,circles[1][i],circles[1][j],pearl,mid,mid,.83*a,a1,a2,.7*a,.2*a,.2*a);
  g.quad(circles[1][i],circles[2][i],circles[2][j],circles[1][j],mid,outer,outer,mid,a1,0,0,a2,.2*a,0,0,.2*a);
 }
}
export function buildReceipt(g,ev,t,{reduced=false}={}){
 const b=basis(ev),q=envelope(t,{reduced}),before=g.length;
 sweep(g,b,q);palm(g,b,q);
 const glint=b.map(.045,.018);
 return {p:glint,contact:glint,lum:.11*q.intake+.39*q.settled,stage:q.phase,progress:q.extent,triangles:(g.length-before)/24};
}
export function fillSfx(rate,_variant,seed=1){
 const data=new Float32Array(Math.round(rate*.61));let q=seed|0||1,l=0,p=0,peak=0;
 const set=FIRST_SOUND_MS/1000;
 for(let i=0;i<data.length;i++){
  const t=i/rate;q^=q<<13;q^=q>>>17;q^=q<<5;
  const n=(q>>>0)/2147483648-1;l+=.08*(n-l);p+=.29*(n-p);
  const inhalation=smooth(.055,.137,t)*(1-smooth(.207,set+.008,t));
  const d=t-set,e=d<=0?0:smooth(0,.010,d)*Math.exp(-d*14);
  // Short, diffuse intake, followed by a single warm lower settling tone.
  const rise=.06*(p-l)*inhalation+.02*Math.sin(2*Math.PI*(660*t-410*t*t))*inhalation;
  const chime=d<=0?0:e*(.119*Math.sin(2*Math.PI*(394*d-36*d*d))+.028*Math.sin(2*Math.PI*724*d));
  data[i]=(rise+chime)*(1-smooth(.448,.607,t));peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
