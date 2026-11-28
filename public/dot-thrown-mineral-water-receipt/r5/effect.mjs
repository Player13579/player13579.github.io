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
 return {source:'authoritative-event-replay',phase:'playing',stale:false,selfId:OWNER,observedAt:stamp,event:{id:'magic_dot_thrown_water_r5_'+n,type:'gain-stamina',effectKind:'stamina',radius:82,durationMs:1500,variant:'mineral-water:thrown',playerId:OWNER,at:stamp-1}};
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
const cool=[.019,.163,.232], medium=[.124,.53,.659], wash=[.19,.79,.85], inner=[.62,1.36,1.49];
const tau=Math.PI*2;
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),n=g.length,p=[.382,-.900],a=q.opacity;
 if(a<=0)return {p,contact:p,lum:0,stage:'off',triangles:0,branches:[]};
 const initial=reduced?.86:smooth(0,155,t);
 const settling=reduced?.41:q.reach;
 const linger=1-.24*q.drain;
 // Contact remains at the sleeve. The bulge rather than its direction is
 // animated: a meniscus gathers, with no projectile or droplet leaving it.
 const ctr=[p[0]+(reduced?.105:.095+.016*initial-.022*settling),p[1]+.008];
 const rx=(.135+.078*initial-.035*settling)*linger;
 const ry=(.124+.042*initial-.029*settling)*linger;
 const at=(theta,r)=>{
  const c=Math.cos(theta),s=Math.sin(theta),curv=1-.24*s+.09*Math.sin(2*theta+.48);
  const y=ry*r*s*curv-.066*rx*r*c;
  const joined=.24*(1-Math.max(0,c))+.11*(1-Math.cos(2*theta));
  return [ctr[0]+rx*r*c*(1-.17*s)-rx*joined*r*r,y+ctr[1]+.045*r*c];
 };
 const col=(theta,r)=>{
  const sweep=(Math.sin(theta+.60)+1)*.50;
  const front=Math.pow(Math.max(0,.5+.5*Math.cos(theta+.63)),1.37);
  const traverse=1-.28*Math.abs(sweep-mix(.73,.43,settling));
  const raised=Math.exp(-(((r-.52)/.29)**2));
  const edge=1-smooth(.91,1,r);
  const l=q.light*raised*(.30+.52*front*traverse);
  return {c:cool.map((c,i)=>mix(mix(c,medium[i],.40+raised*.24),mix(wash[i],inner[i],.65*l),.16+.32*front+.30*l)),
           a:a*edge*(.39+.17*raised+.18*front+.085*q.light),
           emit:edge*(.12+.28*l)};
 };
 const rings=[0,.29,.56,.79,.94,1];
 for(let j=0;j<32;j++)for(let k=0;k<rings.length-1;k++){
  const u=tau*j/32,v=tau*(j+1)/32;
  const a=rings[k],b=rings[k+1],rows=[[u,a],[v,a],[v,b],[u,b]],colors=rows.map(x=>col(...x));
  g.quad(...rows.map(x=>at(...x)),...colors.map(x=>x.c),...colors.map(x=>x.a),...colors.map(x=>x.emit));
 }
 const light=a*(.15+.19*q.light); 
 return {p,contact:p,lum:light,stage:t<155?'wet-contact':t<524?'coalescence':'release',progress:q.reach,
  triangles:(g.length-n)/24,branches:[{p:at(-.63,.51),lum:light*.30}]};
}
export function fillSfx(rate){
 const out=new Float32Array(Math.round(rate*.96));let peak=0,x=0,y=0,s=0x4d24bc99;
 const lo=1-Math.exp(-tau*505/rate),hi=1-Math.exp(-tau*2320/rate);
 for(let i=0;i<out.length;i++){
  const u=i/rate-.044;s^=s<<13;s^=s>>>17;s^=s<<5;
  const n=(s>>>0)/2147483648-1;x+=(n-x)*lo;y+=(n-y)*hi;
  if(u<0)continue;
  const entry=smooth(0,.019,u),release=1-smooth(.306,.756,u);
  const membrane=.069*Math.sin(tau*(587*u-418*u*u))*Math.exp(-u*15.5);
  const bead=.058*Math.sin(tau*(342*u-186*u*u))*smooth(.028,.079,u)*Math.exp(-u*10.0);
  const grain=.107*(y-x)*(1-smooth(.025,.188,u));
  out[i]=entry*release*(membrane+bead+grain);peak=Math.max(peak,Math.abs(out[i]));
 }
 return {data:out,peak};
}
