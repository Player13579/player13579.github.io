import {DESIGN} from './design-parameters.mjs';

/** 一般select/BODY三段音は上流で抑止。このモジュールだけがswitch音を所有する。 */
export function planAudio({isLocal, changed, isPhilia, variant, current = true}) {
  const special = isPhilia === true && variant === 'taser';
  return Object.freeze({owner: 'switch-E', suppressGeneralSelect: true, suppressBodySwitchSfx: true,
    play: current && isLocal === true && (changed === true || special),
    reason: !current ? 'superseded_receipt' : !isLocal ? 'no_remote_sound_receipt' : special ? 'replace_philia_body_three_stage' : changed ? 'replace_general_select' : 'same_weapon_regular_silent'});
}

/** 波形ファイル不要。二つのoscillatorが同じ単峰envelopeを共有する「一音」。 */
export class SwitchAudio {
  #context = null; #master = null; #voices = new Map(); #seen = new Set();
  #settings = {muted: false, volume: 0.55, verify: false};
  #disposed = false; #ownsContext = true;
  constructor({context = null, destination = null, settings = {}, maxVoices = 24} = {}) {
    if (!Number.isSafeInteger(maxVoices) || maxVoices < 1 || maxVoices > 24) throw new RangeError('invalid_voice_limit');
    this.maxVoices = maxVoices;
    if (context) { this.#context = context; this.#ownsContext = false; this.#connect(destination); }
    this.setSettings(settings);
  }
  #connect(destination = null) {
    this.#master = this.#context.createGain();
    this.#master.gain.value = 0;
    this.#master.connect(destination ?? this.#context.destination);
  }
  /** ユーザーgestureからのみ呼ぶ。verifyでcontext/音を作らず、保留音も再生しない。 */
  async unlock() {
    if (this.#disposed || this.#settings.verify) return false;
    if (!this.#context) {
      const Ctor = globalThis.AudioContext;
      if (!Ctor) return false;
      this.#context = new Ctor({latencyHint: 'interactive'}); this.#connect();
    }
    try { await this.#context.resume(); } catch { return false; }
    this.#applyVolume(); return this.#context.state === 'running';
  }
  setSettings(settings) {
    if ('volume' in settings && (!Number.isFinite(settings.volume) || settings.volume < 0 || settings.volume > 1)) throw new RangeError('invalid_volume');
    for (const k of ['muted','verify']) if (k in settings && typeof settings[k] !== 'boolean') throw new TypeError(`invalid_${k}`);
    this.#settings = {...this.#settings, ...settings};
    if (this.#settings.muted || this.#settings.verify || this.#settings.volume === 0) this.cancelAll();
    this.#applyVolume();
  }
  #applyVolume() {
    if (!this.#master || !this.#context) return;
    const now = this.#context.currentTime;
    this.#master.gain.cancelScheduledValues(now);
    this.#master.gain.setValueAtTime(this.#settings.muted || this.#settings.verify ? 0 : this.#settings.volume*0.38, now);
  }
  playOnce(id, variant, permitted = true) {
    if (this.#disposed || this.#seen.has(id)) return {played: false, reason: 'already_consumed_or_disposed'};
    if (!DESIGN[variant]) throw new RangeError('invalid_variant');
    this.#seen.add(id); // mute/locked の時も消費し、unmuteで遅延再生しない。
    if (!permitted) return {played: false, reason: 'route_silent'};
    if (this.#settings.verify || this.#settings.muted || this.#settings.volume === 0) return {played: false, reason: 'silent_settings'};
    const c = this.#context;
    if (!c || c.state !== 'running') return {played: false, reason: 'locked_no_queue'};
    if (this.#voices.size >= this.maxVoices) return {played: false, reason: 'voice_capacity_no_queue'};
    const d = DESIGN[variant], now = c.currentTime, start = now+0.004, duration = d.soundMs/1000;
    const envelope = c.createGain(); envelope.gain.value = 0; envelope.connect(this.#master);
    const amplitude = 0.24/Math.sqrt(Math.max(1,this.#voices.size+1));
    // sin²の単峰。start/stopの段差・繰返し・三段トランジェントを持たない。
    const curve = Float32Array.from({length: 97}, (_,i) => amplitude*Math.sin(Math.PI*i/96)**2*Math.exp(-1.6*i/96));
    envelope.gain.setValueCurveAtTime(curve,start,duration);
    const oscillators = [], partialGains = [];
    for (let i=0;i<2;i++) {
      const oscillator = c.createOscillator(), gain = c.createGain();
      oscillator.type = 'sine'; gain.gain.value = i === 0 ? 1 : 0.18;
      const ratio = i === 0 ? 1 : d.overtone;
      oscillator.frequency.setValueAtTime(d.toneHz*ratio,start);
      oscillator.frequency.exponentialRampToValueAtTime(d.toneEndHz*ratio,start+duration*0.78);
      oscillator.connect(gain); gain.connect(envelope);
      oscillator.start(start); oscillator.stop(start+duration+0.01);
      oscillators.push(oscillator); partialGains.push(gain);
    }
    const voice = {oscillators,partialGains,envelope}; this.#voices.set(id,voice);
    oscillators[0].onended = () => { if (this.#voices.get(id) === voice) this.#disconnect(id,voice); };
    return {played: true, reason: 'one_receipt_one_envelope', start, duration};
  }
  #disconnect(id, voice) {
    for (const o of voice.oscillators) { try { o.disconnect(); } catch {} }
    for (const g of voice.partialGains) { try { g.disconnect(); } catch {} }
    try { voice.envelope.disconnect(); } catch {}
    this.#voices.delete(id);
  }
  cancel(id) {
    const voice = this.#voices.get(id); if (!voice) return;
    // 秘匿・退出・muteでは遅い余韻を残さずbusから即座に切断。
    try { voice.envelope.disconnect(); } catch {}
    for (const o of voice.oscillators) { try { o.stop(); } catch {} }
    this.#disconnect(id,voice);
  }
  cancelAll() { for (const id of [...this.#voices.keys()]) this.cancel(id); }
  get activeVoiceCount() { return this.#voices.size; }
  get settings() { return {...this.#settings}; }
  async dispose() {
    if (this.#disposed) return;
    this.cancelAll(); this.#disposed = true;
    try { this.#master?.disconnect(); } catch {}
    if (this.#ownsContext && this.#context) { try { await this.#context.close(); } catch {} }
  }
}
