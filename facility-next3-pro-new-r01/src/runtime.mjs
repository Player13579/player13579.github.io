import {VERSION,LIFETIME_MS,facilityById} from './catalog.mjs';
import {createReceiptValidator,receiptKey,receiptFingerprint,hash32} from './receipt.mjs';
import {EFFECTS} from './effects/index.mjs';
import {MeshBuilder} from './mesh.mjs';
import {assertFrame,aabbVisible,projectNdc,clamp} from './math.mjs';
import {drawReceiverResponse,drawLensResponse} from './optics.mjs';

/** 成功通知専用。近接・polling・camera・renderからのイベント作成APIは存在しない。 */
export class FacilityUseRuntime {
  #validate;#clock;#ledger;#audio;#renderer;#active=new Map();#audit;#timer=null;#timers;#disposed=false;#reduced=false;#maxFuture;
  constructor({effectKinds,clock,ledger,audio=null,renderer=null,verify=false,reducedMotion=false,maxFutureSkewMs=100,
    audit=()=>{},timers={setTimeout:(fn,ms)=>setTimeout(fn,ms),clearTimeout:id=>clearTimeout(id)}}={}) {
    if(!clock || typeof clock.now!=='function' || typeof clock.toMonotonic!=='function') throw new TypeError('ReceiptClock required');
    if(!ledger || typeof ledger.claim!=='function') throw new TypeError('共有ReceiptLedger required');
    if(!Number.isFinite(maxFutureSkewMs)||maxFutureSkewMs<0||maxFutureSkewMs>1000) throw new TypeError('maxFutureSkewMs');
    this.#validate=createReceiptValidator(effectKinds);this.#clock=clock;this.#ledger=ledger;this.#renderer=renderer;
    this.#audio=verify?null:audio;this.verify=Boolean(verify);this.#reduced=Boolean(reducedMotion);this.#timers=timers;this.#maxFuture=maxFutureSkewMs;
    this.#audit=entry=>{try{audit(Object.freeze({...entry,version:VERSION}));}catch{ /* 外部loggerの失敗で再発火を許さない。 */ }};
  }
  get activeCount(){this.sweep();return this.#active.size;}
  get ledgerSize(){return this.#ledger.size;}
  setReducedMotion(value){this.#reduced=Boolean(value);}
  setAudioState(state){this.#audio?.setState(state);}
  /** この呼出元は認証済みtransportの使用成功handlerに限定。クライアントで成功を推論しない。 */
  onSuccess(raw) {
    const owned=Boolean(facilityById(raw?.objectId));
    if(this.#disposed)return {handled:owned,suppressGeneric:owned,status:'disposed'};
    const validated=this.#validate(raw);
    if(!validated.ok){this.#audit({kind:'receipt_rejected',reason:validated.reason});return {handled:owned,suppressGeneric:owned,status:validated.reason};}
    const {receipt,definition}=validated;
    const key=receiptKey(receipt),fingerprint=receiptFingerprint(receipt);
    // 時計異常でもこのreceiptを後から再発火させないため、台帳claimを先に確定する。
    const claim=this.#ledger.claim(key,fingerprint);
    if(claim!=='claimed'){this.#audit({kind:'receipt_consumed_without_replay',key,status:claim});return {handled:true,suppressGeneric:true,status:claim};}
    const now=this.#clock.now(),startMs=this.#clock.toMonotonic(receipt.capturedTime),expiresMs=startMs+LIFETIME_MS;
    if(![now,startMs,expiresMs].every(Number.isFinite) || startMs-now>this.#maxFuture) {
      this.#audit({kind:'clock_rejected_consumed',key});return {handled:true,suppressGeneric:true,status:'clock_rejected_consumed'};
    }
    if(now>=expiresMs){this.#audit({kind:'expired_receipt_consumed',key});return {handled:true,suppressGeneric:true,status:'expired_consumed'};}
    const event=Object.freeze({key,receipt,definition,effect:EFFECTS[definition.index],seed:hash32(fingerprint),startMs,expiresMs});
    this.#active.set(key,event);
    this.#armExpiry();
    let sound=this.verify?'verify_silent':'audio_not_bound_consumed';
    if(!this.verify && this.#audio){try{sound=this.#audio.play({...event,capturedTime:receipt.capturedTime,nowMs:now,now:()=>this.#clock.now()});}catch{sound='audio_failed_consumed';}}
    this.#audit({kind:'effect_started_once',key,capturedTime:receipt.capturedTime,startMs,expiresMs,sound});
    return {handled:true,suppressGeneric:true,status:'started_once',key,startMs,expiresMs,sound};
  }
  /** generic音の再生前に呼ぶ。到着順によらず対象ownerを消費し、ここからVFX/SFXは発火しない。 */
  routeGenericSound(receipt) {
    const owned=receipt?.owner==='facility' && Boolean(facilityById(receipt?.objectId));
    if(!owned) return {handled:false,suppressGeneric:false,status:'unowned_sound'};
    this.#audit({kind:'generic_facility_sound_suppressed',objectId:receipt.objectId,objectCausalId:receipt.objectCausalId??null});
    return {handled:true,suppressGeneric:true,status:'facility_event_SFX_owns_sound'};
  }
  sweep() {
    const now=this.#clock.now();
    for(const [key,e] of this.#active) if(now>=e.expiresMs) {
      this.#active.delete(key);try{this.#audio?.stop(key,'2200ms_elapsed');}catch{}this.#audit({kind:'effect_disposed',key,expiredAt:e.expiresMs});
    }
  }
  #armExpiry() {
    if(this.#timer!==null)this.#timers.clearTimeout(this.#timer);
    this.#timer=null;if(!this.#active.size||this.#disposed)return;
    let next=Infinity;for(const e of this.#active.values())next=Math.min(next,e.expiresMs);
    this.#timer=this.#timers.setTimeout(()=>{this.#timer=null;this.sweep();this.#armExpiry();},Math.max(0,next-this.#clock.now()));
    this.#timer?.unref?.();
  }
  /** この関数はpure age samplingに近く、eventの追加・音の再生・利益変更を一切行わない。 */
  buildFrame(frame) {
    if(this.#disposed)throw new Error('runtime_disposed');
    assertFrame(frame);this.sweep();
    const now=this.#clock.now(),mesh=new MeshBuilder();
    let offscreen=0,occluded=0,receiverTriangles=0,lensPrimitives=0;
    const visible=[];
    for(const event of this.#active.values()) {
      const t=(now-event.startMs)/1000;
      if(t<0||t>=LIFETIME_MS/1000)continue;
      if(!aabbVisible(frame.worldToClip,event.receipt.worldOrigin,event.effect.bounds)){offscreen++;continue;}
      const o=event.receipt.worldOrigin,source=[o.x+event.effect.source[0],o.y+event.effect.source[1],event.effect.source[2]];
      let visibility;
      try{visibility=frame.sourceVisibility(event.receipt,source);}catch{visibility=0;}
      visibility=Number.isFinite(visibility)?clamp(visibility):0;
      if(visibility<=0){occluded++;continue;}
      visible.push({event,t,source,visibility,depth:projectNdc(frame.worldToClip,source)?.z??1});
    }
    visible.sort((a,b)=>(b.depth-a.depth)||a.event.key.localeCompare(b.event.key));
    // 可視源だけで共通OBS輝度予算を分配。画面外件は予算もGPU枠も消費しない。
    const observationGain=1/Math.max(1,Math.sqrt(visible.length));
    for(const {event,t,source,visibility} of visible) {
      const clip=projectNdc(frame.worldToClip,source), b=event.effect.bounds;
      const edge=projectNdc(frame.worldToClip,[source[0]+(b[3]-b[0])/2,source[1],source[2]]);
      const sizePx=clip&&edge?Math.abs(edge.x-clip.x)*frame.viewport.width:100;
      const detail=sizePx<45?.35:1;
      const a0=mesh.alpha.length,l0=mesh.light.length;
      event.effect.draw(mesh,event.receipt.worldOrigin,t,{reducedMotion:this.#reduced,detail});
      // host source visibilityで世界層のcoverageを保守的に減衰。opaqueな障害物を透視しない。
      for(let i=a0+6;i<mesh.alpha.length;i+=11)mesh.alpha[i]*=visibility;
      for(let i=l0+6;i<mesh.light.length;i+=11)mesh.light[i]*=visibility*observationGain;
      const light=event.effect.lightAt(t);
      let surfaces=[];
      try{surfaces=frame.receiverSurfaces?.(event.receipt)??[];}catch{}
      const o=event.receipt.worldOrigin,eb=event.effect.bounds;
      const medium={bounds:[o.x+eb[0],o.y+eb[1],eb[2],o.x+eb[3],o.y+eb[4],eb[5]],opticalDepth:event.effect.mediumOpticalDepthAt(t),lengthScale:event.effect.receiverRadius*.5};
      receiverTriangles+=drawReceiverResponse(mesh,surfaces,source,light*observationGain,event.effect.sourceColor,event.effect.receiverRadius,medium);
      lensPrimitives+=drawLensResponse(mesh,frame,source,light,visibility,event.effect.lens,event.effect.sourceColor,observationGain);
    }
    this.#sortAlpha(mesh,frame.worldToClip);
    return {mesh,stats:{active:this.#active.size,visible:visible.length,offscreen,occluded,receiverTriangles,lensPrimitives,vertices:mesh.vertexCount,observationGain}};
  }
  #sortAlpha(mesh,matrix) {
    if(mesh.alpha.length<66)return;
    const triangles=[];
    for(let i=0;i<mesh.alpha.length;i+=33){const a=mesh.alpha.slice(i,i+33),p=[0,0,0];for(let j=0;j<3;j++)for(let k=0;k<3;k++)p[k]+=a[j*11+k]/3;triangles.push({a,depth:projectNdc(matrix,p)?.z??1,index:i});}
    triangles.sort((a,b)=>(b.depth-a.depth)||(a.index-b.index));mesh.alpha=triangles.flatMap(t=>t.a);
  }
  draw(pass,frame) {
    const built=this.buildFrame(frame);
    if(!this.#renderer)throw new Error('native_WebGPU_renderer_not_bound');
    return {...built.stats,...this.#renderer.draw(pass,built.mesh,frame)};
  }
  dispose() {
    if(this.#disposed)return;this.#disposed=true;
    if(this.#timer!==null)this.#timers.clearTimeout(this.#timer);this.#timer=null;
    for(const key of this.#active.keys()){try{this.#audio?.stop(key,'runtime_disposed');}catch{}}this.#active.clear();
    // 共有台帳・host device・host audio busを破棄しない。renderer/audio自身は所有側でdispose。
  }
}
