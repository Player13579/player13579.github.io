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
// Bilateral contact, not walk steps: coordinate and shape remain anchored throughout.
const patch=[[-.160,.01],[-.138,-.036],[-.071,-.066],[.018,-.068],[.125,-.044],[.156,-.012],[.130,.031],[.041,.067],[-.070,.071],[-.133,.042]];
const ink=[.023,.038,.062],cold=[.05,.19,.27],edge=[.57,1.21,1.42];
export function afterTrace(t,{reduced=false}={}){
 const reveal=smooth(0,reduced?115:70,t), residue=1-smooth(244,680,t);
 return {body:reveal*residue,light:reveal*(1-smooth(135,reduced?290:335,t)),mute:smooth(140,390,t)};
}
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),p=[0,.025],from=g.length;
 if(q.alpha<=0)return {p,contact:p,lum:0,stage:q.stage,triangles:0};
 const k=afterTrace(t,{reduced});
 for(const side of [-1,1]){
  const c=[side*.252,.022], map=([u,v],r)=>[c[0]+side*(u+.43*v)*r,c[1]+(v-.13*u)*r];
  for(let n=0;n<patch.length;n++){
   const s=patch[n],v=patch[(n+1)%patch.length],a=map(s,.78),b=map(v,.78),A=map(s,1),B=map(v,1);
   const r=(n<6?.82:.47)*k.light, shade=k.body*(.68+.23*k.mute);
   g.tri(c,a,b,ink,cold,cold,shade,shade*.67,shade*.67);
   g.quad(a,b,B,A,edge,edge,ink,ink,r,r,k.body*.28,k.body*.28,.026,.026,0,0);
  }
 }
 return {p,contact:p,lum:0,stage:q.stage,progress:k.body,triangles:(g.length-from)/24,branches:[]};
}
export function fillSfx(rate){
 const data=new Float32Array(Math.round(rate*.48));let peak=0,seed=541,low=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const n=(seed>>>0)/2147483648-1;low+=.075*(n-low);
  const release=smooth(0,.042,t)*(1-smooth(.085,.27,t));
  const color=2*Math.PI*(233*t-64*t*t);
  data[i]=(.048*Math.sin(color)+.016*Math.sin(color*1.49)+.034*low)*release;
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
