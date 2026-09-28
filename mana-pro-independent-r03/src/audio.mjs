import {DURATION,LIMITS} from './contract.mjs';
import {synthesize} from './sfx-synth.mjs';
/** 自動resumeをしない。発音の入口は可視WebGPU receiptを処理したManaRuntimeだけ。 */
export class ManaAudio{
  constructor(context,{volume=.30}={}){
    this.context=context;this.voices=new Map();this.seen=new Set();this.audit=[];
    const d=context;this.mix=d.createGain();this.saturate=d.createWaveShaper();this.master=d.createGain();this.master.gain.value=volume;
    const curve=new Float32Array(4097);for(let i=0;i<curve.length;i++){const x=2*i/(curve.length-1)-1;curve[i]=.88*Math.tanh(1.4*x);}this.saturate.curve=curve;this.saturate.oversample='none';
    this.mix.connect(this.saturate);this.saturate.connect(this.master);this.master.connect(d.destination);
    const pcm=synthesize(d.sampleRate);this.buffer=d.createBuffer(1,pcm.length,d.sampleRate);this.buffer.copyToChannel(pcm,0);
    this.stateListener=()=>{if(!this.running)this.stopAll();};d.addEventListener('statechange',this.stateListener);
  }
  get running(){return this.context.state==='running';}
  record(item){this.audit.push(item);if(this.audit.length>2000)this.audit.shift();}
  playOnce(key,{eventId,epoch,age=0,rate=1,ownerWallMs=0}){
    if(this.seen.has(key))return false;this.seen.add(key);
    if(!this.running||age<0||age>=DURATION||![1,2].includes(rate)||this.voices.size>=LIMITS.active)return false;
    const d=this.context,s=d.createBufferSource(),gain=d.createGain();
    s.buffer=this.buffer;s.loop=false;s.playbackRate.setValueAtTime(rate,d.currentTime);gain.gain.setValueAtTime(.22,d.currentTime);s.connect(gain);gain.connect(this.mix);
    const voice={key,eventId,epoch,source:s,gain,rate,ownerWallMs,startAudio:d.currentTime};this.voices.set(key,voice);
    s.onended=()=>{s.disconnect();gain.disconnect();if(this.voices.get(key)===voice)this.voices.delete(key);};
    try{s.start(d.currentTime,age);}catch{s.disconnect();gain.disconnect();this.voices.delete(key);return false;}
    this.record({kind:'start',key,eventId,epoch,age,rate,ownerWallMs,audioTime:d.currentTime});return true;
  }
  setRate(key,rate,ownerWallMs){
    const v=this.voices.get(key);if(!v||![1,2].includes(rate))return;
    // 同じBufferSourceに対する速度変更。位相/offsetをリセットするstartは呼ばない。
    v.source.playbackRate.setValueAtTime(rate,this.context.currentTime);v.rate=rate;
    this.record({kind:'rate',key,rate,ownerWallMs,audioTime:this.context.currentTime});
  }
  stop(key){const v=this.voices.get(key);if(!v)return;v.gain.gain.setValueAtTime(0,this.context.currentTime);try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();this.voices.delete(key);this.record({kind:'stop',key,audioTime:this.context.currentTime});}
  stopAll(){for(const key of [...this.voices.keys()])this.stop(key);}
  resetSession(){this.stopAll();this.seen.clear();this.audit.length=0;}
  dispose(){this.stopAll();this.context.removeEventListener('statechange',this.stateListener);this.mix.disconnect();this.saturate.disconnect();this.master.disconnect();this.seen.clear();}
}
