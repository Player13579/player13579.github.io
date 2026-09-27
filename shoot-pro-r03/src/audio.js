import {synthesize,seedForVariant} from './sfx-synthesis.js';
import {PROFILES,LIMITS,clamp,hashId} from './profiles.js';
import {SourceLedger} from './contracts.js';
/** legacy既定。Eを鳴らすときは、共通音声busで同sourceの旧gunshotを抑止する。 */
export class ShotAudio {
  constructor({context=null,owner='legacy',claimSource=null,standalone=false,maxVoices=LIMITS.maxVoices,masterGain=0.46}={}){
    if(!['legacy','shoot-e'].includes(owner))throw new TypeError('audio owner');
    if(owner==='shoot-e'&&!standalone&&typeof claimSource!=='function')throw new TypeError('共有音声環境ではsource idの排他的claim関数が必要');
    this.standalone=standalone;
    if(!Number.isSafeInteger(maxVoices)||maxVoices<1||maxVoices>128||!Number.isFinite(masterGain)||masterGain<0||masterGain>1)throw new RangeError('音声予算が不正');
    this.ownsContext=!context;this.context=context;this.isOffline=typeof OfflineAudioContext!=='undefined'&&context instanceof OfflineAudioContext;this.owner=owner;this.claimSource=claimSource;this.maxVoices=maxVoices;this.masterLevel=masterGain;
    this.ledger=new SourceLedger();this.voices=new Map();this.buffers=new Map();this.rate=1;this.ready=false;this.disposed=false;
    this.listener={x:0,y:0,range:600,panRange:260};
    this.stats={played:0,duplicate:0,legacySuppressed:0,suspendedSuppressed:0,claimDenied:0,voiceBudgetSuppressed:0,lateSuppressed:0};
    if(context)this.setup();
  }
  setup(){
    if(this.ready)return;
    const c=this.context;
    this.master=c.createGain();this.master.gain.value=this.masterLevel;
    this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-13;this.compressor.knee.value=8;this.compressor.ratio.value=5;this.compressor.attack.value=0.003;this.compressor.release.value=0.11;
    this.limiter=c.createWaveShaper();const curve=new Float32Array(4097);for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1;curve[i]=0.89*Math.tanh(x/0.89);}this.limiter.curve=curve;this.limiter.oversample='2x';
    this.master.connect(this.compressor);this.compressor.connect(this.limiter);this.limiter.connect(c.destination);
    for(const v of Object.keys(PROFILES)){const pcm=synthesize(v,{sampleRate:c.sampleRate,seed:seedForVariant(v)});const b=c.createBuffer(1,pcm.length,c.sampleRate);b.copyToChannel(pcm,0);this.buffers.set(v,b);}
    this.ready=true;
  }
  async unlock(){
    if(this.disposed)throw new Error('audio disposed');
    if(!this.context){this.context=new AudioContext({latencyHint:'interactive'});this.setup();}
    if(this.context.state==='suspended')await this.context.resume();
    return this.context.state;
  }
  setOwner(owner){if(!['legacy','shoot-e'].includes(owner))throw new TypeError('owner');if(owner==='shoot-e'&&!this.standalone&&typeof this.claimSource!=='function')throw new TypeError('source claim required');this.stopAll();this.owner=owner;}
  setListener(listener){for(const k of ['x','y','range','panRange'])if(!Number.isFinite(listener[k]))throw new TypeError(`listener.${k}`);if(listener.range<=0||listener.panRange<=0)throw new RangeError('listener range');this.listener={...listener};}
  play(shot,age=0){
    const claim=this.ledger.claim(shot.id,shot.variant);
    if(!claim.ok){this.stats.duplicate++;return {status:'suppressed',reason:claim.reason};}
    if(this.owner!=='shoot-e'){this.stats.legacySuppressed++;return {status:'suppressed',reason:'legacy_owns_source'};}
    if(!this.ready||(this.context.state!=='running'&&!this.isOffline)){this.stats.suspendedSuppressed++;return {status:'suppressed',reason:'not_unlocked_no_backlog'};}
    if(this.claimSource&&this.claimSource(shot.id,'shoot-e')!==true){this.stats.claimDenied++;return {status:'suppressed',reason:'shared_bus_claim_denied'};}
    const c=this.context,b=this.buffers.get(shot.variant);
    // 遅延イベントでアタックを後から再生しない。映像だけが残存寿命を描く。
    if(age>0.045||age>=b.duration||this.rate===0){this.stats.lateSuppressed++;return {status:'suppressed',reason:'late_or_paused'};}
    if(this.voices.size>=this.maxVoices){this.stats.voiceBudgetSuppressed++;return {status:'suppressed',reason:'voice_budget'};}
    const source=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner();source.buffer=b;
    const dist=Math.hypot(shot.start.x-this.listener.x,shot.start.y-this.listener.y);
    const atten=(1-clamp(dist/this.listener.range,0,1))**2;
    const level=PROFILES[shot.variant].audioGain*atten/Math.sqrt(Math.max(1,this.voices.size*0.25));
    const detune=0.99+(hashId(shot.id)%201)/10000;
    source.playbackRate.value=this.rate*detune;gain.gain.setValueAtTime(level,c.currentTime);
    pan.pan.value=clamp((shot.start.x-this.listener.x)/this.listener.panRange,-0.85,0.85);
    source.connect(gain);gain.connect(pan);pan.connect(this.master);
    const voice={source,gain,pan,level,detune,sourceId:shot.id};this.voices.set(shot.id,voice);
    source.onended=()=>{source.disconnect();gain.disconnect();pan.disconnect();this.voices.delete(shot.id);};
    source.start(c.currentTime,Math.max(0,age));this.stats.played++;return {status:'played',sourceId:shot.id};
  }
  setRate(rate){
    if(!Number.isFinite(rate)||rate<0||rate>4)throw new RangeError('audio rate');this.rate=rate;if(!this.ready)return;
    const t=this.context.currentTime;for(const v of this.voices.values()){
      // game clockと同じ倍率でsample cursorを進める。ピッチも変わる明示transport方針。
      v.source.playbackRate.setValueAtTime(rate*v.detune,t);
      v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(rate===0?0:v.level,t,0.003);
    }
  }
  stopAll(){
    if(!this.ready)return;const t=this.context.currentTime;for(const v of this.voices.values()){
      v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(0,t,0.003);try{v.source.stop(t+0.018);}catch{} }
    this.voices.clear();
  }
  async dispose(){if(this.disposed)return;this.disposed=true;this.stopAll();if(this.ready){this.master.disconnect();this.compressor.disconnect();this.limiter.disconnect();}if(this.ownsContext&&this.context&&this.context.state!=='closed'&&!this.isOffline)await this.context.close();}
}
