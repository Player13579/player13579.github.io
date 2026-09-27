/**
 * luck-e.mjs — Defenders vs Attackers / 幸運の恩恵 E / volumetric fortune inlay / 幸運の組継ぎ
 * Standalone ES module, UTF-8. No imports, fetch, raster assets, canvas contexts,
 * gameplay callbacks, random probability changes or independent frame submission.
 * Foundation 2026-09-11 + Extension 2026-09-23; designed from the event meaning
 * and the shared-frame contract, not from an earlier E implementation.
 *
 * HOST INTEGRATION (read before calling):
 * 1. Keep a unique sessionId per match, and a NEW roomEpoch per room visit.
 *    Event IDs are unique within the session, never generated from actor position.
 *    Forward authoritative luckBoost events into createEventStore, or supply a
 *    complete current event snapshot directly to plan. Time is elapsedActorMs,
 *    not performance time; durationMs is required, including for donation-rational.
 * 2. Call plan with the current actors, camera, viewport, DPR and event snapshot.
 *    Actors use the CURRENT body centre, half extents and orthonormal body axes.
 *    A foot anchor is NOT a body centre. No skin/background colour is an input.
 * 3. Construct one createFrameOwner({device}) and create({renderer,frameOwner}).
 *    renderer: {device,format,sampleCount:1|4,depthFormat?,depthCompare?,
 *      outputTransfer?:'srgb'|'linear',maxEventsPerFrame?:256,maxPendingFrames?:8}.
 *    The format must be blendable. For an sRGB texture format outputTransfer is
 *    'linear'; for an ordinary browser unorm target use 'srgb'; HDR uses 'linear'.
 *    Await pass.ready. Store the returned pass as passes.bodyBenefitExtra.
 * 4. A frame is {id,encoder}; it is owned, finished and submitted by the host.
 *    A target is {view,width,height,sampleCount,resolveTarget?,depthView?}.
 *    Target dimensions and plan.viewport are PHYSICAL pixels. Input viewport to
 *    plan is CSS pixels. target.view is already initialised by the scene.
 *    Call passes.bodyBenefitExtra.record({frame,target,viewport:planned.viewport,
 *    planned}). This module records LOAD/STORE render passes and readback copies.
 *    Do not put an opaque overwriting pass after E. UI may cover it only when the
 *    host visibility/clipRect says so. Supply depthView for real scene occlusion,
 *    or explicitly provide correct display.visible/occluded/clipRect otherwise.
 * 5. AFTER submitting the shared frame, call frameOwner.submitted(frame,
 *    {sessionId,roomEpoch,surfaceVisible:true}). Await its immutable receipts and
 *    pass them to sound.accept(receipts). For an abandoned unsubmitted encoder,
 *    call frameOwner.discarded(frame). Never submit an abandoned encoder later.
 *    Every watched frame MUST be submitted or discarded, even after pass.destroy.
 * 6. createAudio({context,destination?,authority,gain?,maxVoices?}) requires a
 *    caller-owned Web Audio context. Call sound.unlock() from a user gesture.
 *    authority(receipt) returns the CURRENT {sessionId,roomEpoch,id,playerId,
 *    durationMs,elapsedActorMs,actorRate,visible}. actorRate is actor-ms/wall-ms (omission assumes 1);
 *    set zero when paused. Call sound.sync() every scene update, also when hidden
 *    and during room changes. It cancels on invisibility, rate/clock discontinuity
 *    or expiry; cancelled/finished voices do not replay. Unlock does NOT drain old
 *    receipts. Supply a fresh submitted visible receipt after unlocking. Receipts
 *    more than 250 actor-ms (scaled for actorRate > 1) behind authority are rejected.
 * 7. destroy the pass, sound and frameOwner when their owners end. Do not close
 *    the shared GPU device or shared AudioContext on behalf of this module.
 *
 * RECEIPT LIMIT: a nonzero primary-form occlusion query plus host submission and
 * surface visibility is evidence of GPU samples, NOT proof of OS presentation,
 * final display contrast, or a later compositor not covering the image. Receipts
 * are local capabilities: keep WebGPU pass and audio in the same module realm.
 * A worker bridge requires its own trusted receipt transport; JSON alone is not
 * accepted as proof. This intentionally fails closed rather than sounding early.
 *
 * PLAN INPUT:
 * {sessionId,roomEpoch,viewport:{x,y,width,height},dpr,zoom,
 *  camera:{viewProjection:[16 column-major values, WebGPU depth 0..1]},
 *  surfaceVisible,reducedMotion,
 *  actors:[{id,position:[x,y,z],body:{right:[x,y,z],up:[x,y,z],
 *    halfWidth,halfHeight},display:{visible,opacity,occluded?,clipRect?},
 *    human?,poseType?,declaredAttributes?,poseMechanics?}],
 *  events:[{id,type,playerId,effectKind:'luckBoost',variant,durationMs,
 *    elapsedActorMs,actorRate?:1}]}
 * camera.viewProjection EXCLUDES zoom; zoom multiplies clip x/y exactly once.
 * clipRect is an optional CSS-pixel visible rectangle in the same viewport space.
 * Nonrectangular/depth occlusion belongs to the host depth buffer, not to a
 * background-colour guess. Host skeletal/skin drawing remains completely intact.
 *
 * DESIGN: 幸運の組継ぎ / Fortune Inlay. This revision replaces the carrier geometry
 * and shader, not merely the palette. Broad, closed six-facet receiving scoops
 * have real depth; shorter return folds wrap the flanks. Raised amber channels
 * carry one crest inward. Initially separated receiving tongues interlock on the
 * torso. Jade faces, dark undersides, gold transport and narrow ivory crests are
 * distinct. Four phases have different support/twist/thickness/overlap, not just
 * four colours. No head marker, coin, clover, leaf, ascending particle, circular
 * hoop, old E texture/shader, background sampling or gameplay write exists.
 * Temporal support: receive [0,.16), converge [.16,.42), incorporate [.42,.78),
 * resolve [.78,1). u is always authority age/duration. Last active state retains
 * compact solid-looking field faces, never an all-transparent tail.
 * Spatial note: field vertices are in current body half-height units; their third
 * axis is the oriented right/up cross product. With a host depth attachment the
 * real depth test controls occlusion. Without it, a disclosed coarse torso
 * envelope hides rear roots; this is NOT an exact skin/limb occlusion solution.
 * Camera reverse-Z needs camera.reverseZ=true and matching renderer.depthCompare.
 * Triangle depth sorting does not modify the host depth; intersecting translucent
 * fields from multiple actors are approximate, not order-independent transparency.
 * Geometry reconstruction has a bounded CSS width floor; 12/16/20 subdivisions
 * are selected from actual size, never from an enlarged preview. At sampleCount=1
 * primitive edges are not MSAA-antialiased. Channel/glow falloff uses derivatives.
 * Production-size/skin quality and physical GPU timing remain host acceptance
 * tests. runSelfTests never promotes mock GPU results into render observations.
 *
 * Reference API contracts (implementation facts only, not old E references):
 * https://gpuweb.github.io/types/interfaces/GPUCommandEncoder.html
 * https://gpuweb.github.io/types/interfaces/GPURenderPassEncoder.html
 * https://gpuweb.github.io/types/interfaces/GPUQueue.html
 * https://www.w3.org/TR/WGSL/  (derivative uniformity; premultiplied outputs)
 * https://www.w3.org/TR/webaudio/  (scheduled nodes; context lifetime/autoplay)
 */

