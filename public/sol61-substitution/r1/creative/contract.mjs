// 変わり身の術 R1: creative ABI only. No renderer, DOM, audio device, or raw event adapter.
export const VERSION = 'substitution-sol61-r1';
export const DURATIONS_MS = Object.freeze({grant: 820, trigger: 1200});
export const ROLES = Object.freeze({grantSource: 0, grantReceipt: 1, triggerOrigin: 2, triggerDestination: 3});
export const ROLE_SOURCE_GATE = Object.freeze({grant: 0, trigger: 2});
export const ROLE_WINDOWS_MS = Object.freeze([[0,820],[140,820],[0,1200],[100,1080]].map(Object.freeze));
export const UNIFORM_BYTES = 64;
export const SUPPORT_H = Object.freeze({left:-0.92, right:0.92, bottom:-0.18, top:1.22});
export const SFX_CUES = Object.freeze({
  grant:Object.freeze({offsetMs:20,latestStartAgeMs:85,durationMs:480}),
  trigger:Object.freeze({offsetMs:16,latestStartAgeMs:75,durationMs:720})
});
export function roleActive(role, ageMs) {
  if (!Number.isInteger(role) || role < 0 || role >= 4 || !Number.isFinite(ageMs)) return false;
  const age = Math.fround(ageMs);
  return Number.isFinite(age) && age > ROLE_WINDOWS_MS[role][0] && age < ROLE_WINDOWS_MS[role][1];
}
export function sourceEmissionEligible(kind, ageMs) {
  return Object.hasOwn(ROLE_SOURCE_GATE,kind) && roleActive(ROLE_SOURCE_GATE[kind],ageMs);
}
// Gate permission BEFORE reading coordinates: invisible coordinates are not consumed at all.
// Caller must supply a current per-viewer registered projection, never raw targetX/targetY.
// An ID, raw event, prior visibility, distance or owning the effect is not authorization.
export function sanitizeProjection(projection) {
  if (!projection || projection.authorized !== true || projection.visible !== true ||
      projection.current !== true || projection.registered !== true) return null;
  const {footX,footY,actorHeightPx} = projection;
  if (![footX,footY,actorHeightPx].every(Number.isFinite) || actorHeightPx <= 0) return null;
  const x32=Math.fround(footX), y32=Math.fround(footY), h32=Math.fround(actorHeightPx);
  if (![x32,y32,h32].every(Number.isFinite) || h32 <= 0) return null;
  return Object.freeze({footX,footY,actorHeightPx});
}
export function boundsFor(projection) {
  const p=sanitizeProjection(projection);
  if (!p) return null;
  const h=p.actorHeightPx;
  return Object.freeze({x:p.footX+SUPPORT_H.left*h,y:p.footY-SUPPORT_H.top*h,
    width:(SUPPORT_H.right-SUPPORT_H.left)*h,height:(SUPPORT_H.top-SUPPORT_H.bottom)*h});
}
export function packUniform64({viewportPx,ageMs,role,projection,reducedMotion=false,
    sourceOn=true,observerBloomOn=true,sparkleOn=true}) {
  if (!sourceOn || !roleActive(role,ageMs)) return null;
  const p=sanitizeProjection(projection);
  if (!p || !Array.isArray(viewportPx) || viewportPx.length!==2 ||
      !viewportPx.every(v=>Number.isFinite(v)&&v>0)) return null;
  const packed=new Float32Array([viewportPx[0],viewportPx[1],ageMs,role,
    p.footX,p.footY,p.actorHeightPx,reducedMotion?1:0,1,observerBloomOn?1:0,sparkleOn?1:0,0,0,0,0,0]);
  return packed.every(Number.isFinite) ? packed : null;
}
// vsMain: full-screen triangle, no vertex buffers. fsMain: premultiplied linear RGBA.
// Bind group0 binding0: 64B uniform; separate immutable-per-submit buffer for EACH role.
// Blend color/alpha: src=one, dst=one-minus-src-alpha, operation=add.
// Actor fixture is owned by host: draw actor first, then these exterior front folds.
// Same H maps one actor's registered head-to-foot projected height, not texture/quad height.
// All roles share a local projection, x=(pixelX-footX)/H, y=(footY-pixelY)/H.
// Each role's bounds/uniforms/OBS depend ONLY on its own permitted anchor and event age.
// Invisible source => no source world effect/audio. Invisible receiver/destination => omit
// that role before bounds, uniforms, debug, audio; no direction, shadow or hidden glow.
// Grant requires role0; trigger requires role2 for source readiness/SFX. Optional role1/3
// never unlock sound. GPU completed+sourceEmissionEligible is admission, NOT pixel proof.
// MainOFF: submit no E; shader sourceOn=0 additionally guarantees exact transparent zero.
// Stop/hidden/expiry/dispose/cause replacement invalidate submissions+audio; never replay
// old SFX after unlocking. Keep source origin immutable in one monotonic clock domain.
// SFX starts once in cue window only, current cause+generation+GPU target completed,
// playing+MainON+source current/visible. Start PCM at (age-cueOffset)ms, not time0.
// Existing trigger world sound and this standalone sound are mutually exclusive choices.
// No attacks, movement path, charge depletion at grant end, or persistent charge marker
// are inferred. Candidate is independent preview; main-game adapter is not implemented.
