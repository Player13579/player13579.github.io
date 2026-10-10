// New R1 creative source: display-only successful entitlement acknowledgement.
export const EDITION = 'ability-entitlement-sol61-r2-r805';
export const LIFE_MS = 980;
export const CAPTURE_AGES = Object.freeze([0, 45, 110, 220, 360, 510, 670, 820, 979, 1000]);
const finite = n => Number.isFinite(n);
const nonempty = s => typeof s === 'string' && s.trim().length > 0;
const point = p => Array.isArray(p) && p.length === 2 && p.every(finite);
const rect = r => r && ['x','y','width','height'].every(k => finite(r[k])) && r.width >= 40 && r.height >= 24;
const has = (a, id) => Array.isArray(a) && a.includes(id);

// Real adapter supplies evidence. Neither snapshot appearance nor local selection is a receipt.
export function admission(input, context) {
  if (!input || !context) return {ok:false, reason:'missing-input'};
  if (input.kind !== 'successful-new-self-ability-entitlement' || input.success !== true || input.duplicate !== false || input.initialSeeding !== false) return {ok:false, reason:'not-new-success'};
  if (![input.abilityId,input.playerId,input.roomId,input.sessionId].every(nonempty) || input.playerId !== context.selfId || input.roomId !== context.roomId || input.sessionId !== context.sessionId) return {ok:false, reason:'identity'};
  if (!finite(input.authorityTimeMs) || !finite(context.authorityNowMs) || input.authorityTimeMs > context.authorityNowMs || context.authorityNowMs - input.authorityTimeMs > LIFE_MS) return {ok:false, reason:'stale-authority-time'};
  if (has(input.beforeEntitlements,input.abilityId) || !Array.isArray(input.beforeEntitlements) || !has(input.afterEntitlements,input.abilityId) || !has(context.authoritativeEntitlements,input.abilityId)) return {ok:false, reason:'not-new-authoritative-entitlement'};
  const proof = input.identityProof;
  // A nullable server transaction ID does not license generating an invented identity.
  const id = nonempty(input.transactionId) ? input.transactionId :
    (proof && ['original-same-intent','correlated-action-vending-event'].includes(proof.kind) && proof.abilityId === input.abilityId && proof.playerId === input.playerId && proof.roomId === input.roomId && proof.sessionId === input.sessionId && nonempty(proof.evidenceRef) && nonempty(proof.id) ? proof.id : null);
  if (!id) return {ok:false, reason:'missing-cause-identity'};
  const target = input.target;
  if (!target || target.abilityId !== input.abilityId || target.playerId !== input.playerId || target.roomId !== input.roomId || target.sessionId !== input.sessionId || !nonempty(target.registrationId) || !Number.isInteger(target.generation) || target.generation<0 || target.generation !== context.targetGeneration || target.visible !== true || target.semantic !== 'ability-product-owned-status' || !rect(target.rect)) return {ok:false, reason:'unregistered-ability-target'};
  if (!point(input.sourceProjectedPosition) || !finite(input.sourceRegistrationHeight) || input.sourceRegistrationHeight <= 0 || !nonempty(input.sourceRegistrationId) || input.sourceRegistrationId!==context.sourceRegistrationId || !Number.isInteger(input.sourceGeneration) || input.sourceGeneration<0 || input.sourceGeneration!==context.sourceGeneration) return {ok:false, reason:'unregistered-source'};
  const causeKey = JSON.stringify([input.roomId,input.sessionId,input.playerId,id,input.abilityId]);
  return Object.freeze({ok:true, causeKey, causeId:id, authorityTimeMs:input.authorityTimeMs, abilityId:input.abilityId,
    roomId:input.roomId, sessionId:input.sessionId, playerId:input.playerId,
    source:Object.freeze([...input.sourceProjectedPosition]), sourceHeight:input.sourceRegistrationHeight,
    sourceRegistrationId:input.sourceRegistrationId, sourceGeneration:input.sourceGeneration,
    target:Object.freeze({abilityId:target.abilityId,playerId:target.playerId,roomId:target.roomId,sessionId:target.sessionId,
      registrationId:target.registrationId,generation:target.generation,visible:true,semantic:target.semantic,
      rect:Object.freeze({...target.rect})}), fixtureOnly:input.fixtureOnly === true});
}

export function createAdmissionGate() {
  const seen = new Set();
  return {accept(input,context) {const result = admission(input,context); if(!result.ok) return result; if(seen.has(result.causeKey)) return {ok:false,reason:'duplicate-cause'}; seen.add(result.causeKey); return Object.freeze(result);},
    // Session retirement destroys this gate. No redraw/replay resets an existing real gate.
    size:()=>seen.size};
}

export function smooth(a,b,x) {const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t);}
export function phase(ageMs) {
  if(!finite(ageMs) || ageMs < 0 || ageMs >= LIFE_MS) return 'expired';
  if(ageMs<90) return 'receipt-onset'; if(ageMs<280) return 'source-acknowledgement';
  if(ageMs<580) return 'permission-opening'; if(ageMs<760) return 'registered-boundary-result'; return 'release';
}
export function samplePlan(cause, ageMs, options={}) {
  if(!cause?.ok || !finite(ageMs)) throw new Error('valid admitted cause and age required');
  const alive=ageMs>=0 && ageMs<LIFE_MS;
  return Object.freeze({edition:EDITION,causeKey:cause.causeKey,causeId:cause.causeId,abilityId:cause.abilityId,ageMs,
    roomId:cause.roomId,sessionId:cause.sessionId,playerId:cause.playerId,
    sourceRegistrationId:cause.sourceRegistrationId,sourceGeneration:cause.sourceGeneration,
    phase:phase(ageMs),alive,source:Object.freeze([...cause.source]),sourceHeight:cause.sourceHeight,targetRect:Object.freeze({...cause.target.rect}),
    targetRegistrationId:cause.target.registrationId,targetGeneration:cause.target.generation,
    sourceGain:alive?smooth(0,65,ageMs)*(1-smooth(180,300,ageMs)):0,
    opening:smooth(150,580,ageMs),
    uiGain:alive?smooth(70,180,ageMs)*(1-smooth(760,LIFE_MS,ageMs)):0,
    reducedMotion:options.reducedMotion===true,
    sourceEnabled:options.sourceEnabled!==false,nearEnabled:options.nearEnabled!==false,observerEnabled:options.observerEnabled!==false,
    intensity:finite(options.intensity)?Math.max(0,options.intensity):1,fixtureOnly:cause.fixtureOnly});
}

