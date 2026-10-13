// Technical retry/lifecycle derivative of the frozen R2 procedural throw cue.
// PCM generation, filters, gain, and timing are intentionally unchanged.
export function createThrowSfx({ AudioContextClass = globalThis.AudioContext } = {}) {
  if (typeof AudioContextClass !== 'function') throw new Error('Web Audio unavailable');
  const context = new AudioContextClass();
  const played = new Set();
  const voices = new Map();
  let disposed = false;
  async function unlock() {
    if (disposed) throw new Error('SFX disposed');
    return context.resume();
  }
  function play({ causeId, speedWorldPerMs, durationMs = 600, sourceAgeMs = 0, remainingDurationMs = null, getSourceAgeMs = null, verify = false, enabled = true,
    visibleFrameComplete = false } = {}) {
    if (disposed) return { status: 'disposed' };
    if (verify || !enabled) return { status: 'silent-gated' };
    if (!visibleFrameComplete) return { status: 'await-visible-frame' };
    const id = String(causeId || '');
    if (!id || !Number.isFinite(speedWorldPerMs) || speedWorldPerMs < 0 || !Number.isFinite(durationMs) || durationMs <= 0 ||
        !Number.isFinite(sourceAgeMs) || sourceAgeMs < 0 ||
        (remainingDurationMs != null && (!Number.isFinite(remainingDurationMs) || remainingDurationMs < 0)))
      throw new TypeError('SFX needs stable throw cause, nonnegative physical speed, and duration');
    if (played.has(id)) return { status: 'duplicate-suppressed', causeId: id };

    const speed = Math.max(0, Math.min(1, speedWorldPerMs / 0.4));
    const seconds = Math.max(.08, Math.min(.6, durationMs / 1000));
    const eventDurationMs = seconds * 1000;
    let admissionAgeMs = sourceAgeMs;
    let remainingMs = remainingDurationMs == null ? eventDurationMs - admissionAgeMs : remainingDurationMs;
    if (sourceAgeMs >= eventDurationMs || remainingMs <= 0 || Math.abs((sourceAgeMs + remainingMs) - eventDurationMs) > 1)
      return { status: 'source-expired', causeId: id, sourceAgeMs, remainingDurationMs: remainingMs };
    let source, high, band, gain, stage = 'buffer-allocation', startAttempted = false;
    let cleaned = false;
    const cleanup = ({ stop = false } = {}) => {
      if (cleaned) return;
      cleaned = true;
      if (stop && source && startAttempted) { try { source.stop(); } catch {} }
      for (const node of [source, high, band, gain]) { try { node?.disconnect(); } catch {} }
    };
    try {
      const length = Math.ceil(context.sampleRate * seconds);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1);

      stage = 'source-allocation';
      source = context.createBufferSource(); source.buffer = buffer;
      stage = 'filter-allocation';
      high = context.createBiquadFilter(); high.type = 'highpass'; high.frequency.value = 160 + speed * 260;
      band = context.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 850 + speed * 2100; band.Q.value = .72;
      stage = 'gain-allocation';
      gain = context.createGain();

      stage = 'graph-connection';
      source.connect(high); high.connect(band); band.connect(gain); gain.connect(context.destination);
      source.addEventListener('ended', () => {
        voices.delete(id);
        cleanup();
      }, { once: true });

      stage = 'source-start';
      // Buffer construction can run long enough to cross the owning event's end.
      // Revalidate the original source clock immediately before scheduling audio.
      if (typeof getSourceAgeMs === 'function') {
        const sampledAgeMs = getSourceAgeMs();
        if (!Number.isFinite(sampledAgeMs) || sampledAgeMs < 0) {
          cleanup();
          return { status: 'source-inactive', causeId: id };
        }
        admissionAgeMs = sampledAgeMs;
        remainingMs = eventDurationMs - admissionAgeMs;
        if (remainingMs <= 0) {
          cleanup();
          return { status: 'source-expired', causeId: id, sourceAgeMs: admissionAgeMs, remainingDurationMs: 0 };
        }
      }
      const remainingSeconds = remainingMs / 1000;
      const ageSeconds = admissionAgeMs / 1000;
      const t = context.currentTime;
      const peak = .035 + speed * .055;
      if (admissionAgeMs === 0) {
        // Preserve the original onset path byte-for-byte in timing for existing callers.
        gain.gain.setValueAtTime(.0001, t); gain.gain.linearRampToValueAtTime(peak, t + .018);
        gain.gain.setValueAtTime(peak, t + seconds * .24);
        gain.gain.exponentialRampToValueAtTime(.0001, t + seconds);
      } else {
        const holdUntil = seconds * .24;
        const envelopeAt = age => {
          if (age < .018) return .0001 + (peak - .0001) * Math.max(0, age) / .018;
          if (age < holdUntil) return peak;
          const phase = Math.max(0, Math.min(1, (age - holdUntil) / (seconds - holdUntil)));
          return peak * Math.pow(.0001 / peak, phase);
        };
        // A short de-click ramp reaches the already-running envelope level; it does
        // not replay the cue's 18 ms launch attack after a late gesture.
        const rampSeconds = Math.min(.005, remainingSeconds / 3,
          ageSeconds < .018 ? .018 - ageSeconds : remainingSeconds / 3);
        gain.gain.setValueAtTime(.0001, t);
        gain.gain.linearRampToValueAtTime(envelopeAt(Math.min(seconds, ageSeconds + rampSeconds)), t + rampSeconds);
        if (ageSeconds + rampSeconds < .018) gain.gain.linearRampToValueAtTime(peak, t + (.018 - ageSeconds));
        if (ageSeconds < holdUntil) gain.gain.setValueAtTime(peak, t + (holdUntil - ageSeconds));
        gain.gain.exponentialRampToValueAtTime(.0001, t + remainingSeconds);
      }
      startAttempted = true;
      source.start(t, ageSeconds, remainingSeconds);
      // Admission is committed only after WebAudio confirms the source started.
      played.add(id);
      voices.set(id, source);
      try { source.stop(t + remainingSeconds); }
      catch (error) {
        // start() already succeeded. The buffer is finite and will end naturally;
        // keep this cause consumed and report the scheduled-stop failure.
        return { status: 'started', causeId: id, speed, durationSeconds: remainingSeconds,
          ...(admissionAgeMs === 0 && remainingDurationMs == null ? {} : { sourceAgeMs: admissionAgeMs, remainingDurationMs: remainingMs }),
          centerHz: 850 + speed * 2100, stopSchedulingError: String(error?.message || error) };
      }
      return { status: 'started', causeId: id, speed, durationSeconds: remainingSeconds,
        ...(admissionAgeMs === 0 && remainingDurationMs == null ? {} : { sourceAgeMs: admissionAgeMs, remainingDurationMs: remainingMs }),
        centerHz: 850 + speed * 2100 };
    } catch (error) {
      cleanup({ stop: true });
      return { status: 'retryable-failure', causeId: id, stage, message: String(error?.message || error) };
    }
  }
  function stop(causeId) {
    const source = voices.get(String(causeId || ''));
    if (!source) return false;
    try { source.stop(); } catch {}
    return true;
  }
  function stopAll() { for (const source of voices.values()) { try { source.stop(); } catch {} } }
  async function dispose() {
    if (disposed) return;
    disposed = true; stopAll(); await context.close(); played.clear(); voices.clear();
  }
  return Object.freeze({ unlock, play, stop, stopAll, dispose, get playedCauses() { return [...played]; } });
}
