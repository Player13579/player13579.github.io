import {LIFETIME_MS,OBJECTS,validateReceipt,immutableReceipt} from './contracts.js';
/**
 * 本編成功入口だけが所有するverify関数を注入する。未注入は全拒否。
 * このクラスは近接・カメラ・RAF・socketへ自動接続しない。
 * dedupe台帳はシーン/ゲームセッション所有。renderer再生成では破棄しない。
 */
export class ReceiptGate {
 #verify; #clock; #seenCause=new Set(); #seenId=new Set(); #active=new Map(); #disposed=false;
 constructor({verify=()=>false,nowServerMs=()=>Date.now(),onAccepted=()=>{},onFinished=()=>{},capacity=100000}={}) {
  this.#verify=verify;this.#clock=nowServerMs;this.onAccepted=onAccepted;this.onFinished=onFinished;
  this.capacity=capacity;this.errors=[];this.audit=[];
 }
 baselineSnapshot(receipts) {
  // 入室時snapshotに残る過去イベントを既読化。再生権限は与えない。
  for(const r of receipts||[]) if(r&&OBJECTS[r.objectId]) {
   if(this.#seenCause.size>=this.capacity) break;
   if(typeof r.objectCausalId==='string') this.#seenCause.add(r.objectCausalId);
   if(typeof r.id==='string') this.#seenId.add(r.id);
  }
 }
 accept(receipt,transportProof) {
  if(this.#disposed) return {accepted:false,reason:'session_disposed'};
  let verified=false;
  try { verified=this.#verify(receipt,transportProof)===true; } catch { verified=false; }
  if(!verified) return {accepted:false,reason:'untrusted_ingress'};
  const now=this.#clock(), reason=validateReceipt(receipt,now);
  if(reason) return {accepted:false,reason};
  if(this.#seenCause.has(receipt.objectCausalId)||this.#seenId.has(receipt.id)) return {accepted:false,reason:'duplicate'};
  // 古いIDをLRU破棄して再生させるのではなく、上限ではfail closed。
  if(this.#seenCause.size>=this.capacity) return {accepted:false,reason:'ledger_capacity_fail_closed'};
  const r=immutableReceipt(receipt);
  this.#seenCause.add(r.objectCausalId);this.#seenId.add(r.id);
  const effect=Object.freeze({receipt:r,key:OBJECTS[r.objectId].key,startServerMs:r.createdAt,endServerMs:Math.min(r.createdAt+LIFETIME_MS,r.expiresAt),soundOwner:`DVA-E/${OBJECTS[r.objectId].key}@0.1.0`,admittedAgeMs:now-r.createdAt});
  this.#active.set(r.objectCausalId,effect);
  this.audit.push({kind:'accepted',cause:r.objectCausalId,at:now});
  try {this.onAccepted(effect);} catch(error) {this.errors.push(String(error));}
  return {accepted:true,effect};
 }
 tick(now=this.#clock()) {
  for(const [id,effect] of this.#active) if(now>=effect.endServerMs) {
   this.#active.delete(id);this.audit.push({kind:'finished',cause:id,at:now});
   try {this.onFinished(effect);} catch(error) {this.errors.push(String(error));}
  }
  return [...this.#active.values()];
 }
 sample(effect,now=this.#clock()) {
  const ageMs=now-effect.startServerMs;
  return Object.freeze({ageMs,alive:ageMs>=0&&ageMs<LIFETIME_MS&&now<effect.endServerMs,receipt:effect.receipt});
 }
 get activeCount(){return this.#active.size;}
 get seenCount(){return this.#seenCause.size;}
 dispose(){this.#active.clear();this.#disposed=true;}
}
/** プレビュー/テスト専用。実ネットワーク認証・本編接続とは別物。 */
export function createPreviewAuthority() {
 const approved=new WeakSet(); const proof=Object.freeze({kind:'preview-fixture-not-game'});
 return Object.freeze({proof,approve(receipt){approved.add(receipt);return receipt;},verify:(r,p)=>p===proof&&approved.has(r)});
}
