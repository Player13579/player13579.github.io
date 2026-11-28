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
// One continuous local veil. The center stays at the exact origin.
const outline=[[-1.56,.023],[-1.44,.16],[-1.25,.23],[-1.03,.32],[-.80,.28],[-.53,.218],[-.29,.151],[-.09,.035]];
export function folding(t,{reduced=false}={}){
 const fold=smooth(102,400,t);
 return {width:reduced?.62:mix(1,.065,fold),edge:smooth(42,116,t)*(1-smooth(395,630,t)),seam:smooth(255,420,t)*(1-smooth(445,625,t))};
}
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),p=[0,-.87],from=g.length;
 if(q.alpha<=0)return {p,contact:p,lum:0,stage:q.stage,triangles:0};
 const f=folding(t,{reduced}),body=[.046,.17,.23], dark=[.023,.06,.093], edge=[.34,1.1,1.65], core=[.49,1.35,1.85];
 const a=q.alpha*(1-smooth(360,630,t));
 const an=f.edge*a, spine=q.alpha*f.seam;
 function row(j,sg){
  const [y,w]=outline[j],taper=(j===0||j===outline.length-1)?.12:1;
  const x=w*f.width;
  return [[0,y],[sg*x*.70,y],[sg*x,y],[sg*x*1.09,y],taper];
 }
 for(let i=0;i<outline.length-1;i++)for(const side of [-1,1]){
  const [a0,a1,a2,a3,k]=row(i,side),[b0,b1,b2,b3,l]=row(i+1,side);
  g.quad(a0,b0,b1,a1,dark,dark,body,body,a*k*.63,a*l*.63,a*l*.51,a*k*.51,0,0,0,0);
  g.quad(a1,b1,b2,a2,body,body,edge,edge,a*k*.51,a*l*.51,an*l*.94,an*k*.94,0,0,.024,.024);
  g.quad(a2,b2,b3,a3,edge,edge,edge,edge,an*k*.94,an*l*.94,0,0,.024,.024,0,0);
 }
 if(spine>0){
  const w=reduced?.013:.019;
  g.quad([-w,-1.43],[w,-1.43],[w,-.23],[-w,-.23],core,core,core,core,spine*.40,spine*.40,spine*.78,spine*.78,.02,.02,.025,.025);
 }
 return {p,contact:p,lum:0,stage:q.stage,progress:f.width,triangles:(g.length-from)/24,branches:[]};
}
export function fillSfx(rate){
 const data=new Float32Array(Math.round(rate*.71));let peak=0,seed=551;
 for(let i=0;i<data.length;i++){
  const t=i/rate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const n=(seed>>>0)/2147483648-1,h=t-.173;
  const entrance=smooth(0,.053,t)*(1-smooth(.145,.28,t));
  const a=h>0?smooth(0,.048,h)*(1-smooth(.27,.44,h)):0;
  data[i]=(.027*entrance*Math.sin(2*Math.PI*291*t)+.023*n*a+.024*a*Math.sin(2*Math.PI*(407*h+154*h*h)))*(1-smooth(.51,.706,t));
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
