import {
  PRESENTATION_MS, AUDIO_FRESH_MS, AUDIO_SUBMIT_WINDOW_MS, MAX_ACTIVE, MAX_LEDGER,
  phase, idKey, validateReceipt
} from './timeline.mjs';

/**
 * session全体で単調に増える重複防止台帳。LRU/TTLで再取得可能にしない。
 * room変更・socket再接続でも同じインスタンスを渡す。容量超過はfail-closed。
 */
export class SeenLedger {
  #entries = new Map();
  constructor(limit = MAX_LEDGER) {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new TypeError('ledger limit');
    this.limit = limit;
  }
  get size() { return this.#entries.size; }
  has(id) { return this.#entries.has(idKey(id)); }
  claim(id) {
    const key = idKey(id);
    if (this.#entries.has(key)) return 'duplicate_id';
    if (this.#entries.size >= this.limit) return 'ledger_full';
    this.#entries.set(key, 'claimed');
    return null;
  }
  record(id, outcome) { if (this.has(id)) this.#entries.set(idKey(id), outcome); }
  outcome(id) { return this.#entries.get(idKey(id)); }
  snapshot() { return [...this.#entries.entries()]; }
}

function finiteList(x, n) { return Array.isArray(x) && x.length === n && x.every(Number.isFinite); }
export function validateFrame(frame) {
  if (!frame || !Number.isFinite(frame.authorityNowMs) || !Number.isFinite(frame.monotonicNowMs)) return 'clock_missing';
  if (!Number.isSafeInteger(frame.width) || frame.width < 1 || !Number.isSafeInteger(frame.height) || frame.height < 1) return 'viewport_missing';
  if (typeof frame.roomId !== 'string' || !frame.roomId || !Number.isSafeInteger(frame.streamGeneration)) return 'room_generation_missing';
  if (!finiteList(frame.worldToScreen, 6) || !finiteList(frame.roomClip, 4)) return 'projection_missing';
  const [a,b,c,d] = frame.worldToScreen;
  if (Math.abs(a*d-b*c) < 1e-10) return 'projection_degenerate';
  if (typeof frame.resolveActor !== 'function' || typeof frame.isAnchorVisible !== 'function') return 'visibility_resolver_missing';
  return null;
}

/** 既存カメラのaffine変換のみ。receipt原点を現在actor位置へ移動しない。 */
export function projectReceipt(r, f) {
  const [a,b,c,d,tx,ty] = f.worldToScreen;
  const x = a*r.x + c*r.y + tx;
  const y = b*r.x + d*r.y + ty;
  const clip = [Math.max(0, f.roomClip[0]), Math.max(0, f.roomClip[1]),
    Math.min(f.width, f.roomClip[2]), Math.min(f.height, f.roomClip[3])];
  if (![x,y,...clip].every(Number.isFinite) || clip[2] <= clip[0] || clip[3] <= clip[1]) return null;
  // 半開区間。画面外originをedge markerへ寄せない。部分的な場は通常のclipに従う。
  if (x < clip[0] || x >= clip[2] || y < clip[1] || y >= clip[3]) return null;
  return Object.freeze({ origin: [x,y], axisX: [a*r.radius,b*r.radius], axisY: [c*r.radius,d*r.radius], clip });
}

function gate(r, envelope, f) {
  const bad = validateFrame(f);
  if (bad) return { reason: bad };
  if (!envelope || envelope.authoritative !== true) return { reason: 'untrusted_envelope' };
  if (envelope.roomId !== f.roomId || envelope.streamGeneration !== f.streamGeneration) return { reason: 'room_generation_mismatch' };
  if (f.documentVisible !== true || f.canvasVisible !== true) return { reason: 'presentation_hidden' };
  let actor;
  try { actor = f.resolveActor(r.playerId); } catch { return { reason: 'actor_resolver_failed' }; }
  if (!actor || idKey(actor.id) !== idKey(r.playerId)) return { reason: 'actor_missing_or_mismatch' };
  if (actor.roomId !== f.roomId) return { reason: 'actor_room_mismatch' };
  if (actor.visible !== true) return { reason: 'actor_hidden' };
  let anchorVisible = false;
  try { anchorVisible = f.isAnchorVisible(r.x, r.y, r.playerId) === true; } catch { /* fail-closed */ }
  if (!anchorVisible) return { reason: 'anchor_hidden' };
  const projected = projectReceipt(r, f);
  if (!projected) return { reason: 'origin_offscreen' };
  return { projected };
}

export class PickupController {
  #active = new Map();
  constructor({ ledger = new SeenLedger(), maxActive = MAX_ACTIVE } = {}) {
    if (!Number.isSafeInteger(maxActive) || maxActive < 1 || maxActive > MAX_ACTIVE) throw new TypeError('maxActive');
    this.ledger = ledger;
    this.maxActive = maxActive;
    this.disposed = false;
    this.counters = Object.create(null);
  }
  get activeCount() { return this.#active.size; }
  #count(reason) { this.counters[reason] = (this.counters[reason] || 0) + 1; }
  #reject(r, reason) { if (r) this.ledger.record(r.id, reason); this.#count(reason); return { accepted: false, reason }; }
  ingest(receipt, envelope, frame) {
    if (this.disposed) return this.#reject(null, 'disposed');
    const invalid = validateReceipt(receipt);
    if (invalid) return this.#reject(null, invalid);
    const claimed = this.ledger.claim(receipt.id);
    if (claimed) { this.#count(claimed); return { accepted: false, reason: claimed }; }
    // authorityのオブジェクトは不変。Eの状態は別オブジェクトに保持する。
    const r = Object.freeze({ ...receipt });
    const checked = gate(r, envelope, frame);
    if (checked.reason) return this.#reject(r, checked.reason);
    const age = frame.authorityNowMs - r.at;
    if (age < 0) return this.#reject(r, 'future_receipt');
    if (age >= PRESENTATION_MS) return this.#reject(r, 'expired_receipt');
    if (this.#active.size >= this.maxActive) return this.#reject(r, 'active_capacity');
    this.#active.set(idKey(r.id), {
      receipt: r,
      envelope: Object.freeze({ roomId: envelope.roomId, streamGeneration: envelope.streamGeneration, authoritative: true }),
      receivedMono: frame.monotonicNowMs, firstAge: age, age, lastMono: frame.monotonicNowMs,
      reducedMotion: frame.reducedMotion === true, soundDecision: 'pending', firstSubmit: null,
      projected: checked.projected
    });
    this.ledger.record(r.id, 'active');
    this.#count('accepted');
    return { accepted: true, id: r.id, presentationLifetimeMs: PRESENTATION_MS, authorityDurationMs: r.durationMs };
  }
  collect(frame) {
    const draws = [];
    for (const [key, entry] of this.#active) {
      const r = entry.receipt;
      const checked = gate(r, entry.envelope, frame);
      const badClock = !Number.isFinite(frame?.monotonicNowMs) || frame.monotonicNowMs < entry.lastMono;
      if (checked.reason || badClock) {
        const reason = badClock ? 'clock_regressed' : checked.reason;
        this.#active.delete(key); this.ledger.record(r.id, reason); this.#count(reason); continue;
      }
      const age = Math.max(entry.age, entry.firstAge + frame.monotonicNowMs - entry.receivedMono, frame.authorityNowMs - r.at);
      if (age >= PRESENTATION_MS) {
        this.#active.delete(key); this.ledger.record(r.id, 'finished'); this.#count('finished'); continue;
      }
      entry.lastMono = frame.monotonicNowMs;
      entry.age = age; entry.projected = checked.projected;
      const p = phase(age, entry.reducedMotion);
      if (p.body <= 0.002) continue; // このH64設計の可視立ち上がり。高cadenceでも初回を極小信号で消費しない。
      draws.push(Object.freeze({
        id: r.id, playerId: r.playerId, receipt: r, ageMs: age,
        reducedMotion: entry.reducedMotion, ...checked.projected
      }));
    }
    return draws;
  }
  /**
   * queue.submit直後だけ呼ぶ。GPU完了待機やaudio resume callbackから呼ばない。
   * 最初のsubmitで無音でも永久に消費するため、追っかけ音は発生しない。
   */
  commitVisibleSubmission({ submitted, ids, frameToken, submittedMonoMs, audioEligibleIds = [] }, frame) {
    if (submitted !== true || !Array.isArray(ids) || !Number.isSafeInteger(frameToken) || !Number.isFinite(submittedMonoMs)) return [];
    const soundEvents = [];
    for (const id of ids) {
      const entry = this.#active.get(idKey(id));
      if (!entry || entry.soundDecision !== 'pending') continue;
      entry.firstSubmit = frameToken;
      entry.soundDecision = 'consumed';
      if (!Array.isArray(audioEligibleIds) || !audioEligibleIds.some(v => idKey(v) === idKey(id))) { this.#count('sound_visibility_unconfirmed'); continue; }
      const delay = submittedMonoMs - entry.receivedMono;
      const dispatchLag = frame.monotonicNowMs - submittedMonoMs;
      const ageAtSubmit = entry.age + Math.max(0,submittedMonoMs-entry.lastMono);
      if (ageAtSubmit <= AUDIO_FRESH_MS && delay >= 0 && delay <= AUDIO_SUBMIT_WINDOW_MS && dispatchLag >= 0 && dispatchLag <= 16) {
        soundEvents.push(Object.freeze({ causeId: entry.receipt.id, frameToken, submittedMonoMs, ageMs: ageAtSubmit }));
      } else {
        this.#count('sound_stale_skipped');
      }
    }
    return soundEvents;
  }
  cancelAll(reason = 'cancelled') {
    for (const e of this.#active.values()) this.ledger.record(e.receipt.id, reason);
    this.#active.clear(); this.#count(reason);
  }
  dispose() { this.cancelAll('disposed'); this.disposed = true; }
}
