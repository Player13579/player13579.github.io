/** Pure game-contract helpers. The renderer NEVER writes health, inventory or cooldowns. */
export const CONTRACT = Object.freeze({
  version: 'r0.1', chargeMs: 1200, lockMs: 7000, normalRange: 260,
  cooldownMs: 18000, pairWindowMs: 1200, pairDistance: 520,
  killRadius: 110, damageRadius: 260, pairVisualMs: 1600, H64: 64,
  audioRange: Object.freeze({ charge: 2200, normal: 2200, resonance: 2600, cancellation: 1800, suppression: 2200 }),
});
export function finite(n, name) {
  if (!Number.isFinite(n)) throw new TypeError(`${name} must be finite`);
  return n;
}
export function point(p, name = 'point') {
  if (!p || typeof p !== 'object') throw new TypeError(`${name} must be {x,y}`);
  return { x: finite(p.x, `${name}.x`), y: finite(p.y, `${name}.y`) };
}
export function distance(a,b) { return Math.hypot(a.x-b.x, a.y-b.y); }
export function midpoint(a,b) { return {x:(a.x+b.x)/2, y:(a.y+b.y)/2}; }
export function pairResult(a,b) {
  point(a.origin); point(b.origin); finite(a.atMs,'a.atMs'); finite(b.atMs,'b.atMs');
  for (const c of [a,b]) if (![1,-1].includes(c.phase)) throw new RangeError('phase must be +1 or -1');
  const gapMs=Math.abs(a.atMs-b.atMs), separation=distance(a.origin,b.origin);
  if (a.id===b.id || a.actorId===b.actorId || gapMs>CONTRACT.pairWindowMs || separation>CONTRACT.pairDistance) return null;
  return {kind:a.phase===b.phase?'resonance':'cancellation',origin:midpoint(a.origin,b.origin),
    atMs:Math.max(a.atMs,b.atMs),gapMs,separation,sourceIds:[a.id,b.id]};
}
export function classifyResonance(origin,target) {
  const d=distance(point(origin),point(target));
  return d<=CONTRACT.killRadius?'kill':d<=CONTRACT.damageRadius?'body_damage':'outside';
}
export function normalHit(origin,target) { return distance(point(origin),point(target))<=CONTRACT.normalRange; }
/** Smooth compact-support gain. Game px, not Web Audio's default meter distance. */
export function distanceGain(d,range) {
  finite(d,'distance'); finite(range,'range');
  if (range<=0) throw new RangeError('range must be positive');
  const t=Math.min(1,Math.max(0,d/range));
  return (1-t*t)*(1-t*t)/(1+6*t*t);
}
/** Host supplies ONE shared actor clock. No RAF/wall time enters world lifetimes. */
export class ActorClock {
  constructor(ms=0) { this.ms=finite(ms,'actorMs'); this.rate=1; }
  setRate(rate) { finite(rate,'rate'); if(rate<0||rate>8)throw new RangeError('rate must be 0..8'); this.rate=rate; }
  advance(realDeltaMs) { finite(realDeltaMs,'delta'); if(realDeltaMs<0)throw new RangeError('negative delta'); this.ms+=realDeltaMs*this.rate; return this.ms; }
  reset(ms=0) { this.ms=finite(ms,'actorMs'); }
}
