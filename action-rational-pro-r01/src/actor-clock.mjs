/** プレビュー用の時計。ゲーム接続時の権威時計を代替しない。 */
export class ActorClock {
  constructor({wallNow=()=>performance.now(), actorMs=0, rate=1}={}) {
    this.wallNow=wallNow;this.anchorWall=wallNow();this.anchorActor=actorMs;this.rate=rate;
  }
  now() {return this.anchorActor+(this.wallNow()-this.anchorWall)*this.rate;}
  setRate(rate) {
    if (!Number.isFinite(rate)||rate<0||rate>4) throw new RangeError('preview rateは0..4');
    const next=this.now();this.anchorWall=this.wallNow();this.anchorActor=next;this.rate=rate;
  }
  snapshot() {return {actorMs:this.now(),rate:this.rate};}
}
/** 既に確定したactor時刻を描画直前に読む。イベント開始時刻は書き換えない。 */
export class LatestSubmissionGate {
  constructor({submit, delay=async()=>{}, onError=e=>{throw e;}}) {this.submit=submit;this.delay=delay;this.onError=onError;this.busy=false;this.pending=null;this.disposed=false;this.count=0;}
  request(readLatest) {
    if (this.disposed) return;
    this.pending=readLatest;
    if (!this.busy) return this.run();
  }
  async run() {
    this.busy=true;
    try {
      await this.delay();
      if (this.disposed) return;
      const reader=this.pending;this.pending=null;
      if (reader) {const fresh=reader();await this.submit(fresh);this.count++;}
    } catch(e) {this.onError(e);}
    finally {this.busy=false;if(this.pending&&!this.disposed) void this.run();}
  }
  dispose() {this.disposed=true;this.pending=null;}
}

/** 複数actor用。存在しないplayerの時刻を推測しない。 */
export class ActorClockBank {
  constructor(){this.clocks=new Map();}
  add(playerId,clock){if(this.clocks.has(playerId))throw new Error('clock already registered');this.clocks.set(playerId,clock);return this;}
  get(playerId){const c=this.clocks.get(playerId);if(!c)throw new Error('playerのactor時計が未登録');return c;}
  now(playerId){return this.get(playerId).now();}
  snapshot(playerId){return this.get(playerId).snapshot();}
}
