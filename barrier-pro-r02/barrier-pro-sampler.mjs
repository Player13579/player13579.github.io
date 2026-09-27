/**
 * Barrier Pro r0.2 — continuous broad coverage, no central seam hole.
 * Pure numeric sampler + authority adapter + original synthesized SFX.
 * No images, Canvas 2D, texture assets, damage calculation, playback-rate changes.
 */
import {VERSION,SHAPE,DURATION_MS} from './barrier-pro-model.mjs';
import {envelope,geometry,material} from './barrier-pro-kernel.mjs';
export {VERSION,SHAPE};
export const DURATIONS_MS=DURATION_MS;
export const BRANCHES=Object.freeze(Object.keys(DURATIONS_MS));
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const mix=(a,b,t)=>a+(b-a)*t;
export const spatialSmooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const TAU=Math.PI*2;
function finite(x,label){if(!Number.isFinite(x))throw new TypeError(`${label} must be finite`);return x;}
function kindOf(branch){if(branch==='idle')return -1;const k=BRANCHES.indexOf(branch);if(k<0)throw new RangeError(`Unknown branch: ${branch}`);return k;}
function authorityOK(v){if(typeof v!=='boolean')throw new TypeError('authoritativeActive must be boolean');return v?1:0;}
function resolveImpact({impactUV=null,impactV=null}={}){
 if(impactUV!==null){if(!Array.isArray(impactUV)||impactUV.length!==2||!impactUV.every(Number.isFinite)||Math.abs(impactUV[0])>1||impactUV[1]<0||impactUV[1]>1)throw new RangeError('impactUV must be [q in -1..1, v in 0..1] or null');return [...impactUV];}
 if(impactV!==null){if(!Number.isFinite(impactV)||impactV<0||impactV>1)throw new RangeError('impactV must be in [0,1]');return [0,impactV];}
 return [-2,-1]; // no fabricated incoming projectile or localized contact
}
function request(branch,ageMs,opts){
 const k=kindOf(branch);finite(ageMs,'ageMs');const a=authorityOK(opts.authoritativeActive);const impact=resolveImpact(opts);
 if(k>=0&&ageMs>=0&&ageMs<DURATIONS_MS[branch]&&((k<2)!==!!a))throw new Error('Active branch contradicts authoritative after snapshot');
 return {k,a,impact};
}
export function sampleEnvelope(branch,ageMs,options={}){
 const {k,a,impact}=request(branch,ageMs,options);const e=envelope(k,ageMs,a);
 const effective=e.kind>=0?BRANCHES[e.kind]:'idle';
 const phases={create:e.r<.25?'seed_membrane_inflation':e.r<.8?'broad_surface_joining':'upper_cap_latching',
  absorb:e.r<.2?'closed_surface_load_capture':e.r<.7?'broad_dent_relaxation':'retained_load_witness',
  fracture:e.r<.25?'transverse_cohesion_failure':e.r<.68?'branched_face_rupture':'inward_patch_collapse',
  bust:e.r<.2?'deactivation_from_upper_face':e.r<.8?'downward_surface_withdrawal':'lower_cap_revocation'};
 return {...e,requestedBranch:branch,branch:effective,ageMs,durationMs:DURATIONS_MS[branch]??0,normalizedTime:e.r,eventActive:e.eventOn>.5,
  visible:e.visible>.5,authoritativeActive:!!a,supportsGameplay:!!a,residueOnly:e.eventOn>.5&&e.kind>=2,
  phase:e.eventOn>.5?phases[effective]:(a?'idle':'absent'),impactUV:impact[1]>=0?impact:null,
  contactMode:impact[1]<0?'distributed_integrated_load_no_claimed_hit_point':'authority_provided_contact'};
}
/** q spans the WHOLE face, not one of two rib panels. Positions are in units of target world height h. */
export function sampleSurface(branch,ageMs,{
 q=0,v=.5,face='front',hPx=64,authoritativeActive,impactUV=null,impactV=null,coreEnabled=true,yawDeg=SHAPE.defaultYawDeg,pitchDeg=SHAPE.defaultPitchDeg,
}={}){
 if(face!=='front'&&face!=='back')throw new RangeError('face must be front or back');
 if(typeof coreEnabled!=='boolean')throw new TypeError('coreEnabled must be boolean');
 for(const [name,x] of Object.entries({q,v,hPx,yawDeg,pitchDeg}))finite(x,name);
 if(q< -1||q>1||v<0||v>1||hPx<=0)throw new RangeError('q[-1,1], v[0,1], positive hPx required');
 const opts={authoritativeActive,impactUV,impactV};const {k,a,impact:[iq,iv]}=request(branch,ageMs,opts);const f=face==='front'?1:0;
 const p=geometry(q,v,k,ageMs,a,iq,iv,f);const m=material(q,v,k,ageMs,a,iq,iv,f,hPx,coreEnabled?1:0,yawDeg*Math.PI/180,pitchDeg*Math.PI/180);
 return {position:[p.x,p.y,p.z],premultipliedLinearRGBA:[m.r,m.g,m.b,m.a],
   mask:{coverage:m.coverage,core:m.core,emissionY:m.emissionY,stress:m.stress,formed:m.formed},
   normal:[m.normalX,m.normalY,m.normalZ],envelope:sampleEnvelope(branch,ageMs,opts)};
}
/** Physical framebuffer pixels, not CSS pixels. Background is deliberately not an argument. */
export function packUniforms({branch,ageMs,authoritativeActive,impactUV=null,impactV=null,
 hPx=64,width=256,height=192,centerPx=[width/2,height/2],yawDeg=SHAPE.defaultYawDeg,pitchDeg=SHAPE.defaultPitchDeg,coreEnabled=true,diagnostic=0}={}){
 const {k,a,impact}=request(branch,ageMs,{authoritativeActive,impactUV,impactV});
 for(const [name,x] of Object.entries({hPx,width,height}))if(!Number.isFinite(x)||x<=0)throw new RangeError(`${name} must be positive`);
 if(!Array.isArray(centerPx)||centerPx.length!==2||!centerPx.every(Number.isFinite))throw new TypeError('centerPx needs two finite values');
 finite(yawDeg,'yawDeg');finite(pitchDeg,'pitchDeg');
 if(Math.abs(yawDeg)>25||Math.abs(pitchDeg)>10)throw new RangeError('Reference transparent sorting envelope: yaw +/-25 deg, pitch +/-10 deg');
 if(typeof coreEnabled!=='boolean'||![0,1,2,3].includes(diagnostic))throw new TypeError('Invalid core/diagnostic option');
 return new Float32Array([width,height,hPx,ageMs,k,a,...impact,...centerPx,yawDeg*Math.PI/180,pitchDeg*Math.PI/180,coreEnabled?1:0,diagnostic,0,0]);
}
export function projectPoint([x,y,z],{hPx=64,centerPx=[128,96],yawDeg=SHAPE.defaultYawDeg,pitchDeg=SHAPE.defaultPitchDeg}={}){
 const ya=yawDeg*Math.PI/180,pa=pitchDeg*Math.PI/180;
 const xr=Math.cos(ya)*x+Math.sin(ya)*z,zr=-Math.sin(ya)*x+Math.cos(ya)*z;
 const yr=Math.cos(pa)*y-Math.sin(pa)*zr,zz=Math.sin(pa)*y+Math.cos(pa)*zr;
 return {pixel:[centerPx[0]+hPx*xr,centerPx[1]-hPx*yr],viewZ:zz};
}
/** Shared index topology for WGSL parameter grid. No per-frame topology allocation. */
export function makeGridIndices(nu=SHAPE.nu,nv=SHAPE.nv){
 if(!Number.isInteger(nu)||!Number.isInteger(nv)||nu<4||nv<4||nu>256||nv>256)throw new RangeError('grid segments integer4..256');
 const out=new Uint32Array(nu*nv*6);let p=0;
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;out.set([a,b,c,b,d,c],p);p+=6;}
 return out;
}
/** Mesh output is numeric only. Material is sampled per fragment by the GPU, not interpolated baked colors. */
export function buildMesh(branch,ageMs,{face='front',uSegments=SHAPE.nu,vSegments=SHAPE.nv,...options}={}){
 for(const [k,x] of Object.entries({uSegments,vSegments}))if(!Number.isInteger(x)||x<4||x>256)throw new RangeError(`${k} integer 4..256 required`);
 const verts=new Float32Array((uSegments+1)*(vSegments+1)*5),indices=new Uint32Array(uSegments*vSegments*6);let k=0,n=0;
 for(let j=0;j<=vSegments;j++)for(let i=0;i<=uSegments;i++){
  const q=2*i/uSegments-1,v=j/vSegments,s=sampleSurface(branch,ageMs,{...options,face,q,v});
  verts.set([...s.position,q,v],k);k+=5;
 }
 for(let j=0;j<vSegments;j++)for(let i=0;i<uSegments;i++){
  const a=j*(uSegments+1)+i,b=a+1,c=a+uSegments+1,d=c+1;indices.set([a,b,c,b,d,c],n);n+=6;
 }
 return {vertices:verts,indices,face,vertexStrideBytes:20,format:'xyz+qv; material evaluated per-fragment',version:VERSION};
}
export function linearToSrgb(x){x=Math.max(0,x);return x<=.0031308?12.92*x:1.055*Math.pow(x,1/2.4)-.055;}
export function srgbToLinear(x){x=clamp(x);return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);}
export function over(s,d){return [s[0]+d[0]*(1-s[3]),s[1]+d[1]*(1-s[3]),s[2]+d[2]*(1-s[3]),s[3]+d[3]*(1-s[3])];}
/** Fixed hue-preserving unit-peak operator. Values <=1 are UNCHANGED; not auto-exposure. */
export function displayLinear(rgb){const peak=Math.max(1,...rgb);return rgb.map(x=>Math.max(0,x)/peak);}
export function composeDisplay(effect,bg){const c=over(effect,[...bg,1]);return [...displayLinear(c.slice(0,3)).map(linearToSrgb),1];}

