import {EFFECT_DURATION_SECONDS,MAX_ACTIVE_EVENTS} from './contract.mjs';
import {synthesizeManaSFX} from './sfx-synth.mjs';
/** AudioContextの作成・resumeは呼出側の明示ユーザー操作で行う。自動resumeしない。 */
export class ManaOneShotAudio {
  constructor(context,{volume=.34,voiceGain=.22}={}) {
    this.context=context;this.volume=volume;this.voiceGain=voiceGain;this.voices=new Map();this.seen=new Set();this.history=[];
    this.master=context.createGain();this.master.gain.value=volume;
    this.limiter=context.createDynamicsCompressor();
    this.limiter.threshold.value=-9;this.limiter.knee.value=6;this.limiter.ratio.value=12;
    this.limiter.attack.value=.002;this.limiter.release.value=.060;
    this.master.connect(this.limiter);this.limiter.connect(context.destination);
    const samples=synthesizeManaSFX(context.sampleRate);
    this.buffer=context.createBuffer(1,samples.length,context.sampleRate);this.buffer.copyToChannel(samples,0);
    this.onState=()=>{if(context.state!=='running')this.stopAll();};
    context.addEventListener('statechange',this.onState);
  }
  get running(){return this.context.state==='running';}
  playOnce(key,{eventId,epoch,phaseSeconds=0,rate=1,ownerWallMs=0}) {
    if(this.seen.has(key))return false;
    this.seen.add(key); // 非稼働/容量超過も後から再発音しない。
    if(!this.running || phaseSeconds<0 || phaseSeconds>=EFFECT_DURATION_SECONDS || ![1,2].includes(rate) || this.voices.size>=MAX_ACTIVE_EVENTS)return false;
    const c=this.context,source=c.createBufferSource(),gain=c.createGain();
    source.buffer=this.buffer;source.loop=false;source.playbackRate.setValueAtTime(rate,c.currentTime);
    gain.gain.setValueAtTime(this.voiceGain,c.currentTime);source.connect(gain);gain.connect(this.master);
    const record={key,eventId,epoch,source,gain,startedAtAudio:c.currentTime,ownerWallMs,rate};this.voices.set(key,record);
    source.onended=()=>{source.disconnect();gain.disconnect();if(this.voices.get(key)===record)this.voices.delete(key);};
    try{source.start(c.currentTime,phaseSeconds);}catch(error){this.voices.delete(key);source.disconnect();gain.disconnect();return false;}
    this.history.push({kind:'start',key,eventId,epoch,rate,phaseSeconds,ownerWallMs,audioTime:c.currentTime});return true;
  }
  setRate(key,rate,ownerWallMs) {
    const v=this.voices.get(key);if(!v || ![1,2].includes(rate))return;
    // 同じBufferSourceの位置を保ち、rateだけを切り替える。SFXをstartし直さない。
    v.source.playbackRate.setValueAtTime(rate,this.context.currentTime);v.rate=rate;
    this.history.push({kind:'rate',key,rate,ownerWallMs,audioTime:this.context.currentTime});
  }
  stop(key){const v=this.voices.get(key);if(!v)return;try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();this.voices.delete(key);this.history.push({kind:'stop',key,audioTime:this.context.currentTime});}
  stopAll(){for(const k of [...this.voices.keys()])this.stop(k);}
  resetSession(){this.stopAll();this.seen.clear();this.history.length=0;}
  dispose(){this.stopAll();this.context.removeEventListener('statechange',this.onState);this.master.disconnect();this.limiter.disconnect();this.seen.clear();}
}
