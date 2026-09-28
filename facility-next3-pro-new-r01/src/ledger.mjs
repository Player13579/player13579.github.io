/**
 * 同一セッションで破棄しない消費台帳。TTLで削除すると古いreceiptの再送で再発火するため削除しない。
 * persist は同期で永続化を完了する関数。失敗時はfail-closed、描画・発音しない。
 * 複数runtimeは必ず同じ台帳インスタンスを共有する。認証セッション単位で名前空間を分ける。
 */
export class ReceiptLedger {
  #entries = new Map();
  #persist;
  #limit;
  constructor({snapshot=[],persist=null,maxEntries=200000}={}) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) throw new TypeError('maxEntries');
    if (!Array.isArray(snapshot) || snapshot.length > maxEntries) throw new TypeError('ledger_snapshot');
    for (const row of snapshot) {
      if (!Array.isArray(row) || row.length!==2 || row.some(x=>typeof x!=='string') || this.#entries.has(row[0])) throw new TypeError('ledger_row');
      this.#entries.set(row[0],row[1]);
    }
    this.#persist = persist;
    this.#limit = maxEntries;
  }
  claim(key,fingerprint) {
    const previous = this.#entries.get(key);
    if (previous !== undefined) return previous === fingerprint ? 'duplicate' : 'conflict';
    if (this.#entries.size >= this.#limit) return 'capacity_rejected';
    this.#entries.set(key,fingerprint);
    try { this.#persist?.(this.snapshot()); }
    catch { return 'persistence_failed'; } // メモリの墓標は保持。後から再試行・再発音しない。
    return 'claimed';
  }
  snapshot() { return [...this.#entries]; }
  get size() { return this.#entries.size; }
}
export function createSessionLedger(storage, namespace) {
  if (!storage || typeof storage.getItem!=='function' || typeof storage.setItem!=='function') throw new TypeError('Storage required');
  if (typeof namespace !== 'string' || !namespace.trim()) throw new TypeError('認証セッション固有namespaceが必要です');
  const key = `facility-use-e:1:${namespace}`;
  const raw = storage.getItem(key);
  const snapshot = raw === null ? [] : JSON.parse(raw);
  // 読み書き可能性を確認。破損データを空台帳に置換しない。
  storage.setItem(key,JSON.stringify(snapshot));
  return new ReceiptLedger({snapshot,persist:rows=>storage.setItem(key,JSON.stringify(rows))});
}
