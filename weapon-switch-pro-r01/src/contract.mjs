/** サーバー成功 receipt の唯一の入口。描画ヒントを receipt に混入させない。 */
export const VARIANTS = Object.freeze(['handgun', 'smg', 'assault', 'sniper', 'taser']);
export const FIELD_LIFETIME_MS = 1200;
export const BODY_BASE_MS = 560;
export const RADIUS_WORLD = 90;
const authority = new Set(['id', 'type', 'playerId', 'variant', 'x', 'y', 'radius', 'at', 'targetX', 'targetY', 'durationMs']);
const empty = x => x === undefined || x === null || x === '';
export class ReceiptError extends Error {
  constructor(code) { super(code); this.name = 'ReceiptError'; this.code = code; }
}
export function parseReceipt(raw) {
  const bad = code => { throw new ReceiptError(code); };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) bad('invalid_receipt');
  // accessor はネットワーク JSON ではない。評価せず拒否する。
  const descriptors = Object.getOwnPropertyDescriptors(raw);
  for (const d of Object.values(descriptors)) if (!('value' in d)) bad('accessor_not_allowed');
  if (raw.type !== 'action-weapon-switch') bad('wrong_type');
  if (typeof raw.id !== 'string' || !raw.id.startsWith('magic_') || raw.id.length < 7 || raw.id.length > 256 || /[\s\u0000-\u001f]/u.test(raw.id)) bad('invalid_id');
  if (!((typeof raw.playerId === 'string' && raw.playerId.length > 0 && raw.playerId.length <= 256) || Number.isSafeInteger(raw.playerId))) bad('invalid_player');
  if (!VARIANTS.includes(raw.variant)) bad('invalid_variant');
  if (!Number.isSafeInteger(raw.x) || !Number.isSafeInteger(raw.y)) bad('coordinates_must_be_server_rounded_integers');
  if (raw.radius !== RADIUS_WORLD) bad('radius_must_be_90');
  if (typeof raw.at !== 'number' || !Number.isFinite(raw.at) || raw.at < 0) bad('invalid_server_at');
  if (raw.targetX !== null || raw.targetY !== null) bad('targets_must_be_null');
  if (raw.durationMs !== 0) bad('duration_must_be_zero');
  for (const key of Object.keys(raw)) if (!authority.has(key) && !empty(raw[key])) bad('nonempty_extra_field');
  // 推測による target / muzzle / direction / completion / server音receipt を作らない。
  return Object.freeze({id: raw.id, type: raw.type, playerId: raw.playerId, variant: raw.variant,
    x: raw.x, y: raw.y, radius: RADIUS_WORLD, at: raw.at,
    targetX: null, targetY: null, durationMs: 0});
}

/** セッション寿命の ID 墓標。TTLで捨てると遅延再送が再発火するため自動削除しない。 */
export class ReceiptLedger {
  #ids = new Set();
  constructor(limit = 250000) {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError('invalid_ledger_limit');
    this.limit = limit;
  }
  claim(id) {
    if (this.#ids.has(id)) return 'duplicate';
    if (this.#ids.size >= this.limit) return 'ledger_full';
    this.#ids.add(id); return 'claimed';
  }
  get size() { return this.#ids.size; }
}

/** BODY時計は host 用契約補助のみ。BODY造形・既存モーションの読取/複製はしない。 */
export class BodyClock {
  #elapsed = 0;
  step(dtMs, motionMultiplier) {
    if (!Number.isFinite(dtMs) || dtMs < 0 || !Number.isFinite(motionMultiplier) || motionMultiplier < 0) throw new RangeError('invalid_body_clock');
    this.#elapsed = Math.min(BODY_BASE_MS, this.#elapsed + dtMs * motionMultiplier);
    return this.progress;
  }
  get progress() { return this.#elapsed / BODY_BASE_MS; }
  get done() { return this.#elapsed >= BODY_BASE_MS; }
}
