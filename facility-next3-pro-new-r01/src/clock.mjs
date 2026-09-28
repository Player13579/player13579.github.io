/** サーバー同期済みepochと同時のmonotonic標本。Date.nowによるクライアント推測は禁止。 */
export class ReceiptClock {
  constructor({serverEpochMs,monotonicMs,now=()=>performance.now()}) {
    if (![serverEpochMs,monotonicMs].every(Number.isFinite) || serverEpochMs <= 0 || typeof now!=='function') throw new TypeError('同期済み時計標本が必要です');
    this.serverEpochMs=serverEpochMs;
    this.monotonicMs=monotonicMs;
    this.now=now;
  }
  toMonotonic(capturedTime) { return this.monotonicMs + (capturedTime-this.serverEpochMs); }
}
