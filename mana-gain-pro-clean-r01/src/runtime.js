import { CONTRACT, ownerRate } from './contract.js';
import { EffectClock } from './clock.js';
import { EventLedger, eventRejection, visibilityRejection } from './gate.js';
/**
 * このclassにはマナ書き込みAPIがない。確定通知→局所表示/音のみ。
 * 必須host入力: resolvePlayer, resolveOwner, getView, project, now。
 * projectは現在の足元world位置をscreen pixel位置へ変換する。
 */
export class ManaGainRuntime {
  constructor({ roomId, sessionId, resolvePlayer, resolveOwner, getView, project, now, audio, onAudit=()=>{}, maxActive=CONTRACT.maxActive }) {
    for(const fn of [resolvePlayer,resolveOwner,getView,project,now]) if(typeof fn!=='function') throw new TypeError('Host callbacks required');
    if(!roomId || !sessionId) throw new TypeError('room/session required');
    this.scope={roomId,sessionId}; this.resolvePlayer=resolvePlayer; this.resolveOwner=resolveOwner;
    this.getView=getView; this.project=project; this.now=now; this.audio=audio; this.onAudit=onAudit;
    this.maxActive=maxActive; this.active=new Map(); this.ledger=new EventLedger();
    this.generation=1; this.serial=0; this.ownerOverrides=new Map();
  }
  log(id,action,reason) { this.onAudit({id,action,reason,generation:this.generation}); }
  _owner(id) { const o=this.resolveOwner(id); return o ? {...o,acc2:this.ownerOverrides.get(id) ?? o.acc2} : null; }
  _validOwner(id) { const o=this._owner(id); return o && o.roomId===this.scope.roomId && o.sessionId===this.scope.sessionId ? o : null; }
  _visibility(e,now) { return visibilityRejection(this.resolvePlayer(e.playerId),this.getView(),this.scope,now,e.expiresAt); }
  accept(event) {
    const now=this.now();
    let reason=eventRejection(event,this.scope,now);
    if(reason) { this.log(event?.id,'rejected',reason); return {accepted:false,reason}; }
    // 可視性で抑制した通知も消費。あとで同じIDが届いても再生しない。
    reason=this.ledger.claim(event);
    if(reason) { this.log(event.id,'rejected',reason); return {accepted:false,reason}; }
    reason=this._visibility(event,now);
    if(!reason && !this._validOwner(event.ownerPlayerId)) reason='owner-scope-or-missing';
    if(!reason && this.active.size>=this.maxActive) reason='active-capacity';
    if(reason) { this.log(event.id,'suppressed',reason); return {accepted:false,reason}; }
    const e=Object.freeze({...event});
    const key=JSON.stringify([e.roomId,e.sessionId,e.id,e.playerId]);
    const token=`${this.generation}:${++this.serial}`;
    this.active.set(e.id,{event:e,key,token,generation:this.generation,clock:null,soundDecision:false,firstVisible:false});
    this.log(e.id,'accepted','confirmed-positive-delta'); return {accepted:true,token};
  }
  /** HostのACC2実効状態変更時に呼ぶ。atはnow()と同じ単調時計。 */
  setOwnerAcc2(ownerPlayerId,acc2,at=this.now()) {
    if(!Number.isFinite(at)) throw new TypeError('timestamp');
    const copy={state:acc2?.state,movementEffective:acc2?.movementEffective===true};
    this.ownerOverrides.set(ownerPlayerId,copy);
    for(const inst of this.active.values()) if(inst.event.ownerPlayerId===ownerPlayerId && inst.clock) {
      const rate=ownerRate(copy); inst.clock.setRate(rate,at); this.audio?.setRate(inst.key,rate);
    }
  }
  cancel(id,reason) {
    const inst=this.active.get(id); if(!inst) return;
    this.audio?.stop(inst.key,reason); this.active.delete(id); this.log(id,'cancelled',reason);
  }
  /** hidden/death/ventのイベントハンドラからも同期的に呼べる。 */
  invalidate() {
    const now=this.now();
    for(const [id,inst] of this.active) { const reason=this._visibility(inst.event,now); if(reason) this.cancel(id,reason); }
    if(this.getView().visible!==true) this.audio?.stopAll('hidden');
  }
  snapshot() {
    const now=this.now(), view=this.getView(), result=[];
    for(const [id,inst] of this.active) {
      let reason=this._visibility(inst.event,now);
      const owner=this._validOwner(inst.event.ownerPlayerId);
      if(!owner) reason='owner-scope-or-missing';
      if(reason) { this.cancel(id,reason); continue; }
      const rate=ownerRate(owner.acc2);
      if(!inst.clock) inst.clock=new EffectClock(now,rate);
      if(inst.clock.rate!==rate) { inst.clock.setRate(rate,now); this.audio?.setRate(inst.key,rate); }
      const seconds=inst.clock.at(now);
      if(seconds>=CONTRACT.duration) { this.cancel(id,'completed'); continue; }
      const player=this.resolvePlayer(inst.event.playerId);
      const p=this.project(player.world,player);
      if(!p || ![p.x,p.y,p.scale].every(Number.isFinite) || p.scale<=0 || p.visible!==true) {this.cancel(id,'projection-hidden');continue;}
      if(view.muted || view.verify) this.audio?.stop(inst.key,view.verify?'verify':'muted');
      result.push({id,token:inst.token,x:p.x,y:p.y,scale:p.scale,seconds,reducedMotion:view.reducedMotion===true,gain:1,
        recipient:player.manaReceiveRegion ?? CONTRACT.recipient,needsEvidence:!inst.firstVisible});
    }
    return result;
  }
  /** 非同期GPU処理へ渡す直前/直後の失効検査。古いsnapshotを権限にしない。 */
  frameAllowed(effect) {
    const inst=this.active.get(effect.id), now=this.now();
    return Boolean(inst && inst.token===effect.token && inst.generation===this.generation &&
      !this._visibility(inst.event,now) && this._validOwner(inst.event.ownerPlayerId) &&
      (!inst.clock || !inst.clock.done(now)));
  }
  /** only from renderer validation + queue + positive occlusion result. */
  acknowledgeFrame(result) {
    if(result.status==='failed') { for(const id of [...this.active.keys()]) this.cancel(id,'gpu-failed'); return; }
    if(result.status!=='submitted') return;
    const now=this.now(),view=this.getView();
    for(const proof of result.proofs ?? []) {
      const inst=this.active.get(proof.id);
      if(!inst || inst.token!==proof.token || inst.generation!==this.generation || proof.samples<=0 || !inst.clock) continue;
      const reason=this._visibility(inst.event,now);
      if(reason || !this._validOwner(inst.event.ownerPlayerId)) {this.cancel(proof.id,reason ?? 'owner-scope');continue;}
      const projected=this.project(this.resolvePlayer(inst.event.playerId).world,this.resolvePlayer(inst.event.playerId));
      if(projected?.visible!==true) {this.cancel(proof.id,'projection-hidden-after-submit');continue;}
      if(inst.clock.done(now)) {this.cancel(proof.id,'completed-before-proof');continue;}
      inst.firstVisible=true;
      if(inst.soundDecision) continue;
      inst.soundDecision=true;
      this.log(proof.id,'visible-frame',`samples=${proof.samples}`);
      if(view.muted || view.verify) { this.log(proof.id,'sound-suppressed',view.verify?'verify':'muted'); continue; }
      this.audio?.playOnce(inst.key,{id:inst.event.id,seconds:inst.clock.at(now),rate:inst.clock.rate,visible:view.visible===true,verify:view.verify===true,generation:this.generation});
    }
  }
  resetScope(roomId,sessionId) {
    if(!roomId || !sessionId) throw new TypeError('room/session required');
    for(const id of [...this.active.keys()]) this.cancel(id,'scope-change');
    this.generation++; this.scope={roomId,sessionId}; this.ledger.clear(); this.ownerOverrides.clear(); this.audio?.resetScope();
  }
  dispose() { for(const id of [...this.active.keys()]) this.cancel(id,'dispose'); this.generation++; this.audio?.stopAll('dispose'); }
}
