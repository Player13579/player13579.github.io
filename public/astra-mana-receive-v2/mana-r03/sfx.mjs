import { ARRIVALS, DURATION, verificationMode } from './contract.mjs';
const tau=2*Math.PI;
function env(t,start,attack,decay) {
  const x=t-start; return x<0?0:(1-Math.exp(-x/attack))*Math.exp(-x/decay);
}
export function synthesize(sampleRate=48000) {
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000) throw new RangeError('sampleRate');
  const samples=new Float32Array(Math.ceil(DURATION*sampleRate));
  let state=9292026, lastNoise=0;
  for(let i=0;i<samples.length;i++) {
    const t=i/sampleRate;
    state=(Math.imul(1664525,state)+1013904223)>>>0;
    const noise=(state/4294967296)*2-1;
    lastNoise+=.17*(noise-lastNoise);
    // Soft source aspiration with an ascending, narrow harmonic body.
    let v=.09*env(t,.035,.03,.19)*lastNoise;
    v+=.035*env(t,.12,.075,.34)*Math.sin(tau*(146*t+135*t*t));
    for(let j=0;j<ARRIVALS.length;j++) {
      const a=ARRIVALS[j], x=Math.max(0,t-a), f=[392.0,493.883,587.33][j];
      v+=env(t,a,.008,.14)*(.12*Math.sin(tau*f*x)+.045*Math.sin(tau*f*1.503*x)+.023*Math.sin(tau*f*3.013*x));
      v+=.022*env(t,a,.003,.025)*noise;
    }
    const release=1-Math.max(0,Math.min(1,(t-1.28)/.22));
    samples[i]=v*release*release;
  }
  return samples;
}
export function encodeWav(samples,sampleRate=48000) {
  const b=new ArrayBuffer(44+samples.length*2),d=new DataView(b);
  const text=(o,s)=>[...s].forEach((c,i)=>d.setUint8(o+i,c.charCodeAt(0)));
  text(0,'RIFF'); d.setUint32(4,b.byteLength-8,true); text(8,'WAVE');text(12,'fmt ');
  d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,1,true);
  d.setUint32(24,sampleRate,true);d.setUint32(28,sampleRate*2,true);d.setUint16(32,2,true);d.setUint16(34,16,true);
  text(36,'data');d.setUint32(40,samples.length*2,true);
  samples.forEach((v,i)=>d.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,v))*32767),true));
  return new Uint8Array(b);
}
export class ManaSound {
  constructor(search,contextFactory=()=>new AudioContext()) {
    this.verify=verificationMode(search);this.contextFactory=contextFactory;this.context=null;
    this.muted=false;this.played=new Set();this.sources=new Set();
  }
  async enable() {
    if(this.verify) return false;
    this.context??=this.contextFactory();await this.context.resume();return true;
  }
  play(receipt,elapsed=0) {
    if(elapsed<0) return false; // Legitimate future start stays pending.
    if(this.played.has(receipt.key)) return false;
    this.played.add(receipt.key);
    // Suppressed/late events are consumed; unmute never replays past receipts.
    if(this.verify||this.muted||!this.context||this.context.state!=='running'||elapsed>.12) return false;
    const samples=synthesize(this.context.sampleRate), b=this.context.createBuffer(1,samples.length,this.context.sampleRate);
    b.copyToChannel(samples,0);const source=this.context.createBufferSource(),gain=this.context.createGain();
    source.buffer=b; gain.gain.value=.65; source.connect(gain).connect(this.context.destination);
    source.onended=()=>{source.disconnect();gain.disconnect();this.sources.delete(source);};
    this.sources.add(source); source.start(this.context.currentTime,elapsed); return true;
  }
  setMuted(value) {this.muted=!!value;if(this.muted)this.stop();}
  stop() {for(const s of this.sources){try{s.stop();}catch{}}this.sources.clear();}
  reset() {this.stop();this.played.clear();}
  async dispose() {this.reset();if(this.context)await this.context.close();this.context=null;}
}
