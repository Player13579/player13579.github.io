export const CYCLE_MS = 4600;
export const CAUSE_PHASES = Object.freeze({ create: 650, hit: 650, break: 480 });

export function phaseFor(age) {
  return age < 650 ? ['create', age]
    : age < 1800 ? ['stable', age - 650]
    : age < 2450 ? ['hit', age - 1800]
    : age < 3400 ? ['stable', age - 2450]
    : age < 3880 ? ['break', age - 3400]
    : ['off', 0];
}

// SFX may start only when the cause rendered by the awaited submit still owns
// the current authored phase. A delayed submit must never replay an expired cue.
export function causeStillActiveAfterSubmit(submitted, current) {
  const duration = CAUSE_PHASES[submitted.phase];
  return duration !== undefined
    && current.cycle === submitted.cycle
    && current.phase === submitted.phase
    && current.ageMs >= 0
    && current.ageMs < duration;
}
