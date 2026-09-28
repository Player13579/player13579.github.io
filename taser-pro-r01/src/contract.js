/**
 * action-taser / v0.9.0-preview
 * 固定契約の境界。既存E・action-shootを参照しない。
 * type/id はこの単独SDKの明示的なアダプター名であり、ゲームのwire schemaを推定しない。
 */
export const VERSION = '0.9.0-preview';
export const QUALITY = 'PLAYABLE_PREVIEW_HARDWARE_ACCEPTANCE_PENDING';
export const LIFE_MS = 1200;
export const RADIUS = 95;
export const MAX_EVENTS = 32;
export const MAX_SESSION_IDS = 65536;
export const SOUND_MS = 420;

export function validId(v) {
  return (typeof v === 'string' && v.length > 0 && v.length <= 160) ||
    (typeof v === 'number' && Number.isSafeInteger(v));
}

/** 既に成功通知であるイベントだけを受理。命中から成功を推測しない。 */
export function normalizeSuccessEvent(raw) {
  if (!raw || raw.type !== 'action-taser' || !validId(raw.id) ||
      !validId(raw.targetId) || !validId(raw.playerId)) return null;
  if (![raw.x, raw.y].every(Number.isSafeInteger) || raw.radius !== RADIUS ||
      raw.variant !== '' || raw.targetX !== null || raw.targetY !== null) return null;
  // スプレッド禁止: shotId、soundId、未知データを保存・結合しない。
  return Object.freeze({type: 'action-taser', id: raw.id, targetId: raw.targetId,
    playerId: raw.playerId, x: raw.x, y: raw.y, radius: RADIUS,
    variant: '', targetX: null, targetY: null});
}

export function canDisclose(a) {
  return a?.disclosed === true && a?.visible === true && a?.effectAllowed === true && a?.alive === true;
}
export function idKey(id) { return `${typeof id}:${id}`; }

/**
 * フレームに依存しない一回性。使用済みIDはセッション中に消さない。
 * 上限で古いIDを捨てる代わりに拒否するため、再送で再発音しない。
 */
export class SessionLedger {
  #ids = new Set();
  constructor(limit = MAX_SESSION_IDS) { this.limit = limit; }
  claim(id) {
    if (!validId(id)) return 'invalid';
    const key = idKey(id);
    if (this.#ids.has(key)) return 'duplicate';
    if (this.#ids.size >= this.limit) return 'full';
    this.#ids.add(key);
    return 'new';
  }
  get size() { return this.#ids.size; }
}

/**
 * 権限判定は座標読み出し・保存・GPU upload・音声作成より前。
 * resolverが失敗してもfail closed。取り消しは次のtickで音も停止。
 * receivedAtは同じ単調時計の受信時刻。サーバー時刻との混在は禁止。
 */
export class TaserController {
  #active = new Map();
  #ledger = new SessionLedger();
  constructor({resolveAccess = () => null, sound = null, now = () => performance.now()} = {}) {
    this.resolveAccess = resolveAccess; this.sound = sound; this.now = now;
    this.stats = {accepted: 0, denied: 0, duplicate: 0, malformed: 0, stale: 0, capacity: 0, expired: 0, revoked: 0};
  }
  access(targetId) { try { return this.resolveAccess(targetId); } catch { return null; } }
  ingest(raw, receivedAt = this.now()) {
    // この段階ではx/yに一切触れない。
    if (!raw || raw.type !== 'action-taser' || !validId(raw.id) || !validId(raw.targetId)) {
      this.stats.malformed++; return {accepted: false, reason: 'malformed'};
    }
    const claim = this.#ledger.claim(raw.id);
    if (claim !== 'new') {
      if (claim === 'duplicate') this.stats.duplicate++; else this.stats.capacity++;
      return {accepted: false, reason: claim};
    }
    if (!canDisclose(this.access(raw.targetId))) {
      this.stats.denied++; return {accepted: false, reason: 'not-disclosed'};
    }
    const at = this.now();
    if (!Number.isFinite(receivedAt) || receivedAt > at || at - receivedAt >= LIFE_MS) {
      this.stats.stale++; return {accepted: false, reason: 'stale-clock'};
    }
    const event = normalizeSuccessEvent(raw);
    if (!event) { this.stats.malformed++; return {accepted: false, reason: 'malformed'}; }
    this.tick(at);
    if (this.#active.size >= MAX_EVENTS) {
      this.stats.capacity++; return {accepted: false, reason: 'capacity'};
    }
    const instance = Object.freeze({event, startMs: receivedAt});
    this.#active.set(idKey(event.id), instance);
    this.stats.accepted++;
    // 固有IDのみ。射手音へのjoin、遅延したunlock後の再生キューはない。
    this.sound?.playOnce(event.id, {authorized: true, ageMs: at - receivedAt});
    return {accepted: true, reason: 'success-event'};
  }
  tick(at = this.now()) {
    for (const [key, inst] of this.#active) {
      const revoked = !canDisclose(this.access(inst.event.targetId));
      if (revoked || at - inst.startMs >= LIFE_MS || at < inst.startMs) {
        this.#active.delete(key);
        this.sound?.cancel(inst.event.id);
        if (revoked) this.stats.revoked++; else this.stats.expired++;
      }
    }
    return [...this.#active.values()];
  }
  // 公開の診断情報には対象ID、射手ID、event座標を含めない。
  diagnostics() { return {...this.stats, active: this.#active.size, sessionIds: this.#ledger.size}; }
  dispose() { for (const inst of this.#active.values()) this.sound?.cancel(inst.event.id); this.#active.clear(); }
}

/** テスト用の発行条件。実ゲームの判定関数の代替・接続ではない。 */
export function fixtureShouldEmit(s) {
  return s?.normalTaser === true && s?.living === true && s?.slowApplied === true &&
    s?.empty !== true && s?.guard !== true && s?.headshot !== true && s?.specialAmmo !== true &&
    s?.immune !== true && s?.dead !== true;
}

export function phaseAt(ms) {
  if (ms < 0 || ms >= LIFE_MS) return '終了 / Eなし';
  if (ms < 100) return '接触の立ち上がり';
  if (ms < 280) return '内向き収束・成立';
  if (ms < 720) return '短い拘束の読み';
  return '接触残留の減衰';
}
