export const SFX_META = {
  create: { duration: 0.34 },
  absorb: { duration: 0.22 },
  fracture: { duration: 0.28 },
  bust: { duration: 0.30 },
};

function env(t, a, d) {
  const up = Math.min(1, t / Math.max(a, 1e-6));
  const down = Math.max(0, 1 - (t - a) / Math.max(d, 1e-6));
  return t < a ? up : down;
}

export function synthEvent(event, sampleRate = 48000) {
  const duration = SFX_META[event].duration;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let v = 0;
    if (event === 'create') {
      const f = 420 + 620 * (t / duration);
      const e = Math.pow(Math.max(0, 1 - t / duration), 0.6);
      v = 0.34 * Math.sin(2 * Math.PI * f * t) * e + 0.12 * Math.sin(2 * Math.PI * (f * 0.5) * t) * e;
    } else if (event === 'absorb') {
      const e1 = Math.exp(-16 * t);
      const e2 = Math.exp(-26 * Math.max(0, t - 0.05));
      v = 0.40 * Math.sin(2 * Math.PI * 1240 * t) * e1 + 0.18 * Math.sin(2 * Math.PI * 760 * t) * e2;
    } else if (event === 'fracture') {
      const n = Math.sin(2 * Math.PI * 1970 * t) * Math.sin(2 * Math.PI * 311 * t + 0.7);
      const crack = Math.exp(-10 * t);
      v = 0.44 * n * crack + 0.18 * Math.sin(2 * Math.PI * 430 * t) * Math.exp(-7 * t);
    } else if (event === 'bust') {
      const f = 980 - 540 * (t / duration);
      const gate = 0.5 + 0.5 * Math.sign(Math.sin(2 * Math.PI * 18 * t));
      v = 0.26 * Math.sin(2 * Math.PI * f * t) * Math.exp(-6 * t) + 0.16 * gate * Math.sin(2 * Math.PI * 340 * t) * Math.exp(-5 * t);
    }
    data[i] = Math.max(-1, Math.min(1, v));
  }
  return { sampleRate, data, duration };
}

export function encodeWav({ sampleRate, data }) {
  const buffer = new ArrayBuffer(44 + data.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + data.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}

export function createSfxBank() {
  let ctx = null;
  let ensurePromise = null;
  let disposePromise = null;
  let disposed = false;
  const buffers = new Map();
  const sources = new Set();
  async function ensure() {
    if (disposed) return false;
    if (ensurePromise) return ensurePromise;
    ensurePromise = (async () => {
      const context = ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      for (const event of Object.keys(SFX_META)) {
        if (buffers.has(event)) continue;
        const { data, sampleRate } = synthEvent(event, context.sampleRate);
        const buf = context.createBuffer(1, data.length, sampleRate);
        buf.copyToChannel(data, 0);
        buffers.set(event, buf);
      }
      if (context.state !== 'running') await context.resume();
      return !disposed && ctx === context && context.state === 'running';
    })();
    try { return await ensurePromise; }
    finally { ensurePromise = null; }
  }
  function releaseSource(source, stop) {
    sources.delete(source);
    source.onended = null;
    if (stop) { try { source.stop(); } catch { /* It may have ended before pagehide. */ } }
    try { source.disconnect(); } catch { /* Disconnect is best effort after stop. */ }
  }
  function play(event) {
    if (disposed || !ctx || ctx.state !== 'running') return false;
    const buffer = buffers.get(event);
    if (!buffer) return false;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.onended = () => releaseSource(source, false);
    sources.add(source);
    try {
      source.connect(ctx.destination);
      source.start();
      return true;
    } catch (error) {
      releaseSource(source, true);
      throw error;
    }
  }
  function dispose() {
    if (disposePromise) return disposePromise;
    disposed = true;
    const context = ctx;
    ctx = null;
    buffers.clear();
    for (const source of [...sources]) releaseSource(source, true);
    disposePromise = context && context.state !== 'closed'
      ? Promise.resolve().then(() => context.close())
      : Promise.resolve();
    return disposePromise;
  }
  return { ensure, play, dispose };
}
