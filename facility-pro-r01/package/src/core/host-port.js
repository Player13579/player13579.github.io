import {OBJECTS} from './contracts.js';
import {ReceiptGate} from './receipt-gate.js';
/** 将来接続用の純粋な所有権判断。本編関数を呼び出さず、patchも行わない。 */
export function selectSoundOwnership(objectId,{customEAvailable=false}={}){
 const object=OBJECTS[objectId];
 if(!object||!customEAvailable)return Object.freeze({owner:'native-facility',emitGeneric:true,emitCustom:false});
 return Object.freeze({owner:`DVA-E/${object.key}@0.1.0`,emitGeneric:false,emitCustom:true});
}
/** 現在の本編には未接続。authenticateは信頼済み成功入口だけが提供すること。 */
export function createUnconnectedHostPort({authenticateSuccessReceipt,nowServerMs,onEffect,onFinished}={}){
 if(typeof authenticateSuccessReceipt!=='function')throw new TypeError('trusted success authenticator is required');
 if(typeof nowServerMs!=='function')throw new TypeError('synchronized server clock is required');
 const gate=new ReceiptGate({verify:authenticateSuccessReceipt,nowServerMs,onAccepted:onEffect,onFinished});
 return Object.freeze({gate,onUseMapObjectSuccessReceipt:(receipt,proof)=>gate.accept(receipt,proof),baselineSnapshot:receipts=>gate.baselineSnapshot(receipts),tick:()=>gate.tick()});
}
