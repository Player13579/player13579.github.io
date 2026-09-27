import {normalizeShot,SourceLedger,shotFingerprint} from './contracts.js';
import {LIMITS} from './profiles.js';
/** VFX寿命とSFX開始の唯一のsource registry。rendererは状態を読むだけ。 */
export class ShotEngine {
  constructor({roomId='preview',epoch=1,now=0,maxShots=LIMITS.maxShots,maxPending=LIMITS.maxPending,
    maxLedger=LIMITS.maxLedger,onStart=()=>{},onRoomChange=()=>{}}={}) {
    if(!Number.isFinite(now)||now<0)throw new RangeError('now');
    if(typeof roomId!=='string'||!roomId||!Number.isSafeInteger(epoch)||epoch<0)throw new TypeError('room');
    if(!Number.isSafeInteger(maxShots)||maxShots<1||maxShots>64||!Number.isSafeInteger(maxPending)||maxPending<1)throw new RangeError('capacity');
    this.roomId=roomId;this.epoch=epoch;this.now=now;this.maxShots=maxShots;this.maxPending=maxPending;
    this.ledger=new SourceLedger(maxLedger);this.active=[];this.pending=[];this.onStart=onStart;this.onRoomChange=onRoomChange;
    this.stats={accepted:0,started:0,duplicate:0,rejected:0,expired:0,capacity:0,callbackErrors:0};
    this.lastError=null;
  }
  enqueue(event,context) {
    let s;try{s=normalizeShot(event,context);}catch(e){this.stats.rejected++;return {status:'rejected',reason:e.message};}
    if(s.roomId!==this.roomId||s.epoch!==this.epoch){this.stats.rejected++;return {status:'rejected',reason:'wrong_room_epoch'};}
    const result=this.ledger.claim(s.id,shotFingerprint(s));
    if(!result.ok){this.stats[result.reason==='duplicate'?'duplicate':'rejected']++;return {status:result.reason==='duplicate'?'duplicate':'rejected',reason:result.reason};}
    if(this.now-s.occurredAt>=s.life){this.stats.expired++;return {status:'expired',reason:'lifespan_elapsed'};}
    if(s.occurredAt-this.now>LIMITS.maxFutureSeconds){this.stats.rejected++;return {status:'rejected',reason:'future_clock_skew'};}
    if(this.pending.length>=this.maxPending){this.stats.capacity++;return {status:'capacity',reason:'pending_budget'};}
    this.pending.push(s);this.pending.sort((a,b)=>a.occurredAt-b.occurredAt||a.id.localeCompare(b.id));
    this.stats.accepted++;return {status:'accepted',sourceId:s.id};
  }
  tick(now) {
    if(!Number.isFinite(now)||now<this.now)throw new RangeError('ゲーム時計の逆行。seekは新しい検証epochで行う');
    this.now=now;this.active=this.active.filter(s=>now-s.occurredAt<s.life);
    while(this.pending.length&&this.pending[0].occurredAt<=now){
      const s=this.pending.shift();const age=now-s.occurredAt;
      if(age>=s.life){this.stats.expired++;continue;}
      if(this.active.length>=this.maxShots){this.stats.capacity++;continue;}
      this.active.push(s);this.stats.started++;
      try{this.onStart(s,age);}catch(error){this.stats.callbackErrors++;this.lastError=String(error);}
    }
    return this.snapshot();
  }
  snapshot(){return this.active.map(s=>({...s,age:this.now-s.occurredAt}));}
  setRoom({roomId,epoch,now=this.now}) {
    if(typeof roomId!=='string'||!roomId||!Number.isSafeInteger(epoch)||epoch<=this.epoch||!Number.isFinite(now)||now<0)
      throw new RangeError('部屋変更には単調増加epochと有限の非負時計が必要');
    this.pending=[];this.active=[];this.roomId=roomId;this.epoch=epoch;this.now=now;
    // id墓標を保持し、旧部屋の遅延再送と重複音を防止する。
    this.onRoomChange({roomId,epoch});
  }
  dispose(){this.active=[];this.pending=[];this.onRoomChange({roomId:null,epoch:this.epoch});this.onStart=()=>{};}
}
