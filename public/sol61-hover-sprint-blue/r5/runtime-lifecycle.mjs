// Small host-side guards. These do not change the authored E or its clocks.
export const MAX_SUBMITS_PER_SECOND = 60;

export function createRuntimeInitGate() {
  let state = 'initializing';
  let deferred = false;
  return Object.freeze({
    isReady: () => state === 'ready',
    isClosed: () => state === 'closed',
    defer: () => { if (state === 'initializing') deferred = true; return false; },
    open: () => {
      if (state !== 'initializing') return false;
      state = 'ready';
      const hadDeferredWork = deferred;
      deferred = false;
      return hadDeferredWork;
    },
    close: () => {
      if (state === 'closed') return false;
      state = 'closed';
      deferred = false;
      return true;
    },
  });
}

export function createSubmitRateGate(maxPerSecond = MAX_SUBMITS_PER_SECOND) {
  if (!Number.isFinite(maxPerSecond) || maxPerSecond <= 0) throw new RangeError('maxPerSecond must be positive');
  const minIntervalMs = 1000 / maxPerSecond;
  let lastSubmitMs = -Infinity;
  return Object.freeze({
    shouldSubmit(nowMs) {
      if (!Number.isFinite(nowMs)) return false;
      // Do not catch up after a pause: one request buys at most one submit.
      if (nowMs - lastSubmitMs + 1e-6 < minIntervalMs) return false;
      lastSubmitMs = nowMs;
      return true;
    },
    reset() { lastSubmitMs = -Infinity; },
    snapshot() { return Object.freeze({ maxPerSecond, minIntervalMs, lastSubmitMs }); },
  });
}

export function createGenerationGuard() {
  let runtimeGeneration = 1;
  let layoutGeneration = 0;
  let resourceGeneration = 0;
  let active = true;
  const token = () => Object.freeze({ runtimeGeneration, layoutGeneration, resourceGeneration });
  return Object.freeze({
    capture: token,
    isCurrent(value) {
      return Boolean(active && value && value.runtimeGeneration === runtimeGeneration
        && value.layoutGeneration === layoutGeneration && value.resourceGeneration === resourceGeneration);
    },
    resize({ layoutChanged = false, resourceChanged = false } = {}) {
      if (!active) return token();
      if (layoutChanged) layoutGeneration++;
      if (resourceChanged) resourceGeneration++;
      return token();
    },
    cancel() {
      if (active) { active = false; runtimeGeneration++; resourceGeneration++; }
      return token();
    },
    snapshot: () => Object.freeze({ active, runtimeGeneration, layoutGeneration, resourceGeneration }),
  });
}

export function createCauseAdmission() {
  const admitted = new Set();
  return Object.freeze({
    canAdmit({ held, visible, sourceOn, ageMs, causeId } = {}) {
      return !held && visible && sourceOn && Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 360
        && Boolean(causeId) && !admitted.has(String(causeId));
    },
    admit(input = {}) {
      if (!this.canAdmit(input)) return false;
      admitted.add(String(input.causeId));
      return true;
    },
    has(causeId) { return admitted.has(String(causeId)); },
    snapshot() { return Object.freeze([...admitted]); },
    clear() { admitted.clear(); },
  });
}

export function createRecordRing(limit = 256) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError('limit must be a positive integer');
  const records = [];
  return Object.freeze({
    push(record) {
      records.push(Object.freeze({ ...record }));
      if (records.length > limit) records.splice(0, records.length - limit);
    },
    snapshot() { return Object.freeze(records.slice()); },
  });
}
