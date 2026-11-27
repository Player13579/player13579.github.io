import {VERSION,TYPE,LIFE,stateAt,admit} from './plan.mjs';
export {VERSION,TYPE,LIFE};
export const HEIGHT=1.70, CSS_PX_PER_M=64/HEIGHT;
const cap=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{const x=cap((t-a)/(b-a));return x*x*(3-2*x)};
const OWNER='fixture';
export function receipt(e,now=Date.now()){
 const o=admit(e,{owner:OWNER,now});
 return o?Object.freeze({...o,dx:0,tier:'departure',playerId:OWNER}):null;
}
export function fixtureReceipt(serial){
 return {id:'magic_dot_scroll_departure_'+serial,type:TYPE,x:0,y:0,at:Date.now(),
 radius:125,durationMs:0,playerId:OWNER,variant:'',targetX:5,targetY:2,targetId:''};
}
export function basis(){return {floor:[0,0],p:[.4,-.865],shoulder:[0,-1.14],e:[1,0]}}
export class Mesh {
  constructor(){this.data=new Float32Array(2048);this.length=0}
  vertex(p,c,a=1,k=0){const i=this.length;if(i+8>this.data.length){const next=new Float32Array(this.data.length*2);next.set(this.data);this.data=next}this.data.set([p[0],p[1],c[0],c[1],c[2],cap(a),k,0],i);this.length=i+8}
  tri(a,b,c,ca,cb=ca,cc=ca,aa=1,ab=aa,ac=aa,ka=0,kb=ka,kc=ka){this.vertex(a,ca,aa,ka);this.vertex(b,cb,ab,kb);this.vertex(c,cc,ac,kc)}
  quad(a,b,c,d,ca,cb=ca,cc=ca,cd=cb,aa=1,ab=aa,ac=aa,ad=ab,ka=0,kb=ka,kc=ka,kd=kb){this.tri(a,b,c,ca,cb,cc,aa,ab,ac,ka,kb,kc);this.tri(a,c,d,ca,cc,cd,aa,ac,ad,ka,kc,kd)}
  polygon(points, shade, light, normal, albedo=1){const c=points.map(p=>lit(shade,p,light,normal,albedo));for(let i=1;i<points.length-1;i++)this.tri(points[0],points[i],points[i+1],c[0],c[i],c[i+1])}
}
const warm=[.45,1,.69];
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
export function drawFixture(g,b){
  const p=b.floor;
  disc(g,[p[0]-.02,p[1]+.02],.51,.148,[.035,.05,.065],.22,0,0,24);
}
const stencil=['..xxx..','.xxxxx.','..xxx..','..xxx..','.xxxxx.','xxxxxxx','xxxxxxx','.xxxxx.','..xxx..','..xxx..','..x.x..','.xx.xx.','.xx.xx.'];
const rgb=(a,b,t)=>[0,1,2].map(i=>a[i]+(b[i]-a[i])*t);
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),from=g.length,p=[0,-.79];
 if(q.alpha<=0)return {p,contact:p,lum:0,stage:q.stage,triangles:0};
 const cobalt=[.10,.59,1.58], blue=[.38,1.61,3.1], dark=[.023,.068,.16], white=[1.58,2.76,5.30];
 const cell=.119;
 for(let row=0;row<stencil.length;row++)for(let col=0;col<7;col++){
   if(stencil[row][col]!== 'x')continue;
   const h=((col*17+row*23)%11)/10;
   const pulse=smooth(155+row*9,360+row*9,t)*(1-smooth(390+row*8,730+row*9,t));
   const dx=(col-3)*cell, dy=(row-12)*cell-.052;
   const s=q.spread,sign=col<3?-1:col>3?1:(row%2?-1:1);
   const x=dx+s*(dx*(.68+.25*h)+sign*(.08+.16*h));
   const y=dy-s*(.01+.26*h)+s*(.10*(row%3)/2);
   const size=(.108+.008*h)*(1-s*.52);
   const a=q.alpha*(.54+.36*pulse)*(1-smooth(498+row*8+(col%3)*28,735+row*11+(col%2)*31,t)*.89);
   const shade=rgb(cobalt,blue,.3+.7*h);
   g.quad([x-size/2,y-size/2],[x+size/2,y-size/2],[x+size/2,y+size/2],[x-size/2,y+size/2],shade,white,shade,dark,a*.65,a*.79,a*.46,a*.33,.08,.17,.06,0);
 }
 const f=q.hold*q.alpha;
 disc(g,[0,.025],.59+q.spread*.16,.096,blue,f*.17,.045,0,16);
 return {p,contact:p,lum:f*.30,stage:q.stage,progress:q.spread,triangles:(g.length-from)/24,branches:[]};
}
export function fillSfx(rate){
 const data=new Float32Array(Math.round(rate*.60));let peak=0,seed=241;
 for(let i=0;i<data.length;i++){
  const t=i/rate;
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const n=(seed>>>0)/2147483648-1, h=t-.182;
  const a=smooth(0,.048,t)*(1-smooth(.22,.40,t)),b=h>0?smooth(0,.026,h)*Math.exp(-12*h):0;
  data[i]=(.019*a*n+.036*a*Math.sin(2*Math.PI*(318*t-132*t*t))+b*.048*Math.sin(2*Math.PI*498*h))*(1-smooth(.44,.595,t));
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
