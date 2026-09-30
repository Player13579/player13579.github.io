import { synthesizeSfx, phaseAt } from './artist.mjs';

export class FiniteSfxGate {
  constructor({ verify = false, muted = false } = {}) {
    this.verify = Boolean(verify);
    this.muted = Boolean(muted);
    this.context = null;
    this.buffer = null;
    this.consumed = new Set();
    this.nodes = new Set();
  }

  connectContext(context) {
    if (!context || typeof context.createBuffer !== 'function') throw new TypeError('AudioContext required');
    this.context = context;
    this.buffer = null;
  }

  receive(record, nowMs = record?.receivedAtMs) {
    if (!record || typeof record.receiptKey !== 'string' || !record.receiptKey) return 'invalid-receipt';
    if (this.consumed.has(record.receiptKey)) return 'duplicate';
    this.consumed.add(record.receiptKey);
    if (this.verify || this.muted) return 'muted';
    if (!this.context || this.context.state !== 'running') return 'gesture-required-consumed';
    const phase = phaseAt(record, nowMs);
    if (!phase.alive) return 'expired';
    if (!this.buffer) {
      const pcm = synthesizeSfx(this.context.sampleRate);
      const buffer = this.context.createBuffer(2, pcm.left.length, pcm.sampleRate);
      buffer.copyToChannel(pcm.left, 0);
      buffer.copyToChannel(pcm.right, 1);
      this.buffer = buffer;
    }
    const source = this.context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.context.destination);
    this.nodes.add(source);
    source.onended = () => { this.nodes.delete(source); source.disconnect(); };
    const offsetSeconds = phase.ageMs / 1000;
    const remainingSeconds = Math.max(0, (1200 - phase.ageMs) / 1000);
    source.start(this.context.currentTime, offsetSeconds);
    source.stop(this.context.currentTime + remainingSeconds);
    return 'started';
  }

  stopAll() {
    for (const source of this.nodes) {
      try { source.stop(); } catch {}
      try { source.disconnect(); } catch {}
    }
    this.nodes.clear();
  }

  resetSession() {
    this.stopAll();
    this.consumed.clear();
  }
}
