import { normalizeAttendanceEvent, eventKey, finiteNumber, MAX_ACTIVE, MAX_SEEN_IDS } from './contract.js';
import { DURATION_MS, SFX_CUE_MS, soundDue } from './timeline.js';

/**
 * 描画ビューと独立した一度性台帳。複数キャンバスが同じ controller を共有できる。
 * このクラスにはデモのループ処理もゲーム状態を書き換えるAPIもない。
 */
export class AttendanceController {
  constructor({ maxActive = MAX_ACTIVE, maxSeenIds = MAX_SEEN_IDS, audio = null } = {}) {
    if (!Number.isInteger(maxActive) || maxActive < 1 || maxActive > MAX_ACTIVE) throw new RangeError('maxActive');
    if (!Number.isInteger(maxSeenIds) || maxSeenIds < maxActive) throw new RangeError('maxSeenIds');
    this.maxActive = maxActive;
    this.maxSeenIds = maxSeenIds;
    this.audio = audio;
    this.seen = new Set();
    this.active = [];
    this.lastGameMs = -Infinity;
    this.stats = { accepted: 0, duplicates: 0, stale: 0, overflow: 0, soundPlayed: 0, soundSkipped: 0 };
  }

  /**
   * eventAtGameMs はホストがゲーム時計へ変換済みのイベント時刻。
   * 未指定時のみ receivedAtGameMs を起点にする。生のサーバー日時と混同しない。
   */
  ingest(raw, { receivedAtGameMs, eventAtGameMs = receivedAtGameMs } = {}) {
    finiteNumber(receivedAtGameMs, 'receivedAtGameMs');
    finiteNumber(eventAtGameMs, 'eventAtGameMs');
    const event = normalizeAttendanceEvent(raw);
    if (eventAtGameMs > receivedAtGameMs) throw new RangeError('未来の eventAtGameMs は受理しません');
    if (receivedAtGameMs < this.lastGameMs) throw new RangeError('受信時刻がゲーム時計より過去です');
    const key = eventKey(event.sourceId);
    if (this.seen.has(key)) { this.stats.duplicates++; return { accepted: false, reason: 'duplicate' }; }
    // 台帳を時間で追い出さない。満杯時は再送を許すのでなく fail-closed。
    if (this.seen.size >= this.maxSeenIds) { this.stats.overflow++; return { accepted: false, reason: 'ledger-full' }; }
    this.seen.add(key);
    this.prune(receivedAtGameMs);
    if (receivedAtGameMs - eventAtGameMs >= DURATION_MS) {
      this.stats.stale++; return { accepted: false, reason: 'expired' };
    }
    if (this.active.length >= this.maxActive) {
      this.stats.overflow++; return { accepted: false, reason: 'capacity' };
    }
    this.active.push({ event, bornMs: eventAtGameMs, soundConsumed: false });
    this.stats.accepted++;
    return { accepted: true, event };
  }

  prune(gameMs) {
    this.active = this.active.filter(item => gameMs - item.bornMs < DURATION_MS);
  }

  /** listener はイベントと同じ world x/y。未指定なら局所性を保証できず音を出さない。 */
  update(gameMs, { listener = null } = {}) {
    finiteNumber(gameMs, 'gameMs');
    if (gameMs < this.lastGameMs) throw new RangeError('ゲーム時計を逆行させないでください');
    this.lastGameMs = gameMs;
    for (const item of this.active) {
      const ageMs = gameMs - item.bornMs;
      if (!item.soundConsumed && ageMs >= SFX_CUE_MS) {
        item.soundConsumed = true;
        const played = soundDue(ageMs) && this.audio?.play(item.event, listener) === true;
        this.stats[played ? 'soundPlayed' : 'soundSkipped']++;
      }
    }
    this.prune(gameMs);
    return this.snapshot(gameMs);
  }

  /** 読み取りだけ。ここからは発音しない。 */
  snapshot(gameMs) {
    finiteNumber(gameMs, 'gameMs');
    return this.active
      .filter(item => gameMs >= item.bornMs && gameMs - item.bornMs < DURATION_MS)
      .map(item => Object.freeze({ ...item.event, ageMs: gameMs - item.bornMs }));
  }

  /** 部屋/セッションが本当に切り替わる時だけ呼ぶ。毎フレームや寿命終了時には呼ばない。 */
  resetSession() {
    this.audio?.stopAll();
    this.active = [];
    this.seen.clear();
    this.lastGameMs = -Infinity;
  }
  dispose() { this.resetSession(); }
}
