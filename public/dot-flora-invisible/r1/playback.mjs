// Playback clock and one-shot SFX ownership for a single visual cue.
// Audio failures are intentionally local: onState is diagnostic and cannot
// turn a sound failure into a rendering failure.
export function createPlayback({
  clock = () => performance.now(),
  audioContext,
  createAudioBuffer,
  durationMs = 1600,
  verify = false,
  onState = () => {},
} = {}) {
  if (typeof clock !== 'function') throw new TypeError('clock must be a function');
  if (!(Number.isFinite(durationMs) && durationMs > 0)) throw new RangeError('durationMs must be positive and finite');

  let state = 'stopped';
  let generation = 0;
  let causeId = null;
  let sourceOrigin = null;
  let heldAge = null;
  let muted = false;
  let disposed = false;
  let unlockEpoch = 0;
  let activeSource = null;
  let activeSourceCause = null;
  let startedCauses = new Set();
  let pendingCauses = new Set();
  let lastClockValue = null;

  const emit = (event, detail = {}) => {
    try { onState({ event, ...detail }); } catch { /* diagnostics never break playback/rendering */ }
  };
  const now = () => {
    const value = Number(clock());
    if (!Number.isFinite(value) || value < 0 || (lastClockValue !== null && value < lastClockValue)) {
      throw new TypeError('clock must return a finite, nonnegative, monotonic timestamp');
    }
    lastClockValue = value;
    return value;
  };
  const validCause = value => (typeof value === 'string' && value.trim().length > 0) || (typeof value === 'number' && Number.isFinite(value));
  const stopSource = () => {
    const old = activeSource;
    activeSource = null;
    activeSourceCause = null;
    if (!old) return;
    try { old.stop(); } catch { /* already ended */ }
    try { old.disconnect?.(); } catch { /* best effort */ }
  };
  const ageAt = timestamp => sourceOrigin === null ? 0 : timestamp - sourceOrigin;
  const expireIfNeeded = timestamp => {
    if (state === 'playing' && sourceOrigin !== null && ageAt(timestamp) >= durationMs) {
      state = 'stopped';
      stopSource();
      emit('expired', { causeId, generation, ageMs: ageAt(timestamp) });
    }
  };
  const snapshot = () => {
    let timestamp = now();
    if (!disposed) expireIfNeeded(timestamp);
    if (disposed) return { state: 'disposed', ageMs: sourceOrigin === null ? 0 : ageAt(timestamp), generation, causeId, sourceOrigin, active: false, muted };
    const ageMs = state === 'held' ? heldAge : ageAt(timestamp);
    return { state, ageMs, generation, causeId, sourceOrigin, active: sourceOrigin !== null && ageMs < durationMs && (state === 'playing' || state === 'held'), muted };
  };
  const stop = () => {
    if (disposed) return false;
    unlockEpoch++;
    stopSource();
    state = 'stopped';
    heldAge = null;
    emit('stopped', { causeId, generation });
    return true;
  };
  const begin = nextCauseId => {
    if (disposed) return false;
    generation++;
    unlockEpoch++;
    stopSource();
    heldAge = null;
    causeId = null;
    sourceOrigin = null;
    state = 'stopped';
    if (!validCause(nextCauseId)) {
      emit('begin-refused', { reason: 'invalid-cause', generation });
      return false;
    }
    const origin = now();
    causeId = nextCauseId;
    sourceOrigin = origin;
    state = 'playing';
    emit('begin', { causeId, generation, sourceOrigin });
    return true;
  };
  const hold = ageMs => {
    if (disposed || sourceOrigin === null || !Number.isFinite(ageMs) || ageMs < 0) return false;
    const timestamp = now();
    expireIfNeeded(timestamp);
    if (state !== 'playing') return false;
    heldAge = ageMs;
    stopSource();
    state = heldAge >= durationMs ? 'stopped' : 'held';
    emit('hold', { causeId, generation, ageMs: heldAge });
    return state === 'held';
  };
  const resume = () => {
    if (disposed || state !== 'held' || sourceOrigin === null) return false;
    const timestamp = now();
    if (ageAt(timestamp) >= durationMs) { state = 'stopped'; heldAge = null; stopSource(); return false; }
    if (heldAge >= durationMs) { state = 'stopped'; heldAge = null; return false; }
    // sourceOrigin is the immutable cause origin. Resume lets the shared
    // monotonic clock continue from that origin; it never rewrites the cause.
    heldAge = null;
    state = 'playing';
    emit('resume', { causeId, generation, sourceOrigin });
    return true;
  };
  const setMuted = value => {
    if (disposed) return false;
    muted = Boolean(value);
    unlockEpoch++;
    if (muted) stopSource();
    emit('mute', { muted, causeId, generation });
    return muted;
  };
  const unlockFromGesture = async () => {
    if (disposed || muted || !audioContext || typeof audioContext.resume !== 'function') return false;
    const epoch = ++unlockEpoch;
    try {
      if (audioContext.state === 'suspended') await audioContext.resume();
      if (disposed || muted || epoch !== unlockEpoch) return false;
      const ok = audioContext.state === 'running';
      emit(ok ? 'audio-unlocked' : 'audio-unlock-pending', { state: audioContext.state });
      return ok;
    } catch (error) {
      if (!disposed && epoch === unlockEpoch) emit('audio-unlock-error', { error: String(error) });
      return false;
    }
  };
  const completed = async proof => {
    if (disposed || verify || muted || !proof || !audioContext || typeof createAudioBuffer !== 'function') return false;
    const current = snapshot();
    const { causeId: proofCause, generation: proofGeneration, sourceOrigin: proofOrigin,
      submittedAt, completedAt, ageAtSubmit } = proof;
    if (state !== 'playing' || !current.active || proofCause !== causeId || proofGeneration !== generation || proofOrigin !== sourceOrigin) return false;
    if (![proofOrigin, submittedAt, completedAt, ageAtSubmit].every(Number.isFinite) ||
        proofOrigin > submittedAt || submittedAt > completedAt ||
        Math.abs(ageAtSubmit - (submittedAt - proofOrigin)) > 1e-3 ||
        ageAtSubmit < 0 || ageAtSubmit >= durationMs || startedCauses.has(proofCause) || pendingCauses.has(proofCause)) return false;
    if (completedAt > now()) return false;

    const ownerGeneration = generation;
    const ownerCause = causeId;
    const ownerOrigin = sourceOrigin;
    const epoch = unlockEpoch;
    pendingCauses.add(ownerCause);
    let node;
    try {
      const buffer = await createAudioBuffer(audioContext);
      // Recheck after any async buffer creation: stale completion must not revive sound.
      const fresh = snapshot();
      if (!buffer || disposed || verify || muted || state !== 'playing' || generation !== ownerGeneration || causeId !== ownerCause || sourceOrigin !== ownerOrigin || unlockEpoch !== epoch || !fresh.active || fresh.ageMs >= durationMs) return false;
      if (audioContext.state !== 'running') { emit('audio-start-refused', { reason: 'context-not-running', state: audioContext.state, causeId }); return false; }
      node = audioContext.createBufferSource();
      if (!node) throw new Error('createBufferSource returned no source');
      node.buffer = buffer;
      node.connect(audioContext.destination);
      // The visual clock is authoritative. Offset playback to its actual age;
      // do not use submittedAt or completion time as a new audio origin.
      const actualAge = fresh.ageMs;
      if (actualAge >= durationMs) { try { node.disconnect?.(); } catch {} return false; }
      activeSource = node;
      activeSourceCause = ownerCause;
      node.onended = () => { if (activeSource === node) { activeSource = null; activeSourceCause = null; } };
      node.start(0, actualAge / 1000, (durationMs - actualAge) / 1000);
      startedCauses.add(ownerCause);
      emit('audio-started', { causeId: ownerCause, generation: ownerGeneration, ageMs: actualAge, offsetSeconds: actualAge / 1000 });
      return true;
    } catch (error) {
      if (node) {
        if (activeSource === node) { activeSource = null; activeSourceCause = null; }
        try { node.stop(); } catch {}
        try { node.disconnect?.(); } catch {}
      }
      emit('audio-error', { causeId: ownerCause, generation: ownerGeneration, error: String(error) });
      return false;
    } finally {
      pendingCauses.delete(ownerCause);
    }
  };

  return {
    begin, snapshot, stop, hold, resume, setMuted, unlockFromGesture, completed,
    dispose() {
      if (disposed) return false;
      disposed = true;
      unlockEpoch++;
      stopSource();
      state = 'disposed';
      emit('disposed', { causeId, generation });
      return true;
    },
  };
}
