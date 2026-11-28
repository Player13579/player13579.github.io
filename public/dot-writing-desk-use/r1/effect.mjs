import {VERSION,TYPE,LIFE,DESK,stateAt,admit} from './plan.mjs';
export {VERSION,TYPE,LIFE};
export const HEIGHT=1.70, CSS_PX_PER_M=64/HEIGHT;
const cap=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{const x=cap((t-a)/(b-a));return x*x*(3-2*x)};
const OWNER='fixture';
export function receipt(e,now=Date.now()){
 const o=admit(e,{owner:OWNER,now});
 return o?Object.freeze({...o,dx:0,tier:'receipt',playerId:OWNER}):null;
}
export function fixtureReceipt(serial){
 const uid = Math.max(0,Number(serial)||0).toString(16).padStart(12,'0');
 return {id:'magic_'+uid,type:TYPE,at:Date.now(),radius:100,durationMs:0,playerId:OWNER,
   objectId:DESK,objectCausalId:'map-object:'+DESK+':object_use_'+uid,effectKind:'luckBoost',
   variant:'',targetX:null,targetY:null,targetId:''};
}
export function basis(){return {floor:[0,0],p:[0,-.63],shoulder:[0,-1.04],e:[1,0]}}
export class Mesh {
  constructor(){this.data=new Float32Array(2048);this.length=0}
  vertex(p,c,a=1,k=0){const i=this.length;if(i+8>this.data.length){const next=new Float32Array(this.data.length*2);next.set(this.data);this.data=next}this.data.set([p[0],p[1],c[0],c[1],c[2],cap(a),k,0],i);this.length=i+8}
  tri(a,b,c,ca,cb=ca,cc=ca,aa=1,ab=aa,ac=aa,ka=0,kb=ka,kc=ka){this.vertex(a,ca,aa,ka);this.vertex(b,cb,ab,kb);this.vertex(c,cc,ac,kc)}
  quad(a,b,c,d,ca,cb=ca,cc=ca,cd=cb,aa=1,ab=aa,ac=aa,ad=ab,ka=0,kb=ka,kc=ka,kd=kb){this.tri(a,b,c,ca,cb,cc,aa,ab,ac,ka,kb,kc);this.tri(a,c,d,ca,cc,cd,aa,ac,ad,ka,kc,kd)}
  polygon(points, shade, light, normal, albedo=1){const c=points.map(p=>lit(shade,p,light,normal,albedo));for(let i=1;i<points.length-1;i++)this.tri(points[0],points[i],points[i+1],c[0],c[i],c[i+1])}
}
const warm=[.91,.66,.30];
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
// One fixed anonymous tabletop in an oblique 2D gallery projection.
const surface=(u,v)=>[-.61+1.22*u+.23*v,-.75+.28*v-.105*u];
export function drawFixture(g){
 const a=surface(0,0), b=surface(1,0), c=surface(1,1), d=surface(0,1);
 const edge=([x,y])=>[x,y+.10], foot=([x,y])=>[x,y+.32];
 const upper=[.15,.123,.106], near=[.222,.177,.135], side=[.071,.062,.062];
 g.quad(d,c,edge(c),edge(d),near,near,side,side,1,1,1,1);
 g.quad(c,b,edge(b),edge(c),side,side,side,side,1,1,1,1);
 g.quad(edge(d),edge(surface(.09,1)),foot(surface(.09,1)),foot(d),side);
 g.quad(edge(surface(.90,1)),edge(c),foot(c),foot(surface(.90,1)),side);
 g.quad(a,b,c,d,upper,upper,near,near,1,1,1,1);
 g.quad(surface(.04,.90),surface(.96,.90),surface(.96,.94),surface(.04,.94),near);
}
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),p=surface(.80,.80),from=g.length;
 if(q.alpha<=0)return {p,contact:p,lum:0,stage:q.phase,triangles:0};
 const uGrid=[.52,.57,.65,.74,.82,.89,.941,.97],vGrid=[.34,.45,.53,.60,.66,.72,.77,.81,.85,.90,.945,.97];
 const z=(u,v)=>{
   const center=.54+.305*q.settle;
   const cross=v-center+.19*(u-.78);
   const envelope=Math.exp(-((u-(.69+.10*q.settle))**2)/.018)*(1-smooth(.89,.97,u))*smooth(.52,.575,u);
   const breadth=.091-.044*q.settle;
   const band=Math.exp(-(cross**2)/(breadth*breadth)), pale=Math.exp(-((cross+.013)**2)/.0015);
   const a=q.alpha*envelope*(.61*band+.20*pale)*smooth(.34,.47,v)*(1-smooth(.90,.969,v));
   return {a,c:[.94+.13*pale,.64+.19*pale,.40+.31*pale]};
 };
 for(let i=0;i<uGrid.length-1;i++)for(let j=0;j<vGrid.length-1;j++){
  const uv=[[uGrid[i],vGrid[j]],[uGrid[i+1],vGrid[j]],[uGrid[i+1],vGrid[j+1]],[uGrid[i],vGrid[j+1]]];
  const f=uv.map(x=>z(...x));
  g.quad(...uv.map(x=>surface(...x)),...f.map(x=>x.c),...f.map(x=>x.a),0,0,0,0);
 }
 return {p,contact:p,lum:0,stage:q.phase,progress:q.settle,triangles:(g.length-from)/24,branches:[]};
}
export function fillSfx(rate){
 const data=new Float32Array(Math.round(rate*.50));let peak=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate,env=smooth(0,.052,t)*(1-smooth(.09,.42,t));
  data[i]=env*(.031*Math.sin(2*Math.PI*(288*t-110*t*t))+.012*Math.sin(2*Math.PI*(622*t-179*t*t)));
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
