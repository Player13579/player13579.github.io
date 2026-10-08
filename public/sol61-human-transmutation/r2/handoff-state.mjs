// Shared actual shader timing and analytic contract. E milliseconds, CSS distances.
export const HANDOFF_TIMING=Object.freeze({footArrivalMs:90,bodySweepMs:700,travelMs:110,fixMs:24,materialOnsetMs:30});
const smooth=(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
export function materialHandoffAt({rowY,phaseMs,actorHeight=64,reducedMotion=false}={}) {
  if(![rowY,phaseMs,actorHeight].every(Number.isFinite)||rowY<0||rowY>1||actorHeight<=0)throw new TypeError('Exact support row, cause phase and positive actor height required');
  const t=HANDOFF_TIMING,arrivalMs=t.footArrivalMs+(1-rowY)*t.bodySweepMs;
  const approach=smooth(arrivalMs-t.travelMs,arrivalMs,phaseMs);
  const fixed=smooth(arrivalMs,arrivalMs+t.fixMs,phaseMs);
  const onset=smooth(arrivalMs-t.travelMs,arrivalMs-t.travelMs+30,phaseMs)*smooth(0,t.materialOnsetMs,phaseMs);
  return Object.freeze({arrivalMs,approach,fixed,onset,travelCSS:(1-approach)**2*actorHeight*(reducedMotion ? 0.10 : 0.34),transportWeight:onset*(1-fixed),fixedWeight:fixed});
}
