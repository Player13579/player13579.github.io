export const version = 'quantum-temperature-hot-astra62-r4';
export const lifetimeMs = 3080;

const facts = Object.freeze({kind:'quantum-temperature-hot', variant:'heated-water', self:true, current:true, permitted:true, visible:true, committed:true, resourcesSpent:true, supportedWaterConsumed:true, output:'heated-water'});
const fields = Object.freeze(Object.keys(facts));

export function fixtureEvent(mode='committed', id=1) {
  const r = {id, ...facts};
  switch (mode) {
    case 'committed': case 'duplicate': break;
    case 'missing-water': r.supportedWaterConsumed=false; break;
    case 'cancelled': r.committed=false; break;
    case 'ice-output': r.output='ice'; break;
    case 'cold': r.kind='quantum-temperature-cold'; r.variant='ice'; r.output='ice'; break;
    case 'unrelated-acquisition': case 'acquisition': r.kind='inventory-acquisition'; break;
    case 'identity': r.self=false; break;
    case 'stale': r.current=false; break;
    case 'unauthorized': r.permitted=false; break;
    case 'hidden': r.visible=false; break;
    case 'unspent': r.resourcesSpent=false; break;
    default: return null;
  }
  return Object.freeze(r);
}

const absent = Symbol('not-own-data');
function ownData(r,k) {
  const d = Object.getOwnPropertyDescriptor(r,k);
  return d && Object.prototype.hasOwnProperty.call(d,'value') ? d.value : absent;
}
export function makeGate() {
  let last=0;
  function accept(r) {
    if (r===null || typeof r!=='object') return null;
    try {
      const id=ownData(r,'id');
      if (!Number.isSafeInteger(id) || id<=last) return null;
      for (const k of fields) if (ownData(r,k)!==facts[k]) return null;
      if (Reflect.ownKeys(r).length!==fields.length+1) return null;
      const token=Object.freeze({id});
      last=id;
      return token;
    } catch { return null; }
  }
  Object.defineProperty(accept,'accept',{value:accept});
  return Object.freeze(accept);
}

function ramp(a,b,t) {
  const s=Math.min(1,Math.max(0,(t-a)/(b-a)));
  return s*s*(3-2*s);
}
export function makeCue(sampleRate) {
  if (!Number.isFinite(sampleRate) || sampleRate<8000 || sampleRate>192000) throw new RangeError('sampleRate');
  const sr=sampleRate, n=Math.round(sr*lifetimeMs/1000), out=new Float32Array(n);
  const tau=2*Math.PI;
  const coeff=f=>-Math.expm1(-tau*f/sr);
  const a=coeff(92), b=coeff(535), c=coeff(1620), norm=Math.sqrt(sr/16000);
  function vessel(hz,sec) {
    const r=Math.exp(-1/(sec*sr)), w=tau*hz/sr;
    const k=2*r*Math.cos(w), rr=r*r, g=Math.sqrt(1-rr)*Math.sin(w);
    let y1=0,y2=0;
    return u=>{ const y=k*y1-rr*y2+g*u; y2=y1; y1=y; return y; };
  }
  const basin=vessel(274,0.009), lip=vessel(461,0.006);
  let seed=0x3a2691ed, lo=0, mid=0, hi=0;
  for (let i=0;i<n;i++) {
    const t=i/sr;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const u=seed/2147483648-1;
    lo+=a*(u-lo); mid+=b*(u-mid); hi+=c*(u-hi);
    const round=basin(u), narrow=lip(u);
    const drive=ramp(0.045,0.43,t)*(1-ramp(0.49,0.92,t));
    const bank=ramp(0.685,0.838,t)*(1-ramp(0.838,1.105,t));
    const back=ramp(0.906,1.135,t)*(1-ramp(1.135,1.64,t));
    const deep=ramp(0.57,1.53,t)*(1-ramp(1.82,3.08,t));
    const body=(mid-lo)*norm, brush=(hi-mid)*norm;
    const p=drive*(0.78*body+0.42*brush+0.26*round)+bank*(0.76*round+0.37*narrow+0.47*body)+back*(0.53*body+0.19*brush+0.21*narrow)+deep*(0.23*round+0.25*body);
    out[i]=0.76*Math.tanh(p)*(1-ramp(2.99,3.078,t));
  }
  out[0]=0; out[n-1]=0;
  return out;
}
