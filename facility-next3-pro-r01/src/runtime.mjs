import {LIFE_MS,MAX_EVENTS,MAX_CAUSES,byId,validateMagic,validateSound,validScope,causeKey,intersectsView,stableSeed} from './contract.mjs';

/** 認証はホストの仕事。本クラスは所有権照合と排他であり署名検証器ではない。 */
export class FacilityRuntime {
  constructor({scope,clock=()=>performance.now(),audio=null,onDiagnostic=()=>{},maxEvents=MAX_EVENTS,maxCauses=MAX_CAUSES}={}) {
    if(!validScope(scope))throw new TypeError('roomId / matchId / epochが必要です');
    if(!Number.isSafeInteger(maxEvents)||maxEvents<1||maxEvents>MAX_EVENTS||!Number.isSafeInteger(maxCauses)||maxCauses<1||maxCauses>MAX_CAUSES)throw new TypeError('invalid capacity');
    this.scope={...scope};this.clock=clock;this.audio=audio;this.onDiagnostic=onDiagnostic;this.maxEvents=maxEvents;this.maxCauses=maxCauses;
    this.causes=new Map();this.active=new Map();this.disposed=false;
    this.stats={accepted:0,rejected:0,duplicates:0,soundClaimed:0,visualCapacityDrops:0,expired:0,offscreen:0,audioErrors:0};
  }
  _scopeCheck(envelope,now){
    if(this.disposed)return 'disposed';
    if(!envelope||envelope.roomId!==this.scope.roomId||envelope.matchId!==this.scope.matchId||envelope.epoch!==this.scope.epoch)return 'ownership_mismatch';
    if(!Number.isFinite(now)||!Number.isFinite(envelope.receivedAt))return 'invalid_time';
    if(envelope.receivedAt>now)return 'future_receipt';
    if(now-envelope.receivedAt>=LIFE_MS)return 'stale_receipt';
    return null;
  }
  _reject(reason,handled=true){this.stats.rejected++;return {handled,accepted:false,reason};}
  _bind(r,envelope,playerId){
    const key=causeKey(envelope,r.objectCausalId), prior=this.causes.get(key);
    if(prior&&(prior.objectId!==r.objectId||prior.playerId!==playerId))return {error:'causal_identity_collision'};
    if(!prior&&this.causes.size>=this.maxCauses)return {error:'causal_ledger_full'};
    const record=prior||{objectId:r.objectId,playerId,magic:false,sound:false};
    this.causes.set(key,record);return {key,record};
  }
  receiveMagic(receipt,envelope){
    if(!byId(receipt?.objectId))return {handled:false,accepted:false,reason:'unmanaged_object'};
    const now=this.clock(),error=this._scopeCheck(envelope,now);if(error)return this._reject(error);
    const check=validateMagic(receipt);if(!check.ok)return this._reject(check.reason);
    const bound=this._bind(receipt,envelope,receipt.playerId);if(bound.error)return this._reject(bound.error);
    if(bound.record.magic){this.stats.duplicates++;return {handled:true,accepted:false,reason:'duplicate_cause'};}
    bound.record.magic=true;this.prune(now);
    const event=Object.freeze({key:bound.key,objectCausalId:receipt.objectCausalId,objectId:receipt.objectId,playerId:receipt.playerId,
      roomId:envelope.roomId,matchId:envelope.matchId,epoch:envelope.epoch,x:receipt.x,y:receipt.y,
      radius:check.radius,kind:check.facility.index,startMs:envelope.receivedAt,endMs:envelope.receivedAt+LIFE_MS,seed:stableSeed(receipt.objectCausalId)});
    let visual=true;if(this.active.size<this.maxEvents)this.active.set(bound.key,event);else {visual=false;this.stats.visualCapacityDrops++;}
    // 排他は描画・画面内判定より先。未解錠/無音/距離外を後から再発音しない。
    try {this.audio?.trigger(event,{maxDistance:720,volume:0.7,ownerId:receipt.playerId});}
    catch(error){this.stats.audioErrors++;try{this.onDiagnostic({type:'audio_event_error',message:String(error),objectCausalId:receipt.objectCausalId});}catch{}}
    this.stats.accepted++;return {handled:true,accepted:true,visual,event};
  }
  /** legacyのgeneric mixerより必ず先に呼ぶ。managed receiptは失敗時もclaimして漏出を防ぐ。 */
  receiveGenericSound(receipt,envelope){
    if(!byId(receipt?.objectId))return {handled:false,accepted:false,reason:'unmanaged_object'};
    const error=this._scopeCheck(envelope,this.clock());if(error)return this._reject(error);
    const check=validateSound(receipt);if(!check.ok)return this._reject(check.reason);
    const bound=this._bind(receipt,envelope,receipt.ownerId);if(bound.error)return this._reject(bound.error);
    bound.record.sound=true;this.stats.soundClaimed++;
    return {handled:true,accepted:true,reason:'generic_suppressed_unique_sound_owned_by_magic'};
  }
  prune(now=this.clock()){
    for(const [key,e] of this.active)if(now>=e.endMs||now<e.startMs){this.active.delete(key);this.stats.expired++;}
  }
  snapshot(now=this.clock()){
    if(this.disposed)return [];this.prune(now);
    return [...this.active.values()].map(e=>({...e,ageMs:Math.max(0,now-e.startMs)}));
  }
  visible(view,now=this.clock()){
    const all=this.snapshot(now),visible=all.filter(e=>intersectsView(e,view));this.stats.offscreen=all.length-visible.length;return visible;
  }
  changeScope(scope){
    if(this.disposed||!validScope(scope))throw new TypeError('invalid scope / disposed');
    if(scope.epoch<=this.scope.epoch)throw new RangeError('epochは接続世代ごとに単調増加');
    this.scope={...scope};this.active.clear();this.audio?.stopAll();
    // 墓標を残す。以前のroom/matchに再入室しても過去causeを再生しない。
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.active.clear();this.causes.clear();this.audio?.stopAll();}
}
