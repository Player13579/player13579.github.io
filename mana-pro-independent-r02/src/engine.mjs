import {classifyEvent, actorEligibility, ownerRate, eventKey, seededUnit, MAX_ACTIVE_EVENTS, MAX_SESSION_IDS, defaultEnvironment} from './contract.mjs';
import {OwnerClock} from './clock.mjs';

/** 読み取り専用のgallery/integration境界。未確認フィールドを可視と推測しない。 */
export class ManaEffectEngine {
  constructor({context, resolveActor, audio = null, now = () => performance.now(), environment = defaultEnvironment(), onInvalidate = () => {}}) {
    if (typeof resolveActor !== 'function') throw new TypeError('resolveActor関数が必要です');
    this.context = {...context}; this.resolveActor=resolveActor; this.audio=audio; this.now=now;
    this.environment={...defaultEnvironment(),...environment}; this.onInvalidate=onInvalidate;
    this.active=new Map(); this.seen=new Set(); this.ownerMotions=new Map();
    this.epoch=1; this.nextToken=1; this.lastFrameId=0; this.log=[];
  }
  record(kind, key, reason = null) { this.log.push({kind,key,reason,atMs:this.now()}); if(this.log.length>2000)this.log.shift(); }
  actor(event) { try {return this.resolveActor(event.playerId);} catch {return null;} }
  admit(event) {
    const now=this.now(), invalid=classifyEvent(event,this.context,now);
    if(invalid)return {accepted:false,reason:invalid};
    const key=eventKey(event);
    if(this.seen.has(key))return {accepted:false,reason:'duplicate'};
    if(this.seen.size>=MAX_SESSION_IDS)return {accepted:false,reason:'session-ledger-full'};
    this.seen.add(key); // 可視不可や容量超過も消費済み。再受信・再表示で遅延発火しない。
    const reason=!this.environment.visible?'environment-hidden':actorEligibility(this.actor(event),event,this.context);
    if(reason){this.record('suppressed',key,reason);return {accepted:false,reason};}
    if(this.active.size>=MAX_ACTIVE_EVENTS)return {accepted:false,reason:'capacity-fail-closed'};
    if(this.nextToken>=0xFFFFFF)return {accepted:false,reason:'token-space-exhausted'};
    const actor=this.actor(event), motion=this.ownerMotions.get(event.playerId) ?? actor?.motion;
    const immutable=Object.freeze({...event});
    const state={event:immutable,key,token:this.nextToken++,epoch:this.epoch,clock:new OwnerClock(ownerRate(motion)),
      seed:seededUnit(key),status:'pending',audioDecision:'pending',lastVisibleAtMs:null};
    this.active.set(key,state);this.record('admitted',key);return {accepted:true,key,token:state.token};
  }
  cancel(key,reason='cancelled') {
    const s=this.active.get(key);if(!s)return;
    this.audio?.stop(key);s.status='cancelled';this.active.delete(key);this.record('cancelled',key,reason);
  }
  setContext(context) {
    if(context.roomId===this.context.roomId && context.sessionId===this.context.sessionId)return;
    this.onInvalidate('context-switch');this.audio?.stopAll();this.audio?.resetSession?.();this.active.clear();this.seen.clear();this.ownerMotions.clear();
    this.context={...context};this.epoch++;this.nextToken=1;this.lastFrameId=0;this.record('context-reset',null);
  }
  setEnvironment(patch) {
    this.environment={...this.environment,...patch};
    if(!this.environment.visible){this.onInvalidate('hidden');for(const k of [...this.active.keys()])this.cancel(k,'hidden');}
    if(this.environment.muted || this.environment.verify){
      this.audio?.stopAll();
      for(const s of this.active.values())if(s.audioDecision==='played')s.audioDecision='suppressed-after-start';
    }
  }
  setOwnerMotion(playerId,motion,nowMs=this.now()) {
    this.ownerMotions.set(playerId,{...motion});
    for(const s of this.active.values())if(s.event.playerId===playerId){
      s.clock.setMotion(motion,nowMs);
      if(s.audioDecision==='played')this.audio?.setRate(s.key,s.clock.rate,nowMs);
    }
  }
  /** 死亡・退場等を検出したホストは同じ状態変更処理内から呼ぶ。次のrAFを待たない。 */
  invalidatePlayer(playerId,reason='recipient-invalidated') {
    this.onInvalidate(reason);for(const s of [...this.active.values()])if(s.event.playerId===playerId)this.cancel(s.key,reason);
  }
  eligible(s,nowMs) {
    if(s.epoch!==this.epoch)return 'stale-epoch';
    if(!this.environment.visible)return 'hidden';
    if(s.event.expiresAtMs<=nowMs)return 'expired';
    return actorEligibility(this.actor(s.event),s.event,this.context);
  }
  prepareFrame(nowMs=this.now(),{reducedMotion=false}={}) {
    const items=[];
    for(const s of [...this.active.values()]){
      const reason=this.eligible(s,nowMs);if(reason){this.cancel(s.key,reason);continue;}
      s.clock.advance(nowMs);
      if(s.clock.finished){this.cancel(s.key,'completed');continue;}
      const a=this.actor(s.event);
      items.push(Object.freeze({key:s.key,token:s.token,epoch:s.epoch,playerId:s.event.playerId,
        worldX:a.worldX,worldY:a.worldY,phase:s.clock.normalized,seed:s.seed,
        rate:s.clock.rate,reducedMotion:!!reducedMotion,pending:s.status==='pending'}));
    }
    // 同一受け手の同時新規IDは一つずつ最初の可視フレームへ進める。
    // 全寿命は重ねてよい。全く同形のu=0を同時に重ねてID witnessを奪い合わない。
    const firstPending=new Set();
    const visibleItems=items.filter(i=>!i.pending);
    for(const i of items)if(i.pending&&!firstPending.has(i.playerId)){firstPending.add(i.playerId);visibleItems.push(i);}
    return Object.freeze({epoch:this.epoch,atMs:nowMs,items:Object.freeze(visibleItems)});
  }
  isFrameCurrent(frame,nowMs=this.now()) {
    return frame.epoch===this.epoch && this.environment.visible && frame.items.every(i=>{
      const s=this.active.get(i.key);return s && !this.eligible(s,nowMs) && s.token===i.token;
    });
  }
  /** RendererがGPU描画・readback・可視性を確認して返したreceiptだけを渡す。ホストの信頼境界。 */
  commitFrame(receipt,nowMs=this.now()) {
    if(!receipt || receipt.kind!=='webgpu-visible-frame' || receipt.gpuSucceeded!==true || receipt.canvasVisible!==true || receipt.epoch!==this.epoch || receipt.frameId<=this.lastFrameId)return [];
    this.lastFrameId=receipt.frameId;const started=[];
    const visible=new Set(receipt.visibleTokens);
    for(const s of [...this.active.values()]){
      const reason=this.eligible(s,nowMs);if(reason){this.cancel(s.key,reason);continue;}
      if(!visible.has(s.token))continue;
      s.lastVisibleAtMs=nowMs;
      if(s.status!=='pending')continue;
      s.status='running';s.clock.start(nowMs);started.push(s.key);this.record('visible-start',s.key);
      const allowed=!receipt.verify && !this.environment.muted && !this.environment.verify && this.audio?.running===true;
      s.audioDecision='suppressed'; // 発音不可なら後から補発音しない。
      if(allowed && this.audio.playOnce(s.key,{eventId:s.event.id,epoch:this.epoch,phaseSeconds:s.clock.ageSeconds,rate:s.clock.rate,ownerWallMs:nowMs}))s.audioDecision='played';
    }
    return started;
  }
  failGPU(reason='gpu-failure') {
    this.onInvalidate(reason);for(const k of [...this.active.keys()])this.cancel(k,reason);
  }
  dispose(){this.failGPU('disposed');this.audio?.stopAll();this.seen.clear();this.ownerMotions.clear();}
}
