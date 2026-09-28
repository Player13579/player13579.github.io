import {DURATION} from './events.mjs';
// Original one-shot: soft granular intake, accelerating hollow-liquid movement,
// then three damped, inharmonic glass-body modes at the accumulation boundary.
export function synthesize(sampleRate = 48000) {
  const samples = new Float32Array(Math.ceil(DURATION * sampleRate));
  let phase = 0, seed = 78139, low = 0;
  const rise = (x, a, b) => {const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t);};
  for (let i=0;i<samples.length;i++) {
    const t=i/sampleRate;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1; low += .12*(noise-low);
    const supply=rise(t,0,.025)*(1-rise(t,.16,.28));
    const flow=rise(t,.13,.24)*(1-rise(t,.86,1.02));
    phase += 2*Math.PI*(240+440*rise(t,.17,.74))/sampleRate;
    let s = supply*(low*.12+Math.sin(2*Math.PI*310*t)*.038);
    s += flow*(Math.sin(phase+1.6*Math.sin(phase*.503))*.067+low*.055);
    // Arrival depths differ: three short low resonances precede the shared receiving peak.
    for(let packet=0;packet<3;packet++) {
      const a=t-[.64,.77,.90][packet];
      if(a>=0) s += rise(a,0,.009)*Math.exp(-a*24)*(.051*Math.sin(2*Math.PI*[347,449,563][packet]*a)+low*.025);
    }
    const r=t-.96;
    if(r>=0) {
      const attack=rise(r,0,.011), end=1-rise(t,1.18,1.45);
      s += attack*end*(Math.sin(2*Math.PI*523.25*r)*Math.exp(-r*6.8)*.135+Math.sin(2*Math.PI*883*r)*Math.exp(-r*10.8)*.048+Math.sin(2*Math.PI*1379*r)*Math.exp(-r*16)*.022);
      s += attack*end*low*.018*Math.exp(-r*13);
    }
    samples[i] = s*(1-rise(t,1.42,DURATION));
  }
  return samples;
}
export class ManaSound {
  constructor({verify=false}={}) {this.verify=verify; this.context=null; this.voices=new Map(); this.starts=0;}
  async unlock() {
    if(this.verify) return false;
    this.context ||= new AudioContext(); await this.context.resume();
    if(!this.buffer) {const a=synthesize(this.context.sampleRate); this.buffer=this.context.createBuffer(1,a.length,this.context.sampleRate); this.buffer.copyToChannel(a,0);}
    return true;
  }
  start(e) {
    if(this.verify || this.context?.state!=='running') return;
    const s=this.context.createBufferSource(), gain=this.context.createGain();
    s.buffer=this.buffer; s.playbackRate.value=e.rate; gain.gain.value=.65/Math.sqrt(Math.max(1,this.voices.size+1));
    s.connect(gain).connect(this.context.destination); this.voices.set(e.key,{s,gain}); this.starts++;
    s.onended=()=>{s.disconnect();gain.disconnect();this.voices.delete(e.key);}; s.start();
  }
  rate(e) {const v=this.voices.get(e.key);if(v) v.s.playbackRate.setValueAtTime(e.rate,this.context.currentTime);}
  stop(e) {const v=this.voices.get(e.key); if(!v)return; this.voices.delete(e.key); const t=this.context.currentTime;v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(0,t,.003); try {v.s.stop(t+.018);}catch{}}
  async close() {for(const key of [...this.voices.keys()])this.stop({key});await this.context?.close();}
}
