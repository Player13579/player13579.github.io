export class FiniteSfxGate {
  constructor({ verify = false, contextFactory = () => new AudioContext(), bufferLoader } = {}) {
    this.verify = Boolean(verify);
    this.contextFactory = contextFactory;
    this.bufferLoader = bufferLoader;
    this.context = null;
    this.buffer = null;
    this.gesture = false;
    this.activationPending = false;
    this.activationBoundary = 0;
    this.cancelledThroughGeneration = 0;
    this.event = null;
    this.completedFrame = null;
    this.lastStartedGeneration = 0;
    this.voices = new Set();
    this.gains = new Map();
    this.starts = 0;
    this.closed = false;
    this.enabled = false;
  }

  async activateFromGesture() {
    if (this.verify) return this.snapshot('silent', 'verification mode is permanently muted');
    if (this.closed) return this.snapshot('unavailable', 'SFX gate is closed');

    // A gesture authorizes only causes that become current after this call.
    this.activationBoundary = Math.max(this.activationBoundary, this.event?.generation ?? this.cancelledThroughGeneration);
    this.gesture = false;
    this.enabled = false;
    this.activationPending = true;
    try {
      this.context ??= this.contextFactory();
      if (typeof this.context?.resume === 'function') await this.context.resume();
      if (this.context?.state !== 'running') return this.#activationFailure('AudioContext did not enter running state');
      if (this.bufferLoader && !this.buffer) this.buffer = await this.bufferLoader(this.context);
      if (this.context?.state !== 'running') return this.#activationFailure('AudioContext stopped while loading the authored sound');
      if (!this.buffer) return this.#activationFailure('Authored sound buffer is unavailable');
      this.gesture = true;
      this.enabled = true;
      this.activationPending = false;
      this.#startIfReady();
      return this.snapshot('active', 'AudioContext running; authored SFX enabled');
    } catch (error) {
      return this.#activationFailure(error?.message || 'Audio activation failed');
    }
  }

  #activationFailure(reason) {
    this.activationPending = false;
    this.gesture = false;
    this.enabled = false;
    return this.snapshot('unsupported', reason);
  }

  setEvent(event) {
    if (this.verify || this.closed) return false;
    if (!event) {
      if (this.event) this.cancelledThroughGeneration = Math.max(this.cancelledThroughGeneration, this.event.generation);
      this.event = null;
      this.completedFrame = null;
      return false;
    }
    if (typeof event.eventId !== 'string' || !event.eventId || !Number.isInteger(event.generation) || event.generation < 1 ||
        !Number.isFinite(event.ageMs) || !Number.isFinite(event.durationMs)) return false;
    if (this.event && (this.event.eventId !== event.eventId || this.event.generation !== event.generation)) {
      this.cancelledThroughGeneration = Math.max(this.cancelledThroughGeneration, this.event.generation);
      this.completedFrame = null;
    }
    this.event = { ...event };
    return true;
  }

  cancelCurrentCause() {
    if (this.verify || this.closed) return;
    if (this.event) this.cancelledThroughGeneration = Math.max(this.cancelledThroughGeneration, this.event.generation);
    this.completedFrame = null;
  }

  setMuted(muted) {
    if (this.verify || this.closed) return;
    if (muted) {
      this.enabled = false;
      for (const gain of this.gains.values()) gain.gain.value = 0;
      return;
    }
    this.activationBoundary = Math.max(this.activationBoundary, this.event?.generation ?? this.cancelledThroughGeneration);
    this.enabled = Boolean(this.gesture && this.context?.state === 'running' && this.buffer);
    for (const gain of this.gains.values()) gain.gain.value = this.enabled ? .62 : 0;
    this.#startIfReady();
  }

  confirmGpuFrame({ causeId, generation, frameId, ageMs, durationMs, visible, held }) {
    if (this.verify || this.closed || visible !== true || held === true || !Number.isInteger(frameId) || frameId < 1 ||
        !this.event || this.event.eventId !== causeId || this.event.generation !== generation ||
        generation <= this.cancelledThroughGeneration || generation <= this.activationBoundary ||
        !Number.isFinite(ageMs) || !Number.isFinite(durationMs) || ageMs < 0 || ageMs >= durationMs) return false;
    this.completedFrame = { causeId, generation, frameId, ageMs, durationMs };
    return this.#startIfReady();
  }

  startEvent(event = this.completedFrame) {
    if (this.verify || this.closed || !this.gesture || !this.enabled || this.context?.state !== 'running' || !this.buffer ||
        !event || !this.completedFrame || event.causeId !== this.completedFrame.causeId ||
        event.generation !== this.completedFrame.generation || event.generation <= this.activationBoundary ||
        event.generation <= this.cancelledThroughGeneration || this.lastStartedGeneration === event.generation ||
        !Number.isFinite(event.ageMs) || event.ageMs < 0 || !Number.isFinite(event.durationMs) || event.durationMs < 900 ||
        event.ageMs >= event.durationMs) return false;
    const durationSeconds = event.durationMs / 1000;
    if (durationSeconds <= 0) return false;
    const playbackRateForEvent = this.buffer.duration / durationSeconds;
    const offset = event.ageMs / 1000 / durationSeconds * this.buffer.duration;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffer;
    source.playbackRate.value = playbackRateForEvent;
    gain.gain.value = .62;
    source.connect(gain);
    gain.connect(this.context.destination);
    this.voices.add(source);
    this.gains.set(source, gain);
    source.onended = () => { this.voices.delete(source); this.gains.delete(source); };
    source.start(this.context.currentTime, offset);
    this.starts++;
    this.lastStartedGeneration = event.generation;
    return true;
  }

  #startIfReady() {
    if (this.verify || this.closed || !this.gesture || !this.enabled || this.context?.state !== 'running' || !this.buffer ||
        !this.completedFrame || this.completedFrame.generation <= this.activationBoundary ||
        this.completedFrame.generation <= this.cancelledThroughGeneration ||
        this.event?.eventId !== this.completedFrame.causeId || this.event?.generation !== this.completedFrame.generation) return false;
    return this.startEvent(this.completedFrame);
  }

  snapshot(state, reason = '') {
    const audioState = this.verify ? 'not-created' : (this.context?.state ?? 'not-created');
    const enabled = !this.verify && !this.closed && this.enabled && this.gesture && audioState === 'running';
    const truthfulState = this.verify ? 'silent' : this.closed ? 'unavailable' : state ?? (enabled ? 'active' : this.activationPending ? 'pending' : this.context ? 'unsupported' : 'ready');
    return { state: truthfulState, reason: reason || '', enabled, audioState,
      audioGain: enabled ? .62 : 0, starts: this.verify ? 0 : this.starts,
      voices: this.verify ? 0 : this.voices.size, contextCreated: !this.verify && Boolean(this.context) };
  }

  async close() {
    if (this.closed) return;
    this.cancelCurrentCause();
    this.closed = true;
    this.gesture = false;
    this.enabled = false;
    for (const voice of this.voices) { try { voice.stop(); } catch {} }
    this.voices.clear();
    this.gains.clear();
    if (this.context && this.context.state !== 'closed') await this.context.close();
  }
}

