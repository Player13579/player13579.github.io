/** Numeric-only implementation. No image source and no Canvas 2D. Patch API changed in r0.4. */
import {VERSION,SHAPE,DURATION_MS} from './barrier-pro-model.mjs';
import {envelope,geometry,material} from './barrier-pro-kernel.mjs';
export {VERSION,SHAPE};export const DURATIONS_MS=DURATION_MS;
export const BRANCHES=Object.freeze(Object.keys(DURATION_MS));
export const BAND_NAMES=Object.freeze(['continuous_membrane']);
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const mix=(a,b,t)=>a+(b-a)*t;
const TAU=2*Math.PI;
function finite(x,label){if(!Number.isFinite(x))throw new TypeError(`${label} must be finite`);return x;}
export function kindOf(branch){if(branch==='idle')return -1;const k=BRANCHES.indexOf(branch);if(k<0)throw new RangeError(`Unknown branch ${branch}`);return k;}
function request(branch,ageMs,opts){
 const k=kindOf(branch);finite(ageMs,'ageMs');if(typeof opts.authoritativeActive!=='boolean')throw new TypeError('Explicit authoritativeActive boolean required');
 const a=opts.authoritativeActive?1:0;
 if(k>=0&&ageMs>=0&&ageMs<DURATIONS_MS[branch]&&((k<2)!==!!a))throw new Error('Branch contradicts authority snapshot');
 return {k,a};
}
export function sampleEnvelope(branch,ageMs,options={}){
 const {k,a}=request(branch,ageMs,options),e=envelope(k,ageMs,a);
 const phases={create:'membrane zips obliquely from rear toward front; increasing volume',absorb:'continuous membrane concaves inward with local load light; no recoil',fracture:'branched membrane cohesion loss; inward curl',bust:'smooth longitudinal unzip and curvature relaxation; no hinge or top clipping'};
 return {...e,requestedBranch:branch,branch:e.kind<0?'idle':BRANCHES[e.kind],ageMs,durationMs:DURATIONS_MS[branch]??0,
 eventActive:e.eventOn>.5,visible:e.visible>.5,authoritativeActive:!!a,supportsGameplay:!!a,
 residueOnly:e.eventOn>.5&&e.kind>=2,phase:e.eventOn>.5?phases[BRANCHES[e.kind]]:(a?'idle':'absent')};
}
export function sampleSurface(branch,ageMs,{u=.5,v=.5,sector=1,band=0,hPx=64,authoritativeActive,
 coreEnabled=true,yawDeg=SHAPE.defaultYawDeg,pitchDeg=SHAPE.defaultPitchDeg}={}){
 const {k,a}=request(branch,ageMs,{authoritativeActive});
 for(const [n,x]of Object.entries({u,v,hPx,yawDeg,pitchDeg}))finite(x,n);
 if(u<0||u>1||v<0||v>1||!Number.isInteger(sector)||sector<0||sector>7||!Number.isInteger(band)||band<0||band>=SHAPE.bands||hPx<=0)throw new RangeError('Patch coordinates invalid');
 if(typeof coreEnabled!=='boolean')throw new TypeError('coreEnabled boolean required');
 const p=geometry(u,v,sector,band,k,ageMs,a),f=material(u,v,sector,band,k,ageMs,a,hPx,coreEnabled?1:0,yawDeg*Math.PI/180,pitchDeg*Math.PI/180);
 return {position:[p.x,p.y,p.z],premultipliedLinearRGBA:[f.r,f.g,f.b,f.a],normal:[f.normalX,f.normalY,f.normalZ],
 mask:{coverage:f.coverage,core:f.core,pane:f.pane,emissionY:f.emissionY},stress:f.stress,bandName:BAND_NAMES[band]};
}
export function packUniforms({branch='create',ageMs=300,authoritativeActive,hPx=64,width=384,height=288,
 centerPx=[width/2,height/2],yawDeg=SHAPE.defaultYawDeg,pitchDeg=SHAPE.defaultPitchDeg,coreEnabled=true,diagnostic=0,bandMask=1,hemisphere=0}={}){
 const {k,a}=request(branch,ageMs,{authoritativeActive});
 for(const [n,x]of Object.entries({hPx,width,height,yawDeg,pitchDeg}))finite(x,n);
 if(hPx<=0||width<=0||height<=0||!Array.isArray(centerPx)||centerPx.length!==2||!centerPx.every(Number.isFinite))throw new RangeError('Invalid viewport');
 if(Math.abs(yawDeg)>30||Math.abs(pitchDeg)>20)throw new RangeError('Reference camera yaw +/-30, pitch +/-20');
 if(![0,1,2].includes(hemisphere))throw new RangeError('hemisphere 0=all,1=facing,2=away');
 if(typeof coreEnabled!=='boolean'||!Number.isInteger(diagnostic)||diagnostic<0||diagnostic>4||!Number.isInteger(bandMask)||bandMask<0||bandMask>1)throw new RangeError('Invalid diagnostic/band mask');
 return new Float32Array([width,height,hPx,ageMs,k,a,0,0,...centerPx,yawDeg*Math.PI/180,pitchDeg*Math.PI/180,coreEnabled?1:0,diagnostic,bandMask,hemisphere]);
}
export function projectPoint([x,y,z],{hPx=64,centerPx=[192,144],yawDeg=SHAPE.defaultYawDeg,pitchDeg=SHAPE.defaultPitchDeg}={}){
 const ya=yawDeg*Math.PI/180,pa=pitchDeg*Math.PI/180;
 const xr=Math.cos(ya)*x+Math.sin(ya)*z,zr=-Math.sin(ya)*x+Math.cos(ya)*z;
 const yr=Math.cos(pa)*y-Math.sin(pa)*zr,zz=Math.sin(pa)*y+Math.cos(pa)*zr;
 return {pixel:[centerPx[0]+hPx*xr,centerPx[1]-hPx*yr],viewZ:zz,depth:.5-.15*zz};
}
/** Static eight-sector smooth membrane mesh, parametric vertex attributes only; never baked vertex color. */
export function makePatchMesh(nu=SHAPE.nu,nv=SHAPE.nv){
 if(!Number.isInteger(nu)||!Number.isInteger(nv)||nu<2||nv<2||nu>64||nv>128)throw new RangeError('segments nu2..64/nv2..128');
 const vertices=new Float32Array(SHAPE.sectors*SHAPE.bands*(nu+1)*(nv+1)*4),indices=new Uint32Array(SHAPE.sectors*SHAPE.bands*nu*nv*6);let vi=0,ii=0,offset=0;
 for(let band=0;band<SHAPE.bands;band++)for(let sector=0;sector<8;sector++){
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){vertices.set([i/nu,j/nv,sector,band],vi);vi+=4;}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){let a=offset+j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;indices.set([a,b,c,b,d,c],ii);ii+=6;}
  offset+=(nu+1)*(nv+1);
 }
 return {vertices,indices,vertexStrideBytes:16,nu,nv,patches:SHAPE.sectors*SHAPE.bands,triangleCount:indices.length/3};
}
export function linearToSrgb(x){x=Math.max(0,x);return x<=.0031308?12.92*x:1.055*Math.pow(x,1/2.4)-.055;}
export function srgbToLinear(x){x=clamp(x);return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);}
export function over(s,d){return [s[0]+d[0]*(1-s[3]),s[1]+d[1]*(1-s[3]),s[2]+d[2]*(1-s[3]),s[3]+d[3]*(1-s[3])];}
export function displayLinear(rgb){const peak=Math.max(1,...rgb);return rgb.map(x=>Math.max(0,x)/peak);}
export function composeDisplay(effect,bg){return [...displayLinear(over(effect,[...bg,1]).slice(0,3)).map(linearToSrgb),1];}
export class BarrierPresentation {
  constructor(){this.targets=new Map();this.lastSequences=new Map();this.seen=new Set();this.seenOrder=[];this.lastClock=-Infinity;}
  advanceClock(nowMs){finite(nowMs,'displayNowMs');if(nowMs<this.lastClock)throw new RangeError('Display clock must not run backward');this.lastClock=nowMs;return nowMs;}
  /**
   * packet={eventId,targetId,casterId?,instanceId,sequence,branch,
   *         after:{active,durability}}  // localized impact fields are not supported
   * startMs is assigned at ACCEPTANCE on this monotonic presentation clock.
   * Network/game-tick timestamps must not be substituted without a clock mapping.
   */
  accept(packet,displayNowMs){
    this.advanceClock(displayNowMs);
    const p=packet;
    for(const k of ['eventId','targetId','instanceId']) if(typeof p[k]!=='string'||!p[k])throw new TypeError(`${k} must be a nonempty string`);
    if(!Number.isSafeInteger(p.sequence)||p.sequence<0)throw new TypeError('sequence must be nonnegative safe integer');
    if(!BRANCHES.includes(p.branch))throw new RangeError('Invalid event branch');
    if(typeof p.after?.active!=='boolean'||!Number.isFinite(p.after?.durability)||p.after.durability<0)throw new TypeError('Authoritative after snapshot required');
    const terminal=['fracture','bust'].includes(p.branch);
    if(terminal?(p.after.active||p.after.durability!==0):(!p.after.active||p.after.durability<=0))throw new Error('Branch contradicts authoritative after snapshot');
    if(p.impactUV!=null||p.impactV!=null) throw new Error("r0.4 uses distributed load; localized impact UV is not supported");
    if(this.seen.has(p.eventId))return {accepted:false,reason:'duplicate'};
    const old=this.targets.get(p.targetId);
    if(p.sequence<=Math.max(old?.sequence??-1,this.lastSequences.get(p.targetId)??-1))return {accepted:false,reason:'stale_sequence'};
    if(old&&p.instanceId!==old.instanceId&&p.branch!=='create')return {accepted:false,reason:'different_instance_requires_create_or_resync'};
    if(old&&p.instanceId===old.instanceId&&old.terminal&&p.branch!=='fracture'&&p.branch!=='bust')return {accepted:false,reason:'terminal_instance_cannot_resurrect'};
    if(old&&p.instanceId===old.instanceId&&old.terminal)return {accepted:false,reason:'terminal_already_presented'};
    if(old&&p.instanceId===old.instanceId&&p.branch==='create')return {accepted:false,reason:'duplicate_create_instance'};
    this.seen.add(p.eventId);this.seenOrder.push(p.eventId);
    if(this.seenOrder.length>8192)this.seen.delete(this.seenOrder.shift());
    const state={targetId:p.targetId,casterId:p.casterId??null,instanceId:p.instanceId,sequence:p.sequence,
      authority:{...p.after},terminal,event:{id:p.eventId,branch:p.branch,startMs:displayNowMs,impactV:p.impactV??null,impactUV:p.impactUV?[...p.impactUV]:null}};
    this.targets.set(p.targetId,state);this.lastSequences.set(p.targetId,p.sequence);
    return {accepted:true,cancelAudioEventId:old?.event?.id??null,state:structuredClone(state)};
  }
  sample(targetId,nowMs){
    this.advanceClock(nowMs);const s=this.targets.get(targetId);if(!s)return null;
    const e=s.event;
    return {targetId,instanceId:s.instanceId,authority:{...s.authority},
      envelope:sampleEnvelope(e?.branch??'idle',e?nowMs-e.startMs:0,{authoritativeActive:s.authority.active,impactV:e?.impactV??null,impactUV:e?.impactUV??null})};
  }
  /** Cancels a cosmetic event only. It cannot delete or restore durability. */
  cancelCosmetic(targetId,eventId,nowMs){
    this.advanceClock(nowMs);const s=this.targets.get(targetId);
    if(!s||s.event?.id!==eventId)return false;s.event=null;return true;
  }
  /** Explicit authority correction; no SFX/create replay. */
  resync({targetId,instanceId,sequence,active,durability},nowMs){
    this.advanceClock(nowMs);
    if(typeof targetId!=='string'||!targetId||typeof instanceId!=='string'||!instanceId||!Number.isSafeInteger(sequence)||sequence<0||typeof active!=='boolean'||!Number.isFinite(durability)||durability<0||active!==(durability>0))throw new TypeError('Invalid authoritative resync');
    const old=this.targets.get(targetId);if(sequence<=Math.max(old?.sequence??-1,this.lastSequences.get(targetId)??-1))return false;
    this.targets.set(targetId,{targetId,casterId:null,instanceId,sequence,authority:{active,durability},terminal:!active,event:null});this.lastSequences.set(targetId,sequence);return true;
  }
  /** Removing a view/target is not a gameplay durability event. */
  detach(targetId,nowMs){this.advanceClock(nowMs);return this.targets.delete(targetId);}
}

