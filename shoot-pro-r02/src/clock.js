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

/** ブラウザー壁時計adapter。初期化・RAF・UI全てで同じnowMsを実行時に採取する。
 * RAF引数はframeの時刻であり、callback実行時のnowとは異なる。積分には使わない。
 * 単位はここだけでms→s。GameClockの逆行検出をclampで隠さない。
 */
export class BrowserTimebase {
  constructor({nowMs=()=>performance.now(),gameTime=0,rate=1}={}) {
    this.nowMs=nowMs;this.clock=new GameClock({gameTime,rate,wallTime:this.sampleSeconds()});
    this.lastRafTimestampMs=null;this.frames=0;
  }
  sampleSeconds(){const ms=this.nowMs();if(!Number.isFinite(ms)||ms<0)throw new RangeError('performance時刻');return ms/1000;}
  now(){return this.clock.advance(this.sampleSeconds());}
  frame(rafTimestampMs){
    if(!Number.isFinite(rafTimestampMs)||rafTimestampMs<0)throw new RangeError('RAF時刻');
    this.lastRafTimestampMs=rafTimestampMs;this.frames++;return this.now();
  }
  setRate(rate){return this.clock.setRate(rate,this.sampleSeconds());}
  get time(){return this.clock.time;}
  get rate(){return this.clock.rate;}
}
