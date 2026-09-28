import {convexPolygon} from './math.js';
export const CONTRACT = Object.freeze({release:'r0.4', durationMs:1500, minimumMs:900, radiusPx:82, referenceHeight:64, maximumActorRate:8, schema:'mana-gain/4'});
export const validId = x => typeof x === 'string' && x.length > 0 && x.length <= 256;
export function bodyStatus(body) {
  if (!body) return 'missing-beneficiary';
  for (const k of ['alive','present','inVent','invisible']) if (typeof body[k] !== 'boolean') return 'invalid-visibility';
  if (!body.present) return 'departed'; if (!body.alive) return 'dead'; if (body.inVent) return 'vent'; if (body.invisible) return 'invisible';
  if (![body.x,body.y,body.heightPx].every(Number.isFinite) || body.heightPx <= 0 || (body.angleRad !== undefined && !Number.isFinite(body.angleRad))) return 'invalid-transform';
  if (!convexPolygon(body.torsoPolygon)) return 'invalid-receiving-polygon';
  return null;
}
export function clockStatus(c) { return c && Number.isFinite(c.timeMs) && c.timeMs >= 0 && Number.isFinite(c.rate) && c.rate >= 0 && c.rate <= CONTRACT.maximumActorRate; }
export function normalDuration(value = CONTRACT.durationMs) { if (!Number.isFinite(value) || value <= 0) throw new RangeError('durationMs must be positive and finite'); return Math.max(CONTRACT.minimumMs, value); }
