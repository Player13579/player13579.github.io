const sourceByKind=Object.freeze({create:'barrier-create-r9.wav',hit:'barrier-hit-r9.wav',break:'barrier-break-r9.wav'});
export const SFX_DURATION_MS=Object.freeze({create:650,hit:650,break:480});

export class BarrierSfx {
  constructor({verification=false,fetchImpl=fetch,AudioContextImpl=globalThis.AudioContext}={}) {
    this.verification=!!verification;this.fetchImpl=fetchImpl;this.AudioContextImpl=AudioContextImpl;
    this.context=null;this.unlocked=false;this.muted=false;this.armed=false;this.cache=new Map();this.keys=new Set();this.nodes=new Set();this.voices=new Map();this.starts=[];
  }
  async unlock(){
    if(this.verification||this.muted)return false;
    if(!this.context)this.context=new this.AudioContextImpl({latencyHint:'interactive'});
    await this.context.resume();this.unlocked=this.context.state==='running';return this.unlocked;
  }
  arm(target){if(this.verification||this.armed)return;this.armed=true;target.addEventListener('pointerdown',()=>this.unlock());target.addEventListener('keydown',()=>this.unlock());}
  async load(kind){
    if(!sourceByKind[kind])return null;
    if(!this.cache.has(kind))this.cache.set(kind,(async()=>{const r=await this.fetchImpl(sourceByKind[kind]);if(!r.ok)throw Error(`SFX ${kind} HTTP ${r.status}`);const b=await r.arrayBuffer();if(b.byteLength<44)throw Error(`SFX ${kind} malformed WAV`);return this.context.decodeAudioData(b.slice(0));})());
    return this.cache.get(kind);
  }
  async play(kind,causeId,{offsetMs=0,rate=1,submitted=false,wallNowMs=performance.now()}={}){
    if(this.verification||!this.context||!this.unlocked||this.muted||this.context.state!=='running'||!submitted||!causeId||this.keys.has(causeId)||!Number.isFinite(offsetMs)||offsetMs<0||!Number.isFinite(rate)||rate<=0||offsetMs>=SFX_DURATION_MS[kind])return false;
    const buffer=await this.load(kind);if(!buffer||this.verification||!this.unlocked||this.muted||this.keys.has(causeId))return false;
    const source=this.context.createBufferSource(),gain=this.context.createGain(),offset=offsetMs/1000;
    if(offset>=buffer.duration)return false;
    source.buffer=buffer;source.playbackRate.value=rate;gain.gain.value=.18;source.connect(gain).connect(this.context.destination);
    const voice={source,gain,causeId,kind,ageAtSync:offset,rate,wallAtSync:wallNowMs,contextAtSync:this.context.currentTime,paused:false};this.nodes.add(voice);this.voices.set(causeId,voice);source.onended=()=>{source.disconnect();gain.disconnect();this.nodes.delete(voice);if(this.voices.get(causeId)===voice)this.voices.delete(causeId);};
    this.keys.add(causeId);this.starts.push({kind,causeId,authoredOffsetMs:offsetMs,rate,when:this.context.currentTime,remainingWallMs:(SFX_DURATION_MS[kind]-offsetMs)/rate});source.start(this.context.currentTime,offset);return true;
  }
  async sync(kind,causeId,{ageMs,rate=1,submitted=false,wallNowMs=performance.now()}={}){
    if(this.verification||!submitted||!causeId||!Number.isFinite(ageMs)||ageMs<0||!Number.isFinite(rate)||rate<0||!SFX_DURATION_MS[kind]||!Number.isFinite(wallNowMs))return false;
    if(ageMs>=SFX_DURATION_MS[kind]){const v=this.voices.get(causeId);if(v){if(v.source){try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();this.nodes.delete(v);}this.voices.delete(causeId);}this.keys.add(causeId);return false;}
    if(rate===0){let v=this.voices.get(causeId);if(v?.source){try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();this.nodes.delete(v);v.source=null;v.gain=null;}if(!v){v={causeId,kind,source:null,gain:null,ageAtSync:ageMs/1000,rate:0,wallAtSync:wallNowMs,contextAtSync:this.context?.currentTime??0,paused:true};this.voices.set(causeId,v);this.keys.add(causeId);}else{v.ageAtSync=ageMs/1000;v.rate=0;v.wallAtSync=wallNowMs;v.paused=true;}return false;}
    const active=this.voices.get(causeId);
    if(active?.paused){
      if(!this.context||!this.unlocked||this.muted||this.context.state!=='running')return false;
      const buffer=await this.load(kind),offset=ageMs/1000;if(!buffer||offset>=buffer.duration)return false;
      const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.playbackRate.value=rate;gain.gain.value=.18;source.connect(gain).connect(this.context.destination);
      active.source=source;active.gain=gain;active.ageAtSync=offset;active.rate=rate;active.wallAtSync=wallNowMs;active.contextAtSync=this.context.currentTime;active.paused=false;this.nodes.add(active);
      source.onended=()=>{source.disconnect();gain.disconnect();this.nodes.delete(active);if(this.voices.get(causeId)===active)this.voices.delete(causeId);};source.start(this.context.currentTime,offset);this.starts.push({kind,causeId,authoredOffsetMs:ageMs,rate,when:this.context.currentTime,resume:true,remainingWallMs:(SFX_DURATION_MS[kind]-ageMs)/rate});return true;
    }
    if(active&&this.context?.state==='running'){
      const wallDelta=Math.max(0,(wallNowMs-active.wallAtSync)/1000),estimated=active.ageAtSync+wallDelta*active.rate;
      // PlaybackRate is changed on the same source. A seek is only needed to
      // reconcile a paused/resumed AudioContext or an authoritative age jump.
      if(Math.abs(estimated-ageMs/1000)>.080){
        try{active.source.stop();}catch{}active.source.disconnect();active.gain.disconnect();this.nodes.delete(active);this.voices.delete(causeId);this.keys.delete(causeId);
        return this.play(kind,causeId,{offsetMs:ageMs,rate,submitted,wallNowMs});
      }
      active.source.playbackRate.value=rate;active.rate=rate;active.ageAtSync=ageMs/1000;active.wallAtSync=wallNowMs;active.contextAtSync=this.context.currentTime;return true;
    }
    if(this.keys.has(causeId))return false;
    return this.play(kind,causeId,{offsetMs:ageMs,rate,submitted,wallNowMs});
  }
  setMuted(muted){this.muted=!!muted;if(!this.context)return;if(this.muted)this.context.suspend();else if(this.unlocked)this.context.resume();}
  stopCause(causeId){const v=this.voices.get(causeId);if(!v)return;if(v.source){try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();this.nodes.delete(v);}this.voices.delete(causeId);this.keys.add(causeId);}
  stopAll(){for(const {source,gain} of this.nodes){try{source.stop();}catch{}source.disconnect();gain.disconnect();}this.nodes.clear();this.voices.clear();}
  audit(){return{verification:this.verification,contextCount:this.context?1:0,contextState:this.context?.state??'not-created',unlocked:this.unlocked,muted:this.muted,starts:[...this.starts],activeVoices:this.nodes.size,consumedKeys:this.keys.size,voices:[...this.voices.values()].map(v=>({causeId:v.causeId,kind:v.kind,ageAtSyncMs:v.ageAtSync*1000,rate:v.rate})),gain:this.verification?0:(this.muted?0:(this.context?0.18:0))};}
  dispose(){this.stopAll();if(this.context){this.context.close();this.context=null;}this.unlocked=false;this.armed=false;this.cache.clear();}
}
