export const version = 'hacker-mana-gpu-accrual-astra62-r1';
export const lifetimeMs = 1380;
const millisecondsPerMana = 20000;
const cellMs = 200;

export function fixtureEvent(choice, id) {
  const receipt = {kind: 'gpu-accrual', owner: 'self', current: true, phase: 'playing',
    committed: true, id, debitCause: id, depositCause: id, spend: .01,
    manaBefore: 4, manaAfter: 3.99, creditBefore: 0, creditAfter: 200};
  switch (choice) {
    case 'single': return receipt;
    case 'double': return {...receipt, spend: .02, manaAfter: 3.98, creditAfter: 400};
    case 'carry': return {...receipt, committed: false, spend: 0, manaAfter: 4, creditAfter: 0};
    case 'meeting': return {...receipt, phase: 'meeting', committed: false};
    case 'apply': return {...receipt, kind: 'generate-and-use-credit'};
    case 'snapshot': return {...receipt, kind: 'balance-snapshot'};
    case 'mismatch': return {...receipt, depositCause: id + 1};
    case 'other': return {...receipt, owner: 'other'};
    default: return null;
  }
}

// This tabletop demonstrates two calibrated, initially empty cells.
export function makeGate() {
  let lastId = 0;
  return event => {
    if (!event || event.owner !== 'self' || event.current !== true ||
        event.kind !== 'gpu-accrual' || event.phase !== 'playing' || event.committed !== true) return null;
    const id = event.id;
    if (!Number.isSafeInteger(id) || id <= lastId ||
        event.debitCause !== id || event.depositCause !== id) return null;
    const {spend, manaBefore, manaAfter, creditBefore, creditAfter} = event;
    if (![spend, manaBefore, manaAfter, creditBefore, creditAfter].every(Number.isFinite) ||
        manaBefore <= manaAfter || manaAfter < 0 || creditBefore !== 0 ||
        creditAfter !== spend * millisecondsPerMana) return null;
    const cells = creditAfter / cellMs;
    if (cells !== 1 && cells !== 2) return null;
    lastId = id;
    return {id,cells};
  };
}

export function makeCue(sampleRate, cells = 1) {
  const samples = new Float32Array(Math.ceil(.99 * sampleRate));
  const turn = 2 * Math.PI;
  function tap(t, hz) {
    if (t < 0 || t >= .16) return 0;
    const env = (1-Math.exp(-t*850))*Math.exp(-t*37)*Math.min(1,(.16-t)/.025);
    return env*(.095*Math.sin(turn*hz*t)+.023*Math.sin(turn*hz*2.47*t));
  }
  for (let i = 0; i < samples.length; i++) {
    const t = i/sampleRate;
    const scan = (t-.22)/.21;
    if (scan > 0 && scan < 1) {
      samples[i] = .045*Math.sin(Math.PI*scan)**2*Math.sin(turn*(345*t+115*t*t));
    }
    samples[i] += tap(t-.619,724);
    if (cells === 2) samples[i] += tap(t-.814,838);
  }
  return samples;
}
