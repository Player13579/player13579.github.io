import { AUDIO_FRESH_MS, MAX_VOICES, MAX_LEDGER, idKey } from './timeline.mjs';

export const SOUND_SECONDS = 0.245;
export const SOUND_HEADROOM = 0.5; // 同時8声の最悪同位相でも、このE単独の和を有限域に保つ固定係数。
/** 新規の一打・収束音。外部sample、複数note、noiseの追加はない。 */
export function synthesizePickupPCM(sampleRate = 48000) {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('sampleRate');
  const pcm = new Float32Array(Math.ceil(sampleRate * SOUND_SECONDS));
  for (let i = 0; i < pcm.length; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, t / 0.0035);
    const end = Math.max(0, Math.min(1, (SOUND_SECONDS - t) / 0.016));
    const fundamental = Math.sin(2 * Math.PI * (760*t + 10*(1-Math.exp(-t/0.023))));
    const settled = 0.32 * Math.sin(2 * Math.PI * 1140*t) * Math.exp(-t/0.049);
    const contact = 0.14 * Math.sin(2 * Math.PI * 1930*t) * Math.exp(-t/0.014);
    pcm[i] = 0.17 * attack * end * (fundamental * Math.exp(-t/0.073) + settled + contact);
  }
  pcm[0] = 0; pcm[pcm.length-1] = 0;
  return pcm;
}

export class PickupSound {
  #decided = new Set();
  #voices = new Map();
  #buffer = null;
  constructor({ audioContext = null, maxVoices = MAX_VOICES, readExecutionClock = () => performance.now() } = {}) {
    if (!Number.isInteger(maxVoices) || maxVoices < 1 || maxVoices > MAX_VOICES) throw new RangeError('maxVoices');
    this.context = audioContext; this.readExecutionClock = readExecutionClock;
    this.maxVoices = maxVoices;
    this.muted = true;
    this.volume = 0.8;
    this.disposed = false;
    this.counters = { played: 0, skipped: 0, duplicate: 0, stopped: 0 };
    this.onState = () => { if (this.context?.state !== 'running') this.stopAll('context_not_running'); };
    this.context?.addEventListener?.('statechange', this.onState);
  }
  /** ユーザー操作で作成/再開済みのcontextだけを受ける。effectからresumeしない。 */
  attachRunningContext(context) {
    if (this.disposed) throw new Error('disposed');
    this.stopAll('context_replaced');
    this.context?.removeEventListener?.('statechange', this.onState);
    this.context = context; this.#buffer = null;
    context?.addEventListener?.('statechange', this.onState);
  }
  setMuted(muted) { this.muted = Boolean(muted); if (this.muted) this.stopAll('muted'); }
  setVolume(value) {
    if (!Number.isFinite(value)) throw new TypeError('volume');
    this.volume = Math.max(0, Math.min(1, value));
    if (this.volume === 0) this.stopAll('zero_volume');
  }
  get activeVoices() { return this.#voices.size; }
  #skip(reason) { this.counters.skipped++; return { played: false, reason }; }
  /** 一つの可視提出causeにつき一回の即時判定。非同期queueは持たない。 */
  consume(event, { nowMonoMs, documentVisible = true } = {}) {
    const executionStart = this.readExecutionClock();
    if (!event || !Number.isFinite(event.ageMs) || event.ageMs < 0 || !Number.isFinite(event.submittedMonoMs) || !Number.isSafeInteger(event.frameToken)) return this.#skip('invalid_sound_event');
    const key = idKey(event.causeId);
    if (this.#decided.has(key)) { this.counters.duplicate++; return { played: false, reason: 'duplicate_cause' }; }
    if (this.#decided.size >= MAX_LEDGER) return this.#skip('sound_ledger_full');
    this.#decided.add(key); // start失敗、mute、遅延も永久に消費。
    const lag = nowMonoMs - event.submittedMonoMs;
    if (this.disposed || !documentVisible || this.muted || this.volume <= 0) return this.#skip('inaudible_policy');
    if (!Number.isFinite(lag) || lag < 0 || lag > 16 || event.ageMs > AUDIO_FRESH_MS) return this.#skip('late_submission');
    if (!this.context || this.context.state !== 'running') return this.#skip('context_not_running');
    if (this.#voices.size >= this.maxVoices) return this.#skip('voice_capacity');
    let source, gain;
    try {
      if (!this.#buffer) {
        const pcm = synthesizePickupPCM(this.context.sampleRate);
        this.#buffer = this.context.createBuffer(1, pcm.length, this.context.sampleRate);
        this.#buffer.copyToChannel(pcm, 0);
      }
      source = this.context.createBufferSource();
      gain = this.context.createGain();
      source.buffer = this.#buffer;
      gain.gain.value = this.volume * SOUND_HEADROOM;
      source.connect(gain); gain.connect(this.context.destination);
      source.onended = () => { source.disconnect(); gain.disconnect(); this.#voices.delete(key); };
      this.#voices.set(key, { source, gain });
      const executionElapsed = this.readExecutionClock() - executionStart;
      if (!Number.isFinite(executionElapsed) || executionElapsed < 0 || lag + executionElapsed > 16 || event.ageMs + executionElapsed > AUDIO_FRESH_MS || this.context.state !== 'running') {
        source.disconnect(); gain.disconnect(); this.#voices.delete(key);
        return this.#skip('preparation_too_late');
      }
      source.start(this.context.currentTime); // 未来予約、atからの追いかけ再生、複数oscillatorなし。
      this.counters.played++;
      return { played: true, causeId: event.causeId, frameToken: event.frameToken };
    } catch {
      try { source?.disconnect(); gain?.disconnect(); } catch { /* cleanup */ }
      this.#voices.delete(key);
      return this.#skip('audio_start_failed');
    }
  }
  stopExcept(ids) {
    const allowed = new Set(ids.map(idKey));
    for (const [key, {source,gain}] of this.#voices) {
      if (allowed.has(key)) continue;
      try { source.stop(); source.disconnect(); gain.disconnect(); } catch { /* already ended */ }
      this.#voices.delete(key); this.counters.stopped++;
    }
  }
  stopAll() {
    for (const { source, gain } of this.#voices.values()) {
      try { source.stop(); source.disconnect(); gain.disconnect(); } catch { /* 既に終了 */ }
      this.counters.stopped++;
    }
    this.#voices.clear();
  }
  dispose() {
    this.stopAll('disposed'); this.context?.removeEventListener?.('statechange', this.onState);
    this.disposed = true; this.#buffer = null;
  }
}
