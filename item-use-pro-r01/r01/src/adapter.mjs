import {ActionItemUse} from './runtime.mjs';
/**
 * 本編の既存wire-schema・認証・privacyをこのパッケージで創作しないための明示境界。
 * normalizeConfirmedConsumptionはtrusted busのreceiptだけを同期で正規化する。
 * 生wireのspread/自動variant推定/結果receiptからの代用をしないこと。
 */
export function createDvaAdapter({normalizeConfirmedConsumption,getContext,resolveActor,clock,sound}){
  if(typeof normalizeConfirmedConsumption!=='function')throw new TypeError('host normalizer required');
  const approved=new WeakSet();
  const runtime=new ActionItemUse({confirm:r=>approved.has(r),getContext,resolveActor,clock,sound});
  return Object.freeze({
    runtime,
    onCanonicalReceipt(wire,transport){
      let r;try{r=normalizeConfirmedConsumption(wire,transport);}catch{return{accepted:false,reason:'normalizer-threw'};}
      if(!r||typeof r!=='object'||typeof r.then==='function')return{accepted:false,reason:'not-canonical-consumption'};
      // deep dataは不要。必要なスカラだけのAPI。結果情報のバイパスを作らない。
      r=Object.freeze({...r});approved.add(r);return runtime.receive(r);
    },
    frame:()=>runtime.frame(),
    onContextInvalidated:()=>runtime.cancelAll(),
    dispose:()=>runtime.dispose()
  });
}
