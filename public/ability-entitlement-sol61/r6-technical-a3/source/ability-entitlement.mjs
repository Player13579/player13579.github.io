// New independently authored VFX/SFX edition; R2 receipt/geometry scaffolding retained.
export const EDITION = "ability-entitlement-sol61-r6";
export const LIFE_MS = 1160;
export const CAPTURE_AGES = Object.freeze([0,20,45,95,160,240,340,430,520,590,690,820,940,1050,1159,1160,1200]);
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
export const PHASES=Object.freeze([[0,95,"receipt-onset"],[95,520,"status-inscription"],[520,690,"contour-commit"],[690,940,"owned-result"],[940,1160,"release"]].map(x=>Object.freeze(x)));
export function phase(age){if(!finite(age)||age<0||age>=LIFE_MS)return "expired";return PHASES.find(x=>age>=x[0]&&age<x[1])[2];}
export function samplePlan(cause, ageMs, options={}) {
  if(!cause?.ok || !finite(ageMs)) throw new Error('valid admitted cause and age required');
  const alive=ageMs>=0 && ageMs<LIFE_MS;
  return Object.freeze({edition:EDITION,causeKey:cause.causeKey,causeId:cause.causeId,abilityId:cause.abilityId,ageMs,
    roomId:cause.roomId,sessionId:cause.sessionId,playerId:cause.playerId,
    sourceRegistrationId:cause.sourceRegistrationId,sourceGeneration:cause.sourceGeneration,
    phase:phase(ageMs),alive,source:Object.freeze([...cause.source]),sourceHeight:cause.sourceHeight,targetRect:Object.freeze({...cause.target.rect}),
    targetRegistrationId:cause.target.registrationId,targetGeneration:cause.target.generation,
    sourceGain:alive?smooth(0,30,ageMs)*(1-smooth(140,230,ageMs)):0,
    writeProgress:smooth(95,520,ageMs),
    uiGain:alive?smooth(65,130,ageMs)*(1-smooth(940,LIFE_MS,ageMs)):0,
    reducedMotion:options.reducedMotion===true,
    sparkleEnabled:options.sparkleEnabled!==false,sourceEnabled:options.sourceEnabled!==false,nearEnabled:options.nearEnabled!==false,observerEnabled:options.observerEnabled!==false,
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
  const packed = new Float32Array([viewport.width,viewport.height,sx,0,
    plan.source[0]*sx,plan.source[1]*sy,plan.sourceHeight*sx,0,
    r.x*sx,r.y*sy,r.width*sx,r.height*sy,
    plan.ageMs,plan.intensity,plan.alive?1:0,plan.reducedMotion?1:0,
    plan.sourceEnabled?1:0,plan.nearEnabled?1:0,plan.observerEnabled?1:0,plan.sparkleEnabled?1:0]);
  if (!packed.every(Number.isFinite)) throw new Error("nonfinite Float32 uniform");
  return packed;
}


const EVENTS=[{"start":0.020,"duration":0.055,"kind":"receipt","freq":1120,"gain":0.05},{"start":0.100,"duration":0.28,"kind":"inscription","freq":0,"gain":0.035},{"start":0.520,"duration":0.35,"kind":"resolved","freq":880,"gain":0.08}];

export const SFX_DURATION_SECONDS=1.10;
export const SFX_EVENTS=Object.freeze(EVENTS.map(x=>Object.freeze({...x})));
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('sample rate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_SECONDS));let seed=0xA341316C;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967295*2-1;};
 for(const event of SFX_EVENTS){let filtered=0;
 for(let i=Math.ceil(event.start*sampleRate);i<Math.min(out.length,Math.floor((event.start+event.duration)*sampleRate));i++){
 const t=i/sampleRate-event.start,q=t/event.duration,env=smooth(0,Math.min(.009,event.duration*.1),t)*(1-smooth(event.duration*.45,event.duration,t));
 filtered=.85*filtered+.15*random();let value=0;
 if(event.freq===0)value=filtered*(.7+.3*Math.sin(Math.PI*q));
 else if(event.kind==='resolved')value=.62*Math.sin(2*Math.PI*event.freq*t)+.24*Math.sin(2*Math.PI*event.freq*1.5*t)+.14*Math.sin(2*Math.PI*event.freq*2*t);
 else value=.8*Math.sin(2*Math.PI*event.freq*t)+.2*filtered;
 out[i]+=event.gain*env*value;
 }}return out;
}
// Interface sonification, not a physical coin, firearm or real unlocking latch.
export function audioAdmission(plan,state){return !!(plan.alive&&plan.ageMs>=0&&plan.ageMs<=650&&state?.running===true&&state.visible===true&&state.muted!==true&&state.verify!==true&&state.targetGeneration===plan.targetGeneration);}
