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
 return {source:'authoritative-event-replay',phase:'playing',stale:false,selfId:OWNER,observedAt:stamp,event:{id:'magic_dot_mineral_self_'+n,type:'gain-stamina',effectKind:'stamina',radius:82,durationMs:1500,variant:'mineral-water:use',playerId:OWNER,at:stamp-1}};
}
const hand=q=>[mix(.40,.485,q.lift),mix(-.865,-1.407,q.lift)];
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
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),start=g.length,p=hand(q),a=q.opacity,l=q.light;
 if(a<=0)return {p,contact:p,lum:0,stage:'off',triangles:0,branches:[]};
 const tilt=-.21-1.63*q.tilt, axis=[Math.sin(tilt),-Math.cos(tilt)], wide=[-axis[1],axis[0]];
 const tr=(x,y)=>[p[0]+wide[0]*x+axis[0]*y,p[1]+wide[1]*x+axis[1]*y];
 const outline=[[-.096,-.17],[.096,-.17],[.124,-.12],[.124,.20],[.082,.265],[.042,.30],[.042,.355],[-.042,.355],[-.042,.30],[-.082,.265],[-.124,.20],[-.124,-.12]];
 const shape=outline.map(x=>tr(...x)), inside=outline.map(([x,y])=>tr(x*.78,y*.77));
 const enamel=[.57,.77,.94], teal=[.21,.70,.81], hot=[.82,1.22,1.38];
 const rim=(i)=>i>=3&&i<=9?hot:enamel;
 for(let i=0;i<shape.length;i++){
   const j=(i+1)%shape.length;
   g.quad(shape[i],shape[j],inside[j],inside[i],rim(i),rim(j),teal,teal,a*.55,a*.55,a*.31,a*.31,.033+l*.05);
 }
 const line=p[1]-.028-.055*q.tilt;
 const clipped=[];
 for(let i=0;i<inside.length;i++){
   const v=inside[i],w=inside[(i+1)%inside.length], va=v[1]>=line,wb=w[1]>=line;
   if(va)clipped.push(v);
   if(va!==wb){const u=(line-v[1])/(w[1]-v[1]);clipped.push([mix(v[0],w[0],u),line]);}
 }
 const tint=v=>teal.map((x,i)=>mix(x,hot[i],Math.max(0,1-Math.abs(v[1]-line)*18)*(.18+.65*l)));
 for(let i=1;i<clipped.length-1;i++)g.tri(clipped[0],clipped[i],clipped[i+1],tint(clipped[0]),tint(clipped[i]),tint(clipped[i+1]),a*.56,a*.56,a*.56,.034+.063*l);
 g.quad(tr(-.047,.316),tr(.047,.316),tr(.047,.354),tr(-.047,.354),[.45,.80,.85],hot,hot,[.45,.80,.85],a*.83,a*.83,a*.79,a*.79,.072+.042*l);
 disc(g,add(p,[.049,.019],1),.047,.043,[.128,.163,.181],.96,0,1,8);
 return {p,contact:p,lum:a*(.06+.16*l),stage:t<400?'lift':t<690?'tilt':'return',progress:q.lift,triangles:(g.length-start)/24,branches:[{p:tr(.04,.116),lum:a*(.09+.28*l)}]};
}
export function fillSfx(rate){
 const data=new Float32Array(Math.round(rate*.95));let peak=0,z=0;
 for(let i=0;i<data.length;i++){
   const t=i/rate,h=t-.345,w=h>0?smooth(0,.085,h)*(1-smooth(.19,.53,h)):0;
   z=.76*z+.24*Math.sin(i*2.331+Math.sin(i*.323)*6.4);
   data[i]=w===0?0:w*(.039*z+.033*Math.sin(2*Math.PI*(416*h-134*h*h))+.020*Math.sin(2*Math.PI*(719*h-305*h*h)));
   peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
