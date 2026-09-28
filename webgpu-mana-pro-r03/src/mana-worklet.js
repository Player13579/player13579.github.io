import {VoiceMixer} from './audio-core.js';
class ManaProcessor extends AudioWorkletProcessor {
  constructor(){
    super();this.mixer=new VoiceMixer();this.blocks=0;
    this.port.onmessage=({data:m})=>{
      if(m.type==='begin')this.mixer.begin(m.voice);
      else if(m.type==='sync')this.mixer.sync(m.voice);
      else if(m.type==='cancel')this.mixer.cancel(m.id,m.at);
      else if(m.type==='reset')this.mixer.reset();
      else if(m.type==='gain')this.mixer.gain=m.value;
      else if(m.type==='muted')this.mixer.muted=m.value;
      else if(m.type==='report')this.report();
    };
  }
  report(){this.port.postMessage({type:'metrics',at:currentTime,active:this.mixer.voices.size,...this.mixer.stats});}
  process(inputs,outputs){
    const [left,right]=outputs[0]??[];
    if(left&&right)this.mixer.render(left,right,currentTime,sampleRate);
    if(++this.blocks%32===0)this.report();
    return true;
  }
}
registerProcessor('dva-mana-acquire-r03',ManaProcessor);
