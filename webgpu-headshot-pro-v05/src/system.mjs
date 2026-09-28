import {EVENT_TYPE, VARIANTS, LIMITS} from './contract.mjs';
import {CONTACT, sampleContact} from './envelope.mjs';
const ID = /^[^\u0000-\u001f\u007f]{1,128}$/u;
const isId = x => typeof x === 'string' && ID.test(x);
export function normalizeCanonicalEvent(input) {
  if (!input || typeof input !== 'object') throw new TypeError('event');
  const {type, id, playerId, targetId, x, y, radius, variant, atMs} = input;
  if (type !== EVENT_TYPE) throw new TypeError('wrong_type');
  if (![id, playerId, targetId].every(isId)) throw new TypeError('invalid_id');
  if (![x, y].every(v => Number.isFinite(v) && Math.abs(v) <= LIMITS.maxCoordinate)) throw new TypeError('invalid_coordinate');
  if (radius !== LIMITS.radius) throw new TypeError('invalid_radius');
  if (!VARIANTS.includes(variant)) throw new TypeError('invalid_variant');
  if (!Number.isFinite(atMs) || Math.abs(atMs) > Number.MAX_SAFE_INTEGER) throw new TypeError('invalid_timestamp');
  return Object.freeze({type, id, playerId, targetId, x, y, radius, variant, atMs});
}
const eventKey = e => JSON.stringify([e.type,e.id,e.playerId,e.targetId,e.x,e.y,e.radius,e.variant,e.atMs]);
function validPermission(p) {
  return p && p.targetVisible === true && p.contactVisible === true && p.targetPresent === true && isId(p.targetGeneration);
}
/**
 * 本番trust boundaryは verifyCanonical。packet内のtrusted:true等は一切参照しない。
 * verifyCanonicalはホストの認証済み配送経路により {event,roomId,epoch} を返す。
 * イベント発生をローカル抽選・action-shoot・時間近接から作らない。
 */
