const VERIFY = typeof location !== 'undefined' && new URLSearchParams(location.search).has('verify');

export function createActivationAudio({ muted = false, verify = VERIFY,
  AudioContextClass = globalThis.AudioContext } = {}) {
  muted = Boolean(VERIFY || verify || muted);
  let context = null;
  let playedForRun = false;
  return Object.freeze({
    get muted() { return Boolean(muted); },
    reset() { playedForRun = false; },
    async unlockFromGesture() {
      if (muted || !AudioContextClass) return false;
      context ||= new AudioContextClass();
      await context.resume();
      return true;
    },
    async playActivation() {
      if (muted || playedForRun || !AudioContextClass) return false;
      playedForRun = true;
      const nodes = [];
      try {
        context ||= new AudioContextClass();
        await context.resume();
        const now = context.currentTime;
        const voice = ({ startHz, endHz, sweepSeconds, level }) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          nodes.push(oscillator, gain);
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(startHz, now);
          oscillator.frequency.exponentialRampToValueAtTime(endHz, now + sweepSeconds);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(level, now + 0.025);
          gain.gain.exponentialRampToValueAtTime(level * (0.035 / 0.065), now + 0.14);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.31);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(now);
          oscillator.stop(now + 0.32);
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        };
        // Two related tones resolve one standalone activation; pulses never call this owner.
        voice({ startHz: 510, endHz: 255, sweepSeconds: 0.24, level: 0.065 });
        voice({ startHz: 765, endHz: 510, sweepSeconds: 0.19, level: 0.065 * 0.28 });

        // A deterministic filtered intake follows the gather phase; no random or per-pulse sound.
        const sampleRate = context.sampleRate || 48000;
        const duration = 0.18;
        const buffer = context.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
        const samples = buffer.getChannelData(0);
        let seed = 0x414c4348;
        for (let index = 0; index < samples.length; index++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          samples[index] = (seed / 0x100000000) * 2 - 1;
        }
        const noise = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        nodes.push(noise, filter, gain);
        noise.buffer = buffer;
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(550, now + duration);
        filter.Q.setValueAtTime(2, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.018, now + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        noise.start(now);
        noise.stop(now + duration);
        noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
        return true;
      } catch (error) {
        for (const node of nodes) { try { node.disconnect(); } catch {} }
        throw error;
      }
    },
    async dispose() {
      const current = context;
      context = null;
      if (current && current.state !== 'closed') await current.close();
    }
  });
}
