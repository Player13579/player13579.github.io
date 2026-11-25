export const version = 'clairvoyance-manual-start-astra62-r1';
export const lifetimeMs = 1080;

const changes = Object.freeze({
  start: {},
  repeat: {before: true},
  snapshot: {kind: 'snapshot'},
  denied: {accepted: false, after: false},
  off: {requested: false, before: true, after: false},
  other: {owner: 'other'},
  old: {currentSession: false}
});

export function fixtureEvent(choice, id) {
  if (!Object.hasOwn(changes, choice)) return null;
  return {kind: 'manual-ack', owner: 'self', currentSession: true, accepted: true,
    requested: true, before: false, after: true, id, ...changes[choice]};
}

export function makeGate() {
  let lastId = 0;
  return function accept(event) {
    if (!event || event.kind !== 'manual-ack' || event.owner !== 'self' ||
        event.currentSession !== true || event.accepted !== true || event.requested !== true ||
        event.before !== false || event.after !== true) return null;
    const id = event.id;
    if (!Number.isSafeInteger(id) || id <= lastId) return null;
    lastId = id;
    return {id};
  };
}

// Mechanical sliding blades, then a resonant detent at full aperture.
export function makeCue(rate) {
  const samples = new Float32Array(Math.ceil(rate * .79));
  const turn = Math.PI * 2;
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    if (t > .11 && t < .52) {
      const u = (t - .11) / .41;
      const sweep = Math.sin(Math.PI * u) ** 2;
      samples[i] += .075 * sweep * (.55 + .45 * Math.cos(turn * 21 * t)) *
        Math.sin(turn * (295 * t + 85 * t * t) + .40 * Math.sin(turn * 765 * t));
    }
    if (t >= .515 && t < .77) {
      const d = t - .515;
      const envelope = (1 - Math.exp(-d * 650)) * Math.exp(-d * 25) *
        Math.min(1, (.77 - t) / .03);
      samples[i] += envelope * (.105 * Math.sin(turn * 1012 * d) +
        .037 * Math.sin(turn * 1598 * d));
    }
  }
  return samples;
}
