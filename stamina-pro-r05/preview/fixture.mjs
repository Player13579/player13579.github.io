// 検査用の抽象身体。DVAの既存actor素材/衣装/描画コードではない。
export const CAPSULES=Object.freeze([
  [-.052,.71,.052,.71,.092],[-.055,.59,.055,.59,.089],[-.056,.46,.056,.46,.082],
  [0,.91,0,.91,.09],[0,.81,0,.85,.033],
  [-.137,.73,-.206,.48,.042],[.137,.73,.206,.48,.042],
  [-.060,.40,-.076,.07,.047],[.060,.40,.076,.07,.047],
  [-.079,.043,-.112,.029,.029],[.079,.043,.112,.029,.029]
]);
export function projectFixture(actor,{width=256,height=144,scale=64,offsetX=0,partial=false}={}){
  return {originPx:[width/2+actor.world[0]*scale/actor.heightWorld+offsetX,height/2+scale/2],
    axisXPx:[scale,0],axisYPx:[0,-scale],capsules:CAPSULES.map(c=>[...c]),
    occluders:partial?[[width/2,height/2-32,width/2+40,height/2+32]]:[]};
}
export function makeEvent({id,playerId='beneficiary',actorMs,realMs,domain='actor',actualDelta=25,delivery='live',epoch='fixture-epoch',delayed=false}={}){
  return {type:'gain-stamina',grantKind:'discrete',authoritative:true,causeId:id,playerId,actualDelta,
    clockEpoch:epoch,clockDomain:domain,occurredActorMs:actorMs,occurredRealMs:realMs,delivery,delayed};
}
