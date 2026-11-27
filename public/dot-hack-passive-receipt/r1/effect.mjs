import {VERSION,TYPE,LIFE,stateAt,admit} from './plan.mjs';
export {VERSION,TYPE,LIFE};
export const HEIGHT=1.70, CSS_PX_PER_M=64/HEIGHT;
const cap=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{const x=cap((t-a)/(b-a));return x*x*(3-2*x)};
const OWNER='fixture-hack-recipient';
export function receipt(e,now=Date.now()){
 const o=admit(e,{owner:OWNER,now});
 return o?Object.freeze({...o,dx:0,tier:'vending',playerId:OWNER}):null;
}
export function fixtureReceipt(serial){
 return {id:'magic_dot_hack_receipt_'+serial,type:TYPE,x:0,y:0,at:Date.now(),
 radius:124,durationMs:0,playerId:OWNER,variant:'vending',targetX:null,targetY:null,targetId:''};
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
 const q=stateAt(t,{reduced}),from=g.length,p=[.19,-1.16],f=q.alpha;
 if(f<=0)return {p,contact:p,lum:0,stage:q.phase,triangles:0};
 const u=q.open, r=q.core;
 const mat=[.092,.11,.19], deep=[.038,.049,.13], fold=[.36,.45,1.16], face=[.71,.76,1.99], reveal=[1.85,1.6,4.3];
 const cross=(x,y)=>[p[0]+x-.18*y,p[1]+y+.14*x];
 const P=[cross(.13,-.267-.022*u),cross(.48,-.482),cross(.63,-.43),cross(.62,-.112-.023*u),cross(.31,.004),cross(.12,-.04)];
 const K=[cross(.19,-.165),cross(.48,-.277),cross(.53,-.24),cross(.39,.018),cross(.07,.17),cross(.056,.055)];
 const mixP=(a,b,t)=>a.map((x,i)=>mix(x,b[i],t));
 const topL=mixP(P[5],P[0],.39+.19*u),topR=mixP(P[4],P[3],.43+.21*u);
 const botL=mixP(K[4],K[5],.61+.15*u),botR=mixP(K[3],K[2],.38+.16*u);
 // Negative space opens in the same little silhouette, not into a projected screen.
 g.quad(P[0],P[1],P[2],topR,mat,deep,fold,face,f*.78,f*.67,f*.78,f*.86,0,.01,.10,.21);
 g.quad(P[0],topR,topL,P[5],deep,face,fold,deep,f*.53,f*.69,f*.85,f*.75,0,.21,.13,0);
 g.quad(botL,botR,K[3],K[4],face,face,fold,mat,f*.82,f*.82,f*.82,f*.63,.12,.14,.06,.01);
 g.tri(botR,K[3],K[2],face,mat,deep,f*.68,f*.64,f*.60,.11,.02,0);
 const alpha=f*r;
 const t1=mixP(topL,topR,.15),t2=mixP(topL,topR,.83),u1=mixP(botL,botR,.22),u2=mixP(botL,botR,.77);
 g.quad(t1,t2,u2,u1,fold,reveal,face,deep,alpha*.36,alpha*.82,alpha*.47,alpha*.11,.04,.20,.10,0);
 return {p,contact:p,lum:.25*r*f,stage:q.phase,progress:u,triangles:(g.length-from)/24};
}
export function fillSfx(rate,_variant,seed=1){
 const data=new Float32Array(Math.round(rate*.50));let rng=seed|0,low=0,peak=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;
  const n=(rng>>>0)/2147483648-1;low+=.04*(n-low);
  const arrive=smooth(0,.041,t)*(1-smooth(.045,.195,t)), h=t-.238;
  const place=h<0?0:smooth(0,.019,h)*Math.exp(-16*h);
  const contact=place*(.082*Math.sin(2*Math.PI*584*h)+.028*Math.sin(2*Math.PI*709*h));
  data[i]=(.022*arrive*(n-low)+.036*arrive*Math.sin(2*Math.PI*(250*t+80*t*t))+contact)*(1-smooth(.36,.495,t));
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return{data,peak};
}
