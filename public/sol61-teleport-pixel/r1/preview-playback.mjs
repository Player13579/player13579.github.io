export const REVIEW_DURATION_MS = 640;
export const LOOP_PAUSE_MS = 180;
export const AUDIO_PHASE_START_MS = Object.freeze([0, 160]);
export const AUDIO_PHASE_DURATION_MS = Object.freeze([220, 340]);

export function hardZeroAudio(search) { return new URLSearchParams(search).has('verify'); }
export function canUnlockAudio(search) {
  return !hardZeroAudio(search) && parseReviewAge(search) === null;
}

export function parseReviewAge(search) {
  const params = new URLSearchParams(search), values = params.getAll('reviewAgeMs');
  if (!values.length) return null;
  if (values.length !== 1 || values[0].trim() === '') throw new RangeError('reviewAgeMs must occur once and be finite in [0, 640)');
  const age = Number(values[0]);
  if (!Number.isFinite(age) || age < 0 || age >= REVIEW_DURATION_MS)
    throw new RangeError('reviewAgeMs must be finite in [0, 640)');
  return age;
}

export function fixtureIdentity(sequence) {
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new RangeError('fixture sequence must be positive');
  const key = `fixture-${sequence}`;
  return Object.freeze({ key, causalId: `${key}-cast`, departureId: `${key}-departure`,
    arrivalId: `${key}-arrival`, revisionAfter: sequence + 1 });
}

export function audioOffsetSeconds(ageMs, phase, durationMs = AUDIO_PHASE_DURATION_MS[phase]) {
  const start = AUDIO_PHASE_START_MS[phase];
  if (!Number.isInteger(phase) || ![0, 1].includes(phase) ||
      !Number.isFinite(ageMs) || !Number.isFinite(durationMs) || durationMs <= 0 ||
      ageMs < start || ageMs >= start + durationMs) return null;
  return (ageMs - start) / 1000;
}

export function audioIntentMatches(intent, current) {
  return Boolean(intent && current && intent.causalId === current.causalId &&
    intent.actorId === current.actorId && intent.revisionAfter === current.revisionAfter &&
    intent.sourceId === current.sourceId && intent.phase === current.phase);
}
