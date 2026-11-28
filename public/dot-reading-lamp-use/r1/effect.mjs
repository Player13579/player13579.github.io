import {VERSION,TYPE,LIFE,LAMP,stateAt,admit} from './plan.mjs';
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
   objectId:LAMP,objectCausalId:'map-object:'+LAMP+':object_use_'+uid,effectKind:'mana',
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
const shade=(u,v)=>[(u-.5)*.89*(.74+.26*v), -.81+.36*v+.123*((u-.5)*2)**2];
export function drawFixture(g){
 // Fixed anonymous gallery shade, no room coordinates or operable elements.
 const row=12;
 for(let i=0;i<row;i++){
  const u=i/row,v=(i+1)/row;
  g.quad(shade(u,-.08),shade(v,-.08),shade(v,.18),shade(u,.18),[.095,.126,.145],undefined,undefined,undefined,.98);
  g.quad(shade(u,.18),shade(v,.18),shade(v,.93),shade(u,.93),[.19,.233,.25],undefined,undefined,undefined,.93);
  g.quad(shade(u,.91),shade(v,.91),shade(v,1.03),shade(u,1.03),[.083,.117,.139],undefined,undefined,undefined,.98);
 }
}
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),p=basis().p,from=g.length;
 if(q.alpha<=0)return {p,contact:p,lum:0,stage:q.phase,triangles:0};
 const us=Array.from({length:21},(_,i)=>.05+.90*i/20), vs=[.19,.30,.44,.58,.72,.83,.90];
 const z=(u,v)=>{
   const curve=.19+.68*q.settle-.15*(v-.55)+.040*Math.sin(v*5.6);
   const band=Math.exp(-((u-curve)**2)/.0105), soft=Math.exp(-((u-curve+.065)**2)/.026);
   const mask=Math.sin(Math.PI*u)**.62*Math.sin(Math.PI*(v-.19)/.71)**.62;
   const a=q.alpha*mask*(.58*band+.24*soft);
   return {a,c:[.42+.38*band,.53+.23*soft,.70+.26*band]};
 };
 for(let i=0;i<us.length-1;i++)for(let j=0;j<vs.length-1;j++){
  const vs2=[[us[i],vs[j]],[us[i+1],vs[j]],[us[i+1],vs[j+1]],[us[i],vs[j+1]]];
  const a=vs2.map(x=>z(...x));
  g.quad(...vs2.map(x=>shade(...x)),...a.map(x=>x.c),...a.map(x=>x.a),0,0,0,0);
 }
 return {p,contact:p,lum:0,stage:q.phase,progress:q.settle,triangles:(g.length-from)/24,branches:[]};
}
export function fillSfx(rate){
 const data=new Float32Array(Math.round(rate*.50));let peak=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate,env=smooth(0,.052,t)*(1-smooth(.09,.42,t));
  data[i]=env*(.034*Math.sin(2*Math.PI*(554*t-133*t*t))+.008*Math.sin(2*Math.PI*(841*t-135*t*t)));
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
