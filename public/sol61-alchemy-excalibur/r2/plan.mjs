export const VERSION = 'alchemy-excalibur-new-e-sol61-r2';
export const DURATION_MS = 1200;
export const VARIANTS = Object.freeze(['forward-half-map', 'gbo-tenfold']);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const point = p => p && finite(p.x) && finite(p.y);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function validateReceipt(receipt) {
  const r = receipt, h = r?.frozenHandSnapshot;
  if (!r || r.type !== 'alchemy-excalibur' || typeof r.id !== 'string' || !r.id ||
      typeof r.playerId !== 'string' || !r.playerId || !VARIANTS.includes(r.variant) ||
      !finite(r.startedAt) || !finite(r.radius) || r.radius <= 0 || !finite(r.x) || !finite(r.y) ||
      !point(r.directionWorld) || !point(r.pathEndWorld)) throw Error('invalid Excalibur receipt');
  const d = r.directionWorld;
  if (Math.abs(Math.hypot(d.x, d.y) - 1) > 1e-6) throw Error('directionWorld must be normalized');
  if (!h || h.eventId !== r.id || h.playerId !== r.playerId || !point(h.handWorld) ||
      !Number.isInteger(h.snapshotFrameId) || h.snapshotFrameId < 0 || typeof h.poseId !== 'string' || !h.poseId ||
      h.sourceKind !== 'gallery-event-frozen-hand') throw Error('missing exact gallery frozen hand snapshot');
  const fromActor = p => ({ x:p.x-r.x, y:p.y-r.y });
  const along = p => { const v=fromActor(p); return v.x*d.x+v.y*d.y; };
  const across = p => { const v=fromActor(p); return -v.x*d.y+v.y*d.x; };
  if (Math.abs(across(h.handWorld)) > 1e-5 || Math.abs(across(r.pathEndWorld)) > 1e-5)
    throw Error('off-axis gallery hand or collision endpoint is unsupported');
  if (along(h.handWorld)<0 || along(r.pathEndWorld)-along(h.handWorld) < 1)
    throw Error('collision endpoint must be ahead of exact hand');
  return r;
}
export function freezeReceipt(receipt) {
  validateReceipt(receipt);
  const r = { ...receipt, directionWorld:Object.freeze({...receipt.directionWorld}),
    pathEndWorld:Object.freeze({...receipt.pathEndWorld}),
    frozenHandSnapshot:Object.freeze({...receipt.frozenHandSnapshot,
      handWorld:Object.freeze({...receipt.frozenHandSnapshot.handWorld})}) };
  return Object.freeze(r);
}
export function makeFixture({id='excalibur-fixture-1', variant='forward-half-map', startedAt=0,
    angle=0, distance=620, origin={x:170,y:310}}={}) {
  const d={x:Math.cos(angle),y:Math.sin(angle)};
  return freezeReceipt({id,playerId:'gallery-alchemist',type:'alchemy-excalibur',variant,startedAt,
    x:origin.x,y:origin.y,radius:variant==='gbo-tenfold'?9000:900,
    directionWorld:d,pathEndWorld:{x:origin.x+d.x*(20+distance),y:origin.y+d.y*(20+distance)},
    frozenHandSnapshot:{eventId:id,playerId:'gallery-alchemist',snapshotFrameId:1,
      poseId:'explicit-aligned-synthetic-hand-r1',sourceKind:'gallery-event-frozen-hand',
      handWorld:{x:origin.x+d.x*20,y:origin.y+d.y*20}}});
}
// now and startedAt are in the same caller-owned effect clock. Standalone uses 1x.
// No global wall/actor/ACC clock ownership is inferred by this standalone planner.
export function sample(receipt, now, {reducedMotion=false}={}) {
  validateReceipt(receipt);
  if (!finite(now)) throw Error('invalid presentation clock');
  const age=now-receipt.startedAt, active=age>=0&&age<DURATION_MS;
  const phase=clamp(age/DURATION_MS,0,1), drive=clamp(age/900,0,1);
  // One crest traverses the authoritative ray; this is visual timing, never a damage clock.
  const headFraction=drive*(.6+.4*drive);
  const erosion=clamp((age-900)/300,0,1);
  return Object.freeze({id:receipt.id,age,phase,active,headFraction,erosion,
    origin:receipt.frozenHandSnapshot.handWorld,direction:receipt.directionWorld,endpoint:receipt.pathEndWorld,
    halfWidth:receipt.variant==='gbo-tenfold'?58:36,reducedMotion:Boolean(reducedMotion),
    radiusMetadata:receipt.radius,durationMs:DURATION_MS,clockPolicy:'caller-owned-effect-clock; standalone-1x',
    deathPolicy:'gallery-event-frozen-snapshot-only; game-death-binding-unaccepted'});
}
// Eight vec4<f32>: viewport(age in ms), hand/end in target pixels, exact direction/width,
// OBS and linear background, reserved zero vec4s. DPR affects coordinates, never lifetime.
// View changes only orthographic scale/translation, never receipt direction or endpoint.
export function packUniforms(receipt, now, {width=980,height=620,scale=1,offsetX=0,offsetY=0,
    main=true,obs=true,reducedMotion=false,background=[0.018,0.027,0.041]}={}) {
  if (![width,height,scale,offsetX,offsetY,...background].every(finite) || width<=0 || height<=0 || scale<=0 || background.length!==3)
    throw Error('invalid viewport transform');
  const p=sample(receipt,now,{reducedMotion});
  const u=new Float32Array(32), h=p.origin, e=p.endpoint, d=p.direction;
  u.set([width,height,p.age,main&&p.active?1:0],0);
  u.set([h.x*scale+offsetX,h.y*scale+offsetY,e.x*scale+offsetX,e.y*scale+offsetY],4);
  u.set([d.x,d.y,p.halfWidth*scale,reducedMotion?1:0],8);
  u.set([obs?1:0,...background],12);
  return u;
}
export function createReceiptLedger(limit=4096) {
  if (!Number.isInteger(limit)||limit<1) throw Error('invalid ledger limit');
  const consumed=new Map();
  return Object.freeze({accept(r){validateReceipt(r);
    const signature=JSON.stringify([r.playerId,r.type,r.variant,r.startedAt,r.radius,r.x,r.y,
      r.directionWorld,r.pathEndWorld,r.frozenHandSnapshot]);
    if(consumed.has(r.id)) {
      if(consumed.get(r.id)!==signature)throw Error('conflicting receipt payload for consumed cause');
      return false;
    }
    // Keep consumed causes until explicit lifecycle reset; eviction must not replay an old cause.
    if(consumed.size>=limit)throw Error('receipt ledger capacity reached; explicit lifecycle reset required');
    consumed.set(r.id,signature);return true;},
    reset(){consumed.clear();},get size(){return consumed.size;}});
}
