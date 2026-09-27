/** 壁時計は秒。ゲーム時計は、倍率を変更した瞬間まで旧倍率を積分する。 */
export class GameClock {
  constructor({gameTime=0, wallTime=0, rate=1}={}) {
    if (![gameTime,wallTime,rate].every(Number.isFinite) || gameTime<0 || rate<0 || rate>4)
      throw new RangeError('時計の初期値が不正');
    this.time=gameTime;this.wall=wallTime;this.rate=rate;
  }
  advance(wallTime) {
    if (!Number.isFinite(wallTime)||wallTime<this.wall) throw new RangeError('壁時計の逆行');
    this.time += (wallTime-this.wall)*this.rate; this.wall=wallTime; return this.time;
  }
  setRate(rate,wallTime) {
    if (!Number.isFinite(rate)||rate<0||rate>4) throw new RangeError('rateは0〜4');
    this.advance(wallTime);this.rate=rate;return this.time;
  }
}
