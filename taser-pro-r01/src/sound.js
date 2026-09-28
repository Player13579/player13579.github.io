import {SessionLedger, SOUND_MS, idKey} from './contract.js';

/**
 * 外部音源不使用。短い接触音→非整数倍音の下向き共鳴→抵抗感のある消音。
 * 実銃音・人体への電流の録音・シミュレーションではない。
 * 1 PCM / 1 AudioBufferSourceNode / event ID。複数ノードによる連打をしない。
 */
export function synthesizeContact(sampleRate = 48000) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('sampleRate');
  const pcm = new Float32Array(Math.ceil(sampleRate * SOUND_MS / 1000));
  let seed = 0x71a5e2d3, lp = 0, hpMemory = 0, phase = 0, peak = 0;
  for (let i = 0; i < pcm.length; i++) {
    const t = i / sampleRate;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const noise = ((seed >>> 0) / 4294967296) * 2 - 1;
    // 固定帯域。Nyquist未満へsampleRateに応じて制限。
    const a = 1 - Math.exp(-2 * Math.PI * Math.min(2700, sampleRate * .22) / sampleRate);
    lp += a * (noise - lp); hpMemory += .02 * (lp - hpMemory);
    const band = lp - hpMemory;
    const attack = 1 - Math.exp(-t / .0035);
    const end = Math.min(1, Math.max(0, (SOUND_MS / 1000 - t) / .035));
    const contact = band * .22 * Math.exp(-t / .026);
    const f = 205 + 630 * Math.exp(-t / .084);
    phase += 2 * Math.PI * f / sampleRate;
    const tension = (.58 * Math.sin(phase) + .23 * Math.sin(phase * 1.431 + .4) +
      .12 * Math.sin(phase * 2.117)) * Math.exp(-t / .115);
    const resist = band * .075 * Math.exp(-t / .145) * (.65 + .35 * Math.sin(2 * Math.PI * 41 * t) ** 2);
    const v = Math.tanh((contact + tension + resist) * 1.25) * attack * end * end;
    pcm[i] = v; peak = Math.max(peak, Math.abs(v));
  }
  // 各声peak=0.5。8声同相でもmaster 0.18で0.72以下（volume<=1）。
  for (let i = 0; i < pcm.length; i++) pcm[i] = pcm[i] / Math.max(peak, 1e-9) * .5;
  pcm[0] = 0; pcm[pcm.length - 1] = 0;
  return pcm;
}

export class ContactSound {
  #ledger = new SessionLedger(); #voices = new Map(); #context = null; #buffer = null; #master = null;
  constructor({verify = true, contextFactory = null} = {}) {
    this.verify = verify; this.contextFactory = contextFactory; this.unlocked = false; this.volume = .65;
    this.stats = {contextsCreated: 0, started: 0, duplicate: 0, silentConsumed: 0,
      lateSuppressed: 0, capacitySuppressed: 0, cancelled: 0};
  }
  get context() { return this.#context; }
  get activeVoices() { return this.#voices.size; }
  async unlockFromGesture() {
    if (this.verify) return false;
    if (!this.#context) {
      const Factory = this.contextFactory ?? globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!Factory) throw new Error('Web Audio API非対応');
      this.#context = new Factory(); this.stats.contextsCreated++;
      this.#master = this.#context.createGain();
      this.#master.gain.value = .18 * this.volume; this.#master.connect(this.#context.destination);
      const pcm = synthesizeContact(this.#context.sampleRate);
      this.#buffer = this.#context.createBuffer(1, pcm.length, this.#context.sampleRate);
      this.#buffer.copyToChannel(pcm, 0);
    }
    await this.#context.resume();
    this.unlocked = this.#context.state === 'running';
    return this.unlocked;
  }
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.#master) this.#master.gain.setTargetAtTime(.18 * this.volume, this.#context.currentTime, .01);
  }
  setVerify(value) {
    this.verify = !!value;
    if (this.verify) { for (const key of [...this.#voices.keys()]) this.#cancelKey(key); }
  }
  playOnce(id, {authorized = false, ageMs = 0} = {}) {
    const claim = this.#ledger.claim(id);
    if (claim !== 'new') { this.stats.duplicate++; return false; }
    if (!authorized || this.verify || !this.unlocked || this.#context?.state !== 'running') {
      this.stats.silentConsumed++; return false;
    }
    // 音の遅延再生は接触の原因を曖昧にするため、古い受信では鳴らさない。
    if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 100) { this.stats.lateSuppressed++; return false; }
    if (this.#voices.size >= 8) { this.stats.capacitySuppressed++; return false; }
    const source = this.#context.createBufferSource(); source.buffer = this.#buffer; source.loop = false;
    source.connect(this.#master);
    const key = idKey(id); this.#voices.set(key, source);
    source.onended = () => { source.disconnect(); if (this.#voices.get(key) === source) this.#voices.delete(key); };
    source.start(); this.stats.started++;
    return true;
  }
  #cancelKey(key) {
    const source = this.#voices.get(key); if (!source) return;
    // privacy取り消しは即時消音。フェードを残して位置を推定させない。
    source.disconnect(); try { source.stop(); } catch {} this.#voices.delete(key); this.stats.cancelled++;
  }
  cancel(id) { this.#cancelKey(idKey(id)); }
  /** 検査用の受動tap。音源を新規作成せず、同じmaster出力を観測する。 */
  observe(node) {
    if (!this.#master || node.context !== this.#context) throw new Error('matching AudioContext required');
    this.#master.connect(node); return () => { try { this.#master.disconnect(node); } catch {} };
  }
  diagnostics() { return {...this.stats, active: this.activeVoices, verify: this.verify, unlocked: this.unlocked,
    state: this.#context?.state ?? 'not-created', owner: 'action-taser.id', bufferDurationMs: SOUND_MS}; }
  async dispose() { for (const k of [...this.#voices.keys()]) this.#cancelKey(k); await this.#context?.close(); this.unlocked = false; }
}
