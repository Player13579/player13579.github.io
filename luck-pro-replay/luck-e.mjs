/**
 * luck-e.mjs — Defenders vs Attackers / 幸運の恩恵 E / inward-joining fortune lattice
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
 * DESIGN: emerald/gold split ribs converge INTO the body, with a branching seam
 * at the receiving edge. No overhead marker, coin, leaf, rune, ring, rising dust,
 * flare, screen streak, camera shake or appended remnant. Four phases use u=age/D:
 * receive [0,.16), converge [.16,.42), incorporate [.42,.78), resolve [.78,1).
 * Coloured branching geometry is present at u=0 and up to the last active sample.
 * No all-transparent fade-in or particle-only second half. All events use their
 * OWN phase, seed, instance and receipt. Concurrent events are not merged.
 *
 * Reference API contracts (implementation facts only, not old E references):
 * https://gpuweb.github.io/types/interfaces/GPUCommandEncoder.html
 * https://gpuweb.github.io/types/interfaces/GPURenderPassEncoder.html
 * https://gpuweb.github.io/types/interfaces/GPUQueue.html
 * https://www.w3.org/TR/WGSL/  (derivative uniformity; premultiplied outputs)
 * https://www.w3.org/TR/webaudio/  (scheduled nodes; context lifetime/autoplay)
 */