export const VERSION = 'luck-e/2026.09.25-2';
const KIND = 'bodyBenefitExtra/luckBoost';
const LIMITS = Object.freeze({events:256,pendingFrames:8,identities:100000});
const PHASE_EDGES = Object.freeze([0,0.16,0.42,0.78,1]);
const PHASE_NAMES = Object.freeze(['receive','converge','incorporate','resolve']);
const RECEIPTS = new WeakSet();
let receiptSequence = 0;
const U = Object.freeze({MAP_READ:1,COPY_SRC:4,COPY_DST:8,VERTEX:32,UNIFORM:64,QUERY_RESOLVE:512});
const ceilTo = (n,a) => Math.ceil(n/a)*a;
const saturate = x => Math.max(0,Math.min(1,x));
const lerp = (a,b,t) => a+(b-a)*t;
function requireThat(condition,message) {
  if (!condition) throw new TypeError(`${KIND}: ${message}`);
}
function number(value,name,min=-Infinity,max=Infinity) {
  requireThat(typeof value==='number' && Number.isFinite(value) && value>=min && value<=max,name);
  return value;
}
function id(value,name) {
  requireThat(typeof value==='string' && value.length>0 && value.length<=4096,name);
  return value;
}
function immutable(value) {
  if (value && typeof value==='object' && !Object.isFrozen(value)) {
    for (const v of Object.values(value)) immutable(v);
    Object.freeze(value);
  }
  return value;
}
function vec(value,n,name) {
  requireThat(value!=null && value.length===n,name);
  return Array.from(value,v=>number(v,name));
}
function jsonCopy(value) {
  return value===undefined ? null : JSON.parse(JSON.stringify(value,(_key,v)=>ArrayBuffer.isView(v) && !(v instanceof DataView)?Array.from(v):v));
}
const dot = (a,b) => a.reduce((s,x,i)=>s+x*b[i],0);
const eventKey = (session,eventId) => JSON.stringify([session,eventId]);
function signature(e) {
  return JSON.stringify([e.id,e.type,e.playerId,e.effectKind,e.variant,e.durationMs]);
}
function seedOf(text) {
  let h=0x811c9dc5;
  for (let i=0;i<text.length;i++) h=Math.imul(h^text.charCodeAt(i),0x01000193);
  h^=h>>>16; h=Math.imul(h,0x7feb352d); h^=h>>>15;
  return (h>>>0)/4294967296;
}
function matrixTimes(m,p) {
  return [0,1,2,3].map(r=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]*p[3]);
}
function rectangle(raw,name) {
  return {x:number(raw?.x,`${name}.x`,0),y:number(raw?.y,`${name}.y`,0),
    width:number(raw?.width,`${name}.width`,Number.MIN_VALUE),
    height:number(raw?.height,`${name}.height`,Number.MIN_VALUE)};
}
function physicalRect(r,dpr) {
  const x=Math.round(r.x*dpr),y=Math.round(r.y*dpr);
  return {x,y,width:Math.round((r.x+r.width)*dpr)-x,
    height:Math.round((r.y+r.height)*dpr)-y};
}
function intersection(a,b) {
  const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y);
  return {x,y,width:Math.max(0,Math.min(a.x+a.width,b.x+b.width)-x),
    height:Math.max(0,Math.min(a.y+a.height,b.y+b.height)-y)};
}
function checkedEvent(raw) {
  requireThat(raw && typeof raw==='object','event object');
  const e={id:id(raw.id,'event.id'),type:id(raw.type,'event.type'),
    playerId:id(raw.playerId,'event.playerId'),effectKind:raw.effectKind,
    variant:id(raw.variant,'event.variant'),durationMs:number(raw.durationMs,'durationMs',Number.MIN_VALUE),
    elapsedActorMs:number(raw.elapsedActorMs,'elapsedActorMs'),
    actorRate:number(raw.actorRate??1,'actorRate',0,64)};
  requireThat(e.effectKind==='luckBoost','only luckBoost is handled');
  return e;
}
function canonicalSnapshot(events) {
  requireThat(Array.isArray(events),'events must be a complete current snapshot');
  const map=new Map();
  for (const raw of events) {
    requireThat(raw && typeof raw==='object','event object');
    if (raw.effectKind!=='luckBoost') continue;
    const e=checkedEvent(raw),old=map.get(e.id);
    if (old) {
      requireThat(signature(old)===signature(e),`conflicting immutable payload: ${e.id}`);
      requireThat(old.elapsedActorMs!==e.elapsedActorMs || old.actorRate===e.actorRate,
        `ambiguous same-time rate: ${e.id}`);
      if (e.elapsedActorMs>old.elapsedActorMs) map.set(e.id,e);
    } else map.set(e.id,e);
  }
  return [...map.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
function phase(age,duration) {
  const u=age/duration;
  if (u<0 || u>=1) return {active:false,u,index:-1,name:u<0?'not-started':'expired'};
  const index=u<0.16?0:u<0.42?1:u<0.78?2:3;
  return {active:true,u,index,name:PHASE_NAMES[index],
    local:(u-PHASE_EDGES[index])/(PHASE_EDGES[index+1]-PHASE_EDGES[index])};
}

/** Pure, deterministic, defensive copy; no clock read, GPU call or side effect on input. */
export function plan(input) {
  requireThat(input && typeof input==='object','plan input');
  const sessionId=id(input.sessionId,'sessionId'),roomEpoch=id(input.roomEpoch,'roomEpoch');
  const dpr=number(input.dpr,'dpr',Number.MIN_VALUE,64);
  const zoom=number(input.zoom,'zoom',Number.MIN_VALUE,1000000);
  const viewport=physicalRect(rectangle(input.viewport,'viewport'),dpr);
  requireThat(viewport.width>0 && viewport.height>0,'empty physical viewport');
  const matrix=vec(input.camera?.viewProjection,16,'camera.viewProjection');
  const reverseZ=input.camera.reverseZ===true;
  requireThat(typeof input.surfaceVisible==='boolean','surfaceVisible boolean');
  requireThat(typeof input.reducedMotion==='boolean','reducedMotion boolean');
  requireThat(Array.isArray(input.actors),'actors array');
  const actorMap=new Map(),actorDescriptors=[];
  for (const raw of input.actors) {
    const aid=id(raw.id,'actor.id');
    requireThat(!actorMap.has(aid),`duplicate actor: ${aid}`);
    const position=vec(raw.position,3,'body centre');
    const right=vec(raw.body?.right,3,'body.right'),up=vec(raw.body?.up,3,'body.up');
    requireThat(Math.abs(dot(right,right)-1)<0.001 && Math.abs(dot(up,up)-1)<0.001 &&
      Math.abs(dot(right,up))<0.001,'current body axes must be orthonormal');
    const halfWidth=number(raw.body.halfWidth,'body.halfWidth',Number.MIN_VALUE);
    const halfHeight=number(raw.body.halfHeight,'body.halfHeight',Number.MIN_VALUE);
    requireThat(typeof raw.display?.visible==='boolean','display.visible boolean');
    const opacity=number(raw.display.opacity,'display.opacity',0,1);
    const clip=raw.display.clipRect?intersection(viewport,physicalRect(rectangle(raw.display.clipRect,'clipRect'),dpr)):viewport;
    const a={id:aid,position,body:{right,up,halfWidth,halfHeight},
      display:{visible:raw.display.visible,opacity,occluded:raw.display.occluded===true,clip},
      human:typeof raw.human==='boolean'?raw.human:null,
      poseType:raw.poseType??null,declaredAttributes:jsonCopy(raw.declaredAttributes)??{},
      poseMechanics:jsonCopy(raw.poseMechanics)};
    actorMap.set(aid,a); actorDescriptors.push(a);
  }
  const project=p=>{const q=matrixTimes(matrix,p);q[0]*=zoom;q[1]*=zoom;return q;};
  const entries=[],draws=[],warnings=[];
  for (const e of canonicalSnapshot(input.events)) {
    const p=phase(e.elapsedActorMs,e.durationMs),a=actorMap.get(e.playerId);
    const entry={...e,key:eventKey(sessionId,e.id),phase:p,reason:'drawable'};
    if (!p.active) entry.reason=p.name;
    else if (!a) entry.reason='missing-actor';
    else if (!input.surfaceVisible || !a.display.visible || a.display.occluded) entry.reason='hidden';
    else if (a.display.opacity===0) entry.reason='transparent';
    else if (!a.display.clip.width || !a.display.clip.height) entry.reason='clipped';
    if (entry.reason!=='drawable') {entries.push(entry);continue;}
    const c=project([...a.position,1]);
    const r=project([...a.body.right.map(v=>v*a.body.halfWidth),0]);
    const t=project([...a.body.up.map(v=>v*a.body.halfHeight),0]);
    let n=project([...cross3(a.body.right,a.body.up).map(v=>v*a.body.halfHeight),0]);
    const dz=n[2]*c[3]-c[2]*n[3];
    if(reverseZ?dz<0:dz>0)n=n.map(v=>-v);
    requireThat([...c,...r,...t,...n,a.body.halfWidth/a.body.halfHeight].every(v=>Number.isFinite(v)&&Math.abs(v)<3.4e38),'projection outside finite float32 range');
    const screen=v=>v[3]>1e-7?[v[0]/v[3]*viewport.width/2,-v[1]/v[3]*viewport.height/2]:null;
    const top=screen(c.map((v,k)=>v+t[k])),bottom=screen(c.map((v,k)=>v-t[k]));
    const left=screen(c.map((v,k)=>v-r[k])),right=screen(c.map((v,k)=>v+r[k]));
    const screenHeight=top&&bottom?Math.hypot(top[0]-bottom[0],top[1]-bottom[1]):0;
    const screenWidth=left&&right?Math.hypot(left[0]-right[0],left[1]-right[1]):0;
    const aspect=a.body.halfWidth/a.body.halfHeight;
    const metric=Math.max(2/Math.max(screenHeight,1),2*aspect/Math.max(screenWidth,1));
    // Conservative 3-D hull, including bevel/OBS expansion. Actual shape remains body-scaled.
    const padding=Math.max(.26,4*dpr*metric);
    const bounds=[-2.62-(.15+padding)/aspect,-.84-padding,2.62+(.15+padding)/aspect,.69+padding];
    const corners=[];
    for(const xx of [bounds[0],bounds[2]])for(const yy of [bounds[1],bounds[3]])for(const zz of [-.55,.95])
      corners.push(c.map((v,k)=>v+r[k]*xx+t[k]*yy+n[k]*zz));
    const planes=[v=>v[3]<=0,v=>v[0]<-v[3],v=>v[0]>v[3],v=>v[1]<-v[3],
      v=>v[1]>v[3],v=>v[2]<0,v=>v[2]>v[3]];
    if (planes.some(out=>corners.every(out))) entry.reason='clipped';
    if (entry.reason==='drawable' && screenHeight/dpr<12) warnings.push({id:e.id,
      code:'BELOW_REVIEWED_SIZE',detail:'Body under 12 CSS px; do not claim face/channel/joint readability invariance.'});
    if (entry.reason==='drawable' && screenWidth/dpr<3) warnings.push({id:e.id,code:'EDGE_ON_BODY_FRAME',
      detail:'Projected body right axis is under 3 CSS px; exact recipient/face readability needs the host skin and depth test.'});
    if (entry.reason==='drawable') draws.push({...entry,clipCenter:c,clipRight:r,clipUp:t,clipFront:n,
      opacity:a.display.opacity,clip:a.display.clip,seed:seedOf(entry.key),
      aspect,screenHeight,screenWidth,bounds,
      pan:c[3]>1e-7?Math.max(-.65,Math.min(.65,c[0]/c[3]*.65)):0});
    entries.push(entry);
  }
  const output=immutable({kind:KIND,version:VERSION,sessionId,roomEpoch,viewport,dpr,zoom,
    camera:{viewProjection:matrix,reverseZ,audit:jsonCopy(input.camera.audit)},surfaceVisible:input.surfaceVisible,reducedMotion:input.reducedMotion,
    actors:actorDescriptors,world:jsonCopy(input.world),entries,draws,warnings});
  return output;
}

/** Authority-only event adapter: never advances time and never invokes gameplay. */
export function createEventStore({sessionId,maxIdentities=LIMITS.identities}={}) {
  let session=id(sessionId,'sessionId'),room=null,dead=false;
  number(maxIdentities,'maxIdentities',1);requireThat(Number.isInteger(maxIdentities),'integer maxIdentities');
  const known=new Map();
  const alive=()=>requireThat(!dead,'event store destroyed');
  function ingest(raw) {
    alive(); if (raw?.effectKind!=='luckBoost') return {accepted:false,reason:'other-effect'};
    const e=checkedEvent(raw),prior=known.get(e.id);
    if (prior) {
      requireThat(signature(prior.event)===signature(e),`ID collision: ${e.id}`);
      if (prior.retired) return {accepted:false,reason:'retired'};
      if (e.elapsedActorMs<prior.event.elapsedActorMs) return {accepted:false,reason:'stale'};
      prior.event=e;
      if (e.elapsedActorMs>=e.durationMs) prior.retired=true;
      return {accepted:false,reason:'duplicate-updated'};
    }
    requireThat(known.size<maxIdentities,'identity capacity reached; rotate only at a NEW match');
    known.set(e.id,{event:e,retired:e.elapsedActorMs>=e.durationMs});
    return {accepted:true,reason:'new'};
  }
  return Object.freeze({
    ingest,
    sample(eventId,elapsedActorMs,actorRate=1) {
      alive();const p=known.get(id(eventId,'id'));
      if (!p) return {accepted:false,reason:'unknown'};
      return ingest({...p.event,elapsedActorMs,actorRate});
    },
    cancel(eventId) {alive();const p=known.get(eventId);if(p)p.retired=true;return !!p;},
    enterRoom(roomEpoch) {alive();room=id(roomEpoch,'roomEpoch');},
    snapshot() {alive();return immutable({sessionId:session,roomEpoch:room,
      events:[...known.values()].filter(p=>!p.retired).map(p=>({...p.event}))});},
    resetSession(next) {alive();id(next,'sessionId');requireThat(next!==session,'new sessionId required');session=next;room=null;known.clear();},
    inspect() {return immutable({sessionId:session,roomEpoch:room,identities:known.size,
      active:[...known.values()].filter(p=>!p.retired).length,destroyed:dead});},
    destroy() {dead=true;known.clear();}
  });
}

// Geometry is constructed in body half-height units, not in enlarged preview pixels.
// This is a finite FIELD with volumetric support, not equipment or a physics collider.
const cross3=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const plus3=(a,b)=>a.map((x,i)=>x+b[i]);
const scale3=(a,s)=>a.map(x=>x*s);
const minus3=(a,b)=>a.map((x,i)=>x-b[i]);
const norm3=a=>{const n=Math.hypot(...a);return n>1e-10?scale3(a,1/n):[0,0,1];};
const ease=(a,b,x)=>{const t=saturate((x-a)/(b-a));return t*t*(3-2*t);};
function curve3(cp,t) {
  const s=1-t;
  return cp[0].map((_,k)=>s*s*s*cp[0][k]+3*s*s*t*cp[1][k]+3*s*t*t*cp[2][k]+t*t*t*cp[3][k]);
}
function curveTangent(cp,t) {
  const s=1-t;
  return norm3(cp[0].map((_,k)=>3*s*s*(cp[1][k]-cp[0][k])+6*s*t*(cp[2][k]-cp[1][k])+3*t*t*(cp[3][k]-cp[2][k])));
}
function fieldState(u,reduced) {
  return {intake:ease(.03,.42,u),seat:ease(.42,.78,u),finish:ease(.78,1,u),
    // One travelling finite crest, not a loop or a particle population.
    front:lerp(.06,.98,ease(.015,.72,u)),travel:reduced?.12:1};
}
function fieldPaths(d,reduced) {
  const a=d.aspect,s=fieldState(d.phase.u,reduced);
  const f=s.intake*(reduced?.12:1),k=s.seat*(reduced?.12:1),e=s.finish*(reduced?.12:1);
  const v=(d.seed-.5)*.075*(reduced?.12:1);
  // Four open, blunt, volumetric folds; never a Y/X line network or a complete hoop.
  // The upper-left / lower-right folds carry the near exchange. Opposite folds
  // are shorter flank seats. Their start/end heights and depth turns differ.
  const poses=[
    {side:-1,layer:0,tier:0,
      open:[[-2.10,.42,-.28],[-2.42,.02,.12],[-1.15,-.43,.57],[-.38,-.16,.65]],
      intake:[[-1.36,.28,-.28],[-1.82,-.02,.29],[-.87,-.37,.64],[-.03,-.13,.70]],
      joined:[[-1.18,.21,-.12],[-1.52,-.07,.35],[-.78,-.27,.63],[.20,-.12,.69]],
      contained:[[-1.07,.05,-.02],[-1.29,-.11,.34],[-.58,-.27,.57],[.17,-.13,.64]],width:.222,twist:.86},
    {side:1,layer:0,tier:1,
      open:[[2.12,-.60,-.24],[2.38,-.06,.02],[1.19,.24,.55],[.38,-.24,.69]],
      intake:[[1.38,-.49,-.18],[1.78,-.13,.36],[.85,.16,.64],[.03,-.26,.73]],
      joined:[[1.17,-.46,-.08],[1.55,-.16,.38],[.75,.09,.63],[-.20,-.26,.70]],
      contained:[[1.03,-.43,-.01],[1.31,-.23,.35],[.56,.02,.56],[-.17,-.27,.66]],width:.203,twist:-.78},
    {side:1,layer:1,tier:0,
      open:[[1.31,.39,-.29],[1.68,.24,-.04],[1.40,.02,.30],[.72,-.10,.52]],
      intake:[[1.21,.33,-.16],[1.47,.18,.14],[1.14,.00,.38],[.54,-.10,.59]],
      joined:[[1.08,.23,-.11],[1.32,.10,.18],[.96,-.03,.43],[.42,-.12,.61]],
      contained:[[.99,.14,-.06],[1.19,.05,.16],[.88,-.03,.41],[.38,-.12,.57]],width:.131,twist:-.62},
    {side:-1,layer:1,tier:1,
      open:[[-1.38,-.56,-.32],[-1.67,-.42,-.02],[-1.37,-.23,.28],[-.73,-.26,.53]],
      intake:[[-1.22,-.50,-.16],[-1.43,-.40,.14],[-1.09,-.25,.39],[-.54,-.27,.60]],
      joined:[[-1.07,-.45,-.12],[-1.30,-.35,.19],[-.95,-.24,.43],[-.42,-.27,.63]],
      contained:[[-1.00,-.42,-.06],[-1.17,-.34,.19],[-.85,-.24,.41],[-.38,-.27,.59]],width:.123,twist:.60}
  ];
  const result=poses.map(q=>{
    const cp=q.open.map((p,j)=>p.map((value,axis)=>{
      let x=lerp(value,q.intake[j][axis],f);x=lerp(x,q.joined[j][axis],k);x=lerp(x,q.contained[j][axis],e);
      return axis===0?x*a:axis===1?x+v*q.side*(1-j/3):x;
    }));
    return {cp,side:q.side,tier:q.tier,layer:q.layer,role:0,
      width:q.width*(1+.20*s.seat-.12*s.finish),thickness:(q.layer===0?.070:.048)*(1+.38*s.seat),
      twist:q.twist*(1-.76*f)+q.side*.12*k};
  });
  for(const side of [-1,1]) {
    const gap=(1-.9*s.seat)*.20*a,y=-.205+side*.062;
    const tip=lerp(.35,-.30,s.seat)*side*a;
    result.push({cp:[[side*(.68*a+gap),y+.025,.60],[side*.42*a,y+.026,.69],
      [side*lerp(.48,.17,s.seat)*a,y-.01,.73],[tip,y-.025,.74]],
      tier:0,side,role:4,width:.065+.061*s.seat-.008*s.finish,
      thickness:.038+.030*s.seat,twist:side*.12,layer:2});
  }
  return result;
}
// Interleaved position(3), flat facet normal(3), along/cross(2), role/layer/gain/spare(4).
const VERTEX_FLOATS=12,VERTEX_BYTES=48,UNIFORM_BYTES=128;
function makeFieldMesh(d,planned) {
  const u=d.phase.u,st=fieldState(u,planned.reducedMotion),paths=fieldPaths(d,planned.reducedMotion);
  const cssHeight=Math.max(d.screenHeight/planned.dpr,1);
  const css=2/cssHeight;
  const steps=cssHeight<36?12:cssHeight<72?16:20;
  const bins={glow:[],guard:[],form:[]};
  const projection=p=>d.clipCenter.map((v,k)=>v+d.clipRight[k]*p[0]/d.aspect+d.clipUp[k]*p[1]+d.clipFront[k]*p[2]);
  const triangle=(bin,vertices,role,layer,gain=1)=>{
    const n=norm3(cross3(minus3(vertices[1].p,vertices[0].p),minus3(vertices[2].p,vertices[0].p)));
    const depth=vertices.reduce((v,x)=>{const q=projection(x.p);return v+q[2]/(Math.abs(q[3])>1e-9?q[3]:1e-9);},0)/3;
    const data=[];
    for(const v of vertices)data.push(...v.p,...n,...v.uv,role,layer,gain,0);
    bins[bin].push({depth,data});
  };
  const quad=(bin,a,b,c,d0,role,layer,gain=1)=>{
    triangle(bin,[a,b,c],role,layer,gain);triangle(bin,[a,c,d0],role,layer,gain);
  };
  const pathsMeta=[];
  for(const path of paths) {
    const dock=path.role===4,N=dock?6:steps;
    const samples=[];
    for(let i=0;i<=N;i++) {
      const t=i/N,C=curve3(path.cp,t),T=curveTangent(path.cp,t);
      const side=norm3(cross3([0,0,1],T)),normal=norm3(cross3(T,side));
      const angle=path.twist*(1-t)*(.7+.3*Math.cos(t*Math.PI));
      const W=plus3(scale3(side,Math.cos(angle)),scale3(normal,Math.sin(angle)));
      const F=plus3(scale3(normal,Math.cos(angle)),scale3(side,-Math.sin(angle)));
      const pulse=Math.exp(-Math.pow((t-st.front)/.17,2))*(1-.72*st.finish);
      // Broad centre and blunt bevelled roots; no feather, leaf tip or thin Y stroke.
      const profile=dock?(.88+.12*Math.sin(t*Math.PI)):(.56+.44*Math.sin((.13+.81*t)*Math.PI));
      const width=Math.max(path.width*profile,css*.90)*(1+.14*pulse);
      const height=path.thickness*(1+.5*pulse);
      samples.push({t,C,T,W,F,width,height,pulse});
    }
    const ring=(q,margin=0,channel=false)=>{
      const w=channel?Math.max(q.width*(.27+.08*q.pulse),css*.32):q.width+margin;
      const h=channel?Math.max(.015,css*.11)+.072*q.pulse:q.height+margin;
      const centre=plus3(q.C,scale3(q.F,channel?q.height+.017+q.pulse*.014:0));
      const X=[[-.72,1],[.72,1],[1,.25],[.72,-.85],[-.72,-.85],[-1,.25]];
      return X.map(([x,y])=>({p:plus3(plus3(centre,scale3(q.W,x*w)),scale3(q.F,y*h)),uv:[q.t,x]}));
    };
    for(const kind of ['guard','form','channel']) {
      const channel=kind==='channel';if(channel&&dock)continue;
      const margin=kind==='guard'?Math.min(css*.64,.115):0;
      const rings=samples.map(q=>ring(q,margin,channel));
      for(let i=0;i<N;i++)for(let j=0;j<6;j++) {
        const next=(j+1)%6;
        // Role 1 is a darker bevel, 2 the underside, 3 the integrated raised channel.
        const role=channel?3:dock?4:j===0?0:(j===2||j===3?2:1);
        quad(kind==='guard'?'guard':'form',rings[i][j],rings[i+1][j],rings[i+1][next],rings[i][next],role,path.layer);
      }
      for(const idx of [0,N]) {
        const q=samples[idx],C=plus3(q.C,scale3(q.F,channel?q.height+.017+q.pulse*.014:0));
        const v={p:C,uv:[q.t,0]};
        for(let j=0;j<6;j++)triangle(kind==='guard'?'guard':'form',idx===0?[v,rings[idx][(j+1)%6],rings[idx][j]]:
          [v,rings[idx][j],rings[idx][(j+1)%6]],channel?3:dock?4:1,path.layer);
      }
    }
    // Observation envelope is a broad smooth sheet, not the carrier geometry.
    // It follows the same projection, with a different width/time/intensity role.
    for(let i=0;i<N;i++) {
      const strip=q=>{
        const w=q.width+Math.min(.18,css*2.1);
        return [-1,1].map(sign=>({p:plus3(plus3(q.C,scale3(q.W,sign*w)),scale3(q.F,q.height*.75)),uv:[q.t,sign]}));
      };
      const A=strip(samples[i]),B=strip(samples[i+1]);
      quad('glow',A[0],B[0],B[1],A[1],5,path.layer,dock?1.2:1);
    }
    pathsMeta.push({layer:path.layer,from:samples[0].C,to:samples[N].C,
      width:Math.max(...samples.map(q=>q.width*2)),depth:Math.max(...samples.map(q=>q.C[2]))-Math.min(...samples.map(q=>q.C[2]))});
  }
  const result={};
  for(const [stage,triangles] of Object.entries(bins)) {
    // Shared host depth is read-only. Painter ordering resolves the field's OWN
    // closed faces without overwriting scene depth or allocating a private scene.
    triangles.sort((a,b)=>planned.camera.reverseZ?a.depth-b.depth:b.depth-a.depth);
    result[stage]=triangles.flatMap(t=>t.data);
  }
  result.meta={paths:pathsMeta,steps,cssHeight,vertices:result.form.length/VERTEX_FLOATS,
    minWorldZ:Math.min(...pathsMeta.map(p=>p.from[2])),maxWorldZ:Math.max(...pathsMeta.map(p=>p.to[2]))};
  return result;
}

/** Volumetric procedural mesh shading. No sampled textures, raster assets or background fetch. */
export const WGSL = /* wgsl */ `
struct Instance {
  center: vec4f,
  right: vec4f,
  up: vec4f,
  front: vec4f,
  state: vec4f,
  metrics: vec4f,
  viewport: vec4f,
  spare: vec4f,
}
@group(0) @binding(0) var<uniform> instance: Instance;
struct VertexIn {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
  @location(3) material: vec4f,
}
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
  @location(3) @interpolate(flat) material: vec4f,
}
@vertex fn vertexMain(v:VertexIn) -> VertexOut {
  var out:VertexOut;
  out.position=instance.center+instance.right*(v.position.x/instance.metrics.x)
    +instance.up*v.position.y+instance.front*v.position.z;
  out.local=v.position;
  out.normal=v.normal;
  out.uv=v.uv;
  out.material=v.material;
  return out;
}
fn encode(value:vec3f) -> vec3f {
  let v=clamp(value,vec3f(0.0),vec3f(1.0));
  let high=1.055*pow(v,vec3f(1.0/2.4))-0.055;
  let low=12.92*v;
  return mix(v,select(high,low,v<=vec3f(0.0031308)),instance.metrics.w);
}
// When a host depth attachment is unavailable, the body extents give a coarse
// ellipsoid silhouette exclusion for the REAR roots only. This is not new skin
// geometry and cannot replace an accurate per-skin depth/mask for hair or arms.
fn behindRecipient(p:vec3f) -> bool {
  let a=instance.metrics.x;
  let q=vec2f(p.x/(a*0.88),(p.y+0.10)/0.72);
  let r=dot(q,q);
  let torsoDepth=0.32*sqrt(max(0.0,1.0-r));
  return instance.spare.x>0.5 && r<1.0 && p.z<torsoDepth-0.02;
}
fn emittedColor(v:VertexOut,aa:f32) -> vec3f {
  let u=instance.state.x;
  let along=clamp(v.uv.x,0.0,1.0);
  let seat=smoothstep(0.42,0.78,u);
  let end=smoothstep(0.78,1.0,u);
  let front=mix(0.06,0.98,smoothstep(0.015,0.72,u));
  let crest=exp(-pow((along-front)/0.17,2.0))*(1.0-0.72*end);
  let stored=1.0-smoothstep(front-0.13,front+0.10,along);
  let role=v.material.x;
  // Facet radiance is an explicit anisotropic emission law of the declared field,
  // NOT an added point light, metal reflection or sampled environmental lighting.
  let n=normalize(v.normal);
  let orientation=0.18+0.32*abs(n.z)+0.50*max(0.0,dot(n,normalize(vec3f(-0.65,0.68,0.34))));
  var colour=mix(vec3f(0.004,0.10,0.085),vec3f(0.020,0.46,0.23),orientation);
  colour*=0.78+0.16*crest+0.06*seat;
  if(role>0.5 && role<1.5) {colour=vec3f(0.095,0.76,0.42)*(0.52+0.48*orientation);}
  if(role>1.5 && role<2.5) {colour=vec3f(0.003,0.042,0.054)*(0.68+0.32*orientation);}
  if(role>2.5 && role<3.5) {
    let channel=mix(vec3f(0.13,0.36,0.035),vec3f(1.0,0.57,0.018),0.40+0.60*stored);
    let hot=(1.0-smoothstep(0.08-aa*0.08,0.27+aa*0.08,abs(v.uv.y)))*(0.23+0.65*crest);
    colour=mix(channel*(0.72+0.28*orientation),vec3f(1.0,0.98,0.68),hot);
  }
  if(role>3.5 && role<4.5) {
    let lip=0.60+0.28*seat-0.08*end;
    colour=mix(vec3f(0.12,0.43,0.20),vec3f(1.0,0.69,0.038),lip);
    let seam=(1.0-smoothstep(0.08,0.34,abs(v.uv.y)))*(0.22+0.48*seat);
    colour=mix(colour*(0.67+0.33*orientation),vec3f(1.0,0.97,0.66),seam);
  }
  return colour;
}
@fragment fn formMain(v:VertexOut) -> @location(0) vec4f {
  // Every derivative is unconditional and precedes discard/control-dependent work.
  let aa=max(fwidth(v.uv.y),0.00001);
  let role=v.material.x;
  let alpha=instance.state.y*select(0.985,0.91,role>1.5 && role<2.5);
  if(behindRecipient(v.local) || alpha<0.004) {discard;}
  return vec4f(encode(emittedColor(v,aa))*alpha,alpha);
}
@fragment fn guardMain(v:VertexOut) -> @location(0) vec4f {
  if(behindRecipient(v.local)) {discard;}
  let a=instance.state.y*0.78;
  if(a<0.004) {discard;}
  return vec4f(encode(vec3f(0.003,0.018,0.024))*a,a);
}
@fragment fn glowMain(v:VertexOut) -> @location(0) vec4f {
  let aa=max(fwidth(v.uv.y),0.0001);
  let transverse=exp(-4.8*v.uv.y*v.uv.y)*(1.0-smoothstep(1.0-aa,1.0,abs(v.uv.y)));
  let along=0.35+0.65*sin(clamp(v.uv.x,0.0,1.0)*3.14159265);
  let seat=smoothstep(0.42,0.78,instance.state.x);
  let a=instance.state.y*0.29*transverse*along*v.material.z;
  if(behindRecipient(v.local) || a<0.003) {discard;}
  let colour=mix(vec3f(0.018,0.85,0.42),vec3f(1.0,0.67,0.04),0.16+0.35*seat);
  return vec4f(encode(colour)*a,a);
}
@fragment fn witnessMain(v:VertexOut) -> @location(0) vec4f {
  // Same geometry, occlusion, depth and scissor as the PRIMARY coloured carrier.
  // Guard, glow and dark underside alone are never witnesses for dedicated SFX.
  if(behindRecipient(v.local) || instance.state.y<0.25 ||
     (v.material.x>1.5 && v.material.x<2.5)) {discard;}
  return vec4f(0.0);
}
`;

/** Submission notifier. It deliberately has no submit/finish/encoder creation method. */
export function createFrameOwner({device,onError=()=>{}}={}) {
  requireThat(device?.queue?.onSubmittedWorkDone,'shared GPUDevice required');
  requireThat(typeof onError==='function','onError');
  const frames=new Map(),closed=new WeakSet();
  let destroyed=false;
  function validateFrame(frame) {
    requireThat(frame && typeof frame==='object' && frame.encoder?.beginRenderPass,'frame encoder');
    id(frame.id,'frame.id');
  }
  function report(error) {try{onError(error);}catch{/* reporting cannot retain GPU resources */}}
  return Object.freeze({device,
    watch(frame,observer) {
      requireThat(!destroyed,'frame owner destroyed');validateFrame(frame);
      requireThat(!closed.has(frame),'frame is already submitted or discarded');
      requireThat(typeof observer?.complete==='function' && typeof observer?.discard==='function','frame observer');
      if (!frames.has(frame)) frames.set(frame,[]);
      frames.get(frame).push(observer);
    },
    async submitted(frame,receiptContext) {
      validateFrame(frame);requireThat(!closed.has(frame),'duplicate frame submission notification');
      const context={sessionId:id(receiptContext?.sessionId,'receipt sessionId'),
        roomEpoch:id(receiptContext?.roomEpoch,'receipt roomEpoch'),
        surfaceVisible:receiptContext?.surfaceVisible===true};
      closed.add(frame);const observers=frames.get(frame)??[];frames.delete(frame);
      try {
        // The host must have submitted THIS encoder before this notification.
        await device.queue.onSubmittedWorkDone();
        const batches=await Promise.all(observers.map(o=>o.complete({...context,surfaceVisible:context.surfaceVisible&&!destroyed})));
        return Object.freeze(batches.flat());
      } catch (error) {
        for (const o of observers) {try{o.discard();}catch(e){report(e);}}
        report(error);throw error;
      }
    },
    discarded(frame) {
      validateFrame(frame);requireThat(!closed.has(frame),'frame already resolved');
      closed.add(frame);const observers=frames.get(frame)??[];frames.delete(frame);
      for (const o of observers) o.discard();
    },
    destroy() {
      destroyed=true;
      // Only unsubmitted frames remain here; the host promises not to submit them.
      for (const [frame,observers] of frames) {
        closed.add(frame);for(const o of observers) {try{o.discard();}catch(e){report(e);}}
      }
      frames.clear();
    }
  });
}

/** create({renderer,frameOwner}) -> exactly {ready,record,destroy}. */
export function create({renderer,frameOwner}={}) {
  const device=renderer?.device;
  requireThat(device?.createShaderModule && device?.createRenderPipelineAsync,'shared WebGPU device');
  requireThat(frameOwner?.device===device && typeof frameOwner.watch==='function','matching shared frameOwner');
  const format=id(renderer.format,'renderer.format');
  requireThat(['rgba8unorm','bgra8unorm','rgba8unorm-srgb','bgra8unorm-srgb','rgba16float'].includes(format),'supported blendable target format');
  const sampleCount=renderer.sampleCount??1;
  requireThat(sampleCount===1 || sampleCount===4,'sampleCount 1 or 4');
  const depthFormat=renderer.depthFormat??null;
  const depthCompare=renderer.depthCompare??'less-equal';
  const outputTransfer=renderer.outputTransfer??(format.endsWith('-srgb')||format==='rgba16float'?'linear':'srgb');
  requireThat(['linear','srgb'].includes(outputTransfer),'outputTransfer');
  requireThat(!format.endsWith('-srgb')||outputTransfer==='linear','sRGB texture performs encoding; do not encode twice');
  const maxEvents=renderer.maxEventsPerFrame??LIMITS.events;
  const maxPending=renderer.maxPendingFrames??LIMITS.pendingFrames;
  requireThat(Number.isInteger(maxEvents)&&maxEvents>0&&maxEvents<=8192,'maxEventsPerFrame 1..8192');
  requireThat(Number.isInteger(maxPending)&&maxPending>0,'maxPendingFrames');
  let disposed=false,readyState=false,session=null,epoch=null,generation=0;
  let layout,bindLayout,pipelines;
  const identities=new Map(),recordedFrames=new WeakSet(),pending=new Set();
  const stride=ceilTo(UNIFORM_BYTES,device.limits.minUniformBufferOffsetAlignment);
  const ready=(async()=>{
    const shader=device.createShaderModule({label:`${KIND}/WGSL`,code:WGSL});
    const info=await shader.getCompilationInfo();
    const errors=info.messages.filter(m=>m.type==='error');
    if(errors.length) throw new Error(errors.map(m=>`${m.lineNum}:${m.linePos} ${m.message}`).join('\n'));
    requireThat(!disposed,'destroyed while compiling');
    bindLayout=device.createBindGroupLayout({label:`${KIND}/layout`,entries:[{
      binding:0,visibility:3,buffer:{type:'uniform',hasDynamicOffset:true,minBindingSize:UNIFORM_BYTES}}]});
    layout=device.createPipelineLayout({bindGroupLayouts:[bindLayout]});
    const blend={color:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'},
      alpha:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'}};
    const desc=entryPoint=>({label:`${KIND}/${entryPoint}`,layout,
      vertex:{module:shader,entryPoint:'vertexMain',buffers:[{arrayStride:VERTEX_BYTES,attributes:[
        {shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'},
        {shaderLocation:2,offset:24,format:'float32x2'},{shaderLocation:3,offset:32,format:'float32x4'}]}]},
      fragment:{module:shader,entryPoint,targets:[{format,blend,writeMask:entryPoint==='witnessMain'?0:15}]},
      primitive:{topology:'triangle-list',cullMode:'none'},multisample:{count:sampleCount},
      ...(depthFormat?{depthStencil:{format:depthFormat,depthWriteEnabled:false,depthCompare}}:{})});
    pipelines=await Promise.all(['glowMain','guardMain','formMain','witnessMain'].map(n=>device.createRenderPipelineAsync(desc(n))));
    requireThat(!disposed,'destroyed while compiling');readyState=true;
    return immutable({status:'ready',format,sampleCount,depthFormat,
      diagnostics:info.messages.map(m=>({type:m.type,message:m.message,line:m.lineNum}))});
  })();
  // Avoid an unhandled rejection when an owner destroys before awaiting ready.
  ready.catch(()=>{});
  device.lost.then(()=>{disposed=true;generation++;}).catch(()=>{disposed=true;generation++;});
  function record({frame,target,viewport,planned}={}) {
    requireThat(!disposed,'pass destroyed or device lost');requireThat(readyState,'await ready before record');
    requireThat(planned?.kind===KIND && planned.version===VERSION && Array.isArray(planned.draws),'plan produced by this version');
    requireThat(frame && typeof frame==='object' && frame.encoder?.beginRenderPass,'frame.encoder');id(frame.id,'frame.id');
    requireThat(!recordedFrames.has(frame),'bodyBenefitExtra already recorded for this frame');
    const vp=viewport??planned.viewport;
    for(const k of ['x','y','width','height']) requireThat(vp[k]===planned.viewport[k],`viewport.${k} mismatch`);
    requireThat(target?.view,'shared target.view');
    number(target.width,'target.width',1);number(target.height,'target.height',1);
    requireThat(Number.isInteger(target.width)&&Number.isInteger(target.height),'integer target dimensions');
    requireThat(vp.x+vp.width<=target.width && vp.y+vp.height<=target.height,'viewport exceeds target');
    requireThat((target.sampleCount??1)===sampleCount,'sampleCount mismatch');
    requireThat(!depthFormat||target.depthView,'shared depthView required');
    if(depthFormat&&['less','less-equal','greater','greater-equal'].includes(depthCompare))
      requireThat(planned.camera.reverseZ===depthCompare.startsWith('greater'),'camera.reverseZ must match shared depth comparison');
    requireThat(sampleCount===1||target.resolveTarget,'MSAA requires shared resolveTarget');
    if(session!==planned.sessionId) {session=planned.sessionId;identities.clear();generation++;}
    if(epoch!==planned.roomEpoch) {epoch=planned.roomEpoch;generation++;}
    const invalid=new Set();
    for(const e of planned.entries) {
      const old=identities.get(e.id);
      if(old) {
        requireThat(old.signature===signature(e),`same ID changed immutable event payload: ${e.id}`);
        if(e.elapsedActorMs<old.age || old.expired) invalid.add(e.id);
        else {old.age=e.elapsedActorMs;old.expired=e.elapsedActorMs>=e.durationMs;}
      } else {
        requireThat(identities.size<LIMITS.identities,'identity capacity reached; NEW session required');
        identities.set(e.id,{signature:signature(e),age:e.elapsedActorMs,expired:e.elapsedActorMs>=e.durationMs});
      }
    }
    const draws=planned.draws.filter(d=>!invalid.has(d.id));
    requireThat(draws.length<=maxEvents,'event capacity exceeded; no identities silently merged');
    if(!draws.length) {recordedFrames.add(frame);return immutable({recorded:false,count:0,reason:'no-visible-active-events'});}
    requireThat(pending.size<maxPending,'pending-frame budget reached; submit or discard owned frames');
    requireThat(draws.length*stride<=device.limits.maxBufferSize,'uniform allocation exceeds device limit');
    const resources=[];let released=false;
    const release=()=>{if(released)return;released=true;pending.delete(release);for(const r of resources)r.destroy();};
    let inputBuffer,vertexBuffer,querySet,resolveBuffer,readBuffer;
    try {
      inputBuffer=device.createBuffer({label:`${KIND}/frame uniforms`,size:draws.length*stride,
        usage:U.UNIFORM,mappedAtCreation:true});resources.push(inputBuffer);
      const data=new Float32Array(inputBuffer.getMappedRange());
      draws.forEach((d,i)=>{
        const offset=i*stride/4;
        data.set(d.clipCenter,offset);data.set(d.clipRight,offset+4);data.set(d.clipUp,offset+8);
        data.set(d.clipFront,offset+12);
        data.set([Math.min(d.phase.u,0.999999),d.opacity,planned.reducedMotion?1:0,d.seed],offset+16);
        data.set([d.aspect,planned.dpr,d.screenHeight,outputTransfer==='srgb'?1:0],offset+20);
        data.set([vp.x,vp.y,vp.width,vp.height],offset+24);
        data.set([depthFormat?0:1,planned.camera.reverseZ?1:0,0,0],offset+28);
      });
      inputBuffer.unmap();
      const bind=device.createBindGroup({layout:bindLayout,entries:[{binding:0,
        resource:{buffer:inputBuffer,offset:0,size:UNIFORM_BYTES}}]});
      const meshes=draws.map(d=>makeFieldMesh(d,planned));
      let totalFloats=0;
      const ranges=meshes.map(m=>Object.fromEntries(['glow','guard','form'].map(stage=>{
        const first=totalFloats/VERTEX_FLOATS;totalFloats+=m[stage].length;
        return [stage,{first,count:m[stage].length/VERTEX_FLOATS}];
      })));
      requireThat(totalFloats*4<=device.limits.maxBufferSize,'mesh allocation exceeds shared-device limit');
      vertexBuffer=device.createBuffer({label:`${KIND}/body-volume mesh`,size:totalFloats*4,
        usage:U.VERTEX,mappedAtCreation:true});resources.push(vertexBuffer);
      const vertexData=new Float32Array(vertexBuffer.getMappedRange());let cursor=0;
      for(const m of meshes)for(const stage of ['glow','guard','form']){vertexData.set(m[stage],cursor);cursor+=m[stage].length;}
      vertexBuffer.unmap();
      querySet=device.createQuerySet({label:`${KIND}/primary visibility`,type:'occlusion',count:draws.length});resources.push(querySet);
      resolveBuffer=device.createBuffer({size:ceilTo(draws.length*8,256),usage:U.QUERY_RESOLVE|U.COPY_SRC});resources.push(resolveBuffer);
      readBuffer=device.createBuffer({size:draws.length*8,usage:U.COPY_DST|U.MAP_READ});resources.push(readBuffer);
      const pass=frame.encoder.beginRenderPass({label:KIND,
        colorAttachments:[{view:target.view,loadOp:'load',storeOp:'store',
          ...(sampleCount>1?{resolveTarget:target.resolveTarget}:{})}],
        ...(depthFormat?{depthStencilAttachment:{view:target.depthView,depthReadOnly:true,
          ...(depthFormat.includes('stencil')?{stencilReadOnly:true}:{})}}:{}),
        occlusionQuerySet:querySet});
      pass.setViewport(vp.x,vp.y,vp.width,vp.height,0,1);
      pass.setVertexBuffer(0,vertexBuffer);
      const order=draws.map((d,i)=>({i,z:d.clipCenter[2]/Math.max(Math.abs(d.clipCenter[3]),1e-9)}))
        .sort((a,b)=>planned.camera.reverseZ?a.z-b.z:b.z-a.z);
      for(let stage=0;stage<4;stage++) {
        pass.setPipeline(pipelines[stage]);
        for(const {i} of order) {
          const d=draws[i],range=ranges[i][stage===0?'glow':stage===1?'guard':'form'];
          pass.setScissorRect(d.clip.x,d.clip.y,d.clip.width,d.clip.height);
          pass.setBindGroup(0,bind,[i*stride]);
          if(stage===3)pass.beginOcclusionQuery(i);
          pass.draw(range.count,1,range.first,0);
          if(stage===3)pass.endOcclusionQuery();
        }
      }
      pass.end();
      frame.encoder.resolveQuerySet(querySet,0,draws.length,resolveBuffer,0);
      frame.encoder.copyBufferToBuffer(resolveBuffer,0,readBuffer,0,draws.length*8);
      const capturedGeneration=generation;
      pending.add(release);
      frameOwner.watch(frame,{
        discard:release,
        async complete(context) {
          try {
            if(disposed || capturedGeneration!==generation || !context.surfaceVisible ||
              context.sessionId!==planned.sessionId || context.roomEpoch!==planned.roomEpoch) return [];
            await readBuffer.mapAsync(1);
            if(disposed || capturedGeneration!==generation) {readBuffer.unmap();return [];}
            const counts=new DataView(readBuffer.getMappedRange());
            const result=[];
            for(let i=0;i<draws.length;i++) {
              const samples=counts.getBigUint64(i*8,true),d=draws[i];
              if(samples===0n)continue;
              const receipt=immutable({kind:KIND,version:VERSION,sequence:++receiptSequence,frameId:frame.id,
                sessionId:planned.sessionId,roomEpoch:planned.roomEpoch,id:d.id,playerId:d.playerId,
                eventType:d.type,variant:d.variant,durationMs:d.durationMs,
                elapsedActorMs:d.elapsedActorMs,actorRate:d.actorRate,
                phase:d.phase.name,pan:d.pan,visibleSamples:samples.toString(),
                proof:'shared-submission-completed/primary-form-samples',
                presentation:'host-surface-visible; OS scanout not measured'});
              RECEIPTS.add(receipt);result.push(receipt);
            }
            readBuffer.unmap();return result;
          } finally {release();}
        }
      });
      recordedFrames.add(frame);
      return immutable({recorded:true,count:draws.length,frameId:frame.id,
        receipt:'only frameOwner.submitted after host submission can yield receipts'});
    } catch(error) {release();throw error;}
  }
  function destroy() {if(disposed)return;disposed=true;generation++;identities.clear();
    // In-flight resources remain alive until their owner's complete/discard callback.
  }
  return Object.freeze({ready,record,destroy});
}

function validAuthority(receipt,state) {
  if(!state || state.sessionId!==receipt.sessionId || state.roomEpoch!==receipt.roomEpoch ||
    state.id!==receipt.id || state.playerId!==receipt.playerId || state.durationMs!==receipt.durationMs)
    return 'authority-mismatch';
  if(state.visible!==true)return 'hidden';
  if(!Number.isFinite(state.elapsedActorMs) || state.elapsedActorMs<receipt.elapsedActorMs ||
    state.elapsedActorMs<0 || state.elapsedActorMs>=state.durationMs)return 'inactive-or-stale';
  if(!Number.isFinite(state.actorRate) || state.actorRate<0 || state.actorRate>64)return 'invalid-rate';
  if(state.actorRate===0)return 'paused';
  return null;
}
function makeAudioBus(context,destination,gain) {
  const high=context.createBiquadFilter();high.type='highpass';high.frequency.value=85;high.Q.value=.5;
  const low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=1650;low.Q.value=.5;
  const compressor=context.createDynamicsCompressor();
  compressor.threshold.value=-15;compressor.knee.value=8;compressor.ratio.value=8;
  compressor.attack.value=.003;compressor.release.value=.045;
  const master=context.createGain();master.gain.value=gain;
  high.connect(low);low.connect(compressor);compressor.connect(master);master.connect(destination);
  return {input:high,nodes:[high,low,compressor,master]};
}
// Shared by real receipt-driven scheduling and the explicit offline diagnostic.
function schedulePhrase(context,destination,receipt,state,done) {
  const now=context.currentTime,start=now+.004;
  const rate=state.actorRate,D=state.durationMs,age=state.elapsedActorMs;
  const detune=(seedOf(eventKey(receipt.sessionId,receipt.id))-.5)*.07;
  const base=Math.pow(2,detune);
  const parameters=[
    {f:294,g:392,sweep:1.14,cap:.115,wave:'sine',level:.23},
    {f:330,g:440,sweep:1.12,cap:.140,wave:'triangle',level:.18},
    {f:440,g:554.365,sweep:1.005,cap:.165,wave:'sine',level:.22},
    {f:392,g:493.883,sweep:.96,cap:.110,wave:'sine',level:.17}
  ];
  const bus=context.createGain();bus.gain.value=1;
  const pan=context.createStereoPanner();pan.pan.value=receipt.pan??0;bus.connect(pan);pan.connect(destination);
  const sources=[],extras=[];let stopped=false,remaining=0,finished=false,scheduled=0;
  function releaseVoiceGraph() {if(finished)return;finished=true;bus.disconnect();pan.disconnect();for(const n of extras)n.disconnect();done?.();}
  function stop() {
    if(stopped||finished)return;stopped=true;
    const time=context.currentTime;
    bus.gain.cancelScheduledValues(time);bus.gain.setValueAtTime(bus.gain.value,time);
    bus.gain.linearRampToValueAtTime(0,time+.005);
    for(const s of sources) {try{s.stop(Math.min(s.__luckEnd,time+.005));}catch{/* already stopped */}}
    if(!sources.length)releaseVoiceGraph();
  }
  try {
    for(let i=0;i<4;i++) {
      const endAge=PHASE_EDGES[i+1]*D;
      if(age>=endAge)continue;
      const beginAge=Math.max(age,PHASE_EDGES[i]*D);
      const t0=start+(beginAge-age)/1000/rate;
      // Dry sources stay within D. Filter/compressor/device latency is separate.
      const endLimit=now+(endAge-age)/1000/rate;
      const duration=Math.min(parameters[i].cap,(endLimit-t0));
      if(duration<=.001)continue;
      const t1=t0+duration,attack=Math.min(.012,duration*.22),release=Math.min(.048,duration*.42);
      const p=parameters[i],suffix=(beginAge-PHASE_EDGES[i]*D)/(endAge-PHASE_EDGES[i]*D);
      for(let partial=0;partial<2;partial++) {
        const oscillator=context.createOscillator(),level=context.createGain();
        oscillator.type=p.wave;
        const f=(partial?p.g:p.f)*base*lerp(1,p.sweep,suffix);
        oscillator.frequency.setValueAtTime(f,t0);
        oscillator.frequency.exponentialRampToValueAtTime((partial?p.g:p.f)*base*p.sweep,t1);
        const amplitude=p.level*(partial ? 0.43 : 1);
        level.gain.setValueAtTime(0,t0);
        level.gain.linearRampToValueAtTime(amplitude,t0+attack);
        level.gain.setValueAtTime(amplitude*.72,Math.max(t0+attack,t1-release));
        level.gain.linearRampToValueAtTime(0,t1);
        oscillator.connect(level);level.connect(bus);extras.push(level);
        remaining++;oscillator.__luckEnd=t1;
        oscillator.onended=()=>{oscillator.disconnect();level.disconnect();if(--remaining===0)releaseVoiceGraph();};
        sources.push(oscillator);oscillator.start(t0);scheduled++;oscillator.stop(t1);
      }
    }
  } catch(error) {stop();const wrapped=new Error(`SFX scheduling failed: ${error.message??error}`);wrapped.sourcesScheduled=scheduled;throw wrapped;}
  if(!sources.length)releaseVoiceGraph();
  return {stop,hasSources:sources.length>0,anchorAudio:now,anchorAge:age,rate,
    endAudio:now+(D-age)/1000/rate,sourceCount:sources.length};
}

/** One bounded, low/mid-frequency SFX ensemble per authenticated visible event ID. */
export function createAudio({context,destination=context?.destination,authority,gain=.28,maxVoices=24}={}) {
  requireThat(context?.createOscillator && context?.createDynamicsCompressor,'caller-owned Web Audio context');
  requireThat(typeof authority==='function','live authority(receipt) callback required');
  number(gain,'gain',0,1);requireThat(Number.isInteger(maxVoices)&&maxVoices>0,'maxVoices');
  const root=makeAudioBus(context,destination,gain),seen=new Set(),active=new Map();
  let destroyed=false,started=0,cancelled=0,receiptFloor=0;
  function stopEntry(key) {const v=active.get(key);if(v){active.delete(key);v.voice.stop();cancelled++;}}
  function read(receipt) {try{const s=authority(receipt);return s?{...s,actorRate:s.actorRate??1}:null;}catch{return null;}}
  function sync() {
    if(destroyed)return;
    for(const [key,v] of active) {
      const state=read(v.receipt),problem=validAuthority(v.receipt,state);
      const expected=v.voice.anchorAge+(context.currentTime-v.voice.anchorAudio)*1000*v.voice.rate;
      // A discontinuity stops rather than retriggering previously played accents.
      if(context.state!=='running' || problem || state.actorRate!==v.voice.rate ||
        Math.abs(state.elapsedActorMs-expected)>Math.max(40,1000/24*state.actorRate))stopEntry(key);
    }
  }
  const stateListener=()=>{if(context.state!=='running') {for(const key of [...active.keys()])stopEntry(key);}
    else receiptFloor=receiptSequence;};
  context.addEventListener?.('statechange',stateListener);
  return Object.freeze({
    async unlock() {
      requireThat(!destroyed,'sound destroyed');
      if(context.state==='suspended') {await context.resume();receiptFloor=receiptSequence;}
      return context.state==='running';
    },
    accept(receipts) {
      requireThat(!destroyed,'sound destroyed');requireThat(Array.isArray(receipts),'receipt array');
      sync();const results=[];
      for(const receipt of receipts) {
        if(!RECEIPTS.has(receipt)) {results.push({id:receipt?.id??null,status:'unauthenticated'});continue;}
        const key=eventKey(receipt.sessionId,receipt.id);
        if(seen.has(key)){results.push({id:receipt.id,status:'already-started'});continue;}
        const state=read(receipt),problem=validAuthority(receipt,state);
        if(problem){results.push({id:receipt.id,status:problem});continue;}
        if(context.state!=='running'){receiptFloor=Math.max(receiptFloor,receipt.sequence);results.push({id:receipt.id,status:'awaiting-unlock'});continue;}
        if(receipt.sequence<=receiptFloor || state.elapsedActorMs-receipt.elapsedActorMs>250*Math.max(1,state.actorRate)) {
          results.push({id:receipt.id,status:'fresh-visible-receipt-required'});continue;}
        if(gain===0){results.push({id:receipt.id,status:'muted'});continue;}
        if(active.size>=maxVoices){results.push({id:receipt.id,status:'voice-budget-retry-on-fresh-receipt'});continue;}
        requireThat(seen.size<LIMITS.identities,'audio identity capacity; recreate at a NEW session');
        // Reserve synchronously before node creation. Failed/empty schedules roll back.
        seen.add(key);
        try {
          const voice=schedulePhrase(context,root.input,receipt,state,()=>active.delete(key));
          if(!voice.hasSources){seen.delete(key);results.push({id:receipt.id,status:'too-late-to-sound'});continue;}
          active.set(key,{receipt,voice});started++;
          results.push({id:receipt.id,status:'started',phase:phase(state.elapsedActorMs,state.durationMs).name});
        } catch(error) {if(!error.sourcesScheduled)seen.delete(key);throw error;}
      }
      return immutable(results);
    },
    sync,
    inspect() {return immutable({started,cancelled,active:active.size,identities:seen.size,destroyed});},
    destroy() {
      if(destroyed)return;destroyed=true;
      context.removeEventListener?.('statechange',stateListener);
      for(const key of [...active.keys()])stopEntry(key);
      for(const node of root.nodes)node.disconnect();seen.clear();
    }
  });
}

export const CONTRACT = immutable({
  schema_version:'B-Expression-2',scope:'one effect, not a replacement for the host game scene',
  gameMutation:false,clock:'authoritative elapsedActorMs / required durationMs',
  rendering:'caller-owned WebGPU encoder; no independent submission',
  receivingPass:'passes.bodyBenefitExtra.record({frame,target,viewport,planned})',
  audioGate:'authenticated nonzero primary-form GPU receipt AFTER shared submission, plus current authority',
  duplicateKey:'[sessionId,event.id]; immutable payload conflicts are errors',
  lifecycle:'hidden events age only through authority; roomEpoch invalidates pending receipts; no resurrection after expiry',
  rgba:'premultiplied source-over; fixed emerald/gold/ivory plus fixed dark edge; no background read',
  phases:PHASE_NAMES.map((name,i)=>({name,start:PHASE_EDGES[i],end:PHASE_EDGES[i+1]})),
  reducedMotion:'same lifetime and broad topology; major path/twist travel 12%, continuous raised acquisition crest and seating, no flashes or loops',
  size:'uses current body extents for closed volumes; 12/16/20 longitudinal tessellation and bounded CSS-width channel/guard support, not preview-only decoration',
  unsupported:'no legacy E assets, Canvas 2D, WebGL, dedicated raster image, camera capture or probability logic',
  limits:LIMITS,
  diagnostics:'readiness is shader/pipeline creation, not an artistic or OS-presentation pass',
  hostAcceptanceRequired:['actual game event integration','actual skins and dimensions','physical GPU/browser matrix',
    'foreground occlusion order','audio listening and autoplay gesture','OS presentation'],
  sources:['https://www.w3.org/TR/WGSL/','https://www.w3.org/TR/webaudio/',
    'https://gpuweb.github.io/types/interfaces/GPUCommandEncoder.html',
    'https://gpuweb.github.io/types/interfaces/GPURenderPassEncoder.html',
    'https://gpuweb.github.io/types/interfaces/GPUQueue.html']
});

const DOMAINS=Object.freeze(['Thermo','Fluid','Optics','Materials','Electromagnetics','Rheology','WaveOptics','SurfaceScience']);
const PH_REQUIRED=Object.freeze(['identity','DeepStructure','PhysicalModel','ScaleRegime','OctaDomain',
  'PerceptualReadability','GeometryConstraint','StateDynamics','Couplings','CausalityLinks','Evidence',
  'SurroundingChanges','VisualProjection','BeautyStructureApplication','AcceptanceCriteria','FailurePatterns']);
function domain(applicable,role,items,evidence) {
  return {applicability:applicable?'applicable':'not_applicable',role:applicable?role:'latent',items,evidence_or_constraint:evidence};
}
function octa(field) {
  return {conform_to:'OctaDomainTemplate',all_8_domains_required:true,Domains:{
    Thermo:domain(false,'latent',[field?'Declared emissive field is not combustion and has no assigned temperature.':'E does not heat or cool the existing actor.'],
      'No temperature is inferred from golden colour; host thermodynamics is outside this zero-thermal-load boundary.'),
    Fluid:domain(false,'latent',['No material is transported; WindCapsule explicitly exerts no E aerodynamic response.'],
      'Apparent inward propagation is field-state change, not air or liquid motion.'),
    Optics:domain(true,'primary',field?[
      'Closed folded volumes and the dovetail receiver emit distinct emerald/gold/ivory bands.',
      'Intensity progresses toward the body while the outside silhouette stays recognisable to expiry.'
    ]:[
      'The existing body supplies a projected attachment boundary and may occlude according to host depth.',
      'E does not sample or alter skin albedo; surrounding folds are identified relative to this same moving boundary.'
    ],field?'PH2.Evidence: thick scoops plus directed internal colour front.':'PH1.Evidence: shared projected centre/axes and preserved body silhouette.'),
    Materials:domain(!field,field?'latent':'supporting',field?[
      'No independent substance, microstructure or deformable solid is invented for the field.'
    ]:['Existing body geometry is an externally supplied kinematic boundary; no E displacement is applied.'],
      field?'Finite field support is defined by PH2.DeepStructure rather than a fictitious substance.':'PH1.PhysicalModel: zero E traction; host support and articulation are retained.'),
    Electromagnetics:domain(false,'latent',['The buff is not a charge, current, magnetic force or measured electromagnetic interaction.'],
      'The emission is a declared nonphysical representation, not a claim about real probability or electric fields.'),
    Rheology:domain(false,'latent',['No E viscosity, plastic deformation, creep or mechanical recovery is applied.'],
      'Timing curves are field-state orchestration; do not call them cloth damping or skin relaxation.'),
    WaveOptics:domain(false,'latent',['No interference, diffraction, prism or coherent phase assumption.'],
      'Colour bands are specified field colour, not thin-film spectra; shader pixel derivatives are not light wavelengths.'),
    SurfaceScience:domain(false,'latent',['No wetness, coating, adhesion, contamination or chemical residue.'],
      'The dovetail receiver terminates with the event and is not a deposited surface layer.')
  }};
}
function makePH({field,actor,event,visibility}) {
  const pid=field?'PH2':'PH1';
  const name=field?'有限な幸運獲得場':'既存身体の受容・付着境界';
  const reason=field?'One authoritative acquisition has its own finite state and ID; multiple layers share this state.':
    'The host body has an independently supplied position, orientation, support state and visibility boundary.';
  const identity={id:pid,name,origin:'declared',anchor:'body',visibility,
    local_state_difference:field?'Outer fold opening to inner reception; state front moves inward without deleting the scoops.':
      'Current body centre and axes differ from surrounding space; E follows them without changing the host pose.',partition_reason:reason};
  const evidence=field?['Broad front faces and dark return surfaces enclose open body-side spaces; near/far overlap is determined by actual 3-D vertices.','A raised amber crest moves along the faces; reception tongues close their gap and interlock while emerald volumes compact.']:
    ['The existing body is revealed through the staggered scoops and flank gaps; its face is not an effect anchor.','Centre, axis and depth move with the current actor rather than the original event location.'];
  const link={source:'PH1',target:'PH2',mechanism:'Existing body frame is the declared attachment boundary of this acquisition field.',
    consequence:'Folds and dovetail receiver follow the current recipient transform without imposing force or changing luck values.'};
  const conservation=(applies,why)=>({status:applies?'applicable':'not_applicable',balance_or_reason:why});
  return {
    identity,
    DeepStructure:{Core:field?'Inner seam is the terminal recipient region; its connected scoops persist through resolve.':'Current body frame fixes the acquisition locus, independent of event creation coordinates.',
      Structure:field?'Two broad opposing fluted volumes, two short flank folds, raised channels and offset reception tongues have actual six-faced cross-sections, depth and phase-dependent overlap.':
        `Host body half extents ${actor.body.halfWidth} m and ${actor.body.halfHeight} m, orthonormal right/up axes; joints are not replaced.`,
      Surface:field?'Gold front, emerald side face, tapered boundaries and fixed OBS edge separation have distinct widths.':
        'Existing host silhouette/depth is preserved; no wet layer, wound, extra garment or halo body is created.'},
    PhysicalModel:{model_kind:field?'declared_fantasy':'rigid_or_articulated',
      system_boundary:field?'PH2 spans only the body-relative fold paths and seam; no external receivers are added.':'PH1 is the host-supplied kinematic body boundary, not a resimulation of the whole character.',
      state_variables:field?'Normalised event age, 3-D curve controls, twist, section width/thickness, raised channel crest, reception gap/overlap and relative emission; no measured energy units asserted.':
        {position_m:actor.position,right:actor.body.right,up:actor.body.up,poseType:actor.poseType,mechanics:actor.poseMechanics},
      inputs:field?{event_id:event.id,event_type:event.type,effectKind:event.effectKind,variant:event.variant,
        recipient:'PH1',clock:'VideoGenerationPolicy.Duration and authoritative actor time'}:
        'Host current body/pose, camera and visibility; E contributes zero additional force and no gameplay change.',
      balance_conditions:{
        mass:conservation(!field,field?'A nonmaterial acquisition field carries no modelled mass.':'No E mass transfer; the host retains the same body and inventory.'),
        momentum:conservation(!field,field?'No recoil, impulse or propulsion is declared.':'E traction and impulse are zero; the host support/propulsion solution is unchanged.'),
        energy:conservation(true,field?'A bounded declared event envelope supplies visual emission and ends at authority expiry; no thermodynamic efficiency or measured joules are claimed.':
          'E adds no mechanical or thermal energy to the host body. Its original maintenance/locomotion balance is external input.'),
        charge:conservation(false,'No charge transfer is introduced or inferred from the display colour.')},
      constitutive_response:field?'fieldPaths(), makeFieldMesh() and emittedColor() map one event age to 3-D support, thickness, raised transfer crest and reception overlap under the unchanged host attachment boundary.':
        'Imported current host geometry determines projection and occlusion; response to E is zero mechanical deformation.',
      initial_condition:field?'At elapsedActorMs=0 all carrier folds have nonzero closed sections, raised transfer crests and separated body-side receiving tongues; no invisible lead-in.':'Use the host pose at the current authority sample; never replay the event-position pose.',
      boundary_conditions:field?'Body-relative support remains finite; outside its boundary there is no world substance. Event expiry removes the whole field with no remnant.':
        'Host support/contact and articulated boundaries are externally supplied; no floor or support prop is manufactured by E.',
      approximation_scope:field?'Closed 3-D field-support mesh with homogeneous projection, finite cross-sections and anisotropic face emission. It is neither real armour nor a numeric simulation of probability. Parameters are design choices, not material measurements.':
        'Kinematic boundary import only; material detail and joint solvers remain host-owned. No assertion of an unobserved host equilibrium.'},
    ScaleRegime:{characteristic_length:`Existing body height ${2*actor.body.halfHeight} m; fold widths and third-axis depths scaled by body half-height; reconstruction has a separately bounded CSS-pixel floor.`,
      characteristic_time:field?'The single event Duration, four normalised phases, and zero post-expiry lifetime.':'Current authoritative host pose sample and its unchanged response timescale.',
      dominant_balance:field?'Declared attachment dominates; gravity and medium do not advect this nonmaterial support.':
        'The original host support/inertia balance is preserved because E adds zero load.',
      dimensionless_reasoning:field?'u=elapsedActorMs/durationMs and body-relative lengths are relevant; Re, We and real particle settling are not applicable.':
        'E-to-host additional force ratio is zero by design; no Reynolds or elastic number is inferred.',
      detail_cutoff:'OBS1 reconstructs narrow boundaries near a CSS pixel; main scoops and the seam, not subpixel sparkle, are essential. Below 12 CSS px body height plan emits a warning.'},
    OctaDomain:octa(field),
    PerceptualReadability:{direct_evidence:visibility==='visible'?evidence:[],
      indirect_evidence:visibility==='visible'?[]:[field?'PH1 current state fixes the unrendered field placement.':'PH2 receiving frame follows this existing body when it becomes visible.'],
      figure_ground_separation:visibility==='visible'?'high':'not_applicable',
      edge_legibility:field?'Fixed dark guard, chromatic fill and narrow ivory core separate at ordinary game scale.':'No E body repaint; the host silhouette and relative fold spacing identify the recipient.',
      perceptual_failure_risk:'Extreme minification, edge-on projection, full occlusion or an opaque later pass can remove evidence; visibility is not inferred from background contrast.',
      cue_roles:evidence.map((cue,i)=>({cue,supports:i?'Current recipient and inward state propagation.':'Bounded acquisition rather than an overhead icon or outgoing attack.',
        reliability_and_overlap:'Shape and colour share projected geometry; they are complementary cues, not statistically independent measurements.'})),
      confusable_alternative:field?'An outgoing strike or a detached UI badge.':'A field attached to the actor old position instead of the current body.',
      disambiguating_evidence:field?'The progressive front terminates inward; no weapon, outgoing trajectory or upper-head symbol. Numeric luck magnitude is not recoverable from this effect.':
        'Current host transform is applied to every layer; event ID selects identity, not a frozen world coordinate.',
      viewing_conditions:'Design assumption: game displayed at CSS scale 1, DPR 1..4, body heights 12..96 CSS px. Actual skins, vision conditions and target hardware require review.'},
    GeometryConstraint:{surface_orientation:'Current host body right/up and their cross-product depth axis, transformed with one homogeneous world-to-clip matrix and zoom. Front sign follows standard/reversed WebGPU depth.',
      normal_field_coherence:'Closed sweep facets have cross-product normals. Front, bevel and return faces have distinct normal-dependent field radiance; no invented environmental light or mirror response.',
      curvature_behavior:field?'Four open 3-D cubic sweeps plus two body-attached short receiving tongues. No circular shell or coplanar stroke network.':'Host geometry unchanged.',
      silhouette_logic:field?'Outer and inner fold paths remain distinct at every active phase; open spaces preserve the body.':'Use the existing body silhouette and support relationships.',
      contact_relation:'Declared field attachment, not penetration or a new solid contact force.',
      spatial_relation:'Sides and lower torso region in body coordinates; no head-top offset or new floor plane.'},
    StateDynamics:{state_space_extent:field?'Four finite acquisition phases; inactive before 0 and at or after Duration.':'Host kinematic state; the effect does not add pose states.',
      transition_path_character:field?'monotonic':'equilibrium-maintained',local_stability_type:field?'stable':'neutral',
      convergence_behavior:field?'Broad acquisition front converges inward while bounded scoops persist.':'No E-induced convergence is added; the supplied host state is maintained as input.',
      damping_profile:field?'Final phase shortens the scoops into compact seated volumes while retaining substantial width, thickness and colour; the authority endpoint is explicit finite termination.':'No extra wobble or damping.',
      oscillation_pattern:'none',equilibrium_recovery:field?'No autonomous repeat; another event ID is another independently timed field.':'No E displacement to recover.',
      transition_failure_risk:'Using wall time, replaying stale samples or extending a faint ring beyond authority would violate the lifetime.',
      driving_input:field?'PhysicalModel.inputs authoritative acquisition and PH1 attachment.':'Host current pose; no added E force.',
      response_timescale:field?'ScaleRegime.characteristic_time; boundary transitions are fractions of the one Duration.':'Host supplied response; no independent E body clock.',
      phase_relation:field?'Geometry, internal colour front, dovetail receiver and sound use the same u; observation guard has no mechanical delay.':'Body follows the host current sample rather than the field phase.',
      stability_condition:'Event age and immutable duration remain authoritative; a clock discontinuity is not silently replaced by a restart.'},
    Couplings:{DominantCouplings:field?['PH1.Optics -> PH2.Optics: body placement and visible boundary bind the acquisition field.']:
      ['PH1.Optics -> PH2.Optics: current recipient geometry constrains field placement.'],SecondaryCouplings:[],
      CausalAssessment:{intervention:field?'Hold event identity and host transform fixed; advance only authoritative age.':'Hold event age fixed; move only the existing actor with the host transform.',
        predicted_response:field?'Gold coverage reaches the dovetail receiver; the outer scoops remain bounded until the event ends.':'Every E layer follows the new body frame, without game-state mutation.',
        competing_explanation:'A later compositor, full depth occlusion or small projection may hide cues without changing the acquisition state.',
        uncertainty:'Visual association reports an authoritative luck acquisition, not its numeric modifier or the outcome of a probability check. No physical causal identification or real-game study has been performed.',
        check_status:'hypothesis_only',evidence_refs:[]}},
    CausalityLinks:{physical_influence:[link],
      observation_dependency:field?[{source:'OBS1',target:'PH2',basis:'Edge mask follows the existing fold support.'},
        {source:'OBS2',target:'PH2',basis:'Narrow diffusion depends on selected emission and shape.'},
        {source:'OBS3',target:'PH2',basis:'Only filled primary-form samples can authorise the audio receipt.'}]:[],
      gaze_path:field?[{source:'PH2',target:'PH1',reason:'Inward front and seam terminate at the recipient.'}]:
        [{source:'PH1',target:'PH2',reason:'Body-side negative space leads to the two coloured scoops.'}]},
    Evidence:{direct:visibility==='visible'?evidence:[],indirect:visibility==='visible'?[]:[field?'PH1 attachment transform.':'PH2 receiving-frame constraint.'],
      candidates:['boundary','occlusion','phase_difference','silhouette','convergence']},
    SurroundingChanges:{entries:[{target:field?'PH1':'PH2',change:field?'Body-side reception is optically indicated; no host albedo, load or luck rule is changed.':
      'The field position and orientation follow the existing body.'}],latent_reference_target:visibility==='latent'?(field?'PH1':'PH2'):'none'},
    VisualProjection:{role:field?'essential':'supporting',world_state_ref:`${pid}.StateDynamics`,
      retained_cues:visibility==='visible'?evidence:[field?'Indirect PH1 attachment.':'Indirect PH2 receiving position.'],
      simplification:'Body-scale closed meshes retain broad faces, exposed channels and receiving overlap. Longitudinal tessellation is 12/16/20 by CSS size, not extra decoration. Host skin is retained.',
      omission_scope:[],exaggeration_scope:[],ambiguity_scope:[],intent_ref:'InferenceExpansionPolicy.ExpressionIntent'},
    BeautyStructureApplication:{conform_to:'PlatonicGoodTemplate.BeautyStructuring',target_policy:'standard',adjustment_reason:'not_applicable',
      axes:{contrast:field?['Dark guard against bright coloured fill.','Narrow ivory core against broader emerald/gold faces.']:
        ['Preserved body between the folds.','Host silhouette separated from adjacent E edges.'],
        hierarchy_gaze_flow:field?['Outer scoop to inner junction.','Raised crest to overlapping dovetail tongues.']:
          ['Body is the recipient rather than a separate icon.','Current body orientation organises both side structures.']}},
    GTB:{Good:'Authority, immutable target and no-gameplay-side-effect relationships are preserved.',
      Truth:'Single transform/clock, finite support and declared rather than measured field mechanism.',
      Beauty:'Two independent structural cues remain available without adding decorative objects.'},
    AcceptanceCriteria:{full_structure_present:true,all_8_domains_present:true,visibility_specific_evidence_present:true,
      physical_and_observation_links_not_mixed:true,physical_model_scale_and_response_consistent:true,
      perceptual_cues_and_identifiability_limits_explained:true,causal_assessment_status_matches_evidence:true},
    FailurePatterns:['head_marker','particle_only_second_half','background_adaptive_palette','before_after_only',
      'world_OBS_confusion','unmeasured_probability_claim','stale_authority_replay']
  };
}

function vfxLayer(layerId,role,world,details) {
  return {layer_id:layerId,role,domain:world?'world':'observation',
    selection:{basis:'attribute_resolved',scope_and_reason:details.reason},
    PH_refs:world?['PH2']:[],OBS_refs:world?[]:[details.obs],
    function_and_visible_result:details.result,
    spatial_structure:{anchor_and_transform:world?'PH1 body frame through the shared camera and physical viewport.':
      'Projected PH2 semantic support; screen-width reconstruction, no independent world thickness.',
      extent_orientation_depth:world?'Sides and lower torso in the host right/up/front frame; front/back extent, actual projected thickness, one shared depth test or disclosed body-envelope exclusion.':
        'Observation mesh follows the projected existing volume; its expansion is reconstruction, not extra PH mass or physical contact.',
      macro:details.macro,meso:details.meso,micro:details.micro,
      edge_and_occlusion:details.edge},
    material_and_optics:{carrier_and_mechanism:details.mechanism,
      emission_opacity_density:world?'Relative field emission and coverage are separate; no material-particle density is asserted.':
        'Coverage-controlled premultiplied OBS; no world emission or density is created.',
      color_and_light_response:details.color,
      model_refs:world?'PH2.PhysicalModel; PH2.OctaDomain.Domains.Optics':`ObservationIntegrationTemplate.ObservationRegistry.${details.obs}`},
    motion_and_phase:{driver_and_transport:details.motion,
      distribution_and_correlation:'No particle population, stochastic lifetime or independent emitter; not_applicable to particle statistics.',
      onset_peak_decay:details.time,
      state_and_sampling_refs:'PH2.StateDynamics; VideoGenerationPolicy.timeline; ObservationIntegrationTemplate.SamplingContract'},
    integration:{composite_and_mask:details.composite,
      protected_cues:'Existing body, both scoops, exact event independence and the inward receiving relation remain readable.',
      failure_to_avoid:details.failure}};
}

/**
 * Fully expanded B-Expression-2 JSON document for ONE authority event.
 * Pass a plan and its event ID. The event may be offscreen but must have a host
 * actor. For a complete body/character audit provide actor.human, poseType and
 * poseMechanics (intent,primary_axis,gaze_or_orientation,contact_points,
 * COM_or_support_center,reaction_or_propulsion,limb_or_appendage_roles,recovery,
 * mode='static_balance'|'dynamic_motion'). Rendering does not invent those facts.
 * Also supply input.world={gravity:{condition,vector,strength},
 * medium:{state,density,viscosity}} for host world conditions. Rendering ignores
 * these passive audit facts. Provide camera.audit={projectionType,view,projection,
 * pose,FOV_or_scale} too; its matrix product must equal the render viewProjection.
 * Missing facts are errors, not a fictitious B pass.
 */
export function buildBDesign(planned,eventId) {
  requireThat(planned?.kind===KIND,'buildBDesign expects plan output');
  if(eventId===undefined && planned.entries.length===1)eventId=planned.entries[0].id;
  const event=planned.entries.find(e=>e.id===eventId);requireThat(event,'select one authoritative event ID');
  const actor=planned.actors.find(a=>a.id===event.playerId);requireThat(actor,'existing recipient body required');
  requireThat(typeof actor.human==='boolean','complete B audit needs host actor.human (never inferred from count)');
  requireThat(['standing','seated','airborne','flying','quadruped','nonhumanoid'].includes(actor.poseType),
    'complete B audit needs the actual host poseType');
  const mechanics=actor.poseMechanics;
  for(const key of ['intent','primary_axis','gaze_or_orientation','contact_points','COM_or_support_center',
    'reaction_or_propulsion','limb_or_appendage_roles','recovery','mode'])requireThat(mechanics?.[key]!=null,`host poseMechanics.${key} required`);
  requireThat(['static_balance','dynamic_motion'].includes(mechanics.mode),'pose mechanics mode');
  requireThat(Array.isArray(mechanics.contact_points),'host contact_points array');
  const cameraAudit=planned.camera.audit;
  requireThat(cameraAudit && ['perspective','orthographic'].includes(cameraAudit.projectionType),
    'complete B audit requires camera.audit.projectionType, view, projection, pose and FOV_or_scale');
  const viewMatrix=vec(cameraAudit.view,16,'camera audit view');
  const projectionMatrix=vec(cameraAudit.projection,16,'camera audit projection');
  requireThat(cameraAudit.pose!=null && cameraAudit.FOV_or_scale!=null,'camera pose and FOV_or_scale required');
  const recomposed=[];
  for(let col=0;col<4;col++)recomposed.push(...matrixTimes(projectionMatrix,viewMatrix.slice(col*4,col*4+4)));
  requireThat(recomposed.every((v,k)=>Math.abs(v-planned.camera.viewProjection[k])<=1e-6*Math.max(1,Math.abs(v))),
    'camera audit view/projection disagree with the actual combined matrix');
  const world=planned.world;
  requireThat(world && ['normal','low_gravity','zero_gravity','inverted_gravity','directional_gravity','localized_gravity'].includes(world.gravity?.condition),
    'complete B audit requires actual host world.gravity.condition');
  requireThat(['air','water','vacuum','other'].includes(world.medium?.state),'complete B audit requires actual host world.medium.state');
  vec(world.gravity.vector,3,'world gravity vector');
  requireThat(world.gravity.strength!=null && world.medium.density!=null && world.medium.viscosity!=null,'complete host gravity/medium properties required');
  const visible=event.reason==='drawable'?'visible':'latent';
  const p1=makePH({field:false,actor,event,visibility:visible});
  const p2=makePH({field:true,actor,event,visibility:visible});
  const D=event.durationMs/1000;
  const budgetRef='ObservationIntegrationTemplate.IntensityBudget';
  const samplingRef='ObservationIntegrationTemplate.SamplingContract';
  const protectedRegions=['Existing body identity and pose','Areas outside the selected body-relative effect mask'];
  const obs=(kind,inputs,result,method)=>({operation_type:kind,input_references:inputs,
    target_mask:'Projected PH2 fold and receiver support, clipped by the host visible rectangle and optional depth.',
    stage:'world_render_observation',composite_method:method,intensity:`Bounded local operation; ${budgetRef}`,
    protected_regions:protectedRegions,output_consequence:result,dependencies:inputs,
    sampling_consequence:'Uses actual plan viewport and DPR; derivatives precede discard; no random texture or temporal flicker.'});
  const layers=[
    vfxLayer('shell','primary_form',true,{reason:'Realise the declared acquisition itself as two broad folded receiving volumes, not new armour or an object.',
      result:'Blunt six-sided emerald flutes begin splayed, turn inward and retain broad faces during compact termination.',
      macro:'Offset upper-left and lower-right scoops; open central space rather than a symmetric Y, X, circle or overhead badge.',
      meso:'Cubic 3-D sweeps with a closed six-vertex bevel section, front face, return edge and dark underside; path ends are real capped volumes.',
      micro:'12/16/20 longitudinal subdivisions selected by body CSS size; no decorative patterns or extra particles.',
      edge:'Actual half-height-relative depth spans rear roots to front receiving tongues. Host depth or explicit coarse recipient exclusion handles rear roots.',
      mechanism:'fieldPaths() produces phase-specific 3-D support; makeFieldMesh() constructs finite closed faces; emittedColor() assigns declared anisotropic radiance.',
      color:'Broad saturated emerald faces, brighter jade bevels, teal undersides. These field directions are not sampled lighting or metal reflection.',
      motion:'The two large scoops fold and shorten with intake, then roll into the recipient; reducedMotion scales support travel to 12 percent.',
      time:'Nonzero volume at u=0; marked contraction by .42; thickening and engagement .42-.78; compact but fully coloured to u<1.',
      composite:'Sorted actual triangles; no billboard-only shape. formMain writes after local envelope and guard; optional shared depth is read-only.',
      failure:'A flat constant-width stroke, detached buff icon, a white shell that erases the target, or a faint ring at the end.'}),
    vfxLayer('transport','internal_structure',true,{reason:'Resolve transfer inside the same acquiring field; no moving particle or separate emitter.',
      result:'A raised amber channel and a single broad ivory crest advance toward the body on each existing flute.',
      macro:'Gold transport is bounded by the larger emerald carrier; it cannot replace its silhouette.',
      meso:'Separate channel geometry has a raised cross-section. A finite Gaussian crest changes its height and breadth as well as colour.',
      micro:'Antialiased longitudinal hot region; no sparkle count, noise, repeated train or strobing.',
      edge:'Channel sits on the actual local front normal and is occluded by foreground faces as the folds turn.',
      mechanism:'Samples carry an authority-driven crest at s=.06 to .98; geometry height increases locally by up to .072 body half-heights.',
      color:'Amber reception and a restricted ivory crest; residual jade and dark underside keep the main carrier distinguishable.',
      motion:'The crest travels once along the path while carrier support folds on another envelope; reducedMotion keeps the continuous acquisition front.',
      time:'Crest starts in the outer mouth; reaches receiving region by .72; its raised volume settles, without replay or a second pulse.',
      composite:'Same PH2, different closed geometry and shader role 3, included in the primary witness. It is not bloom geometry.',
      failure:'Uniform recolouring of a static line, isolated hovering beads, or a high-frequency chain visible only when enlarged.'}),
    vfxLayer('latch','boundary',true,{reason:'Resolve where this acquisition ends: the existing body, not a target above it.',
      result:'Two low body-facing reception tongues begin separated and grow into an offset dovetail overlap during incorporation.',
      macro:'Body-width receiving joint below the face; an open start becomes joined relief, never a coin or a centre badge.',
      meso:'Short capped six-face volumes grow in width and thickness; their tips cross toward the other side only as acquisition seats.',
      micro:'One warm ridge with dark seams between overlapping faces; no rune or raster decal.',
      edge:'Tongues have distinct actual front depth and depth-sorted overlap; no physical collision or skin displacement is asserted.',
      mechanism:'fieldPaths() layer 2 and role 4; seat=ease(.42,.78,u) drives tongue endpoint, width, depth and emission together.',
      color:'Warm gold sides and narrow ivory ridge; target albedo and game modifiers are unchanged.',
      motion:'The gap closes after intake; receiver remains substantial through final compaction. No independent floating motion.',
      time:'Separated body-side sockets at reception; alignment through convergence; overlap in incorporation; stable coloured receipt until exact D.',
      composite:'formMain; geometry shares the same body frame and actual camera projection as all receiving paths.',
      failure:'Early complete central medallion, torso repaint, head marker or a lingering residue beyond D.'}),
    vfxLayer('flanks','boundary',true,{reason:'Resolve the depth and return faces of PH2, not more independent magical objects.',
      result:'Two shorter opposite-side return folds remain on the recipient flanks and make near/far and wrap direction readable.',
      macro:'Upper-right and lower-left counterfolds offset the two long receiving scoops; they do not close into a full ring.',
      meso:'Shorter 3-D curves have different start heights, twists and end positions from the long carriers.',
      micro:'Bevel/underside only; no added micro-decoration is needed to prove a layer count.',
      edge:'Rear roots are clipped by recipient depth/exclusion; curved middle faces appear at the flanks before returning toward the front.',
      mechanism:'fieldPaths() layer 1 uses its own four control-point sets and narrower section. Optional scene depth remains the authoritative occluder.',
      color:'Darker emerald return faces and mint edges, not a uniformly luminous body outline.',
      motion:'Short counterfolds settle mainly on the flanks rather than repeating the large transport displacement.',
      time:'Present in all phases; geometry remains finite as main scoops contract; removed only at authority expiry.',
      composite:'Included in the world triangle sort. Screen-space guard is not mislabelled as a physical rear surface.',
      failure:'All pieces coplanar, identical timing/shape for every layer, or pretending the coarse body proxy is a real per-skin depth mask.'}),
    vfxLayer('guard','observation_support',false,{obs:'OBS1',reason:'Separate this fixed-colour existing boundary on both bright and dark backgrounds without reading them.',
      result:'A narrow blue-black contour outside the finite faces preserves saturated colour on bright surfaces.',
      macro:'Same projected field envelope, no full-screen darkening or new mark.',
      meso:'Expanded duplicate cross-sections include real depth and end caps; they do not add a world thickness to PH2.',
      micro:'Cross-section margin min(.64 CSS pixel equivalent,.115 half-heights); no background-dependent width or tone.',
      edge:'Drawn before primary faces, with the same body exclusion and shared depth test; the core covers its interior.',
      mechanism:'makeFieldMesh() guard geometry and guardMain use fixed premultiplied colour with alpha .78 times actor opacity.',
      color:'Fixed linear (.003,.018,.024), never derived from the target or background.',
      motion:'Immediate observation of the same phase and coordinates; no separate mechanical response.',
      time:'Only within the authority lifetime.',composite:'Source-over; all guards precede all forms; no multiplied global pass.',
      failure:'Thick black sticker, adaptive outline or treating this reconstruction as physical deposited matter.'}),
    vfxLayer('diffusion','observation_support',false,{obs:'OBS2',reason:'Make the finite field luminous without using glow to manufacture its principal form.',
      result:'A soft jade/gold local envelope extends beyond emitting faces; the high-value channel remains narrow and shaped.',
      macro:'Follows actual path geometry, with separate longitudinal and transverse falloff; no lens flare, screen veil or new spark.',
      meso:'Envelope sheets sample the same 3-D paths but have a distinct cross-section and alpha law; they do not create another world sheet.',
      micro:'Physical-pixel derivatives soften transverse cutoff. Radius is body/size bound; no grain or stored bitmap.',
      edge:'Different extent from the guard; emitter geometry remains readable even when the envelope is removed.',
      mechanism:'makeFieldMesh() observation strip plus glowMain: Gaussian transverse falloff times bounded longitudinal profile.',
      color:'Fixed jade/gold mixture linked to seating phase; maximum single-fragment alpha .348 before actor opacity, not an additive white lift.',
      motion:'Follows the exact event state; no inertial tail or autonomous fade timer.',
      time:'Terminates with the carrier at D; reducedMotion uses the same finite schedule.',
      composite:'Local premultiplied source-over before guards and forms, under the single IntensityBudget.',
      failure:'Primary shape replaced by a blurred luminous line, grey fog on a black scene, or an envelope surviving the event.'})
  ];
  const commonTrack={start:0,end:D,state_before:'Authoritative event not yet active.',
    state_during:'Use current actor-ms and immutable D; no clock restart.',state_after:'Effect ends; host body/action continues unchanged.'};
  const doc={
    Scope:{event_id:event.id,sessionId:planned.sessionId,roomEpoch:planned.roomEpoch,
      recipient:actor.id,design_scope:'One acquisition and its existing host body boundary; not the full game scene.'},
    InferenceExpansionPolicy:{
      DeclaredIntent:{character_count:1,character_attributes:{[actor.id]:actor.declaredAttributes},
        main_action:'The existing character acquires luck; E reports the acquisition but never changes probability or idea progress.',
        main_objects:[{id:event.id,type:'luck acquisition field',count:1}],
        background:'Existing game scene, unchanged and not sampled for correction.',style:'Host game style; faceted emissive 3-D field with 2D-anime-compatible value separation.',
        text_logo_policy:'No readable text, labels, logos or overhead marker.'},
      ExpressionIntent:{source:'user_declared',purpose:'Make the recipient and finite acquisition legible throughout the authoritative lifetime.',
        must_communicate:['Luck belongs to this current body.','Inward acquisition and persistent main shape.','Separate acquisitions remain separate.'],
        preserve_ambiguity:[],allowed_omission:[],allowed_exaggeration:[],
        protected_relations:['Immutable event id and duration','No gameplay mutation','No background-adaptive correction','Host character/skin/pose unchanged']},
      SelectionLifecycle:{stages:['candidate','accepted','registered_world','registered_observation'],candidate_catalog_in_final_code:false,
        world_registry:'PhenomenonSystemTemplate.PhenomenonRegistry',observation_registry:'ObservationIntegrationTemplate.ObservationRegistry',
        adoption_checks:['DeclaredIntent_consistency','contribution','readability','activation_condition']},
      inferred_support_elements:{default_permission:'denied',explicit_user_permission_required:true,allowed_domains:[],
        allowed_scope:'No independent new subject, object, particle or light source.',support_declared_elements_without_overriding_them:true,
        latent_visualization_object_not_required:true},
      Acceptance:{declared_intent_preserved:true,inference_without_explicit_user_permission_absent:true,
        candidate_accepted_registered_distinguished:true,unselected_candidates_absent_from_final:true}},
    FoundationOperationTemplate:{OutputContract:{schema_version:'B-Expression-2',mode:'Video',operation:'design_only'},
      TemplateConsolidation:{per_chapter_template_count:1,template_position:'chapter_end',inter_template_duplication_forbidden:true,cross_chapter_reference_preferred:true},
      RuleContract:{fields:['rule_id','owner','priority','applies_when','requirement','exception_to','validation_id'],
        same_priority_resolution:'explicit_exception_or_compatible_union',unresolved_conflict_result:'spec_conflict'},
      GlobalInterpretation:{world_registry:'PhenomenonSystemTemplate.PhenomenonRegistry',
        observation_registry:'ObservationIntegrationTemplate.ObservationRegistry',full_PH_structure_required_for_all_visibilities:true,WindCapsule_required:true},
      UniversalNoLabelOnly:{label_only_declaration_forbidden:true,indirect_evidence_for_implicit_latent:true},
      Acceptance:{each_chapter_has_exactly_one_template:true,independent_template_groups_absent:true,
        unique_rule_ids_and_resolvable_references:true,same_priority_conflicts_resolved_explicitly:true}},
    PlatonicGoodTemplate:{Good:{evidence:'Target, clock and game-state boundary are preserved across every layer.'},
      Truth:{coordinate_continuity:'One body frame and world-to-clip transform.',physical_causality:'Declared field follows the existing body; no claim of real probability manipulation.',
        state_transition_readability:'Inward state front and dovetail receiver through four phases.'},
      Beauty:{boundary_readability:'Coloured thick scoops, thin ivory core and fixed dark guard.',
        gaze_circulation:'Body to scoop, then front back into recipient.',structural_separation:'Open spaces, volumetric turnbacks and a distinct seam.'},
      BeautyStructuring:{axes:['ratio_proportion','balance_symmetry','contrast','rhythm_repetition','whitespace_density','hierarchy_gaze_flow','material_response','temporal_phase'],
        standard_minimum_axes_per_PH:2,standard_minimum_evidence_per_applied_axis:2,intent_adjustment_ref:'InferenceExpansionPolicy.ExpressionIntent'},
      Acceptance:{each_PH_connected_to_at_least_two_GTB_layers:true,single_formula_does_not_dominate_beauty:true}},
    PhenomenonSystemTemplate:{PartitionPolicy:{criterion:'Independent existing body boundary and one finite acquisition state per ID.',
      shared_condition_policy:'Current camera, body and actor clock are shared; fold, crest and receiver responses are not collapsed.',no_discipline_based_split:true},
      SharedConditions:{},PhenomenonRegistry:{PH1:p1.identity,PH2:p2.identity},PhenomenonBlock:{PH1:p1,PH2:p2},
      Acceptance:{all_PH_have_required_full_structure:true,visible_implicit_latent_have_same_field_set:true,OBS_not_in_PH_registry:true,PIA_resolved_as_identification_lifecycle:true}},
    PEMTemplate:{Mode:{phenomenon_equality:true,focus_phenomenon:'none'},
      CausalMesh:{physical_mesh_required:true,gaze_target_policy:'standard',adjustment_reason:'not_applicable',
        gaze_path_A:'PH1 body -> PH2 outer scoops.',gaze_path_B:'PH2 internal front -> PH1 receiver.',local_extrema_connected_to_gaze_paths:true},
      AttentionControl:{attention_focus:'hierarchical',single_requires_explicit_request:true},
      Acceptance:{no_unexplained_isolation:true,gaze_paths_match_selected_policy_and_explicit_intent:true,local_peak_returns_to_mesh:true}},
    CoordinateGravityWindTemplate:{WorldApplicability:{status:'applicable',reason:'PH1 body boundary and PH2 finite world field exist.'},
      Units:{length:'m',time:'s',temperature:'K_if_host_uses_it; E_not_applicable',pressure:'Pa_if_host_uses_it; E_not_applicable',angle:'rad'},
      WorldCoordinates:{handedness:'right_handed',X:'right_positive',Y:'up_positive',Z:'backward_positive',camera_forward:'negative_Z',origin:'scene_origin'},
      CameraCoordinates:{X:'right_positive',Y:'up_positive',forward:'negative_Z',projection:cameraAudit.projectionType,FOV_or_scale:cameraAudit.FOV_or_scale,pose:cameraAudit.pose},
      ScreenCoordinates:{domain:'[0,1]x[0,1]',x:'0_left_to_1_right',y:'0_top_to_1_bottom'},
      TransformChain:{order:['world','camera','screen'],world_to_camera:{view:viewMatrix,pose:cameraAudit.pose},
        camera_to_screen:{projection:projectionMatrix,combined:planned.camera.viewProjection,zoom:planned.zoom,viewport:planned.viewport,dpr:planned.dpr}},
      ContactCoordinates:{contact_patch:mechanics.contact_points,contact_normal:'Host contact data; no new field contact normal.',
        support_relation:'Host existing support/propulsion; field attachment is not a material collision.',no_penetration:true},
      VectorField:{dominant_vector:{direction:'Body-side scoop mouth toward the receiving dovetail.',magnitude:'Normalised authority progression; not particle m/s.',falloff:'Finite field support.',fluctuation:'none'},
        secondary_vector:{direction:'Host body transport.',magnitude:'Imported unchanged.',falloff:'Rigid attachment.',fluctuation:'No E-induced fluctuation.'}},
      Gravity:{condition:world.gravity.condition,vector:world.gravity.vector,strength:world.gravity.strength,
        affected_responses:'Host body support only; field has no gravity-driven advection.',evidence:['Existing host pose/contact maintained.','No added falling or rising particles.']},
      WindCapsule:{required:true,medium_state:world.medium.state,medium_properties:{density:world.medium.density,viscosity:world.medium.viscosity},
        Field:{direction:'zero E-induced flow',speed:'0 m/s additional flow',gust:'none',shear:'none',turbulence:'none'},
        ApplicableResponses:{body:world.medium.state==='vacuum'?'not_applicable: no air drag in vacuum.':'Zero additional E aerodynamic load.',cloth:'No E cloth aerodynamic simulation.',hair:'No E hair aerodynamic simulation.',loose_elements:'No loose elements.',
          environment:'Existing medium unchanged; this field does not require air.'},non_applicable_responses_explicit:true},
      Acceptance:{world_camera_screen_transform_defined:true,screen_axis_convention_defined:true,Gravity_present:true,WindCapsule_present:true,
        medium_state_present:true,no_inapplicable_wind_evidence_required:true}},
    OctaDomainTemplate:{Domains:DOMAINS,Acceptance:{all_8_domains_present:true,role_classification_present:true,
      latent_does_not_require_direct_visualization:true,non_applicable_domains_retained_with_reason_and_latent_role:true}},
    AnimeStudiesTemplate:{application:'Compatibility layout only; runtime Video, not an image/keyframe generator.',
      KeyframeSnapshot:{phase:'action_peak',state_t_minus_1_evidence:'Earlier phase of this same field.',
        state_t_evidence:'Current authority phase; no mixed-time collage.',state_t_plus_1_evidence:'Remaining defined phase or termination, not an appended afterimage.'},
      Layout:{staging:'Body-centred side structures; front leads inward.',projection_consistency_ref:'CoordinateGravityWindTemplate',
        whitespace_role:'Scoop openings leave the body readable.'},
      PoseActing_or_SceneActing:{character_ref:`BeautifulPoseCapsule.characters.${actor.id}`,object_balance:'Host-maintained; no prop added.',contact_logic:'Host contact, no E support.'},
      MotionReadability:{motion_blur_smear_speed_line_policy:'explicit_user_request_only',primary_causality_replacement_by_motion_effects:false},
      CompositeIntegration:{observation_ref:'ObservationIntegrationTemplate',contact_shadow_used_for_integration:'not_applicable; E creates no material contact shadow.'},
      Acceptance:{previous_and_next_time_or_explicit_ambiguity_accounted_for:true,projection_consistent:true,posteffects_do_not_replace_primary_causality:true}},
    ObservationIntegrationTemplate:{ObservationRegistry:{
      OBS1:obs('edge',['PH2','display_condition'],'Fixed dark guard and pixel-appropriate contour reconstruction.','alpha_blend'),
      OBS2:obs('posteffect',['PH2','display_condition'],'Narrow emission-dependent diffusion before primary fill.','alpha_blend'),
      OBS3:{...obs('other',['PH2','optical_condition'],'No visible change; primary-form passing samples gate an authenticated receipt.','other'),
        target_mask:'Primary filled shape with effective opacity >= .25; not guard or glow.',intensity:'Zero colour writes; diagnostic only.'}},
      SamplingContract:{output_resolution:{viewport_physical:planned.viewport,dpr:planned.dpr},
        intended_display_scale:'CSS scale 1; host actual display conditions may differ.',
        spatial_detail_policy:'Keep filled fold/receiver topology; reconstruct narrow boundaries near a CSS pixel before adding any fine detail. No particle/grain frequencies.',
        temporal_sampling:'Host presentation cadence and exposure are not controlled by this module. Geometry samples authoritative actor-ms once per frame; no blur/integration added.',
        filter_and_resample_policy:'Shader derivatives soften channel/OBS falloff. Primitive-edge coverage uses the host sampleCount (1 or 4); no full primitive antialiasing at 1 sample or post-resampling is claimed. Geometry is tessellated at CSS-size-selected resolution.'},
      ImageIntegration:{ToneColor:'PH2 fixed palette, no global grading.',LightIntegration:'OBS2',ShadowDensity:'none',DepthAir:'none',EdgeLine:'OBS1',TextureOutput:'none'},
      LensFlareField:{response_visibility:'none',reason:'No physical lens model or flare requested; no surrogate source added.'},
      IntensityBudget:{global_observation_budget:'Local source-over only; no screenwide addition or adaptive correction.',
        para:'none',flare_gradient:'none',glow:'local: maximum single-fragment OBS2 alpha .348; source-over overlap remains bounded, no additive colour accumulation',diffusion:'same operation as glow; never duplicated',grain:'none',chromatic_aberration:'none',
        protected_region_priority:'highest',intentional_departures:[]},
      CompositeValidation:{contour_preserved:'not_tested',highlight_clipping:'not_tested',shadow_crushing:'not_tested',chroma_displacement:'not_tested',
        fine_detail_retention:'not_tested',protected_background_preserved:'not_tested'},
      Acceptance:{OBS_separate_from_PH:true,physical_lensflare_source_binding_preserved:true,display_artifact_does_not_fake_physical_source:true,
        intensity_budget_is_single_source_of_truth:true,sampling_conditions_and_actual_execution_distinguished:true}},
    ExtremumDesignColorTemplate:{PEV:{candidate_state_set:['selected: four-phase finite inward acquisition with persistent folded support'],
      selected_physics_extremum:'finite-inward-acquisition',reason:'Preserves the actor-relative receiving relation without pretending to implement game probability.'},
      AES:{selected_from_PEV_only:true,visual_circulation:'Outer fold paths toward body seam.',asymmetric_balance:'Small stable identity variation, not random noise.',
        tension_release:'Broad front settles inward; final support remains substantial.',body_environment_consonance:'Body unchanged; surrounding field follows it.',selected_aesthetic_extremum:'finite-inward-acquisition'},
      DesignScience:{VisualHierarchy:'Filled scoops -> dovetail receiver -> narrow core -> diffusion.',DensityPlan:'Concentrated on folds; open body-side gaps.',
        ShapeOrder:'Two offset long scoops, two short flank returns and an interlocking receiver; not a numerical beauty formula.',OrnamentFunction:'No independent ornaments; all detail serves reception/phase/outline.'},
      CCM:{Palette:{base:'emerald face (.004,.10,.085) to (.020,.46,.23); jade bevel (.095,.76,.42)',secondary:'amber channel (1,.57,.018); seated gold (1,.69,.038)',accent:'narrow ivory (1,.98,.68)',neutral:'fixed dark guard (.003,.018,.024); underside (.003,.042,.054)'},
        ColorDynamics:{temp:'mixed',value_range:'Fixed high local contrast with bounded output.',saturation:'Strong coloured body; narrow desaturated core.'},
        Lighting:{key_K:'not_applicable to a declared coloured field; host lighting unchanged.',fill_tint:'none added'},
        BackgroundBinding:{bg_dominant:'Existing host background; not read.',bg_accent:'Existing host background; not read.'},
        PerceptualControl:{attention_focus:'hierarchical',figure_ground_stability:'high',arousal_level:'mid',perceptual_noise_tolerance:'low'}},
      Acceptance:{PEV_applied_before_AES_when_world_candidates_exist:true,AES_does_not_override_world_validity:true,legacy_FDS_resolved_to_DesignScience:true,CCM_fields_fixed:true}},
    ReflectionClosureTemplate:{Applicability:{applies_when:[],otherwise:'No E reflection or surface sheen selected; underlying host material is unchanged.'},
      ReflectionClosureBlock:{},not_applicable_reason:'Emission is not reflection. No new skin highlight, wetness, cloth sheen or metallic response.',
      Acceptance:{reflection_integrated_into_PH_mesh:true,lensflare_registered_as_OBS_not_reflection:true}},
    PhenomenonProfileTemplate:{ApplicabilityGuide:{selections:[]},ProfilePolicy:{secondary_boost_only:true,full_PH_structure_still_required:true,only_selected_profiles_in_design:true},
      Profiles:{},not_applicable_reason:'No new fluid, fire, cloth, metal, wetting or reactive material mechanism.',
      Acceptance:{profile_does_not_replace_PH_schema:true,reactive_profile_only_when_applicable:true}},
    TermsTemplate:{PH:'world-internal state/boundary',OBS:'observation/diagnostic operation',PIA:'identification lifecycle',PEM:'phenomenon equality',
      PEV:'physical state selection',AES:'aesthetic state selection',CCM:'fixed palette/lighting/background binding',
      FDS:'legacy alias -> DesignScience + AES',DeclaredIntent:'explicit user meaning and constraints',ValidationResults:'actual checks, never copied requirement flags',
      Acceptance:{undefined_legacy_terms_absent:true}},
    ExtensionActivationTable:{entries:{
      CharacterPolicy:{active:actor.human,trigger:'human_character_exists',basis:'host declared character kind'},
      BeautifulPoseCapsule:{active:true,trigger:'character_body_exists',basis:'existing host body'},
      VFX:{active:true,trigger:'explicit',basis:'user requested finite acquisition VFX'},
      PostEffects:{active:true,trigger:'attribute_resolved',basis:'exact local guard/diffusion operations only'},
      LDM:{active:true,trigger:'explicit_VFX',basis:'bounded phase-dependent emission'},
      GradientAnchorPolicy:{active:true,trigger:'attribute_resolved',basis:'internal field hue front'},
      VideoGenerationPolicy:{active:true,trigger:'Mode=Video',basis:'runtime timed field'}},
      disabled_modules_omitted:['KeywordExpansion'],expression_intent_ref:'InferenceExpansionPolicy.ExpressionIntent',
      output_contract_ref:'FoundationOperationTemplate.OutputContract',Acceptance:{one_activation_source_of_truth:true,disabled_modules_omitted:true}},
    BeautifulPoseCapsule:{characters:{[actor.id]:{trigger:'character_body_exists',PosePhase:mechanics.mode==='static_balance'?'STATIC':'TRANSITION',
      PoseType:actor.poseType,Common:{intent:mechanics.intent,primary_axis:mechanics.primary_axis,gaze_or_orientation:mechanics.gaze_or_orientation,
        contact_points:mechanics.contact_points,COM_or_support_center:mechanics.COM_or_support_center,reaction_or_propulsion:mechanics.reaction_or_propulsion,
        limb_or_appendage_roles:mechanics.limb_or_appendage_roles,recovery:mechanics.recovery,
        PH_mechanics_refs:{PhysicalModel:'PH1.PhysicalModel',ScaleRegime:'PH1.ScaleRegime',StateDynamics:'PH1.StateDynamics'},
        static_dynamic_mechanics:{mode:mechanics.mode,static_balance_or_support:mechanics.mode==='static_balance'?mechanics.reaction_or_propulsion:'not_applicable; host dynamic motion.',
          momentum_propulsion_or_contact_change:mechanics.mode==='dynamic_motion'?mechanics.reaction_or_propulsion:'not_applicable; host static balance.'},
        perceptual_readability_ref:{PerceptualReadability:'PH1.PerceptualReadability',joint_and_contact_cues:['Host current pose/contact retained.','E adds no body deformation.']}},
      Acceptance:{pose_type_specific_mechanics_complete:true,standing_defaults_not_forced_on_other_types:true,contact_COM_force_axis_roles_recovery_present:true}}}},
    VFX:{trigger:'explicit',world_registration:'PhenomenonSystemTemplate.PhenomenonRegistry',observation_registration:'ObservationIntegrationTemplate.ObservationRegistry',
      design_intent:{subject_and_action:'One finite body acquisition of luck.',expression_intent_ref:'InferenceExpansionPolicy.ExpressionIntent',
        primary_read:'Inward folded reception on this body, never an overhead marker.',layering_basis:'Two large receiving scoops, shorter flank returns, a raised travelling channel, a thickening dovetail and two local observations have distinct functions; all world layers resolve the same finite acquisition PH.'},
      layers,interlayer_links:[{source_layer:'transport',target_layer:'shell',relation_type:'visual_relation',mechanism_and_consequence:'The state front is restricted to existing fold support.',foundation_binding:'PH2.DeepStructure'},
        {source_layer:'latch',target_layer:'shell',relation_type:'visual_relation',mechanism_and_consequence:'The offset inward scoops terminate on body-facing receiving tongues whose gap and overlap are phase-controlled.',foundation_binding:'PH2.GeometryConstraint'},
        {source_layer:'flanks',target_layer:'shell',relation_type:'visual_relation',mechanism_and_consequence:'Short return folds supply distinct rear/flank depth around the same recipient without closing a circle.',foundation_binding:'PH2.GeometryConstraint'},
        {source_layer:'guard',target_layer:'shell',relation_type:'observation_dependency',mechanism_and_consequence:'Projected support supplies edge coverage.',foundation_binding:'OBS1 -> PH2'},
        {source_layer:'diffusion',target_layer:'shell',relation_type:'observation_dependency',mechanism_and_consequence:'Emission/support supplies bounded exterior diffusion.',foundation_binding:'OBS2 -> PH2'}],
      causal_path:{input:`Authority event ${event.id}`,carrier_PH:'PH2',receiver:'PH1 body attachment; no gameplay change',
        ScaleRegime_ref:'PH2.ScaleRegime',StateDynamics_ref:'PH2.StateDynamics',ReactivePhaseChange_ref:'not_applicable; no reaction or material conversion'},
      orchestration:{common_time_basis:'VideoGenerationPolicy.timeline / current actor-ms',layer_phase_relations:'Receive: splayed closed scoops and separated tongues. Converge: broad single crest travels as long folds turn inward. Incorporate: tongues thicken and overlap while outer scoops shorten. Resolve: compact coloured relief remains; no particle or halo-only tail. Each uses the same authority time, not simultaneous unrelated peaks.',
        environment_response:'Only the existing body attachment/occlusion relation; no extra receivers, floor, smoke or particles.',
        visual_hierarchy:'Filled colour and inward topology dominate narrow core and diffusion.',bullet_time:'not_applicable; not requested'},
      output_integration:{budget_ref:budgetRef,sampling_contract_ref:samplingRef,LDM_ref:'LuminanceDynamicsModule',
        composite_order:'All local diffusion meshes -> all fixed guard meshes -> back-to-front primary volume triangles -> identical primary triangles with colour writes disabled for occlusion witnesses.',
        color_alpha_contract:`Executed premultiplied source-over. Transfer is chosen explicitly at create(), not inferred from background.`,
        scale_adaptation:'Screen-width reconstruction; no particle count or stroke symbol substitutions.'},
      validation_plan:{layer_checks:'Scoops, directed front, dovetail receiver, edge and narrow diffusion independently identifiable.',
        composite_checks:'Premultiplication, depth, clip rectangles, coloured coverage and no outside-region luma lift.',
        temporal_checks:'All four phases and expiry; independent events, stale and hidden cases.',actual_results_ref:'GlobalAcceptanceTemplate.ValidationResults'},
      Acceptance:{world_VFX_registered_as_PH:true,observation_only_effects_not_misregistered_as_VFX_PH:true,layer_roles_scales_and_relations_explicit:true,
        layer_count_does_not_force_new_content_or_PH_partition:true,material_motion_environment_and_composite_consistent:true,
        shared_intensity_and_sampling_contracts_preserved:true,structural_requirements_not_reported_as_render_evidence:true}},
    PostEffects:{trigger:{ordinary_posteffects:false,beta_targets:[]},selection:{mode:'exact_selected_operations',
      scope_resolution:'attribute_resolved_target_and_scope',exact_selected_operations:[{operation:'fixed_contour_guard',basis:'attribute_resolved',target:'PH2'},
        {operation:'narrow_emission_diffusion',basis:'attribute_resolved',target:'PH2'}]},
      autonomous_activation:{physical_causality_input_required:false,registry:'ObservationIntegrationTemplate.ObservationRegistry',budget_ref:budgetRef,sampling_contract_ref:samplingRef},
      SPCA:{applies_if:'world_internal_PH_local_peak_selected',evidence_types_standard_two_of:['gradient','occlusion'],explicit_intent_adjustment:'not_applicable',PostEffects_alone_does_not_require_new_PH:true},
      global_posteffects:{applies:false,exact_OBS_operations:[],OBS_refs:[]},local_posteffects:{applies:true,targets:['PH2'],exact_OBS_operations:['fixed_contour_guard','narrow_emission_diffusion'],OBS_refs:['OBS1','OBS2']},
      operation_contract:{required_fields:['input_references','target_mask','stage','composite_method','intensity','protected_regions','sampling_consequence'],
        sampling_consequence:'Actual shader derivatives; cadence is host-owned and no exposure integration is inserted.'},
      Acceptance:{exact_selected_operation_does_not_infer_layers:true,global_local_scope_unambiguous:true,legacy_five_domain_reference_absent:true}},
    LuminanceDynamicsModule:{trigger:{explicit_VFX:true,explicit_PostEffects:false,inferred_requires_luminance_dynamics:false},omitted_if_not_enabled:true,
      target_metrics:{target_size:actor.body, camera_distance:'Encoded by current viewProjection; not independently guessed.',
        screen_occupancy:'Derived from projected body support; no fixed numeric default.',readability_priority:'high'},
      Video:{temporal_envelope:'Continuous bounded reception/convergence/incorporation/resolve; luminance stays substantial to the final active sample.',
        micro_variation:'none; not requested',anti_flicker:'No temporal noise; preserve intentional phase changes and inspect host cadence limits.'},
      budget_ref:budgetRef,sampling_contract_ref:samplingRef,sampling_consequence:'Narrow core and guard reconstructed at the actual DPR; no grain/strobe sampling.',
      AlphaBackground:{enabled:false,required_background_if_enabled:'#000000'},alpha_ref:'LuminanceDynamicsModule.AlphaBackground',
      ActivationExclusions:{non_emissive_particles_only:'no_auto_activation',grain_only:'no_auto_activation'},
      Acceptance:{mode_specific_envelope:true,numeric_defaults_subordinate_to_target_metrics:true,no_unwanted_global_luma_lift:true}},
    GradientAnchorPolicy:{trigger:'attribute_resolved',gradient_type:'world_VFX_gradient',anchor:'PH2',
      registration:{world_VFX_gradient:'PhenomenonSystemTemplate.PhenomenonRegistry'},
      Acceptance:{physical_and_observation_gradients_distinguished:true,unanchored_world_gradient_absent:true}},
    VideoGenerationPolicy:{Mode:'Video',Duration:{source:'user_declared',seconds:D},Style:'DeclaredIntent.style',dataclass_forbidden:true,
      timeline:{unit:'seconds',tracks:{PH:[{id:'PH1',...commonTrack},{id:'PH2',...commonTrack}],
        OBS:['OBS1','OBS2','OBS3'].map(oid=>({id:oid,...commonTrack})),
        camera:[{...commonTrack,transform:planned.camera.viewProjection}],
        audio:[{id:'luckSFX',...commonTrack,state_before:'No sound before a visible submitted receipt.',
          state_during:'At most one finite SFX ensemble for this ID; enter at current phase, not at the original beginning.',
          state_after:'No loop, reverb tail or deferred autoplay backlog.'}],dialogue:[]}},
      ContinuityLedger:{characters:[actor.id],costumes:'Host skin/costume unchanged.',light_sources:['PH2 field only; no new source object'],
        objects:[event.id],contacts:mechanics.contact_points},
      ResponseAndSamplingChecks:{PH_response_timescale_refs:['PH1.StateDynamics.response_timescale','PH2.StateDynamics.response_timescale'],
        temporal_sampling_ref:`${samplingRef}.temporal_sampling`,OBS_sampling_consequence_refs:['OBS1.sampling_consequence','OBS2.sampling_consequence','OBS3.sampling_consequence'],
        frame_cadence_and_exposure:'Host-owned cadence; instant sampled field with no added blur.',observation_windows_fit_timeline:true,
        longer_physical_response_state_at_video_end:'Host action may continue; E does not force recovery at its own expiry.'},
      Acceptance:{single_duration_source_of_truth:true,all_tracks_within_duration:true,response_timescale_and_OBS_sampling_checked_against_timeline:true,
        character_costume_light_object_contact_continuity_checked:true}},
    GlobalAcceptanceTemplate:{Requirements:{PhenomenonRegistry_required:true,full_PH_structure_required:true,all_8_domains_required:true,
      ObservationRegistry_required_when_OBS_exist:true,WindCapsule_required:true,Gravity_required:true,world_camera_screen_transform_required:true},
      ValidationResults:{StructuralInspection:{status:'not_run',checks:{}},SemanticReconciliation:{status:'not_run',checks:{}},
        RenderObservation:{status:'not_run',evidence_source:'none',checks:{visual_causality:'not_run',contour_preservation:'not_run',clipping_crushing:'not_run',
          chroma_detail:'not_run',contact_projection:'not_run',temporal_continuity:'not_run',cue_discrimination_and_sampling:'not_run'}}},
      OutcomeEvaluation:{intent_alignment:{status:'not_run',evidence_refs:[],rationale:'No actual game image reviewed for this event.'},
        artistic_effect:{status:'not_run',evidence_refs:[],evaluator_basis:'not_run',strengths:'not_run',limitations:'Host skins, hardware, size and viewing conditions not observed.'}},
      ComparativeEvaluation:{status:'not_run',question:'not_applicable',changed_factor:'not_applicable',controlled_conditions:'not_applicable',scene_set:'not_applicable',
        repetitions_and_order:'not_applicable',criteria:'not_applicable',evidence:'none',result_and_limitations:'No comparison with old E; no general quality superiority claimed.'},
      FinalStatus:{specification_status:'Warning',render_status:'NotRun',failure_reasons:[]}}
  };
  if(actor.human)doc.CharacterPolicy={characters:{[actor.id]:{trigger:'human_character_exists',
    GeneralCharacter:{character_id:actor.id,declared_attributes:actor.declaredAttributes,
      unspecified_attributes_not_filled_from_presets:true,male_expression_policy:'Existing host expression/appearance retained; E paints no makeup or expression.'},
    Acceptance:{general_attributes_preserved:true,preset_not_auto_selected:true,FemaleType_B_text_consistent:true}}}};
  doc.VFX.implementation_binding={geometry:'fieldPaths -> makeFieldMesh -> actual interleaved GPU vertex buffer',
    coordinate_scale:'one body half-height; local X converts using host body aspect, local depth is projected, not an artificial frag_depth',
    layer_bindings:{shell:'path layer 0, closed surfaces 0/1/2',flanks:'path layer 1, independent short return geometry',
      transport:'raised role 3 geometry plus one finite crest',latch:'path layer 2, role 4 receiving overlap',
      guard:'expanded observation-only cross-sections / OBS1',diffusion:'separate soft observation sheet / OBS2'},
    tessellation:'12/16/20 longitudinal steps by body CSS height; six-faced section, capped ends',
    depth:'Host read-only depth when provided; otherwise a documented coarse body-envelope exclusion. Facets sorted back to front.',
    limits:'Not an exact silhouette for arbitrary skins without host depth; no hardware frame-budget or artistic-quality guarantee.'};
  const checked=validateBDesign(doc);
  doc.GlobalAcceptanceTemplate.ValidationResults.StructuralInspection={status:checked.ok?'pass':'fail',checks:checked.checks};
  doc.GlobalAcceptanceTemplate.ValidationResults.SemanticReconciliation={status:'warning',checks:{
    intent:'No gameplay callbacks; fixed palette; independent IDs and exact authority lifetime.',
    source_binding:'PH2 and OBS relations explicit; hidden rendering cannot assert visible output.',
    host_scope:'Body facts supplied by host; complete game-scene physics, skin rendering and actual event interpretation have not been empirically validated.'}};
  doc.GlobalAcceptanceTemplate.FinalStatus.specification_status=checked.ok?'Warning':'Fail';
  doc.GlobalAcceptanceTemplate.FinalStatus.failure_reasons=checked.errors;
  return immutable(doc);
}

/** Static JSON/schema/reference inspection only. Does not execute source or observe pixels. */
export function validateBDesign(value) {
  let doc=value;
  if(typeof value==='string') {
    try{doc=JSON.parse(value);}catch{return immutable({ok:false,errors:['Unsupported format: strict JSON required; no YAML/Python evaluation.'],checks:{format:'fail'}});}
  }
  const errors=[],checks={};
  const check=(condition,message)=>{if(!condition)errors.push(message);return condition;};
  if(!check(doc && typeof doc==='object' && !Array.isArray(doc),'B document must be an object'))return immutable({ok:false,errors,checks});
  const top=['InferenceExpansionPolicy','FoundationOperationTemplate','PlatonicGoodTemplate','PhenomenonSystemTemplate','PEMTemplate',
    'CoordinateGravityWindTemplate','OctaDomainTemplate','AnimeStudiesTemplate','ObservationIntegrationTemplate','ExtremumDesignColorTemplate',
    'ReflectionClosureTemplate','PhenomenonProfileTemplate','TermsTemplate','GlobalAcceptanceTemplate','ExtensionActivationTable'];
  for(const k of top)check(doc[k] && typeof doc[k]==='object',`missing top-level block ${k}`);
  const contract=doc.FoundationOperationTemplate?.OutputContract;
  check(contract?.schema_version==='B-Expression-2','schema_version');
  check(['Image','Video'].includes(contract?.mode),'mode');
  check(['design_only','render_requested'].includes(contract?.operation),'operation');
  const registry=doc.PhenomenonSystemTemplate?.PhenomenonRegistry??{};
  const blocks=doc.PhenomenonSystemTemplate?.PhenomenonBlock??{};
  const observers=doc.ObservationIntegrationTemplate?.ObservationRegistry??{};
  const phIds=Object.keys(registry),obsIds=Object.keys(observers);
  const validInput=x=>phIds.includes(x)||obsIds.includes(x)||x==='display_condition'||x==='optical_condition';
  check(JSON.stringify(phIds.sort())===JSON.stringify(Object.keys(blocks).sort()),'registry/block key equality');
  const repeatedLinks=new Map();
  for(const key of phIds) {
    const p=blocks[key],r=registry[key];
    check(/^PH[1-9][0-9]*$/.test(key),`invalid PH ID ${key}`);
    if(!p){errors.push(`missing ${key}`);continue;}
    check(r.id===key && p.identity?.id===key,`${key} identity mismatch`);
    check(r.partition_reason===p.identity?.partition_reason,`${key} partition reason differs`);
    check(JSON.stringify(r)===JSON.stringify(p.identity),`${key} registry and identity are not identical`);
    for(const f of PH_REQUIRED)check(p[f]!=null,`${key} missing ${f}`);
    for(const part of ['Core','Structure','Surface'])check(typeof p.DeepStructure?.[part]==='string'&&p.DeepStructure[part].length>8,`${key} DeepStructure.${part}`);
    const models=['material_continuum','rigid_or_articulated','optical_transport','derived_world_response','declared_fantasy'];
    check(models.includes(p.PhysicalModel?.model_kind),`${key} model_kind`);
    for(const f of ['system_boundary','state_variables','inputs','constitutive_response','initial_condition','boundary_conditions','approximation_scope'])
      check(p.PhysicalModel?.[f]!=null,`${key} PhysicalModel.${f}`);
    for(const f of ['mass','momentum','energy','charge']) {
      const c=p.PhysicalModel?.balance_conditions?.[f];
      check(['applicable','not_applicable'].includes(c?.status)&&typeof c?.balance_or_reason==='string'&&c.balance_or_reason.length>8,`${key} balance ${f}`);
    }
    for(const f of ['characteristic_length','characteristic_time','dominant_balance','dimensionless_reasoning','detail_cutoff'])
      check(typeof p.ScaleRegime?.[f]==='string'&&p.ScaleRegime[f].length>8,`${key} ScaleRegime.${f}`);
    for(const name of DOMAINS) {
      const d=p.OctaDomain?.Domains?.[name];
      check(d && ['applicable','not_applicable'].includes(d.applicability),`${key} domain ${name}`);
      check(d && ['primary','supporting','latent'].includes(d.role),`${key} domain role ${name}`);
      check(d?.applicability!=='not_applicable'||d?.role==='latent',`${key} inapplicable domain must be latent ${name}`);
      check(Array.isArray(d?.items)&&d.items.length>0&&typeof d?.evidence_or_constraint==='string',`${key} domain detail ${name}`);
      if(d?.role==='primary')check(d.items.length>=2,`${key} primary evidence count ${name}`);
    }
    check(['visible','implicit','latent'].includes(r.visibility),`${key} visibility`);
    if(r.visibility==='visible')check(p.Evidence?.direct?.length>=2,`${key} visible evidence count`);
    else check(p.Evidence?.indirect?.length>=1 && phIds.includes(p.SurroundingChanges?.latent_reference_target),`${key} indirect/reference evidence`);
    check(p.PerceptualReadability?.cue_roles?.length>=1 && typeof p.PerceptualReadability?.confusable_alternative==='string',`${key} perceptual discrimination`);
    for(const f of ['driving_input','response_timescale','phase_relation','stability_condition','convergence_behavior','damping_profile'])
      check(typeof p.StateDynamics?.[f]==='string'&&p.StateDynamics[f].length>5,`${key} StateDynamics.${f}`);
    check(['hypothesis_only','checked_against_reference','tested'].includes(p.Couplings?.CausalAssessment?.check_status),`${key} causal status`);
    if(p.Couplings?.CausalAssessment?.check_status!=='hypothesis_only')
      check(p.Couplings?.CausalAssessment?.evidence_refs?.length>0,`${key} causal evidence required`);
    for(const link of p.CausalityLinks?.physical_influence??[]) {
      check(phIds.includes(link.source)&&phIds.includes(link.target),`${key} physical endpoints`);
      check(typeof link.mechanism==='string'&&typeof link.consequence==='string',`${key} physical mechanism`);
      const lk=JSON.stringify([link.source,link.target,link.mechanism]);
      if(repeatedLinks.has(lk))check(repeatedLinks.get(lk)===link.consequence,`${key} contradictory repeated mechanism`);
      repeatedLinks.set(lk,link.consequence);
    }
    for(const link of p.CausalityLinks?.observation_dependency??[])
      check(obsIds.includes(link.source)&&validInput(link.target)&&typeof link.basis==='string',`${key} observation endpoints`);
    for(const link of p.CausalityLinks?.gaze_path??[])
      check(phIds.includes(link.source)&&phIds.includes(link.target)&&typeof link.reason==='string',`${key} gaze endpoints`);
    check(p.VisualProjection?.world_state_ref?.startsWith(`${key}.`),`${key} VisualProjection state binding`);
    const beauty=p.BeautyStructureApplication;
    if(beauty?.target_policy==='standard') {
      check(Object.keys(beauty.axes??{}).length>=2,`${key} beauty axis count`);
      for(const cues of Object.values(beauty.axes??{}))check(Array.isArray(cues)&&new Set(cues).size>=2,`${key} beauty distinct cue count`);
    } else check(beauty?.target_policy==='intent_adjusted'&&beauty.adjustment_reason?.length>8,`${key} beauty adjustment`);
    check(Object.keys(p.GTB??{}).length>=2,`${key} GTB layers`);
  }
  for(const key of obsIds) {
    check(/^OBS[1-9][0-9]*$/.test(key),`invalid OBS ID ${key}`);const o=observers[key];
    for(const f of ['operation_type','input_references','target_mask','stage','composite_method','intensity','protected_regions','output_consequence','dependencies','sampling_consequence'])
      check(o[f]!=null,`${key} missing ${f}`);
    for(const ref of [...(o.input_references??[]),...(o.dependencies??[])])check(validInput(ref)&&ref!==key,`${key} invalid input ${ref}`);
  }
  const visiting=new Set(),visited=new Set();
  function visit(k) {
    if(visiting.has(k)){errors.push(`OBS dependency cycle at ${k}`);return;}
    if(visited.has(k))return;
    visiting.add(k);for(const dep of observers[k]?.dependencies??[])if(obsIds.includes(dep))visit(dep);
    visiting.delete(k);visited.add(k);
  }
  for(const key of obsIds)visit(key);
  const coords=doc.CoordinateGravityWindTemplate;
  check(coords?.Gravity!=null && coords?.WindCapsule?.required===true,'Gravity and WindCapsule required');
  check(['air','water','vacuum','other','not_applicable_display_only'].includes(coords?.WindCapsule?.medium_state),'WindCapsule medium_state');
  check(coords?.ScreenCoordinates?.y==='0_top_to_1_bottom','screen y convention');
  check(coords?.TransformChain?.order?.join('/')==='world/camera/screen','transform chain');
  const sample=doc.ObservationIntegrationTemplate?.SamplingContract;
  for(const k of ['output_resolution','intended_display_scale','spatial_detail_policy','temporal_sampling','filter_and_resample_policy'])
    check(sample?.[k]!=null,`sampling ${k}`);
  const vfx=doc.VFX;
  if(vfx) {
    const ids=(vfx.layers??[]).map(l=>l.layer_id);
    check(ids.length>0&&new Set(ids).size===ids.length,'unique nonempty VFX layers');
    check(vfx.layers?.some(l=>l.domain==='world'),'VFX needs a world layer');
    for(const l of vfx.layers??[]) {
      const world=l.domain==='world';check(world||l.domain==='observation',`mixed layer ${l.layer_id}`);
      check(world?l.PH_refs?.length>0&&l.OBS_refs?.length===0:l.OBS_refs?.length>0&&l.PH_refs?.length===0,`layer registry separation ${l.layer_id}`);
      for(const ref of l.PH_refs??[])check(phIds.includes(ref),`layer PH ref ${ref}`);
      for(const ref of l.OBS_refs??[])check(obsIds.includes(ref),`layer OBS ref ${ref}`);
      check(['explicit','attribute_resolved','accepted_inferred'].includes(l.selection?.basis),`layer selection ${l.layer_id}`);
      for(const f of ['function_and_visible_result','spatial_structure','material_and_optics','motion_and_phase','integration'])check(l[f]!=null,`layer ${l.layer_id}.${f}`);
      for(const f of ['macro','meso','micro','anchor_and_transform','extent_orientation_depth','edge_and_occlusion'])check(l.spatial_structure?.[f]!=null,`layer scale ${l.layer_id}.${f}`);
    }
    for(const l of vfx.interlayer_links??[]) {
      check(ids.includes(l.source_layer)&&ids.includes(l.target_layer)&&l.source_layer!==l.target_layer,'interlayer endpoints');
      const source=vfx.layers.find(x=>x.layer_id===l.source_layer),target=vfx.layers.find(x=>x.layer_id===l.target_layer);
      if(l.relation_type==='physical_influence')check(source?.domain==='world'&&target?.domain==='world','physical interlayer direction');
      else if(l.relation_type==='observation_dependency')check(source?.domain==='observation','OBS interlayer direction');
      else check(l.relation_type==='visual_relation','interlayer relation type');
    }
    check(phIds.includes(vfx.causal_path?.carrier_PH),'carrier PH');
    check(vfx.output_integration?.budget_ref==='ObservationIntegrationTemplate.IntensityBudget','single VFX intensity budget');
  }
  for(const [aid,c] of Object.entries(doc.CharacterPolicy?.characters??{})) {
    check(c.GeneralCharacter?.character_id===aid,'character ID mismatch');
    check(doc.BeautifulPoseCapsule?.characters?.[aid]!=null,'human body pose mapping');
  }
  for(const [aid,c] of Object.entries(doc.BeautifulPoseCapsule?.characters??{})) {
    check(['standing','seated','airborne','flying','quadruped','nonhumanoid'].includes(c.PoseType),`pose type ${aid}`);
    for(const [field,refOrRefs] of Object.entries(c.Common?.PH_mechanics_refs??{})) {
      for(const ref of Array.isArray(refOrRefs)?refOrRefs:[refOrRefs]) {
        const [p,f]=String(ref).split('.');check(phIds.includes(p)&&f===field&&blocks[p]?.[f]!=null,`pose PH mechanics reference ${ref}`);
      }
    }
  }
  if(contract?.mode==='Video') {
    const policy=doc.VideoGenerationPolicy,D=policy?.Duration?.seconds;
    check(typeof D==='number'&&D>0,'Video Duration');
    for(const track of Object.values(policy?.timeline?.tracks??{}))for(const cue of track)
      check(cue.start>=0&&cue.end>=cue.start&&cue.end<=D && cue.state_before!=null&&cue.state_during!=null&&cue.state_after!=null,'timeline bounds/state');
  }
  const final=doc.GlobalAcceptanceTemplate;
  if(final?.ValidationResults?.RenderObservation?.status==='not_run')check(final.FinalStatus?.render_status==='NotRun','unobserved render cannot pass');
  checks.required_blocks=top.every(k=>!!doc[k])?'pass':'fail';
  checks.PH_OBS_separation={PH:phIds.length,OBS:obsIds.length,acyclic_observation:visited.size===obsIds.length};
  checks.OctaDomain=`${phIds.length} PH inspected for eight explicit domains`;
  checks.scientific_fields='Balances, scales, dynamics, cues, uncertainty and sampling inspected structurally, not scientifically measured.';
  checks.coordinate_gravity_wind='Required blocks and screen conventions inspected.';
  checks.rule_contracts='Schema and references inspected; this is not an exhaustive natural-language theorem prover.';
  checks.template_consolidation='One document field per foundation chapter; this inspector does not count headings in source Markdown.';
  return immutable({ok:errors.length===0,errors,checks});
}

function testInput(overrides={}) {
  return {sessionId:'selftest-session',roomEpoch:'room-visit-1',viewport:{x:0,y:0,width:320,height:240},dpr:1,zoom:1,
    camera:{viewProjection:[.02,0,0,0,0,.02,0,0,0,0,-.01,0,0,0,.5,1],
      audit:{projectionType:'orthographic',view:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,-50,1],
        projection:[.02,0,0,0,0,.02,0,0,0,0,-.01,0,0,0,0,1],
        pose:{position_m:[0,0,50],forward:[0,0,-1],up:[0,1,0]},FOV_or_scale:{vertical:100,unit:'m'}}},
    surfaceVisible:true,reducedMotion:false,
    world:{gravity:{condition:'normal',vector:[0,-1,0],strength:'Normal host gravity; numeric value not assumed in this fixture.'},
      medium:{state:'air',density:'Host air, unmeasured in fixture.',viscosity:'Host air, unmeasured in fixture.'}},
    actors:[{id:'actor',position:[0,0,0],body:{right:[1,0,0],up:[0,1,0],halfWidth:3,halfHeight:6},
      display:{visible:true,opacity:1},human:true,poseType:'standing',declaredAttributes:{role:'existing test recipient'},
      poseMechanics:{intent:'Maintain the supplied static standing pose.',primary_axis:'Head/thorax/pelvis above the existing support.',
        gaze_or_orientation:'Host forward',contact_points:['Existing left foot','Existing right foot'],
        COM_or_support_center:'Within the host supplied support polygon.',reaction_or_propulsion:'Host weight balanced by existing support reaction; E adds zero force.',
        limb_or_appendage_roles:'Both feet support; arms remain in the supplied pose.',recovery:'No E perturbation to recover.',mode:'static_balance'}}],
    events:[{id:'acquisition-1',type:'benefit-acquired',playerId:'actor',effectKind:'luckBoost',variant:'donation-rational',durationMs:1680,elapsedActorMs:0,actorRate:1}],
    ...overrides};
}
function mockAudioContext() {
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});
  const node=()=>({connect(){},disconnect(){},gain:param(),pan:param(),frequency:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()});
  const c={currentTime:0,state:'running',destination:node(),createGain:node,createBiquadFilter:node,createDynamicsCompressor:node,createStereoPanner:node,
    createOscillator:()=>({...node(),start(){},stop(){}}),addEventListener(){},removeEventListener(){},async resume(){c.state='running';}};
  return c;
}
function mockGPU() {
  const stats={drawCalls:0,buffersCreated:0,buffersDestroyed:0,waits:0};
  const device={limits:{minUniformBufferOffsetAlignment:256,maxBufferSize:1<<26},lost:new Promise(()=>{}),
    queue:{async onSubmittedWorkDone(){stats.waits++;}},
    createShaderModule:()=>({async getCompilationInfo(){return {messages:[]};}}),
    createBindGroupLayout:x=>x,createPipelineLayout:x=>x,async createRenderPipelineAsync(x){return x;},createBindGroup:x=>x,
    createQuerySet:()=>({destroy(){}}),
    createBuffer({size}) {stats.buffersCreated++;let destroyed=false;const bytes=new ArrayBuffer(size);
      return {bytes,getMappedRange(){requireThat(!destroyed,'mock destroyed buffer');return bytes;},unmap(){},
        async mapAsync(){requireThat(!destroyed,'mock destroyed buffer');},destroy(){if(!destroyed){destroyed=true;stats.buffersDestroyed++;}}};}};
  function frame(frameId,samples=9n) {
    const pass={setViewport(){},setPipeline(){},setScissorRect(){},setVertexBuffer(){},setBindGroup(){},beginOcclusionQuery(){},endOcclusionQuery(){},end(){},draw(){stats.drawCalls++;}};
    return {id:frameId,encoder:{beginRenderPass:()=>pass,
      resolveQuerySet(q,first,count,destination){const d=new DataView(destination.bytes);for(let i=0;i<count;i++)d.setBigUint64(i*8,samples,true);},
      copyBufferToBuffer(source,so,destination,dest,size){new Uint8Array(destination.bytes,dest,size).set(new Uint8Array(source.bytes,so,size));}}};
  }
  return {device,frame,stats};
}

/** Explicit CPU/static/mock tests. Mock readiness is NOT a WGSL/GPU compilation test. */
export async function runSelfTests() {
  const results=[];
  const test=async(name,fn)=>{try{await fn();results.push({name,status:'pass'});}catch(error){results.push({name,status:'fail',detail:String(error.message??error)});}};
  const assert=(v,m='assertion failed')=>requireThat(v,m);
  const raises=fn=>{try{fn();return false;}catch{return true;}};
  await test('pure plan: stable JSON and unchanged input',()=>{
    const i=testInput(),before=JSON.stringify(i),a=plan(i),b=plan(i);assert(JSON.stringify(a)===JSON.stringify(b));assert(JSON.stringify(i)===before);assert(Object.isFrozen(a.draws[0]));});
  await test('authority lifetime and four phase boundaries',()=>{
    for(const [age,name,count] of [[-1,'not-started',0],[0,'receive',1],[268.8,'converge',1],[705.6,'incorporate',1],[1310.4,'resolve',1],[1679.99,'resolve',1],[1680,'expired',0]]) {
      const i=testInput();i.events[0].elapsedActorMs=age;const p=plan(i);assert(p.entries[0].phase.name===name,`${age} phase`);assert(p.draws.length===count);}});
  await test('non-example duration remains authoritative',()=>{const i=testInput();i.events[0].durationMs=910;i.events[0].elapsedActorMs=909;assert(plan(i).draws.length===1);i.events[0].elapsedActorMs=910;assert(plan(i).draws.length===0);});
  await test('duplicate ID deduplication and collision rejection',()=>{const i=testInput();i.events.push({...i.events[0],elapsedActorMs:200});assert(plan(i).draws.length===1);assert(plan(i).entries[0].elapsedActorMs===200);i.events[1].durationMs=1800;assert(raises(()=>plan(i)));});
  await test('independent acquisitions have independent state and identity',()=>{const i=testInput();i.events.push({...i.events[0],id:'second',elapsedActorMs:1200});const p=plan(i);assert(p.draws.length===2);assert(p.draws[0].phase.name!==p.draws[1].phase.name);assert(p.draws[0].seed!==p.draws[1].seed);});
  await test('hidden, transparent, occluded and offscreen suppression',()=>{for(const mode of ['surface','actor','opacity','depth','outside']) {
    const i=testInput();if(mode==='surface')i.surfaceVisible=false;if(mode==='actor')i.actors[0].display.visible=false;if(mode==='opacity')i.actors[0].display.opacity=0;
    if(mode==='depth')i.actors[0].display.occluded=true;if(mode==='outside')i.actors[0].position[0]=10000;assert(plan(i).draws.length===0,mode);}});
  await test('DPR, zoom and current body transform are applied once',()=>{const i=testInput(),p=plan(i);i.dpr=3;const q=plan(i);assert(q.viewport.width===p.viewport.width*3);assert(q.draws[0].clipCenter[0]===p.draws[0].clipCenter[0]);i.zoom=2;i.actors[0].position[0]=5;assert(plan(i).draws[0].clipCenter[0]===.2);});
  await test('no background/skin colour adaptation input',()=>{const i=testInput(),p=plan(i);i.backgroundColor='#ffffff';i.actors[0].skinColor='#000000';assert(JSON.stringify(p)===JSON.stringify(plan(i)));});
  await test('reducedMotion preserves duration/phase/count',()=>{const i=testInput();i.events[0].elapsedActorMs=1400;const p=plan(i);i.reducedMotion=true;const q=plan(i);assert(q.entries[0].durationMs===p.entries[0].durationMs&&q.draws.length===p.draws.length);assert(q.entries[0].phase.name==='resolve');});
  await test('event adapter rejects stale replay and retired ID resurrection',()=>{const store=createEventStore({sessionId:'s'}),e=testInput().events[0];assert(store.ingest(e).accepted);assert(!store.ingest(e).accepted);store.sample(e.id,1000);assert(store.sample(e.id,500).reason==='stale');store.sample(e.id,1680);assert(store.snapshot().events.length===0);assert(store.ingest(e).reason==='retired');store.destroy();});
  await test('room change preserves authority age; new session resets namespace',()=>{const store=createEventStore({sessionId:'s'}),e=testInput().events[0];store.ingest({...e,elapsedActorMs:900});store.enterRoom('r2');assert(store.snapshot().events[0].elapsedActorMs===900);store.resetSession('s2');assert(store.ingest(e).accepted);store.destroy();});
  await test('B expanded structural references and eight domains',()=>{const doc=buildBDesign(plan(testInput()));const report=validateBDesign(doc);assert(report.ok,report.errors.join('; '));assert(doc.GlobalAcceptanceTemplate.FinalStatus.render_status==='NotRun');});
  await test('B rejects invented host facts, missing domain and OBS cycle',()=>{const i=testInput();delete i.actors[0].poseType;assert(raises(()=>buildBDesign(plan(i))));const doc=jsonCopy(buildBDesign(plan(testInput())));delete doc.PhenomenonSystemTemplate.PhenomenonBlock.PH2.OctaDomain.Domains.Fluid;assert(!validateBDesign(doc).ok);const d=jsonCopy(buildBDesign(plan(testInput())));d.ObservationIntegrationTemplate.ObservationRegistry.OBS1.dependencies.push('OBS2');d.ObservationIntegrationTemplate.ObservationRegistry.OBS2.dependencies.push('OBS1');assert(!validateBDesign(d).ok);});
  await test('B latent schema and no forced visibility',()=>{const i=testInput();i.surfaceVisible=false;const d=buildBDesign(plan(i));assert(validateBDesign(d).ok);assert(d.PhenomenonSystemTemplate.PhenomenonBlock.PH2.Evidence.direct.length===0);});
  await test('strict JSON only, not YAML or evaluable source',()=>assert(!validateBDesign('schema: B-Expression-2').ok));
  const gpu=mockGPU(),owner=createFrameOwner({device:gpu.device}),pass=create({renderer:{device:gpu.device,format:'rgba8unorm'},frameOwner:owner});
  await pass.ready;
  const target={view:{},width:320,height:240,sampleCount:1};let receipts=[];
  await test('MOCK record does not complete frame or sound',()=>{const f=gpu.frame('f1'),p=plan(testInput());const r=pass.record({frame:f,target,viewport:p.viewport,planned:p});assert(r.recorded&&gpu.stats.waits===0);assert(raises(()=>pass.record({frame:f,target,planned:p})));owner.discarded(f);});
  await test('MOCK submitted primary samples yield authenticated receipts',async()=>{const f=gpu.frame('f2'),p=plan(testInput());pass.record({frame:f,target,planned:p});receipts=await owner.submitted(f,{sessionId:p.sessionId,roomEpoch:p.roomEpoch,surfaceVisible:true});assert(receipts.length===1&&RECEIPTS.has(receipts[0]));});
  await test('MOCK zero samples and invisible surface never yield receipt',async()=>{for(const [name,samples,visible] of [['zero',0n,true],['hidden',8n,false]]){const f=gpu.frame(name,samples),p=plan(testInput());pass.record({frame:f,target,planned:p});assert((await owner.submitted(f,{sessionId:p.sessionId,roomEpoch:p.roomEpoch,surfaceVisible:visible})).length===0);}});
  await test('MOCK room switch invalidates pending receipt',async()=>{const f=gpu.frame('old'),p=plan(testInput());pass.record({frame:f,target,planned:p});const q=plan(testInput({roomEpoch:'r2',surfaceVisible:false}));pass.record({frame:gpu.frame('new'),target,planned:q});assert((await owner.submitted(f,{sessionId:p.sessionId,roomEpoch:p.roomEpoch,surfaceVisible:true})).length===0);});
  await test('MOCK audio once per ID, forged receipt, hidden and pause guard',()=>{
    const context=mockAudioContext(),r=receipts[0];let state={...r,visible:true,actorRate:1,elapsedActorMs:20};
    const sound=createAudio({context,authority:()=>state});assert(sound.accept([{...r}])[0].status==='unauthenticated');
    assert(sound.accept([r])[0].status==='started');assert(sound.accept([r])[0].status==='already-started');assert(sound.inspect().started===1);
    state={...state,visible:false};sound.sync();assert(sound.inspect().active===0);state={...state,visible:true};assert(sound.accept([r])[0].status==='already-started');sound.destroy();});
  await test('MOCK suspended context consumes no ID; expiry suppresses backlog',()=>{
    const context=mockAudioContext();context.state='suspended';const r=receipts[0];let state={...r,visible:true,actorRate:1,elapsedActorMs:0};
    const sound=createAudio({context,authority:()=>state});assert(sound.accept([r])[0].status==='awaiting-unlock');assert(sound.inspect().identities===0);
    context.state='running';state.elapsedActorMs=1680;assert(sound.accept([r])[0].status==='inactive-or-stale');sound.destroy();});
  await test('MOCK unlock requires a new visible receipt, not a saved backlog',async()=>{
    const i=testInput();i.events[0].id='unlock-event';const p=plan(i),f=gpu.frame('unlock-before');
    pass.record({frame:f,target,planned:p});const before=await owner.submitted(f,{sessionId:p.sessionId,roomEpoch:p.roomEpoch,surfaceVisible:true});
    const context=mockAudioContext();context.state='suspended';
    const sound=createAudio({context,authority:r=>({...r,visible:true})});
    assert(sound.accept(before)[0].status==='awaiting-unlock');await sound.unlock();
    assert(sound.accept(before)[0].status==='fresh-visible-receipt-required');
    const f2=gpu.frame('unlock-after');pass.record({frame:f2,target,planned:p});
    const after=await owner.submitted(f2,{sessionId:p.sessionId,roomEpoch:p.roomEpoch,surfaceVisible:true});
    assert(sound.accept(after)[0].status==='started');assert(sound.inspect().started===1);sound.destroy();
  });
  await test('MOCK distinct visible IDs sound independently and pause without replay',async()=>{
    const i=testInput();i.events=[{...i.events[0],id:'parallel-A'},{...i.events[0],id:'parallel-B',elapsedActorMs:700}];
    const p=plan(i),f=gpu.frame('parallel');pass.record({frame:f,target,planned:p});
    const rr=await owner.submitted(f,{sessionId:p.sessionId,roomEpoch:p.roomEpoch,surfaceVisible:true});
    const context=mockAudioContext();let rate=1;
    const sound=createAudio({context,authority:r=>({...r,visible:true,actorRate:rate})});
    assert(sound.accept(rr).every(x=>x.status==='started'));assert(sound.inspect().started===2);
    rate=0;sound.sync();assert(sound.inspect().active===0);rate=1;
    assert(sound.accept(rr).every(x=>x.status==='already-started'));sound.destroy();
  });
  await test('MOCK render high-water age blocks stale and terminal ID resurrection',async()=>{
    const i=testInput();i.events[0].id='retire-render';i.events[0].elapsedActorMs=1100;
    const p=plan(i),f=gpu.frame('age-new');assert(pass.record({frame:f,target,planned:p}).recorded);owner.discarded(f);
    i.events[0].elapsedActorMs=1000;assert(!pass.record({frame:gpu.frame('age-stale'),target,planned:plan(i)}).recorded);
    i.events[0].elapsedActorMs=1680;assert(!pass.record({frame:gpu.frame('age-done'),target,planned:plan(i)}).recorded);
    i.events[0].elapsedActorMs=1200;assert(!pass.record({frame:gpu.frame('age-replay'),target,planned:plan(i)}).recorded);
  });
  await test('MOCK destruction invalidates an in-flight receipt but releases buffers',async()=>{
    const local=create({renderer:{device:gpu.device,format:'rgba8unorm'},frameOwner:owner});await local.ready;
    const p=plan(testInput()),f=gpu.frame('destroy-pending');local.record({frame:f,target,planned:p});local.destroy();
    assert((await owner.submitted(f,{sessionId:p.sessionId,roomEpoch:p.roomEpoch,surfaceVisible:true})).length===0);
  });
  await test('minification, DPR and body-proportion draw bounds remain finite',()=>{
    for(const height of [12,16,24,32,48,64,96])for(const dpr of [1,1.25,2,3,4])for(const aspect of [.25,.5,.9]) {
      const i=testInput({dpr});i.actors[0].body.halfHeight=height/(.02*240);
      i.actors[0].body.halfWidth=i.actors[0].body.halfHeight*aspect;
      const d=plan(i).draws[0];assert(d.bounds.every(Number.isFinite));assert(d.bounds[0]<-1.84&&d.bounds[2]>1.84);
      assert(Math.abs(d.screenHeight/dpr-height)<1e-5);
    }
  });
  await test('typed-array camera audit and body-specific extension selection',()=>{
    const i=testInput();i.camera.audit.view=new Float32Array(i.camera.audit.view);i.camera.audit.projection=new Float32Array(i.camera.audit.projection);
    i.actors[0].human=false;i.actors[0].poseType='airborne';i.actors[0].poseMechanics={...i.actors[0].poseMechanics,
      mode:'dynamic_motion',contact_points:[],reaction_or_propulsion:'Existing ballistic host motion; no ground reaction or E thrust.',recovery:'Continue the host trajectory; no landing target added.'};
    const d=buildBDesign(plan(i));assert(!d.CharacterPolicy);assert(d.BeautifulPoseCapsule.characters.actor.PoseType==='airborne');assert(validateBDesign(d).ok);
  });
  await test('NEW mesh: closed three-dimensional faces, not planar shader strokes',()=>{
    const p=plan(testInput()),m=makeFieldMesh(p.draws[0],p),v=m.form;
    const z=[];for(let k=2;k<v.length;k+=VERTEX_FLOATS)z.push(v[k]);
    assert(Math.max(...z)-Math.min(...z)>.7,'actual local depth');
    assert(m.meta.paths.length===6&&m.meta.vertices>1000);assert(m.guard.length>0&&m.glow.length>0);
  });
  await test('NEW all four mesh roles exist independently of glow',()=>{
    const p=plan(testInput()),m=makeFieldMesh(p.draws[0],p),roles=new Set();
    for(let k=8;k<m.form.length;k+=VERTEX_FLOATS)roles.add(m.form[k]);
    for(const r of [0,1,2,3,4])assert(roles.has(r),`missing face role ${r}`);
    assert(m.form.length%36===0&&m.guard.length%36===0&&m.glow.length%36===0);
  });
  await test('NEW 0ms versus 720ms changes support positions and volume, not only colour',()=>{
    const input=testInput(),a=plan(input),x=fieldPaths(a.draws[0],false);
    input.events[0].elapsedActorMs=720;const b=plan(input),y=fieldPaths(b.draws[0],false);
    const travel=x.slice(0,4).reduce((n,path,j)=>n+Math.hypot(...minus3(path.cp[0],y[j].cp[0])),0);
    assert(travel>.5,'measurable contraction');assert(Math.abs(x[0].twist-y[0].twist)>.4,'actual folding');
    assert(JSON.stringify(makeFieldMesh(a.draws[0],a).form)!==JSON.stringify(makeFieldMesh(b.draws[0],b).form));
  });
  await test('NEW receiving tongues progress from separated to interlocked',()=>{
    const i=testInput(),p=plan(i),open=fieldPaths(p.draws[0],false).slice(4);
    assert(open[0].cp[3][0]<0&&open[1].cp[3][0]>0,'open receiving gap');
    i.events[0].elapsedActorMs=1320;const q=plan(i),closed=fieldPaths(q.draws[0],false).slice(4);
    assert(closed[0].cp[3][0]>0&&closed[1].cp[3][0]<0,'dovetail overlap');
    assert(closed[0].width>open[0].width*1.5,'thicker reception, not colour-only');
  });
  await test('NEW final active state retains substantial carrier and channels',()=>{
    for(const u of [0,.08,.16,.30,.42,.60,.78,.90,.999999]) {
      const i=testInput();i.events[0].elapsedActorMs=1680*u;const p=plan(i),m=makeFieldMesh(p.draws[0],p);
      assert(m.form.length>1000);assert(m.meta.paths[0].width>.25);assert(m.form.every(Number.isFinite));
    }
  });
  await test('NEW reduced motion limits major sweep travel without deleting the receiver',()=>{
    const i=testInput(),a=plan(i);i.events[0].elapsedActorMs=1300;const b=plan(i);
    const span=mode=>{const p=fieldPaths(a.draws[0],mode),q=fieldPaths(b.draws[0],mode);
      return p.slice(0,4).reduce((n,path,k)=>n+Math.hypot(...minus3(path.cp[0],q[k].cp[0])),0);};
    assert(span(true)<span(false)*.3);assert(fieldPaths(b.draws[0],true).length===6);
  });
  await test('NEW actual size, DPR and aspect produce finite mesh and unit facet normals',()=>{
    for(const [height,dpr,aspect] of [[12,1,.25],[16,3,.5],[24,1.25,.3],[32,2,.9],[48,4,.5],[96,1,.5]]) {
      const i=testInput({dpr});i.actors[0].body.halfHeight=height/(.02*240);
      i.actors[0].body.halfWidth=i.actors[0].body.halfHeight*aspect;
      const p=plan(i),m=makeFieldMesh(p.draws[0],p);
      assert(m.form.every(Number.isFinite));
      for(let k=0;k<m.form.length;k+=36)assert(Math.abs(Math.hypot(...m.form.slice(k+3,k+6))-1)<1e-6,'facet normal');
      assert(m.meta.steps===(height<36?12:height<72?16:20));
    }
  });
  await test('NEW standard and reversed depth place positive front toward camera',()=>{
    const i=testInput(),p=plan(i),d=p.draws[0];
    const derivative=x=>x.clipFront[2]*x.clipCenter[3]-x.clipCenter[2]*x.clipFront[3];
    assert(derivative(d)<=0);i.camera.reverseZ=true;assert(derivative(plan(i).draws[0])>=0);
  });
  await test('NEW body frame rotates actual depth geometry rather than screen artwork',()=>{
    const i=testInput(),p=plan(i);i.actors[0].body.right=[Math.cos(.6),0,Math.sin(.6)];
    const q=plan(i);assert(JSON.stringify(p.draws[0].clipFront)!==JSON.stringify(q.draws[0].clipFront));
    assert(makeFieldMesh(q.draws[0],q).form.every(Number.isFinite));
  });
  await test('NEW per-event meshes remain distinct at identical actor and age',()=>{
    const i=testInput();i.events.push({...i.events[0],id:'different-acquisition'});const p=plan(i);
    assert(JSON.stringify(makeFieldMesh(p.draws[0],p).form)!==JSON.stringify(makeFieldMesh(p.draws[1],p).form));
  });
  await test('NEW B six visual layers bind actual geometry and do not report render success',()=>{
    const d=buildBDesign(plan(testInput()));assert(d.VFX.layers.length===6);
    assert(d.VFX.layers.filter(x=>x.domain==='world').length===4);
    assert(d.VFX.layers.map(x=>x.layer_id).join(',')==='shell,transport,latch,flanks,guard,diffusion');
    assert(validateBDesign(d).ok);assert(d.GlobalAcceptanceTemplate.OutcomeEvaluation.artistic_effect.status==='not_run');
  });
  pass.destroy();owner.destroy();
  await test('MOCK per-frame buffers released after completion/discard',()=>assert(gpu.stats.buffersCreated===gpu.stats.buffersDestroyed));
  return immutable({kind:'CPU/static/mock only; not actual GPU or listening',passed:results.filter(r=>r.status==='pass').length,
    failed:results.filter(r=>r.status==='fail').length,results});
}

/** Explicit offline waveform diagnostic; never authorises a live event or plays audio. */
export async function runOfflineAudioTest({OfflineAudioContext=globalThis.OfflineAudioContext,durationMs=1680,elapsedActorMs=0,sampleRate=48000}={}) {
  requireThat(typeof OfflineAudioContext==='function','OfflineAudioContext unavailable');
  number(durationMs,'durationMs',1,60000);number(elapsedActorMs,'elapsedActorMs',0,durationMs-.001);
  number(sampleRate,'sampleRate',8000,96000);
  const length=Math.ceil(((durationMs-elapsedActorMs)/1000+.2)*sampleRate);
  const context=new OfflineAudioContext(2,length,sampleRate),bus=makeAudioBus(context,context.destination,.28);
  const r={sessionId:'offline-test',roomEpoch:'offline',id:'test-only-not-live',pan:0};
  schedulePhrase(context,bus.input,r,{durationMs,elapsedActorMs,actorRate:1},()=>{});
  const buffer=await context.startRendering();let peak=0,sum=0,tailPeak=0,count=0;
  const tailStart=Math.min(length,Math.ceil(((durationMs-elapsedActorMs)/1000+.08)*sampleRate));
  for(let c=0;c<buffer.numberOfChannels;c++) {
    const samples=buffer.getChannelData(c);
    for(let i=0;i<samples.length;i++){const x=samples[i];requireThat(Number.isFinite(x),'nonfinite audio sample');peak=Math.max(peak,Math.abs(x));sum+=x*x;count++;if(i>=tailStart)tailPeak=Math.max(tailPeak,Math.abs(x));}
  }
  for(const node of bus.nodes)node.disconnect();
  return {kind:'offline Web Audio synthesis only; no real listening or autoplay validation',
    sampleRate,frames:length,peak,rms:Math.sqrt(sum/count),tailPeak,
    finite:true,nonSilent:peak>1e-5,unclipped:peak<.99,shortTail:tailPeak<.001,buffer};
}

/*
 * HOST ACCEPTANCE CHECKLIST (not an automatically asserted result)
 *
 * GPU: await ready on each shared production device/format/depth/MSAA setup; capture
 * getCompilationInfo diagnostics and host validation errors. Test device loss,
 * unsubmitted discard, concurrent frames and destruction without leaked resources.
 * PIXELS: in the HOST harness, add a render-attachment/COPY_SRC target and append
 * its copy to a padded MAP_READ buffer in that SAME encoder. The host submits it.
 * Read back after completion. Check phases u=0,.08,.16,.30,.42,.60,.78,.90,.99 and
 * final active sample, then u>=1. Compare fixed backgrounds: black, white, gray,
 * saturated red/blue and a complex scene. Pixels outside the effect must remain
 * unchanged; coloured scoops and dovetail receiver must remain, including the last
 * phase. Probe-only colour writes must not change pixels.
 * VISIBLE RECEIPT: before submit, abandoned frame, zero primary samples, fully
 * clipped/occluded actor, hidden surface, old roomEpoch and destroyed pass => no
 * usable receipt. A genuine submitted primary sample plus live authority => SFX
 * eligibility. This still does not measure OS presentation or later UI coverage.
 * EVENTS: forward a real donation event with id,type,playerId,effectKind=luckBoost,
 * variant=donation-rational,durationMs=1680. Verify there are NO probability/idea
 * mutations by E. Replay same ID before/during/after completion; send another ID
 * on the same actor; modify immutable duration on a duplicate (must reject).
 * SFX: unlock by a real user gesture, keep authority live and call sync. Listen to
 * a single acquisition and overlaps on actual output hardware; measure first
 * onset relative to the submitted visible frame. Check late entry, expiry while
 * locked, hidden/pause/rate change, room switch and resume: no stored old onset,
 * no duplicate ID ensemble, no loop, harsh upper band or long final tail.
 * DIMENSIONS: test actual current skin body centres/axes/extents, normal game
 * zoom and at least 12/16/24/32/48/64/96 CSS-pixel body heights, DPR 1/1.25/2/3/4,
 * viewport offsets, camera rotation/perspective, bright and dark skins. Do not
 * substitute an enlarged preview for this acceptance. Heights under 12 CSS px
 * and nearly edge-on planes intentionally report a readability limitation.
 * REDUCED MOTION: same exact event duration, identity and topology; strongly
 * reduced geometric travel, no noise, strobe, camera effect or particle fallback.
 * RESUME: update CURRENT authority ages/positions after visibility/room changes,
 * never elapsed += local delta. Advance directly to the appropriate current
 * phase; expired IDs stay retired. Sound instances already started never replay.
 * B: use buildBDesign with real host body/pose/world facts and validateBDesign;
 * inspect meaning and imagery separately. A structural result is not a quality
 * score, a physical validation, or proof of actual game or audio integration.
 */

/*
 * REVISION-2 VERIFICATION PROVENANCE — implementation checks, NOT a quality pass.
 * - Node.js syntax and Acorn module-AST checks: 12 named exports; no import,
 *   independent submit/finish, Canvas context, fetch, image loading or Math.random.
 * - runSelfTests: 39 CPU/static/mock cases exercised in Node and Chromium 144.
 *   This includes true 3-D geometry, phase-dependent support and tongue overlap,
 *   real-size/DPR geometry, reverse depth, normals, identities and receipt gates.
 * - Chromium 144 OfflineAudioContext: four 48 kHz cases (1680/0, 1680/720,
 *   1680/1480, 910/0 ms duration/entry). Finite, non-silent, unclipped samples and
 *   short final tails. This is NOT listening, autoplay or A/V synchronization.
 * - Offline CPU reference raster inspected at 24/32/48 CSS-pixel-equivalent body
 *   heights, fixed light/dark backgrounds and simple diagnostic body proxies.
 *   It is not WGSL execution, a game skin, GPU coverage evidence or a preview
 *   enlarged to stand in for real-size acceptance.
 * - Current environment does not expose WebGPU in the permitted browser context.
 *   This revised WGSL has NOT been GPU-compiled here; actual GPU pixels, occlusion
 *   receipts, frame cost, depth/MSAA/browser combinations and device loss need
 *   host tests. The preceding candidate's reported GPU success is not inherited.
 * - Actual game events/skins, physical audio output, gesture/autoplay limits,
 *   room changes/resumption and reduced-motion visual quality remain unverified
 *   in the real game. Per-event B RenderObservation/OutcomeEvaluation stay not_run.
 */
