import {synthesizeReactor} from '../effects/reactor/sound.mjs';
import {synthesizeRecycling} from '../effects/recycling/sound.mjs';
/** 一つのcauseKeyは一つのAudioBufferSourceだけを所有。再開/ミュート解除/描画では発音しない。 */
export class FacilityAudio {
  constructor({context=null,outputBus=null,getMixState=()=>({muted:true,volume:0}),verify=false}){
    this.context=context;this.outputBus=outputBus;this.getMixState=getMixState;this.verify=Boolean(verify);
    this.seen=new Set();this.voices=new Map();this.buffers=new Map();
    this.stats={requested:0,started:0,silentVerify:0,muted:0,suspended:0,expired:0,duplicate:0};
    if(this.verify)return; // verifyはcontext生成もbuffer生成もnode生成も行わない。
    if(!context||!outputBus||outputBus.context!==context)throw new TypeError('通常mute/音量を管理する同一contextの既存SFX入力バスが必要');
    this.mixGain=context.createGain();this.mixGain.gain.value=1;this.mixGain.connect(outputBus);
    for(const [key,synth] of [['A',synthesizeReactor],['B',synthesizeRecycling]]){
      const pcm=synth(context.sampleRate),buffer=context.createBuffer(1,pcm.samples.length,context.sampleRate);
      buffer.copyToChannel(pcm.samples,0);this.buffers.set(key,buffer);
    }
  }
  playOnce({causeKey,targetKey,ageMs}){
    if(this.disposed)return 'disposed';
    if(this.seen.has(causeKey)){this.stats.duplicate++;return 'duplicate';}
    this.seen.add(causeKey);this.stats.requested++;
    if(this.verify){this.stats.silentVerify++;return 'silent_verify';}
    if(!Number.isFinite(ageMs))return 'invalid_age';
    const mix=this.getMixState();
    if(!mix||typeof mix.muted!=='boolean'||!Number.isFinite(mix.volume)||mix.volume<=0||mix.volume>1||mix.muted){this.stats.muted++;return 'muted_consumed';}
    if(this.context.state!=='running'){this.stats.suspended++;return 'suspended_consumed';}
    const buffer=this.buffers.get(targetKey);if(!buffer)return 'unknown_target';
    const offset=Math.max(0,ageMs/1000);
    if(offset>=buffer.duration){this.stats.expired++;return 'sound_expired_consumed';}
    const source=this.context.createBufferSource();source.buffer=buffer;
    // 音量を二重乗算しない。outputBusはホストの既存SFX用フェーダーの手前で、live mute/volumeが効く。
    source.connect(this.mixGain);this.voices.set(causeKey,source);
    this.normalizePolyphony();
    source.onended=()=>{source.disconnect();this.voices.delete(causeKey);this.normalizePolyphony();};
    source.start(this.context.currentTime+Math.max(0,-ageMs/1000),offset);
    this.stats.started++;return 'started_once';
  }
  normalizePolyphony(){
    // 同位相の同時発生でも合計振幅が単音の上限を超えない保守的1/N混合。
    // 通常のmute/volumeとは別の専用バス内予算。原因/声を間引かず、単音は1.0。
    this.mixGain?.gain.setValueAtTime(1/Math.max(1,this.voices.size),this.context.currentTime);
  }
  dispose(){this.stopAll();this.mixGain?.disconnect();this.buffers.clear();this.disposed=true;}
  stopAll(){for(const source of this.voices.values()){try{source.stop();}catch{}source.disconnect();}this.voices.clear();if(!this.verify)this.normalizePolyphony();}
}
