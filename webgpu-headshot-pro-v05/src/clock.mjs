import {LIMITS} from './contract.mjs';
/**
 * sourceNow() と event.atMs は同じ、ホストが正規化した非加速の時計（ms）。
 * 演出時間のみ rate 履歴を積分する。server offset をこのクラスで推定しない。
 */
export class RateClock {
  #sourceNow; #segments; #last; #historyMs;
  constructor({sourceNow, rate = 1, historyMs = 10000}) {
    if (typeof sourceNow !== 'function') throw new TypeError('sourceNowが必要です');
    if (!Number.isFinite(rate) || rate < 0 || rate > LIMITS.maxRate) throw new RangeError('rate');
    if (!Number.isFinite(historyMs) || historyMs <= 0) throw new RangeError('historyMs');
    this.#sourceNow = sourceNow; this.#last = sourceNow(); this.#historyMs = historyMs;
    if (!Number.isFinite(this.#last)) throw new TypeError('時計の初期値');
    this.#segments = [{at: this.#last, rate}];
  }
  now() {
    const now = this.#sourceNow();
    if (!Number.isFinite(now) || now < this.#last) throw new RangeError('clock_rewind: 新しいsession/時計へ再構成してください');
    this.#last = now;
    const cutoff = now - this.#historyMs;
    while (this.#segments.length > 1 && this.#segments[1].at < cutoff) this.#segments.shift();
    return now;
  }
  get rate() { return this.#segments.at(-1).rate; }
  setRate(rate) {
    if (!Number.isFinite(rate) || rate < 0 || rate > LIMITS.maxRate) throw new RangeError('rateは0〜4');
    const at = this.now();
    if (at === this.#segments.at(-1).at) this.#segments.at(-1).rate = rate;
    else if (rate !== this.rate) this.#segments.push({at, rate});
  }
  elapsedSince(at, end = this.now()) {
    if (!Number.isFinite(at) || !Number.isFinite(end) || at > end || at < this.#segments[0].at) return null;
    let sum = 0;
    for (let i = 0; i < this.#segments.length; i++) {
      const s = this.#segments[i]; const a = Math.max(at, s.at);
      const b = Math.min(end, this.#segments[i + 1]?.at ?? end);
      if (b > a) sum += (b - a) * s.rate;
      if (s.at > end) break;
    }
    return sum;
  }
}
