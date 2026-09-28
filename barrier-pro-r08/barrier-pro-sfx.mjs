export function createSfxBank() {
  let ctx = null;
  async function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx;
  }
  function envelope(gain, when, a, d, sustain = 0.0001) {
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(1.0, when + a);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.00012, sustain), when + a + d);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + a + d + 0.05);
  }
  async function play(event) {
    const ac = await ensure();
    const when = ac.currentTime + 0.02;
    const master = ac.createGain();
    master.gain.value = 0.18;
    master.connect(ac.destination);

    if (event === 'create') {
      tone(ac, master, when, 'triangle', 460, 870, 0.36, 0.28, 0.10);
      noise(ac, master, when, 0.18, 0.10, 'bandpass', 2300, 0.08);
    } else if (event === 'absorb') {
      tone(ac, master, when, 'sine', 940, 320, 0.22, 0.22, 0.05);
      tone(ac, master, when + 0.01, 'triangle', 710, 520, 0.16, 0.16, 0.04);
      noise(ac, master, when, 0.14, 0.08, 'bandpass', 1800, 0.05);
    } else if (event === 'fracture') {
      tone(ac, master, when, 'square', 650, 160, 0.26, 0.26, 0.03);
      noise(ac, master, when, 0.24, 0.14, 'highpass', 2600, 0.08);
    } else if (event === 'bust') {
      tone(ac, master, when, 'triangle', 410, 150, 0.30, 0.24, 0.04);
      tone(ac, master, when + 0.03, 'sine', 300, 120, 0.24, 0.18, 0.03);
      noise(ac, master, when, 0.11, 0.12, 'lowpass', 1200, 0.08);
    }
  }
  return { ensure, play };
}

function tone(ac, dest, when, type, f0, f1, dur, decay, sustain) {
  const osc = ac.createOscillator();
  osc.type = type;
  const gain = ac.createGain();
  osc.frequency.setValueAtTime(f0, when);
  if (f0 > 0 && f1 > 0) osc.frequency.exponentialRampToValueAtTime(f1, when + dur * 0.72);
  envelope(gain, when, 0.004, decay, sustain);
  osc.connect(gain).connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.06);
}

function noise(ac, dest, when, level, dur, type, cutoff, decay) {
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * Math.max(0.02, decay)));
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = cutoff;
  const gain = ac.createGain();
  gain.gain.value = level;
  src.connect(filter).connect(gain).connect(dest);
  src.start(when);
  src.stop(when + dur + 0.03);
}
