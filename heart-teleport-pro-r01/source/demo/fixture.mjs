/** 検査専用の模擬権威。実ゲームの認証・署名を代替しない。srcはこのファイルをimportしない。 */
export function createFixtureAuthority(){
  const signatures=new Map();let sequence=0;
  const scope={selfId:'caster',viewerId:'caster',ownerId:'caster',roomId:'fixture-room',sessionId:'fixture-session',casterId:'caster',casterX:0,casterY:0};
  return {scope,mint(){
    const envelope={delivery:'private',ownerId:'caster',roomId:'fixture-room',sessionId:'fixture-session',receipt:{id:`fixture-heart-${++sequence}`,type:'action-heart-teleport',radius:64,playerId:'caster',viewerId:'caster',x:0,y:0,variant:'fixture-role',targetId:'private-target',targetX:913,targetY:-427}};
    signatures.set(envelope.receipt.id,JSON.stringify(envelope));return envelope;
  },verifyEnvelope:e=>signatures.get(e.receipt.id)===JSON.stringify(e),isCanonicalId:id=>signatures.has(id)};
}
