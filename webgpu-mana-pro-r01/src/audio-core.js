/** Sample-clock actor-time mixer shared by AudioWorklet and automated offline tests. */
export class ManaVoiceMixer {
  constructor(bank) {this.bank=bank;this.voices=new Map();this.stats={begun:0,finished:0,cancelled:0};this.mixGain=1;}
  begin({id,ageMs=0,durationMs=1500,rate=1}) {
    if (this.voices.has(id) || ageMs>=durationMs) return false;
    if (![ageMs,durationMs,rate].every(Number.isFinite) || ageMs<0 || durationMs<900 || rate<0 || rate>8) return false;
    this.voices.set(id,{id,ageMs,durationMs,rate,gain:0,stopping:false,correction:0,correctionSamples:0});this.stats.begun++;return true;
  }
  sync({id,ageMs,rate}) {
    const v=this.voices.get(id); if(!v||v.stopping||!Number.isFinite(ageMs)||!Number.isFinite(rate))return;
    // Main-thread and audio thread are independent clocks. Correct their bounded drift over 8 ms.
    // Long jumps are also authoritative: an expired actor event cannot continue sounding.
    if(ageMs>=v.durationMs){this.cancel(id);return;}
    if(Math.abs(ageMs-v.ageMs)>100){v.ageMs=ageMs;v.gain=0;v.correction=0;v.correctionSamples=0;}
    else {v.correction=ageMs-v.ageMs;v.correctionSamples=-1;}
    v.rate=Math.max(0,Math.min(8,rate));
  }
  cancel(id){const v=this.voices.get(id);if(v&&!v.stopping){v.stopping=true;this.stats.cancelled++;}}
  reset(){this.voices.clear();}
  render(left,right,sampleRate) {
    left.fill(0);right.fill(0);
    const bank=this.bank, stepMs=1000/sampleRate;
    const expected=1/Math.sqrt(Math.max(1,[...this.voices.values()].filter(v=>!v.stopping&&v.rate>0).length));
    for(let i=0;i<left.length;i++){
      this.mixGain+=(expected-this.mixGain)*.002;
      let l=0,r=0;
      for(const [id,v] of this.voices){
        const target=(!v.stopping&&v.rate>0&&v.ageMs<v.durationMs)?1:0;
        v.gain+=Math.max(-1/(sampleRate*.004),Math.min(1/(sampleRate*.004),target-v.gain));
        if((v.stopping||v.ageMs>=v.durationMs)&&v.gain<=0){this.voices.delete(id);this.stats.finished++;continue;}
        const pos=Math.max(0,Math.min(bank.left.length-1.001,v.ageMs/v.durationMs*(bank.left.length-1)));
        const k=Math.floor(pos), f=pos-k;
        l+=(bank.left[k]*(1-f)+bank.left[k+1]*f)*v.gain;
        r+=(bank.right[k]*(1-f)+bank.right[k+1]*f)*v.gain;
        if(v.rate>0&&!v.stopping)v.ageMs+=stepMs*v.rate;
        if(v.correctionSamples===-1)v.correctionSamples=Math.max(1,Math.round(sampleRate*.008));
        if(v.correctionSamples>0){const d=v.correction/v.correctionSamples;v.ageMs+=d;v.correction-=d;v.correctionSamples--;}
      }
      // Soft, symmetric safety limiting; no feedback delay/reverb can outlive the cause.
      left[i]=Math.tanh(l*this.mixGain);right[i]=Math.tanh(r*this.mixGain);
    }
  }
}
