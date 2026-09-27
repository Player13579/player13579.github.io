import {C,ribbonPoint,ribbonWidth,clamp,smooth01} from './sampler.mjs';
export const STRIDE_FLOATS=17;
function vertex(position,uv,shade,meta,color){return [...position,...uv,...shade,...meta,...color];}
function tri(dst,a,b,c){dst.push([a,b,c]);}
function world(p,actor){return [p[0]+(actor.x??0),p[1]+(actor.y??0),p[2]+(actor.z??0)];}
export function effectTriangles(samples){
 const tris=[], counts=new Map();for(const s of samples)counts.set(s.playerId,(counts.get(s.playerId)??0)+1);
 for(const s of samples){
  if(!s.active||s.opacity<=0)continue;
  const actor=s.actor??{x:0,y:0}, overlap=1/Math.sqrt(counts.get(s.playerId));
  for(let lane=0;lane<2;lane++)for(const kind of [2,1]){
   const strip=[], a=s.arrivals[lane];
   for(let i=0;i<=C.segments;i++){
    const u=i/C.segments,point=ribbonPoint(s,lane,u);
    const p0=ribbonPoint(s,lane,Math.max(0,u-0.002)),p1=ribbonPoint(s,lane,Math.min(1,u+0.002));
    const dx=p1[0]-p0[0],dy=p1[1]-p0[1],len=Math.hypot(dx,dy)||1;
    const w=ribbonWidth(s,lane,u),expand=kind===2?C.glowScale:1;
    for(const side of [-1,1]){
     const p=world([point[0]-dy/len*w*expand*side,point[1]+dx/len*w*expand*side,point[2]-(kind===2?0.04:0)],actor);
     strip.push(vertex(p,[u,side],[s.opacity*overlap,a.amount,s.morph,a.leadingPosition],
      [w,kind,clamp(a.rate/5),s.slot%4],[0,0,0,1]));
    }
   }
   for(let i=0;i<C.segments;i++){const k=i*2;tri(tris,strip[k],strip[k+1],strip[k+2]);tri(tris,strip[k+1],strip[k+3],strip[k+2]);}
  }
  // Existing body receiver response, not a floating icon or a third intake.
  if(s.charge>0){
   const ratio=Math.min(1,s.radius/C.referenceRadius),verts=[];
   for(const [u,v] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
    const p=world([u*7.1*ratio,33+v*10*ratio,6.05*ratio],actor);
    verts.push(vertex(p,[u,v],[s.opacity*overlap,s.charge,s.morph,0],[7.1,3,clamp(s.flux/5),0],[0,0,0,1]));
   }
   tri(tris,verts[0],verts[1],verts[2]);tri(tris,verts[1],verts[3],verts[2]);
  }
 }
 // All recipients and events participate in one camera-depth sort; no per-event uniform overwrite.
 tris.sort((a,b)=>{
  const za=(a[0][2]+a[1][2]+a[2][2])/3,zb=(b[0][2]+b[1][2]+b[2][2])/3;
  return za-zb || b[0][10]-a[0][10];
 });
 return new Float32Array(tris.flat(2));
}
function opaqueVertex(p,color){return vertex(p,[0,0],[1,0,0,0],[1,0,0,0],[...color,1]);}
function box(tris,c,half,color,actor){
 const corners=[];for(let z=-1;z<=1;z+=2)for(let y=-1;y<=1;y+=2)for(let x=-1;x<=1;x+=2)corners.push(world([c[0]+x*half[0],c[1]+y*half[1],c[2]+z*half[2]],actor));
 const faces=[[4,5,6,7,1],[0,2,1,3,.64],[1,3,5,7,.72],[0,4,2,6,.84],[2,6,3,7,1.10],[0,1,4,5,.56]];
 for(const [a,b,c,d,light] of faces){const col=color.map(v=>clamp(v*light));tri(tris,opaqueVertex(corners[a],col),opaqueVertex(corners[b],col),opaqueVertex(corners[c],col));tri(tris,opaqueVertex(corners[b],col),opaqueVertex(corners[d],col),opaqueVertex(corners[c],col));}
}
function capsule(tris,a,b,r,color,actor){
 const n=16,dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
 const rings=[];
 for(let j=0;j<=8;j++){
  const t=j/8,ang=(t-.5)*Math.PI,along=(t<.5?0:len)+r*Math.sin(ang);
  const rr=r*Math.cos(ang),ring=[];
  for(let k=0;k<n;k++){
   const phi=2*Math.PI*k/n,c=Math.cos(phi),s=Math.sin(phi),z=a[2]+(b[2]-a[2])*t+rr*s;
   const p=world([a[0]+dx/len*along+nx*rr*c,a[1]+dy/len*along+ny*rr*c,z],actor);
   const lighting=.76+.21*s+.09*(-nx*c);ring.push(opaqueVertex(p,color.map(v=>clamp(v*lighting))));
  }rings.push(ring);
 }
 for(let j=0;j<8;j++)for(let k=0;k<n;k++){const q=(k+1)%n;tri(tris,rings[j][k],rings[j][q],rings[j+1][k]);tri(tris,rings[j][q],rings[j+1][q],rings[j+1][k]);}
}
export function fixtureGeometry(actors,{crossArm=false}={}){
 const tris=[];
 for(const actor of actors){
  const cloth=actor.tint??[.40,.46,.53],skin=[.77,.66,.57],boot=[.22,.26,.32];
  box(tris,[0,36.5,0],[8.0,11.5,5.5],cloth,actor);box(tris,[0,23.5,0],[7.5,3.8,4.8],cloth.map(v=>v*.8),actor);
  box(tris,[0,49,0],[2.8,2,2.8],skin,actor);
  capsule(tris,[0,55.3,0],[0,56.5,0],7.5,skin,actor);
  for(const side of [-1,1]){
   capsule(tris,[side*4.0,21,0],[side*5.2,5.0,.7],3.7,cloth.map(v=>v*.84),actor);
   box(tris,[side*5.2,1.7,2.0],[4.1,1.7,5.4],boot,actor);
   capsule(tris,[side*10,45.5,0],[side*13.0,35.5,1.5],3.3,cloth,actor);
   const hand=crossArm&&side===1?[-2.5,36,10.5]:[side*9.8,28,8.5];
   capsule(tris,[side*13,35.5,1.5],hand,2.65,cloth,actor);
   capsule(tris,hand,[hand[0]+side*.15,hand[1]-1.6,hand[2]],2.5,skin,actor);
  }
 }
 return new Float32Array(tris.flat(2));
}
export function projectionMatrix(width,height,scale=1,origin=[width/2,height*.80]){
 return new Float32Array([2*scale/width,0,0,0,0,2*scale/height,0,0,0,0,-1/512,0,2*origin[0]/width-1,1-2*origin[1]/height,.5,1]);
}