export class CurrentGpuCauseSfx {
  constructor(gate, readCurrentState) {
    this.gate = gate;
    this.readCurrentState = readCurrentState;
    this.current = null;
    this.nextGeneration = 0;
    this.lifecycle = 0;
    this.closed = false;
  }

  setCause(cause) {
    if (this.closed || this.gate.verify) return null;
    if (!cause || typeof cause.eventId !== 'string' || !cause.eventId) {
      if (this.current) this.gate.cancelCurrentCause();
      this.current = null;
      this.gate.setEvent(null);
      return null;
    }
    if (!this.current || this.current.eventId !== cause.eventId) {
      if (this.current) this.gate.cancelCurrentCause();
      this.current = { ...cause, generation: ++this.nextGeneration };
    } else {
      this.current = { ...this.current, ...cause, generation: this.current.generation };
    }
    this.gate.setEvent(this.current);
    return { ...this.current };
  }

  submittedFrame(frameId, completion) {
    const captured = this.current ? { eventId: this.current.eventId, generation: this.current.generation } : null;
    const lifecycle = this.lifecycle;
    return Promise.resolve(completion).then(() => {
      if (!captured || this.closed || lifecycle !== this.lifecycle || this.current?.eventId !== captured.eventId ||
          this.current?.generation !== captured.generation) return false;
      let live;
      try { live = this.readCurrentState(); } catch { return false; }
      if (!live || live.visible !== true || live.held === true || live.retired === true ||
          live.causeId !== captured.eventId || !Number.isFinite(live.ageMs) || !Number.isFinite(live.durationMs) ||
          live.ageMs < 0 || live.ageMs >= live.durationMs) return false;
      return this.gate.confirmGpuFrame({ causeId: captured.eventId, generation: captured.generation, frameId,
        ageMs: live.ageMs, durationMs: live.durationMs, visible: true, held: false });
    }, () => false);
  }

  invalidate() {
    if (this.closed) return;
    this.lifecycle++;
    this.gate.cancelCurrentCause();
  }

  async close() {
    if (this.closed) return;
    this.invalidate();
    this.closed = true;
    await this.gate.close();
  }
}
