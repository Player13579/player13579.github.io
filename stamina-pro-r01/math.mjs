/** Deterministic actor-time sampler. No drawing, timers, or audio side effects. */
export const C = Object.freeze({ defaultDurationMs:1500, minimumDurationMs:900, referenceRadius:82,
  referenceHeight:64, laneCount:6, packetsPerLane:3, segmentsPerLane:28,
  packetStart:0.02, laneDelay:0.026, packetSpacing:0.165, packetTravel:0.34 });
export const clamp = (x,a=0,b=1) => Math.min(b,Math.max(a,x));
export const smooth = (a,b,x) => {const q=clamp((x-a)/(b-a)); return q*q*(3-2*q);};
export const smoothDerivative = (a,b,x) => {
  if(x<=a||x>=b)return 0; const q=(x-a)/(b-a); return 6*q*(1-q)/(b-a);
};
export function visibility(p){ return p<0||p>=1?0:smooth(0,.035,p)*(1-smooth(.87,1,p)); }
export function packetState(p,lane,packet){
  const start=C.packetStart+lane*C.laneDelay+packet*C.packetSpacing;
  const raw=(p-start)/C.packetTravel, q=clamp(raw);
  const position=smooth(0,1,q);
  const arrived=smooth(.82,1,q);
  const arrivalRate=smoothDerivative(.82,1,q)/C.packetTravel;
  const opacity=smooth(0,.1,q)*(1-smooth(.86,1,q));
  return {start,raw,position,arrived,arrivalRate,opacity,active:raw>0&&raw<1};
}
export function chargeFlux(p){
  let charge=0,flux=0;
  for(let lane=0;lane<C.laneCount;lane++)for(let k=0;k<C.packetsPerLane;k++){
    const q=clamp((p-C.packetStart-lane*C.laneDelay-k*C.packetSpacing)/C.packetTravel);
    charge+=smooth(.82,1,q);flux+=smoothDerivative(.82,1,q)/C.packetTravel;
  }
  return {charge:charge/18,flux:flux/18};
}
export function transportState(p){
  let charge=0,flux=0; const packets=[];
  for(let lane=0;lane<C.laneCount;lane++)for(let packet=0;packet<C.packetsPerLane;packet++){
    const s=packetState(p,lane,packet); charge+=s.arrived; flux+=s.arrivalRate;
    packets.push({...s,lane,packet});
  }
  const n=C.laneCount*C.packetsPerLane;
  return {charge:charge/n,flux:flux/n,packets};
}
export function lanePoint(lane,s,radius=C.referenceRadius){
  s=clamp(s); const theta=lane*Math.PI/3+.24+.35*Math.sin(Math.PI*s);
  const h=Math.min(radius/C.referenceRadius,1);
  const r=radius*.53*Math.pow(1-s,1.3)+C.referenceRadius*.105*h;
  return {x:Math.cos(theta)*r,y:(7+(lane%3)*5+(25+(lane%2)*5)*s+9*Math.sin(Math.PI*s))*h,
    z:Math.sin(theta)*r*.56+3*s*h};
}
export function corePoint(s,radius=C.referenceRadius){
  const h=Math.min(radius/C.referenceRadius,1);
  return {x:Math.sin(Math.PI*s)*1.25*h,y:(17+29*s)*h,z:(10+2*Math.sin(Math.PI*s))*h};
}
export function sampleGain(event,actorTimeMs){
  const ageMs=actorTimeMs-event.startedAt;
  const p=ageMs/event.durationMs;
  const state=transportState(clamp(p));
  return Object.freeze({key:event.key,playerId:event.playerId,ageMs,progress:p,
    durationMs:event.durationMs,radius:event.radius,amount:event.amount,
    active:ageMs>=0&&ageMs<event.durationMs,opacity:visibility(p),...state});
}
/** Render instance order, not a raster/image proxy. Each item is sampled in WGSL. */
export function orderedSegments(radius=C.referenceRadius){
  const items=[];
  for(let lane=0;lane<C.laneCount;lane++)for(let seg=0;seg<C.segmentsPerLane;seg++){
    const p=lanePoint(lane,(seg+.5)/C.segmentsPerLane,radius);
    items.push({lane,seg,kind:0,depth:p.z*.965925826+p.y*.258819045});
  }
  for(let seg=0;seg<24;seg++){
    const p=corePoint((seg+.5)/24,radius);
    items.push({lane:0,seg,kind:1,depth:p.z*.965925826+p.y*.258819045});
  }
  items.sort((a,b)=>a.depth-b.depth);
  return new Float32Array(items.flatMap(s=>[s.lane,s.seg,s.kind,0]));
}
