import {VERSION,LIFE,stateAt,admit} from './plan.mjs';
const TYPE='local-mineral-water-self-use-preview';
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
 return {source:'authoritative-event-replay',phase:'playing',stale:false,selfId:OWNER,observedAt:stamp,event:{id:'magic_dot_mineral_self_r5_'+n,type:'gain-stamina',effectKind:'stamina',radius:82,durationMs:1500,variant:'mineral-water:use',playerId:OWNER,at:stamp-1}};
}
const mouth=[.215,-1.443];
function grip(q) {
 const tilt=-1.29,axis=[Math.sin(tilt),-Math.cos(tilt)],wide=[-axis[1],axis[0]];
 const carryX=.012;
 const lip=[mix(.40+.292*axis[0],mouth[0]+carryX,q.lift),mix(-.865+.292*axis[1],mouth[1],q.lift)];
 return {lip,axis,wide,p:add(lip,axis,-.292)};
}
const hand=q=>grip(q).p;
export function basis(_ev,t,o){return {floor:[0,0],p:hand(stateAt(t??0,{reduced:o})),shoulder:[0,-1.14],e:[1,0]};}
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
  const reach=cap((-.865-b.p[1])/.542);
  const elbow=add(b.shoulder,[mix(.24,.30,reach),mix(.29,.08,reach)],1), glove=b.p;
  strip(g,add(b.shoulder,b.e,.09),elbow,.122,.100,[.125,.154,.182],lights,.72);
  strip(g,elbow,glove,.091,.064,[.083,.12,.154],lights,.71);
  disc(g,glove,.080,.075,lit([.128,.157,.181],glove,lights,b.e,1),1,0,1,8);
}
// Short faceted container. There is no internal waterline or quantity geometry.
const bottle=[[-.174,-.182],[.124,-.182],[.172,-.139],[.172,.123],[.111,.198],[.052,.220],[.052,.292],[-.052,.292],[-.052,.220],[-.128,.190],[-.174,.127]];
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),start=g.length,{p,axis,wide,lip}=grip(q),a=q.opacity,l=q.light;
 if(a<=0)return {p,contact:p,lum:0,stage:'off',triangles:0,branches:[]};
 // Pure roll around the fixed mouth–grip axis. Central positions never move.
 const theta=q.roll*Math.PI/2;
 const width=Math.cos(theta)+.42*Math.sin(theta);
 const tr=(x,y)=>[p[0]+wide[0]*x*width+axis[0]*y,p[1]+wide[1]*x*width+axis[1]*y];
 const ink=[.11,.24,.31], glass=[.37,.64,.77], ice=[.88,1.34,1.5], dark=[.074,.17,.23];
 const mixc=(a,b,t)=>a.map((n,i)=>mix(n,b[i],t));
 const band=y=>l*Math.exp(-(((y-.237)/.12)**2));
 const face=([x,y])=>mixc(x<0?dark:ink,glass,.40+.27*l+.16*band(y));
 for(let k=0;k<bottle.length;k++){
  const K=bottle[k],J=bottle[(k+1)%bottle.length], u=tr(...K),v=tr(...J),uu=tr(K[0]*.79,K[1]*.91),vv=tr(J[0]*.79,J[1]*.91);
  g.tri(tr(0,.012),uu,vv,ink,face(K),face(J),a*.50,a*.66,a*.66);
  const e=X=>mixc(glass,ice,.25+.25*l+.38*band(X[1]));
  g.quad(u,v,vv,uu,e(K),e(J),face(J),face(K),a*.82,a*.82,a*.47,a*.47,.065+.134*band(K[1]),.065+.134*band(J[1]),0,0);
 }
 // Long internal face seam turns continuously across the same solid rather than a detached shine.
 const seam=mix(-.094,.085,q.roll);
 g.quad(tr(seam-.024,-.150),tr(seam+.018,-.150),tr(seam+.018,.160),tr(seam-.024,.160),glass,dark,dark,glass,a*.65,a*.26,a*.35,a*.66,.055,0,0,.065);
 g.quad(tr(-.057,.25),tr(.057,.25),tr(.057,.285),tr(-.057,.285),ink,glass,glass,ink,a*.72,a*.64,a*.64,a*.72,0,.045,.03,0);
 disc(g,add(p,[.048,.024],1),.046,.041,[.128,.163,.181],a*.96,0,1,8);
 return {p,contact:lip,lum:a*(.055+.09*l),stage:t<230?'broad-face':t<597?'axial-roll':'edge-face',progress:q.roll,triangles:(g.length-start)/24,branches:[{p:tr(.09,.103),lum:a*(.028+.15*l)}]};
}
export function fillSfx(rate){
 const data=new Float32Array(Math.round(rate*.95));let peak=0,z=0;
 for(let i=0;i<data.length;i++){
   const t=i/rate,h=t-.105,w=h>0?smooth(0,.058,h)*(1-smooth(.136,.366,h)):0;
   z=.76*z+.24*Math.sin(i*2.331+Math.sin(i*.323)*6.4);
   data[i]=w===0?0:w*(.039*z+.033*Math.sin(2*Math.PI*(416*h-134*h*h))+.020*Math.sin(2*Math.PI*(719*h-305*h*h)));
   peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
