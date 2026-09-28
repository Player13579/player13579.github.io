// r0.4: external finite flux, boundary conversion, area-conserving torso charge.
// This module has no background, wall-clock, random seed, renderer, sound or previous-version input.
import {CONTRACT} from './contract.js';
import {clamp,mix,ease,bezier,tangent,bounds,signedArea,halfPlane,clipConvex,outsideConvex,horizontalEdges,rotateTranslate} from './math.js';
export const PHASES = Object.freeze([
  {id:'supply',start:0,end:0.22,label:'外側の供給'},
  {id:'conversion',start:0.22,end:0.42,label:'境界通過・変換'},
  {id:'charge',start:0.42,end:0.67,label:'身体内の充填'},
  {id:'settled',start:0.67,end:0.84,label:'定着'},
  {id:'afterglow',start:0.84,end:1,label:'低明度余韻'}
]);
// Linear-light authoring values; the high source is deliberately above display-white.
export const PALETTE = Object.freeze({
  carrier:[0.018,0.15,0.62], second:[0.12,0.045,0.58],
  source:[0.18,0.74,1.0], converted:[0.30,0.12,0.90],
  charge:[0.025,0.13,0.43], contact:[0.40,0.77,1.0], key:[0.003,0.010,0.030]
});
export const LOBES = Object.freeze([
  {weight:0.62,form:[0,0.065],motion:[0.015,0.50],packet:0.64,width:10.5,layer:'back',side:-1},
  {weight:0.38,form:[0.12,0.19],motion:[0.13,0.65],packet:0.61,width:8.0,layer:'front',side:1}
]);
function lobeAt(p,d) {
  const travel = ease(d.motion[0],d.motion[1],p), head = d.packet + travel;
  const crossed = clamp((head-1)/d.packet), received = crossed*crossed*(3-2*crossed);
  const u = clamp((p-d.motion[0])/(d.motion[1]-d.motion[0]));
  const dHead = (p > d.motion[0] && p < d.motion[1]) ? 6*u*(1-u)/(d.motion[1]-d.motion[0]) : 0;
  const flux = crossed > 0 && crossed < 1 ? 6*crossed*(1-crossed)*dHead/d.packet : 0;
  return {head,tail:head-d.packet,received,remaining:1-received,flux,formation:ease(...d.form,p)};
}
export function sampleTime(ageMs,durationMs=CONTRACT.durationMs) {
  if (!Number.isFinite(ageMs) || !Number.isFinite(durationMs) || durationMs < CONTRACT.minimumMs) throw new RangeError('finite age, duration >= 900 actor-ms required');
  const p = clamp(ageMs/durationMs), alive = ageMs >= 0 && ageMs < durationMs;
  const lobes = LOBES.map(d=>lobeAt(p,d));
  const stored = lobes.reduce((s,l,i)=>s+l.received*LOBES[i].weight,0);
  const flux = lobes.reduce((s,l,i)=>s+l.flux*LOBES[i].weight,0);
  const fade = 1-ease(0.84,1,p), emission = 1-0.93*ease(0.77,0.987,p);
  return {p,alive,phase:alive?(PHASES.find(x=>p<x.end)?.id ?? 'afterglow'):'removed',lobes,stored,external:1-stored,flux,fade,emission};
}
// Filled area follows the EXACT same received fraction as source mass; not a separately timed icon.
export function chargeRegion(polygon, fraction) {
  if (fraction <= 0) return {polygon:[],level:Infinity};
  const n = [-0.22,1], vals = polygon.map(v=>n[0]*v[0]+n[1]*v[1]);
  let lo = Math.min(...vals)-1e-5, hi = Math.max(...vals)+1e-5;
  const target = Math.abs(signedArea(polygon))*clamp(fraction);
  for (let i=0;i<22;i++) { const m=(lo+hi)/2, area=Math.abs(signedArea(halfPlane(polygon,n[0],n[1],m))); if (area>target) lo=m; else hi=m; }
  const level=(lo+hi)/2; return {polygon:halfPlane(polygon,n[0],n[1],level),level};
}
function material(role,color,alpha,light,power) { return {role,color,alpha,light,power}; }
function packetWidth(z) { return z < 0.20 ? mix(0.10,1,z/0.20) : mix(1,0.025,(z-0.20)/0.80); }
export function sampleMana(instance) {
  const time=sampleTime(instance.ageMs,instance.durationMs);
  if (!time.alive) return {time,meshes:[],audit:{stored:time.stored,visible:false}};
  const body=instance.body, mask=body.torsoPolygon, bb=bounds(mask), centre=[(bb.left+bb.right)/2,(bb.top+bb.bottom)/2], h=body.heightPx/64, r=instance.radiusPx??82;
  const meshes=[];
  function poly(points,uvFn,layer,label,mat) {
    if (points.length<3 || Math.abs(signedArea(points))<1e-7 || mat.alpha<=0) return;
    meshes.push({layer,label,vertices:points.map(p=>({point:rotateTranslate(p,body),uv:uvFn(p),color:[...mat.color,mat.alpha],light:[...mat.light,mat.power],params:[mat.role,time.p,time.emission,h]}))});
  }
  function line(points,width,layer,label,mat,clipMask=null) {
    for(let i=0;i<points.length-1;i++) {
      const a=points[i],b=points[i+1],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy); if(len<1e-6)continue;
      const nx=-dy/len*width/2,ny=dx/len*width/2;
      let p=[[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]];
      if(clipMask)p=clipConvex(p,clipMask);
      const uv=q=>[((q[0]-a[0])*dx+(q[1]-a[1])*dy)/(len*len),((q[0]-a[0])*(-dy)+(q[1]-a[1])*dx)/(len*width/2)];
      poly(p,uv,layer,label,mat);
    }
  }
  const inletYs=[mix(bb.top,bb.bottom,0.73),mix(bb.top,bb.bottom,0.29)];
  const inlets=inletYs.map((y,i)=>[horizontalEdges(mask,y)[i],y]);
  LOBES.forEach((def,i)=>{
    const l=time.lobes[i],c=inlets[i];
    const a=i===0?[c[0]-0.58*r,c[1]+0.13*r]:[c[0]+0.47*r,c[1]-0.25*r];
    const b=i===0?[c[0]-0.32*r,c[1]+0.26*r]:[c[0]+0.40*r,c[1]+0.035*r];
    const from=Math.max(0,l.tail),to=Math.min(1,l.head),w=def.width*(r/82);
    if(to>from && l.formation>0) {
      const segments=22,alpha=0.85*l.formation;
      for(let j=0;j<segments;j++) {
        const sa=mix(from,to,j/segments),sb=mix(from,to,(j+1)/segments),pa=bezier(a,b,c,sa),pb=bezier(a,b,c,sb),ta=tangent(a,b,c,sa),tb=tangent(a,b,c,sb);
        const za=clamp((sa-l.tail)/def.packet),zb=clamp((sb-l.tail)/def.packet),wa=w*packetWidth(za)/2,wb=w*packetWidth(zb)/2;
        const q=[[pa[0]-ta[1]*wa,pa[1]+ta[0]*wa],[pb[0]-tb[1]*wb,pb[1]+tb[0]*wb],[pb[0]+tb[1]*wb,pb[1]-tb[0]*wb],[pa[0]+ta[1]*wa,pa[1]-ta[0]*wa]];
        // Clip the world carrier OUTSIDE the host receiving silhouette. It cannot turn into an object pushed inside.
        const uv=p=>{const dx=pb[0]-pa[0],dy=pb[1]-pa[1],ll=dx*dx+dy*dy,u=clamp(((p[0]-pa[0])*dx+(p[1]-pa[1])*dy)/Math.max(ll,1e-8));const cc=[mix(pa[0],pb[0],u),mix(pa[1],pb[1],u)],tt=[mix(ta[0],tb[0],u),mix(ta[1],tb[1],u)],ww=mix(wa,wb,u);return [mix(za,zb,u),((p[0]-cc[0])*(-tt[1])+(p[1]-cc[1])*tt[0])/Math.max(ww,0.05)];};
        const mat=material(1,i===0?PALETTE.carrier:PALETTE.second,alpha,i===0?PALETTE.source:PALETTE.converted,3.6*l.formation);
        for(const piece of outsideConvex(q,mask))poly(piece,uv,def.layer,`supply-${i}`,mat);
      }
    }
    // The boundary only emits during a nonzero transfer flux, not when a packet is merely nearby.
    const conversion=clamp(l.flux/4.9);
    if(conversion>0) {
      const side=i===0?0:1,cy=c[1],span=6.3*h;
      const pts=[-1,0,1].map(d=>{const yy=clamp(cy+d*span/2,bb.top+0.1,bb.bottom-0.1);return [horizontalEdges(mask,yy)[side],yy];});
      line(pts,3.4*h,'front',`boundary-dark-${i}`,material(0,PALETTE.key,0.85*conversion,[0,0,0],0));
      line(pts,1.6*h,'front',`boundary-${i}`,material(2,PALETTE.source,0.65*conversion,PALETTE.contact,4.1*conversion));
    }
  });
  const region=chargeRegion(mask,time.stored);
  const bodyUV=q=>[2*(q[0]-bb.left)/(bb.right-bb.left)-1,2*(q[1]-bb.top)/(bb.bottom-bb.top)-1];
  if(region.polygon.length) {
    // Body-conformal field: the only closed boundary is the EXISTING torso silhouette.
    poly(region.polygon,bodyUV,'front','stored-surface',material(3,PALETTE.charge,0.59*time.fade,PALETTE.source,0.70*time.emission));
    // Two broad surface facets, not repeated small bars, circles or a chest badge.
    const facet=halfPlane(region.polygon,1,0.36,centre[0]+0.36*centre[1]);
    poly(facet,bodyUV,'front','stored-facet',material(4,PALETTE.converted,0.14*time.fade,PALETTE.converted,0.23*time.emission));
    if(time.stored<0.998) {
      const front=halfPlane(region.polygon,0.22,-1,-region.level-1.35*h);
      poly(front,bodyUV,'front','fill-front',material(2,PALETTE.contact,0.78*time.fade,PALETTE.source,2.3*clamp(time.flux/5)));
    }
  }
  // Receiving surface lighting precedes full fill only when actual boundary conversion is occurring.
  const illumination=clamp(time.flux/8)*0.25;
  if(illumination>0)poly(mask,bodyUV,'front','contact-light',material(4,PALETTE.source,illumination,PALETTE.source,0.3*illumination));
  // Afterglow belongs to existing shoulder/hip edges; no detached seed, plate or oval remains.
  const tail=ease(0.58,0.79,time.p)*time.fade;
  if(tail>0) {
    const pts=[mask[0],mask[1]]; // supplied polygon order; host-visible edge, not a fabricated body part
    line(pts,1.1*h,'front','settled-edge',material(2,PALETTE.carrier,0.68*tail,PALETTE.source,0.7*tail*time.emission),mask);
  }
  return {time,meshes,audit:{stored:time.stored,external:time.external,flux:time.flux,filledArea:Math.abs(signedArea(region.polygon)),torsoArea:Math.abs(signedArea(mask)),inlets:inlets.map(p=>rotateTranslate(p,body)),anchor:rotateTranslate(centre,body),radiusPx:r,visible:true}};
}
export function sampleInstances(instances) { return instances.map(instance=>({key:instance.key,owner:instance.beneficiaryPlayerId,...sampleMana(instance)})); }
// 16 floats = 64 bytes. Real vertex attributes, no hidden storage or serialized texture.
export function packMeshes(meshes,layer) {
  const flat=[];
  const push=v=>flat.push(...v.point,...v.uv,...v.color,...v.light,...v.params);
  for(const mesh of meshes)if(!layer||mesh.layer===layer)for(let i=1;i<mesh.vertices.length-1;i++){push(mesh.vertices[0]);push(mesh.vertices[i]);push(mesh.vertices[i+1]);}
  return new Float32Array(flat);
}
