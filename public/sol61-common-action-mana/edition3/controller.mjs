// CPU-only lifecycle/identity controller. It does not claim to be a GPU.
export const DURATION_MS = 1200;

export function createEventController({ now = () => performance.now(), onEvent = () => {} } = {}) {
  let current = null;
  let nextId = 0;
  const receipts = [];
  const events = [];
  return Object.freeze({
    start(variant, { actorHeightPx = 64, startedAt = now(), soundEnabled = false } = {}) {
      if (!['desire', 'grit', 'rational'].includes(variant)) throw new TypeError('unsupported action-mana variant');
      if (![64, 128].includes(actorHeightPx)) throw new RangeError('actor height must be 64 or 128 CSS px');
      if (!Number.isFinite(startedAt)) throw new TypeError('startedAt must be finite');
      const serial = ++nextId;
      current = Object.freeze({
        id: `r447-${serial}`, causeId: `r447-${serial}`, playerId: 'fixture-player', variant,
        creativeVersionId: 'common-action-mana-sol61-edition3-r446', soundEnabled,
        x: 0, y: 0, startedAt, duration: DURATION_MS,
        actorHeightCssPx: actorHeightPx,
      });
      events.push(current);
      if (events.length > 96) events.splice(0, events.length - 96);
      onEvent(current);
      return current;
    },
    current: () => current,
    history: () => events.slice(),
    sample(nowMs) {
      if (!current) return { event: null, ageMs: 0, active: false };
      const ageMs = nowMs - current.startedAt;
      return { event: current, ageMs, active: Number.isFinite(nowMs) && ageMs >= 0 && ageMs < current.duration };
    },
    record(receipt) {
      receipts.push(Object.freeze({ ...receipt }));
      if (receipts.length > 96) receipts.splice(0, receipts.length - 96);
    },
    receipts: () => receipts.slice(),
  });
}

