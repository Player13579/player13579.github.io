/** Procedural 3D triangles only. No sprite sheets, image textures, imported meshes or noise assets. */
export const STRIDE=12;
export const PALETTE={ice:[.13,.74,1],mint:[.22,1,.80],blue:[.12,.24,.78],violet:[.55,.25,1],
  hot:[.82,.95,1],dark:[.009,.025,.065],amber:[1,.36,.085],rose:[1,.20,.48]};
const T=Math.PI*2;
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=(a,b,x)=>{const q=clamp((x-a)/(b-a));return q*q*(3-2*q);};
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const len=a=>Math.hypot(...a);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>mul(a,1/Math.max(.00001,len(a)));
export function rotate(p,rx=0,ry=0,rz=0){
  let [x,y,z]=p;let c=Math.cos(rx),s=Math.sin(rx);[y,z]=[y*c-z*s,y*s+z*c];
  c=Math.cos(ry);s=Math.sin(ry);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(rz);s=Math.sin(rz);
  return [x*c-y*s,x*s+y*c,z];
}
export class MeshBuilder {
  constructor({draft=false}={}){this.opaque=[];this.transparent=[];this.draft=draft;this.triangles=0;}
  triangle(a,b,c,col,alpha=1,emission=.2,pattern=0,phase=0,opaque=false){
    if(alpha<.002)return;
    const verts=[];
    for(const [p,uv] of [[a,[0,0]],[b,[1,0]],[c,[1,1]]])verts.push(...p,...col,alpha,emission,pattern,phase,...uv);
    (opaque?this.opaque:this.transparent).push({z:(a[2]+b[2]+c[2])/3,verts});this.triangles++;
  }
  quad(a,b,c,d,col,alpha=1,emission=.2,pattern=0,phase=0,opaque=false){
    this.triangle(a,b,c,col,alpha,emission,pattern,phase,opaque);
    this.triangle(a,c,d,col,alpha,emission,pattern,phase,opaque);
  }
  line(a,b,width,col,alpha=1,emission=1.7){
    if(len(sub(a,b))<.001)return;
    const dir=norm(sub(b,a));let v=norm(cross(dir,[0,0,1]));if(len(v)<.01)v=[1,0,0];
    const off=mul(v,width*.5);
    this.quad(add(a,off),add(b,off),sub(b,off),sub(a,off),col,alpha,emission);
  }
  /** Six-sided emissive/dark prism, not a camera-facing plate. */
  prism(a,b,r,col,alpha=1,emission=.4,facets=6,opaque=false){
    const axis=norm(sub(b,a)),basis=norm(cross(axis,Math.abs(axis[2])>.9?[0,1,0]:[0,0,1])),basis2=cross(axis,basis);
    for(let k=0;k<facets;k++){
      const t0=T*k/facets,t1=T*(k+1)/facets;
      const d0=add(mul(basis,r*Math.cos(t0)),mul(basis2,r*Math.sin(t0)));
      const d1=add(mul(basis,r*Math.cos(t1)),mul(basis2,r*Math.sin(t1)));
      const shade=.42+.58*(.5+.5*Math.cos(t0-.6));
      this.quad(add(a,d0),add(b,d0),add(b,d1),add(a,d1),mul(col,shade),alpha,emission,0,0,opaque);
    }
  }
  /** Faceted taper with dark underside and narrow luminous structural edges. */
  blade(points,width,col,alpha=1,energy=1,phase=0){
    for(let i=0;i<points.length-1;i++){
      const a=points[i],b=points[i+1],dir=norm(sub(b,a)),side=norm(cross(dir,[0,0,1]));
      const w=width*(1-i/points.length*.64),lift=[0,0,w*.50];
      const al=add(a,mul(side,w)),ar=sub(a,mul(side,w)),bl=add(b,mul(side,w*.73)),br=sub(b,mul(side,w*.73));
      this.quad(al,bl,br,ar,PALETTE.dark,alpha*.80,.03);
      this.quad(add(a,lift),add(b,lift),bl,al,col,alpha*.54,.55*energy,1,phase+i*.23);
      this.quad(ar,br,add(b,lift),add(a,lift),col,alpha*.32,.19*energy,2,phase);
      this.line(add(a,lift),add(b,lift),1.3,col,alpha,2.3*energy);
      this.line(al,bl,.85,col,alpha*.65,1.4*energy);
    }
  }
  finish(){
    this.transparent.sort((a,b)=>a.z-b.z);
    const opaque=new Float32Array(this.opaque.flatMap(t=>t.verts));
    const transparent=new Float32Array(this.transparent.flatMap(t=>t.verts));
    return {opaque,transparent,triangleCount:this.triangles};
  }
}
const origin=e=>[e.origin.x,-e.origin.y,0];
const place=(o,p)=>add(o,p);
const route=(o,arr,rx,ry,rz)=>arr.map(p=>place(o,rotate(p,rx,ry,rz)));
function charge(m,e,t){
  const o=origin(e),u=clamp(t/1.2),fade=(1-smooth(1.17,1.2,t)),grow=smooth(0,.16,t);
  const c=e.phase>0?PALETTE.ice:PALETTE.amber;
  const r=47-19*smooth(.15,1.1,t),twist=.34+u*.45;
  const count=m.draft?4:6;
  for(let k=0;k<count;k++){
    const a=T*k/count+twist,rotateZ=a;
    const pts=route(o,[[r+13, -27-7*u, -8],[r,-21,10],[r*.77,0,18],[r,21,-4],[r+10,29+7*u,-8]],.35,.45,rotateZ);
    m.blade(pts,4.5+u*1.2,c,grow*fade,.6+u*.9,u);
    if(!m.draft)for(let j=0;j<3;j++){
      const x=r*.78+j*5;
      const q=route(o,[[x,-13-j*2,16-j*6],[x+9,-8-j*2,19-j*6]],.35,.45,a);
      m.line(q[0],q[1],1.0,c,grow*fade*(.40+u*.3),1.4);
    }
  }
  // A longitudinal split core: the dark channel remains open until the last 90 ms.
  const h=18+13*u,gap=7-4*smooth(.95,1.2,t);
  for(const sign of [-1,1]){
    const p=route(o,[[sign*gap,-h,8],[sign*(gap+4),0,14],[sign*gap,h,8]],.2,.12,.08);
    m.blade(p,2.5,c,fade*grow,.65+u*1.5,u);
    if(u>.78)m.line(p[0],p[1],1.5,PALETTE.hot,fade*smooth(.78,.96,u),2.8);
  }
}
function normal(m,e,t){
  const o=origin(e),c=e.phase>0?PALETTE.ice:PALETTE.amber;
  const sourceFade=(1-smooth(.07,.25,t))*smooth(0,.016,t);
  for(let k=0;k<4;k++){
    const a=k*Math.PI/2+.3;
    const pts=route(o,[[8,0,5],[23,10,10],[39,13,1]],.3,.1,a);
    m.blade(pts,4,c,sourceFade,1.5,t);
  }
  for(let j=0;j<e.targets.length;j++){
    const end=[e.targets[j].position.x,-e.targets[j].position.y,0],dv=sub(end,o),d=len(dv),axis=norm(dv),perp=[-axis[1],axis[0],0];
    const front=clamp(t/.18),tail=clamp((t-.17)/.22),env=smooth(0,.014,t)*(1-smooth(.26,.52,t));
    for(let lane=-1;lane<=1;lane++){
      const points=[];const steps=9;
      for(let i=0;i<=steps;i++){
        const q=tail+(front-tail)*i/steps;
        const taper=Math.sin(Math.PI*q);
        const offset=(lane*8+Math.sin(i*2.41+lane*1.3)*5)*taper;
        points.push(add(add(o,mul(dv,q)),add(mul(perp,offset),[0,0,lane*7+Math.sin(q*Math.PI)*11])));
      }
      m.blade(points,lane===0?3.4:1.8,c,env*(lane===0?1:.72),1.5,t);
      if(lane===0)for(let i=0;i<points.length-1;i++)m.line(points[i],points[i+1],1.5,PALETTE.hot,env,3.6);
    }
    const hit=smooth(.17,.19,t)*(1-smooth(.24,.5,t));
    for(let k=0;k<5;k++){
      const a=T*k/5+.25;
      const pts=route(end,[[4,0,4],[16+16*(t-.18),5,12],[24+30*(t-.18),9,0]],.3,.5,a);
      m.blade(pts,3,c,hit,1.4,t);
    }
  }
}
function suppression(m,e,t){
  const o=origin(e),c=PALETTE.mint;
  const inEnv=smooth(0,.12,t),out=1-smooth(e.durationMs/1000-.38,e.durationMs/1000,t);
  const env=inEnv*out;
  // Segmented target-bound lamellae, not a HUD reticle or timer. Uniform 7000ms held state.
  for(const s of [-1,1]){
    for(let j=0;j<4;j++){
      const y=-26+j*17;
      const release=1-smooth(e.durationMs/1000-.36+j*.045,e.durationMs/1000-.21+j*.045,t);
      const pts=route(o,[[s*14,y,-7],[s*23,y+3,5],[s*21,y+12,9]],0,.15*s,.06*s);
      m.blade(pts,2.2,c,env*.65*release,.55,t);
    }
    m.line(place(o,[s*19,-31,-6]),place(o,[s*19,31,-6]),.8,PALETTE.blue,env*.48,.5);
  }
}
function resonance(m,e,t){
  const o=origin(e);
  const ingress=smooth(0,.07,t)*(1-smooth(.16,.32,t));
  for(const p of [e.a,e.b]){
    const a=[p.x,-p.y,0];const axis=sub(o,a);
    for(const lane of [-1,1]){
      const pts=[];
      for(let j=0;j<7;j++){
        const q=j/6;pts.push(add(add(a,mul(axis,q)),[0,Math.sin(q*Math.PI)*(lane*17),lane*12]));
      }
      m.blade(pts,3.5,PALETTE.ice,ingress,1.6,t);
    }
  }
  const open=smooth(.12,.44,t),decay=1-smooth(.84,1.6,t),fade=smooth(.1,.18,t)*decay;
  const swell=1+.10*smooth(.55,1.3,t);
  const s=(.18+.82*open)*swell;
  const rx=.62,ry=.29,rz=.14+.09*smooth(.2,1.3,t);
  const placeR=p=>place(o,rotate(mul(p,s),rx,ry,rz));
  // Dark axial core. Its opaque clefts occlude rear lamellae, never a bloom-shaped blob.
  for(let k=0;k<6;k++){
    const a=T*k/6;
    const p=[[0,57,0],[Math.cos(a)*26,4,Math.sin(a)*26],[Math.cos(a+T/6)*26,4,Math.sin(a+T/6)*26],[0,-62,0]].map(placeR);
    m.triangle(p[0],p[1],p[2],PALETTE.dark,fade*.94,.03);
    m.triangle(p[3],p[2],p[1],PALETTE.blue,fade*.84,.18);
    m.line(p[0],p[1],1.5,PALETTE.hot,fade*.88,3.6);
    m.line(p[1],p[3],1.15,PALETTE.mint,fade,2.3);
  }
  const arms=m.draft?4:6;
  for(let k=0;k<arms;k++){
    const a=T*k/arms+.08;
    const orient=p=>placeR(rotate(p,0,0,a));
    const stretch=1+.12*Math.sin(k*2.1),L=(k%2===0?133:111)*stretch;
    const primary=[[25,-8,-5],[49,-19,12],[78,-13,25],[L,-3,8],[L+15,13,-6]].map(orient);
    m.blade(primary,9.5, k%2===0?PALETTE.ice:PALETTE.mint,fade,1.25,t);
    // Each lamella has a different depth, bounded length, terminal bend and dark gap.
    const ribs=m.draft?2:5;
    for(let j=0;j<ribs;j++){
      const base=38+j*13,span=33-j*3;
      const pts=[[base,-9-j*1.2,7+j*3],[base+8,-20-span*.36,18+j*3],[base+25,-25-span*.45,7+j*5]].map(orient);
      m.blade(pts,3.6, j%2===0?PALETTE.ice:PALETTE.violet,fade*(.65+j*.035),.95,t+j*.18);
      if(j===1||j===3)m.line(pts[0],pts[1],1.0,PALETTE.hot,fade*.65,2.8);
    }
    const returnPath=[[29,12,-15],[67,29,-21],[91,18,-12]].map(orient);
    m.blade(returnPath,4.5,PALETTE.blue,fade*.75,.65,t);
    // One thick terminal tooth per arm, not a spray of interchangeable particles.
    const terminal=[[L+13,14,-6],[L+24,11,0],[L+28,24,7]].map(orient);
    m.blade(terminal,4.3,PALETTE.mint,fade*(1-smooth(1.08,1.52,t)),1.1,t);
  }
  // Phase-conversion spine has two separated white crests and a black waist.
  for(const side of [-1,1]){
    const pts=[[side*6,-80,12],[side*12,-39,21],[side*5,-9,26],[side*12,36,21],[side*4,77,11]].map(placeR);
    m.blade(pts,4.2,PALETTE.ice,fade,1.25,t);
    m.line(pts[0],pts[1],2.1,PALETTE.hot,fade,4.2);
    m.line(pts[3],pts[4],1.8,PALETTE.hot,fade,3.8);
  }
  // Large coherent fracture facets retreat only during the declared residual phase.
  if(t>.73&&!m.draft)for(let k=0;k<6;k++){
    const a=T*k/6+.4,r=122+32*smooth(.73,1.55,t),env=smooth(.73,.9,t)*(1-smooth(1.10,1.6,t));
    const pp=route(o,[[r,0,-10],[r+12,6,3],[r+9,20,8]],rx,ry,a);
    m.blade(pp,4,PALETTE.ice,env*.70,.85,t);
  }
}
function cancellation(m,e,t){
  const o=origin(e),fade=smooth(0,.09,t)*(1-smooth(1.1,1.6,t));
  const gather=smooth(0,.35,t),collapse=smooth(.55,1.36,t);
  const axis=sub([e.b.x,-e.b.y,0],[e.a.x,-e.a.y,0]);
  const angle=Math.atan2(axis[1],axis[0]);
  for(const side of [-1,1]){
    const c=side<0?PALETTE.ice:PALETTE.amber;
    const half=80*(1-gather)+44*(1-collapse)+5;
    for(let j=0;j<(m.draft?3:6);j++){
      const y=(j-2.5)*16*(1-collapse*.62),x=side*(half+j*1.8);
      const pts=[[x+side*31,y-12,-13],[x,y-8,12],[side*(5+6*(1-collapse)),y+3,17],[side*9,y+8,-5]];
      const world=route(o,pts,.32,.22,angle+.12);
      m.blade(world,4.5,c,fade*(.65+(j%2)*.2),1.05,t+j*.13);
      if(j===2||j===3)m.line(world[1],world[2],1.6,PALETTE.hot,fade*.8,2.8);
    }
    const p=side<0?e.a:e.b,aa=[p.x,-p.y,0];
    const env=(1-smooth(.23,.56,t))*fade;
    const mid=add(mul(add(aa,o),.5),[0,side*14,8]);
    m.blade([aa,mid,o],3,c,env,1.1,t);
  }
  // Counterphase cancellation leaves a moving dark slit, no outward damage shockwave.
  const h=57*(1-collapse*.72),w=3+5*Math.sin(Math.PI*clamp(t/1.3));
  const slit=route(o,[[-w,-h,25],[w,-h+7,25],[w,h,25],[-w,h-7,25]],.32,.22,angle+.12);
  m.quad(...slit,PALETTE.dark,fade*.95,.01);
  m.line(slit[0],slit[3],1.2,PALETTE.ice,fade,1.6);
  m.line(slit[1],slit[2],1.2,PALETTE.amber,fade,1.6);
}
export function buildEffects(events,actorMs,{draft=false,occluders=[]}={}){
  const m=new MeshBuilder({draft});
  for(const box of occluders){
    const {x,y,w,h,depth=40}=box;
    m.quad([x,-y,depth],[x+w,-y,depth],[x+w,-y-h,depth],[x,-y-h,depth],box.color??[.06,.09,.12],1,.0,0,0,true);
  }
  for(const e of events){
    const t=(actorMs-e.atMs)/1000;
    if(t<0||t>=e.durationMs/1000)continue;
    ({charge,normal,suppression,resonance,cancellation}[e.kind])(m,e,t);
  }
  return m.finish();
}