// Authority: retained from our r0.1, contact UV support added. No visual borrowing.
export class BarrierPresentation {
  constructor(){this.targets=new Map();this.seen=new Set();this.seenOrder=[];this.lastClock=-Infinity;}
  advanceClock(nowMs){finite(nowMs,'displayNowMs');if(nowMs<this.lastClock)throw new RangeError('Display clock must not run backward');this.lastClock=nowMs;return nowMs;}
  /**
   * packet={eventId,targetId,casterId?,instanceId,sequence,branch,
   *         after:{active,durability},impactV?:null|number}
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
    resolveImpact(p);
    if(this.seen.has(p.eventId))return {accepted:false,reason:'duplicate'};
    const old=this.targets.get(p.targetId);
    if(old&&p.sequence<=old.sequence)return {accepted:false,reason:'stale_sequence'};
    if(old&&p.instanceId!==old.instanceId&&p.branch!=='create')return {accepted:false,reason:'different_instance_requires_create_or_resync'};
    if(old&&p.instanceId===old.instanceId&&old.terminal&&p.branch!=='fracture'&&p.branch!=='bust')return {accepted:false,reason:'terminal_instance_cannot_resurrect'};
    if(old&&p.instanceId===old.instanceId&&old.terminal)return {accepted:false,reason:'terminal_already_presented'};
    if(old&&p.instanceId===old.instanceId&&p.branch==='create')return {accepted:false,reason:'duplicate_create_instance'};
    this.seen.add(p.eventId);this.seenOrder.push(p.eventId);
    if(this.seenOrder.length>8192)this.seen.delete(this.seenOrder.shift());
    const state={targetId:p.targetId,casterId:p.casterId??null,instanceId:p.instanceId,sequence:p.sequence,
      authority:{...p.after},terminal,event:{id:p.eventId,branch:p.branch,startMs:displayNowMs,impactV:p.impactV??null,impactUV:p.impactUV?[...p.impactUV]:null}};
    this.targets.set(p.targetId,state);
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
    const old=this.targets.get(targetId);if(old&&sequence<=old.sequence)return false;
    this.targets.set(targetId,{targetId,casterId:null,instanceId,sequence,authority:{active,durability},terminal:!active,event:null});return true;
  }
  /** Removing a view/target is not a gameplay durability event. */
  detach(targetId,nowMs){this.advanceClock(nowMs);return this.targets.delete(targetId);}
}

