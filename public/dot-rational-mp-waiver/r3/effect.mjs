import {VERSION,LIFE,stateAt,admit} from './plan.mjs';
const TYPE='local-rational-mp-waiver-preview';
export {VERSION,TYPE,LIFE};
export const HEIGHT=1.70, CSS_PX_PER_M=64/HEIGHT;
const cap=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{const x=cap((t-a)/(b-a));return x*x*(3-2*x)};
const OWNER='fixture-self';
export function receipt(raw,now=Date.now()){
 const v=admit(raw);if(!v||raw.selfId!==OWNER||!Number.isFinite(now)||now<v.at||now-v.at>=LIFE)return null;
 return Object.freeze({id:v.id,at:v.at,age:now-v.at,x:0,y:0,dx:0,tier:'bypass',playerId:OWNER});
}
export function fixtureReceipt(serial){
 const stamp=Date.now(),n=typeof serial==='number'?serial:1;
 return {source:'authoritative-event-replay',phase:'playing',stale:false,selfId:OWNER,observedAt:stamp,event:{id:'magic_dot_rational_r3_'+n,type:'action-rational-free',radius:145,durationMs:0,variant:'',playerId:OWNER,at:stamp-1}};
}
export function basis(){return {floor:[0,0],p:[.4,-.865],shoulder:[0,-1.14],e:[1,0]}}
export class Mesh {
  constructor(){this.data=new Float32Array(2048);this.length=0}
  vertex(p,c,a=1,k=0){const i=this.length;if(i+8>this.data.length){const next=new Float32Array(this.data.length*2);next.set(this.data);this.data=next}this.data.set([p[0],p[1],c[0],c[1],c[2],cap(a),k,0],i);this.length=i+8}
  tri(a,b,c,ca,cb=ca,cc=ca,aa=1,ab=aa,ac=aa,ka=0,kb=ka,kc=ka){this.vertex(a,ca,aa,ka);this.vertex(b,cb,ab,kb);this.vertex(c,cc,ac,kc)}
  quad(a,b,c,d,ca,cb=ca,cc=ca,cd=cb,aa=1,ab=aa,ac=aa,ad=ab,ka=0,kb=ka,kc=ka,kd=kb){this.tri(a,b,c,ca,cb,cc,aa,ab,ac,ka,kb,kc);this.tri(a,c,d,ca,cc,cd,aa,ac,ad,ka,kc,kd)}
  polygon(points, shade, light, normal, albedo=1){const c=points.map(p=>lit(shade,p,light,normal,albedo));for(let i=1;i<points.length-1;i++)this.tri(points[0],points[i],points[i+1],c[0],c[i],c[i+1])}
}
const warm=[.79,1,.53];
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
 const q=stateAt(t,{reduced}),start=g.length,p=[.44,-.865],a=q.opacity,l=q.light;
 if(a<=0)return {p,contact:p,lum:0,stage:'off',triangles:0,branches:[]};
 const hc=.30+.40*q.travel, hq=.31*q.open;
 const green=[.49,.80,.41], ivory=[1.27,1.40,.86], deep=[.19,.36,.25];
 const center=u=>[p[0]+.14+1.02*u,p[1]+.27-.74*u];
 const outer=u=>(.10+.35*Math.pow(Math.sin(Math.PI*u),.72))*(1-.22*q.travel);
 const voidWidth=u=>Math.max(0,1-Math.abs(u-hc)/.28)*hq*(.95+.05*Math.sin(Math.PI*u));
 const point=(u,v,k)=>{
   const c=center(u), h=voidWidth(u), w=mix(h,outer(u),v)*k;
   return [c[0]+w*.68,c[1]+w*.82+.035*Math.sin(Math.PI*u)*(1-v)];
 };
 const s=(u)=>(1-Math.min(1,Math.abs(u-hc)/.31))*l;
 const rgb=(u,v)=>green.map((x,i)=>mix(mix(x,deep[i],v*.47),ivory[i],(.18+.64*s(u))*(1-v*.88)));
 const alpha=(u,v)=>a*(.15+.68*Math.pow(Math.sin(Math.PI*u),.4))*(1-.67*v);
 const glow=(u,v)=>.021+.12*(.28+s(u))*(1-v*.74);
 for(const side of [-1,1])for(let i=0;i<30;i++)for(let j=0;j<2;j++){
   const u=i/30,k=(i+1)/30,v=j*.5,w=(j+1)*.5, args=[[u,v],[k,v],[k,w],[u,w]];
   g.quad(...args.map(z=>point(...z,side)),...args.map(z=>rgb(...z)),...args.map(z=>alpha(...z)),...args.map(z=>glow(...z)));
 }
 return {p,contact:p,lum:a*(.08+.21*l),stage:t<450?'aperture':'drain',progress:q.travel,triangles:(g.length-start)/24,branches:[{p:point(hc,.07,1),lum:a*(.07+.22*l)}]};
}
export function fillSfx(rate){
 const data=new Float32Array(Math.round(rate*.675));let peak=0,z=0;
 for(let i=0;i<data.length;i++){
   const t=i/rate,h=t-.195, env=h>0?smooth(0,.11,h)*(1-smooth(.18,.431,h)):0;
   z=.86*z+.14*Math.sin(i*1.618034+Math.sin(i*.211)*7.61);
   data[i]=env===0?0:env*(.036*z+.026*Math.sin(2*Math.PI*(173*h+211*h*h))+.011*Math.sin(2*Math.PI*(391*h-198*h*h)));
   peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
