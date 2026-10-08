export const VERSION = 'gunner-headshot-unified-sol61-r2';
export const DURATION_MS = 420;
export const SUPPORT_WORLD = 32;
const id = value => typeof value === 'string' && value.length > 0;

// No shot event, gun geometry, kill state, or variant-dependent creative branch.
export function planContact({event, nowMs, target, viewerId = '', reducedMotion = false}) {
  if (event?.type !== 'action-gunner-headshot') throw new TypeError('Exact headshot contact event required');
  if (!id(event.id) || !id(event.playerId) || !id(event.targetId) ||
      ![event.x, event.y, event.startedAt, nowMs].every(Number.isFinite) ||
      event.radius !== 150 || !/^(aim|hip):[a-z0-9_-]+$/.test(event.variant))
    throw new TypeError('Authoritative contact identity, point, age, radius and context required');
  if (!target || target.id !== event.targetId || target.visible !== true || target.hidden ||
      target.inVent || target.ejected || (target.invisible && target.id !== viewerId)) return null;
  const ageMs = nowMs - event.startedAt;
  if (ageMs < 0 || ageMs >= DURATION_MS) return null;
  return Object.freeze({version: VERSION, id: event.id, playerId: event.playerId,
    targetId: event.targetId, variant: event.variant, radius: event.radius,
    startedAt: event.startedAt, point: Object.freeze({x: event.x, y: event.y}),
    ageMs, durationMs: DURATION_MS, supportWorld: SUPPORT_WORLD,
    reducedMotion: Boolean(reducedMotion), contactOnly: true, killOutcomeUnknown: true});
}

// Projection owner returns backing pixels once; renderer performs no DPR conversion.
export function projectContact(plan, geometry) {
  if (!geometry || !Number.isInteger(geometry.pixelWidth) || !Number.isInteger(geometry.pixelHeight) ||
      geometry.pixelWidth < 1 || geometry.pixelHeight < 1 ||
      !Number.isFinite(geometry.pixelsPerWorldUnit) || geometry.pixelsPerWorldUnit <= 0 ||
      typeof geometry.project !== 'function' || !id(geometry.targetId) ||
      !Number.isInteger(geometry.generation) || geometry.generation < 1)
    throw new TypeError('One exact backing geometry owner is required');
  if (!plan) return null;
  const point = geometry.project(plan.point);
  if (!point || ![point.x, point.y].every(Number.isFinite)) throw new TypeError('Invalid backing projection');
  return Object.freeze({...plan, point, targetSurfaceId: geometry.targetId,
    generation: geometry.generation, pixelWidth: geometry.pixelWidth, pixelHeight: geometry.pixelHeight,
    pixelsPerWorldUnit: geometry.pixelsPerWorldUnit});
}

export function previewEvent(startedAt, suffix = '1') {
  return Object.freeze({id: `preview-contact-${suffix}`, type: 'action-gunner-headshot',
    x: 0, y: 0, startedAt, playerId: 'preview-shooter', targetId: 'preview-target',
    radius: 150, variant: 'hip:handgun'});
}
