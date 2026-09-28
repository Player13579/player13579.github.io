import { CONTRACT } from './contract.js';
import { synthesize } from './synth.js';
/** event単位の一回音。unlock()だけがユーザー操作でAudioContextを起動する。 */
export class OneShotAudio {
  constructor({ contextFactory, verify = false } = {}) {
    this.contextFactory = contextFactory ?? (() => new AudioContext({sampleRate:CONTRACT.sampleRate,latencyHint:'interactive'}));
    this.context = null; this.buffer = null; this.master = null;
    this.voices = new Map(); this.attempted = new Set(); this.verify = verify;
    this.muted = true; this.audit = []; this.epoch = 0;
  }
  async unlock() {
    if (this.verify) return false;
    if (!this.context) {
      this.context = this.contextFactory();
      const pcm = synthesize();
      this.buffer = this.context.createBuffer(2, pcm.channels[0].length, pcm.sampleRate);
      pcm.channels.forEach((c,i) => this.buffer.copyToChannel(c,i));
      this.master = this.context.createGain(); this.master.gain.value = 1; this.master.connect(this.context.destination);
      this.context.addEventListener?.('statechange', () => { if (this.context.state !== 'running') this.stopAll('audio-not-running'); });
    }
    await this.context.resume();
    return this.context.state === 'running';
  }
  setMuted(muted) { this.muted=Boolean(muted); if(this.muted) this.stopAll('muted'); }
  /** GPU証拠を受け取ったRuntimeだけから呼ぶ。再試行で遅延音を出さない。 */
  playOnce(key, { id, seconds, rate, visible, verify=false, generation }) {
    if (this.attempted.has(key)) return false;
    this.attempted.add(key);
    const ac=this.context;
    if (this.verify || verify || this.muted || !visible || ac?.state !== 'running' || seconds >= CONTRACT.duration) {
      this.audit.push({key,id,action:'suppressed',reason:'audio-gate'}); return false;
    }
    const voiceEpoch=this.epoch;
    const source=ac.createBufferSource(), gain=ac.createGain();
    source.buffer=this.buffer; source.loop=false; source.playbackRate.setValueAtTime(rate,ac.currentTime);
    source.connect(gain); gain.connect(this.master);
    source.onended=()=>{
      // 同じkeyの新sessionのvoiceを古いonendedで消さない。
      if (this.voices.get(key)?.source === source) { this.voices.delete(key); this.rebalance(); }
      source.disconnect(); gain.disconnect();
    };
    this.voices.set(key,{source,gain,voiceEpoch,id,generation}); this.rebalance();
    try {
      source.start(ac.currentTime,Math.max(0,seconds));
      this.audit.push({key,id,action:'started',seconds,rate,generation}); return true;
    } catch(error) {
      this.stop(key,'start-failed'); this.audit.push({key,id,action:'failed',error:String(error)}); return false;
    }
  }
  rebalance() {
    const ac=this.context; if(!ac) return;
    const level=CONTRACT.soundVolume/Math.sqrt(Math.max(1,this.voices.size));
    for(const {gain} of this.voices.values()) gain.gain.setValueAtTime(level,ac.currentTime);
  }
  setRate(key,rate) {
    const v=this.voices.get(key), ac=this.context;
    if(v && ac?.state==='running') v.source.playbackRate.setValueAtTime(rate,ac.currentTime);
  }
  stop(key,reason='stopped') {
    const v=this.voices.get(key); if(!v) return;
    this.voices.delete(key);
    v.gain.gain.setValueAtTime(0,this.context.currentTime);
    try {v.source.stop();} catch {}
    this.audit.push({key,id:v.id,action:'stopped',reason}); this.rebalance();
  }
  stopAll(reason='stopped') { for(const key of [...this.voices.keys()]) this.stop(key,reason); }
  resetScope() { this.epoch++; this.stopAll('scope-change'); this.attempted.clear(); }
  dispose() { this.resetScope(); this.context?.close(); }
}