export const SFX_PROFILES=Object.freeze({
 create:{cause:'zip front propagates along a curved membrane; no solid hinge',gain:[[0,0],[.009,.43],[.090,.48],[.31,.64],[.52,.38],[.62,.13],[.65,0]],f0:340,f1:590,rough:.07},
 absorb:{cause:'thin membrane load and inward concavity relax; no recoil',gain:[[0,0],[.004,1],[.048,.64],[.19,.38],[.42,.19],[.60,.07],[.65,0]],f0:142,f1:119,rough:.13},
 fracture:{cause:'branched membrane cohesion loss and inward curling without debris',gain:[[0,0],[.004,.92],[.057,.25],[.145,.51],[.205,.24],[.326,.26],[.435,.07],[.48,0]],f0:820,f1:285,rough:.54},
 bust:{cause:'smooth longitudinal release and curvature relaxation; no collision',gain:[[0,0],[.022,.30],[.11,.51],[.27,.36],[.41,.16],[.48,0]],f0:630,f1:195,rough:.035},
});
export function piecewiseLinear(knots,x){if(x<=knots[0][0])return knots[0][1];for(let i=1;i<knots.length;i++)if(x<=knots[i][0])return mix(knots[i-1][1],knots[i][1],(x-knots[i-1][0])/(knots[i][0]-knots[i-1][0]));return knots.at(-1)[1];}
export function sampleSFXEnvelope(branch,timeSec){
 const p=SFX_PROFILES[branch];if(!p)throw new RangeError('SFX branch invalid');finite(timeSec,'timeSec');const T=DURATIONS_MS[branch]/1000;
 return {gain:timeSec<0||timeSec>=T?0:piecewiseLinear(p.gain,timeSec),frequencyHz:mix(p.f0,p.f1,clamp(timeSec/T)),roughness:p.rough,cause:p.cause,durationSec:T,playbackRate:1};
}
export function renderSFX(branch,{sampleRate=48000,seed=1}={}){
 const p=SFX_PROFILES[branch];if(!p)throw new RangeError('SFX branch invalid');
 if(!Number.isInteger(sampleRate)||sampleRate<22050||sampleRate>192000)throw new RangeError('sampleRate integer 22050..192000 required');
 if(!Number.isInteger(seed))throw new TypeError('integer seed required');
 const T=DURATIONS_MS[branch]/1000,samples=new Float32Array(Math.round(T*sampleRate));let rng=(seed>>>0)||1,lo=0,hi=0;
 const aLo=1-Math.exp(-TAU*selectAudio(branch,500,900)/sampleRate),aHi=1-Math.exp(-TAU*3200/sampleRate);
 for(let i=0;i<samples.length;i++){
  const t=i/sampleRate,env=sampleSFXEnvelope(branch,t);rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;const noise=(rng>>>0)/2147483648-1;
  lo+=aLo*(noise-lo);hi+=aHi*((noise-lo)-hi);
  const phase=TAU*(p.f0*t+.5*(p.f1-p.f0)/T*t*t);
  let tone=.62*Math.sin(phase)+.25*Math.sin(2.03*phase)+.13*Math.sin(3.16*phase);
  if(branch==='absorb')tone=.72*Math.sin(phase)+.20*Math.sin(1.43*phase)+.08*Math.sin(2.7*phase);
  if(branch==='fracture')tone=.45*Math.sin(phase)+.35*Math.sin(2.37*phase)+.20*Math.sin(3.71*phase);
  if(branch==='bust')tone=.82*Math.sin(phase)+.18*Math.sin(.51*phase);
  samples[i]=.125*env.gain*((1-p.rough)*tone+p.rough*clamp(hi,-1,1));
 }
 samples[0]=0;samples[samples.length-1]=0;
 return {samples,sampleRate,durationSec:T,peakLimit:.125,cause:p.cause,version:VERSION};
}
function selectAudio(branch,a,b){return branch==='fracture'?b:a;}
/** User gesture required. Render-time tempo stays 1. Uses target pan, never caster. */
export function playSFX(ctx,branch,{destination=ctx.destination,pan=0,volume=.5,seed=1}={}){
 if(!Number.isFinite(volume)||volume<0||volume>.5)throw new RangeError('volume [0,.5] required');finite(pan,'pan');
 const pcm=renderSFX(branch,{sampleRate:ctx.sampleRate,seed});const buffer=ctx.createBuffer(1,pcm.samples.length,ctx.sampleRate);buffer.copyToChannel(pcm.samples,0);
 const source=ctx.createBufferSource(),gain=ctx.createGain(),panner=ctx.createStereoPanner();source.buffer=buffer;source.playbackRate.value=1;gain.gain.value=volume;panner.pan.value=clamp(pan,-1,1);
 source.connect(gain).connect(panner).connect(destination);source.start();let ended=false,cancelled=false;
 source.onended=()=>{ended=true;source.disconnect();gain.disconnect();panner.disconnect();};
 return {source,pcm,cancel(){if(ended||cancelled)return;cancelled=true;const t=ctx.currentTime;
  if(typeof gain.gain.cancelAndHoldAtTime==='function')gain.gain.cancelAndHoldAtTime(t);
  else {gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(volume,t);}
  gain.gain.linearRampToValueAtTime(0,t+.008);source.stop(t+.008);}};
}

