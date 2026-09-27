/** Actor-authoritative mixer shared by the AudioWorklet and executable Node tests. Time arguments: audio seconds. */
export class VoiceMixer {
  constructor(){this.voices=new Map();this.gain=0.7;this.muted=false;this.stats={starts:0,duplicates:0,ends:0,cancels:0,maxConcurrent:0,syncs:0,resets:0};}
  begin({id,pcm,ageMs=0,rate=1,at=0}){
    if(this.voices.has(id)){this.stats.duplicates++;return false;}
    if(!pcm||ageMs>=pcm.durationMs||ageMs<0)return false;
    this.voices.set(id,{id,pcm,ageMs,rate,at,bornAt:at,slew:0,slewAt:at,cancelAt:null,resyncAt:-Infinity});
    this.stats.starts++;this.stats.maxConcurrent=Math.max(this.stats.maxConcurrent,this.voices.size);return true;
  }
  sync({id,ageMs,rate,at}){
    const v=this.voices.get(id);if(!v)return;
    const predicted=this.age(v,at),difference=predicted-ageMs;
    Object.assign(v,{ageMs,rate,at,slew:Math.abs(difference)<24?difference:0,slewAt:at});
    if(Math.abs(difference)>=24)v.resyncAt=at;this.stats.syncs++;
  }
  age(v,t){return v.ageMs+(t-v.at)*1000*v.rate+v.slew*Math.max(0,1-(t-v.slewAt)/0.008);}
  cancel(id,at){const v=this.voices.get(id);if(v&&v.cancelAt===null){v.cancelAt=at;this.stats.cancels++;}}
  reset(){this.stats.ends+=this.voices.size;this.stats.resets++;this.voices.clear();}
  render(left,right,startTime,sampleRate){
    left.fill(0);right.fill(0);
    for(let i=0;i<left.length;i++){
      const t=startTime+i/sampleRate;let l=0,r=0;
      for(const [id,v] of this.voices){
        const age=this.age(v,t),release=v.cancelAt===null?1:Math.min(1,Math.max(0,1-(t-v.cancelAt)/0.004));
        if(age>=v.pcm.durationMs||release<=0){this.voices.delete(id);this.stats.ends++;continue;}
        if(age<0||v.rate===0)continue; // pause emits silence, not a frozen DC sample
        const pos=age*v.pcm.sampleRate/1000,a=Math.floor(pos),f=pos-a,b=Math.min(a+1,v.pcm.left.length-1);
        if(a>=v.pcm.left.length)continue;
        const attack=Math.min(1,Math.max(0,(t-v.bornAt)/0.003));
        const resync=Math.min(1,Math.max(0,(t-v.resyncAt)/0.004));
        const gain=release*attack*resync;
        l+=(v.pcm.left[a]*(1-f)+v.pcm.left[b]*f)*gain;
        r+=(v.pcm.right[a]*(1-f)+v.pcm.right[b]*f)*gain;
      }
      if(!this.muted){left[i]=Math.tanh(l*this.gain);right[i]=Math.tanh(r*this.gain);}
    }
  }
}
