/** Values supplied by the user; descriptive only. No server branch/pair/HP calculation. */
export const VERSION='r0.3';
export const CONTRACT=Object.freeze({chargeMs:1200,lockMs:7000,normalRange:260,cooldownMs:18000,pairWindowMs:1200,pairDistance:520,killRadius:110,damageRadius:260,pairVisualMs:1600,H64:64,
  audioRange:Object.freeze({charge:2200,normal:2200,suppression:2200,resonance:2600,cancellation:1800})});
export const KINDS=Object.freeze(['charge','normal','resonance','cancellation','suppression']);
export const VISUAL=Object.freeze({normalMs:520,pairMs:1600,releaseMs:Object.freeze({charge:240,normal:160,resonance:230,cancellation:230,suppression:280})});
export function finite(v,name='number'){if(!Number.isFinite(v))throw new TypeError(`${name} must be finite`);return v;}
export function point(p,name='point'){if(!p||typeof p!=='object')throw new TypeError(`${name} is required`);return {x:finite(p.x,`${name}.x`),y:finite(p.y,`${name}.y`)};}
export function id(v,name='id'){if(typeof v!=='string'||!v.length)throw new TypeError(`${name} must be a nonempty string`);return v;}
export function stable(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(stable).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';}
export function clone(value){const validate=(v,seen=new Set())=>{if(v===null||typeof v==='string'||typeof v==='boolean')return;if(typeof v==='number'){finite(v,'JSON number');return;}if(typeof v!=='object'||seen.has(v))throw new TypeError('Only finite, acyclic JSON data may cross the authority boundary');seen.add(v);if(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)throw new TypeError('Plain JSON object required');for(const x of Object.values(v))validate(x,seen);seen.delete(v);};validate(value);return JSON.parse(JSON.stringify(value));}
export function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export function smooth(a,b,x){const t=clamp((x-a)/(b-a));return t*t*(3-2*t);}
export function distanceGain(d,range){finite(d);finite(range);if(d<0||range<=0)throw new RangeError('distance >= 0, range > 0');const t=clamp(d/range);return (1-t*t)**2/(1+6*t*t);}
export function soundKey(e){return stable([e.kind,e.binding.cause,e.binding.owner,e.binding.pair]);}
export class ActorClock {constructor(ms=0){this.ms=finite(ms);this.rate=1;}setRate(r){finite(r);if(r<0||r>8)throw new RangeError('rate 0..8');this.rate=r;}advance(dt){finite(dt);if(dt<0)throw new RangeError('positive delta');return this.ms+=dt*this.rate;}reset(ms=0){this.ms=finite(ms);}}
