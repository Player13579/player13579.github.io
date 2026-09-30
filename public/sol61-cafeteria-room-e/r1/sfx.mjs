import { CUES, SAMPLE_RATE, SCORE, synthesize } from './sfx-score.mjs';

const WAV_FILES = Object.freeze({
  vent: 'cafeteria-vent-r1.wav',
  steam: 'cafeteria-steam-r1.wav',
  purge: 'cafeteria-purge-r1.wav',
});
const VOICE_LIMIT = 4;

export class RoomSfx {
  constructor({ verify = false, clock = () => ({ cycle: 0, ageMs: 0 }) } = {}) {
    this.verify = !!verify;
    this.clock = clock;
    this.enabled = false;
    this.context = null;
    this.buffers = null;
    this.loading = null;
    this.voices = new Set();
    this.played = new Set();
    this.cycle = null;
    this.activationCutoffMs = 0;
    this.lastResult = 'idle';
  }

  async #load(context) {
    if (this.buffers) return this.buffers;
    if (this.loading) return this.loading;
    this.loading = Promise.all(Object.entries(WAV_FILES).map(async ([kind, file]) => {
      const response = await fetch(new URL(`./${file}`, import.meta.url), { cache: 'force-cache' });
      if (!response.ok) throw new Error(`SFX ${file}: HTTP ${response.status}`);
      const encoded = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(encoded.slice(0));
      const expectedSamples = Math.round(SCORE[kind].duration * SAMPLE_RATE);
      if (buffer.length !== expectedSamples || buffer.numberOfChannels !== 1 || buffer.sampleRate !== SAMPLE_RATE) {
        throw new Error(`SFX ${file}: unexpected decoded format`);
      }
      return [kind, buffer];
    })).then(entries => {
      this.buffers = Object.fromEntries(entries);
      this.lastResult = 'buffers-ready';
      return this.buffers;
    }).catch(error => {
      this.loading = null;
      throw error;
    });
    return this.loading;
  }

  async activateFromGesture() {
    if (this.verify) {
      this.enabled = false;
      this.lastResult = 'verify-silent';
      return this.snapshot();
    }
    const now = this.clock();
    this.#syncCycle(now.cycle);
    this.activationCutoffMs = now.ageMs;
    this.enabled = true;
    try {
      this.context ??= new AudioContext();
      const resumed = this.context.resume();
      const loading = this.#load(this.context);
      await resumed;
      await loading;
      // Loading/decode may outlast a cue; skip cues already passed when the gesture completes.
      const latest = this.clock();
      this.#syncCycle(latest.cycle);
      this.activationCutoffMs = latest.ageMs;
      this.lastResult = 'enabled';
    } catch (error) {
      this.enabled = false;
      this.#stopVoices();
      this.lastResult = `audio-error:${error?.message || error}`;
      throw error;
    }
    return this.snapshot();
  }

  setMuted(muted) {
    if (this.verify) {
      this.enabled = false;
      this.#stopVoices();
      this.lastResult = 'verify-silent';
      return this.snapshot();
    }
    this.enabled = !muted;
    if (muted) this.#stopVoices();
    this.lastResult = muted ? 'muted' : 'gesture-required';
    return this.snapshot();
  }

  #syncCycle(cycle) {
    if (this.cycle === cycle) return;
    this.#stopVoices();
    this.played.clear();
    this.cycle = cycle;
    this.activationCutoffMs = 0;
  }

  #play(kind, causeId) {
    if (!this.enabled || this.verify || !this.context || !this.buffers?.[kind]) return false;
    if (this.played.has(causeId) || this.voices.size >= VOICE_LIMIT) return false;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffers[kind];
    gain.gain.value = SCORE[kind].gain;
    source.connect(gain).connect(this.context.destination);
    const voice = { source, gain, causeId, kind };
    this.voices.add(voice);
    this.played.add(causeId);
    source.onended = () => {
      this.voices.delete(voice);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
    return true;
  }

  update(cycle, ageMs, { active = true, visible = true } = {}) {
    this.#syncCycle(cycle);
    if (!this.enabled || this.verify || !this.buffers) {
      return this.snapshot();
    }
    if (!active || !visible) {
      this.activationCutoffMs = Math.max(this.activationCutoffMs, ageMs);
      this.#stopVoices();
      return this.snapshot();
    }
    for (const cue of CUES) {
      if (cue.atMs < this.activationCutoffMs || ageMs < cue.atMs) continue;
      this.#play(cue.score, `${cycle}:${cue.cause}`);
    }
    return this.snapshot();
  }

  #stopVoices() {
    for (const voice of this.voices) {
      try { voice.source.stop(); } catch { /* already ended */ }
      try { voice.source.disconnect(); } catch { /* already disconnected */ }
      try { voice.gain.disconnect(); } catch { /* already disconnected */ }
    }
    this.voices.clear();
  }

  snapshot() {
    return {
      enabled: this.enabled && !this.verify,
      verify: this.verify,
      audioGain: this.enabled && !this.verify ? 'version-cue-gain' : 0,
      audioState: this.verify ? 'not-created' : (this.context?.state ?? 'not-created'),
      voiceCount: this.voices.size,
      voiceLimit: VOICE_LIMIT,
      loadedScores: Object.keys(this.buffers || {}),
      cycle: this.cycle,
      activatedAfterMs: this.activationCutoffMs,
      playedCauseIds: [...this.played],
      status: this.lastResult,
    };
  }

  dispose() {
    this.enabled = false;
    this.#stopVoices();
    this.played.clear();
    this.buffers = null;
    this.loading = null;
    const context = this.context;
    this.context = null;
    context?.close();
    this.lastResult = 'disposed';
  }
}

export const scoreWaveSamples = () => Object.fromEntries(Object.keys(SCORE).map(kind => [kind, synthesize(kind).length]));
