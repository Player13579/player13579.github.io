import {pulse,smooth} from '../../core/math.js';
export function sample(ageMs,{reducedMotion=false}={}) {
 const t=ageMs/1000,alive=t>=0&&t<2.2;
 const env=alive?pulse(t,0,.055,1.80,2.2):0;
 return Object.freeze({ageMs,alive,phase:t<.18?'switch':t<.77?'focus':t<1.62?'read':'release',source:env*(.29+.71*smooth(.10,.64,t))*(1-.26*smooth(1.0,1.65,t)),body:env,localLight:env*(.21+.79*smooth(.17,.74,t)),bloom:env*.61,geometryTime:reducedMotion?.94:t,focus:smooth(.18,.85,t),reducedMotion});
}
