export function createSfxBank() {
  let ctx = null;
  async function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx;
  }
  function env(gain, when, a, d, s = 0.0001) {
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(1.0, when + a);
    gain.gain.linearRampToValueAtTime(s, when + a + d);
    gain.gain.linearRampToValueAtTime(0.0001, when + a + d + 0.04);
  }
  async function play(event) {
    const ac = await ensure();
    const t0 = ac.currentTime + 0.02;
    const master = ac.createGain();
    master.gain.value = 0.18;
    master.connect(ac.destination);
    if (event === 'create') {
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(520, t0); osc.frequency.linearRampToValueAtTime(890, t0 + 0.20);
      env(g, t0, 0.01, 0.28, 0.12); osc.connect(g).connect(master); osc.start(t0); osc.stop(t0 + 0.36);
      const noise = makeNoise(ac, 0.18, 0.18, t0, 0.10, 'bandpass', 2400); noise.connect(master);
    } else if (event === 'absorb') {
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(780, t0); osc.frequency.exponentialRampToValueAtTime(290, t0 + 0.12);
      env(g, t0, 0.002, 0.18, 0.08); osc.connect(g).connect(master); osc.start(t0); osc.stop(t0 + 0.24);
      makeNoise(ac, 0.12, 0.16, t0, 0.08, 'bandpass', 1800).connect(master);
    } else if (event === 'fracture') {
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.type = 'square'; osc.frequency.setValueAtTime(640, t0); osc.frequency.exponentialRampToValueAtTime(180, t0 + 0.20);
      env(g, t0, 0.001, 0.20, 0.03); osc.connect(g).connect(master); osc.start(t0); osc.stop(t0 + 0.26);
      makeNoise(ac, 0.28, 0.22, t0, 0.14, 'highpass', 2200).connect(master);
    } else if (event === 'bust') {
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(430, t0); osc.frequency.linearRampToValueAtTime(130, t0 + 0.24);
      env(g, t0, 0.004, 0.24, 0.05); osc.connect(g).connect(master); osc.start(t0); osc.stop(t0 + 0.32);
      makeNoise(ac, 0.18, 0.18, t0, 0.12, 'lowpass', 950).connect(master);
    }
  }
  return { ensure, play };
}

function makeNoise(ac, level, duration, when, decay, type, freq) {
  const len = Math.ceil(ac.sampleRate * duration);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * decay));
  const src = ac.createBufferSource(); src.buffer = buf;
  const filter = ac.createBiquadFilter(); filter.type = type; filter.frequency.value = freq;
  const g = ac.createGain(); g.gain.value = level;
  src.connect(filter).connect(g); src.start(when); src.stop(when + duration + 0.02);
  return g;
}
