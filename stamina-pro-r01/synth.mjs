import {clamp,smooth,chargeFlux} from './math.mjs';
const TAU=2*Math.PI;
function noise(t,seed){
  // Bounded, deterministic band-limited-ish partial cloud; no samples or impulses.
  return (Math.sin(TAU*(1373.1*t+seed*.17))*Math.sin(TAU*211.7*t)+
    .6*Math.sin(TAU*(2281.3*t+seed*.31))+.35*Math.sin(TAU*3199.7*t))/1.95;
}
/** Mono pressure sample in [-1,1], no IO. p, charge and arrival flux match VFX math. */
export function synthSample(ageSeconds,durationSeconds=1.5,seed=0){
  if(ageSeconds<=0||ageSeconds>=durationSeconds)return 0;
  const p=ageSeconds/durationSeconds;
  const {charge,flux}=chargeFlux(p);
  const attack=smooth(0,.018,ageSeconds), release=1-smooth(.79,1,p);
  const intake=(1-smooth(.04,.32,p))*attack;
  // Analytic chirp: phase is an integral of f0 + k*t, not frequency*time with wrong derivative.
  const phase=TAU*(225*ageSeconds+110*ageSeconds*ageSeconds/durationSeconds);
  const transport=(.065+.04*clamp(flux/5))*Math.sin(phase)*smooth(.025,.17,p);
  const fill=.16*Math.sqrt(charge)*Math.sin(TAU*146.83*ageSeconds+.19*Math.sin(TAU*293.66*ageSeconds));
  const grain=.024*noise(ageSeconds,seed)*intake;
  const arrival=.052*clamp(flux/5)*Math.sin(TAU*587.32*ageSeconds)*smooth(.02,.1,p);
  const x=(transport+fill+grain+arrival)*attack*release;
  return Math.tanh(x*1.35)*.68;
}
export function synthStereo(age,duration,seed=0,pan=0){
  const m=synthSample(age,duration,seed),angle=(clamp(pan,-1,1)+1)*Math.PI/4;
  return [m*Math.cos(angle),m*Math.sin(angle)];
}
