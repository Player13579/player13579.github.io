// Synthesized contact/strain/settling transients, not recorded or a renamed beep.
export function synthesize(sampleRate=48000) {
  const data=new Float32Array(Math.ceil(sampleRate*3.4)); let seed=0x137ae19, low=0, peak=0;
  for(let i=0;i<data.length;i++) {
    const t=i/sampleRate; seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=(seed/4294967296)*2-1; low+=.018*(noise-low);
    let s=0;
    // Load enters feet, then pelvis, shoulders, head; decaying inharmonic contact modes.
    for(const [start,gain,f0] of [[.28,.35,132],[.78,.30,177],[1.22,.27,221],[1.53,.25,286],[2.18,.32,164],[2.63,.22,118]]) {
      const a=t-start;
      if(a>=0&&a<.55){const env=(1-Math.exp(-a*120))*Math.exp(-a*11);
        s+=gain*env*(.44*Math.sin(2*Math.PI*f0*a)+.24*Math.sin(2*Math.PI*f0*1.47*a)+.10*Math.sin(2*Math.PI*f0*2.91*a)+.20*(noise-low)*Math.exp(-a*30));}
    }
    const load=Math.min(1,t/.22)*Math.max(0,Math.min(1,(2.8-t)/.5));
    // Fine contacts accompany each material section, then vanish before the quiet retained tail.
    for(let row=0;row<10;row++){
      const a=t-(.12+(.05+row*.1)*1.25+.25);
      if(a>=0&&a<.13)s+=(noise-low)*.075*(1-Math.exp(-a*170))*Math.exp(-a*40);
    }
    s+=low*.65*load+(.012*Math.sin(2*Math.PI*83*t)+.007*Math.sin(2*Math.PI*127*t))*load;
    s*=Math.min(1,t/.012)*Math.min(1,(3.4-t)/.05); data[i]=s;peak=Math.max(peak,Math.abs(s));
  }
  return {data,sampleRate,peak,duration:3.4};
}
export class Sfx {
  constructor({verify=false,contextFactory=()=>new AudioContext()}={}){this.verify=verify;this.contextFactory=contextFactory;this.context=null;this.enabled=false;this.closed=false;this.muted=false;this.voices=new Set();this.seen=new Set();this.starts=0;this.failures=[];this.generation=0;this.activationEpoch=0;}
  async activateFromGesture(){if(this.verify||this.closed||this.muted)return this.snapshot(); const activationEpoch=++this.activationEpoch;try {this.context??=this.contextFactory();await this.context.resume();if(this.closed||this.muted||activationEpoch!==this.activationEpoch)return this.snapshot();if(this.context.state!=='running'){this.enabled=false;this.status='audio-retry-available';return this.snapshot();}if(!this.buffer){const s=synthesize(this.context.sampleRate);this.buffer=this.context.createBuffer(1,s.data.length,s.sampleRate);this.buffer.copyToChannel(s.data,0);}this.enabled=true;}catch(e){this.status='audio-retry-available';this.failures.push(String(e));}return this.snapshot();}
  setMuted(value){if(this.verify)return;this.muted=Boolean(value);if(this.muted)this.activationEpoch++;this.enabled=!this.muted&&Boolean(this.context);if(this.muted)this.stop();}
  afterGpu(receipt,{held=false,visible=true,generation,causeId,ageMs}={}) {
    if(this.verify||this.closed||!this.enabled||this.context?.state!=='running'||held||!visible||!receipt.completed||!Number.isFinite(ageMs)||ageMs>130||ageMs<0||generation!==this.generation||generation!==receipt.generation||causeId!==receipt.causeId||this.seen.has(receipt.causeId))return false;
    try {
    const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.buffer;gain.gain.value=.8;source.connect(gain).connect(this.context.destination);
    const voice={source,gain};this.voices.add(voice);source.onended=()=>{this.voices.delete(voice);source.disconnect();gain.disconnect();};
    source.start(0,ageMs/1000);this.seen.add(receipt.causeId);this.starts++;return true;
    } catch(error) {this.failures.push(String(error));this.stop();return false;}
  }
  invalidate(generation){this.generation=generation;this.stop();}
  stop(){for(const v of this.voices){try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();}this.voices.clear();}
  snapshot(){return {verify:this.verify,enabled:this.enabled,closed:this.closed,generation:this.generation,starts:this.starts,voices:this.voices.size,failures:[...this.failures]};}
  async dispose(){if(this.closed)return;this.closed=true;this.activationEpoch++;this.generation++;this.stop();await this.context?.close();}
}
