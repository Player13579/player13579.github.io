// Shared actual shader timing and analytic contract. E milliseconds, CSS distances.
export const HANDOFF_TIMING=Object.freeze({footArrivalMs:90,bodySweepMs:700,travelMs:110,fixMs:24,materialOnsetMs:30});
// One unsplit row approaches from screen-left; all its material shares this map.
// Bound screen-space row shear to .45 (.18 reduced) CSS px per vertical CSS px.
// smoothstep has maximum derivative 1.5. The coefficient follows the live window.
export const MATERIAL_TRANSPORT=Object.freeze({topology:'unsplit-row-sheet',direction:'screen-left-to-registered-x',maxRowShear:.45,reducedMaxRowShear:.18});
export function transportExtentRatio(reducedMotion=false){
  return (reducedMotion ? MATERIAL_TRANSPORT.reducedMaxRowShear : MATERIAL_TRANSPORT.maxRowShear)*HANDOFF_TIMING.travelMs/(1.5*HANDOFF_TIMING.bodySweepMs);
}
const smooth=(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
export function materialHandoffAt({rowY,phaseMs,actorHeight=64,reducedMotion=false}={}) {
  if(![rowY,phaseMs,actorHeight].every(Number.isFinite)||rowY<0||rowY>1||actorHeight<=0)throw new TypeError('Exact support row, cause phase and positive actor height required');
  const t=HANDOFF_TIMING,arrivalMs=t.footArrivalMs+(1-rowY)*t.bodySweepMs;
  const approach=smooth(arrivalMs-t.travelMs,arrivalMs,phaseMs);
  const fixed=smooth(arrivalMs,arrivalMs+t.fixMs,phaseMs);
  const onset=smooth(arrivalMs-t.travelMs,arrivalMs-t.travelMs+30,phaseMs)*smooth(0,t.materialOnsetMs,phaseMs);
  return Object.freeze({arrivalMs,approach,fixed,onset,travelCSS:(1-approach)*actorHeight*transportExtentRatio(reducedMotion),transportWeight:onset*(1-fixed),fixedWeight:fixed});
}
