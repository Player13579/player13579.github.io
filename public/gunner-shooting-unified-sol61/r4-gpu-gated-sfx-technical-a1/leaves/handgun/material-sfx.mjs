// Shooting creative R4: causal displacement / exhaust / steel. Procedural acoustic approximation, not a recording.
// Every event is relative to the same registered shot cause. No falling-case impact.
const contact=(id,timeMs,gain,modes,decayMs,forceMs=.34)=>Object.freeze({id,timeMs,gain,modes:Object.freeze(modes),decayMs,forceMs});
export const MATERIAL_SHOTS=Object.freeze({
 handgun:Object.freeze({seconds:.34,gain:.62,reportMs:24,bodyMs:64,pressureHz:145,
  ejectionMs:26,frictionStartMs:7,frictionEndMs:16,frictionGain:.017,
  contacts:Object.freeze([
   contact('slide-rear-stop',16,.13,[980,2210,3960],[5,3.2,1.8]),
   contact('slide-battery-seat',95,.15,[760,1710,3270],[6.2,4,2.3],.43)
  ])}),
 smg:Object.freeze({seconds:.20,gain:.62,reportMs:15,bodyMs:42,pressureHz:190,
  ejectionMs:16,frictionStartMs:8,frictionEndMs:16,frictionGain:.012,
  contacts:Object.freeze([
   contact('receiver-rear-contact',20,.10,[1150,2630,4710],[4.6,2.8,1.5]),
   contact('receiver-return-seat',65,.13,[920,2070,3840],[5.2,3.2,1.8])
  ])}),
 assault:Object.freeze({seconds:.28,gain:.72,reportMs:25,bodyMs:68,pressureHz:122,
  ejectionMs:24,frictionStartMs:14,frictionEndMs:24,frictionGain:.015,
  contacts:Object.freeze([
   contact('receiver-rear-contact',30,.12,[720,1620,3140],[6.5,3.8,2.1],.40),
   contact('receiver-return-seat',110,.15,[640,1450,2860],[7,4.2,2.3],.44)
  ])}),
 sniper:Object.freeze({seconds:.42,gain:.90,reportMs:40,bodyMs:92,pressureHz:84,
  ejectionMs:80,frictionStartMs:59,frictionEndMs:80,frictionGain:.018,
  contacts:Object.freeze([
   contact('receiver-rear-contact',86,.14,[540,1240,2490],[8,4.8,2.6],.50),
   contact('receiver-return-seat',175,.17,[480,1110,2260],[8.6,5.3,2.8],.56)
  ])})
});
function lowpassAlpha(hz,sampleRate){return 1-Math.exp(-2*Math.PI*hz/sampleRate)}
function fadeOut(t,end,width){const x=Math.min(1,Math.max(0,(end-t)/width));return x*x*(3-2*x)}
function materialContact(event,t,highNoise){
 const u=t-event.timeMs/1000;if(u<=0||u>.055)return 0;
 // Short finite contact force excites several nonharmonic, heavily damped steel modes.
 // Force rise is distinct from mode damping; no oscillator frequency sweep.
 const rise=1-Math.exp(-u/(event.forceMs/1000));let modes=0;
 for(let k=0;k<event.modes.length;k++)modes+=[.56,.29,.15][k]*Math.sin(2*Math.PI*event.modes[k]*u)*Math.exp(-u/(event.decayMs[k]/1000));
 const asperities=highNoise*.45*Math.exp(-u/.00115);
 return event.gain*rise*(modes+asperities)*fadeOut(u,.055,.008);
}
export function synthesizeMaterialShot(variant,sampleRate=48000,seed=1,{component='full'}={}){
 const v=MATERIAL_SHOTS[variant];if(!v)throw new TypeError('unsupported firearm SFX');
 if(!Number.isFinite(sampleRate)||sampleRate<16000||sampleRate>192000)throw new TypeError('supported sample rate 16000..192000 required');
 if(!['full','report','mechanism'].includes(component))throw new TypeError('unsupported component');
 const data=new Float32Array(Math.ceil(v.seconds*sampleRate));let rng=(seed>>>0)||1,low=0,air=0,metal=0;
 const aLow=lowpassAlpha(380,sampleRate),aAir=lowpassAlpha(4800,sampleRate),aMetal=lowpassAlpha(1700,sampleRate);
 for(let i=0;i<data.length;i++){
  const t=i/sampleRate;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;const noise=(rng>>>0)/2147483648-1;
  low+=aLow*(noise-low);air+=aAir*(noise-air);metal+=aMetal*(noise-metal);
  // Pressure front, turbulent gas and short low-frequency pressure-body response.
  const front=(noise-air)*.61*Math.exp(-t/(v.reportMs/1000));
  const turbulence=air*.34*Math.exp(-t/(v.reportMs*.0016));
  const body=(low*1.35+.34*(1-t/.006)*Math.exp(-t/.006))*Math.exp(-t/(v.bodyMs/1000));
  const report=(front+turbulence+body)*(1-Math.exp(-t/.00032));
  let mechanism=0;for(const c of v.contacts)mechanism+=materialContact(c,t,noise-metal);
  // Brief guided steel-on-steel rubbing during rearward receiver travel.
  const f0=v.frictionStartMs/1000,f1=v.frictionEndMs/1000;
  if(t>f0&&t<f1)mechanism+=(air-metal)*v.frictionGain*Math.sin(Math.PI*(t-f0)/(f1-f0))**2;
  const signal=component==='report'?report:component==='mechanism'?mechanism:report+mechanism;
  // Linear headroom; no waveshaping/clipping that could conceal contact overload.
  data[i]=signal*v.gain*.70*fadeOut(t,v.seconds,.025);
 }
 return data;
}
