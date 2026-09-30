// Browser-side fixture generator for the native WebGPU matrix documented in
// native-lifecycle-isolation-matrix.json. Run with verify=barrier-r9-native.
export const nativeFixtureSpecs = (() => {
  const cases = [];
  for (const ageMs of [0, 35, 80, 140, 260, 420, 560, 649, 650]) cases.push({ name: `create-${ageMs}`, stage: 'create', ageMs });
  for (const ageMs of [0, 16, 30, 55, 75, 135, 225, 350, 480, 600, 649, 650]) cases.push({ name: `known-hit-${ageMs}`, stage: 'hit', ageMs, known: true, contact: [.50, .15, .66] });
  for (const ageMs of [55, 225]) cases.push({ name: `unknown-hit-${ageMs}`, stage: 'hit', ageMs, known: false });
  for (const ageMs of [0, 45, 80, 180, 220, 360, 450, 479, 480]) cases.push({ name: `break-${ageMs}`, stage: 'break', ageMs, owner: { barrierDurability: 0 } });
  cases.push({ name: 'off', stage: 'off' });
  for (const ageMs of [30, 75, 225, 350, 600]) cases.push({ name: `main-hit-${ageMs}`, stage: 'hit', ageMs, known: true, contact: [.50, .15, .66], layout: { dual: false } });
  for (const layer of ['near', 'cross', 'ghost']) for (const ageMs of [140, 420]) cases.push({ name: `${layer}-off-${ageMs}`, stage: 'create', ageMs, settings: { [layer]: false } });
  cases.push(
    { name: 'source-shift-only', stage: 'create', ageMs: 140, camera: { sourceShift: [.12, 0] } },
    { name: 'observer-center-only', stage: 'create', ageMs: 140, camera: { observerCenter: [.12, 0] } },
    { name: 'opaque-source-tile', stage: 'create', ageMs: 140, layout: { diagnostic: true } },
    { name: 'source-off', stage: 'create', ageMs: 140, settings: { source: false } },
    { name: 'dual-dark-light-create-140', stage: 'create', ageMs: 140, layout: { dual: true } }
  );
  return Object.freeze(cases.map(Object.freeze));
})();

export async function runNativeFixtureMatrix(runtime) {
  if (!runtime?.setCase || !runtime?.snapshot) throw new TypeError('Pass the live createBarrierRuntime result.');
  const rows = [];
  const publishProgress = () => {
    if (typeof window !== 'undefined') window.__barrierR9NativeMatrix = { completed: false, fixtureCount: rows.length, rows: rows.slice() };
  };
  publishProgress();
  for (const { name, ...spec } of nativeFixtureSpecs) {
    const submitted = await runtime.setCase(spec);
    const snapshot = runtime.snapshot();
    rows.push({
      name,
      submitId: submitted.submitId,
      serial: submitted.serial,
      stage: submitted.stage,
      ageSeconds: submitted.ageSeconds,
      live: submitted.live,
      known: submitted.known,
      flags: submitted.flags,
      dual: submitted.dual,
      camera: submitted.camera,
      diagnostic: snapshot.layout.diagnostic,
      uniformBytes: submitted.uniformBytes,
      cellScissors: submitted.scissorCells,
      passes: submitted.passes,
      confirmedAfterLaterFrame: submitted.confirmedAfterLaterFrame,
      gpuErrors: snapshot.gpuErrors,
      gpuFault: snapshot.gpuFault
    });
    publishProgress();
  }
  const final = runtime.snapshot();
  const result = {
    fixtureCount: rows.length,
    allConfirmedAfterLaterFrame: rows.every(row => row.confirmedAfterLaterFrame),
    noGpuErrorsOrFaults: rows.every(row => row.gpuErrors.length === 0 && row.gpuFault === null),
    rows,
    adapter: final.adapter,
    worldTargetFormat: final.worldTargetFormat,
    verificationAudio: final.audio
  };
  if (typeof window !== 'undefined') window.__barrierR9NativeMatrix = { ...result, completed: true };
  return result;
}
