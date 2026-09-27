import fs from 'node:fs/promises';
import path from 'node:path';
import { sampleBarrier, EVENTS } from './barrier-pro-model.mjs';

export function sampleImage({ event = 'create', tMs = 0, heightPx = 64, widthPx, background = 'dark', coreLightEnabled = true }) {
  const H = heightPx;
  const w = widthPx ?? Math.round(H * 1.80);
  const h = Math.round(H * 1.90);
  const pixels = new Uint8Array(w * h * 4);
  const cx = w / 2;
  const cy = h / 2;
  const fieldW = 1.42 * H;
  const fieldH = 1.68 * H;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const uv = {
        x: 0.5 + (x + 0.5 - cx) / fieldW,
        y: 0.5 + (y + 0.5 - cy) / fieldH
      };
      const s = sampleBarrier({ event, tMs, receiverHeightPx: H, uv, background, coreLightEnabled });
      const idx = (y * w + x) * 4;
      const c = s.composed.map(v => Math.max(0, Math.min(1, v)));
      pixels[idx] = Math.round(c[0] * 255);
      pixels[idx + 1] = Math.round(c[1] * 255);
      pixels[idx + 2] = Math.round(c[2] * 255);
      pixels[idx + 3] = 255;
    }
  }
  return { width: w, height: h, pixels };
}

export async function writePPM(filePath, { width, height, pixels }) {
  const header = `P6\n${width} ${height}\n255\n`;
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0, j = 0; i < pixels.length; i += 4, j += 3) {
    rgb[j] = pixels[i];
    rgb[j + 1] = pixels[i + 1];
    rgb[j + 2] = pixels[i + 2];
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.concat([Buffer.from(header), rgb]));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outDir = process.argv[2] || './evidence/ppm';
  await fs.mkdir(outDir, { recursive: true });
  const shots = [
    ['create', 300, 64, 'dark'],
    ['create', 300, 64, 'light'],
    ['absorb', 175, 64, 'dark'],
    ['absorb', 175, 64, 'light'],
    ['fracture', 240, 64, 'dark'],
    ['bust', 240, 64, 'dark']
  ];
  for (const [event, tMs, H, bg] of shots) {
    const image = sampleImage({ event, tMs, heightPx: H, background: bg });
    await writePPM(path.join(outDir, `${event}-${tMs}-H${H}-${bg}.ppm`), image);
  }
  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify({ generated: shots }, null, 2));
}
