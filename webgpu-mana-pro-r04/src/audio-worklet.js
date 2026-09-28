import {VoiceEngine} from './voice-engine.js';
class ManaGainProcessor extends AudioWorkletProcessor {
  constructor(){super();this.engine=new VoiceEngine();this.reportCounter=0;this.port.onmessage=({data:m})=>{
    if(m.type==='start')this.engine.start(m.value);
    else if(m.type==='sync')this.engine.sync(m.value);
    else if(m.type==='stop')this.engine.stop(m.value);
    else if(m.type==='clear')this.engine.clear();
    else if(m.type==='gain')this.engine.gain=m.value;
    else if(m.type==='mute')this.engine.muted=m.value;
  };}
  process(inputs,outputs){const output=outputs[0];if(!output?.length)return true;this.engine.render(output[0],output[1]??output[0],currentTime,sampleRate);if(++this.reportCounter>=40){this.reportCounter=0;this.port.postMessage({type:'stats',stats:{...this.engine.stats,voices:this.engine.voices.size}});}return true;}
}
registerProcessor('mana-gain-r04',ManaGainProcessor);
