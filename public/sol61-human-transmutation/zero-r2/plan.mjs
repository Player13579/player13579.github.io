export const VERSION = 'human-transmutation-zero-sol61-r2';
export const DURATION_MS = 3400;
export const DEFAULTS = Object.freeze({ bodyHeightCss: 64, background: 'dark', observer: true,
  sparkles: true, main: true, source: true, reducedMotion: false, centerX: null, centerY: null });
export function phase(ageMs) {
  if (!Number.isFinite(ageMs) || ageMs < 0) throw new RangeError('ageMs must be finite and nonnegative');
  if (ageMs >= DURATION_MS) return 'ended';
  return ageMs < 300 ? 'seed' : ageMs < 1550 ? 'formation' : ageMs < 2400 ? 'closure' : 'settlement';
}
export function formationHeight(ageMs) { return Math.max(0, Math.min(1, (ageMs - 120) / 1250)); }
export function validateFrame(input) {
  phase(input.ageMs);
  if (typeof input.causeId !== 'string' || !input.causeId) throw new TypeError('causeId required');
  for (const key of ['width','height','bodyHeight']) if (!Number.isFinite(input[key]) || input[key] <= 0) throw new RangeError(key);
  for (const key of ['centerX','centerY']) if (!Number.isFinite(input[key])) throw new RangeError(key);
  return input;
}
// One monotonic clock owns replay, RAF and resume. RAF timestamps are deliberately not used.
export class Playback {
  constructor(now = () => performance.now()) { this.now=now; this.serial=0; this.replay(); }
  replay() { this.epoch=this.now(); this.held=null; this.serial++; return this.serial; }
  hold(ageMs) { phase(ageMs); this.held=ageMs; }
  resume() { if(this.held !== null) { this.epoch=this.now()-this.held; this.held=null; } }
  age() { return this.held ?? Math.max(0,this.now()-this.epoch); }
}

