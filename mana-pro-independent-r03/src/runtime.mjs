import {DURATION,LIMITS,eventKey,validateGain,recipientState,activeRate,isId} from './contract.mjs';
import {OwnerClock} from './owner-clock.mjs';
/** 表示専用。resolveRecipientはコピー/読み取り専用スナップショットを返す。 */
export class ManaRuntime{
  constructor({context,resolveRecipient,now=()=>performance.now(),audio=null,onInvalidate=()=>{}}){
    if(!context||![context.roomId,context.sessionId].every(isId)||typeof resolveRecipient!=='function')throw new TypeError('ルーム・セッション・受け手resolverが必要');
    this.context={...context};this.resolveRecipient=resolveRecipient;this.now=now;this.audio=audio;this.onInvalidate=onInvalidate;
    this.environment={visible:true,muted:true,verify:false};this.epoch=1;this.serial=0;this.lastCommit=0;this.nextToken=1;
    this.active=new Map();this.seen=new Set();this.motions=new Map();this.audit=[];
  }
  record(kind,key,reason=null){this.audit.push({kind,key,reason,at:this.now()});if(this.audit.length>2000)this.audit.shift();}
  recipient(e){try{return this.resolveRecipient(e.playerId);}catch{return null;}}
  eligible(s,now){
    if(s.epoch!==this.epoch)return 'stale-epoch';
    if(!this.environment.visible)return 'hidden';
    if(now>=s.event.expiresAtMs)return 'expired';
    return recipientState(this.recipient(s.event),s.event,this.context);
  }
  admit(event){
    const now=this.now(),error=validateGain(event,this.context,now);
    if(error)return {accepted:false,reason:error};
    const key=eventKey(event);
    if(this.seen.has(key))return {accepted:false,reason:'duplicate'};
    if(this.seen.size>=LIMITS.sessionIds)return {accepted:false,reason:'session-ledger-full'};
    this.seen.add(key); // 抑制/容量超過も消費。再受信や可視化で遅延発火しない。
    const actor=this.recipient(event);
    const denied=!this.environment.visible?'hidden':recipientState(actor,event,this.context);
    if(denied){this.record('suppressed',key,denied);return {accepted:false,reason:denied};}
    if(this.active.size>=LIMITS.active)return {accepted:false,reason:'capacity-fail-closed'};
    if(this.nextToken>=0xffffffff)return {accepted:false,reason:'token-space-exhausted'};
    const clock=new OwnerClock(this.motions.get(event.playerId)??actor.motion);
    const s={event:Object.freeze({...event}),key,epoch:this.epoch,token:this.nextToken++,clock,audioDecision:'pending',status:'pending'};
    this.active.set(key,s);this.record('admitted',key);return {accepted:true,key,token:s.token};
  }
  cancel(key,reason='cancelled'){
    const s=this.active.get(key);if(!s)return;
    this.audio?.stop(key);this.active.delete(key);s.status='cancelled';this.record('cancelled',key,reason);
  }
  setEnvironment(patch){
    this.environment={...this.environment,...patch};
    if(!this.environment.visible){this.onInvalidate('hidden');for(const k of [...this.active.keys()])this.cancel(k,'hidden');}
    if(this.environment.muted||this.environment.verify){this.audio?.stopAll();for(const s of this.active.values())if(s.audioDecision==='played')s.audioDecision='suppressed-after-start';}
  }
  setOwnerMotion(playerId,motion,at=this.now()){
    if(!isId(playerId))throw new TypeError('playerIdが必要');
    this.motions.set(playerId,{...motion});
    for(const s of this.active.values())if(s.event.playerId===playerId){
      s.clock.motion(motion,at);
      if(s.audioDecision==='played')this.audio?.setRate(s.key,s.clock.rate,at);
    }
  }
  invalidatePlayer(playerId,reason='recipient-invalidated'){
    this.onInvalidate(reason);for(const s of [...this.active.values()])if(s.event.playerId===playerId)this.cancel(s.key,reason);
  }
  setContext(context){
    if(![context?.roomId,context?.sessionId].every(isId))throw new TypeError('有効なcontextが必要');
    if(context.roomId===this.context.roomId&&context.sessionId===this.context.sessionId)return;
    this.onInvalidate('context-switch');this.audio?.resetSession();this.active.clear();this.seen.clear();this.motions.clear();
    this.context={...context};this.epoch++;this.nextToken=1;this.lastCommit=0;this.record('context-reset',null);
  }
  prepare(at=this.now(),{reducedMotion=false}={}){
    const running=[],pending=[],owners=new Set();
    for(const s of [...this.active.values()]){
      const denied=this.eligible(s,at);if(denied){this.cancel(s.key,denied);continue;}
      s.clock.advance(at);if(s.clock.done){this.cancel(s.key,'completed');continue;}
      const a=this.recipient(s.event);
      const item=Object.freeze({key:s.key,playerId:s.event.playerId,token:s.token,worldX:a.worldX,worldY:a.worldY,
        opacity:Math.min(1,a.opacity),phase:s.clock.phase,rate:s.clock.rate,reducedMotion:!!reducedMotion,pending:s.status==='pending'});
      if(item.pending){if(!owners.has(item.playerId)){owners.add(item.playerId);pending.push(item);}}
      else running.push(item);
    }
    // 同じ受け手の初回描画を逐次化。未確認のIDを同形の重なりだけで一括発音しない。
    return Object.freeze({epoch:this.epoch,serial:++this.serial,at,items:Object.freeze([...running,...pending])});
  }
  current(frame,at=this.now()){
    return frame?.epoch===this.epoch&&this.environment.visible&&frame.items.every(i=>{
      const s=this.active.get(i.key);
      const withinLifetime=s&&(!s.clock.started||s.clock.age+Math.max(0,at-s.clock.wall)*.001*s.clock.rate<DURATION);
      return s&&withinLifetime&&s.token===i.token&&!this.eligible(s,at);
    });
  }
  /** renderer由来receiptだけを渡す信頼境界。GPU完了だけでなく色差witnessを必須にする。 */
  commit(receipt,at=this.now()){
    if(!receipt||receipt.kind!=='webgpu-visible-frame'||receipt.gpuSucceeded!==true||receipt.canvasVisible!==true||!receipt.frame||!this.current(receipt.frame,at)||receipt.frame.serial<=this.lastCommit)return [];
    this.lastCommit=receipt.frame.serial;
    const witnesses=new Set(receipt.visibleTokens),submitted=new Set(receipt.frame.items.map(i=>i.token)),started=[];
    for(const s of [...this.active.values()]){
      if(this.eligible(s,at)){this.cancel(s.key,'invalid-at-commit');continue;}
      if(s.status!=='pending'||!submitted.has(s.token)||!witnesses.has(s.token))continue;
      s.status='running';s.clock.start(at);s.audioDecision='suppressed';started.push(s.key);this.record('visible-start',s.key);
      const allow=!receipt.verify&&!this.environment.verify&&!this.environment.muted&&this.audio?.running===true;
      if(allow&&this.audio.playOnce(s.key,{eventId:s.event.id,epoch:s.epoch,age:s.clock.age,rate:s.clock.rate,ownerWallMs:at}))s.audioDecision='played';
    }
    return started;
  }
  failGPU(reason='gpu-failed'){this.onInvalidate(reason);for(const k of [...this.active.keys()])this.cancel(k,reason);}
  dispose(){this.failGPU('disposed');this.audio?.stopAll();this.active.clear();this.seen.clear();this.motions.clear();}
}
