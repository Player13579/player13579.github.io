import {actorTimeAtAudio,voiceCursor,interpolatedPCM,OneCauseVoices,playerClockKey} from './voice-kernel.mjs';
class ActorSFXProcessor extends AudioWorkletProcessor {
  constructor(){
    super();this.bank=new Map();this.clocks=new Map();this.pool=new OneCauseVoices();
    this.port.onmessage=({data})=>{
      if(data.kind==='bank')this.bank.set(data.eventId,data.pcm);
      if(data.kind==='clock')this.clocks.set(playerClockKey(data.playerId),data.clock);
      if(data.kind==='event'){const pcm=this.bank.get(data.event.eventId);if(pcm)this.pool.add(data.event,pcm);}
      if(data.kind==='clear')this.pool.voices.clear();
    };
  }
  process(inputs,outputs){
    const out=outputs[0];if(!out?.length)return true;
    const L=out[0],R=out[1]??out[0];
    for(let n=0;n<L.length;n++){
      let l=0,r=0;const at=currentTime+n/sampleRate;
      for(const v of this.pool.voices.values()){
        const clock=this.clocks.get(playerClockKey(v.event.playerId));if(!clock||clock.rate===0)continue;
        const cursor=voiceCursor(v.event,clock,at,v.pcm.sampleRate);
        l+=interpolatedPCM(v.pcm.left,cursor);r+=interpolatedPCM(v.pcm.right,cursor);
      }
      // 同時発生も一原因一声。混合だけをsoft-limitし、時刻/声数を変えない。
      L[n]=.82*Math.tanh(l/.82);R[n]=.82*Math.tanh(r/.82);
    }
    this.pool.prune(id=>{const c=this.clocks.get(playerClockKey(id));return c?actorTimeAtAudio(c,currentTime):-Infinity;});return true;
  }
}
registerProcessor('dva-actor-sfx',ActorSFXProcessor);
