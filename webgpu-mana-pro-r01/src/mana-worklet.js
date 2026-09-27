import {ManaVoiceMixer} from './audio-core.js';
class ManaProcessor extends AudioWorkletProcessor {
  constructor(){super();this.mixer=null;this.port.onmessage=({data:m})=>{
    if(m.type==='bank')this.mixer=new ManaVoiceMixer(m.bank);
    else if(this.mixer){
      if(m.type==='begin')this.mixer.begin(m.voice);
      else if(m.type==='sync')this.mixer.sync(m.voice);
      else if(m.type==='cancel')this.mixer.cancel(m.id);
      else if(m.type==='reset')this.mixer.reset();
    }
  };}
  process(_inputs,outputs){const out=outputs[0];if(!out?.[0])return true;
    if(this.mixer)this.mixer.render(out[0],out[1]??out[0],sampleRate);
    else for(const ch of out)ch.fill(0);
    return true;
  }
}
registerProcessor('mana-acquire-r01',ManaProcessor);
