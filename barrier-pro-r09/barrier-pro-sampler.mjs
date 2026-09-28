import fs from 'node:fs/promises';
import path from 'node:path';
import { DESIGN, sampleBarrier } from './barrier-pro-model.mjs';

export function sampleImage({ event = 'create', tMs = 0, heightPx = 64, widthPx, background = 'dark', coreLightEnabled = true }) {
  const H = heightPx;
  const width = widthPx ?? Math.round(DESIGN.fieldWidthH * H);
  const height = Math.round(DESIGN.fieldHeightH * H);
  const pixels = new Uint8ClampedArray(width * height * 4);
  const fieldW = DESIGN.fieldWidthH * H;
  const fieldH = DESIGN.fieldHeightH * H;
  const cx = width / 2, cy = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const uv = {
        x: 0.5 + (x + 0.5 - cx) / fieldW,
        y: 0.5 + (y + 0.5 - cy) / fieldH,
      };
      const s = sampleBarrier({ event, tMs, receiverHeightPx: H, uv, background, coreLightEnabled });
      const idx = (y * width + x) * 4;
      pixels[idx] = Math.round(clamp01(s.composed[0]) * 255);
      pixels[idx + 1] = Math.round(clamp01(s.composed[1]) * 255);
      pixels[idx + 2] = Math.round(clamp01(s.composed[2]) * 255);
      pixels[idx + 3] = 255;
    }
  }
  return { width, height, pixels };
}

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

export async function writePPM(filePath, image) {
  const { width, height, pixels } = image;
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`);
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0, j = 0; i < pixels.length; i += 4, j += 3) {
    rgb[j] = pixels[i];
    rgb[j + 1] = pixels[i + 1];
    rgb[j + 2] = pixels[i + 2];
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.concat([header, rgb]));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outDir = process.argv[2] || './evidence/cpu-proxy';
  await fs.mkdir(outDir, { recursive: true });
  const shots = [
    ['create', 300, 64, 'dark'], ['create', 300, 64, 'light'],
    ['absorb', 175, 64, 'dark'], ['absorb', 175, 64, 'light'],
    ['fracture', 240, 64, 'dark'], ['fracture', 240, 64, 'light'],
    ['bust', 240, 64, 'dark'], ['bust', 240, 64, 'light'],
  ];
  for (const [event, tMs, H, bg] of shots) {
    await writePPM(path.join(outDir, `${event}-${tMs}-H${H}-${bg}.ppm`), sampleImage({ event, tMs, heightPx: H, background: bg }));
  }
  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify({ shots }, null, 2));
  console.log('CPU proxy renders written');
}
