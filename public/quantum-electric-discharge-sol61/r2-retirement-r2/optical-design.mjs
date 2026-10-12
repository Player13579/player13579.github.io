// Creative optical correction by GPT-6.1-Sol: a continuous, normalized PSF.
// The old displaced sparse samples made separate parallel images of one conductor.
export const PSF_RADIUS = 8;
export const PSF_SIGMA = 2.4;
export const PSF_GAIN = 0.65;
export const PSF_WEIGHTS = Object.freeze(Array.from({length: 17}, (_, i) => Math.exp(-0.5 * ((i - PSF_RADIUS) / PSF_SIGMA) ** 2)).map((w, _, all) => w / all.reduce((sum, v) => sum + v, 0)));
export const psfWeight = (offset) => PSF_WEIGHTS[offset + PSF_RADIUS] ?? 0;
export function linearRadiance(direct, scattered, sourceOn = true, observerOn = true) {
  if (!sourceOn) return [0, 0, 0];
  return direct.map((v, i) => Math.max(0, v + (observerOn ? PSF_GAIN * scattered[i] : 0)));
}
