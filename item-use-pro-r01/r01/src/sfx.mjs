import {synthesize} from './synthesis.mjs';
import {VARIANTS, MAX_SEEN} from './contract.mjs';
export const MAX_VOICES=8;
export const VOICE_GAIN=0.16;
/** ステレオ位置情報を追加しない短い成立音。privacyを音で漏らさない。 */
export class UseSound {
  #context=null; #buffers=new Map(); #attempted=new Set(); #voices=new Map(); #muted=true; #disposed=false;
  constructor({verify=false,contextFactory=()=>new AudioContext({latencyHint:'interactive'}),documentRef=globalThis.document}={}){
    Object.defineProperty(this,'verify',{value:verify===true,writable:false});this.contextFactory=contextFactory;this.documentRef=documentRef;
    this.stats={contextsCreated:0,started:0,skipped:0,stopped:0,reasons:{}};
    this.visibilityHandler=()=>{if(this.documentRef?.visibilityState!=='visible')this.stopAll();};
    this.documentRef?.addEventListener?.('visibilitychange',this.visibilityHandler);
  }
  get muted(){return this.#muted;}
  get state(){return this.#context?.state??'not-created';}
  get voiceCount(){return this.#voices.size;}
  get contextForDiagnostics(){return this.#context;}
  async unlockFromGesture(event){
    if(this.verify||this.#disposed)return false;
    if(!event?.isTrusted||!['click','pointerup','keydown','touchend'].includes(event.type))return false;
    if(this.documentRef?.visibilityState!=='visible')return false;
    if(!this.#context){
      this.#context=this.contextFactory();this.stats.contextsCreated++;
      this.#context.addEventListener?.('statechange',()=>{if(this.#context?.state!=='running')this.stopAll();});
      for(const v of VARIANTS){const a=synthesize(v,this.#context.sampleRate);const b=this.#context.createBuffer(1,a.length,this.#context.sampleRate);b.copyToChannel(a,0);this.#buffers.set(v,b);}
    }
    try{await this.#context.resume();}catch{return false;}
    // unlock中にvisibility/mute状態が変わった場合、音を遡及再生しない。
    return !this.#disposed&&this.#context.state==='running'&&this.documentRef?.visibilityState==='visible';
  }
  setMuted(value){this.#muted=this.verify||value!==false;if(this.#muted)this.stopAll();}
  #skip(reason){this.stats.skipped++;this.stats.reasons[reason]=(this.stats.reasons[reason]||0)+1;return{played:false,reason};}
  attempt({key,variant,fresh=false,contextVisible=false}={}){
    if(typeof key!=='string'||key.length>600||!VARIANTS.includes(variant))return this.#skip('invalid');
    if(this.#attempted.has(key))return this.#skip('duplicate');
    if(this.#attempted.size>=MAX_SEEN)return this.#skip('dedup-capacity');
    this.#attempted.add(key);
    if(this.verify)return this.#skip('verify');
    if(this.#disposed||this.#muted)return this.#skip('muted-or-disposed');
    if(fresh!==true)return this.#skip('late');
    if(contextVisible!==true||this.documentRef?.visibilityState!=='visible')return this.#skip('hidden');
    if(this.#context?.state!=='running')return this.#skip('context-not-running');
    if(this.#voices.size>=MAX_VOICES)return this.#skip('voice-capacity');
    const ctx=this.#context,source=ctx.createBufferSource(),gain=ctx.createGain();
    source.buffer=this.#buffers.get(variant);gain.gain.value=VOICE_GAIN;source.connect(gain);gain.connect(ctx.destination);
    const voice={source,gain};this.#voices.set(key,voice);
    source.onended=()=>{source.disconnect();gain.disconnect();if(this.#voices.get(key)===voice)this.#voices.delete(key);};
    try{source.start(ctx.currentTime);this.stats.started++;return{played:true};}
    catch{this.#voices.delete(key);source.disconnect();gain.disconnect();return this.#skip('start-failed');}
  }
  stopKey(key){const v=this.#voices.get(key);if(!v)return;this.#voices.delete(key);try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();this.stats.stopped++;}
  stopAll(){for(const key of [...this.#voices.keys()])this.stopKey(key);}
  dispose(){this.#disposed=true;this.#muted=true;this.stopAll();this.documentRef?.removeEventListener?.('visibilitychange',this.visibilityHandler);this.#context?.close().catch(()=>{});}
}
