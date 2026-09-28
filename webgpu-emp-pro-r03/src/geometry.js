/** r0.3 digital information-field solids. No image textures, sprite masks or imported artwork. */
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
function slab(m,center,dir,perp,back,front,wBack,wFront,color,alpha=1,emit=.4,depth=4,z=0){const lift=[0,0,z];m.plate([
 add(add(center,lift),add(mul(dir,-back),mul(perp,-wBack))),
 add(add(center,lift),add(mul(dir,front),mul(perp,-wFront))),
 add(add(center,lift),add(mul(dir,front),mul(perp,wFront))),
 add(add(center,lift),add(mul(dir,-back),mul(perp,wBack)))],depth,color,alpha,emit);}
function wedge(m,center,dir,perp,back,front,wBack,wMid,color,alpha=1,emit=.6,depth=4,z=0){const lift=[0,0,z],tip=add(add(center,lift),mul(dir,front));m.plate([
 add(add(center,lift),add(mul(dir,-back),mul(perp,-wBack))),
 add(add(center,lift),add(mul(dir,front*.30),mul(perp,-wMid))),
 tip,
 add(add(center,lift),add(mul(dir,front*.30),mul(perp,wMid))),
 add(add(center,lift),add(mul(dir,-back),mul(perp,wBack)))],depth,color,alpha,emit);}