export class HeadshotContactSystem {
  #verify; #permission; #clock; #sound; #session; #generation = 0;
  #active = new Map(); #seen = new Map(); #pending = 0; #pendingKeys = new WeakSet();
  #closed = false; #reduced = false; #diagnostics = [];
  constructor({clock, verifyCanonical, getPermission, sound = null, roomId, epoch, reducedMotion = false}) {
    if (!clock || typeof clock.elapsedSince !== 'function') throw new TypeError('RateClockが必要です');
    if (typeof verifyCanonical !== 'function' || typeof getPermission !== 'function') throw new TypeError('権威検証・視認判定callbackが必要です');
    this.#verify = verifyCanonical; this.#permission = getPermission; this.#clock = clock; this.#sound = sound;
    this.#reduced = Boolean(reducedMotion); this.setSession(roomId, epoch);
  }
  get activeCount() { return this.#active.size; }
  get seenCount() { return this.#seen.size; }
  get session() { return {...this.#session}; }
  get diagnostics() { return this.#diagnostics.map(d => ({...d})); }
  get reducedMotion() { return this.#reduced; }
  setReducedMotion(value) { this.#reduced = Boolean(value); }
  #log(status) {
    // 隠された対象のid/位置を診断ログへ出さない。
    this.#diagnostics.push({status}); if (this.#diagnostics.length > 80) this.#diagnostics.shift();
    return {accepted: false, reason: status};
  }
  setSession(roomId, epoch) {
    if (this.#closed) throw new Error('disposed');
    if (!isId(roomId) || !Number.isSafeInteger(epoch) || epoch < 0) throw new TypeError('roomId/epoch');
    if (this.#session && epoch <= this.#session.epoch) throw new RangeError('epochは部屋再入室を含め単調増加が必要');
    for (const id of this.#active.keys()) this.#sound?.stop(id, 'session_changed');
    this.#sound?.resetSession?.(); this.#active.clear(); this.#seen.clear(); this.#generation++;
    this.#session = Object.freeze({roomId, epoch});
  }
  #permissionFor(event, phase) {
    try { return this.#permission(event, {...this.#session, phase}); } catch { return null; }
  }
  #prune(now) {
    for (const [id, s] of this.#seen) if (now > s.until) this.#seen.delete(id);
  }
  async accept(packet) {
    if (this.#closed) return this.#log('disposed');
    if (!packet || (typeof packet !== 'object' && typeof packet !== 'function')) return this.#log('invalid_packet');
    if (this.#pending >= LIMITS.maxPending) return this.#log('pending_capacity');
    if (this.#pendingKeys.has(packet)) return this.#log('duplicate_pending_packet');
    this.#pending++; this.#pendingKeys.add(packet);
    const generation = this.#generation; const session = this.#session;
    let verified;
    try { verified = await this.#verify(packet, {...session}); }
    catch { return this.#log('authority_rejected'); }
    finally { this.#pending--; this.#pendingKeys.delete(packet); }
    if (this.#closed || generation !== this.#generation) return this.#log('session_changed_during_verification');
    if (!verified || verified.roomId !== session.roomId || verified.epoch !== session.epoch) return this.#log('authority_rejected');
    let event; try { event = normalizeCanonicalEvent(verified.event); } catch(e) { return this.#log(e.message); }
    let now; try { now = this.#clock.now(); } catch { this.cancelAll('clock_rewind'); return this.#log('clock_rewind'); }
    this.#prune(now);
    const old = this.#seen.get(event.id); const fingerprint = eventKey(event);
    if (old) return this.#log(old.fingerprint === fingerprint ? 'duplicate' : 'id_payload_conflict');
    if (this.#seen.size >= LIMITS.maxSeen) return this.#log('dedupe_capacity');
    // 正規だが不可視/期限切れのidも消費し、後の再送で露出しない。
    this.#seen.set(event.id, {fingerprint, until: Math.max(now, event.atMs) + LIMITS.wallLifetimeMs + LIMITS.arrivalTTLms});
    const lateness = now - event.atMs;
    if (lateness < -LIMITS.futureToleranceMs) return this.#log('future_event');
    if (lateness > LIMITS.arrivalTTLms) return this.#log('expired_arrival');
    // 時計誤差許容内の僅かな未来は実時刻まで待つ。事前描画/事前発音しない。
    const age = event.atMs <= now ? this.#clock.elapsedSince(event.atMs, now) : 0;
    if (age === null) return this.#log('clock_history_missing');
    const profile = CONTACT; // variantは受信契約だけ。形/時間/音を分岐しない。
    if (age >= profile.durationMs) return this.#log('expired_effect');
    const p = this.#permissionFor(event, 'admission');
    if (!validPermission(p)) return this.#log('not_visible');
    if (this.#active.size >= LIMITS.maxActive) return this.#log('active_capacity');
    this.#active.set(event.id, {event, profile, targetGeneration: p.targetGeneration, audioAttempted: false, admittedAt: now});
    return {accepted: true, id: event.id};
  }
  #retire(id, reason) { this.#active.delete(id); this.#sound?.stop(id, reason); }
  /** 同一tickで権限→寿命→音→描画を確定。戻り値は凍結したイベント位置のみ。 */
  frame() {
    if (this.#closed) return [];
    let now; try { now = this.#clock.now(); } catch { this.cancelAll('clock_rewind'); this.#log('clock_rewind'); return []; }
    this.#prune(now); const frames = [];
    for (const [id, a] of this.#active) {
      const e = a.event; const p = this.#permissionFor(e, 'frame');
      if (!validPermission(p) || p.targetGeneration !== a.targetGeneration) { this.#retire(id, 'visibility_revoked_or_instance_changed'); continue; }
      if (e.atMs > now) continue;
      const age = this.#clock.elapsedSince(e.atMs, now);
      if (age === null || age >= a.profile.durationMs || now - e.atMs > LIMITS.wallLifetimeMs) { this.#retire(id, 'expired'); continue; }
      if (!a.audioAttempted) {
        // 予約をplayより前に立てる。unlock/失敗/重複/速度変更で再生を再試行しない。
        a.audioAttempted = true;
        const timely = now - e.atMs <= LIMITS.audioOnsetLimitMs && age <= LIMITS.audioOnsetLimitMs;
        if (timely && this.#clock.rate > 0) {
          try { this.#sound?.play({event: e, profile: a.profile, ageMs: age, rate: this.#clock.rate, pan: Number.isFinite(p.pan) ? Math.max(-1, Math.min(1, p.pan)) : 0}); }
          catch { this.#log('audio_failed_no_retry'); }
        }
      }
      frames.push(Object.freeze({event: e, profile: a.profile, ageMs: age, rate: this.#clock.rate,
        reducedMotion: this.#reduced, envelope: Object.freeze(sampleContact(age, this.#reduced)),
        targetGeneration: a.targetGeneration}));
    }
    this.#sound?.setRate?.(this.#clock.rate);
    return frames;
  }
  cancelAll(reason = 'cancelled') {
    for (const id of this.#active.keys()) this.#sound?.stop(id, reason);
    this.#active.clear();
    // seenは維持。キャンセル済みイベントは再送で再生しない。
  }
  dispose() { if (!this.#closed) { this.cancelAll('disposed'); this.#sound?.resetSession?.(); this.#closed = true; this.#generation++; } }
}
