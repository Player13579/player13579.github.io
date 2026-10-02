// GPT-6.1-Sol r7: existing faucet, finite free jet, basin contact and draining film.
import {ORIGINAL,uniforms as lightUniforms} from './support-light/artist.mjs';
import {clothState,clothUniforms} from './cloth.mjs';
export {CLOTH,clothState,gust,clothTable} from './cloth.mjs';
export {ORIGINAL};
export const ID='sol61-medical-vfx-r4-environment-r7';
export const DESIGN=Object.freeze({periodMs:12000,tableHz:240,audio:'none',nozzle:[887,188],contact:[885,234],basin:[811,190,967,273],
 worldPxPerMetre:[533.3333333333334,320,152],height:46/152,gravity:9.81,density:1000,surfaceTension:.07274,
 nozzleRadius:.0075,flowPeak:.00006,drainTau:.60,filmDepth:.0014,maxFilmRadius:.09,waveLength:.045,waveTau:.80,wavePeak:.00060,
 residualTimes:[6.15,6.65,7.25],residualRadius:.0016,residualVelocity:.01,visualCutoffSeconds:10,
 waterF0:.020,waterRoughness:.18,refractionPx:[2.3,1.4],environmentProbe:[995,290],splashCount:4,splashRadialVelocity:.095,splashVerticalVelocity:.13});
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const smooth=(a,b,x)=>{const q=clamp((x-a)/(b-a),0,1);return q*q*(3-2*q);};
export const VELOCITY=DESIGN.flowPeak/(Math.PI*DESIGN.nozzleRadius**2);
export const fallTime=(velocity=VELOCITY)=> (Math.sqrt(velocity**2+2*DESIGN.gravity*DESIGN.height)-velocity)/DESIGN.gravity;
export const FALL=fallTime();
export const RESIDUAL_FALL=fallTime(DESIGN.residualVelocity);
export const DROP_VOLUME=4*Math.PI*DESIGN.residualRadius**3/3;
export function valve(t){if(!Number.isFinite(t))throw Error('finite source time required');if(t<0||t>=5.85)return 0;if(t<.35)return smooth(0,.35,t);if(t<5.4)return 1;return 1-smooth(5.4,5.85,t);}
export function impactFlow(t){return DESIGN.flowPeak*valve(t-FALL);}
export function jetAtAge(t,age){if(!Number.isFinite(t)||!Number.isFinite(age)||age<0||age>FALL)return null;const q=valve(t-age);if(q<=0)return null;const z=DESIGN.height-VELOCITY*age-.5*DESIGN.gravity*age*age;return {p:[887-2*age/FALL,234-152*z],radius:DESIGN.nozzleRadius*Math.sqrt(q*VELOCITY/(VELOCITY+DESIGN.gravity*age)),velocity:VELOCITY+DESIGN.gravity*age,flow:DESIGN.flowPeak*q};}
export function waveOmega(depth){const k=2*Math.PI/DESIGN.waveLength;return Math.sqrt((DESIGN.gravity*k+DESIGN.surfaceTension*k**3/DESIGN.density)*Math.tanh(k*Math.max(0,depth)));}
// Exact exponential drain for each piecewise midpoint inflow interval. Impulses are timed inside each interval.
export function makeTable(hz=DESIGN.tableHz){if(!Number.isInteger(hz)||hz<60||hz>960)throw Error('invalid table resolution');const dt=1/hz,n=12*hz,rows=[{t:0,volume:0,amplitude:0,phase:0,input:0,drained:0}];let V=0,A=0,phase=0,input=0,drained=0;
 for(let i=1;i<=n;i++){const a=(i-1)*dt,b=i*dt,q=impactFlow((a+b)/2),ev=Math.exp(-dt/DESIGN.drainTau),ea=Math.exp(-dt/DESIGN.waveTau);let injected=q*dt,add=q*DESIGN.drainTau*(1-ev);let impulse=0;
  for(const emission of DESIGN.residualTimes){const impact=emission+RESIDUAL_FALL;if(impact>a&&impact<=b){add+=DROP_VOLUME*Math.exp(-(b-impact)/DESIGN.drainTau);injected+=DROP_VOLUME;impulse+=.00011*Math.exp(-(b-impact)/DESIGN.waveTau);}}
  const prior=V;V=V*ev+add;drained+=prior+injected-V;input+=injected;A=A*ea+DESIGN.wavePeak*(q/DESIGN.flowPeak)*(1-ea)+impulse;
  const depth=V>0?Math.min(DESIGN.filmDepth,V/(Math.PI*DESIGN.maxFilmRadius**2)):0;phase+=waveOmega(depth)*dt;rows.push({t:b,volume:V,amplitude:A,phase,input,drained});
 }return rows;
}
const TABLE=makeTable();
export function phaseSeconds(ms){if(!Number.isFinite(ms)||ms<0)throw Error('finite nonnegative canonical environmentTimeMs required');return (ms%DESIGN.periodMs)/1000;}
export function fluidState(ms){const t=phaseSeconds(ms),u=t*DESIGN.tableHz,i=Math.min(Math.floor(u),TABLE.length-2),fraction=u-i,a=TABLE[i],b=TABLE[i+1];const lerp=k=>a[k]+(b[k]-a[k])*fraction;const physicalVolume=lerp('volume'),physicalAmplitude=lerp('amplitude'),visual=t<DESIGN.visualCutoffSeconds;
 return Object.freeze({t,flow:DESIGN.flowPeak*valve(t),impactFlow:impactFlow(t),volume:visual?physicalVolume:0,physicalVolume,amplitude:visual?physicalAmplitude:0,physicalAmplitude,wavePhase:lerp('phase'),filmRadius:visual?Math.min(DESIGN.maxFilmRadius,Math.sqrt(physicalVolume/(Math.PI*DESIGN.filmDepth))):0,
 inputVolume:lerp('input'),drainedVolume:lerp('drained'),stage:t<5.4?'running':t<5.85?'closing':t<8.5?'residual':t<10?'draining':'dry',visualCutoff:!visual});
}
// No clock fallback. Per-room lease supplied by host; this demo is not a gameplay receipt.
export function acceptedFrameInput(raw){if(!raw||raw.visible!==true||raw.current!==true||raw.roomId!=='medical')return null;if(!Number.isFinite(raw.environmentTimeMs)||raw.environmentTimeMs<0)throw Error('environment clock absent');if(raw.sourceMode!=='gallery-demo')throw Error('actual tap-state producer contract not connected');if(raw.basisHash!==ORIGINAL.sha256)throw Error('registration basis differs');return Object.freeze({environmentTimeMs:raw.environmentTimeMs,sourceMode:'gallery-demo',basisHash:ORIGINAL.sha256});}
export function uniforms(args){const light=lightUniforms(args);const st=fluidState(args.environmentTimeMs);const fluidEnabled=args.effect!==false&&args.fluid!==false&&args.cancelled!==true&&args.reducedMotion!==true;const d=DESIGN;
 // Eight vec4 / 128 bytes, separate group1 binding0. Values never scale with DPR.
 const water=new Float32Array([st.t,fluidEnabled?1:0,st.volume,st.amplitude,887,188,885,234,d.height,d.gravity,VELOCITY,FALL,d.nozzleRadius,533.3333333333334,320,152,st.filmRadius,st.wavePhase,2*Math.PI/d.waveLength,d.waterRoughness,d.waterF0,d.refractionPx[0],d.refractionPx[1],d.wavePeak,...d.residualTimes,d.residualRadius,RESIDUAL_FALL,d.residualVelocity,d.splashRadialVelocity,d.splashVerticalVelocity]);
 const clothEnabled=args.effect!==false&&args.cloth!==false&&args.cancelled!==true&&args.reducedMotion!==true;
 return Object.freeze({light,water,cloth:clothUniforms(args.environmentTimeMs,clothEnabled),state:st,clothState:clothState(args.environmentTimeMs)});
}
