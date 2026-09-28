/** 新規に合成した3音色。既存音源・既存Eの音は使わない。 */
export const AUDIO_PROFILES=Object.freeze([
  Object.freeze({name:'焦点契約',seconds:1.26,tones:[[0.08,640,0.42,0.20,0.010,8],[0.28,960,0.82,0.15,0.024,-18]],ticks:[0.035,0.225],noise:0.12}),
  Object.freeze({name:'視差架構',seconds:1.96,tones:[[0.04,392,1.82,0.20,0.11,22],[0.21,588,1.62,0.16,0.15,-14],[0.43,882,1.30,0.12,0.18,8]],ticks:[],noise:0}),
  Object.freeze({name:'一滴の充填',seconds:1.46,tones:[[0.12,510,0.48,0.20,0.012,50],[0.12,1275,0.27,0.08,0.008,-100],[0.39,765,1.02,0.16,0.05,0]],ticks:[0.12],noise:0.025})
]);
export const MAX_VOICES=32;
const TAU=2*Math.PI;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function envelope(t,life,attack){
  if(t<0||t>=life)return 0;
  const a=Math.min(1,t/attack), release=clamp((life-t)/Math.min(.18,life*.32),0,1);
  return Math.sin(a*Math.PI/2)**2*Math.exp(-3*t/life)*release*release;
}
/** PCMは解析とOfflineAudioContextで共通。frequency・noiseとも決定的で音量利益を持たない。 */
export function synthesize(kind,sampleRate=48000){
  const p=AUDIO_PROFILES[kind];if(!p||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('invalid audio profile/rate');
  const data=new Float32Array(Math.ceil(p.seconds*sampleRate));let rng=0x40ac01+kind*1009, previous=0;
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate;let v=0;
    for(const [start,f,life,amp,attack,chirp] of p.tones){
      const u=t-start,env=envelope(u,life,attack);
      const phase=TAU*(f*u+0.5*chirp*u*u);
      const modal=kind===1?Math.sin(phase)+.20*Math.sin(phase*2.003):Math.sin(phase)+.10*Math.sin(phase*2.41);
      v+=amp*env*modal;
    }
    rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;const noise=(rng>>>0)/2147483648-1;
    for(const start of p.ticks){const u=t-start;if(u>=0&&u<.026)v+=(noise-previous)*p.noise*envelope(u,.026,.002);}
    previous=noise;
    // 定常のDCオフセット無し。headroomのため線形縮小、過剰なlimitで形を潰さない。
    data[i]=v*.72;
  }
  return data;
}
export function spatialGain(event,listener,maxDistance=720){
  if(!listener||listener.roomId!==event.roomId||listener.matchId!==event.matchId||![listener.x,listener.y].every(Number.isFinite))return {gain:0,pan:0};
  const dx=event.x-listener.x,dy=event.y-listener.y,d=Math.hypot(dx,dy);
  return {gain:d>=maxDistance?0:(1-d/maxDistance)**2,pan:clamp(dx/maxDistance,-.8,.8)};
}
export class FacilityAudio {
  constructor({verify=false,listener,audibility,clock=()=>performance.now(),context=null}={}){
    if(typeof listener!=='function'||typeof audibility!=='function')throw new TypeError('listenerとaudibilityをホストから指定');
    this.verify=verify;this.listener=listener;this.audibility=audibility;this.clock=clock;
    this.context=context;this.ownsContext=!context;this.enabled=false;this.disposed=false;
    this.master=null;this.compressor=null;this.voices=new Map();this.seen=new Set();this.buffers=new Map();
    this.stats={attempted:0,started:0,suppressedVerify:0,suppressedLocked:0,suppressedDistance:0,duplicates:0,stopped:0,suppressedCapacity:0};
  }
  async enable(){
    if(this.disposed||this.verify)return false;
    if(!globalThis.navigator?.userActivation?.isActive)throw new Error('実ユーザー操作中に音声を有効化してください');
    if(!this.context){const C=globalThis.AudioContext;if(!C)throw new Error('Web Audio非対応');this.context=new C();}
    if(!this.master){
      this.master=this.context.createGain();this.master.gain.value=.34;
      this.compressor=this.context.createDynamicsCompressor();
      this.compressor.threshold.value=-12;this.compressor.knee.value=8;this.compressor.ratio.value=5;
      this.compressor.attack.value=.004;this.compressor.release.value=.16;
      this.master.connect(this.compressor);this.compressor.connect(this.context.destination);
    }
    await this.context.resume();if(this.disposed||!this.context)return false;this.enabled=this.context.state==='running';return this.enabled;
  }
  trigger(event,{maxDistance=720,volume=.7,ownerId}={}){
    this.stats.attempted++;
    if(this.disposed)return 'disposed';
    if(this.seen.has(event.key)){this.stats.duplicates++;return 'duplicate';}this.seen.add(event.key);
    if(ownerId!==event.playerId)return 'owner_mismatch';
    if(this.verify){this.stats.suppressedVerify++;return 'verify';}
    if(!this.enabled||!this.context||this.context.state!=='running'){this.stats.suppressedLocked++;return 'locked';}
    if(this.voices.size>=MAX_VOICES){this.stats.suppressedCapacity++;return 'voice_capacity';}
    const spatial=spatialGain(event,this.listener(),maxDistance),blocked=this.audibility(event);
    const audible=Number.isFinite(blocked)?clamp(blocked,0,1):0;
    if(spatial.gain*audible<=0){this.stats.suppressedDistance++;return 'inaudible';}
    const age=Math.max(0,(this.clock()-event.startMs)/1000),profile=AUDIO_PROFILES[event.kind];
    if(age>=profile.seconds)return 'past_sound_end';
    let buffer=this.buffers.get(event.kind);
    if(!buffer){const samples=synthesize(event.kind,this.context.sampleRate);buffer=this.context.createBuffer(1,samples.length,this.context.sampleRate);buffer.copyToChannel(samples,0);this.buffers.set(event.kind,buffer);}
    const source=this.context.createBufferSource(),gain=this.context.createGain(),pan=this.context.createStereoPanner();
    source.buffer=buffer;gain.gain.value=volume*spatial.gain*audible/Math.sqrt(1+this.voices.size);pan.pan.value=spatial.pan;
    source.connect(gain);gain.connect(pan);pan.connect(this.master);
    const voice={source,gain,pan,event,maxDistance,volume,weight:1/Math.sqrt(1+this.voices.size)};this.voices.set(event.key,voice);
    const finish=()=>{source.onended=null;source.disconnect();gain.disconnect();pan.disconnect();this.voices.delete(event.key);};
    source.onended=finish;source.start(this.context.currentTime+.004,age);this.stats.started++;return 'started';
  }
  updateSpatial(){
    if(!this.context)return;
    const listener=this.listener();
    for(const voice of this.voices.values()){
      const s=spatialGain(voice.event,listener,voice.maxDistance),a=this.audibility(voice.event),gain=s.gain*(Number.isFinite(a)?clamp(a,0,1):0)*voice.volume*voice.weight;
      voice.gain.gain.setTargetAtTime(gain,this.context.currentTime,.025);voice.pan.pan.setTargetAtTime(s.pan,this.context.currentTime,.025);
    }
  }
  stopAll(){for(const v of [...this.voices.values()]){v.source.onended=null;try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();v.pan.disconnect();this.stats.stopped++;}this.voices.clear();}
  async suspend(){this.stopAll();this.enabled=false;if(this.ownsContext&&this.context?.state==='running')await this.context.suspend();}
  async dispose(){if(this.disposed)return;this.disposed=true;this.enabled=false;this.stopAll();this.master?.disconnect();this.compressor?.disconnect();this.buffers.clear();this.seen.clear();if(this.ownsContext&&this.context&&this.context.state!=='closed')await this.context.close();this.context=null;}
}
