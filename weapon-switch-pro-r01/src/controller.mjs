import {parseReceipt, ReceiptLedger, FIELD_LIFETIME_MS, BODY_BASE_MS, VARIANTS} from './contract.mjs';
import {sampleDynamics, DESIGN, sourceLocal} from './design-parameters.mjs';
import {planAudio} from './audio.mjs';

const noOp = () => {};
/** host公開状態を読むだけ。座標・向き・武器造形をactorからコピーしない。 */
export function visibilityAllowed(state, playerId, roomKey, scopeGeneration) {
  return !!state && state.playerId === playerId && state.roomKey === roomKey && state.scopeGeneration === scopeGeneration && state.visible === true &&
    state.actorOnscreen === true && state.vent === false && state.ejected === false;
}
export function projectReceipt(receipt, viewport) {
  const {width,height,scale,originX,originY} = viewport ?? {};
  if (![width,height,scale,originX,originY].every(Number.isFinite) || width <= 0 || height <= 0 || scale <= 0) throw new RangeError('invalid_viewport');
  // server(world x右/y下) -> B world(X=x,Y=-y) -> orthographic screen(x右/y下)。
  return {x: (receipt.x-originX)*scale, y: (receipt.y-originY)*scale};
}
function inside(p,v) { return p.x >= 0 && p.y >= 0 && p.x < v.width && p.y < v.height; }

