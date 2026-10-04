export const VERSION = 'hover-sprint-blue-sol61-r8';
export const LIVE_MS = 8000, ONSET_MS = 360, END_MS = 360;
const finite = (value, name) => { if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`); return value; };
const point = (value, name) => Object.freeze({x: finite(value?.x, `${name}.x`), y: finite(value?.y, `${name}.y`)});
const anchors = (value, name) => {
  if (!Array.isArray(value) || value.length !== 2) throw new TypeError(`${name}: exactly two registered source anchors required`);
  return Object.freeze(value.map((v, i) => point(v, `${name}.${i}`)));
};
export function smooth01(value) { const t = Math.min(1, Math.max(0, value)); return t*t*(3-2*t); }
export function freezeCause(value) {
  if (!value?.causeId || !value?.actorId || !Number.isSafeInteger(value.roomGeneration) || value.roomGeneration < 1) throw new TypeError('causeId, actorId and positive roomGeneration required');
  return Object.freeze({causeId: String(value.causeId), actorId: String(value.actorId), roomGeneration: value.roomGeneration,
    activeUntilServerMs: finite(value.activeUntilServerMs, 'activeUntilServerMs'), onsetLocalStartMs: value.onsetLocalStartMs == null ? null : finite(value.onsetLocalStartMs, 'onsetLocalStartMs'), durationMs: LIVE_MS});
}
export function sampleJetState(input = {}) {
  const {cause, clock, geometry} = input;
  if (!cause?.causeId || !cause?.actorId || !Number.isSafeInteger(cause.roomGeneration)) throw new TypeError('frozen valid cause required');
  const feet = anchors(geometry?.feet, 'feet'), back = anchors(geometry?.back, 'back');
  const raw = point(geometry?.heading, 'heading'), norm = Math.hypot(raw.x, raw.y);
  if (norm < 1e-6) throw new TypeError('heading must be nonzero');
  const heading = Object.freeze({x: raw.x/norm, y: raw.y/norm});
  const flowAgeMs = finite(clock?.flowAgeMs, 'integrated flowAgeMs');
  const localNowMs = finite(clock?.localNowMs, 'localNowMs'), serverNowMs = finite(clock?.serverNowMs, 'serverNowMs');
  const remainingMs = finite(cause.activeUntilServerMs, 'activeUntilServerMs') - serverNowMs;
  const localOnsetAge = cause.onsetLocalStartMs == null ? null : localNowMs - finite(cause.onsetLocalStartMs, 'onsetLocalStartMs');
  const active = input.alive !== false && !input.ejected && !input.inVent && input.sourceOn !== false && remainingMs > 0 && flowAgeMs >= 0 && (localOnsetAge == null || localOnsetAge >= 0);
  const phase = !active ? 'off' : remainingMs <= END_MS ? 'end' : localOnsetAge != null && localOnsetAge < ONSET_MS ? 'onset' : 'sustain';
  const start = localOnsetAge == null ? 1 : smooth01(localOnsetAge/ONSET_MS);
  const end = smooth01(remainingMs/END_MS);
  // Source feeding builds quickly; visible column travels outward more slowly.
  const sourceGain = active ? smooth01((localOnsetAge ?? ONSET_MS)/90) * end : 0;
  const lengthGain = active ? (0.16+0.84*start) * (0.18+0.82*end) : 0;
  return Object.freeze({version: VERSION, causeId: cause.causeId, actorId: cause.actorId, roomGeneration: cause.roomGeneration,
    active, phase, remainingMs, localOnsetAge, flowAgeMs, feet, back, heading, gain: sourceGain, lengthGain,
    reducedMotion: Boolean(input.reducedMotion), sourceOn: input.sourceOn !== false});
}
export function makeFixture(variant = 'normal', ageMs = 1800, heading = {x: 1, y: 0}) {
  if (!['normal', 'reduced'].includes(variant)) throw new TypeError('normal/reduced fixture only');
  const h = point(heading, 'fixture heading'), m = Math.hypot(h.x,h.y);
  if (m < 1e-6) throw new TypeError('fixture heading must be nonzero');
  const side = {x: -h.y/m, y: h.x/m};
  const pair = (y, gap) => [-1,1].map(sign => ({x: 200+side.x*gap*sign, y: y+side.y*gap*sign}));
  return {cause: freezeCause({causeId: 'hs-blue-synthetic-1', actorId: 'hs-synthetic-actor', roomGeneration: 1, activeUntilServerMs: 18000, onsetLocalStartMs: 500}),
    clock: {localNowMs: 500+ageMs, serverNowMs: 10000+ageMs, flowAgeMs: ageMs},
    geometry: {feet: pair(153.24,6), back: pair(135.24,8), heading: h}, alive: true, ejected: false, inVent: false, sourceOn: true, reducedMotion: variant === 'reduced'};
}
export function packUniforms(input, view = {}, controls = {}) {
  const state = sampleJetState(input), width = finite(view.width ?? 384,'width'), height = finite(view.height ?? 256,'height'), scale = finite(view.scale ?? 1,'scale');
  if (width <= 0 || height <= 0 || scale <= 0) throw new TypeError('positive projection extent required');
  const camera = point(view.camera ?? {x:0,y:0},'camera'), origin = point(view.origin ?? {x:0,y:0},'origin');
  const u = new Float32Array(40);
  u.set([width,height,scale,state.flowAgeMs,state.remainingMs,state.localOnsetAge ?? -1,state.active ? 1 : 0,state.reducedMotion ? 1 : 0,state.heading.x,state.heading.y,state.gain,state.lengthGain]);
  [...state.feet,...state.back].forEach((anchor,i) => u.set([origin.x+(anchor.x-camera.x)*scale,origin.y+(anchor.y-camera.y)*scale,i<2?0:1,i],12+i*4));
  u.set([0.012,0.018,0.025,1,controls.bodyOn===false?0:1,controls.emitterOn===false?0:1,controls.nearOn===false?0:1,controls.postOn===false?0:1,1,1.35,3.8,0.045],28);
  return u;
}
export function jetAxis(heading, kind) {
  const p = point(heading,'axis heading'), m = Math.hypot(p.x,p.y);
  if (m < 1e-6) throw new TypeError('heading must be nonzero');
  const x = -(kind === 0 ? 0.36 : 1)*p.x/m, y = -(kind === 0 ? 0.36 : 1)*p.y/m+(kind === 0 ? 1 : 0.30), n = Math.hypot(x,y);
  return Object.freeze({x:x/n,y:y/n});
}
export function receiverIrradiance(input, worldPoint) {
  const state = sampleJetState(input), q = point(worldPoint,'registered receiver point');
  if (!state.active) return Object.freeze([0,0,0]);
  // Finite source extent regularizes irradiance. Host must additionally apply
  // real normal, distance scale, albedo and visibility; this is not a body rim.
  let e = 0;
  for (const p of [...state.feet,...state.back]) e += state.gain/(1+((q.x-p.x)**2+(q.y-p.y)**2)/16);
  return Object.freeze([0.035*e,0.22*e,0.62*e]);
}
