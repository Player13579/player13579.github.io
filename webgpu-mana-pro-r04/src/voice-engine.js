// Shared offline/AudioWorklet voice engine. Times in audio seconds; phase in actor-ms.
export class VoiceEngine {
  constructor(){this.voices=new Map();this.seen=new Set();this.gain=0.66;this.muted=false;this.stats={starts:0,duplicates:0,ends:0,cancels:0,peakVoices:0,syncs:0};}
  start({id,pcm,ageMs=0,rate=1,at=0}){
    if(this.seen.has(id)){this.stats.duplicates++;return false;}
    if(typeof id!=='string'||!pcm||!pcm.left?.length||pcm.left.length!==pcm.right?.length||![ageMs,rate,at,pcm.sampleRate,pcm.durationMs].every(Number.isFinite)||ageMs<0||ageMs>=pcm.durationMs||rate<0||rate>8||this.seen.size>=65536)return false;
    this.seen.add(id);this.voices.set(id,{id,pcm,ageMs,rate,at,lastSync:at,stopAt:Infinity,offset:0,correctionAt:at,rebaseAt:-Infinity});
    this.stats.starts++;this.stats.peakVoices=Math.max(this.stats.peakVoices,this.voices.size);return true;
  }
  age(v,t){return v.ageMs+Math.max(0,t-v.at)*1000*v.rate+v.offset*Math.max(0,1-(t-v.correctionAt)/0.006);}
  sync({id,ageMs,rate,at}){
    const v=this.voices.get(id);if(!v||![ageMs,rate,at].every(Number.isFinite)||ageMs<0||rate<0||rate>8)return;
    const diff=this.age(v,at)-ageMs;
    v.offset=Math.abs(diff)<16?diff:0;if(Math.abs(diff)>=16)v.rebaseAt=at;
    v.ageMs=ageMs;v.rate=rate;v.at=at;v.lastSync=at;v.correctionAt=at;this.stats.syncs++;
  }
  stop({id,at=0}){const v=this.voices.get(id);if(v&&v.stopAt===Infinity){v.stopAt=at;this.stats.cancels++;}}
  clear(){this.voices.clear();this.seen.clear();}
  render(left,right,startTime,rate,{watchdog=true}={}){
    left.fill(0);right.fill(0);
    for(let i=0;i<left.length;i++){
      const now=startTime+i/rate;let l=0,r=0;
      for(const [id,v] of this.voices){
        if(now<v.at)continue;
        const age=this.age(v,now),stopGain=Math.max(0,1-(now-v.stopAt)/0.004);
        if(age>=v.pcm.durationMs||stopGain<=0){this.voices.delete(id);this.stats.ends++;continue;}
        if(v.rate===0||(watchdog&&now-v.lastSync>0.25))continue;
        const n=age*v.pcm.sampleRate/1000,j=Math.max(0,Math.floor(n)),k=Math.min(j+1,v.pcm.left.length-1),f=n-j;
        if(j>=v.pcm.left.length)continue;
        const g=Math.min(1,stopGain)*Math.min(1,Math.max(0,(now-v.rebaseAt)/0.003));
        l+=(v.pcm.left[j]*(1-f)+v.pcm.left[k]*f)*g;r+=(v.pcm.right[j]*(1-f)+v.pcm.right[k]*f)*g;
      }
      if(!this.muted){left[i]=Math.tanh(l*this.gain);right[i]=Math.tanh(r*this.gain);}
    }
  }
}
