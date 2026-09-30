// Pure E-time visual clock for Security Room r05; intentionally contains no SFX policy.
export function planSecurityRoomR05Visual({ elapsedSeconds, rate, reducedMotion = false, authEvent = null }) {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0 || !Number.isFinite(rate) || rate < 0)
    throw new Error('valid shared E time/rate required');
  let age = -1;
  if (authEvent) {
    if (typeof authEvent.id !== 'string' || !authEvent.id.trim() ||
        !Number.isFinite(authEvent.atESeconds) || authEvent.atESeconds < 0)
      throw new Error('valid immutable auth receipt required');
    age = elapsedSeconds - authEvent.atESeconds;
    if (age < 0) throw new Error('auth event cannot be in future E time');
  }
  return Object.freeze({ eTime: elapsedSeconds, authAge: age >= 0 && age < 1.25 ? age : -1,
    motionScale: reducedMotion ? 0 : 1 });
}
