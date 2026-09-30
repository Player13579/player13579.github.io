// Run in the Room E page after runtime.mjs reports ready. Returns browser-observed
// WebGPU and finite-episode evidence; it does not create a context or alter shaders.
export async function runRoomGpuCheck({ ages = [0, 160, 500, 1200, 2800, 2860, 3400, 4200, 4460, 7200, 8000, 8600, 8860, 10000, 11500, 11900, 12000] } = {}) {
  const api = globalThis.__roomE;
  const canvas = document.querySelector('#stage');
  if (!api || !canvas) throw new Error('Room E runtime is not loaded');
  const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));
  await nextFrame();
  let base = api.snapshot();
  if (!base.ready || !base.compiled) throw new Error(`WebGPU not ready: ${JSON.stringify(base)}`);
  if (base.faults.length) throw new Error(`Initial GPU faults: ${base.faults.join(' | ')}`);
  api.setControl('active', true);
  api.setControl('bitmapOnly', false);
  const samples = [];
  for (const ageMs of ages) {
    api.seek(ageMs);
    await nextFrame();
    await nextFrame();
    const sample = api.snapshot();
    if (!sample.ready || sample.faults.length) throw new Error(`GPU fault at ${ageMs}ms: ${sample.faults.join(' | ')}`);
    if (sample.frames <= base.frames) throw new Error(`No submitted frame at ${ageMs}ms`);
    if (sample.lastDraws.some(draw => !draw.bounds.every(Number.isFinite))) throw new Error(`Non-finite draw at ${ageMs}ms`);
    if (sample.lastDraws.length > 32) throw new Error(`Draw cap exceeded at ${ageMs}ms`);
    samples.push({ ageMs, frames: sample.frames, draws: sample.lastDraws.length,
      kinds: sample.lastDraws.reduce((counts, draw) => ({ ...counts, [draw.kind]: (counts[draw.kind] || 0) + 1 }), {}),
      fit: sample.fit, canvas: sample.canvas, faults: sample.faults });
    base = sample;
  }
  for (const [label, settings] of [
    ['active-off', { active: false, bitmapOnly: false }],
    ['bitmap-only', { active: true, bitmapOnly: true }],
    ['normal', { active: true, bitmapOnly: false }],
  ]) {
    api.setControl('active', settings.active);
    api.setControl('bitmapOnly', settings.bitmapOnly);
    api.seek(3400);
    await nextFrame();
    await nextFrame();
    const sample = api.snapshot();
    if (sample.faults.length || !sample.ready) throw new Error(`${label} GPU fault`);
    if (label !== 'normal' && sample.lastDraws.length !== 1) throw new Error(`${label} should draw only base bitmap`);
    if (label === 'normal' && sample.lastDraws.length <= 1) throw new Error('normal environment draws missing');
    samples.push({ mode: label, frames: sample.frames, draws: sample.lastDraws.length, canvas: sample.canvas, fit: sample.fit, faults: sample.faults });
    base = sample;
  }
  return { ok: true, adapter: base.adapter, verify: base.verify,
    verifyAudioContext: base.audio.audioState, verifyAudioGain: base.audio.audioGain,
    compileErrors: 0, validationErrors: base.faults.length,
    canvas: base.canvas, submittedFrames: base.frames, renderDraws: base.renderDraws, samples, faults: base.faults };
}
