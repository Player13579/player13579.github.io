import {synthSample} from './synth.mjs';
class StaminaProcessor extends AudioWorkletProcessor {
  constructor(){
    super();this.voices=new Map();this.retired=new Set();this.starts=0;this.lastSyncFrame=0;
    this.port.onmessage=({data})=>{
      if(data.type!=='sync')return;
      this.lastSyncFrame=currentFrame;const live=new Set();
      for(const e of data.events){
        if(!Number.isFinite(e.ageMs)||!Number.isFinite(e.durationMs)||e.ageMs<0||e.ageMs>=e.durationMs)continue;
        if(!Number.isFinite(e.rate)||e.rate<0||e.rate>Math.min(4,sampleRate*.45/3600))continue;
        live.add(e.key);let v=this.voices.get(e.key);
        if(!v&&this.retired.has(e.key))continue;
        if(!v){v={age:e.ageMs/1000,duration:e.durationMs/1000,gain:0,target:1,rate:e.rate,pan:e.pan??0,seed:0};this.voices.set(e.key,v);this.starts++;}
        // Phase-continuous clock servo: do not hard-reset oscillator phase every video frame.
        v.syncAge=e.ageMs/1000;v.syncFrame=Number.isFinite(data.audioTime)?data.audioTime*sampleRate:currentFrame;
        v.duration=e.durationMs/1000;v.rate=e.rate;v.pan=e.pan??0;v.target=e.rate===0?0:1;
      }
      for(const[k,v]of this.voices)if(!live.has(k)){v.target=0;v.ending=true;}
      for(const k of this.retired)if(!live.has(k))this.retired.delete(k);
      this.port.postMessage({type:'telemetry',voiceStarts:this.starts,activeVoices:this.voices.size});
    };
  }
  process(inputs,outputs){
    const out=outputs[0];if(!out?.length)return true;
    const left=out[0],right=out[1]??out[0],dt=1/sampleRate;
    const stale=(currentFrame-this.lastSyncFrame)/sampleRate>.1;
    for(let i=0;i<left.length;i++){
      let l=0,r=0;
      for(const[k,v]of this.voices){
        const target=stale||v.age>=v.duration?0:v.target;
        const step=dt/.012;v.gain+=Math.max(-step,Math.min(step,target-v.gain));
        if(v.gain<.00001&&(v.ending||v.age>=v.duration)){this.retired.add(k);this.voices.delete(k);continue;}
        const sample=synthSample(v.age,v.duration,v.seed)*v.gain;
        const a=(Math.max(-1,Math.min(1,v.pan))+1)*Math.PI/4;
        l+=sample*Math.cos(a);r+=sample*Math.sin(a);
        if(!stale&&v.rate>0){
          const expected=v.syncAge+((currentFrame+i-v.syncFrame)/sampleRate)*v.rate;
          const correction=Math.max(-.1,Math.min(.1,(expected-v.age)*10));
          v.age+=dt*Math.max(0,v.rate+correction);
        }
      }
      // Bounded master bus even under simultaneous gains.
      left[i]=Math.tanh(l)*.65;right[i]=Math.tanh(r)*.65;
    }
    return true;
  }
}
registerProcessor('stamina-e',StaminaProcessor);
