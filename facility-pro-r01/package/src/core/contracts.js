/** 正規成功receiptの形だけを定義する。形の一致は発信元の認証ではない。 */
export const VERSION = '0.1.0';
export const LIFETIME_MS = 2200;
export const FOOTPRINT = Object.freeze({width:110,height:76});
export const OBJECTS = Object.freeze({
 'v302-archive-bookshelf-1':Object.freeze({key:'bookshelf',type:'bookshelf',effectKind:'mana',label:'書棚',sourceLabel:'閲覧書架',origin:[333,365],size:[42,18],title:'索引の綴合'}),
 'v302-archive-readingLamp-3':Object.freeze({key:'reading-lamp',type:'readingLamp',effectKind:'mana',label:'読書灯',sourceLabel:'読書席',origin:[344,392],size:[30,24],title:'焦点の定着'}),
 'v302-security-securityConsole-1':Object.freeze({key:'security-console',type:'securityConsole',effectKind:'luckBoost',label:'警備コンソール',sourceLabel:'協議地図机',origin:[949,400],size:[30,30],title:'照合経路の確定'})
});
export const OBJECT_IDS = Object.freeze(Object.keys(OBJECTS));
export function validateReceipt(r, nowServerMs) {
 if(!r || typeof r!=='object') return 'receipt_not_object';
 const object=OBJECTS[r.objectId];
 if(!object) return 'object_not_in_allowlist';
 if(r.type!==`object-${object.type}`) return 'type_mismatch';
 if(r.effectKind!==object.effectKind) return 'effect_kind_mismatch';
 if(typeof r.id!=='string'||!r.id.startsWith('magic_')||r.id.length<7) return 'invalid_receipt_id';
 if(typeof r.playerId!=='string'||!r.playerId.length) return 'missing_player_id';
 if(typeof r.objectCausalId!=='string'||!r.objectCausalId.startsWith(`map-object:${r.objectId}:`)||r.objectCausalId.length<=`map-object:${r.objectId}:`.length) return 'invalid_causal_id';
 if(!Number.isSafeInteger(r.x)||!Number.isSafeInteger(r.y)) return 'origin_not_rounded_integer';
 if(!Number.isSafeInteger(r.createdAt)||!Number.isSafeInteger(r.expiresAt)||!Number.isFinite(nowServerMs)) return 'invalid_clock';
 // 正本は別々のnow()を使う。最大32msの差を許し、E自体は必ず2200msで終了。
 if(r.expiresAt-r.createdAt<LIFETIME_MS||r.expiresAt-r.createdAt>LIFETIME_MS+32) return 'lifetime_contract_mismatch';
 if(r.createdAt>nowServerMs) return 'future_receipt_wait_for_trusted_delivery';
 if(nowServerMs>=Math.min(r.createdAt+LIFETIME_MS,r.expiresAt)) return 'expired';
 return null;
}
export function immutableReceipt(r) {
 // ワールド原点や識別子を演出側で再生成・再丸めしない。
 return Object.freeze({id:r.id,type:r.type,objectId:r.objectId,effectKind:r.effectKind,objectCausalId:r.objectCausalId,playerId:r.playerId,x:r.x,y:r.y,createdAt:r.createdAt,expiresAt:r.expiresAt});
}
