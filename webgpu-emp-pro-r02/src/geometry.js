/** Original r0.2 digital information-field solids. No image textures, sprite masks or imported artwork. */
import {clamp,smooth} from './contract.js';
export const STRIDE=16;
export const COLORS=Object.freeze({cyan:[.055,.69,.90],mint:[.17,.93,.66],indigo:[.105,.17,.37],blue:[.06,.32,.66],
 white:[.86,.985,1],dark:[.011,.028,.049],amber:[1,.37,.075],pearl:[1,.78,.47],slate:[.12,.18,.24]});
const PI=Math.PI,TAU=PI*2;
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const d=Math.hypot(...a);return d<1e-8?[1,0,0]:mul(a,1/d);};
const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
export function rotate(p,rx=0,ry=0,rz=0){let[x,y,z]=p,c=Math.cos(rx),s=Math.sin(rx);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(ry);s=Math.sin(ry);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(rz);s=Math.sin(rz);return[x*c-y*s,x*s+y*c,z];}
export class MeshBuilder{
 constructor(){this.solid=[];this.trans=[];this.branchStats=[];this.count=0;}
 tri(a,b,c,color,alpha=1,emit=.3,pattern=0,opaque=false){if(alpha<.003)return;const n=norm(cross(sub(b,a),sub(c,a)));const v=[];for(const[p,uv]of[[a,[0,0]],[b,[1,0]],[c,[1,1]]])v.push(...p,...n,...color,clamp(alpha),emit,pattern,...uv,0,0);const t={z:(a[2]+b[2]+c[2])/3,v};(opaque?this.solid:this.trans).push(t);this.count++;}
 quad(a,b,c,d,color,alpha=1,emit=.3,pattern=0,opaque=false){this.tri(a,b,c,color,alpha,emit,pattern,opaque);this.tri(a,c,d,color,alpha,emit,pattern,opaque);}
 line(a,b,width,color,alpha=1,emit=2){if(Math.hypot(...sub(b,a))<1e-7||width<=0)return;const dir=norm(sub(b,a)),v=norm(cross(dir,[0,0,1])),off=mul(v,width/2);this.quad(add(a,off),add(b,off),sub(b,off),sub(a,off),color,alpha,emit,2);}
 rod(a,b,r,color,alpha=1,emit=.3,facets=4){if(Math.hypot(...sub(b,a))<1e-7)return;const ax=norm(sub(b,a)),v=norm(cross(ax,Math.abs(ax[2])>.9?[0,1,0]:[0,0,1])),w=cross(ax,v);for(let k=0;k<facets;k++){const u=TAU*k/facets,vv=TAU*(k+1)/facets;const d=add(mul(v,r*Math.cos(u)),mul(w,r*Math.sin(u))),dd=add(mul(v,r*Math.cos(vv)),mul(w,r*Math.sin(vv)));this.quad(add(a,d),add(b,d),add(b,dd),add(a,dd),color,alpha,emit);this.tri(a,add(a,dd),add(a,d),color,alpha,emit*.6);this.tri(b,add(b,d),add(b,dd),color,alpha,emit);}}
 plate(points,depth,color,alpha=1,emit=.25,edge=true){const back=points.map(p=>add(p,[0,0,-depth]));for(let i=1;i<points.length-1;i++){this.tri(points[0],points[i],points[i+1],color,alpha,emit);this.tri(back[0],back[i+1],back[i],COLORS.dark,alpha*.9,.25);}for(let i=0;i<points.length;i++){const j=(i+1)%points.length;this.quad(points[i],back[i],back[j],points[j],mul(color,.38),alpha,emit*.4);if(edge&&i%2===0)this.line(points[i],points[j],1.25,color,alpha,1.35);}}
 ribbon(points,width,color,alpha=1,emit=.6){for(let i=0;i<points.length-1;i++)this.rod(points[i],points[i+1],width/2,color,alpha,emit);}
 finish(){this.trans.sort((a,b)=>a.z-b.z);return{opaque:new Float32Array(this.solid.flatMap(t=>t.v)),transparent:new Float32Array(this.trans.flatMap(t=>t.v)),triangleCount:this.count,branches:this.branchStats};}
}
const world=s=>[s.origin.x,-s.origin.y,0];
const place=(o,p)=>add(o,p);
function face(m,o,x,y,w,h,z,color,a=1,em=.25,tilt=0){const pts=[[-w/2,-h/2,0],[w/2-3,-h/2,0],[w/2,h/2-3,0],[w/2-3,h/2,0],[-w/2,h/2,0]].map(p=>place(o,add(rotate(p,0,tilt,0),[x,y,z])));m.plate(pts,3.5,color,a,em);}
function charge(m,s,quality){const o=world(s),t=s.seconds,p=clamp(t/1.2),f=s.envelope;
 const info=s.information,ready=info.latch,capt=info.capture,open=s.terminalQ;
 // Four coupled shutters: captured -> interdigitated -> steady held. Not a radial ring.
 for(let side of[-1,1])for(let bank=0;bank<2;bank++){
  const depth=bank===0?-15:16,dy=(bank===0?1:-1)*7;
  const gap=45-(22*info.compression)+open*17;
  const local=u=>place(o,add(rotate(u,0,side*(.62-.42*p),side*(.17*(1-p))),[side*gap,dy,depth]));
  m.plate([[-7,-27,0],[6,-21,0],[7,21,0],[-7,27,0]].map(local),4,COLORS.dark,capt*f*.95,.24);
  for(let i=0;i<4;i++){
   const row=-21+i*14,engage=info.rows[i].capture,withdraw=info.rows[i].retract;
   const x=-side*(4+8*engage-10*withdraw);
   const a=local([x,row,2]),b=local([x+side*15,row+side*4,2]);
   m.rod(a,b,2.5,bank?COLORS.cyan:COLORS.blue,capt*f*(1-withdraw),.8);
   m.line(add(a,[0,1.5,2]),add(b,[0,1.5,2]),1.5,COLORS.white,capt*f*(.4+.6*ready)*(1-withdraw),2.7);
  }
  m.line(local([side*6,-25,4]),local([side*6,25,4]),1.7,COLORS.mint,capt*f,.8+ready*1.8);
 }
 // Three axial slots stay disjoint from the protected head/torso of a host character.
 for(let i=0;i<3;i++){const y=-18+i*18,k=smooth(.34+i*.13,.75+i*.13,t)*(1-smooth(.15+i*.15,.60+i*.15,open));
  for(let side of[-1,1]){m.line(place(o,[side*10,y,20]),place(o,[side*18,y+4,20]),2.2,COLORS.white,k*f,3.4);}
 }
}
function samplePath(points,u){u=clamp(u);const n=points.length-1,x=u*n,i=Math.min(n-1,Math.floor(x));return mix(points[i],points[i+1],x-i);}
function cutPath(points,a,b){a=clamp(a);b=clamp(b);if(b<=a)return[];const p=[samplePath(points,a)];for(let i=1;i<points.length-1;i++){const u=i/(points.length-1);if(u>a&&u<b)p.push(points[i]);}p.push(samplePath(points,b));return p;}
function normal(m,s,quality){const e=s.event.binding,o=world(s),t=s.seconds,env=s.envelope;
 const info=s.information,gate=info.sourceReadout;
 for(let side of[-1,1]){
  const x=side*(16+16*smooth(0,.12,t));
  face(m,o,x,0,9,49,side*9,COLORS.dark,gate*env,.6,side*.35);
  m.line(place(o,[x,-24,12]),place(o,[x,24,12]),2.3,COLORS.white,gate*env,3.7);
 }
 for(const target of e.targets??[]){
  const end=[target.position.x,-target.position.y,0],delta=sub(end,o),d=Math.hypot(delta[0],delta[1]);
  const unit=d>1e-6?mul(delta,1/d):[1,0,0],perp=[-unit[1],unit[0],0];
  const arrival=info.receiverCommit;
  if(d>1e-6){for(let lane=-1;lane<=1;lane++){
   const bend=lane*11;
   // Transport follows three finite folded address lanes, not a scanline decoration.
   const nodes=[[0,0],[.21,0],[.26,bend+5],[.48,bend+5],[.53,bend-5],[.74,bend-5],[.80,0],[1,0]];
   const points=nodes.map(([q,y])=>add(add(o,mul(delta,q)),add(mul(perp,y),[0,0,lane*10])));
   const front=info.head,tail=info.tail;const pp=cutPath(points,tail,front);
   if(pp.length>1){m.ribbon(pp,lane===0?7:4.5,lane===0?COLORS.dark:COLORS.cyan,env*.97,.7);m.ribbon(pp.map(p=>add(p,[0,0,3])),1.8,COLORS.white,env,3.6);}
   // Four finite packet cells distributed along the existing transport path, not particle noise.
   for(let j=0;j<4;j++){const u=front-j*.105;if(u<tail||u<0||u>1)continue;const pos=samplePath(points,u),w=lane===0?9:6;
    const pp2=[[-5,-w,0],[7,-w*.40,0],[10,0,0],[7,w*.4,0],[-5,w,0]].map(v=>add(pos,add(add(mul(unit,v[0]),mul(perp,v[1])),[0,0,5])));
    m.plate(pp2,3,lane===0?COLORS.cyan:COLORS.blue,env*.84,.85);m.line(pp2[1],pp2[2],2,COLORS.white,env,3.2);
   }
  }}
  // Zero distance has no fake transfer ray; the local receiver still latches/terminates.
  const localArrival=d<=1e-6?smooth(0,.04,t)*(1-smooth(.25,.51,t)):arrival;
  for(let side of[-1,1])for(let i=0;i<3;i++){
   const gone=smooth(.30+i*.035,.41+i*.035,t),y=(i-1)*17;
   const pos=add(end,add(mul(perp,y),mul(unit,side*(9+gone*15))));
   m.rod(add(pos,mul(perp,-6)),add(pos,mul(perp,6)),2.4,COLORS.cyan,localArrival*env*(1-gone),.8);
   m.line(add(pos,mul(perp,-5)),add(pos,mul(unit,side*8)),2,COLORS.white,localArrival*env*(1-gone),3);
  }
 }
}
function ingress(m,s,t,colorA=COLORS.cyan,colorB=COLORS.mint){const o=world(s);for(const[p,col,sign]of[[s.event.binding.a,colorA,-1],[s.event.binding.b,colorB,1]]){
 const a=[p.x,-p.y,-10],delta=sub(o,a),d=Math.hypot(...delta);if(d<1e-6)continue;
 const path=[a,add(a,mul(delta,.35)),add(add(a,mul(delta,.68)),[0,sign*12,sign*10]),o];
 const pp=cutPath(path,clamp((t-.13)/.22),clamp(t/.22));if(pp.length>1){m.ribbon(pp,5,col,s.envelope*.9,.65);m.ribbon(pp.map(p=>add(p,[0,0,3])),1.8,COLORS.white,s.envelope,3);}
}}
function resonance(m,s,quality){const o=world(s),t=s.seconds,env=s.envelope;ingress(m,s,t);
 const info=s.information,appear=info.acquire;const terminal=s.terminalQ;
 // Six independent, hinged volume branches surround a split core; no full-scene scale animation.
 for(let k=0;k<6;k++){
  const a=TAU*k/6+.16,phase=k%3*.028;
  const unfold=info.routes[k].unfold;
  const release=info.routes[k].retire,alpha=appear*env*(1-smooth(.78,1,release));
  const transform=p=>place(o,rotate(p,.30+.20*(1-unfold),.36,a));
  const length=57+13*(k%2);const bend=(k%2?1:-1)*(17-12*unfold);
  const root=[12,7,0],joint=[24+length*.4*unfold,bend,7*(k%2?1:-1)],tip=[26+length*unfold,bend*.45,2];
  const pts=[root,joint,tip];
  // Three sequential material sections with an actual widening slit between them on extinction.
  for(let j=0;j<3;j++){
   const fade=1-smooth(j*.20,j*.20+.48,release),u0=j/3,u1=(j+1)/3;
   const mid0=samplePath(pts,u0),mid1=samplePath(pts,u1),shift=[(j-1)*release*7,release*(k%2?1:-1)*j*9,j*release*6];
   const p0=add(mid0,shift),p1=add(mid1,shift),w=(8-j*1.2)*(1-.25*release);
   const poly=[add(p0,[0,-w,0]),add(p1,[0,-w*.4,0]),add(p1,[5,w*.35,0]),add(p0,[0,w,0])].map(transform);
   m.plate(poly,7,j%2?COLORS.blue:COLORS.cyan,alpha*fade*(j===1?.74:.86),.45+j*.08);
   m.line(transform(add(p0,[0,-w+1,3])),transform(add(p1,[2,-w*.4+1,3])),2.4,COLORS.white,alpha*fade,3.9);
   if(quality!=='low')m.rod(transform(add(p0,[1,w-2,-4])),transform(add(p1,[0,w*.3,-4])),1.5,COLORS.mint,alpha*fade*.65,.8);
  }
  // A transverse dark notch and high-value edge make structure readable at 64px reference size.
  const notch=transform([21+33*unfold,0,10]);face(m,notch,0,0,8,13,0,COLORS.dark,alpha*(1-release),.15,.3);
 }
 // A six-input interlock becomes one shared routing spine. Bent bridges occupy
 // different depths and acquire sequentially; without bloom the shared topology remains.
 for(let j=0;j<3;j++){
  const commit=smooth(.20+j*.035,.47+j*.035,t),retire=clamp(smooth(.94+j*.10,1.35+j*.07,t)+terminal);
  const a=appear*commit*(1-retire)*env,y=-24+j*24,z=-8+j*10;
  const bridge=[[-21,y-4,z],[-7,y-4,z],[-7,y+6,z+5],[8,y+6,z+5],[8,y-1,z],[21,y-1,z]].map(p=>place(o,p));
  m.ribbon(bridge,6,COLORS.dark,a,.22);m.ribbon(bridge.map(p=>add(p,[0,0,3])),2.0,COLORS.mint,a,1.4);
  for(let side of[-1,1])face(m,o,side*22,y,6,11,z+4,COLORS.cyan,a,.85,side*.3);
 }
 const coreFade=appear*(1-smooth(1.22,1.58,t))*env;
 for(let side of[-1,1]){
  const hinge=info.coreOpen,close=info.coreRetire;
  const x=side*(6+8*hinge+clamp(close)*7);
  const tf=p=>place(o,rotate(add(p,[x,0,side*8]),.12,side*.3,.12));
  const poly=[[0,-44,2],[side*13,-18,0],[side*10,31,0],[0,47,3],[-side*3,19,6]].map(tf);
  m.plate(poly,10,COLORS.dark,coreFade,.35);
  m.line(tf([0,-42,7]),tf([0,45,7]),2.7,COLORS.white,coreFade,4.2);
  for(let i=0;i<4;i++)m.line(tf([side*4,-24+i*16,8]),tf([side*11,-20+i*16,8]),1.8,COLORS.mint,coreFade,.95);
 }
}
function cancellation(m,s,quality){const o=world(s),t=s.seconds,env=s.envelope;ingress(m,s,t,COLORS.cyan,COLORS.amber);
 const info=s.information,terminal=s.terminalQ,appear=info.acquire,close=smooth(1.1,1.56,t);
 // Height stays legible while an ordered front deletes rows. Each tooth has its own path.
 for(let row=0;row<7;row++)for(let side of[-1,1]){
  const inter=info.rows[row].interleave;
  const extinct=info.rows[row].consumed,f=appear*(1-smooth(.62,1,extinct))*env;
  if(f<.003)continue;
  const x=side*(61*(1-inter)+11*(1-extinct)),y=45-row*15+side*(6-3*inter);
  const slide=side*12*extinct,z=side===-1?-10:15;
  const col=side<0?COLORS.cyan:COLORS.amber;
  // Hooked wedge with body, underside and front tine. It translates/interlocks then is consumed.
  const remaining=1-extinct;
  const p=[[-side*20*remaining,-4,0],[side*10*remaining,-4,0],[side*10*remaining,2,0],[0,5,0],[-side*20*remaining,5,0]].map(v=>place(o,add(rotate(v,0,side*.22,side*.10*(1-inter)),[x-slide,y,z])));
  m.plate(p,6,col,f*.84,.55);
  m.line(add(p[0],[0,0,2]),add(p[1],[0,0,2]),2.1,side<0?COLORS.white:COLORS.pearl,f,2.9);
  // Remaining trace runs into, never out of, the null boundary.
  const approach=place(o,[side*(9*(1-extinct)),y,8]);m.line(add(p[1],[0,0,2]),approach,1.6,col,f*.7,1.2);
 }
 const seamFade=appear*(1-close)*env;
 // A narrow split-depth absence, not a semitransparent fullscreen rectangle.
 for(let side of[-1,1]){
  const x=side*(4+3*(1-smooth(.30,.65,t))),top=info.nullFrontY;
  const bottom=-52;
  if(top>bottom){const poly=[[x,bottom,23],[x+side*6,bottom+8,18],[x+side*8,top-4,18],[x,top,23]].map(p=>place(o,p));
   m.plate(poly,9,COLORS.dark,seamFade,.18);m.line(place(o,[x,bottom,24]),place(o,[x,top,24]),1.6,side<0?COLORS.cyan:COLORS.amber,seamFade,1.8);
  }
 }
}
function suppression(m,s,quality){const o=world(s),t=s.seconds,env=s.envelope,q=s.terminalQ,info=s.information,latch=info.latch;
 for(let side of[-1,1]){
  const x=side*(31-8*latch+q*14);
  const pts=[[x,-29,-9],[x+side*6,-24,-9],[x+side*6,25,-9],[x,29,-9]].map(p=>place(o,p));
  m.plate(pts,5,COLORS.dark,env*.97,.3);
  m.line(place(o,[x,-28,-6]),place(o,[x,28,-6]),1.8,COLORS.cyan,env,.85);
  for(let i=0;i<4;i++){
   const z=i%2===0?17:-17,slide=info.rows[i].unlatch,y=-25+i*15;
   const f=(1-slide)*env;const start=place(o,[x,y,z]),end=place(o,[side*(9+12*slide),y+3,z]);
   m.rod(start,end,2.3,COLORS.blue,f,.6);m.line(add(start,[0,2,2]),add(end,[0,2,2]),1.7,COLORS.mint,f,1.65);
   face(m,o,x-side*3,y,5,6,z+3,COLORS.cyan,f,.8);
  }
 }
 // Two rear shelves are body-occluded; two short front latches never cover the head.
 for(let i=0;i<2;i++){const f=(1-smooth(.14+i*.18,.65+i*.18,q))*env;
  m.rod(place(o,[-22,-13+i*29,-20]),place(o,[22,-13+i*29,-20]),1.9,COLORS.blue,f,.65);
  for(let side of[-1,1])m.line(place(o,[side*11,-14+i*15,19]),place(o,[side*19,-14+i*15,19]),2,COLORS.white,f,2);
 }
}
function occluders(m,items){for(const b of items){const color=b.color??COLORS.slate,z=b.depth??0;
 if(b.polygon){const p=b.polygon.map(v=>[v.x,-v.y,z]);for(let i=1;i<p.length-1;i++)m.tri(p[0],p[i],p[i+1],color,1,.60,0,true);}
 else {const x=b.x,y=-b.y,w=b.w,h=b.h;m.quad([x,y,z],[x+w,y,z],[x+w,y-h,z],[x,y-h,z],color,1,.60,0,true);}
}}
const BUILDERS={charge,normal,resonance,cancellation,suppression};
export function buildGeometry(samples,{quality='high',occlusion=[]}={}){const m=new MeshBuilder();occluders(m,occlusion);for(const s of samples){const before=m.count;BUILDERS[s.kind](m,s,quality);m.branchStats.push({id:s.event.id,kind:s.kind,phase:s.phase,triangles:m.count-before,authorityActive:s.authorityActive,informationOperation:s.information.operation});}return m.finish();}
