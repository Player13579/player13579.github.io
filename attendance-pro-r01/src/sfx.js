/** 参加札の内側の短い摺動音。画像素材・既存完成音・音楽的ファンファーレを使用しない。 */
export const SFX_DURATION_SECONDS = 0.176;
export const SFX_PEAK_LIMIT = 0.20;

/**
 * 固定seedの無声ノイズを二つの帯域へ分け、同じ一回の包絡で摺動→接触→制動へ変える。
 * actor ID・陣営・真偽をseedやピッチに使わない。音列/和音/上昇ベルは作らない。
 */
export function synthesizeAttendance(sampleRate = 48000) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('sampleRate');
  const length = Math.ceil(sampleRate * SFX_DURATION_SECONDS);
  const data = new Float32Array(length);
  let seed = 0x47c15e3d;
  let slow = 0, fast = 0, dc = 0;
  const slowA = 1 - Math.exp(-2 * Math.PI * 380 / sampleRate);
  const fastA = 1 - Math.exp(-2 * Math.PI * 2600 / sampleRate);
  const dcA = 1 - Math.exp(-2 * Math.PI * 75 / sampleRate);
  let peak = 0;
  for (let i = 0; i < length; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const noise = ((seed >>> 0) / 4294967295) * 2 - 1;
    slow += slowA * (noise - slow);
    fast += fastA * (noise - fast);
    const t = i / sampleRate;
    const attack = 1 - Math.exp(-t / 0.0035);
    const slip = attack * Math.exp(-t / 0.032);
    // 同じ接触の広帯域の低い芯。正弦波を鳴らさない。
    const body = attack * Math.exp(-t / 0.018);
    const end = Math.max(0, 1 - t / SFX_DURATION_SECONDS);
    const value = ((fast - slow) * 0.47 * slip + slow * 0.8 * body) * end * end;
    dc += dcA * (value - dc);
    data[i] = value - dc;
    peak = Math.max(peak, Math.abs(data[i]));
  }
  const gain = peak > 0 ? SFX_PEAK_LIMIT / peak : 0;
  for (let i = 0; i < length; i++) {
    const tail = Math.min(1, (length - 1 - i) / Math.max(1, sampleRate * 0.009));
    data[i] *= gain * tail;
  }
  data[0] = 0; data[length - 1] = 0;
  return data;
}

export function localAudioGain(event, listener) {
  if (!listener || !Number.isFinite(listener.x) || !Number.isFinite(listener.y)) return 0;
  const d = Math.hypot(event.world.x - listener.x, event.world.y - listener.y);
  return Math.pow(Math.max(0, 1 - d / event.radius), 2);
}

export class AttendanceAudio {
  constructor({ context = null, masterGain = 0.4, maxVoices = 4 } = {}) {
    if (!Number.isFinite(masterGain) || masterGain < 0 || masterGain > 1) throw new RangeError('masterGain');
    if (!Number.isInteger(maxVoices) || maxVoices < 1 || maxVoices > 32) throw new RangeError('maxVoices');
    this.context = context;
    this.ownsContext = !context;
    this.enabled = false;
    this.masterGain = masterGain;
    this.maxVoices = maxVoices;
    this.voices = new Set();
    this.output = null;
    this.buffer = null;
  }

  /** ユーザー操作内から呼ぶ。デモ起動時は映像だけを自動再生。音の後追い再生はしない。 */
  async enable() {
    if (!this.context) {
      const AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioCtor) throw new Error('Web Audio を利用できません');
      this.context = new AudioCtor({ latencyHint: 'interactive' });
    }
    const ctx = this.context;
    if (ctx.state === 'closed') throw new Error('AudioContext は閉じています');
    if (!this.output) {
      this.output = ctx.createGain();
      this.output.gain.value = this.masterGain;
      this.output.connect(ctx.destination);
      const samples = synthesizeAttendance(ctx.sampleRate);
      this.buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      this.buffer.copyToChannel(samples, 0);
    }
    await ctx.resume();
    this.enabled = ctx.state === 'running';
    return this.enabled;
  }

  setEnabled(value) {
    this.enabled = Boolean(value) && this.context?.state === 'running';
    if (!this.enabled) this.stopAll();
  }

  /** 1イベントにつき1 AudioBufferSource。重複抑止とゲーム時刻判定は controller が所有。 */
  play(event, listener) {
    if (!this.enabled || this.context?.state !== 'running' || !this.buffer || this.voices.size >= this.maxVoices) return false;
    const distanceGain = localAudioGain(event, listener);
    if (distanceGain <= 0) return false;
    const ctx = this.context;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    source.buffer = this.buffer;
    // 最大voice数で割った上限により最悪の同相加算でも控えめな絶対振幅を保つ。
    gain.gain.value = distanceGain / this.maxVoices;
    pan.pan.value = Math.max(-0.65, Math.min(0.65, (event.world.x - listener.x) / event.radius * 0.65));
    source.connect(gain).connect(pan).connect(this.output);
    const voice = { source, gain, pan };
    this.voices.add(voice);
    source.onended = () => {
      this.voices.delete(voice);
      source.disconnect(); gain.disconnect(); pan.disconnect();
    };
    source.start(ctx.currentTime);
    return true;
  }

  stopAll() {
    for (const { source } of this.voices) { try { source.stop(); } catch {} }
    this.voices.clear();
  }
  async dispose() {
    this.stopAll(); this.output?.disconnect();
    if (this.ownsContext && this.context && this.context.state !== 'closed') await this.context.close();
  }
}
