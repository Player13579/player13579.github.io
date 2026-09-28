import fs from 'node:fs/promises';
import path from 'node:path';
import { EVENTS, sampleBarrier } from '../barrier-pro-model.mjs';
import { sampleImage, writePPM } from '../barrier-pro-sampler.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const probes = [];
for (const [event, meta] of Object.entries(EVENTS)) {
  const reps = event === 'create' ? [0, 300, 649] : event === 'absorb' ? [0, 175, 649] : [0, 240, meta.durationMs - 1];
  for (const H of [64, 100]) {
    for (const bg of ['dark', 'light']) {
      for (const tMs of reps) {
        const center = sampleBarrier({ event, tMs, receiverHeightPx: H, background: bg, uv: { x: 0.5, y: 0.5 } });
        probes.push({ event, H, background: bg, tMs, alpha: center.alpha, receiverAirspaceFilled: center.diagnostics.receiverAirspaceFilled, sourceEnergy: center.diagnostics.sourceEnergy });
      }
    }
  }
}
const shots = [
  ['create', 300, 64, 'dark'], ['create', 300, 64, 'light'],
  ['absorb', 175, 64, 'dark'], ['absorb', 175, 64, 'light'],
  ['fracture', 240, 64, 'dark'], ['fracture', 240, 64, 'light'],
  ['bust', 240, 64, 'dark'], ['bust', 240, 64, 'light']
];
for (const [event, tMs, H, bg] of shots) {
  await writePPM(path.join(root, 'evidence', 'cpu-proxy', `${event}-${tMs}-H${H}-${bg}.ppm`), sampleImage({ event, tMs, heightPx: H, background: bg }));
}
await fs.writeFile(path.join(root, 'results', 'cpu-self-inspection.json'), JSON.stringify({ version: 'barrier-pro-r0.8', status: 'pass_numeric_only', real_gpu: 'not_run', probes }, null, 2));
console.log('cpu-self-inspection written');
