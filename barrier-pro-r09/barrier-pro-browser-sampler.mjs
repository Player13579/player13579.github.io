import { sampleBarrier } from './barrier-pro-model.mjs';

// Browser-safe adapter copied from Pro r0.9's sampleImage contract. The
// original Node sampler remains byte-identical alongside this GPU embed.
export function sampleImage({ event = 'create', tMs = 0, heightPx = 64, widthPx, background = 'dark', coreLightEnabled = true }) {
  const H = heightPx;
  const width = widthPx ?? Math.round(1.92 * H);
  const height = Math.round(2.18 * H);
  const pixels = new Uint8ClampedArray(width * height * 4);
  const fieldW = 1.92 * H, fieldH = 2.18 * H;
  const cx = width / 2, cy = height / 2;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const uv = { x: 0.5 + (x + 0.5 - cx) / fieldW, y: 0.5 + (y + 0.5 - cy) / fieldH };
    const s = sampleBarrier({ event, tMs, receiverHeightPx: H, uv, background, coreLightEnabled });
    const i = (y * width + x) * 4;
    pixels[i] = Math.round(clamp01(s.composed[0]) * 255);
    pixels[i + 1] = Math.round(clamp01(s.composed[1]) * 255);
    pixels[i + 2] = Math.round(clamp01(s.composed[2]) * 255);
    pixels[i + 3] = 255;
  }
  return { width, height, pixels };
}
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
