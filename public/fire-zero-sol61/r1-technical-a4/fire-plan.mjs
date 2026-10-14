export const FIRE_ID='fire-zero-sol61-r1';
export const DEFAULT_FIXTURE=Object.freeze({lifetimeEms:2600,extentWorld:1.1,actorHeightCss:64,gapEms:850,synthetic:true});
export function normalizeFireInput(input={}) {
  const value={causeId:String(input.causeId??'fixture-0'),ageEms:input.ageEms??0,lifetimeEms:input.lifetimeEms??2600,extentWorld:input.extentWorld??1.1,source:input.source!==false,observer:input.observer!==false,receivedLight:input.receivedLight!==false,mainOnly:input.mainOnly===true,bright:input.bright===true,reducedMotion:input.reducedMotion===true,actorHeightCss:input.actorHeightCss??64,sourceX:input.sourceX??0};
  for(const key of ['ageEms','lifetimeEms','extentWorld','actorHeightCss','sourceX'])if(!Number.isFinite(value[key]))throw Error('nonfinite '+key);
  if(value.ageEms<0||value.lifetimeEms<400||value.lifetimeEms>10000||value.extentWorld<0.3||value.extentWorld>3||value.actorHeightCss<32||value.actorHeightCss>256||Math.abs(value.sourceX)>3)throw Error('Fire input outside fixture bounds');
  if(!value.causeId.length)throw Error('cause required');return value;
}
export function firePlan(input={}) {
  const v=normalizeFireInput(input),p=v.ageEms/v.lifetimeEms,active=v.source&&p>0&&p<1;
  return Object.freeze({...v,id:FIRE_ID,normalizedAge:p,active,phase:p<=0?'before':p<.10?'ignition':p<.78?'sustained':p<1?'fuel-cutoff':'ended',fuelCutoffEms:.78*v.lifetimeEms,transportEms:.18*v.lifetimeEms,sourceGain:active?1:0,observerGain:active&&v.observer&&!v.mainOnly?1:0,receivedGain:active&&v.receivedLight&&!v.mainOnly?1:0,fixtureBounds:{actorWorldHeight:1,actorCssHeight:v.actorHeightCss,fieldHalfWidth:v.extentWorld,fieldHeight:1.55,projectionYPerDepth:.36},sfxRequestEligible:active&&v.ageEms<=160});
}
export function fuelAtHeight(ageEms,lifetimeEms,height) {
  if(!Number.isFinite(height)||height<0||height>1.55)throw Error('height');
  if(ageEms<=0||ageEms>=lifetimeEms)return 0;
  const p=ageEms/lifetimeEms-height*.115;
  const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  return smooth(0,.06,p)*(1-smooth(.78,.82,p));
}
