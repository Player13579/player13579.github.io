import {TYPES} from './emp.mjs?v=v1.4-reconstructed';
export const SOUND_SECONDS=Object.freeze({'emp-charge':.62,emp:.85,'emp-resonance':1.1,'emp-cancel':.85,'emp-storage-lock':.33});
/** Deterministic instrument. A broadband transient, resonant carrier and low electrical body are independent voices. */
export function synthesize(type,sampleRate=48000,negative=false) {
  if(!(type in TYPES))throw new Error('Unknown EMP sound');
  const seconds=SOUND_SECONDS[type],pcm=new Float32Array(Math.ceil(seconds*sampleRate));
  let random=0x6f21aa19,low=0,mid=0,phase=0,carrierPhase=0;
  for(let n=0;n<pcm.length;n++) {
    const t=n/sampleRate,p=t/seconds;
    random^=random<<13;random^=random>>>17;random^=random<<5;
    const white=(random>>>0)/2147483648-1;low+=.032*(white-low);mid+=.24*(white-mid);const band=mid-low;
    const edge=Math.min(1,t/.006)*Math.min(1,(seconds-t)/.04);
    let f=80,noise=0,tone=0,bass=0;
    if(type==='emp-charge') {
      f=180+980*p*p;noise=band*.3*(.3+.7*p);tone=Math.sin(phase)*Math.sin(carrierPhase)*.22; bass=.035*Math.sin(phase*.5);
      carrierPhase+=2*Math.PI*(45+110*p)/sampleRate;
    } else if(type==='emp') {
      f=48+260*Math.exp(-t*16);noise=band*.88*Math.exp(-t*9)+white*.12*Math.exp(-t*60);
      tone=(Math.sin(phase)+.3*Math.sin(phase*2.17))*.28*Math.exp(-t*5);bass=.22*Math.sin(2*Math.PI*47*t)*Math.exp(-t*7);
    } else if(type==='emp-resonance') {
      f=62+300*Math.exp(-Math.max(0,t-.18)*9);
      const attack=Math.min(1,t/.19),release=Math.exp(-Math.max(0,t-.18)*5);
      noise=band*.82*attack*release;tone=.27*(Math.sin(phase)+.48*Math.sin(phase*1.503))*attack*release;bass=.20*Math.sin(2*Math.PI*39*t)*attack*release;
    } else if(type==='emp-cancel') {
      f=980*Math.pow(.08,p)+72;noise=band*.52*(1-p)*Math.sin(Math.PI*p);tone=.27*Math.sin(phase)*Math.sin(carrierPhase)*(1-p);
      carrierPhase+=2*Math.PI*(195-175*p)/sampleRate;bass=.08*Math.sin(2*Math.PI*64*t)*Math.exp(-t*7);
    } else {
      f=220+1100*Math.exp(-t*32);const impulse=Math.exp(-t*25)+.7*Math.exp(-Math.max(0,t-.065)*40)*(t>=.065?1:0);
      noise=band*.35*impulse;tone=.19*(Math.sin(phase)+.3*Math.sin(phase*2.71))*impulse;bass=.12*Math.sin(2*Math.PI*115*t)*Math.exp(-t*16);
    }
    phase+=2*Math.PI*f*(negative?.93:1)/sampleRate;
    // Smooth saturation provides bounded aggregate PCM without a hard sample clamp.
    pcm[n]=Math.tanh((noise+tone+bass)*edge)*.64;
  }
  return pcm;
}
export class EmpAudio {
  constructor({verification=false}={}){this.verification=verification;this.context=null;this.voices=new Map();this.seen=new Set();this.enabled=false;this.stats={starts:0,suppressed:0,stops:0};}
  async enable(){if(this.verification)return false;this.context??=new AudioContext();await this.context.resume();this.enabled=true;return true;}
  presented(events){
    const live=new Set(events.map(e=>e.key));
    for(const [key,voice]of this.voices){if(!live.has(key)){this.release(voice);this.voices.delete(key);this.stats.stops++;}else{const event=events.find(e=>e.key===key);voice.source.playbackRate.setValueAtTime(event.rate,this.context.currentTime);}}
    for(const e of events){
      if(this.seen.has(e.key))continue;this.seen.add(e.key);
      if(this.verification||!this.enabled||!this.context||this.context.state!=='running'){this.stats.suppressed++;continue;}
      const pcm=synthesize(e.type,this.context.sampleRate,e.variant==='negative');const buffer=this.context.createBuffer(1,pcm.length,this.context.sampleRate);buffer.copyToChannel(pcm,0);
      const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.playbackRate.value=e.rate;
      gain.gain.value=.32/Math.sqrt(Math.max(1,events.length));source.connect(gain).connect(this.context.destination);
      const voice={source,gain};this.voices.set(e.key,voice);source.onended=()=>{source.disconnect();gain.disconnect();if(this.voices.get(e.key)===voice)this.voices.delete(e.key);};source.start();this.stats.starts++;
    }
  }
  release(voice){const now=this.context.currentTime;voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setValueAtTime(voice.gain.gain.value,now);voice.gain.gain.linearRampToValueAtTime(0,now+.018);voice.source.stop(now+.020);}
  reset(){for(const v of this.voices.values())this.release(v);this.voices.clear();this.seen.clear();}
  async destroy(){this.reset();if(this.context)await this.context.close();}
}