/** Optional bounded SFX bus: one current voice per target, at most 8 voices total.
 * No audio from stale/duplicate packets: caller must use BarrierPresentation.accept first.
 */
export class BarrierAudioBus {
 constructor(ctx,{maxVoices=8,volume=.35}={}){if(!Number.isInteger(maxVoices)||maxVoices<1||maxVoices>8)throw new RangeError('maxVoices1..8');if(!Number.isFinite(volume)||volume<0||volume>.5)throw new RangeError('volume0...5');this.ctx=ctx;this.maxVoices=maxVoices;this.volume=volume;this.voices=new Map();this.live=new Set();}
 playAccepted(result,{pan=0,seed=1}={}){if(!result?.accepted)return null;const {targetId,event}=result.state;this.cancel(targetId);if(this.live.size>=this.maxVoices)return {skipped:'voice_budget_including_8ms_releases'};const voice=playSFX(this.ctx,event.branch,{volume:this.volume,pan,seed});this.voices.set(targetId,voice);this.live.add(voice);const old=voice.source.onended;voice.source.onended=()=>{old?.();this.live.delete(voice);if(this.voices.get(targetId)===voice)this.voices.delete(targetId);};return voice;}
 cancel(targetId){const v=this.voices.get(targetId);if(v){v.cancel();this.voices.delete(targetId);}}
 stop(){for(const v of this.live)v.cancel();this.voices.clear();}
}
