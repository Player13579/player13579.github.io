import {VERSION,LIFE,stateAt,admit} from './plan.mjs';
const TYPE='local-thrown-mineral-water-preview';
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
 return {source:'authoritative-event-replay',phase:'playing',stale:false,selfId:OWNER,observedAt:stamp,event:{id:'magic_dot_thrown_water_r3_'+n,type:'gain-stamina',effectKind:'stamina',radius:82,durationMs:1500,variant:'mineral-water:thrown',playerId:OWNER,at:stamp-1}};
}
export function basis(){return {floor:[0,0],p:[.4,-.865],shoulder:[0,-1.14],e:[1,0]}}
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
  const elbow=add(b.shoulder,[.24,.29],1), glove=b.p;
  strip(g,add(b.shoulder,b.e,.09),elbow,.122,.100,[.125,.154,.182],lights,.72);
  strip(g,elbow,glove,.091,.064,[.083,.12,.154],lights,.71);
  disc(g,glove,.080,.075,lit([.128,.157,.181],glove,lights,b.e,1),1,0,1,8);
}
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),start=g.length,p=[.40,-.135],a=q.opacity,l=q.light;
 if(a<=0)return {p,contact:p,lum:0,stage:'off',triangles:0,branches:[]};
 const deep=[.045,.245,.37], facet=[.14,.55,.74], glint=[.69,1.11,1.25];
 // A single attached vertical sheet. v=.52 is its fold, not a second wave.
 const point=(u,v)=>{
   const taper=Math.pow(Math.max(0,Math.sin(Math.PI*u)),.63),
         height=reduced?.41:mix(.45,.11,q.drain), y=-.025-height*(1-u),
         ridge=.36+.075*u, spread=(.25-.19*q.drain)*taper,
         across=v-.21, pleat=Math.max(0,1-Math.abs(v-.50)*2);
   return [ridge+across*spread+.032*pleat*taper, y+.08*across*taper];
 };
 const shade=(u,v)=>{
   const taper=Math.pow(Math.max(0,Math.sin(Math.PI*u)),.7),
         crease=Math.exp(-(((v-.51)/.15)**2)),
         descending=reduced?.30:Math.exp(-(((u-mix(.12,.85,q.reach))/.21)**2));
   const material=.35+.52*crease;
   return {c:deep.map((x,k)=>mix(mix(x,facet[k],material),glint[k],crease*(.12+.50*l*descending))),
     alpha:a*taper*(.30+.47*crease)*(1-.53*Math.pow(Math.abs(v-.52)*2,1.4)),
     emit:taper*(.04+.13*crease+.23*crease*l*descending)};
 };
 const across=[0,.16,.32,.51,.70,.86,1];
 for(let j=0;j<12;j++)for(let i=0;i<across.length-1;i++){
   const u=j/12,v=(j+1)/12,w=across[i],x=across[i+1],args=[[u,w],[v,w],[v,x],[u,x]],
         values=args.map(k=>shade(...k));
   g.quad(...args.map(k=>point(...k)),...values.map(x=>x.c),...values.map(x=>x.alpha),...values.map(x=>x.emit));
 }
 return {p,contact:p,lum:a*(.12+.21*l),stage:t<218?'attached':'fold-down',progress:q.reach,
    triangles:(g.length-start)/24,branches:[{p:point(reduced?.55:mix(.18,.76,q.reach),.5),lum:a*(.05+.24*l)}]};
}
export function fillSfx(rate){
 const n=Math.round(rate*.96), data=new Float32Array(n);let peak=0,z=0;
 for(let i=0;i<n;i++){
   const t=i/rate,h=t-.09, w=h>0?smooth(0,.083,h)*(1-smooth(.21,.75,h)):0;
   z=.75*z+.25*Math.sin(i*2.399+Math.sin(i*.423)*9.2);
   const h2=Math.max(0,h-.13), lip=smooth(0,.07,h2)*Math.exp(-8*h2);
   const f=w===0?0:w*(.041*z+.048*lip*Math.sin(2*Math.PI*(530*h2-205*h2*h2))+.022*Math.sin(2*Math.PI*(160*h+32*h*h)));
   data[i]=f;peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
