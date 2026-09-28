import {smooth,pulse} from '../../core/math.js';
export function sample(ageMs,{reducedMotion=false}={}) {
 const t=ageMs/1000,alive=t>=0&&t<2.2;
 const env=alive?pulse(t,0,.12,1.83,2.2):0;
 return Object.freeze({ageMs,alive,phase:t<.48?'index':t<1.04?'bind':t<1.65?'settle':'release',source:env*(.52+.48*pulse(t,.68,1.01,1.15,1.47)),body:env,localLight:env*(.26+.59*pulse(t,.63,.99,1.22,1.6)),bloom:env*.54,geometryTime:reducedMotion?1.18:t,fold:smooth(.10,.67,t)*(1-smooth(1.2,1.75,t)),reducedMotion});
}
