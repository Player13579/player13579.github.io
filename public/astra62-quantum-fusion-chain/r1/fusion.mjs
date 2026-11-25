export const version = 'quantum-fusion-chain-astra62-r1';
export const lifetimeMs = 4000;

export function fixtureEvent(mode, id) {
  const e = {kind:'quantum-nuclear-fusion', variant:'seawater', owner:'self', current:true, visible:true, permitted:true, endgame:true, consumed:true, committed:true, id};
  switch (mode) {
    case 'committed': return e;
    case 'waiting': return {...e, endgame:false, committed:false, consumed:false};
    case 'missing': return {...e, variant:null, consumed:false, committed:false};
    case 'fission': return {...e, kind:'quantum-nuclear', variant:'uranium'};
    case 'transmute': return {...e, kind:'quantum-transmutation', variant:'lead'};
    case 'hidden': return {...e, visible:false};
    case 'stale': return {...e, current:false};
    case 'other': return {...e, owner:'other'};
    default: return null;
  }
}

// Read only named receipt facts, as own data (never invoke event getters).
const field = (e, k) => Object.getOwnPropertyDescriptor(e, k)?.value;
export function makeGate() {
  let last = 0;
  return function accept(e) {
    if (e === null || typeof e !== 'object') return null;
    try {
      if (field(e,'owner') !== 'self' || field(e,'current') !== true || field(e,'visible') !== true || field(e,'permitted') !== true) return null;
      if (field(e,'kind') !== 'quantum-nuclear-fusion' || field(e,'variant') !== 'seawater' || field(e,'endgame') !== true || field(e,'consumed') !== true || field(e,'committed') !== true) return null;
      const id = field(e,'id');
      if (!Number.isSafeInteger(id) || id <= last) return null;
      last = id;
      return {id};
    } catch { return null; }
  };
}

const unit = x => Math.max(0, Math.min(1, x));
function rise(a,b,x) { const u = unit((x-a)/(b-a)); return u*u*(3-2*u); }
const tau = 2*Math.PI;
// Short wet impact: downward bend on the fundamental, faster extinction of the overtone.
function pinch(d, hz, weight, grit) {
  if (d <= 0 || d >= 0.38) return 0;
  const a = rise(0,0.008,d)*(1-rise(0.29,0.38,d));
  const cycles = hz*d + hz*0.012*(1-Math.exp(-32*d));
  return weight*a*(0.24*Math.exp(-13*d)*Math.sin(tau*cycles) + 0.10*Math.exp(-24*d)*Math.sin(tau*(1.71*hz*d+0.09)) + 0.17*Math.exp(-58*d)*grit);
}

export function makeCue(sampleRate) {
  if (!Number.isSafeInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('Expected an integer rate in [8000,192000] Hz');
  const out = new Float32Array(sampleRate*lifetimeMs/1000);
  const slow = -Math.expm1(-tau*310/sampleRate);
  const fast = -Math.expm1(-tau*2450/sampleRate);
  let lo = 0, hi = 0, seed = 0x5b3681ad;
  for (let i=0;i<out.length;i++) {
    const t = i/sampleRate;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const n = (seed>>>0)/2147483648-1;
    hi += fast*(n-hi); lo += slow*(n-lo);
    const grit = hi-lo;
    const u = unit((t-0.48)/1.92);
    const belly = Math.sin(Math.PI*4*u)**2;
    const draw = rise(0.09,0.42,t)*(1-rise(2.40,2.55,t));
    let v = draw*(0.08+0.11*belly)*(0.72*grit+0.95*lo);
    v += pinch(t-0.48,268,0.56,grit);
    for (let j=0;j<4;j++) {
      const s = (j+0.5)/4;
      const depth = Math.sqrt(1-(2*s-1)**2);
      v += pinch(t-(0.48+1.92*s),285-94*depth,0.70+0.25*depth,grit);
    }
    v += pinch(t-2.40,246,0.50,grit);
    const r = unit((t-2.55)/0.77);
    const flex = (4*r*(1-r))**2;
    v += flex*(0.17*lo+0.065*grit+0.063*Math.sin(tau*0.77*(99*r+30*r*r)));
    v += pinch(t-3.32,159,0.38,grit);
    out[i] = 0.90*Math.tanh(v)*rise(0.035,0.18,t)*(1-rise(3.65,3.87,t));
  }
  return out;
}
