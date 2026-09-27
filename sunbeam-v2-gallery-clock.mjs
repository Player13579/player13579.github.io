/** Normalize this standalone preview's wrapped 2x actor clock. */
export function previewActorAge(now, origin) {
  const elapsed = (now - origin) * 2;
  if (!Number.isFinite(elapsed)) return 0;
  return Math.max(0, elapsed % 1200);
}

/** Fill the timing fields required by the Sunbeam v2 source contract. */
export function applyPreviewActorClock(input, age) {
  const actorAge = Number.isFinite(age) ? Math.max(0, age) : 0;
  input.actorNowMs = actorAge;
  input.startActorMs = 0;
  input.actorRate = 2;
  input.characterElapsedMs = Math.min(actorAge, 820);
  return input;
}