// Cause-specific observation audio; no acoustic blast, fragments, rebound, or attack.
export const SFX_PROFILES=Object.freeze({
 create:{cause:'broad membrane capture and advancing junction',gain:[[0,0],[.009,.43],[.090,.48],[.31,.64],[.52,.38],[.62,.13],[.65,0]],f0:320,f1:570,rough:.055},
 absorb:{cause:'closed face load capture and constrained relaxation',gain:[[0,0],[.004,1],[.048,.64],[.19,.38],[.42,.19],[.60,.07],[.65,0]],f0:170,f1:145,rough:.17},
 fracture:{cause:'transverse cohesion failure then inward patch collapse',gain:[[0,0],[.004,.92],[.057,.25],[.145,.51],[.205,.24],[.326,.26],[.435,.07],[.48,0]],f0:790,f1:340,rough:.64},
 bust:{cause:'smooth upper-to-lower field coupling revocation; no impact',gain:[[0,0],[.022,.30],[.11,.51],[.27,.36],[.41,.16],[.48,0]],f0:430,f1:165,rough:.025},
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
if(typeof process!=='undefined'&&process.versions?.node&&process.argv[1]){
 const {fileURLToPath}=await import('node:url'); // Node-only CLI; not fetched by the browser.
 if(fileURLToPath(import.meta.url)===process.argv[1]){
 const [branch='create',t='300',h='64']=process.argv.slice(2);try{
  const opts={authoritativeActive:['create','absorb','idle'].includes(branch),hPx:Number(h)};
  console.log(JSON.stringify({version:VERSION,envelope:sampleEnvelope(branch,Number(t),opts),center:sampleSurface(branch,Number(t),opts),audio:branch==='idle'?null:sampleSFXEnvelope(branch,Number(t)/1000)},null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}

}