export class SwitchEController {
  #active = new Map(); #bodyOwners = new Map(); #latest = new Map(); #scope = null; #generation = 0; #disposed = false;
  #lastNow = -Infinity; #pageVisible = true; #reduced = false;
  constructor({clock = () => performance.now(), ledger = new ReceiptLedger(), audio = null,
    readVisibility, readSelection = () => undefined, onSelection = noOp, onBodySwitch = noOp,
    onCancelBody = noOp, onPrivacyClear = noOp, onDiagnostic = noOp, maxActive = 512} = {}) {
    if (typeof readVisibility !== 'function') throw new TypeError('readVisibility_required');
    if (!Number.isSafeInteger(maxActive) || maxActive < 1 || maxActive > 4096) throw new RangeError('invalid_capacity');
    Object.assign(this,{clock,ledger,audio,readVisibility,readSelection,onSelection,onBodySwitch,onCancelBody,onPrivacyClear,onDiagnostic,maxActive});
  }
  #now() {
    const v = this.clock(); if (!Number.isFinite(v) || v < this.#lastNow) throw new RangeError('clock_must_be_monotonic');
    this.#lastNow = v; return v;
  }
  #safe(fn, value) { try { return fn(value); } catch { try { this.onDiagnostic({code:'host_callback_error'}); } catch {} return undefined; } }
  /** 古い room の遅延packetを排除する、値で複製できないsession token。 */
  enterRoom(roomKey) {
    if (this.#disposed) throw new Error('controller_disposed');
    if (typeof roomKey !== 'string' || !roomKey) throw new TypeError('room_key_required');
    this.clear('room_change'); this.#latest.clear();
    this.#scope = Object.freeze({roomKey,generation:++this.#generation});
    return this.#scope;
  }
  #visible(receipt) {
    if (!this.#pageVisible || !this.#scope) return false;
    let s; try { s = this.readVisibility(receipt.playerId); } catch { return false; }
    return visibilityAllowed(s,receipt.playerId,this.#scope.roomKey,this.#scope.generation);
  }
  /** gameplayの即時選択とBODY通知はGPU処理の前。音は同一IDで一度だけrouteする。 */
  receive(raw, {scope, viewport, isLocal = false, isPhilia = false} = {}) {
    if (this.#disposed) return {accepted:false,reason:'disposed'};
    if (!scope || scope !== this.#scope) return {accepted:false,reason:'stale_room_scope'};
    let receipt; try { receipt = parseReceipt(raw); } catch (error) { return {accepted:false,reason:error.code ?? 'invalid_receipt'}; }
    let p = null; try { p = projectReceipt(receipt,viewport); } catch { /* 選択更新は観測条件に依存させない。 */ }
    const claimed = this.ledger.claim(receipt.id);
    if (claimed !== 'claimed') return {accepted:false,reason:claimed};
    const now = this.#now();
    const previous = this.#latest.get(receipt.playerId);
    // at は選択の逆行防止だけ。fieldの経過時間に使わない。同atは受信順。
    const current = !previous || receipt.at >= previous.at;
    const hostVariant = this.#safe(this.readSelection,receipt.playerId);
    const oldVariant = VARIANTS.includes(hostVariant) ? hostVariant : previous?.variant;
    const changed = current && VARIANTS.includes(oldVariant) && oldVariant !== receipt.variant;
    if (current) {
      this.#latest.set(receipt.playerId,{variant:receipt.variant,at:receipt.at});
      this.#safe(this.onSelection,{id:receipt.id,playerId:receipt.playerId,variant:receipt.variant,changed,at:receipt.at});
    }
    const visible = this.#visible(receipt) && p !== null && inside(p,viewport);
    const route = planAudio({isLocal,changed,isPhilia,variant:receipt.variant,current});
    // Host BODY は owner tokenを受け、既存の560msモーションを速度倍率で進める。
    // 秘匿actorにはBODY開始通知も渡さない。古いatは選択モーションを巻き戻さない。
    if (visible && current && this.onBodySwitch !== noOp) {
      this.#bodyOwners.set(receipt.id,receipt.playerId);
      this.#safe(this.onBodySwitch,{
      id:receipt.id,playerId:receipt.playerId,variant:receipt.variant,baseDurationMs:BODY_BASE_MS,
      clockPolicy:'integrate_host_motion_multiplier',fieldLifetimeMs:FIELD_LIFETIME_MS,
      soundOwner:'switch-E',suppressBodySwitchSfx:true,startedAt:now});
    }
    if (!visible) {
      this.audio?.playOnce(receipt.id,receipt.variant,false);
      return {accepted:true,visual:false,reason:'privacy_or_offscreen',changed,route};
    }
    if (this.#active.size >= this.maxActive) {
      const oldest = this.#active.keys().next().value; this.#remove(oldest,'capacity');
      this.#safe(this.onDiagnostic,{code:'visual_capacity_drop_oldest'});
    }
    this.#active.set(receipt.id,{receipt,receivedAt:now,scope,sequence:this.ledger.size});
    const sound = this.audio?.playOnce(receipt.id,receipt.variant,route.play) ?? {played:false,reason:'audio_not_bound'};
    return {accepted:true,visual:true,changed,route,sound};
  }
  /** 呼ぶたびに現状態を検査。不可視になったIDは削除し再可視化しても復活しない。 */
  frame(viewport) {
    const now = this.#now(), frames = [];
    try { projectReceipt({x:0,y:0},viewport); } catch { this.clear('invalid_viewport'); return []; }
    for (const [id,playerId] of this.#bodyOwners) {
      if (!this.#visible({playerId})) { this.#safe(this.onCancelBody,{id,playerId,reason:'privacy'}); this.#bodyOwners.delete(id); }
    }
    for (const [id,e] of this.#active) {
      const ageMs = now-e.receivedAt;
      if (e.scope !== this.#scope || !this.#visible(e.receipt)) { this.#remove(id,'privacy'); continue; }
      if (ageMs >= FIELD_LIFETIME_MS) { this.#remove(id,'expired'); continue; }
      const p = projectReceipt(e.receipt,viewport);
      if (!inside(p,viewport)) { this.#remove(id,'offscreen'); continue; }
      const dynamics = sampleDynamics(e.receipt.variant,ageMs,this.#reduced);
      frames.push(Object.freeze({id,playerId:e.receipt.playerId,variant:e.receipt.variant,
        variantIndex:DESIGN[e.receipt.variant].index,worldX:e.receipt.x,worldY:e.receipt.y,
        x:p.x,y:p.y,radius:e.receipt.radius,scale:viewport.scale,ageMs,...dynamics,
        sourceLocal:sourceLocal(e.receipt.variant),reducedMotion:this.#reduced}));
    }
    return frames;
  }
  #remove(id,reason) {
    const e = this.#active.get(id); if (!e) return;
    this.#active.delete(id); this.audio?.cancel(id);
    if (reason !== 'expired' && this.#bodyOwners.has(id)) {
      this.#safe(this.onCancelBody,{id,playerId:e.receipt.playerId,reason}); this.#bodyOwners.delete(id);
    }
  }
  cancelActor(playerId,reason = 'actor_hidden') {
    for (const [id,e] of this.#active) if (e.receipt.playerId === playerId) this.#remove(id,reason);
    for (const [id,owner] of this.#bodyOwners) if (owner === playerId) {
      this.#safe(this.onCancelBody,{id,playerId,reason}); this.#bodyOwners.delete(id);
    }
    this.#safe(this.onPrivacyClear,{reason});
  }
  releaseBody(id) { this.#bodyOwners.delete(id); }
  clear(reason = 'clear') {
    for (const id of [...this.#active.keys()]) this.#remove(id,reason);
    for (const [id,playerId] of this.#bodyOwners) this.#safe(this.onCancelBody,{id,playerId,reason});
    this.#bodyOwners.clear(); this.audio?.cancelAll(); this.#safe(this.onPrivacyClear,{reason});
  }
  setPageVisible(visible) {
    this.#pageVisible = visible === true;
    if (!this.#pageVisible) this.clear('page_hidden');
  }
  setReducedMotion(value) { this.#reduced = value === true; }
  get activeCount() { return this.#active.size; }
  get bodyOwnerCount() { return this.#bodyOwners.size; }
  get scope() { return this.#scope; }
  dispose() { this.clear('dispose'); this.#scope = null; this.#latest.clear(); this.#disposed = true; }
}
