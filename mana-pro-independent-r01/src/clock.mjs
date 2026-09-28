import {EFFECT_DURATION_SECONDS, ownerRate} from './contract.mjs';
/** 発動者＝この受領Eを所有するplayerId。移動ACC2の実効状態の切替点で区分積分する。 */
export class OwnerClock {
  constructor(rate = 1) {
    this.rate = rate; this.ageSeconds = 0; this.lastWallMs = null; this.started = false;
  }
  start(nowMs) {
    if (!Number.isFinite(nowMs)) throw new TypeError('時計には有限のmonotonic msが必要です');
    if (!this.started) { this.started = true; this.lastWallMs = nowMs; }
    return this.ageSeconds;
  }
  advance(nowMs) {
    if (!Number.isFinite(nowMs)) throw new TypeError('時計には有限のmonotonic msが必要です');
    if (!this.started) return 0;
    if (nowMs < this.lastWallMs) throw new RangeError('所有者時計は巻き戻せません');
    this.ageSeconds = Math.min(EFFECT_DURATION_SECONDS, this.ageSeconds + (nowMs - this.lastWallMs) * 0.001 * this.rate);
    this.lastWallMs = nowMs;
    return this.ageSeconds;
  }
  setMotion(motion, nowMs) {
    this.advance(nowMs); this.rate = ownerRate(motion); return this.rate;
  }
  get normalized() { return this.ageSeconds / EFFECT_DURATION_SECONDS; }
  get finished() { return this.ageSeconds >= EFFECT_DURATION_SECONDS; }
}
