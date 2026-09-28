import {CooldownEvents,CooldownSound as OriginalSound,synthesizeSfx as originalSfx} from './original-r05/effect.mjs';
export {CooldownEvents};
export const VERSION='astra-cooldown-benefit-r0.5-sparkle-r0.2';
export const LIFE_MS=1480;
export {shader} from './shader-sparkle-r02.mjs';
// Original compression/release PCM is copied unchanged, then the new response is added.
// Two finite high partials answer the receiver sparkle peaks in the same single voice.
export function synthesizeSfx(sampleRate=48000){
 const base=originalSfx(sampleRate),duration=1.44,data=new Float32Array(Math.round(duration*sampleRate));data.set(base);
 const responses=[{at:1.034,hz:1512,gain:.060},{at:1.184,hz:2016,gain:.050}];
 for(const r of responses)for(let i=Math.floor(r.at*sampleRate);i<data.length;i++){
  const t=i/sampleRate-r.at;if(t<0||t>.24)continue;
  const attack=1-Math.exp(-t*200),release=Math.exp(-t*24),end=Math.min(1,(.24-t)/.020,(duration-i/sampleRate)/.025);
  data[i]+=r.gain*attack*release*end*(Math.sin(2*Math.PI*r.hz*t)+.22*Math.sin(2*Math.PI*r.hz*2.007*t));
 }
 return data;
}
export class CooldownSound extends OriginalSound {
 trigger(id){
  if(this.seen.has(id))return false;this.seen.add(id);this.triggers++;
  if(this.verify||!this.enabled)return false;
  const c=this.context,a=synthesizeSfx(c.sampleRate),b=c.createBuffer(1,a.length,c.sampleRate);b.copyToChannel(a,0);
  const s=c.createBufferSource(),g=c.createGain();s.buffer=b;g.gain.value=.7;s.connect(g).connect(c.destination);s.start();
  s.onended=()=>{s.disconnect();g.disconnect();};this.played++;return true;
 }
}
