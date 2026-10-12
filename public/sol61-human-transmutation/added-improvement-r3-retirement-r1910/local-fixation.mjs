// GPT-6.1-Sol Sparkle Zero R1: transient emissive response of a newly fixed material row.
import {HANDOFF_TIMING as T} from './handoff-state.mjs';
export const LOCAL_FIXATION=Object.freeze({riseMs:8,fadeBeginsMs:16,endsMs:42,gain:.65});
const smooth=(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
export function fixationPulse(phaseMs,supportY){
 if(!Number.isFinite(phaseMs)||!Number.isFinite(supportY))throw new TypeError('Same-cause finite phase and support row required');
 if(supportY<0||supportY>1||phaseMs<0||phaseMs>=1200)return 0;
 const fixedAt=T.footArrivalMs+(1-supportY)*T.bodySweepMs+T.fixMs;
 const age=phaseMs-fixedAt;
 return smooth(0,LOCAL_FIXATION.riseMs,age)*(1-smooth(LOCAL_FIXATION.fadeBeginsMs,LOCAL_FIXATION.endsMs,age));
}