// Validated same-cause geometry overlay; never re-admits, mutates a cause, or restarts age.
// Registration coordinates must already be relative to this frame's canvas CSS viewport.
export function refreshFramePlan(cause, ageMs, registration, options={}) {
  if(!cause?.ok || !finite(ageMs)) throw new Error('valid admitted cause and age required');
  if(![cause.roomId,cause.sessionId,cause.playerId,cause.abilityId,cause.sourceRegistrationId,cause.target?.registrationId].every(nonempty) || !Number.isInteger(cause.sourceGeneration) || cause.sourceGeneration<0 || !Number.isInteger(cause.target?.generation) || cause.target.generation<0) return {ok:false,reason:'incomplete-admitted-identity'};
  if(!registration) return {ok:false,reason:'missing-frame-registration'};
  const r=registration;
  if(r.coordinateSpace !== 'canvas-css' || !Number.isInteger(r.frameId) || r.frameId<0 || r.sourceFrameId!==r.frameId || r.targetFrameId!==r.frameId) return {ok:false,reason:'frame-registration-space-or-time'};
  if(r.roomId!==cause.roomId || r.sessionId!==cause.sessionId || r.playerId!==cause.playerId || r.abilityId!==cause.abilityId) return {ok:false,reason:'frame-owner-mismatch'};
  if(r.sourceRegistrationId!==cause.sourceRegistrationId || r.sourceGeneration!==cause.sourceGeneration || r.targetRegistrationId!==cause.target.registrationId || r.targetGeneration!==cause.target.generation || r.targetSemantic!==cause.target.semantic) return {ok:false,reason:'frame-registration-identity'};
  if(r.sourceVisible!==true || r.targetVisible!==true || !point(r.source) || !finite(r.sourceHeight) || r.sourceHeight<=0 || !rect(r.targetRect)) return {ok:false,reason:'frame-registration-unavailable'};
  const base=samplePlan(cause,ageMs,options);
  return Object.freeze({ok:true,plan:Object.freeze({...base,source:Object.freeze([...r.source]),sourceHeight:r.sourceHeight,
    targetRect:Object.freeze({...r.targetRect}),frameRegistrationId:r.frameId,coordinateSpace:'canvas-css'})});
}

// CSS geometry is converted only after this frame's backing viewport is established.
export function packUniforms(plan, viewport) {
  if(!viewport || !['cssWidth','cssHeight','width','height'].every(k=>finite(viewport[k])&&viewport[k]>0)) throw new Error('positive actual CSS/backing dimensions required');
  const sx=viewport.width/viewport.cssWidth, sy=viewport.height/viewport.cssHeight;
  if(Math.abs(sx-sy)>1e-4) throw new Error('nonuniform canvas scale unsupported');
  const r=plan.targetRect;
  return new Float32Array([viewport.width,viewport.height,sx,0,
    plan.source[0]*sx,plan.source[1]*sy,plan.sourceHeight*sx,0,
    r.x*sx,r.y*sy,r.width*sx,r.height*sy,
    plan.ageMs,plan.intensity,plan.alive?1:0,plan.reducedMotion?1:0,
    plan.sourceEnabled?1:0,plan.nearEnabled?1:0,plan.observerEnabled?1:0,0]);
}

// Designed digital UI sound, not an acoustic gun, coin, impact or unlocking mechanism.
// CPU synthesis is deterministic; normal-route listening remains a separate acceptance.
export function synthesizeSfx(sampleRate=48000) {
  if(!Number.isInteger(sampleRate)||sampleRate<8000) throw new Error('sample rate');
  const output=new Float32Array(Math.ceil(sampleRate*0.72));
  const tones=[{start:0.025,duration:0.18,f0:520,f1:780,gain:0.09},
    {start:0.16,duration:0.36,f0:780,f1:1040,gain:0.075},
    {start:0.47,duration:0.22,f0:1040,f1:1040,gain:0.07}];
  for(const tone of tones) {let angle=0; for(let i=Math.floor(tone.start*sampleRate);i<Math.min(output.length,Math.ceil((tone.start+tone.duration)*sampleRate));i++) {
    const t=i/sampleRate-tone.start,q=Math.max(0,Math.min(1,t/tone.duration));
    const env=smooth(0,0.012,t)*(1-smooth(tone.duration*0.44,tone.duration,t));
    const f=tone.f0+(tone.f1-tone.f0)*smooth(0,0.8,q); angle+=2*Math.PI*f/sampleRate;
    output[i]+=tone.gain*env*(Math.sin(angle)+0.24*Math.sin(2*angle)+0.08*Math.sin(3*angle));
  }} return output;
}

// Adapter must invoke only while context is running, visible, unmuted and same generation.
// A late audio unlock never chases an already expired acquisition.
export function audioAdmission(plan, state) {
  return !!(plan.alive && plan.ageMs <= 100 && state?.running === true && state.visible === true && state.muted !== true && state.verify !== true && state.targetGeneration === plan.targetGeneration);
}
