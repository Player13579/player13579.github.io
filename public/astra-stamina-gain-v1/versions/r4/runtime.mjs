export const VERSION='astra-stamina-gain-v1';
export const DURATION_MS=1380;
const finite=Number.isFinite;
const key=(v)=>typeof v==='string'&&v.length>0;
export function ownerRate(actor){
  if(actor.movementAccEnabled!==false&&actor.movementAccActive===true)return 2;
  const r=actor.actorTimeScale;
  return finite(r)&&r>=0?r:1;
}
export function positiveReceipt(event,proof){
  if(!event||event.type!=='gain-stamina'||event.effectKind!=='stamina'||!key(event.id)||!key(event.playerId))return null;
  const outcome=event.benefitOutcomeV1;
  if(outcome&&outcome.recipientId===event.playerId&&outcome.semantic==='stamina-gain'&&outcome.result==='changed'&&finite(outcome.actualDelta)&&outcome.actualDelta>0&&key(outcome.outcomeId))
    return {eventId:event.id,playerId:event.playerId,delta:outcome.actualDelta,outcomeId:outcome.outcomeId};
  // The host must derive this proof from an authoritative discrete transaction,
  // never from a requested amount, an item-use intent or a natural-recovery tick.
  if(proof?.kind==='authoritative-discrete-delta'&&proof.eventId===event.id&&proof.recipientId===event.playerId&&finite(proof.actualDelta)&&proof.actualDelta>0)
    return {eventId:event.id,playerId:event.playerId,delta:proof.actualDelta,outcomeId:event.id};
  return null;
}
export function validActor(a){return !!a&&key(a.id)&&a.alive===true&&!a.ejected&&!a.inVent&&!a.invisible&&a.visible===true&&finite(a.x)&&finite(a.y)&&finite(a.eTimeMs);}
export class StaminaRuntime{
  constructor(sessionId){if(!key(sessionId))throw new TypeError('sessionId');this.sessionId=sessionId;this.epoch=0;this.events=new Map();this.seen=new Set();this.sound=new Set();this.frame=0;this.disposed=false;}
  admit(event,{sessionId,actor,proof,visible=true}={}){
    if(this.disposed||sessionId!==this.sessionId)return false;
    const r=positiveReceipt(event,proof);if(!r)return false;
    const id=`${r.playerId}:${r.outcomeId}`;
    const eventKey=`event:${r.eventId}`;
    if(this.seen.has(id)||this.seen.has(eventKey))return false;
    this.seen.add(id);this.seen.add(eventKey);
    if(!visible||!validActor(actor)||event.playerId!==actor.id||this.events.size>=128)return false;
    this.events.set(id,{...r,id,start:actor.eTimeMs,last:actor.eTimeMs});return true;
  }
  prepare({sessionId,actors,visible,phase,frameId,reducedMotion=false}){
    if(this.disposed)return [];
    if(sessionId!==this.sessionId||!visible||!['playing','meeting'].includes(phase)){this.cancel();return [];}
    if(!Number.isSafeInteger(frameId)||frameId<=this.frame)return [];
    this.frame=frameId;
    const plans=[];
    for(const [id,e]of this.events){
      const a=actors.find(x=>x.id===e.playerId);
      if(!validActor(a)||a.eTimeMs<e.last){this.events.delete(id);continue;}
      e.last=a.eTimeMs;const elapsedMs=a.eTimeMs-e.start;
      if(elapsedMs>=DURATION_MS){this.events.delete(id);continue;}
      const p=Object.freeze({id,eventId:e.eventId,playerId:e.playerId,sessionId:this.sessionId,epoch:this.epoch,frameId,elapsedMs,x:a.x,y:a.y,rate:ownerRate(a),reducedMotion});
      e.plan=p;plans.push(p);
    }return plans;
  }
  commit(plan,{submitted,visible,sessionId,frameId}={}){
    const e=this.events.get(plan?.id);
    if(this.disposed||!e||e.plan!==plan||!submitted||!visible||sessionId!==this.sessionId||plan.epoch!==this.epoch||frameId!==this.frame||plan.frameId!==frameId)return null;
    if(this.sound.has(plan.id))return null;
    this.sound.add(plan.id);return {...plan,kind:'stamina-gain-one-shot'};
  }
  cancel(){this.epoch++;this.events.clear();}
  reset(sessionId){if(!key(sessionId))throw new TypeError('sessionId');this.cancel();this.sessionId=sessionId;this.seen.clear();this.sound.clear();this.frame=0;}
  dispose(){this.cancel();this.seen.clear();this.sound.clear();this.disposed=true;}
}
