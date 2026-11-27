import {VERSION,TYPE,LIFE,stateAt,admit} from './plan.mjs';
export {VERSION,TYPE,LIFE};
export const HEIGHT=1.70, CSS_PX_PER_M=64/HEIGHT;
const cap=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{const x=cap((t-a)/(b-a));return x*x*(3-2*x)};
const OWNER='fixture-scroll-user';
export function receipt(e,now=Date.now()){
 const o=admit(e,{owner:OWNER,now});
 return o?Object.freeze({...o,dx:0,tier:'arrival',playerId:OWNER}):null;
}
export function fixtureReceipt(serial){
 return {id:'magic_dot_warp_arrival_'+serial,type:TYPE,x:0,y:0,at:Date.now(),
 radius:125,durationMs:0,playerId:OWNER,variant:'arrival',targetX:null,targetY:null,targetId:''};
}
export function basis(){return {floor:[0,0],p:[.4,-.865],shoulder:[0,-1.14],e:[1,0]}}
export class Mesh {
  constructor(){this.data=new Float32Array(2048);this.length=0}
  vertex(p,c,a=1,k=0){const i=this.length;if(i+8>this.data.length){const next=new Float32Array(this.data.length*2);next.set(this.data);this.data=next}this.data.set([p[0],p[1],c[0],c[1],c[2],cap(a),k,0],i);this.length=i+8}
  tri(a,b,c,ca,cb=ca,cc=ca,aa=1,ab=aa,ac=aa,ka=0,kb=ka,kc=ka){this.vertex(a,ca,aa,ka);this.vertex(b,cb,ab,kb);this.vertex(c,cc,ac,kc)}
  quad(a,b,c,d,ca,cb=ca,cc=ca,cd=cb,aa=1,ab=aa,ac=aa,ad=ab,ka=0,kb=ka,kc=ka,kd=kb){this.tri(a,b,c,ca,cb,cc,aa,ab,ac,ka,kb,kc);this.tri(a,c,d,ca,cc,cd,aa,ac,ad,ka,kc,kd)}
  polygon(points, shade, light, normal, albedo=1){const c=points.map(p=>lit(shade,p,light,normal,albedo));for(let i=1;i<points.length-1;i++)this.tri(points[0],points[i],points[i+1],c[0],c[i],c[i+1])}
}
const ivory=[7.9,4.65,2.56], orange=[2.55,.63,.127], bronze=[.65,.14,.025];
const white=[13,8.3,4.85], warm=[.64,.49,1.0];
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
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),from=g.length,p=[0,.065];
 const f=q.alpha,fold=q.fold;
 if(f<=0)return {p,contact:p,lum:0,stage:q.phase,triangles:0};
 const mat=[.08,.19,.34], shade=[.022,.038,.12], face=[.28,.67,1.52], violet=[.40,.46,1.55], crest=[1.26,2.19,4.01];
 const foldY=(1-fold)*.22, expand=.64+.36*fold;
 const map=(u,v)=>[u*expand,v+.105*u+p[1]];
 // A shared shallow hinge. Both halves stay local to the arrived actor.
 const seamL=map(-.91,.075),seamR=map(.99,.075);
 const frontA=map(-.76,.43),frontB=map(.81,.43);
 const backA=map(-.73,-.24-foldY),backB=map(.72,-.25-foldY);
 g.quad(backA,backB,seamR,seamL,shade,mat,face,violet,f*.48,f*.51,f*.72,f*.65,0,.025,.13,.085);
 g.quad(seamL,seamR,frontB,frontA,face,face,mat,shade,f*.72,f*.76,f*.45,f*.48,.10,.13,.02,0);
 const press=q.touch, out=.095+.21*press;
 g.quad(map(-.86,.076-out),map(.93,.076-out),seamR,seamL,shade,mat,crest,face,f*.03,f*.05,f*.61*press,f*.57*press,0,0,.22,.17);
 g.quad(seamL,seamR,map(.77,.076+out),map(-.81,.076+out),face,crest,mat,shade,f*.63*press,f*.69*press,f*.065,f*.05,.16,.24,0,0);
 const edge=(u,v,du,dv,c1,c2,down)=>{
  const thickness=.011+.016*press;
  g.quad(map(u,v),map(du,dv),map(du,dv+(down?thickness:-thickness)),map(u,v+(down?thickness:-thickness)),c1,c2,mat,mat,f*.58,f*.68,f*.3,f*.3,.045,.07,0,0);
 };
 edge(-.76,.43,.81,.43,mat,face,false);
 edge(-.73,-.24-foldY,.72,-.25-foldY,face,mat,true);
 return {p,contact:p,lum:.24*press*f,stage:q.phase,progress:fold,triangles:(g.length-from)/24};
}
export function fillSfx(rate,_variant,seed=1){
 const data=new Float32Array(Math.round(rate*.50));let rng=seed|0,low=0,peak=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;
  const n=(rng>>>0)/2147483648-1;low+=.04*(n-low);
  const arrive=smooth(0,.041,t)*(1-smooth(.045,.195,t)), h=t-.173;
  const place=h<0?0:smooth(0,.019,h)*Math.exp(-16*h);
  const contact=place*(.104*Math.sin(2*Math.PI*257*h)+.028*Math.sin(2*Math.PI*416*h));
  data[i]=(.022*arrive*(n-low)+.036*arrive*Math.sin(2*Math.PI*(250*t+80*t*t))+contact)*(1-smooth(.36,.495,t));
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return{data,peak};
}
