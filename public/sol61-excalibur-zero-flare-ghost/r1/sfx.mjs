const VERSION = 'excalibur-zero-flare-ghost-sol61-r1';
const hashSeed = text => { let value = 2166136261; for (const char of String(text)) value = Math.imul(value ^ char.charCodeAt(0), 16777619); return value >>> 0; };
const requireValue = (value, message) => { if (!value) throw new Error(message); return value; };

export function createExcaliburZeroSfx({ AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext,
  getCurrentEffectAge = () => null, isVerify = false } = {}) {
  let context = null, enabled = false, disposed = false, generation = 0, activeCauseId = null;
  let currentAge = null;
  const sources = new Set();
  let sourceCreations = 0;
  function snapshot() { return Object.freeze({ version: VERSION, verify: isVerify, enabled, disposed,
    causeId: activeCauseId, effectAgeMs: currentAge, contextState: context?.state || 'uncreated',
    contextCreations: context ? 1 : 0, sourceCreations }); }
  function stopSources() {
    for (const source of [...sources]) { try { source.stop(); } catch {} try { source.disconnect(); } catch {} }
    sources.clear();
  }
  function noiseBuffer(durationMs, seed) {
    const rate = context.sampleRate || 44100, length = Math.ceil(rate * durationMs / 1000);
    const buffer = context.createBuffer(1, length, rate), channel = buffer.getChannelData(0);
    let state = seed >>> 0;
    for (let i = 0; i < length; i++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      channel[i] = (state / 0xffffffff) * 2 - 1;
    }
    return buffer;
  }
  function track(source) {
    sources.add(source); sourceCreations++;
    source.onended = () => { sources.delete(source); try { source.disconnect(); } catch {} };
    return source;
  }
  function playCause(causeId) {
    stopSources(); activeCauseId = String(causeId); currentAge = 0;
    const now = context.currentTime, seed = hashSeed(causeId);
    const burst = (offsetMs, durationMs, highpass, lowpass, peak, attackMs, releaseMs, salt) => {
      const source = track(context.createBufferSource()); source.buffer = noiseBuffer(durationMs, seed ^ salt);
      const high = context.createBiquadFilter(); high.type = 'highpass'; high.frequency.setValueAtTime(highpass, now + offsetMs / 1000);
      const low = context.createBiquadFilter(); low.type = 'lowpass'; low.frequency.setValueAtTime(lowpass, now + offsetMs / 1000);
      const gain = context.createGain(), start = now + offsetMs / 1000, end = start + durationMs / 1000;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(peak, start + attackMs / 1000);
      gain.gain.setValueAtTime(peak, end - releaseMs / 1000); gain.gain.linearRampToValueAtTime(0, end);
      source.connect(high); high.connect(low); low.connect(gain); gain.connect(context.destination); source.start(start); source.stop(end);
    };
    burst(0, 85, 450, 1900, 0.055, 5, 8, 0x1a2b3c);
    burst(55, 170, 1100, 6500, 0.09, 8, 140, 0x4d5e6f);
    for (const [initial, final, peak] of [[440, 660, 0.025], [880, 990, 0.011]]) {
      const oscillator = track(context.createOscillator()), gain = context.createGain();
      const start = now + 0.07, end = start + 0.97;
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(initial, start); oscillator.frequency.linearRampToValueAtTime(final, end);
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(peak, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, end - 0.06); gain.gain.linearRampToValueAtTime(0, end);
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(end);
    }
  }
  async function activateFromGesture() {
    if (disposed) return { state: 'unavailable', reason: 'audio controller disposed' };
    if (isVerify || new URL(globalThis.location?.href || 'https://localhost/').searchParams.has('verify'))
      return { state: 'silent', reason: 'verification mode is hard-muted' };
    if (!AudioContextCtor) return { state: 'unsupported', reason: 'Web Audio is unavailable' };
    const token = ++generation;
    try {
      if (!context) context = new AudioContextCtor();
      if (context.state === 'suspended') await context.resume();
      if (disposed || token !== generation) return { state: 'stale', reason: 'audio activation superseded' };
      if (context.state !== 'running') return { state: 'unsupported', reason: 'audio context did not enter running state' };
      enabled = true;
      const age = Number(getCurrentEffectAge());
      if (activeCauseId && Number.isFinite(age) && age <= 1) playCause(activeCauseId);
      return { state: 'active', reason: Number.isFinite(age) && age > 1 ? 'enabled for the next cause; no late replay' : 'authored preview SFX enabled' };
    } catch { return { state: 'unsupported', reason: 'audio activation failed' }; }
  }
  function setCause(causeId, effectAgeMs = 0) {
    if (disposed || !causeId || String(causeId) === activeCauseId) { currentAge = Number.isFinite(effectAgeMs) ? effectAgeMs : currentAge; return snapshot(); }
    activeCauseId = String(causeId); currentAge = Number.isFinite(effectAgeMs) ? effectAgeMs : 0;
    if (enabled && !isVerify && currentAge <= 1) playCause(activeCauseId);
    return snapshot();
  }
  function setEffectAge(ageMs) { currentAge = Number.isFinite(ageMs) ? ageMs : null; }
  function stopCause(causeId) {
    if (causeId != null && activeCauseId !== String(causeId)) return false;
    generation++; stopSources(); activeCauseId = null; currentAge = null; return true;
  }
  function dispose() {
    if (disposed) return;
    disposed = true; generation++; enabled = false; stopSources();
    const active = context; context = null; active?.close?.().catch?.(() => {});
  }
  return Object.freeze({ activateFromGesture, setCause, setEffectAge, stopCause, dispose, get snapshot() { return snapshot(); } });
}
