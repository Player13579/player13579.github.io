export const version = 'carried-missile-astra62-r1';
export const lifetimeMs = 790;

const verifiedPairs = new WeakSet();
function visible(p) {
  return p?.authorized === true && p.visible === true && p.current === true;
}
// Preview-plane coordinates only. A server target ID, line of sight or raw world coordinates
// never confer viewer permission. No role, identity, health, damage or hit result is read.
export function projectPair(source, target) {
  if (!visible(source) || !visible(target)) return null;
  const values=[source.x,source.y,target.x,target.y];
  if (!values.every(Number.isFinite) || values.some(v => Math.abs(v) > 160)) return null;
  if (Math.hypot(target.x-source.x,target.y-source.y) < 32) return null;
  const pair = Object.freeze({source:Object.freeze(values.slice(0,2)),target:Object.freeze(values.slice(2))});
  verifiedPairs.add(pair);
  return pair;
}
export function fixtureProjection(name) {
  const source={authorized:true,visible:true,current:true,x:-105,y:12};
  if(name==='upper') return projectPair(source,{authorized:true,visible:true,current:true,x:102,y:-32});
  if(name==='lower') return projectPair(source,{authorized:true,visible:true,current:true,x:83,y:33});
  if(name==='hidden') return projectPair(source,{authorized:false,visible:false,current:true});
  return null;
}
export function createMissileGate() {
  let last=0;
  return input => {
    if (input?.kind!=='gunner-missile' || !verifiedPairs.has(input.pair) || !Number.isSafeInteger(input.serial) || input.serial<=last) return false;
    last=input.serial; return true;
  };
}
export function makeFlightPcm(sampleRate=48000) {
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000) throw new RangeError('sample rate');
  const n=Math.ceil(sampleRate*.71), pcm=new Float32Array(n);
  let seed=52713,slow=0,fast=0,phase=0;
  for(let i=0;i<n;i++){
    const t=i/sampleRate, flight=Math.min(1,Math.max(0,(t-.055)/.615));
    const attack=1-Math.exp(-t/.014), tail=Math.min(1,(n-i-1)/(.045*sampleRate));
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    const center=1150-630*flight;
    fast+=(1-Math.exp(-2*Math.PI*(center+760)/sampleRate))*(noise-fast);
    slow+=(1-Math.exp(-2*Math.PI*center/sampleRate))*(noise-slow);
    phase+=2*Math.PI*(540-255*flight)/sampleRate;
    const glide=Math.sin(Math.PI*flight)**.8;
    const release=.115*Math.exp(-t/.055)*Math.sin(2*Math.PI*760*t);
    const air=(fast-slow)*(.28*Math.exp(-t/.12)+.29*glide);
    const tone=.065*glide*Math.sin(phase);
    pcm[i]=tail*attack*(release+air+tone);
  }
  return pcm;
}
