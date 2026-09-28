import {pulse,smooth} from '../../core/math.js';
export function sample(ageMs,{reducedMotion=false}={}) {
 const t=ageMs/1000,alive=t>=0&&t<2.2;
 const env=alive?pulse(t,0,.08,1.86,2.2):0;
 return Object.freeze({ageMs,alive,phase:t<.34?'request':t<1.055?'resolve':t<1.67?'confirm':'release',source:env*(.3+.2*smooth(.3,.4,t)+.15*smooth(.64,.75,t)+.35*pulse(t,.99,1.08,1.36,1.79)),body:env,localLight:env*(.23+.54*smooth(.98,1.16,t)),bloom:env*.46,geometryTime:reducedMotion?1.25:t,confirmed:smooth(1.02,1.13,t),reducedMotion});
}
