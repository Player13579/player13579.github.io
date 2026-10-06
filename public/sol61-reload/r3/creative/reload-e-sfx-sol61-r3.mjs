import {contactAt,contactEvents,MODES,GEOMETRY} from './reload-contact-model.mjs';
export const SFX_VERSION='reload-e-sfx-sol61-r3';
export function renderReloadPcm({phase,sampleRate=48000,seed=0x6233,reducedMotion=false,sourceOn=true,frictionScale=1,impactScale=1}={}){
 if(!['start','complete'].includes(phase))throw new TypeError('start/complete required');
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate [8000,192000]');
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||![frictionScale,impactScale].every(x=>Number.isFinite(x)&&x>=0&&x<=2))throw new RangeError('seed/excitation bounds');
 const duration=(phase==='start'?GEOMETRY.startEndMs:GEOMETRY.completeEndMs)/1000,pcm=new Float32Array(Math.ceil(duration*sampleRate));
 if(!sourceOn)return Object.freeze({version:SFX_VERSION,phase,sampleRate,duration,pcm,events:contactEvents({phase,reducedMotion})});
 let state=(seed>>>0)||0x9e3779b9;const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
 // Force integration carries dt: preserve modal radiation across sample rates.
 const modes=MODES.filter(m=>m.hz<sampleRate*.42).map(m=>{const w=2*Math.PI*m.hz/sampleRate,r=Math.exp(-1000/(m.tauMs*sampleRate));return {a:2*r*Math.cos(w),b:-r*r,c:m.gain*Math.sin(w)*(48000/sampleRate),y1:0,y2:0};});
 const events=contactEvents({phase,reducedMotion}),touch=events[0].atMs;
 let grain=0,grainAmp=0,grainLeft=0,previousCell=-1,low=0,forcePrevious=0,dc=0;
 const grainLength=Math.max(2,Math.round(sampleRate*.0011)),lp=1-Math.exp(-2*Math.PI*2800/sampleRate),hp=1-Math.exp(-2*Math.PI*80/sampleRate);
 for(let i=1;i<pcm.length-1;i++){
  const age=i/sampleRate*1000,m=contactAt({phase,ageMs:age,reducedMotion});let impact=0;
  for(const event of events){const t=(age-event.atMs)/event.durationMs;if(t>=0&&t<1)impact+=event.strength*Math.sin(Math.PI*t)**2;}
  // Asperity excitation follows traveled distance, normal loading and slip speed; no contact => no force.
  const sliding=m.contact&&m.velocityHPerMs>0;const travel=m.centerYH+.17;
  const cell=Math.floor(travel/.0012);
  if(sliding&&cell!==previousCell){previousCell=cell;grainLeft=grainLength;grainAmp=(random()-.5)*(.10+.14*m.seatFraction);}
  if(grainLeft>0){grain=grainAmp*Math.sin(Math.PI*(1-grainLeft/grainLength))**2;grainLeft--;}else grain=0;
  const speed=Math.min(1,m.velocityHPerMs/.00175),normal=.30+.70*m.seatFraction;
  const latchSlip=phase==='complete'&&age>=260&&age<380?m.latchVelocityPerMs*35:0;
  const friction=sliding?(grain+(random()-.5)*.045)*Math.sqrt(speed)*normal:0;
  const latchNoise=(random()-.5)*.018*latchSlip;
  const force=impact*impactScale+(friction+latchNoise)*frictionScale;
  low+=lp*(force-low);const acceleration=(force-forcePrevious);forcePrevious=force;
  let vibration=0;for(const mode of modes){const y=mode.a*mode.y1+mode.b*mode.y2+mode.c*low;mode.y2=mode.y1;mode.y1=y;vibration+=y;}
  // Fixed radiation coupling, shared by every variant; no per-clip peak normalization or clipping.
  const raw=vibration*.05+acceleration*.07;
  dc+=hp*(raw-dc);let value=raw-dc;
  const tail=Math.min(1,(duration*1000-age)/8);value*=Math.max(0,tail);
  // Causal modal state is zero before first actual start guide contact; no arbitrary lead beep/sweep.
  pcm[i]=phase==='start'&&age<touch?0:value;
 }
 return Object.freeze({version:SFX_VERSION,phase,sampleRate,duration,pcm,events});
}
export function createReloadSfx({context,verify=false,masterGain=.32,maxVoices=8}={}){
 if(!context||typeof context.createBuffer!=='function')throw new TypeError('owned AudioContext required');
 if(!Number.isFinite(masterGain)||masterGain<0||masterGain>1||!Number.isInteger(maxVoices)||maxVoices<1||maxVoices>32)throw new RangeError('audio gain/voice bounds');
 const voices=new Map(),emitted=new Set(),cache=new Map();let disposed=false,muted=false;
 const output=context.createGain();output.gain.value=verify?0:masterGain;output.connect(context.destination);
 function stop(id){const voice=voices.get(id);if(!voice)return;voices.delete(id);const finish=()=>{voice.source.disconnect();voice.gain.disconnect();voice.pan?.disconnect();};voice.source.onended=finish;const now=context.currentTime;voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setValueAtTime(voice.gain.gain.value,now);voice.gain.gain.linearRampToValueAtTime(0,now+.008);try{voice.source.stop(now+.010);}catch{finish();}}
 return Object.freeze({
  play({causeId,phase,visible=true,distance=0,pan=0,ageMs=0,sourceOn=true,mainOn=true,reducedMotion=false}={}){
   if(!sourceOn||!mainOn||!visible)stop(causeId);
   if(disposed||verify||muted||!sourceOn||!mainOn||!visible||context.state!=='running')return {played:false,reason:disposed?'disposed':verify?'verify-zero':muted?'muted':!sourceOn||!mainOn?'source-off':!visible?'not-visible':'gesture-required'};
   if(typeof causeId!=='string'||!causeId||!Number.isFinite(distance)||distance<0||!Number.isFinite(pan)||Math.abs(pan)>1||!Number.isFinite(ageMs)||ageMs<0)throw new TypeError('same-cause audio source invalid');
   if(!['start','complete'].includes(phase))throw new TypeError('phase invalid');
   const lifetimeMs=phase==='start'?480:620;if(ageMs>=lifetimeMs){stop(causeId);return {played:false,reason:'expired'};}
   if(emitted.has(causeId))return {played:false,reason:'duplicate'};if(voices.size>=maxVoices)return {played:false,reason:'capacity'};
   const key=phase+':'+Boolean(reducedMotion);let sample=cache.get(key);if(!sample){sample=renderReloadPcm({phase,sampleRate:context.sampleRate,reducedMotion});cache.set(key,sample);}
   if(ageMs>=sample.duration*1000)return {played:false,reason:'expired'};
   const buffer=context.createBuffer(1,sample.pcm.length,sample.sampleRate);buffer.getChannelData(0).set(sample.pcm);const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=1/Math.sqrt(1+distance*distance);source.connect(gain);const panner=context.createStereoPanner?.();if(panner){panner.pan.value=pan;gain.connect(panner);panner.connect(output);}else gain.connect(output);
   voices.set(causeId,{source,gain,pan:panner});
   source.onended=()=>{if(voices.get(causeId)?.source!==source)return;voices.delete(causeId);source.disconnect();gain.disconnect();panner?.disconnect();};
   try{source.start(context.currentTime,ageMs/1000);}catch(error){voices.delete(causeId);source.disconnect();gain.disconnect();panner?.disconnect();throw error;}
   emitted.add(causeId);if(emitted.size>256)emitted.delete(emitted.values().next().value);
   return {played:true,causeId,phase,offsetSeconds:ageMs/1000};
  },cancel:stop,setMuted(value){muted=Boolean(value);output.gain.setValueAtTime(verify||muted?0:masterGain,context.currentTime);if(muted)for(const id of [...voices.keys()])stop(id);},stopAll(){for(const id of [...voices.keys()])stop(id);},dispose(){if(disposed)return;disposed=true;for(const id of [...voices.keys()])stop(id);output.disconnect();emitted.clear();cache.clear();},snapshot(){return {version:SFX_VERSION,verify,muted,disposed,voices:voices.size,emittedCount:emitted.size};}
 });
}
