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
  function play({ causeId, speedWorldPerMs, durationMs = 600, verify = false, enabled = true,
    visibleFrameComplete = false } = {}) {
    if (disposed) return { status: 'disposed' };
    if (verify || !enabled) return { status: 'silent-gated' };
    if (!visibleFrameComplete) return { status: 'await-visible-frame' };
    const id = String(causeId || '');
    if (!id || !Number.isFinite(speedWorldPerMs) || speedWorldPerMs < 0 || !Number.isFinite(durationMs) || durationMs <= 0)
      throw new TypeError('SFX needs stable throw cause, nonnegative physical speed, and duration');
    if (played.has(id)) return { status: 'duplicate-suppressed', causeId: id };

    const speed = Math.max(0, Math.min(1, speedWorldPerMs / 0.4));
    const seconds = Math.max(.08, Math.min(.6, durationMs / 1000));
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
      const t = context.currentTime;
      gain.gain.setValueAtTime(.0001, t); gain.gain.linearRampToValueAtTime(.035 + speed * .055, t + .018);
      gain.gain.setValueAtTime(.035 + speed * .055, t + seconds * .24);
      gain.gain.exponentialRampToValueAtTime(.0001, t + seconds);

      stage = 'graph-connection';
      source.connect(high); high.connect(band); band.connect(gain); gain.connect(context.destination);
      source.addEventListener('ended', () => {
        voices.delete(id);
        cleanup();
      }, { once: true });

      stage = 'source-start';
      startAttempted = true;
      source.start(t);
      // Admission is committed only after WebAudio confirms the source started.
      played.add(id);
      voices.set(id, source);
      try { source.stop(t + seconds); }
      catch (error) {
        // start() already succeeded. The buffer is finite and will end naturally;
        // keep this cause consumed and report the scheduled-stop failure.
        return { status: 'started', causeId: id, speed, durationSeconds: seconds,
          centerHz: 850 + speed * 2100, stopSchedulingError: String(error?.message || error) };
      }
      return { status: 'started', causeId: id, speed, durationSeconds: seconds, centerHz: 850 + speed * 2100 };
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
