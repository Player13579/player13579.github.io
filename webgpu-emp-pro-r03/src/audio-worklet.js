import {VoiceEngine} from './audio-dsp.js';
class EMPActorProcessor extends AudioWorkletProcessor{
 constructor(){super();this.engine=new VoiceEngine();this.anchorMs=0;this.anchorContext=0;this.rate=0;this.serial=0;this.blocks=0;
  this.port.onmessage=({data:d})=>{if(d.type==='bank')this.engine.banks.set(d.bank.kind,d.bank);if(d.type==='clock'){this.anchorMs=d.actorMs;this.anchorContext=d.contextTime;this.rate=d.rate;}
   if(d.type==='reset'){this.serial=d.serial;this.engine.clear();}
   if(d.serial!==undefined&&d.serial!==this.serial)return;
   if(d.type==='voice')this.engine.add(d.voice);if(d.type==='resolve')this.engine.resolve(d.id,d.atMs);if(d.type==='extend')this.engine.extend(d.id,d.atMs,d.deadlineMs);
   if(d.type==='move'){const v=this.engine.voices.get(d.id);if(v)v.origin=d.position;}
   if(d.type==='listener')this.engine.listener=d.position;if(d.type==='volume')this.engine.volume=d.value;
  };
 }
 process(_input,outputs){const out=outputs[0];if(!out||!out[0])return true;const lag=Math.max(0,currentTime-this.anchorContext),stale=lag>.12;const ms=this.anchorMs+Math.min(lag,.12)*this.rate*1000;this.engine.process(out[0],out[1]??out[0],ms,stale?0:this.rate,sampleRate,stale);
  if(++this.blocks%32===0)this.port.postMessage({type:'stats',serial:this.serial,...this.engine.stats,active:this.engine.voices.size,staleClock:stale});return true;
 }
}
registerProcessor('emp-actor-r02',EMPActorProcessor);
