export class FiniteSfxGate {
  constructor({ verify = false, contextFactory = () => new AudioContext(), bufferLoader } = {}) {
    this.verify = verify;
    this.contextFactory = contextFactory;
    this.bufferLoader = bufferLoader;
    this.context = null;
    this.buffer = null;
    this.gesture = false;
    this.gpuReady = false;
    this.firstSubmission = false;
    this.voices = new Set();
    this.gains = new Map();
    this.event = null;
    this.lastStartedEventId = null;
    this.starts = 0;
    this.closed = false;
    this.enabled = false;
  }

  async activateFromGesture() {
    if (this.verify || this.closed) return this.snapshot();
    this.gesture = true;
    this.enabled = true;
    this.context ??= this.contextFactory();
    await this.context.resume?.();
    if (this.bufferLoader && !this.buffer) this.buffer = await this.bufferLoader(this.context);
    this.#startIfReady();
    return this.snapshot();
  }

  setEvent(event) {
    if (this.verify || this.closed) return false;
    this.event = event && typeof event.eventId === 'string' ? { ...event } : null;
    this.#startIfReady();
    return Boolean(this.event);
  }

  setMuted(muted) {
    if (this.verify || this.closed) return;
    this.enabled = !muted;
    for (const gain of this.gains.values()) gain.gain.value = this.enabled ? .62 : 0;
  }

  setGpuState({ ready = this.gpuReady, submitted = this.firstSubmission } = {}) {
    if (this.verify || this.closed) return;
    this.gpuReady = ready;
    this.firstSubmission = submitted;
    this.#startIfReady();
  }

  startEvent({ eventId, ageMs = 0, playbackRate = 1, durationMs, at = this.context?.currentTime }) {
    if (this.verify || this.closed || !this.gesture || !this.gpuReady || !this.firstSubmission ||
        !this.context || !this.buffer || !Number.isFinite(ageMs) || ageMs < 0 ||
        !Number.isFinite(playbackRate) || playbackRate <= 0) return false;
    const eventDuration = Number.isFinite(durationMs) ? durationMs / 1000 : this.buffer.duration;
    if (eventDuration <= 0 || ageMs / 1000 >= eventDuration) return false;
    const playbackRateForEvent = Number.isFinite(durationMs) ? this.buffer.duration / eventDuration : playbackRate;
    const offset = Number.isFinite(durationMs) ? ageMs / 1000 / eventDuration * this.buffer.duration : ageMs / 1000 * playbackRate;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffer;
    source.playbackRate.value = playbackRateForEvent;
    gain.gain.value = this.enabled ? .62 : 0;
    source.connect(gain);
    gain.connect(this.context.destination);
    this.voices.add(source);
    this.gains.set(source, gain);
    source.onended = () => { this.voices.delete(source); this.gains.delete(source); };
    source.start(Math.max(this.context.currentTime, at ?? this.context.currentTime), offset);
    this.starts++;
    this.lastEventId = eventId ?? null;
    if (eventId) this.lastStartedEventId = eventId;
    return true;
  }

  #startIfReady() {
    if (this.verify || !this.gesture || !this.gpuReady || !this.firstSubmission || !this.buffer || !this.event ||
        this.lastStartedEventId === this.event.eventId) return;
    this.startEvent(this.event);
  }

  snapshot() {
    return { verify: this.verify, enabled: this.enabled && !this.verify, audioGain: this.verify ? 0 : (this.enabled ? .62 : 0),
      audioState: this.verify ? 'not-created' : (this.context?.state ?? 'not-created'), starts: this.verify ? 0 : this.starts,
      voices: this.verify ? 0 : this.voices.size, contextCreated: !this.verify && Boolean(this.context) };
  }

  async close() {
    if (this.verify || this.closed) return;
    this.closed = true;
    for (const voice of this.voices) { try { voice.stop(); } catch {} }
    this.voices.clear();
    this.gains.clear();
    if (this.context) await this.context.close();
  }
}
