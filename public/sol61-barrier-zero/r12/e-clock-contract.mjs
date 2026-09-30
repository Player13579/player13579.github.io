// Contract helper for a faithful host adapter, not a new renderer/art revision.
// Host calls canonical eEffectNow(effect,data,wallNow) exactly once per submission.
export const durationsMs=Object.freeze({create:650,hit:650,break:480});
export function submittedClock({effect,kind,effectNow,displayRate,owner}){
 const duration=durationsMs[kind];if(!duration||!effect||!Number.isFinite(effect.startedAt)||!Number.isFinite(effectNow)||!Number.isFinite(displayRate)||displayRate<0)throw Error('valid canonical E-clock inputs required');
 const ageMs=effectNow-effect.startedAt,visible=owner?.alive!==false&&!owner?.ejected&&owner?.visible!==false&&!owner?.inVent;
 const future=ageMs<0,expired=ageMs>=duration,active=visible&&!future&&!expired&&(kind==='break'||owner?.barrierDurability>0);
 return{ageMs,ageSeconds:ageMs/1000,normalizedAge:ageMs/duration,rate:displayRate,durationMs:duration,future,expired,transientActive:active,audioEligible:active&&displayRate>0,stableAfterTransient:visible&&!future&&!active&&owner?.barrierDurability>0,sourceSampleOffsetSeconds:Math.max(0,Math.min(duration,ageMs))/1000};
}
export const hostContract=Object.freeze({clockCall:'eEffectNow(effect,data,wallNow)',returns:'absolute visual timestamp, not elapsed seconds',age:'eEffectNow - effect.startedAt',bodyOwnership:'canonical eClockStartedAt/eClockRoomId/player',accumulator:'eVisualTime(owner,data); frameDelta * displayETimeScale(owner,data)',rate:'same submitted displayETimeScale for VFX and SFX; fixed movement ACC2 yields2; otherwise canonical actor/display scale',native:'explicit simulated default rate1; host E2 must be separately verified',doNot:'multiply already computed age by rate again; alter server gameplay durability/deadlines; treat waveform rate1 reference as host fixed rate',zeroRate:'hold visual age; pause/disconnect audio preserving cursor; resume same cause offset, no new receipt'});
export const wireRules=Object.freeze([
 {type:'action-stand',variant:'durability-created',normalizedType:'action-stand',ownerField:'targetId',kind:'create'},
 {type:'preparation-barrier-hit',variant:'durability-hit',normalizedType:'preparation-barrier-hit',ownerField:'playerId',kind:'hit'},
 {type:'preparation-barrier-hit',variant:'durability-broken',normalizedType:'durability-broken',ownerField:'playerId',kind:'break'},
 {type:'action-push',variant:'timed-bust-break',normalizedType:'action-push',ownerField:'targetId',kind:'break'}
]);
// Wire duration is factual metadata. The artist transient duration is independently declared.
export function normalizeWireEvent(raw,receiptStartedAt){
 const rule=wireRules.find(r=>r.type===raw?.type&&r.variant===raw?.variant);
 if(!rule||!raw.id||!Number.isFinite(receiptStartedAt)||!raw[rule.ownerField])return null;
 return{type:rule.normalizedType,cause:rule.variant,eventId:raw.id,[rule.ownerField]:raw[rule.ownerField],startedAtMs:receiptStartedAt,kind:rule.kind,wireDurationMs:raw.durationMs,contact:null};
}