function samplePath(points,u){u=clamp(u);const n=points.length-1,x=u*n,i=Math.min(n-1,Math.floor(x));return mix(points[i],points[i+1],x-i);}
function cutPath(points,a,b){a=clamp(a);b=clamp(b);if(b<=a)return[];const p=[samplePath(points,a)];for(let i=1;i<points.length-1;i++){const u=i/(points.length-1);if(u>a&&u<b)p.push(points[i]);}p.push(samplePath(points,b));return p;}
function charge(m,s,quality){const o=world(s),t=s.seconds,p=clamp(t/1.2),f=s.envelope;
 const info=s.information,ready=info.latch,capt=info.capture,open=s.terminalQ;
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
 if(quality!=='low'&&ready>.55&&!s.terminal){slab(m,o,[0,1,0],[1,0,0],17,17,4.5,8,COLORS.cyan,ready*f*.45,1.1,5,22);m.line(place(o,[-15,0,24]),place(o,[15,0,24]),2,COLORS.white,ready*f*.85,3.8);}
 for(let i=0;i<3;i++){const y=-18+i*18,k=smooth(.34+i*.13,.75+i*.13,t)*(1-smooth(.15+i*.15,.60+i*.15,open));for(let side of[-1,1])m.line(place(o,[side*10,y,20]),place(o,[side*18,y+4,20]),2.2,COLORS.white,k*f,3.4);}
}
function normal(m,s,quality){const e=s.event.binding,o=world(s),t=s.seconds,env=s.envelope;
 const info=s.information,gate=info.sourceReadout;
 for(let side of[-1,1]){
  const x=side*(18+14*smooth(0,.10,t));
  face(m,o,x,0,13,54,side*10,COLORS.dark,gate*env,.7,side*.35);
  slab(m,place(o,[x,0,7]),[0,1,0],[1,0,0],22,22,2.4,3.2,COLORS.cyan,gate*env*.55,1.2,4);
  m.line(place(o,[x,-25,14]),place(o,[x,25,14]),2.4,COLORS.white,gate*env,4.2);
 }
 for(const target of e.targets??[]){
  const end=[target.position.x,-target.position.y,0],delta=sub(end,o),d=Math.hypot(delta[0],delta[1]);
  const unit=d>1e-6?mul(delta,1/d):[1,0,0],perp=[-unit[1],unit[0],0],arrival=info.receiverCommit;
  if(d>1e-6){
   const jog=18+10*smooth(0,.08,t);
   const nodes=[[0,0],[.13,0],[.20,jog*.5],[.38,jog*.5],[.50,0],[.66,-jog*.32],[.82,-jog*.32],[1,0]];
   const points=nodes.map(([q,y],i)=>add(add(o,mul(delta,q)),add(mul(perp,y),[0,0,(i%2===0?5:-5)])));
   const front=info.head,tail=info.tail,pp=cutPath(points,tail,front);
   if(pp.length>1){
    m.ribbon(pp,12,COLORS.dark,env*.42,.18);
    m.ribbon(pp.map(p=>add(p,[0,0,2])),7.4,COLORS.blue,env*.72,.8);
    m.ribbon(pp.map(p=>add(p,[0,0,5])),3.0,COLORS.white,env*.96,4.8);
    for(const side of[-1,1]){const rail=pp.map((p,i)=>add(add(p,mul(perp,side*(8-2*(i/Math.max(1,pp.length-1))))),[0,0,1]));m.ribbon(rail,2.3,COLORS.cyan,env*.44,.75);}
   }
   const launch=smooth(0,.08,t)*(1-smooth(.10,.20,t));
   for(const side of[-1,1])wedge(m,add(o,add(mul(unit,12),mul(perp,side*8))),unit,perp,7,12,4.8,2.5,COLORS.cyan,launch*env*.7,1.3,4,3);
   for(let j=0;j<4;j++){
    const u=front-j*.12;if(u<tail||u<0||u>1)continue;
    const pos=samplePath(points,u),lift=(j%2===0?6:9);
    wedge(m,add(pos,[0,0,lift]),unit,perp,9,12,7-(j*.6),3.8,COLORS.cyan,env*.86*(1-j*.09),1.2,5);
    wedge(m,add(pos,[0,0,lift+4]),unit,perp,5,9,2.6,1.6,COLORS.white,env*.98*(1-j*.08),5.2,3);
    if(quality!=='low')for(const side of[-1,1])slab(m,add(pos,add(mul(perp,side*7),[0,0,lift-2])),unit,perp,5,6,1.4,2.1,COLORS.mint,env*.44,1.0,3);
   }
  }
  const localArrival=d<=1e-6?smooth(0,.04,t)*(1-smooth(.25,.51,t)):arrival;
  const commit=localArrival*env;
  if(commit>.002){
   slab(m,add(end,[0,0,-2]),unit,perp,12,12,15,15,COLORS.dark,commit*.65,.18,8,0);
   slab(m,add(end,mul(unit,3)),unit,perp,8,10,10,13,COLORS.cyan,commit*.28,1.1,6,6);
   m.rod(add(end,mul(perp,-15)),add(end,mul(perp,15)),3.4,COLORS.blue,commit*.74,.6);
   m.line(add(end,mul(perp,-14)),add(end,mul(perp,14)),2.2,COLORS.white,commit,5.4);
   for(const side of[-1,1]){
    wedge(m,add(end,add(mul(perp,side*11),[0,0,8])),mul(unit,-1),perp,6,10,5.5,2.8,side<0?COLORS.cyan:COLORS.mint,commit*.85,1.0,5);
    wedge(m,add(end,add(mul(unit,side*8),[0,0,5])),perp,mul(unit,side),5,8,4.4,2.4,COLORS.blue,commit*.56,.85,4);
   }
   for(let i=0;i<3;i++){
    const decay=smooth(.30+i*.035,.41+i*.035,t),offset=(i-1)*18;
    const p=add(end,add(mul(perp,offset),mul(unit,11+decay*10)));
    m.rod(add(p,mul(perp,-7)),add(p,mul(perp,7)),2.6,COLORS.cyan,commit*(1-decay),.9);
    m.line(add(p,mul(perp,-6)),add(p,mul(unit,8)),1.8,COLORS.white,commit*(1-decay),3.4);
   }
  }
 }
}
function ingress(m,s,t,colorA=COLORS.cyan,colorB=COLORS.mint){const o=world(s);for(const[p,col,sign]of[[s.event.binding.a,colorA,-1],[s.event.binding.b,colorB,1]]){
 const a=[p.x,-p.y,-10],delta=sub(o,a),d=Math.hypot(...delta);if(d<1e-6)continue;
 const path=[a,add(a,mul(delta,.24)),add(add(a,mul(delta,.54)),[0,sign*16,sign*8]),add(add(a,mul(delta,.80)),[0,sign*6,sign*5]),o];
 const pp=cutPath(path,clamp((t-.10)/.24),clamp(t/.24));if(pp.length>1){m.ribbon(pp,8,COLORS.dark,s.envelope*.45,.15);m.ribbon(pp.map(p=>add(p,[0,0,2])),5.2,col,s.envelope*.92,.92);m.ribbon(pp.map(p=>add(p,[0,0,5])),2.2,COLORS.white,s.envelope,4.2);}}
}
function resonance(m,s,quality){const o=world(s),t=s.seconds,env=s.envelope;ingress(m,s,t);
 const info=s.information,appear=info.acquire;const terminal=s.terminalQ;
 for(let k=0;k<6;k++){
  const a=TAU*k/6+.16,unfold=info.routes[k].unfold,release=info.routes[k].retire;
  const alpha=appear*env*(1-smooth(.78,1,release));if(alpha<.003)continue;
  const transform=p=>place(o,rotate(p,.28+.20*(1-unfold),.34,a));
  const length=60+12*(k%2),bend=(k%2?1:-1)*(20-14*unfold);
  const root=[14,6,0],joint=[26+length*.35*unfold,bend,8*(k%2?1:-1)],tip=[30+length*unfold,bend*.40,3];
  const pts=[root,joint,tip];
  for(let j=0;j<3;j++){
   const fade=1-smooth(j*.20,j*.20+.48,release),u0=j/3,u1=(j+1)/3,mid0=samplePath(pts,u0),mid1=samplePath(pts,u1),shift=[(j-1)*release*8,release*(k%2?1:-1)*j*10,j*release*7];
   const p0=add(mid0,shift),p1=add(mid1,shift),w=(11-j*1.5)*(1-.22*release),poly=[add(p0,[0,-w,0]),add(p1,[0,-w*.48,0]),add(p1,[6,w*.34,0]),add(p0,[0,w,0])].map(transform);
   m.plate(poly,8,j%2?COLORS.blue:COLORS.cyan,alpha*fade*(j===1?.78:.88),.55+j*.10);
   m.line(transform(add(p0,[0,-w+1.5,4])),transform(add(p1,[2,-w*.4+1.5,4])),2.8,COLORS.white,alpha*fade,4.9);
   if(quality!=='low')m.rod(transform(add(p0,[1,w-2,-4])),transform(add(p1,[0,w*.26,-4])),1.8,COLORS.mint,alpha*fade*.72,.9);
  }
  const notch=transform([24+36*unfold,0,10]);face(m,notch,0,0,10,15,0,COLORS.dark,alpha*(1-release),.16,.3);
 }
 const coreFade=appear*(1-smooth(1.22,1.58,t))*env;
 if(coreFade>.002){
  const hub=[[0,-32,6],[22,-18,8],[24,18,8],[0,34,6],[-24,18,8],[-22,-18,8]].map(p=>place(o,p));
  m.plate(hub,14,COLORS.dark,coreFade*.92,.28);
  for(let j=0;j<3;j++){
   const commit=smooth(.18+j*.03,.45+j*.03,t),retire=clamp(smooth(.95+j*.10,1.35+j*.07,t)+terminal),a=appear*commit*(1-retire)*env,y=-22+j*22,z=-5+j*10;
   slab(m,place(o,[0,y,z]),[1,0,0],[0,1,0],23,23,6.5,6.5,COLORS.blue,a*.62,.30,7);
   slab(m,place(o,[0,y,z+3]),[1,0,0],[0,1,0],18,18,2.2,2.2,COLORS.white,a,5.8,4);
   for(const side of[-1,1])face(m,o,side*24,y,8,13,z+4,COLORS.cyan,a*.82,.95,side*.3);
  }
  m.line(place(o,[0,-29,18]),place(o,[0,29,18]),3.2,COLORS.white,coreFade,6.5);
  for(let k=0;k<6;k++){
   const a=TAU*k/6+.16,dir=[Math.cos(a),Math.sin(a),0],inner=add(o,[dir[0]*15,dir[1]*15,9]),outer=add(o,[dir[0]*31,dir[1]*31,5]);
   m.rod(inner,outer,3.1,k%2?COLORS.mint:COLORS.cyan,coreFade*.68,1.1);
   m.line(add(inner,[0,0,4]),add(outer,[0,0,4]),1.9,COLORS.white,coreFade*.94,5.1);
  }
  for(const side of[-1,1]){
   const hinge=info.coreOpen,close=info.coreRetire,x=side*(7+9*hinge+clamp(close)*7),tf=p=>place(o,rotate(add(p,[x,0,side*9]),.12,side*.3,.12));
   const poly=[[0,-45,2],[side*15,-18,0],[side*11,30,0],[0,48,3],[-side*4,18,7]].map(tf);
   m.plate(poly,11,COLORS.dark,coreFade,.34);
   m.line(tf([0,-43,8]),tf([0,46,8]),3.0,COLORS.white,coreFade,5.4);
   for(let i=0;i<4;i++)m.line(tf([side*5,-24+i*16,9]),tf([side*13,-20+i*16,9]),2.0,COLORS.mint,coreFade,1.2);
  }
 }
}
function cancellation(m,s,quality){const o=world(s),t=s.seconds,env=s.envelope;ingress(m,s,t,COLORS.cyan,COLORS.amber);
 const info=s.information,terminal=s.terminalQ,appear=info.acquire,close=smooth(1.1,1.56,t);
 for(let row=0;row<7;row++){
  const inter=info.rows[row].interleave,extinct=info.rows[row].consumed,f=appear*(1-smooth(.62,1,extinct))*env;if(f<.003)continue;
  const y=46-row*14,stagger=(row%2===0?1:-1),z=row%2===0?10:-8;
  for(const side of[-1,1]){
   const col=side<0?COLORS.cyan:COLORS.amber,tip=side*(13+20*(1-extinct)),base=side*(72-34*inter),dir=[-side,0,0],pr=[0,1,0];
   slab(m,place(o,[(base+tip)/2,y+side*(4-2*inter),z]),dir,pr,Math.abs(base-(base+tip)/2),Math.abs(tip-(base+tip)/2),6.2,8.2*(1-.25*extinct),COLORS.dark,f*.92,.14,7);
   wedge(m,place(o,[tip+side*5,y+side*(4-2*inter),z+4]),dir,pr,10,14,7.2*(1-.28*extinct),3.8,col,f*.86,1.0,6);
   wedge(m,place(o,[tip+side*2,y+side*(4-2*inter),z+9]),dir,pr,5,8,2.8,1.6,side<0?COLORS.white:COLORS.pearl,f,4.7,3);
   if(quality!=='low'){
    const tooth=place(o,[side*(34-11*inter-extinct*9),y+stagger*4,z-6]);
    wedge(m,tooth,dir,pr,7,9,3.7,2.4,side<0?COLORS.blue:COLORS.pearl,f*.58,.75,4);
   }
  }
 }
 const seamFade=appear*(1-close)*env,top=info.nullFrontY,bottom=-55;
 if(seamFade>.002&&top>bottom){
  for(const side of[-1,1]){
   const poly=[[0,bottom,24],[side*12,bottom+10,18],[side*15,top-6,18],[0,top,24]].map(p=>place(o,p));
   m.plate(poly,10,COLORS.dark,seamFade,.18);m.line(place(o,[side*2,bottom+2,25]),place(o,[side*2,top,25]),1.8,side<0?COLORS.cyan:COLORS.amber,seamFade,2.0);
  }
  const frontAlpha=appear*env*(1-smooth(.92,1.30,t));
  slab(m,place(o,[0,top-4,20]),[1,0,0],[0,1,0],12,12,2.2,2.2,COLORS.dark,frontAlpha*.82,.25,6);
  for(const side of[-1,1]){
   wedge(m,place(o,[side*9,top-4,22]),[0,-1,0],[side,0,0],4,8,4.2,2.2,side<0?COLORS.cyan:COLORS.amber,frontAlpha*.92,1.15,5);
   m.line(place(o,[side*8,top-9,24]),place(o,[side*8,top+5,24]),1.7,side<0?COLORS.white:COLORS.pearl,frontAlpha,4.2);
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
 for(let i=0;i<2;i++){const f=(1-smooth(.14+i*.18,.65+i*.18,q))*env;
  m.rod(place(o,[-22,-13+i*29,-20]),place(o,[22,-13+i*29,-20]),1.9,COLORS.blue,f,.65);
  for(let side of[-1,1])m.line(place(o,[side*11,-14+i*15,19]),place(o,[side*19,-14+i*15,19]),2,COLORS.white,f,2);
 }
 if(quality!=='low'&&info.writeGateClosed){slab(m,place(o,[0,0,24]),[0,1,0],[1,0,0],12,12,3.2,6.2,COLORS.cyan,env*.26,1.0,4);m.line(place(o,[-12,0,26]),place(o,[12,0,26]),1.5,COLORS.white,env*.62,3.2);}
}
function occluders(m,items){for(const b of items){const color=b.color??COLORS.slate,z=b.depth??0;
 if(b.polygon){const p=b.polygon.map(v=>[v.x,-v.y,z]);for(let i=1;i<p.length-1;i++)m.tri(p[0],p[i],p[i+1],color,1,.60,0,true);}
 else {const x=b.x,y=-b.y,w=b.w,h=b.h;m.quad([x,y,z],[x+w,y,z],[x+w,y-h,z],[x,y-h,z],color,1,.60,0,true);}
}}
const BUILDERS={charge,normal,resonance,cancellation,suppression};
export function buildGeometry(samples,{quality='high',occlusion=[]}={}){const m=new MeshBuilder();occluders(m,occlusion);for(const s of samples){const before=m.count;BUILDERS[s.kind](m,s,quality);m.branchStats.push({id:s.event.id,kind:s.kind,phase:s.phase,triangles:m.count-before,authorityActive:s.authorityActive,informationOperation:s.information.operation});}return m.finish();}
