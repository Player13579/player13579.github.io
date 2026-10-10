export const EDITION = Object.freeze({id:'common-action-mana-sol61-edition3-r446',edition:3,limit:5,consumed:3,remaining:2,adoption:'unknown',author:'GPT-6.1-Sol'});
export const VARIANTS = Object.freeze(['desire','grit','rational']);
const aliases = {desire:0,'欲望':0,grit:1,'気概':1,rational:2,'理知':2};
const validId = value => (typeof value==='string' && value.length>0) || (typeof value==='number' && Number.isFinite(value));
export function normalizeEvent(event) {
  if (!event || !validId(event.id) || !validId(event.playerId) || !Number.isFinite(event.x) || !Number.isFinite(event.y) || !Number.isFinite(event.startedAt)) return null;
  if (typeof event.variant!=='string' || !Object.hasOwn(aliases,event.variant)) return null;
  const variantIndex = aliases[event.variant];
  if (variantIndex == null) return null;
  const durationMs = event.duration == null ? 1200 : event.duration;
  if (!Number.isFinite(durationMs) || durationMs <= 0) return null;
  return {...event, variantIndex, durationMs, causeKey:JSON.stringify([event.id,event.playerId])};
}
export function sample(event, nowMs, options={}) {
  const e=normalizeEvent(event);
  const suppressed=!e || e.invisible===true || e.dead===true || e.vent===true || e.inVent===true || e.ejected===true || e.cancelled===true;
  const ageMs=e ? nowMs-e.startedAt : 0;
  const active=!suppressed && Number.isFinite(nowMs) && ageMs>=0 && ageMs<e.durationMs && options.sourceEnabled!==false;
  return {active, phase:!active?'inactive':ageMs/e.durationMs<.18?'activation':ageMs/e.durationMs<.78?'operation':'expiry', ageMs,durationMs:e?.durationMs??1200,variantIndex:e?.variantIndex??0,causeKey:e?.causeKey??null,anchor:e?[e.x,e.y]:[0,0],edition:EDITION};
}
export function packUniform(event, nowMs, options={}) {
  const s=sample(event,nowMs,options), [w,h]=options.viewport??[256,256], H=options.actorHeightPx??64;
  if (![w,h,H].every(v=>Number.isFinite(v)&&v>0)) throw new RangeError('positive viewport and actorHeightPx required');
  return new Float32Array([w,h,H,s.ageMs/1000,...s.anchor,s.durationMs/1000,s.variantIndex,s.active?1:0,options.observerEnabled===false?0:1,options.reducedMotion?1:0,0,0,0,0,0]);
}
