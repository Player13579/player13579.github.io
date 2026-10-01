export const ROOM_ID = 'server-r05-art';
export const ROOM_GENERATION = 6;
export const ACTOR_ID = 'server-r06-gallery-actor';
export const SESSION_ID = crypto.randomUUID();
export const BASIS_HASH = 'b13814c922b644ef1c29929c7604df8e9e5f5980ef32c9fe466335e57d01ea64';
export const ACTOR_RADIUS = 18;
export const OBJECT_E_LIFETIME_MS = 1800;
export const LIFE_PHASE_MS = Object.freeze([0,120,900,1400,1800]);
export const SOURCE_COLORS = Object.freeze({
  monitorCore:[0.18,0.55,1.8],monitorFace:[0.08,0.24,0.70],
  lockerCore:[0.20,1.2,0.55],lockerFace:[0.06,0.35,0.16],
  authCore:[0.12,1.4,1.1],authFace:[0.04,0.40,0.34],
  rackCore:[0.45,0.65,1.7],rackFace:[0.12,0.20,0.55]
});
export const OBJECT_VISUAL_MASKS = Object.freeze({
  monitor:Object.freeze([
    [[519,139],[635,127],[637,172],[523,184]],[[650,130],[792,131],[788,175],[650,173]],
    [[808,131],[925,141],[918,183],[803,173]],[[526,197],[637,184],[639,223],[526,237]],
    [[652,187],[787,185],[784,223],[651,225]],[[804,185],[921,196],[914,238],[800,226]]
  ]),
  monitorDesk:Object.freeze([[431,290],[986,295]]),
  locker:Object.freeze([[260,194],[310,194],[321,365],[275,365]]),
  lockerRims:Object.freeze([[[255,194],[270,365]],[[312,194],[327,365]]]),
  authDisplay:Object.freeze([[1183,397],[1208,397],[1209,439],[1188,439]]),
  authSurface:Object.freeze([[1142,313],[1197,312],[1209,386],[1154,389]]),
  authRim:Object.freeze([[1180,397],[1185,440]]),
  rackTrays:Object.freeze([[1116,687,1211,712],[1112,721,1208,753],[1108,762,1204,786],[1103,796,1199,829]]),
  rackRims:Object.freeze([[[1223,681],[1206,831]],[[1091,681],[1075,834]]])
});
export const OBJECTS = Object.freeze([
  { id: 'server-r05-monitor-console', label: 'Monitor connection check', source: [714,181], anchor: [566,413], radius: 100, obstacle: [425,108,1015,365], cooldown: -Infinity },
  { id: 'server-r05-equipment-locker', label: 'Equipment access check', source: [286,271], anchor: [437,395], radius: 100, obstacle: [169,119,399,384], cooldown: -Infinity },
  { id: 'server-r05-auth-panel', label: 'Authentication reception check', source: [1197,419], anchor: [1073,471], radius: 105, obstacle: [1128,311,1227,565], cooldown: -Infinity },
  { id: 'server-r05-service-rack', label: 'System check complete', source: [1164,743], anchor: [1038,750], radius: 100, obstacle: [1064,568,1232,848], cooldown: -Infinity }
]);
export const OBSTACLES = Object.freeze([...OBJECTS.map(o=>o.obstacle),[635,300,770,400],[422,235,1008,365]]);
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
export const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
export function lifeEnvelope(ageMs) {
  if(!Number.isFinite(ageMs)||ageMs<0||ageMs>=OBJECT_E_LIFETIME_MS)return 0;
  if(ageMs<120){const t=ageMs/120;return t*t*(3-2*t);}
  if(ageMs<=1400)return 1;
  const t=(1800-ageMs)/400;return t*t*(3-2*t);
}
export function circleHitsRect(x,y,r,[x0,y0,x1,y1]) {
  const dx=x-clamp(x,x0,x1), dy=y-clamp(y,y0,y1); return dx*dx+dy*dy < r*r-1e-8;
}
export function validPoint(x,y) {
  return x>=175+ACTOR_RADIUS && x<=1120-ACTOR_RADIUS && y>=380+ACTOR_RADIUS && y<=840-ACTOR_RADIUS &&
    !OBSTACLES.some(rect=>circleHitsRect(x,y,ACTOR_RADIUS,rect));
}
export function moveActor(actor, dx, dy) {
  const out=[...actor]; const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));
  for(let i=0;i<steps;i++) { const sx=dx/steps,sy=dy/steps; if(validPoint(out[0]+sx,out[1]))out[0]+=sx; if(validPoint(out[0],out[1]+sy))out[1]+=sy; }
  return out;
}
function segmentHitsRect(a,b,[x0,y0,x1,y1]) {
  let t0=0,t1=1,dx=b[0]-a[0],dy=b[1]-a[1];
  for(const [p,q] of [[-dx,a[0]-x0],[dx,x1-a[0]],[-dy,a[1]-y0],[dy,y1-a[1]]]) {
    if(Math.abs(p)<1e-9) { if(q<0)return false; continue; }
    const t=q/p; if(p<0)t0=Math.max(t0,t); else t1=Math.min(t1,t); if(t0>t1)return false;
  }
  return true;
}
export function nearestUsable(actor) {
  if(!validPoint(...actor))return null;
  return OBJECTS.map(o=>({o,d:distance(actor,o.anchor)})).filter(({o,d})=>d<=o.radius &&
    !OBSTACLES.some(r=>r!==o.obstacle&&segmentHitsRect(actor,o.anchor,r)))
    .sort((a,b)=>a.d-b.d||a.o.id.localeCompare(b.o.id))[0]||null;
}
export function proximityTransition(previousObjectId, actor) {
  const nearby=nearestUsable(actor), objectId=nearby?.o.id??null;
  return Object.freeze({objectId,nearby,entered:Boolean(objectId&&objectId!==previousObjectId)});
}
export function createFixtureReceipt({object,actor,nowESeconds,roomGeneration=ROOM_GENERATION,grantId=crypto.randomUUID()}) {
  if(!Number.isFinite(nowESeconds)||nowESeconds<0||roomGeneration!==ROOM_GENERATION||typeof grantId!=='string'||!grantId.trim())
    throw new Error('invalid fixture grant clock, generation, or cause');
  const canonical=OBJECTS.find(o=>o.id===object?.id); if(!canonical)return null;
  const found=nearestUsable(actor); if(!found||found.o!==canonical||nowESeconds<canonical.cooldown)return null;
  canonical.cooldown=nowESeconds+3;
  return Object.freeze({fixtureOnly:true,localOnly:true,roomId:ROOM_ID,roomGeneration,actorId:ACTOR_ID,sessionId:SESSION_ID,
    basisHash:BASIS_HASH,objectId:canonical.id,grantId,causeId:grantId,success:true,
    benefitKind:'preview-successful-use-count',benefitDelta:1,benefitScope:'local fixture counter only',
    issuedAt:nowESeconds*1000,lifetimeMs:1800,actorPosition:[...actor],accessDistance:found.d,clockOwner:ROOM_ID});
}
export function validateReceipts(receipts,{elapsedSeconds,actorId=ACTOR_ID,roomGeneration=ROOM_GENERATION,causeIds=new Set(),strictNewCause=false}) {
  if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0)throw new Error('invalid room visual clock before receipt filtering');
  const seen=new Set(),valid=[];
  for(const r of receipts) {
    const object=OBJECTS.find(o=>o.id===r?.objectId);
    if(!object||r.fixtureOnly!==true||r.roomId!==ROOM_ID||r.clockOwner!==ROOM_ID||r.roomGeneration!==roomGeneration||
      r.actorId!==actorId||r.sessionId!==SESSION_ID||r.basisHash!==BASIS_HASH||r.localOnly!==true||r.success!==true||
      r.benefitKind!=='preview-successful-use-count'||r.benefitDelta!==1||r.benefitScope!=='local fixture counter only'||
      r.lifetimeMs!==1800||typeof r.grantId!=='string'||!r.grantId||r.causeId!==r.grantId||seen.has(r.grantId)||
      (strictNewCause&&causeIds.has(r.causeId))||
      !Number.isFinite(r.issuedAt)||r.issuedAt<0||!Array.isArray(r.actorPosition)||r.actorPosition.length!==2||
      !r.actorPosition.every(Number.isFinite)||!Number.isFinite(r.accessDistance)||r.accessDistance<0) throw new Error('invalid gallery fixture receipt');
    const d=distance(r.actorPosition,object.anchor);
    if(Math.abs(d-r.accessDistance)>0.02||d>object.radius||!validPoint(...r.actorPosition)||
      OBSTACLES.some(rect=>rect!==object.obstacle&&segmentHitsRect(r.actorPosition,object.anchor,rect))) throw new Error('receipt is no longer valid for the fixture geometry');
    seen.add(r.grantId);
    const age=elapsedSeconds*1000-r.issuedAt;
    if(age<0)throw new Error('fixture receipt is future-dated in the room visual clock');
    if(age<1800)valid.push({objectId:object.id,ageMs:age});
  }
  return valid;
}
export function commitPreviewSuccess(receipt,{elapsedSeconds,causeIds,counter}) {
  if(!Number.isInteger(counter)||counter<0||!(causeIds instanceof Set))throw new Error('invalid local preview counter state');
  if(!receipt)return Object.freeze({counter,receipt:null});
  validateReceipts([receipt],{elapsedSeconds,causeIds,strictNewCause:true});
  causeIds.add(receipt.causeId);
  return Object.freeze({counter:counter+receipt.benefitDelta,receipt});
}
export function advanceActor(actor,keys,target,elapsedDeltaSeconds) {
  if(!Number.isFinite(elapsedDeltaSeconds)||elapsedDeltaSeconds<0)throw new Error('invalid room visual-clock delta');
  const speed=240*elapsedDeltaSeconds; let dx=0,dy=0;
  if(keys.has('ArrowLeft')||keys.has('a'))dx--; if(keys.has('ArrowRight')||keys.has('d'))dx++;
  if(keys.has('ArrowUp')||keys.has('w'))dy--; if(keys.has('ArrowDown')||keys.has('s'))dy++;
  if(dx||dy){const n=Math.hypot(dx,dy);return moveActor(actor,dx/n*speed,dy/n*speed);}
  if(target){const d=distance(actor,target),step=Math.min(d,speed);if(d>0)return moveActor(actor,(target[0]-actor[0])*step/d,(target[1]-actor[1])*step/d);}
  return [...actor];
}
