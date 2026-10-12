import { DURATION } from './source/effect.mjs';

/** Cause lifecycle kept separate so expiry and cancellation can be tested without WebGPU. */
export function createCauseLedger({ now = () => performance.now(), stopSound = () => {} } = {}) {
  const seen = new Set();
  const active = new Map();
  let disposed = false;

  function admit(input) {
    if (disposed || !input || typeof input.causeId !== 'string' || !input.causeId ||
        !Number.isFinite(input.x) || !Number.isFinite(input.z) || seen.has(input.causeId)) return null;
    const cause = { causeId: input.causeId, x: input.x, z: input.z, startedAt: now(), sound: null };
    seen.add(cause.causeId);
    active.set(cause.causeId, cause);
    return cause;
  }

  function age(cause, at = now()) { return Math.max(0, (at - cause.startedAt) / 1000); }

  function prune(at = now()) {
    const expired = [];
    for (const cause of active.values()) {
      if (age(cause, at) < DURATION) continue;
      active.delete(cause.causeId);
      if (cause.sound) { try { stopSound(cause.sound); } finally { cause.sound = null; } }
      expired.push(cause);
    }
    return expired;
  }

  function cancel(causeId) {
    const cause = active.get(causeId);
    if (!cause) return false;
    active.delete(causeId);
    if (cause.sound) { try { stopSound(cause.sound); } finally { cause.sound = null; } }
    return true;
  }

  function cancelAll() {
    for (const cause of active.values()) if (cause.sound) {
      try { stopSound(cause.sound); } finally { cause.sound = null; }
    }
    const count = active.size;
    active.clear();
    return count;
  }

  function dispose() { if (disposed) return; cancelAll(); disposed = true; }

  return Object.freeze({ seen, active, admit, age, prune, cancel, cancelAll, dispose,
    get disposed() { return disposed; } });
}
