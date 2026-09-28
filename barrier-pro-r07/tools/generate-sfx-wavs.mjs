import fs from 'node:fs/promises';
import path from 'node:path';

const SR = 44100;
function writeWav(samples, file) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataSize, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return fs.writeFile(file, buf);
}
function synth(event) {
  const duration = { create: 0.38, absorb: 0.24, fracture: 0.28, bust: 0.32 }[event];
  const n = Math.floor(duration * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    if (event === 'create') {
      const f = 460 * Math.exp(Math.log(870 / 460) * Math.min(1, t / 0.26));
      v += Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.22) * 0.28;
      v += (Math.random() * 2 - 1) * Math.exp(-t / 0.06) * 0.05;
    } else if (event === 'absorb') {
      const f1 = 940 * Math.exp(Math.log(320 / 940) * Math.min(1, t / 0.14));
      v += Math.sin(2 * Math.PI * f1 * t) * Math.exp(-t / 0.14) * 0.24;
      v += Math.sin(2 * Math.PI * 560 * t) * Math.exp(-((t - 0.05) * (t - 0.05)) / 0.002) * 0.12;
      v += (Math.random() * 2 - 1) * Math.exp(-t / 0.05) * 0.04;
    } else if (event === 'fracture') {
      const f = 650 * Math.exp(Math.log(160 / 650) * Math.min(1, t / 0.18));
      v += Math.sign(Math.sin(2 * Math.PI * f * t)) * Math.exp(-t / 0.18) * 0.18;
      v += (Math.random() * 2 - 1) * Math.exp(-t / 0.08) * 0.10;
    } else if (event === 'bust') {
      const f = 410 * Math.exp(Math.log(150 / 410) * Math.min(1, t / 0.22));
      v += Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.20) * 0.22;
      v += Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t / 0.25) * 0.08;
      v += (Math.random() * 2 - 1) * Math.exp(-t / 0.10) * 0.04;
    }
    out[i] = v;
  }
  return out;
}
const outDir = path.resolve(new URL('../sfx', import.meta.url).pathname);
await fs.mkdir(outDir, { recursive: true });
for (const event of ['create', 'absorb', 'fracture', 'bust']) {
  await writeWav(synth(event), path.join(outDir, `${event}.wav`));
}
console.log('wav files written');
