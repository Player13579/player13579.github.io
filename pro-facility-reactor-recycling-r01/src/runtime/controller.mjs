import {VISUAL_LIFETIME_MS,validateReceipt,checkedClock,checkedAnchor,causeKey,fingerprint,identifier,requiredFunction} from './contracts.mjs';
/** 認証→正規化→照合→永続予約→唯一の表示/音経路。polling/renderからはreceiveを呼ばない。 */
export class FacilityController {
  constructor({serverEpoch,authenticateAndNormalize,ledger,clock,isPlayerKnown,getActorAnchor,
    audio,dispatchGeneric=()=>{},onDiagnostic=()=>{},allowMemoryLedger=false}) {
    if(!identifier(serverEpoch)) throw new TypeError('serverEpochは認証済み接続の識別子が必要');
    if(ledger?.kind==='memory_preview_only'&&!allowMemoryLedger) throw new TypeError('本番では永続台帳が必要');
    requiredFunction(ledger?.claim,'ledger.claim');
    for(const [name,fn] of Object.entries({authenticateAndNormalize,isPlayerKnown,getActorAnchor,dispatchGeneric,onDiagnostic})) requiredFunction(fn,name);
    for(const k of ['monotonicMs','serverNowMs','uncertaintyMs']) requiredFunction(clock?.[k],`clock.${k}`);
    this.epoch=serverEpoch; this.verify=authenticateAndNormalize;this.ledger=ledger;this.clock=clock;
    this.known=isPlayerKnown;this.anchor=getActorAnchor;this.audio=audio;this.generic=dispatchGeneric;
    this.diagnostic=onDiagnostic;this.active=new Map();this.disposed=false;this.lastFrameTime=-Infinity;
    this.stats={claimed:0,duplicates:0,conflicts:0,rejected:0,expired:0,visualStarted:0,genericDispatched:0};
  }
  report(code,extra={}){try{this.diagnostic({code,...extra});}catch{/* 診断先の例外で可視フレームを止めない */}}
  async receive(raw){
    if(this.disposed) return {status:'disposed',suppressGeneric:true};
    let normalized;
    // trueフラグを自己申告するwireデータは信頼しない。認証済みtransportの所有者だけがこの関数を実装する。
    try{normalized=await this.verify(raw);}catch{this.stats.rejected++;return {status:'authentication_failed',suppressGeneric:true};}
    if(!normalized){this.stats.rejected++;return {status:'authentication_failed',suppressGeneric:true};}
    if(this.disposed) return {status:'disposed',suppressGeneric:true};
    const c=checkedClock(this.clock);
    if(!c.ok){this.report(c.reason);return {status:c.reason,suppressGeneric:true};}
    let v;
    try{v=validateReceipt(normalized,c.serverNowMs,{maxFutureMs:50,isPlayerKnown:this.known});}
    catch{v={ok:false,reason:'identity_lookup_failed'};}
    if(!v.ok){this.stats.rejected++;this.report(v.reason);return {status:v.reason,suppressGeneric:true};}
    const {receipt:r,target}=v;const key=causeKey(this.epoch,r.objectCausalId);
    let ownership;
    try{ownership=await this.ledger.claim(key,fingerprint(r),{capturedTime:r.capturedTime,route:target?.key??'generic'});}
    catch{this.report('ledger_failed');return {status:'ledger_failed',suppressGeneric:true};}
    if(ownership!=='claimed'){
      const conflict=ownership==='conflict';this.stats[conflict?'conflicts':'duplicates']++;
      return {status:conflict?'causal_conflict':'duplicate',suppressGeneric:true};
    }
    this.stats.claimed++;
    if(this.disposed) return {status:'disposed_after_claim',suppressGeneric:true};
    // 時計offsetの後日更新で生きているEの位相を巻き戻さない。
    const startMono=c.monotonicMs+(r.capturedTime-c.serverNowMs);
    const now=this.clock.monotonicMs();const ageMs=Math.max(now,this.lastFrameTime)-startMono;
    if(!Number.isFinite(ageMs)){this.report('clock_failed_after_claim');return {status:'clock_failed_after_claim',suppressGeneric:true};}
    if(ageMs>=VISUAL_LIFETIME_MS){this.stats.expired++;return {status:'expired_consumed',suppressGeneric:true};}
    if(!target){
      // 唯一のgeneric経路。すでに発音した旧経路を後から「置換した」とは呼ばない。
      try{this.generic({receipt:r,causeKey:key,ageMs});this.stats.genericDispatched++;}
      catch{this.report('generic_dispatch_failed');}
      return {status:'generic_once',suppressGeneric:true};
    }
    const event=Object.freeze({key,targetKey:target.key,receipt:r,startMono,origin:r.worldOrigin,lifetimeMs:VISUAL_LIFETIME_MS});
    this.active.set(key,event);this.stats.visualStarted++;
    // 音が停止・失敗していても、可視Eは止めない。音は遅延再生キューへ入れない。
    try{this.audio?.playOnce({causeKey:key,targetKey:target.key,ageMs});}catch{this.report('audio_failed');}
    return {status:'dedicated_once',suppressGeneric:true,causeKey:key,ageMs};
  }
  sampleFrame(){
    let now=this.clock.monotonicMs();
    if(!Number.isFinite(now)){this.report('invalid_frame_clock');return [];}
    now=Math.max(now,this.lastFrameTime);this.lastFrameTime=now;
    const out=[];
    for(const [key,e] of this.active){
      const ageMs=now-e.startMono;
      if(ageMs>=e.lifetimeMs){this.active.delete(key);continue;}
      if(ageMs<0) continue;
      let a=null;
      try{a=checkedAnchor(this.anchor(e.receipt.playerId,now),e.receipt.playerId,now);}catch{this.report('anchor_failed');}
      out.push({causeKey:key,targetKey:e.targetKey,origin:e.origin,receiver:a?.world??null,
        heightWorld:a?.heightWorld??null,ageMs,playerId:e.receipt.playerId});
    }
    return out;
  }
  dispose(){this.disposed=true;this.active.clear();this.audio?.stopAll?.();}
}
/** 既存のgeneric利用音もこの成功イベント経路へ集約する。ゲーム本体を自動編集しない。 */
export function installFacilityPresentation(host,controller){
  requiredFunction(host?.replaceFacilityPresentation,'host.replaceFacilityPresentation');
  // hostは表示用subscriberだけを原子的に交換する。サーバー利益適用handlerは変更しない。
  const remove=host.replaceFacilityPresentation(raw=>{void controller.receive(raw).catch(()=>controller.report('unhandled_ingress_failure'));});
  if(typeof remove!=='function')throw new TypeError('原子的交換の解除関数が必要');
  let closed=false;return ()=>{if(!closed){closed=true;remove();controller.dispose();}};
}
