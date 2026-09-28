import { CONTRACT, ownerRate } from './contract.js';
/** 積分型。切替時に既存区間を確定し、新しい速度を未来の区間だけへ適用する。 */
export class EffectClock {
  constructor(now = 0, rate = 1) {
    if (!Number.isFinite(now) || ![1, 2].includes(rate)) throw new TypeError('Invalid clock');
    this.anchor = now; this.accumulated = 0; this.rate = rate;
  }
  at(now) { return this.accumulated + Math.max(0, now - this.anchor) * this.rate; }
  setRate(rate, now) {
    if (![1, 2].includes(rate) || !Number.isFinite(now) || now < this.anchor) throw new RangeError('Non-monotonic rate change');
    this.accumulated = this.at(now); this.anchor = now; this.rate = rate;
  }
  applyOwner(acc2, now) { const r = ownerRate(acc2); if (r !== this.rate) this.setRate(r, now); }
  done(now) { return this.at(now) >= CONTRACT.duration; }
}
/** AudioContext稼働時は同一のaudio clockを利用。停止/稼働切替でも値を巻き戻さない。 */
export class SharedMediaClock {
  constructor(getAudioContext = () => null, perf = () => performance.now() / 1000) {
    this.getAudioContext = getAudioContext; this.perf = perf;
    this.kind = null; this.origin = 0; this.last = 0;
  }
  now() {
    const ac = this.getAudioContext();
    const kind = ac?.state === 'running' ? ac : 'performance';
    const raw = kind === 'performance' ? this.perf() : ac.currentTime;
    if (kind !== this.kind) { this.origin = this.last - raw; this.kind = kind; }
    this.last = Math.max(this.last, this.origin + raw);
    return this.last;
  }
}