export const VERSION = 'luck-e/2026.09.25-1';
const KIND = 'bodyBenefitExtra/luckBoost';
const LIMITS = Object.freeze({events:256,pendingFrames:8,identities:100000});
const PHASE_EDGES = Object.freeze([0,0.16,0.42,0.78,1]);
const PHASE_NAMES = Object.freeze(['receive','converge','incorporate','resolve']);
const RECEIPTS = new WeakSet();
let receiptSequence = 0;
const U = Object.freeze({MAP_READ:1,COPY_SRC:4,COPY_DST:8,UNIFORM:64,QUERY_RESOLVE:512});
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
    requireThat([...c,...r,...t,a.body.halfWidth/a.body.halfHeight].every(v=>Number.isFinite(v)&&Math.abs(v)<3.4e38),'projection outside finite float32 range');
    const screen=v=>v[3]>1e-7?[v[0]/v[3]*viewport.width/2,-v[1]/v[3]*viewport.height/2]:null;
    const top=screen(c.map((v,k)=>v+t[k])),bottom=screen(c.map((v,k)=>v-t[k]));
    const left=screen(c.map((v,k)=>v-r[k])),right=screen(c.map((v,k)=>v+r[k]));
    const screenHeight=top&&bottom?Math.hypot(top[0]-bottom[0],top[1]-bottom[1]):0;
    const screenWidth=left&&right?Math.hypot(left[0]-right[0],left[1]-right[1]):0;
    const aspect=a.body.halfWidth/a.body.halfHeight;
    const metric=Math.max(2/Math.max(screenHeight,1),2*aspect/Math.max(screenWidth,1));
    // Include the complete CSS-width edge/diffusion envelope, even at small sizes.
    // This expands only the rasterisation bounds, not the analytic world shape.
    const padding=Math.max(.26,5.5*dpr*metric);
    const bounds=[-1.84-padding/aspect,-.66-padding,1.84+padding/aspect,.42+padding];
    const corners=[[bounds[0],bounds[1]],[bounds[2],bounds[1]],[bounds[0],bounds[3]],[bounds[2],bounds[3]]]
      .map(([x,y])=>c.map((v,k)=>v+r[k]*x+t[k]*y));
    const planes=[v=>v[3]<=0,v=>v[0]<-v[3],v=>v[0]>v[3],v=>v[1]<-v[3],
      v=>v[1]>v[3],v=>v[2]<0,v=>v[2]>v[3]];
    if (planes.some(out=>corners.every(out))) entry.reason='clipped';
    if (entry.reason==='drawable' && screenHeight/dpr<12) warnings.push({id:e.id,
      code:'BELOW_REVIEWED_SIZE',detail:'Body under 12 CSS px; do not claim branch/readability invariance.'});
    if (entry.reason==='drawable') draws.push({...entry,clipCenter:c,clipRight:r,clipUp:t,
      opacity:a.display.opacity,clip:a.display.clip,seed:seedOf(entry.key),
      aspect,screenHeight,screenWidth,bounds,
      pan:c[3]>1e-7?Math.max(-.65,Math.min(.65,c[0]/c[3]*.65)):0});
    entries.push(entry);
  }
  const output=immutable({kind:KIND,version:VERSION,sessionId,roomEpoch,viewport,dpr,zoom,
    camera:{viewProjection:matrix,audit:jsonCopy(input.camera.audit)},surfaceVisible:input.surfaceVisible,reducedMotion:input.reducedMotion,
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

/** WGSL uses only analytic geometry. No sampled textures or world particles. */
export const WGSL = /* wgsl */ `
struct Instance {
  center: vec4f,
  right: vec4f,
  up: vec4f,
  state: vec4f, // age/D, opacity, reduced motion, deterministic identity variation
  metrics: vec4f, // aspect, DPR, physical projected body height, encode sRGB
  bounds: vec4f, // padded draw bounds only; not an enlarged world shape
}
@group(0) @binding(0) var<uniform> instance: Instance;
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
}
@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> VertexOut {
  let corners = array<vec2f, 6>(vec2f(0.0,0.0),vec2f(1.0,0.0),
    vec2f(0.0,1.0),vec2f(0.0,1.0),vec2f(1.0,0.0),vec2f(1.0,1.0));
  let q = mix(instance.bounds.xy,instance.bounds.zw,corners[index]);
  var out: VertexOut;
  out.position = instance.center + instance.right*q.x + instance.up*q.y;
  out.local = q;
  return out;
}
struct Hit { distance: f32, progress: f32, face: f32, role: f32 }
fn segment(p:vec2f,a:vec2f,b:vec2f,s0:f32,s1:f32,role:f32) -> Hit {
  let ab=b-a;
  let fraction=clamp(dot(p-a,ab)/max(dot(ab,ab),0.0000001),0.0,1.0);
  let offset=p-(a+ab*fraction);
  let face=(ab.x*offset.y-ab.y*offset.x)/max(length(ab),0.0001);
  return Hit(length(offset),mix(s0,s1,fraction),face,role);
}
fn closest(a:Hit,b:Hit) -> Hit {
  if (a.distance<b.distance) {return a;}
  return b;
}
fn field(p:vec2f,u:f32) -> Hit {
  let ar=instance.metrics.x;
  let reduced=instance.state.z;
  let seed=instance.state.w;
  let intake=smoothstep(0.06,0.66,u);
  let closing=smoothstep(0.78,1.0,u);
  let travel=mix(1.0,0.10,reduced);
  // Contraction has a nonzero final span. Both branches survive the last phase.
  let outer=(1.78-(0.26*intake+0.15*closing)*travel)*ar;
  let joint=(0.99-0.11*intake*travel)*ar;
  let inner=(0.30-0.04*closing*travel)*ar;
  let sway=(seed-0.5)*0.055*travel;
  let lean=(1.0-intake)*0.08*travel;
  var best=Hit(100.0,0.0,0.0,0.0);
  for (var i=0u;i<2u;i=i+1u) {
    let side=select(-1.0,1.0,i==1u);
    let yy=-0.17+side*sway;
    let upper=vec2f(side*outer,0.30+lean);
    let lower=vec2f(side*(outer-0.12*ar),-0.60-0.02*lean);
    let junction=vec2f(side*joint,yy);
    let receive=vec2f(side*inner,yy+0.06*side);
    best=closest(best,segment(p,upper,junction,0.0,0.60,0.0));
    best=closest(best,segment(p,lower,junction,0.0,0.60,1.0));
    best=closest(best,segment(p,junction,receive,0.60,1.0,2.0));
  }
  // A receiving seam, not a separate emblem or a ring.
  let seam0=vec2f(-0.24*ar,-0.25);
  let seam1=vec2f(0.24*ar,-0.09);
  best=closest(best,segment(p,seam0,seam1,0.91,1.0,3.0));
  return best;
}
fn transfer(v:vec3f) -> vec3f {
  let safe=clamp(v,vec3f(0.0),vec3f(1.0));
  let hi=1.055*pow(safe,vec3f(1.0/2.4))-0.055;
  let lo=12.92*safe;
  let encoded=select(hi,lo,safe<=vec3f(0.0031308));
  return mix(safe,encoded,instance.metrics.w);
}
struct Sample {
  fill:f32, guard:f32, core:f32, glow:f32,
  color:vec3f, opacity:f32,
}
fn sampleField(local:vec2f) -> Sample {
  let p=local*vec2f(instance.metrics.x,1.0);
  // These derivatives execute uniformly, BEFORE any discard or conditional hit.
  let dx=dpdx(p);
  let dy=dpdy(p);
  let pixel=max(max(length(dx),length(dy)),0.00001);
  let cssPixel=pixel*instance.metrics.y;
  let u=clamp(instance.state.x,0.0,0.999999);
  let h=field(p,u);
  let settle=smoothstep(0.42,0.78,u);
  let finalPhase=smoothstep(0.78,1.0,u);
  let halfWidth=max(0.052-0.008*finalPhase,0.67*cssPixel);
  let aa=pixel*0.75;
  let line=1.0-smoothstep(halfWidth-aa,halfWidth+aa,h.distance);
  let border=1.0-smoothstep(halfWidth+0.68*cssPixel-aa,
    halfWidth+0.68*cssPixel+aa,h.distance);
  let coreWidth=max(0.012,0.22*cssPixel);
  let core=1.0-smoothstep(coreWidth-aa*0.55,coreWidth+aa*0.55,h.distance);
  let front=mix(-0.12,1.22,smoothstep(0.02,0.68,u));
  let acquired=1.0-smoothstep(front-0.16,front+0.10,h.progress);
  let facing=smoothstep(-halfWidth,halfWidth,h.face);
  let emerald=vec3f(0.018,0.69,0.28);
  let gold=vec3f(1.0,0.58,0.035);
  let color=mix(emerald,gold,clamp(0.13+acquired*0.68+facing*0.13,0.0,0.94));
  let fold=0.77+0.23*facing;
  let seamLift=select(1.0,1.09,h.role>2.5);
  let luminance=0.87+0.13*smoothstep(0.16,0.42,u)-0.10*finalPhase;
  let opacity=instance.state.y;
  // Narrow analytic diffusion is not the source of the primary geometry.
  let outside=max(h.distance-halfWidth,0.0);
  let radius=max(0.043,1.65*cssPixel);
  let glow=exp(-outside*outside/max(radius*radius,0.000001))*0.20*(1.0-line);
  return Sample(line,border,core*(0.45+0.30*acquired),glow,
    color*fold*seamLift*luminance,opacity);
}
@fragment fn glowMain(in:VertexOut) -> @location(0) vec4f {
  let s=sampleField(in.local);
  let a=s.glow*s.opacity;
  if (a<0.003) {discard;}
  return vec4f(transfer(s.color)*a,a);
}
@fragment fn formMain(in:VertexOut) -> @location(0) vec4f {
  let s=sampleField(in.local);
  let fa=s.fill*0.98;
  let ga=s.guard*0.92;
  let ca=s.core*s.fill;
  let dark=transfer(vec3f(0.009,0.025,0.023));
  let light=transfer(vec3f(1.0,0.96,0.67));
  let a0=fa+ga*(1.0-fa);
  let c0=transfer(s.color)*fa+dark*ga*(1.0-fa);
  let a=(ca+a0*(1.0-ca))*s.opacity;
  let rgb=(light*ca+c0*(1.0-ca))*s.opacity;
  if (a<0.004) {discard;}
  return vec4f(rgb,a);
}
@fragment fn witnessMain(in:VertexOut) -> @location(0) vec4f {
  let s=sampleField(in.local);
  // Only the coloured body of the shape can authorise sound, never its halo.
  if (s.fill*s.opacity<0.25) {discard;}
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
  const stride=ceilTo(96,device.limits.minUniformBufferOffsetAlignment);
  const ready=(async()=>{
    const shader=device.createShaderModule({label:`${KIND}/WGSL`,code:WGSL});
    const info=await shader.getCompilationInfo();
    const errors=info.messages.filter(m=>m.type==='error');
    if(errors.length) throw new Error(errors.map(m=>`${m.lineNum}:${m.linePos} ${m.message}`).join('\n'));
    requireThat(!disposed,'destroyed while compiling');
    bindLayout=device.createBindGroupLayout({label:`${KIND}/layout`,entries:[{
      binding:0,visibility:3,buffer:{type:'uniform',hasDynamicOffset:true,minBindingSize:96}}]});
    layout=device.createPipelineLayout({bindGroupLayouts:[bindLayout]});
    const blend={color:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'},
      alpha:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'}};
    const desc=entryPoint=>({label:`${KIND}/${entryPoint}`,layout,
      vertex:{module:shader,entryPoint:'vertexMain'},
      fragment:{module:shader,entryPoint,targets:[{format,blend,writeMask:entryPoint==='witnessMain'?0:15}]},
      primitive:{topology:'triangle-list',cullMode:'none'},multisample:{count:sampleCount},
      ...(depthFormat?{depthStencil:{format:depthFormat,depthWriteEnabled:false,depthCompare}}:{})});
    pipelines=await Promise.all(['glowMain','formMain','witnessMain'].map(n=>device.createRenderPipelineAsync(desc(n))));
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
    let inputBuffer,querySet,resolveBuffer,readBuffer;
    try {
      inputBuffer=device.createBuffer({label:`${KIND}/frame uniforms`,size:draws.length*stride,
        usage:U.UNIFORM,mappedAtCreation:true});resources.push(inputBuffer);
      const data=new Float32Array(inputBuffer.getMappedRange());
      draws.forEach((d,i)=>{
        const offset=i*stride/4;
        data.set(d.clipCenter,offset);data.set(d.clipRight,offset+4);data.set(d.clipUp,offset+8);
        data.set([Math.min(d.phase.u,0.999999),d.opacity,planned.reducedMotion?1:0,d.seed],offset+12);
        data.set([d.aspect,planned.dpr,d.screenHeight,outputTransfer==='srgb'?1:0],offset+16);
        data.set(d.bounds,offset+20);
      });
      inputBuffer.unmap();
      const bind=device.createBindGroup({layout:bindLayout,entries:[{binding:0,
        resource:{buffer:inputBuffer,offset:0,size:96}}]});
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
      for(let stage=0;stage<3;stage++) {
        pass.setPipeline(pipelines[stage]);
        draws.forEach((d,i)=>{
          pass.setScissorRect(d.clip.x,d.clip.y,d.clip.width,d.clip.height);
          pass.setBindGroup(0,bind,[i*stride]);
          if(stage===2)pass.beginOcclusionQuery(i);
          pass.draw(6,1,0,0);
          if(stage===2)pass.endOcclusionQuery();
        });
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
  reducedMotion:'same lifetime and main geometry; geometric travel 10%, continuous internal acquisition, no flashing',
  size:'uses host current skin body extents; thin features reconstructed in CSS pixels, not expanded particle counts',
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
      'Filled branching supports and the receiving seam emit distinct emerald/gold/ivory bands.',
      'Intensity progresses toward the body while the outside silhouette stays recognisable to expiry.'
    ]:[
      'The existing body supplies a projected attachment boundary and may occlude according to host depth.',
      'E does not sample or alter skin albedo; surrounding ribs are identified relative to this same moving boundary.'
    ],field?'PH2.Evidence: thick forks plus directed internal colour front.':'PH1.Evidence: shared projected centre/axes and preserved body silhouette.'),
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
      'The receiving seam terminates with the event and is not a deposited surface layer.')
  }};
}
function makePH({field,actor,event,visibility}) {
  const pid=field?'PH2':'PH1';
  const name=field?'有限な幸運獲得場':'既存身体の受容・付着境界';
  const reason=field?'One authoritative acquisition has its own finite state and ID; multiple layers share this state.':
    'The host body has an independently supplied position, orientation, support state and visibility boundary.';
  const identity={id:pid,name,origin:'declared',anchor:'body',visibility,
    local_state_difference:field?'Outer bifurcation to inner reception; state front moves inward without deleting the forks.':
      'Current body centre and axes differ from surrounding space; E follows them without changing the host pose.',partition_reason:reason};
  const evidence=field?['Two filled inward-facing forks keep open negative spaces.','The gold front advances into the receiving seam while outer emerald faces remain.']:
    ['The existing body silhouette remains between the two ribs.','Centre, axis and depth move with the current actor rather than the original event location.'];
  const link={source:'PH1',target:'PH2',mechanism:'Existing body frame is the declared attachment boundary of this acquisition field.',
    consequence:'Ribs and receiving seam follow the current recipient transform without imposing force or changing luck values.'};
  const conservation=(applies,why)=>({status:applies?'applicable':'not_applicable',balance_or_reason:why});
  return {
    identity,
    DeepStructure:{Core:field?'Inner seam is the terminal recipient region; its connected forks persist through resolve.':'Current body frame fixes the acquisition locus, independent of event creation coordinates.',
      Structure:field?'Two Y-like rib paths, narrow emitting cores and an inclined receiving seam form one connected visual structure.':
        `Host body half extents ${actor.body.halfWidth} m and ${actor.body.halfHeight} m, orthonormal right/up axes; joints are not replaced.`,
      Surface:field?'Gold front, emerald side face, tapered boundaries and fixed OBS edge separation have distinct widths.':
        'Existing host silhouette/depth is preserved; no wet layer, wound, extra garment or halo body is created.'},
    PhysicalModel:{model_kind:field?'declared_fantasy':'rigid_or_articulated',
      system_boundary:field?'PH2 spans only the body-relative rib paths and seam; no external receivers are added.':'PH1 is the host-supplied kinematic body boundary, not a resimulation of the whole character.',
      state_variables:field?'Normalised event age, local field support, branch front and relative emission; no measured energy units asserted.':
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
      constitutive_response:field?'WGSL field() and sampleField() map event age to support, front and emission under the unchanged host attachment boundary.':
        'Imported current host geometry determines projection and occlusion; response to E is zero mechanical deformation.',
      initial_condition:field?'At elapsedActorMs=0 both forks and seam are already visible; first state is reception, not an invisible lead-in.':'Use the host pose at the current authority sample; never replay the event-position pose.',
      boundary_conditions:field?'Body-relative support remains finite; outside its boundary there is no world substance. Event expiry removes the whole field with no remnant.':
        'Host support/contact and articulated boundaries are externally supplied; no floor or support prop is manufactured by E.',
      approximation_scope:field?'2.5D analytic emissive sheet in the body frame; not a numeric physical probability simulation. Parameters are artistic design choices, not measurements.':
        'Kinematic boundary import only; material detail and joint solvers remain host-owned. No assertion of an unobserved host equilibrium.'},
    ScaleRegime:{characteristic_length:`Existing body height ${2*actor.body.halfHeight} m; rib half-width scaled relative to this height.`,
      characteristic_time:field?'The single event Duration, four normalised phases, and zero post-expiry lifetime.':'Current authoritative host pose sample and its unchanged response timescale.',
      dominant_balance:field?'Declared attachment dominates; gravity and medium do not advect this nonmaterial support.':
        'The original host support/inertia balance is preserved because E adds zero load.',
      dimensionless_reasoning:field?'u=elapsedActorMs/durationMs and body-relative lengths are relevant; Re, We and real particle settling are not applicable.':
        'E-to-host additional force ratio is zero by design; no Reynolds or elastic number is inferred.',
      detail_cutoff:'OBS1 reconstructs narrow boundaries near a CSS pixel; main forks and the seam, not subpixel sparkle, are essential. Below 12 CSS px body height plan emits a warning.'},
    OctaDomain:octa(field),
    PerceptualReadability:{direct_evidence:visibility==='visible'?evidence:[],
      indirect_evidence:visibility==='visible'?[]:[field?'PH1 current state fixes the unrendered field placement.':'PH2 receiving frame follows this existing body when it becomes visible.'],
      figure_ground_separation:visibility==='visible'?'high':'not_applicable',
      edge_legibility:field?'Fixed dark guard, chromatic fill and narrow ivory core separate at ordinary game scale.':'No E body repaint; the host silhouette and relative rib spacing identify the recipient.',
      perceptual_failure_risk:'Extreme minification, edge-on projection, full occlusion or an opaque later pass can remove evidence; visibility is not inferred from background contrast.',
      cue_roles:evidence.map((cue,i)=>({cue,supports:i?'Current recipient and inward state propagation.':'Bounded acquisition rather than an overhead icon or outgoing attack.',
        reliability_and_overlap:'Shape and colour share projected geometry; they are complementary cues, not statistically independent measurements.'})),
      confusable_alternative:field?'An outgoing strike or a detached UI badge.':'A field attached to the actor old position instead of the current body.',
      disambiguating_evidence:field?'The progressive front terminates inward; no weapon, outgoing trajectory or upper-head symbol. Numeric luck magnitude is not recoverable from this effect.':
        'Current host transform is applied to every layer; event ID selects identity, not a frozen world coordinate.',
      viewing_conditions:'Design assumption: game displayed at CSS scale 1, DPR 1..4, body heights 12..96 CSS px. Actual skins, vision conditions and target hardware require review.'},
    GeometryConstraint:{surface_orientation:'Current host body right/up plane; transformed by one column-major world-to-clip matrix plus zoom.',
      normal_field_coherence:'All branches and the seam share that plane; edge face tint is subordinate to the same segment direction.',
      curvature_behavior:field?'Finite bent/branched paths; no ring or imaginary spherical shell.':'Host geometry unchanged.',
      silhouette_logic:field?'Outer and inner branches remain distinct at every active phase; open spaces preserve the body.':'Use the existing body silhouette and support relationships.',
      contact_relation:'Declared field attachment, not penetration or a new solid contact force.',
      spatial_relation:'Sides and lower torso region in body coordinates; no head-top offset or new floor plane.'},
    StateDynamics:{state_space_extent:field?'Four finite acquisition phases; inactive before 0 and at or after Duration.':'Host kinematic state; the effect does not add pose states.',
      transition_path_character:field?'monotonic':'equilibrium-maintained',local_stability_type:field?'stable':'neutral',
      convergence_behavior:field?'Broad acquisition front converges inward while bounded forks persist.':'No E-induced convergence is added; the supplied host state is maintained as input.',
      damping_profile:field?'Final phase contracts support modestly without zero-opacity dilution; the clock endpoint is an explicit finite termination.':'No extra wobble or damping.',
      oscillation_pattern:'none',equilibrium_recovery:field?'No autonomous repeat; another event ID is another independently timed field.':'No E displacement to recover.',
      transition_failure_risk:'Using wall time, replaying stale samples or extending a faint ring beyond authority would violate the lifetime.',
      driving_input:field?'PhysicalModel.inputs authoritative acquisition and PH1 attachment.':'Host current pose; no added E force.',
      response_timescale:field?'ScaleRegime.characteristic_time; boundary transitions are fractions of the one Duration.':'Host supplied response; no independent E body clock.',
      phase_relation:field?'Geometry, internal colour front, receiving seam and sound use the same u; observation guard has no mechanical delay.':'Body follows the host current sample rather than the field phase.',
      stability_condition:'Event age and immutable duration remain authoritative; a clock discontinuity is not silently replaced by a restart.'},
    Couplings:{DominantCouplings:field?['PH1.Optics -> PH2.Optics: body placement and visible boundary bind the acquisition field.']:
      ['PH1.Optics -> PH2.Optics: current recipient geometry constrains field placement.'],SecondaryCouplings:[],
      CausalAssessment:{intervention:field?'Hold event identity and host transform fixed; advance only authoritative age.':'Hold event age fixed; move only the existing actor with the host transform.',
        predicted_response:field?'Gold coverage reaches the receiving seam; the outer forks remain bounded until the event ends.':'Every E layer follows the new body frame, without game-state mutation.',
        competing_explanation:'A later compositor, full depth occlusion or small projection may hide cues without changing the acquisition state.',
        uncertainty:'Visual association reports an authoritative luck acquisition, not its numeric modifier or the outcome of a probability check. No physical causal identification or real-game study has been performed.',
        check_status:'hypothesis_only',evidence_refs:[]}},
    CausalityLinks:{physical_influence:[link],
      observation_dependency:field?[{source:'OBS1',target:'PH2',basis:'Edge mask follows the existing rib support.'},
        {source:'OBS2',target:'PH2',basis:'Narrow diffusion depends on selected emission and shape.'},
        {source:'OBS3',target:'PH2',basis:'Only filled primary-form samples can authorise the audio receipt.'}]:[],
      gaze_path:field?[{source:'PH2',target:'PH1',reason:'Inward front and seam terminate at the recipient.'}]:
        [{source:'PH1',target:'PH2',reason:'Body-side negative space leads to the two coloured forks.'}]},
    Evidence:{direct:visibility==='visible'?evidence:[],indirect:visibility==='visible'?[]:[field?'PH1 attachment transform.':'PH2 receiving-frame constraint.'],
      candidates:['boundary','occlusion','phase_difference','silhouette','convergence']},
    SurroundingChanges:{entries:[{target:field?'PH1':'PH2',change:field?'Body-side reception is optically indicated; no host albedo, load or luck rule is changed.':
      'The field position and orientation follow the existing body.'}],latent_reference_target:visibility==='latent'?(field?'PH1':'PH2'):'none'},
    VisualProjection:{role:field?'essential':'supporting',world_state_ref:`${pid}.StateDynamics`,
      retained_cues:visibility==='visible'?evidence:[field?'Indirect PH1 attachment.':'Indirect PH2 receiving position.'],
      simplification:'Analytic strokes omit nonessential subpixel subdivision, never the branches or receiving seam. Host skin rendering is retained.',
      omission_scope:[],exaggeration_scope:[],ambiguity_scope:[],intent_ref:'InferenceExpansionPolicy.ExpressionIntent'},
    BeautyStructureApplication:{conform_to:'PlatonicGoodTemplate.BeautyStructuring',target_policy:'standard',adjustment_reason:'not_applicable',
      axes:{contrast:field?['Dark guard against bright coloured fill.','Narrow ivory core against broader emerald/gold faces.']:
        ['Preserved body between the ribs.','Host silhouette separated from adjacent E edges.'],
        hierarchy_gaze_flow:field?['Outer fork to inner junction.','Joined stem to receiving seam.']:
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
      extent_orientation_depth:world?'Sides and lower-torso body plane; one consistent depth test, no billboard above the head.':
        'Screen-space mask evaluated on the projected field; no fictional contact or volume.',
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
      protected_cues:'Existing body, both forks, exact event independence and the inward receiving relation remain readable.',
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
    target_mask:'Projected PH2 rib and seam support, clipped by the host visible rectangle and optional depth.',
    stage:'world_render_observation',composite_method:method,intensity:`Bounded local operation; ${budgetRef}`,
    protected_regions:protectedRegions,output_consequence:result,dependencies:inputs,
    sampling_consequence:'Uses actual plan viewport and DPR; derivatives precede discard; no random texture or temporal flicker.'});
  const layers=[
    vfxLayer('ribs','primary_form',true,{reason:'Specify the existing luck-acquisition field, not a new emblem or object.',
      result:'Thick bifurcated emerald/gold supports identify the acquisition at every active age.',
      macro:'Two inward-facing forks; negative space exposes the recipient.',meso:'Outer two branches join into one inward stem on each side.',
      micro:'Narrow core and side-face value difference; no decorative noise.',edge:'Finite outer boundary, crisp coloured fill, constant world plane.',
      mechanism:'Declared field sheet with shaped emission support; WGSL field().',color:'CCM emerald outer faces and gold inward state, never sampled from the background.',
      motion:'Authority phase modestly contracts support toward the existing body; reducedMotion cuts geometric travel.',
      time:'Present at zero; joins during convergence; still bifurcated through resolve; disappears exactly at D.',
      composite:'World support evaluated by formMain after the glow pass; host depth/clip are shared.',failure:'A transparent beginning or a ring-only final half.'}),
    vfxLayer('front','internal_structure',true,{reason:'Resolve the interior state of the same field.',
      result:'A broad gold front propagates from branches toward the receiving seam.',macro:'Front stays inside the rib silhouette.',
      meso:'Segment progress values 0..1 carry a continuous inward acquisition order.',micro:'No repetitive sparkle or strobe; smooth front width.',
      edge:'The front does not inflate, blur or erase the support boundary.',mechanism:'sampleField() maps segment progress and u to acquired colour coverage.',
      color:'Emerald/gold is a field-state hue gradient, not thin-film interference.',motion:'Front advances even when reducedMotion holds most of the outer shape steady.',
      time:'Reception begins with emerald/gold structure; broad front reaches the receiver by incorporation; no reverse travel.',
      composite:'Shares PH2 support; composited inside formMain, not a second independent additive layer.',failure:'Simultaneous uncorrelated peaks or colour-only shimmer that loses direction.'}),
    vfxLayer('seam','boundary',true,{reason:'Resolve the field termination on the existing body, without adding an icon.',
      result:'The small inclined receiving seam links the two inward stems at the recipient.',macro:'Lower/central body region, never overhead.',
      meso:'Connected stem-to-seam offsets distinguish intake from outward attack.',micro:'Ivory core is narrow and subordinate to colour.',
      edge:'No independent sphere, outline circle, solid collision or leftover decal.',mechanism:'The same PH2 analytic sheet has a finite receiving boundary.',
      color:'Warm high-value core with coloured sides; skin colour unchanged.',motion:'The receiver stays body-attached while outer support contracts.',
      time:'Present from reception, most evident at incorporation, retained until the terminal active sample.',
      composite:'Shared formMain; no mechanical lag is assigned to optical response.',failure:'A detached central badge or residual afterimage beyond authority expiry.'}),
    vfxLayer('guard','observation_support',false,{obs:'OBS1',reason:'Reconstruct the existing boundary at game scale without inspecting background colour.',
      result:'A fixed narrow dark edge separates the coloured shape on bright and complex surfaces.',macro:'Mask strictly follows the PH2 silhouette.',
      meso:'Same two forks and seam; no independent graphic shape.',micro:'Approximately 0.68 CSS px outer guard, antialiased in physical pixels.',
      edge:'Guard is behind the fill and subordinate to it, not a thick black sticker.',mechanism:'formMain premultiplied border coverage.',
      color:'Fixed dark green-black; never chosen from skin or background luminance.',motion:'Immediate observation of PH2 support, no additional clock.',
      time:'Present only when PH2 is active.',composite:'Source-over, no screen-wide multiply; shared IntensityBudget.',failure:'Background-adaptive correction or double premultiplication.'}),
    vfxLayer('diffusion','observation_support',false,{obs:'OBS2',reason:'Support the declared strong emission with a narrow subordinate diffusion.',
      result:'A short-range coloured envelope makes the bright core read as luminous without destroying its shape.',
      macro:'Local exterior of the emitting rib/seam, no full-screen veil.',meso:'Diffusion follows distance from existing support.',
      micro:'Finite analytic falloff, no noise texture or detached glints.',edge:'Different width from guard; exterior opacity capped in shader.',
      mechanism:'glowMain analytic falloff and premultiplied colour.',color:'Derived from field colour; no physical flare or background hue analysis.',
      motion:'Tracks PH2 at the same sample; no inertial tail.',time:'Always ends with the event, including hidden or reduced-motion cases.',
      composite:'Local source-over before all primary forms; no primary geometry generated by bloom.',failure:'A white mass, global luma lift or ghost lingering after D.'})
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
        background:'Existing game scene, unchanged and not sampled for correction.',style:'Host game style; analytic 2D-anime-compatible local field.',
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
        state_transition_readability:'Inward state front and receiving seam through four phases.'},
      Beauty:{boundary_readability:'Coloured thick forks, thin ivory core and fixed dark guard.',
        gaze_circulation:'Body to fork, then front back into recipient.',structural_separation:'Open spaces, branch junctions and a distinct seam.'},
      BeautyStructuring:{axes:['ratio_proportion','balance_symmetry','contrast','rhythm_repetition','whitespace_density','hierarchy_gaze_flow','material_response','temporal_phase'],
        standard_minimum_axes_per_PH:2,standard_minimum_evidence_per_applied_axis:2,intent_adjustment_ref:'InferenceExpansionPolicy.ExpressionIntent'},
      Acceptance:{each_PH_connected_to_at_least_two_GTB_layers:true,single_formula_does_not_dominate_beauty:true}},
    PhenomenonSystemTemplate:{PartitionPolicy:{criterion:'Independent existing body boundary and one finite acquisition state per ID.',
      shared_condition_policy:'Current camera, body and actor clock are shared; rib, front and seam responses are not collapsed.',no_discipline_based_split:true},
      SharedConditions:{},PhenomenonRegistry:{PH1:p1.identity,PH2:p2.identity},PhenomenonBlock:{PH1:p1,PH2:p2},
      Acceptance:{all_PH_have_required_full_structure:true,visible_implicit_latent_have_same_field_set:true,OBS_not_in_PH_registry:true,PIA_resolved_as_identification_lifecycle:true}},
    PEMTemplate:{Mode:{phenomenon_equality:true,focus_phenomenon:'none'},
      CausalMesh:{physical_mesh_required:true,gaze_target_policy:'standard',adjustment_reason:'not_applicable',
        gaze_path_A:'PH1 body -> PH2 outer forks.',gaze_path_B:'PH2 internal front -> PH1 receiver.',local_extrema_connected_to_gaze_paths:true},
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
      VectorField:{dominant_vector:{direction:'Body-side branch toward inner seam.',magnitude:'Normalised authority progression; not particle m/s.',falloff:'Finite field support.',fluctuation:'none'},
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
        whitespace_role:'Fork openings leave the body readable.'},
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
        spatial_detail_policy:'Keep filled fork/junction topology; reconstruct narrow boundaries near a CSS pixel before adding any fine detail. No particle/grain frequencies.',
        temporal_sampling:'Host presentation cadence and exposure are not controlled by this module. Geometry samples authoritative actor-ms once per frame; no blur/integration added.',
        filter_and_resample_policy:'WGSL derivative antialiasing is executed; no unexecuted post-resampling is claimed. Review actual sizes and display paths.'},
      ImageIntegration:{ToneColor:'PH2 fixed palette, no global grading.',LightIntegration:'OBS2',ShadowDensity:'none',DepthAir:'none',EdgeLine:'OBS1',TextureOutput:'none'},
      LensFlareField:{response_visibility:'none',reason:'No physical lens model or flare requested; no surrogate source added.'},
      IntensityBudget:{global_observation_budget:'Local source-over only; no screenwide addition or adaptive correction.',
        para:'none',flare_gradient:'none',glow:'low: analytic external alpha <= .20',diffusion:'same operation as glow; never duplicated',grain:'none',chromatic_aberration:'none',
        protected_region_priority:'highest',intentional_departures:[]},
      CompositeValidation:{contour_preserved:'not_tested',highlight_clipping:'not_tested',shadow_crushing:'not_tested',chroma_displacement:'not_tested',
        fine_detail_retention:'not_tested',protected_background_preserved:'not_tested'},
      Acceptance:{OBS_separate_from_PH:true,physical_lensflare_source_binding_preserved:true,display_artifact_does_not_fake_physical_source:true,
        intensity_budget_is_single_source_of_truth:true,sampling_conditions_and_actual_execution_distinguished:true}},
    ExtremumDesignColorTemplate:{PEV:{candidate_state_set:['selected: four-phase finite inward acquisition with persistent branching support'],
      selected_physics_extremum:'finite-inward-acquisition',reason:'Preserves the actor-relative receiving relation without pretending to implement game probability.'},
      AES:{selected_from_PEV_only:true,visual_circulation:'Outer branches toward body seam.',asymmetric_balance:'Small stable identity variation, not random noise.',
        tension_release:'Broad front settles inward; final support remains substantial.',body_environment_consonance:'Body unchanged; surrounding field follows it.',selected_aesthetic_extremum:'finite-inward-acquisition'},
      DesignScience:{VisualHierarchy:'Filled forks -> receiving seam -> narrow core -> diffusion.',DensityPlan:'Concentrated on ribs; open body-side gaps.',
        ShapeOrder:'Two inward branch systems, not a numerical beauty formula.',OrnamentFunction:'No independent ornaments; all detail serves reception/phase/outline.'},
      CCM:{Palette:{base:'emerald (linear .018,.69,.28)',secondary:'gold (1,.58,.035)',accent:'ivory (1,.96,.67)',neutral:'dark guard (.009,.025,.023)'},
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
        primary_read:'Inward branching reception on this body, never an overhead marker.',layering_basis:'Support, interior front, receiving boundary and local observation have different functions; only one acquisition PH.'},
      layers,interlayer_links:[{source_layer:'front',target_layer:'ribs',relation_type:'visual_relation',mechanism_and_consequence:'The state front is restricted to existing rib support.',foundation_binding:'PH2.DeepStructure'},
        {source_layer:'seam',target_layer:'ribs',relation_type:'visual_relation',mechanism_and_consequence:'Both inward stems terminate on the same receiving seam.',foundation_binding:'PH2.GeometryConstraint'},
        {source_layer:'guard',target_layer:'ribs',relation_type:'observation_dependency',mechanism_and_consequence:'Projected support supplies edge coverage.',foundation_binding:'OBS1 -> PH2'},
        {source_layer:'diffusion',target_layer:'ribs',relation_type:'observation_dependency',mechanism_and_consequence:'Emission/support supplies bounded exterior diffusion.',foundation_binding:'OBS2 -> PH2'}],
      causal_path:{input:`Authority event ${event.id}`,carrier_PH:'PH2',receiver:'PH1 body attachment; no gameplay change',
        ScaleRegime_ref:'PH2.ScaleRegime',StateDynamics_ref:'PH2.StateDynamics',ReactivePhaseChange_ref:'not_applicable; no reaction or material conversion'},
      orchestration:{common_time_basis:'VideoGenerationPolicy.timeline / current actor-ms',layer_phase_relations:'Shared event phase; front progression differs from modest geometric contraction.',
        environment_response:'Only the existing body attachment/occlusion relation; no extra receivers, floor, smoke or particles.',
        visual_hierarchy:'Filled colour and inward topology dominate narrow core and diffusion.',bullet_time:'not_applicable; not requested'},
      output_integration:{budget_ref:budgetRef,sampling_contract_ref:samplingRef,LDM_ref:'LuminanceDynamicsModule',
        composite_order:'All local diffusion -> all primary forms with guard -> colour-write-disabled visibility witnesses.',
        color_alpha_contract:`Executed premultiplied source-over. Transfer is chosen explicitly at create(), not inferred from background.`,
        scale_adaptation:'Screen-width reconstruction; no particle count or stroke symbol substitutions.'},
      validation_plan:{layer_checks:'Forks, directed front, receiving seam, edge and narrow diffusion independently identifiable.',
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
    const pass={setViewport(){},setPipeline(){},setScissorRect(){},setBindGroup(){},beginOcclusionQuery(){},endOcclusionQuery(){},end(){},draw(){stats.drawCalls++;}};
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
 * unchanged; coloured forks and receiving seam must remain, including the last
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
