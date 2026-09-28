import {validateReceipt,sameScope,visibilityAllowed,WallClock,ReceiptLedger,LIFETIME_MS,MAX_ACTIVE,plainRecord} from './contract.mjs';
/** trusted verifierは必須。UIのflagや姿勢だけでは起動しない。対象情報を返すAPIはない。 */
export class HeartReceiptCore {
  #verify; #canonical; #context; #visibility; #clock; #ledger; #active=new Map(); #dead=false; #onStart; #onStop; #rejections={};
  constructor({verifyEnvelope,isCanonicalId,getContext,getVisibility,ledger,clock=new WallClock(),onStart=()=>{},onStop=()=>{}}){
    for(const fn of [verifyEnvelope,isCanonicalId,getContext,getVisibility,onStart,onStop])if(typeof fn!=='function')throw new TypeError('host callbacks required');
    if(!(ledger instanceof ReceiptLedger))throw new TypeError('host-owned ReceiptLedger required');
    this.#verify=verifyEnvelope;this.#canonical=isCanonicalId;this.#context=getContext;this.#visibility=getVisibility;this.#ledger=ledger;this.#clock=clock;this.#onStart=onStart;this.#onStop=onStop;
  }
  #reject(reason){this.#rejections[reason]=(this.#rejections[reason]||0)+1;return Object.freeze({ok:false,reason});}
  async receive(envelope){
    if(this.#dead)return this.#reject('disposed');
    const firstReceivedAt=this.#clock.now();
    // transport認証が非同期でもreceipt到着時刻を保ち、認証待ち時間で延長しない。
    if(!plainRecord(envelope)||!plainRecord(envelope.receipt))return this.#reject('malformed');
    let packet,scopeAtArrival;
    try{packet=structuredClone(envelope);Object.freeze(packet.receipt);Object.freeze(packet);scopeAtArrival={...this.#context()};}catch{return this.#reject('malformed');}
    let authenticated=false;
    try { authenticated=(await this.#verify(packet))===true; } catch {return this.#reject('unverified');}
    if(!authenticated)return this.#reject('unverified');
    if(this.#dead)return this.#reject('disposed');
    let result;
    try { result=validateReceipt(packet,this.#context(packet.receipt.id),this.#canonical); }catch{return this.#reject('validation_error');}
    if(!result.ok)return this.#reject(result.reason);
    if(!sameScope(scopeAtArrival,result.scope))return this.#reject('scope_changed_during_verification');
    const claimed=this.#ledger.claim(result.projection.id);
    if(claimed!=='claimed')return this.#reject(claimed);
    if(this.#clock.now()-firstReceivedAt>=LIFETIME_MS)return this.#reject('expired_during_verification');
    let v;try{v=this.#visibility(result.projection);}catch{return this.#reject('visibility_unknown');}
    if(!visibilityAllowed(v))return this.#reject('not_visible');
    this.tick();
    if(this.#active.size>=MAX_ACTIVE)return this.#reject('active_capacity');
    const item=Object.freeze({...result.projection,firstReceivedAt,deadline:firstReceivedAt+LIFETIME_MS});
    this.#active.set(item.id,{item,scope:result.scope});
    try{this.#onStart(item);}catch{this.#finish(item.id,'start_failed');return this.#reject('start_failed');}
    return Object.freeze({ok:true,id:item.id});
  }
  #finish(id,reason){const entry=this.#active.get(id);if(!entry)return;this.#active.delete(id);try{this.#onStop(entry.item,reason);}catch{/* 解放失敗が他イベントを復活させない */}}
  tick(){
    if(this.#dead)return [];
    const now=this.#clock.now();
    let context;try{context=this.#context();}catch{context=null;}
    for(const [id,{item,scope}] of this.#active){
      let visible=false;try{visible=visibilityAllowed(this.#visibility(item));}catch{}
      if(now>=item.deadline)this.#finish(id,'expired');
      else if(!sameScope(scope,context))this.#finish(id,'scope_changed');
      else if(!visible)this.#finish(id,'visibility_revoked');
    }
    return [...this.#active.values()].map(({item})=>Object.freeze({...item,ageMs:Math.max(0,now-item.firstReceivedAt)}));
  }
  cancelAll(reason='host_cancelled'){for(const id of [...this.#active.keys()])this.#finish(id,reason);}
  dispose(){if(this.#dead)return;this.#dead=true;this.cancelAll('disposed');}
  stats(){return {active:this.#active.size,ledgerSize:this.#ledger.size,disposed:this.#dead,rejections:{...this.#rejections}};}
}
