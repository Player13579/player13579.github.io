/**
 * サーバー権威の表示契約。権限・陣営・タスク進捗はここでは判定しない。
 * sourceId はサーバーイベントの識別子であり、playerId とは別。
 * 受信前の認証・受信者選別はホストの責任。型検証はサーバー認証の代用ではない。
 */
export const CONTRACT = Object.freeze({
  type: 'action-task', variant: 'attendance', mode: '',
  radius: 82, clientLifetimeMs: 1200, markerCount: 1,
});
export const MAX_ACTIVE = 64;
export const MAX_SEEN_IDS = 16384;

export function finiteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} は有限の number が必要です`);
  }
  return value;
}

function identifier(value, label) {
  if (typeof value === 'string' && value.trim().length > 0 && value.length <= 256) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  throw new TypeError(`${label} は空でない文字列または安全な整数が必要です`);
}

/**
 * @param {object} raw 信頼済みサーバー配送層から受け取ったイベント。
 * @returns {Readonly<object>} 位置を含むコピー。入力を変更せず、未知のメタデータを描画へ渡さない。
 */
export function normalizeAttendanceEvent(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('イベントが必要です');
  for (const [key, expected] of Object.entries(CONTRACT)) {
    if (raw[key] !== expected) throw new RangeError(`契約不一致: ${key}`);
  }
  if (raw.target !== undefined && raw.target !== null) throw new RangeError('attendance は target を持ちません');
  if (!raw.world || typeof raw.world !== 'object') throw new TypeError('world.x / world.y が必要です');
  const sourceId = identifier(raw.sourceId, 'sourceId');
  const playerId = identifier(raw.playerId, 'playerId');
  const world = Object.freeze({
    x: finiteNumber(raw.world.x, 'world.x'),
    y: finiteNumber(raw.world.y, 'world.y'),
  });
  return Object.freeze({ ...CONTRACT, sourceId, playerId, world, target: null });
}

/** 型と値を区別した重複排除キー。ID内容は色・形・音へ渡さない。 */
export function eventKey(id) { return `${typeof id}:${String(id)}`; }

/**
 * 版別ワイヤー形式から独立契約への明示アダプタ。
 * radius / lifetime / actor 位置を必ず受け取り、勝手な既定値へ修正しない。
 */
export function adaptAttendance({
  sourceId, playerId, actorPosition, radius, lifetimeMs,
  type, variant, mode, markerCount, target = null,
}) {
  return normalizeAttendanceEvent({
    sourceId, playerId, world: actorPosition, radius,
    clientLifetimeMs: lifetimeMs, type, variant, mode, markerCount, target,
  });
}
