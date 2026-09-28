import {validateReceipt, gate, eventKey, contextKey, validId, LIFETIME_MS, AUDIO_FRESH_MS, CAPACITY, MAX_SEEN} from './contract.mjs';
/**
 * receive()はtrusted receipt busだけに接続する。confirmは同期boolean、Promiseは承認しない。
 * hostはserver時刻を単調なclient clockへ変換し、live/late/replayを正直に分類する。
 */
export class ActionItemUse {
  #active=new Map(); #seen=new Set(); #generation=null; #disposed=false;
  constructor({confirm,getContext,resolveActor,clock=()=>performance.now(),sound=null}={}) {
    for (const [name,fn] of Object.entries({confirm,getContext,resolveActor,clock})) if(typeof fn!=='function') throw new TypeError(`${name} must be a function`);
    this.confirm=confirm; this.getContext=getContext; this.resolveActor=resolveActor; this.clock=clock; this.sound=sound;
    this.stats={accepted:0,rejected:0,terminated:0,audioAttempts:0,duplicates:0,reasons:{}};
  }
  #reject(reason) {this.stats.rejected++;this.stats.reasons[reason]=(this.stats.reasons[reason]||0)+1;return{accepted:false,reason};}
  #synchronize() {
    let c=null;try {c=this.getContext();}catch{}
    const k=contextKey(c);
    if(k!==this.#generation){this.#active.clear();this.sound?.stopAll?.();this.#generation=k;}
    return c;
  }
  #now(){try{return this.clock();}catch{return NaN;}}
  #actor(r,c){try{return this.resolveActor(r.playerId,c);}catch{return null;}}
  receive(raw) {
    if(this.#disposed)return this.#reject('disposed');
    const c=this.#synchronize(); const now=this.#now();
    let confirmed=false;try{confirmed=this.confirm(raw,c)===true;}catch{}
    if(!confirmed)return this.#reject('untrusted');
    const error=validateReceipt(raw,now);if(error)return this.#reject(error);
    // 身元確定後、演出を抑止する場合もこのidを消費する。後から見えたりunmuteしても再生しない。
    if(raw.sessionId!==c?.sessionId||raw.roomId!==c?.roomId)return this.#reject('context-mismatch');
    const key=eventKey(raw);
    if(this.#seen.has(key)){this.stats.duplicates++;return this.#reject('duplicate');}
    if(this.#seen.size>=MAX_SEEN)return this.#reject('session-tombstone-capacity');
    this.#seen.add(key);
    const reason=gate(raw,c,this.#actor(raw,c)); if(reason)return this.#reject(reason);
    if(this.#active.size>=CAPACITY)return this.#reject('effect-capacity');
    // 状態効果などの余剰データをコピーしない。結果情報はshader/SFXへ到達しない。
    const r=Object.freeze(Object.fromEntries(['id','kind','variant','playerId','sessionId','roomId','actorGeneration','x','y','radius','durationMs','occurredAtMs','receivedAtMs','delivery'].map(k=>[k,raw[k]])));
    const e=Object.freeze({key,receipt:r,startMs:r.occurredAtMs,endMs:r.occurredAtMs+LIFETIME_MS});
    this.#active.set(key,e);this.stats.accepted++;
    this.stats.audioAttempts++;
    try{this.sound?.attempt?.({key,variant:r.variant,fresh:r.delivery==='live'&&now-r.occurredAtMs<=AUDIO_FRESH_MS&&now-r.receivedAtMs<=AUDIO_FRESH_MS,contextVisible:true});}catch{this.stats.reasons['sound-error']=(this.stats.reasons['sound-error']||0)+1;}
    return {accepted:true,key,remainingMs:e.endMs-now};
  }
  frame() {
    if(this.#disposed)return [];
    const c=this.#synchronize();const now=this.#now();const out=[];
    if(!Number.isFinite(now)){this.cancelAll();return [];}
    for(const [key,e] of this.#active) {
      const reason=gate(e.receipt,c,this.#actor(e.receipt,c));
      if(reason||now<e.startMs||now>=e.endMs){this.#active.delete(key);this.sound?.stopKey?.(key);this.stats.terminated++;continue;}
      out.push(Object.freeze({...e,ageMs:now-e.startMs,reducedMotion:c.reducedMotion===true}));
    }
    return out;
  }
  cancelAll(){for(const k of this.#active.keys())this.sound?.stopKey?.(k);this.#active.clear();}
  dispose(){if(this.#disposed)return;this.cancelAll();this.sound?.stopAll?.();this.#disposed=true;}
  get activeCount(){return this.#active.size;}
  get seenCount(){return this.#seen.size;}
}
