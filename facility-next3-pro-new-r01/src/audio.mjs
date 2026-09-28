import {clamp} from './math.mjs';
import {LIFETIME_MS} from './catalog.mjs';
import {EFFECTS} from './effects/index.mjs';
/**
 * 1receiptにつき1 AudioBufferSourceNode。各音色の内部成分は1PCMへ事前合成する。
 * generic音とは排他的所有。verify/mute/suspendedで消費した音を後追い再生しない。
 */
export class OneShotAudio {
  #context;#bus;#gain;#compressor;#active=new Map();#verify;#muted;#volume;#audit;#stateListener;#buffers=new Map();
  constructor({context=null,destination=null,verify=false,muted=false,volume=1,audit=()=>{}}={}) {
    if(!Number.isFinite(volume))throw new TypeError('volume');
    this.#context=context;this.#verify=verify;this.#muted=muted;this.#volume=clamp(volume);this.#audit=e=>{try{audit(e);}catch{}};
    if(!verify && context && destination) {
      this.#gain=context.createGain();this.#gain.gain.value=muted?0:this.#volume;
      this.#compressor=context.createDynamicsCompressor();
      this.#compressor.threshold.value=-13;this.#compressor.knee.value=7;this.#compressor.ratio.value=6;
      this.#compressor.attack.value=.003;this.#compressor.release.value=.12;
      this.#bus=context.createGain();this.#bus.gain.value=.28;
      this.#bus.connect(this.#compressor);this.#compressor.connect(this.#gain);this.#gain.connect(destination);
      this.#stateListener=()=>{if(context.state!=='running') this.stopAll('context_not_running');};
      context.addEventListener?.('statechange',this.#stateListener);
      // 受信handlerや画面外eventで重いPCM合成を実行しない。初期化時に3音だけ生成。
      for(const effect of EFFECTS) {
        const samples=effect.synthesize(context.sampleRate,0);
        const buffer=context.createBuffer(1,samples.length,context.sampleRate);buffer.copyToChannel(samples,0);
        this.#buffers.set(effect.id,buffer);
      }
    }
  }
  get activeCount(){return this.#active.size;}
  setState({muted=this.#muted,volume=this.#volume}={}) {
    if(!Number.isFinite(volume)) throw new TypeError('volume');
    this.#muted=Boolean(muted);this.#volume=clamp(volume);
    if(this.#gain) this.#gain.gain.setValueAtTime(this.#muted?0:this.#volume,this.#context.currentTime);
    if(this.#muted || this.#volume===0) this.stopAll('muted');
  }
  play({key,capturedTime,effect,startMs,nowMs,now}) {
    const ctx=this.#context;
    if(this.#verify) return 'verify_silent';
    if(this.#muted||this.#volume===0) return 'muted_consumed';
    if(!ctx||!this.#bus||ctx.state!=='running') return 'audio_unavailable_consumed';
    // このMapは補助ガード。正式な一回性は保持されたReceiptLedgerが所有する。
    if(this.#active.has(key)) return 'duplicate_audio_guard';
    const buffer=this.#buffers.get(effect.id);
    if(!buffer)return 'audio_not_prepared_consumed';
    const sampledNow=typeof now==='function'?now():nowMs;
    const lookahead=.008;
    let desiredStart=ctx.currentTime+(startMs-sampledNow)/1000,clockBasis='render_clock_estimate';
    // 取得可能ならスピーカー出力時刻とperformance時刻の対応で位相を合わせる。
    // 未対応時の物理出力レイテンシは推測で埋めず、監査にbasisを残す。
    try { const stamp=ctx.getOutputTimestamp?.();
      if(stamp && Number.isFinite(stamp.contextTime) && stamp.contextTime>0 && Number.isFinite(stamp.performanceTime) && stamp.performanceTime>0 && Math.abs(sampledNow-stamp.performanceTime)<500) {
        desiredStart=stamp.contextTime+(startMs-stamp.performanceTime)/1000;clockBasis='output_timestamp';
      }
    } catch {}
    const when=Math.max(ctx.currentTime+lookahead,desiredStart);
    const offset=Math.max(0,when-desiredStart);
    const remaining=LIFETIME_MS/1000-offset;
    if(remaining<=0) return 'expired_silent';
    let src;
    try {
      src=ctx.createBufferSource();src.buffer=buffer;src.loop=false;src.connect(this.#bus);
      src.onended=()=>{src.disconnect();this.#active.delete(key);};
      this.#active.set(key,src);
      src.start(when,offset,remaining);src.stop(when+remaining);
      this.#audit({kind:'sfx_scheduled',key,capturedTime,when,offset,remaining,clockBasis,sourceNodeCount:1});
      return 'scheduled_once';
    } catch(error) {
      if(src){try{src.stop();src.disconnect();}catch{}this.#active.delete(key);}
      this.#audit({kind:'sfx_error_consumed',key,message:String(error)});
      return 'audio_failed_consumed';
    }
  }
  stop(key,reason='expired') {
    const src=this.#active.get(key);if(!src)return;
    try{src.stop();src.disconnect();}catch{}this.#active.delete(key);
    this.#audit({kind:'sfx_stopped',key,reason});
  }
  stopAll(reason='dispose'){for(const key of this.#active.keys())this.stop(key,reason);}
  dispose(){this.stopAll();this.#context?.removeEventListener?.('statechange',this.#stateListener);this.#bus?.disconnect();this.#compressor?.disconnect();this.#gain?.disconnect();this.#buffers.clear();}
}
