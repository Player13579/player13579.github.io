export const version = 'quantum-temperature-cold-astra62-r2';
export const lifetimeMs = 3370;

export function fixtureEvent(mode, id) {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const r = {kind:'quantum-temperature-cold', variant:'ice', owner:'self', current:true, visible:true, permitted:true, committed:true, inputConsumed:true, outputCreated:true, id};
  switch (mode) {
    case 'committed': return r;
    case 'waiting': return {...r, committed:false, inputConsumed:false, outputCreated:false};
    case 'missing': return null; // No producer receipt at all.
    case 'hot': return {...r, kind:'quantum-temperature-hot', variant:'heated-water'};
    case 'transmutation': return {...r, kind:'quantum-transmutation', variant:'lead'};
    case 'impact': return {...r, kind:'quantum-ice-impact'};
    case 'hidden': return {...r, visible:false};
    case 'stale': return {...r, current:false};
    case 'other': return {...r, owner:'other'};
    case 'no-output': return {...r, outputCreated:false};
    default: return null;
  }
}

function datum(r, key) {
  const d = Object.getOwnPropertyDescriptor(r, key);
  return d && Object.hasOwn(d, 'value') ? d.value : undefined;
}

export function makeGate() {
  let watermark = 0;
  return function accept(r) {
    if (r === null || typeof r !== 'object') return null;
    try {
      if (datum(r,'visible') !== true || datum(r,'permitted') !== true || datum(r,'current') !== true || datum(r,'owner') !== 'self') return null;
      if (datum(r,'kind') !== 'quantum-temperature-cold' || datum(r,'variant') !== 'ice' || datum(r,'committed') !== true || datum(r,'inputConsumed') !== true || datum(r,'outputCreated') !== true) return null;
      const id = datum(r,'id');
      if (!Number.isSafeInteger(id) || id <= watermark) return null;
      watermark = id;
      return {id};
    } catch {
      return null;
    }
  };
}

function ease(a,b,x) {
  const u = Math.min(1,Math.max(0,(x-a)/(b-a)));
  return u*u*(3-2*u);
}
function patch(x,center,width) {
  const d = (x-center)/width;
  return Math.exp(-d*d);
}

export function makeCue(sampleRate) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('sampleRate: integer 8000..192000 required');
  const pcm = new Float32Array(Math.ceil(lifetimeMs*sampleRate/1000));
  const pole = hz => -Math.expm1(-2*Math.PI*hz/sampleRate);
  const a = pole(112), b = pole(680), c = pole(2520), envPole = pole(49);
  const rateGain = Math.sqrt(sampleRate/16000);
  let seed = 0x396aa71d, bass = 0, body = 0, grain = 0, nap = 0;
  for (let i=0; i<pcm.length; ++i) {
    const ms = i*1000/sampleRate;
    if (ms >= 2240) break;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const x = (seed >>> 0)/2147483648 - 1;
    bass += a*(x-bass); body += b*(x-body); grain += c*(x-grain);
    nap += envPole*(Math.abs(grain)-nap);
    const u = Math.min(1, ms/1180), phi = 5.8*(1-(1-u)**3);
    const wet = ease(10,75,ms)*(1-ease(0,1180,ms))*(0.64+0.36*Math.sin(2*phi+0.4));
    const s = ease(700,2240,ms), k = -98+214*s;
    const grip = 0.29*patch(k,-64,16)+0.43*patch(k,-12,10)+0.34*patch(k,65,13);
    const dry = 4*s*(1-s)*(0.14+grip);
    const rub = (grain-body)*(0.60+Math.min(0.9,2.8*rateGain*nap));
    pcm[i] = 0.48*Math.tanh(rateGain*(wet*(0.89*(body-bass)+0.34*bass)+dry*rub));
  }
  return pcm;
}
