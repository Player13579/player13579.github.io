import {FacilityRuntime} from './runtime.mjs';
import {byId} from './contract.mjs';
/**
 * 正規化は明示schemaからのみ。wire別名の総当たりやtypeだけの所有権取得をしない。
 * receipt.typeが外側のtransport種別ならホストが明示的にtypeを構成する。
 * ホストの認証済み購読callback以外へingestを公開しないこと。
 */
export function createFacilityAdapter(options){
  const runtime=new FacilityRuntime(options);
  return {
    runtime,
    ingest(receipt,envelope){
      if(!byId(receipt?.objectId))return {handled:false,accepted:false,reason:'unmanaged_object'};
      if(receipt.type==='magicEffect')return runtime.receiveMagic(receipt,envelope);
      if(receipt.type==='sound')return runtime.receiveGenericSound(receipt,envelope);
      return {handled:false,accepted:false,reason:'unowned_channel'};
    },
    dispose(){runtime.dispose();}
  };
}

/** DVAのchannel別receiptを正規化する明示関数。raw.typeはobject-<type>。
 * 確認済みの旧サーバーのtypeフィールド配置を使うが、旧版の欠落IDは補わない。
 * 新版で配置が違う場合はこの境界だけを本編wireに照合して変更する。
 */
export function normalizeDvaMagicReceipt(raw){
  if(!raw||typeof raw!=='object'||typeof raw.type!=='string')throw new TypeError('DVA magic receipt expected');
  if(raw.kind!==undefined&&raw.kind!==raw.type)throw new TypeError('conflicting wire kind/type');
  return {...raw,kind:raw.type,type:'magicEffect'};
}
export function normalizeDvaSoundReceipt(raw){
  if(!raw||typeof raw!=='object'||typeof raw.type!=='string')throw new TypeError('DVA sound receipt expected');
  if(raw.kind!==undefined&&raw.kind!==raw.type)throw new TypeError('conflicting wire kind/type');
  return {...raw,kind:raw.type,type:'sound'};
}
