export const VERSION='luminous-sol61-r1';
export const DURATION_MS=1550;
export const OUTCOMES=Object.freeze(['success','failure','body','blocked']);
export function hasLuminousEmissionAt(effect, ageMs) {
  if (!Number.isFinite(ageMs)) return false;

  let onsetSeconds;
  let endSeconds;
  switch (effect) {
    case 'success':
      onsetSeconds = 0.02;
      endSeconds = 1.34;
      break;
    case 'failure':
      onsetSeconds = 0.02;
      endSeconds = 0.76;
      break;
    case 'body':
      onsetSeconds = 0.03;
      endSeconds = 1.05;
      break;
    case 'blocked':
      onsetSeconds = 0.02;
      endSeconds = 0.76;
      break;
    default:
      return false;
  }

  const ageSeconds = Math.fround(ageMs / 1000);
  return ageSeconds > Math.fround(onsetSeconds) && ageSeconds < Math.fround(endSeconds);
}
export function normalizeFixture(input={}){
 const outcome=input.outcome??'success';
 if(!OUTCOMES.includes(outcome))throw new TypeError('Unknown Luminous outcome');
 const sourceId=input.sourceId??'fixture-issuer';
 const targetId=input.targetId??'fixture-subject';
 if(typeof sourceId!=='string'||typeof targetId!=='string'||!sourceId||!targetId||sourceId===targetId)throw new TypeError('Distinct explicit participant identities required');
 const causeId=input.causeId??'fixture-cause-1';
 if(typeof causeId!=='string'||!causeId)throw new TypeError('Explicit cause identity required');
 return Object.freeze({sourceId,targetId,causeId,outcome,displayOnly:true});
}
export function cuePlan(outcome){ return Object.freeze({
 success:Object.freeze([{at:80,kind:'commit'},{at:390,kind:'erase'},{at:760,kind:'acceleration'}]),
 failure:Object.freeze([{at:80,kind:'commit'},{at:350,kind:'failure'}]),
 body:Object.freeze([{at:70,kind:'barrier'},{at:250,kind:'body'}]),
 blocked:Object.freeze([{at:230,kind:'blocked'}])
}[normalizeFixture({outcome}).outcome]); }
