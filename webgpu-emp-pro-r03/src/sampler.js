import {informationState} from './information-state.js';
import {clamp,smooth,VISUAL,CONTRACT} from './contract.js';
import {timing} from './events.js';
/** Pure actor-time sampling. Never uses wall time, visibility radius or server HP. */
export function sampleEvent(e,time){
 const ageMs=time-e.atMs,t=timing(e,time);if(ageMs<0||t.removalAt!==null&&time>=t.removalAt)return null;
 const terminal=t.terminalAt!==null&&time>=t.terminalAt;
 const terminalQ=terminal?clamp((time-t.terminalAt)/VISUAL.releaseMs[e.kind]):0;
 // Resolution freezes the already reached field configuration; the tail can only dismantle it.
 const stateAgeMs=terminal?Math.max(0,t.terminalAt-e.atMs):ageMs;
 let phase,progress;
 if(e.kind==='charge'){progress=clamp(stateAgeMs/CONTRACT.chargeMs);phase=stateAgeMs<260?'capture':stateAgeMs<960?'compress':stateAgeMs<1200?'latch':'ready-held';}
 if(e.kind==='normal'){progress=clamp(stateAgeMs/520);phase=stateAgeMs<90?'source-split':stateAgeMs<180?'transport':stateAgeMs<330?'target-termination':'deenergize';}
 if(e.kind==='resonance'){progress=clamp(stateAgeMs/1600);phase=stateAgeMs<220?'ingress':stateAgeMs<580?'interlock-unfold':stateAgeMs<850?'split-spine':stateAgeMs<1400?'branch-extinction':'remnant';}
 if(e.kind==='cancellation'){progress=clamp(stateAgeMs/1600);phase=stateAgeMs<300?'opposed-ingress':stateAgeMs<710?'interleave':stateAgeMs<1340?'annihilation-front':'seam-close';}
 if(e.kind==='suppression'){progress=clamp(stateAgeMs/240);phase=stateAgeMs<240?'latch':'storage-held';}
 const sample={event:e,kind:e.kind,ageMs,stateAgeMs,seconds:stateAgeMs/1000,elapsedSeconds:ageMs/1000,progress,phase:terminal?'resolved-release':phase,terminal,terminalQ,
   envelope:terminal?1-smooth(.25,1,terminalQ):1,origin:['charge','suppression'].includes(e.kind)?e.attachment:e.binding.origin,
   ...t,authorityActive:t.authorityEnd===null||time<t.authorityEnd};
 sample.information=informationState(sample);return sample;
}
export function sampleStore(store,time){return [...store.events.values()].map(e=>sampleEvent(e,time)).filter(Boolean);}
