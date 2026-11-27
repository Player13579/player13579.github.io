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
const stencil=['...xxx...','..xxxxx..','...xxx...','...xxx...','..xxxxx..','.xxxxxxx.','.xxxxxxx.','..xxxxx..','..xxxxx..','...xxx...','...x.x...','..xx.xx..','..xx.xx..'];
const blend=(a,b,t)=>[0,1,2].map(i=>a[i]+(b[i]-a[i])*t);
export function rowState(t,row,{reduced=false}={}){
 const release=204+(12-row)*24;
 const local=smooth(release,release+117,t);
 const erase=smooth(release+84,release+246,t);
 return {release,travel:reduced?0:local,visible:1-erase};
}
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),from=g.length,p=[0,-.79];
 if(q.alpha<=0)return {p,contact:p,lum:0,stage:q.stage,triangles:0};
 const base=[.10,.49,1.04],cold=[.17,1.03,1.59], hot=[.76,2.55,3.36], edge=[.045,.13,.28];
 const cell=.122;
 for(let row=0;row<stencil.length;row++){
 const hit=rowState(t,row,{reduced}),toward=hit.travel;
 for(let col=0;col<9;col++){
   if(stencil[row][col]!== 'x')continue;
   const h=((col*19+row*17)%13)/12, wave=t-hit.release;
   const mark=smooth(-35,56,wave)*(1-smooth(59,191,wave));
   const dx=(col-4)*cell,dy=(row-12)*cell-.055,side=col===4?(h>.45?1:-1):Math.sign(dx);
   const x=dx+toward*(side*(.12+.14*h)+dx*.28);
   const y=dy-toward*(.015+.089*h);
   const w=cell*(.975-.41*toward), hh=cell*(.975-.54*toward);
   const a=q.alpha*hit.visible*(.72+.22*mark);
   const colr=blend(base,cold,.35+h*.55),hi=blend(colr,hot,.23+mark*.75);
   g.quad([x-w/2,y-hh/2],[x+w/2,y-hh/2],[x+w/2,y+hh/2],[x-w/2,y+hh/2],colr,hi,colr,edge,a*.76,a*.85,a*.61,a*.47,.04,.13,.04,.015);
 }
 }
 const f=q.hold*q.alpha*(1-smooth(285,590,t));
 disc(g,[0,.025],.57,.097,hot,f*.13,.035,0,16);
 return {p,contact:p,lum:f*.26,stage:q.stage,progress:q.spread,triangles:(g.length-from)/24,branches:[]};
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
