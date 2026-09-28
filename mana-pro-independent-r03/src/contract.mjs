/** ゲーム側の確定イベントを読むだけ。マナを付与する関数はない。 */
export const VERSION='0.3.0';
export const DURATION=1.6; // 唯一の実行時総尺、所有者の実効秒。視覚・音声が参照。
export const LIMITS=Object.freeze({active:64,sessionIds:100000});
export const BOUNDS=Object.freeze({minX:-66,maxX:66,minY:-127,maxY:13});
export const H64_SCALE=.5; // 基準高128 world unitsを64 CSS px。実キャラ高はホスト契約。
export const isNumber=v=>typeof v==='number'&&Number.isFinite(v);
export const isId=v=>typeof v==='string'&&v.trim().length>0&&v.length<=256;
export const eventKey=e=>JSON.stringify([e.roomId,e.sessionId,e.id]);
export function activeRate(m){return m?.moving===true&&m?.acc2State==='active'&&m?.acc2Effective===true?2:1;}
export function validateGain(e,context,now){
  if(!e||!context||!isNumber(now))return 'invalid-input';
  if(![e.id,e.playerId,e.roomId,e.sessionId].every(isId))return 'missing-id';
  if(e.roomId!==context.roomId||e.sessionId!==context.sessionId)return 'wrong-context';
  if(e.type!=='gain-mana'||e.effectKind!=='mana')return 'wrong-effect';
  if(e.committed!==true||e.gainClass!=='discrete')return 'not-committed-discrete';
  if(!isNumber(e.manaBefore)||!isNumber(e.manaAfter)||e.manaBefore<0||e.manaAfter<=e.manaBefore)return 'not-positive-actual-delta';
  if(!isNumber(e.committedAtMs)||!isNumber(e.expiresAtMs)||e.committedAtMs>now||e.expiresAtMs<=now||e.expiresAtMs<=e.committedAtMs)return 'expired-or-invalid-time';
  if(['desire-recovery','renki','renki-tenfold'].includes(e.variant))return 'excluded-renki';
  if(e.source==='map-object'){if(e.variant!=='normal')return 'unsupported-map-object-variant';}
  else if(e.source==='mystery'){if(e.variant!=='mana-surge')return 'unsupported-mystery-variant';}
  else return 'unsupported-source';
  if(e.ownerPlayerId!==undefined&&e.ownerPlayerId!==e.playerId)return 'owner-mismatch';
  return null;
}
export function recipientState(a,e,c){
  if(!a||a.playerId!==e.playerId)return 'missing-recipient';
  if(a.roomId!==c.roomId||a.sessionId!==c.sessionId)return 'recipient-context';
  if(a.alive!==true)return 'dead';
  if(a.present!==true)return 'departed';
  if(a.vented!==false)return 'vented-or-unknown';
  if(a.invisible!==false||!isNumber(a.opacity)||a.opacity<=0)return 'invisible-or-unknown';
  if(a.onScreen!==true||a.renderVisible!==true)return 'offscreen-or-hidden';
  if(!isNumber(a.worldX)||!isNumber(a.worldY))return 'invalid-world-position';
  return null;
}
