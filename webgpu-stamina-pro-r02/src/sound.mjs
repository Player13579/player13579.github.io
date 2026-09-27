/** Procedural event sonification. No prerecorded or externally sourced sounds. */
import {C,arrivalAmount,arrivalFlux,ramp,clamp} from './sampler.mjs';
const TAU=2*Math.PI;
function chirp(t,start,end,decay){return TAU*(end*t+(start-end)*decay*(1-Math.exp(-t/decay)));}
export function soundComponents(ageSeconds,durationSeconds=1.5,seed=0){
 if(!(durationSeconds>0)||!Number.isFinite(ageSeconds)||ageSeconds<=0||ageSeconds>=durationSeconds)return {onset:0,transfer:0,reserve:0,charge:ageSeconds>=durationSeconds?1:0,window:0};
 const p=ageSeconds/durationSeconds,t=ageSeconds,q=(arrivalAmount(p,0)+arrivalAmount(p,1))/2;
 const flux=(arrivalFlux(p,0)+arrivalFlux(p,1))/2;
 const attack=ramp(p,0,C.audio.attackSeconds/1.5),release=1-ramp(p,.83,1),window=attack*release;
 const phase=(seed%1024)/1024*TAU;
 // Low-band deterministic breath: band-limited tones, not white noise or a rising speed whistle.
 const breath=.48*Math.sin(TAU*1349*t+phase)+.30*Math.sin(TAU*1927*t+phase*.47)+.22*Math.sin(TAU*2371*t+phase*.79);
 const onset=breath*.085*Math.exp(-p*45)+.075*Math.sin(chirp(t,680,390,.074))*Math.exp(-p*25);
 const transportEnv=ramp(p,.025,.09)*(1-ramp(p,.50,.72));
 const transport=.095*transportEnv*(.70*Math.sin(chirp(t,430,265,.16))+.22*Math.sin(chirp(t,859,534,.16)+.21)+.08*breath);
 const reserveEnv=clamp(flux/5)*.12+q*.08*(1-ramp(p,.69,.92));
 const reserve=reserveEnv*(Math.sin(chirp(t,168,152,.12))+.24*Math.sin(chirp(t,336,304,.12)+.07));
 return {onset:onset*window,transfer:transport*window,reserve:reserve*window,charge:q,window};
}
export function synthStereo(ageSeconds,durationSeconds=1.5,seed=0){
 const c=soundComponents(ageSeconds,durationSeconds,seed);
 // Peripheral transfer is slightly wide; settled reserve is centred and mono-compatible.
 const width=.13*(1-c.charge),sign=(seed&1)?1:-1;
 const side=c.transfer*width*sign,mono=c.onset+c.transfer+c.reserve;
 return [mono+side,mono-side];
}
export function masterSample(x){return Math.tanh(x*C.audio.busGain);}

/** Shared realtime/offline voice state. Tests can advance this without claiming an audition. */
export class VoiceBank {
 constructor({sampleRate=48000,maxVoices=C.audio.maxVoices}={}){
  if(!Number.isFinite(sampleRate)||sampleRate<8000)throw new TypeError('invalid_sample_rate');
  this.sampleRate=sampleRate;this.maxRate=Math.min(4,sampleRate*.45/2371);this.maxVoices=maxVoices;this.voices=new Map();this.seen=new Set();
  this.seenLimit=32768;this.stats={voiceStarts:0,voiceEnds:0,duplicateCommands:0,activeVoices:0,rejected:0,watchdogStops:0};
 }
 sync(items,audioTime){
  if(!Number.isFinite(audioTime))return;
  const live=new Set();
  for(const item of items){
   if(typeof item.key!=='string'||!Number.isFinite(item.ageMs)||!Number.isFinite(item.durationMs)||item.durationMs<900||!Number.isFinite(item.rate)||item.rate<0||item.rate>this.maxRate){this.stats.rejected++;continue;}
   if(item.ageMs<0||item.ageMs>=item.durationMs)continue;
   live.add(item.key);let v=this.voices.get(item.key);
   if(!v){
    if(this.seen.has(item.key)){this.stats.duplicateCommands++;continue;}
    if(this.voices.size>=this.maxVoices||this.seen.size>=this.seenLimit){this.stats.rejected++;continue;}
    v={key:item.key,age:item.ageMs/1000,duration:item.durationMs/1000,seed:item.seed??0,rate:item.rate,
       targetAge:item.ageMs/1000,anchorTime:audioTime,lastSync:audioTime,volume:0,cancelled:false};
    this.voices.set(item.key,v);this.seen.add(item.key);this.stats.voiceStarts++;
   }else{
    if(v.cancelled)continue; // Terminal cancellation is not undone by stale snapshots.
    if(item.ageMs/1000<v.targetAge-.001){v.cancelled=true;continue;}
    v.targetAge=item.ageMs/1000;v.anchorTime=audioTime;v.lastSync=audioTime;v.rate=item.rate;
   }
  }
  for(const [k,v] of this.voices)if(!live.has(k))v.cancelled=true;
 }
 cancel(){for(const v of this.voices.values())v.cancelled=true;}
 resetEpoch(){this.cancel();this.voices.clear();this.seen.clear();this.stats.activeVoices=0;}
 process(left,right,blockTime){
  const dt=1/this.sampleRate,fadeStep=dt/C.audio.cancelReleaseSeconds;
  for(let n=0;n<left.length;n++){
   const now=blockTime+n*dt;let L=0,R=0;
   for(const [key,v] of this.voices){
    if(now-v.lastSync>C.audio.watchdogSeconds&&!v.cancelled){v.cancelled=true;this.stats.watchdogStops++;}
    if(v.age>=v.duration)v.cancelled=true;
    const targetVolume=!v.cancelled&&v.rate>0?1:0;
    v.volume=clamp(v.volume+Math.sign(targetVolume-v.volume)*fadeStep,0,1);
    const extrapolated=v.targetAge+Math.max(0,now-v.anchorTime)*v.rate;
    // Small corrections only; oscillator phase is never recreated on a render frame.
    const correction=clamp((extrapolated-v.age)*dt/.020,-dt*.30,dt*.30);
    if(v.rate>0&&!v.cancelled)v.age+=correction;
    const s=synthStereo(v.age,v.duration,v.seed);L+=s[0]*v.volume;R+=s[1]*v.volume;
    if(!v.cancelled)v.age+=dt*v.rate;
    else v.age+=dt*Math.max(v.rate,1); // Preserve the carrier during the short cancellation tail.
    if(v.cancelled&&v.volume<=0){this.voices.delete(key);this.stats.voiceEnds++;}
   }
   left[n]=masterSample(L);right[n]=masterSample(R);
  }
  this.stats.activeVoices=this.voices.size;
 }
}
