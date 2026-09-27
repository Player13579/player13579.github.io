/**
 * Barrier Pro r0.1 — 偏稜殻 (offset-keel shell).
 * Pure formulas + indexed procedural geometry + synthesized PCM.
 * No image assets, Canvas 2D, dependencies, or gameplay/damage calculation.
 * Units: display clock ms; normalized target height h; linear sRGB straight color.
 * The mesh stores PREMULTIPLIED linear RGBA. See barrier-pro-design.md.
 */
export const VERSION = 'barrier-pro-r0.1';
export const DURATIONS_MS = Object.freeze({create: 650, absorb: 650, fracture: 480, bust: 480});
export const BRANCHES = Object.freeze(Object.keys(DURATIONS_MS));
export const SHAPE = Object.freeze({height: 1.18, maxWidth: 0.94, frontDepth: 0.25, backDepth: 0.19});
export const PALETTE_LINEAR = Object.freeze({
  face: Object.freeze([0.080, 0.145, 0.340]),
  fold: Object.freeze([0.260, 0.395, 0.700]),
  dark: Object.freeze([0.009, 0.016, 0.041]),
  core: Object.freeze([1.000, 0.985, 0.945]),
});
const TAU = 2 * Math.PI;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const mix = (a, b, t) => a + (b - a) * t;
function finite(x, name) { if (!Number.isFinite(x)) throw new TypeError(`${name} must be finite`); return x; }
function branchOK(branch) { if (branch !== 'idle' && !BRANCHES.includes(branch)) throw new RangeError(`Unknown branch: ${branch}`); }
/** Spatial smoothing only. This function never remaps the event clock. */
export function spatialSmooth(a, b, x) { const t = clamp((x-a)/(b-a)); return t*t*(3-2*t); }
export function piecewiseLinear(knots, x) {
  if (x <= knots[0][0]) return knots[0][1];
  for (let i=1; i<knots.length; i++) if (x <= knots[i][0]) {
    return mix(knots[i-1][1], knots[i][1], (x-knots[i-1][0])/(knots[i][0]-knots[i-1][0]));
  }
  return knots.at(-1)[1];
}
export function halfWidth(v) {
  return piecewiseLinear([[0,.18],[.12,.36],[.30,.46],[.70,.46],[.90,.34],[1,.16]], clamp(v));
}
export function keelX(v) {
  return piecewiseLinear([[0,.045],[.33,-.055],[.68,.090],[1,-.040]], clamp(v));
}
export function hullCenterX(v) { return -.025 + .050*clamp(v); }
/** A bounded, three-tooth failure boundary, not detached shards or noise. */
export function fractureTooth(v) {
  return piecewiseLinear([[0,0],[.14,0],[.20,1],[.29,-.5],[.38,0],[.46,1],
    [.56,-.5],[.64,0],[.73,1],[.83,-.5],[.92,0],[1,0]], clamp(v));
}
/**
 * Event lifetime never mutates authoritativeActive. Negative ages suppress the event; the supplied authority is unchanged.
 * At T exactly: eventActive=false; create/absorb retain idle if authority says so.
 * Terminal witnesses deliberately persist until T- and are removed at T, not a
 * long invisible fade. The discontinuity and its size are explicit GPU gates.
 */
export function sampleEnvelope(branch, ageMs, {authoritativeActive, impactV = null} = {}) {
  branchOK(branch); finite(ageMs, 'ageMs');
  if (typeof authoritativeActive !== 'boolean') throw new TypeError('authoritativeActive must be boolean');
  if (impactV !== null && (!Number.isFinite(impactV) || impactV < 0 || impactV > 1)) throw new RangeError('impactV must be null or [0,1]');
  const durationMs = DURATIONS_MS[branch] ?? 0;
  const active = branch !== 'idle' && ageMs >= 0 && ageMs < durationMs;
  const r = durationMs ? clamp(ageMs/durationMs) : 0;
  const terminal = branch === 'fracture' || branch === 'bust';
  const visible = active || authoritativeActive;
  const e = {
    branch: active ? branch : 'idle', requestedBranch: branch, ageMs, durationMs,
    normalizedTime: r, eventActive: active, authoritativeActive, visible,
    residueOnly: active && terminal, supportsGameplay: authoritativeActive,
    // No hit direction is invented when the authority supplies no contact.
    impactV, contactMode: impactV === null ? 'distributed_no_claimed_contact' : 'provided_local_contact',
    phase: active ? 'active' : (authoritativeActive ? 'idle' : 'absent'),
    opacityGain: visible ? 1 : 0, keptWidth: 1, depthGain: 1, yGain: 1,
    seamFrontV: null, dent: 0, stress: 0, coreGain: 0,
  };
  if (!active) return e;
  if (branch === 'create') {
    e.phase = r < .32 ? 'joining' : r < .77 ? 'latching' : 'last_unjoined_cap';
    e.seamFrontV = .08 + .84*r; // Constant speed, no clock easing.
    e.opacityGain = piecewiseLinear([[0,.86],[.20,1],[1,1]], r);
    e.coreGain = piecewiseLinear([[0,.25],[.20,1],[.72,.64],[1,.36]], r);
    e.stress = .32;
  } else if (branch === 'absorb') {
    e.phase = r < .18 ? 'load_capture' : r < .66 ? 'local_relaxation' : 'retained_load_witness';
    e.dent = .012 + .042*Math.exp(-5*r); // Constitutive response, NOT clock remapping.
    e.stress = .24 + .76*Math.exp(-3.8*r);
    e.coreGain = piecewiseLinear([[0,.92],[.08,1],[.24,.34],[.6,.08],[1,.04]], r);
  } else if (branch === 'fracture') {
    e.phase = r < .20 ? 'cohesion_lost' : r < .72 ? 'notched_release' : 'open_failure_witness';
    e.keptWidth = .84 - .60*r;
    e.depthGain = 1 - .52*r;
    e.opacityGain = 1 - .36*r;
    e.stress = .55 + .45*Math.exp(-5*r);
    e.coreGain = piecewiseLinear([[0,.82],[.09,1],[.28,.25],[.65,.05],[1,0]], r);
  } else {
    e.phase = r < .20 ? 'coupling_revoked' : r < .72 ? 'ordered_withdrawal' : 'clean_release_witness';
    e.keptWidth = .90 - .76*r;
    e.depthGain = 1 - .90*r;
    e.yGain = .98 - .13*r;
    e.opacityGain = .94 - .30*r;
    e.stress = 0;
    e.coreGain = 0; // No impact or white flash on removal by bust.
  }
  return e;
}
/** 48-byte uniform block consumed by barrier-pro.wgsl. Idle uses branch=-1. */
export function packUniforms({branch,ageMs,authoritativeActive,impactV=null,hPx=64,
  width=256,height=192,centerPx=[width/2,height/2],yawDeg=0,coreEnabled=true}={}){
  sampleEnvelope(branch,ageMs,{authoritativeActive,impactV});
  for(const [k,v] of Object.entries({hPx,width,height}))if(!Number.isFinite(v)||v<=0)throw new RangeError(`${k} must be positive`);
  finite(yawDeg,'yawDeg');
  if(!Array.isArray(centerPx)||centerPx.length!==2||!centerPx.every(Number.isFinite))throw new TypeError('centerPx must contain two finite numbers');
  if(typeof coreEnabled!=='boolean')throw new TypeError('coreEnabled must be boolean');
  return new Float32Array([width,height,hPx,ageMs,branch==='idle'?-1:BRANCHES.indexOf(branch),authoritativeActive?1:0,impactV??-1,yawDeg,...centerPx,coreEnabled?1:0,0]);
}
function localStress(e, v) {
  if (e.branch === 'create') return Math.exp(-Math.pow((v-e.seamFrontV)/.047,2));
  if (e.branch === 'absorb') {
    if (e.impactV === null) return .60 + .15*Math.cos(Math.PI*(v-.5));
    const width = .065 + .100*e.normalizedTime;
    return Math.exp(-Math.pow((v-e.impactV)/width,2));
  }
  if (e.branch === 'fracture') {
    if (e.impactV === null) return .7;
    const width = .07 + .22*e.normalizedTime;
    return Math.exp(-Math.pow((v-e.impactV)/width,2));
  }
  return 0;
}
/**
 * One surface sample. side=-1/+1, face='front'/'back'; u=0 inner seam, u=1 hull.
 * Geometry is h-normalized. Convert to meters using the existing target height.
 * hPx is render-target pixels, not CSS pixels. H100 adds no new effect components.
 */
export function sampleSurface(branch, ageMs, {
  side = -1, face = 'front', u = .5, v = .5, hPx = 64,
  authoritativeActive, impactV = null, coreEnabled = true,
} = {}) {
  if (typeof coreEnabled !== 'boolean') throw new TypeError('coreEnabled must be boolean');
  if (side !== -1 && side !== 1) throw new RangeError('side must be -1 or +1');
  if (!['front','back'].includes(face)) throw new RangeError('face must be front or back');
  if (!(hPx > 0) || !Number.isFinite(hPx)) throw new RangeError('hPx must be positive');
  finite(u,'u'); finite(v,'v'); u=clamp(u); v=clamp(v);
  const opts = {impactV}; if (authoritativeActive !== undefined) opts.authoritativeActive=authoritativeActive;
  const e = sampleEnvelope(branch,ageMs,opts);
  const outer = hullCenterX(v) + side*halfWidth(v);
  const seam = keelX(v);
  let inner = seam;
  const span = Math.abs(outer-seam);
  if (e.branch === 'create') {
    const notJoined = spatialSmooth(e.seamFrontV-.045, e.seamFrontV+.045, v);
    inner += side*(.005 + .078*notJoined);
  } else if (e.branch === 'fracture') {
    const jag = .036*fractureTooth(v)*(side === -1 ? 1 : -.72);
    const kept = clamp(span*e.keptWidth + jag, .025, span*.91);
    inner = outer-side*kept;
  } else if (e.branch === 'bust') {
    inner = outer-side*span*e.keptWidth;
  }
  const stress = localStress(e,v);
  let x = mix(inner,outer,u);
  const y = (v-.5)*SHAPE.height*e.yGain;
  // Two planar slopes form a true fold; end caps meet at z=0.
  const fold = piecewiseLinear([[0,.90],[.22,1],[1,0]],u);
  const cap = Math.min(1, v/.12, (1-v)/.10);
  const zSign = face === 'front' ? 1 : -1;
  const z0 = (face === 'front' ? SHAPE.frontDepth : SHAPE.backDepth)*fold*cap;
  const dent = e.branch === 'absorb' ? e.dent*stress*(1-u)*cap : 0;
  const z = zSign*Math.max(0,z0*e.depthGain-dent);
  if (e.branch === 'absorb') x += .026*e.stress*stress*(1-u); // shared seam shear; both halves stay joined, hull fixed.
  // Facet contrast belongs to this field, not a screen-space white perimeter.
  const innerBand = 1-spatialSmooth(.18,.31,u);
  const outerBevel = spatialSmooth(.76,.91,u);
  const darkSeam = 1-spatialSmooth(.018,.045,u);
  let base = PALETTE_LINEAR.face.map((c,i)=>mix(c,PALETTE_LINEAR.fold[i],.66*innerBand+.18*outerBevel));
  base = base.map((c,i)=>mix(c,PALETTE_LINEAR.dark[i],.76*darkSeam));
  const sideGain = side === -1 ? 1 : .82;
  const faceGain = face === 'front' ? 1 : .67;
  base = base.map(c=>c*sideGain*faceGain);
  // Native-width white core inside the fold. It never surrounds the silhouette.
  const worldPanelWidth = Math.max(.025,Math.abs(outer-inner));
  const coreWidthH = 1.25/64; // physical ratio: 1.25 px at H64, 1.95 px at H100.
  const coreCenterU = .145;
  const coreAcross = Math.exp(-Math.pow(((u-coreCenterU)*worldPanelWidth)/(coreWidthH*.55),2));
  const localCore = e.coreGain*stress*coreAcross*(face === 'front' ? 1 : .30)*(coreEnabled?1:0);
  // Face readability survives with coreGain=0; this is not bloom-created geometry.
  const contactLift = .14*e.stress*stress*innerBand;
  let rgb = base.map((c,i)=>mix(Math.min(.83,c+contactLift*(i===2?1:.7)), PALETTE_LINEAR.core[i],clamp(localCore)));
  let alpha = (.30+.06*outerBevel) * (face === 'front' ? 1 : .68); // equal plane coverage avoids a gray-background contrast null.
  alpha = mix(alpha,.965,clamp(localCore));
  alpha *= e.opacityGain;
  if (!e.visible) alpha=0;
  rgb=rgb.map(c=>clamp(c)); alpha=clamp(alpha);
  return {
    position:[x,y,z], straightLinearRGBA:[...rgb,alpha],
    premultipliedLinearRGBA:[...rgb.map(c=>c*alpha),alpha],
    panel:{side,face,u,v}, mask:{field:alpha>0,core:localCore,stress,innerBand}, envelope:e,
  };
}
/**
 * Build a mesh for ONE face ('back' then 'front'); material layers are evaluated
 * once, not stacked draw passes. CPU formulas are the authoritative sampler.
 * Format per vertex: x,y,z, premultR,G,B,A. Uint32 indices, triangle-list.
 */
export function buildMesh(branch,ageMs,{
  face='front', hPx=64, uSegments=48, vSegments=80, authoritativeActive, impactV=null, coreEnabled=true,
}={}) {
  for (const [n,v] of Object.entries({uSegments,vSegments})) if (!Number.isInteger(v)||v<4||v>256) throw new RangeError(`${n}: integer [4,256] required`);
  const vertices = new Float32Array(2*(uSegments+1)*(vSegments+1)*7);
  const indices = new Uint32Array(2*uSegments*vSegments*6);
  let vo=0,io=0;
  for (let panel=0; panel<2; panel++) {
    const side=panel===0?-1:1;
    const base=panel*(uSegments+1)*(vSegments+1);
    for(let j=0;j<=vSegments;j++) for(let i=0;i<=uSegments;i++) {
      const s=sampleSurface(branch,ageMs,{face,side,u:i/uSegments,v:j/vSegments,hPx,authoritativeActive,impactV,coreEnabled});
      vertices.set([...s.position,...s.premultipliedLinearRGBA],vo); vo+=7;
    }
    for(let j=0;j<vSegments;j++) for(let i=0;i<uSegments;i++) {
      const a=base+j*(uSegments+1)+i,b=a+1,c=a+uSegments+1,d=c+1;
      indices.set([a,b,c,b,d,c],io);io+=6;
    }
  }
  return {vertices,indices,vertexStrideBytes:28,format:'xyz+premultiplied-linear-rgba',face,hPx,version:VERSION};
}
export function linearToSrgb(x) { x=Math.max(0,x); return x<=.0031308?12.92*x:1.055*Math.pow(x,1/2.4)-.055; }
export function srgbToLinear(x) { x=clamp(x); return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4); }
export function over(src,dst) { return [src[0]+dst[0]*(1-src[3]),src[1]+dst[1]*(1-src[3]),src[2]+dst[2]*(1-src[3]),src[3]+dst[3]*(1-src[3])]; }
export function projectPoint([x,y,z],{hPx=64,centerPx=[128,96],yawDeg=0}={}) {
  const a=yawDeg*Math.PI/180,xx=Math.cos(a)*x+Math.sin(a)*z,zz=-Math.sin(a)*x+Math.cos(a)*z;
  return {pixel:[centerPx[0]+hPx*xx,centerPx[1]-hPx*y],viewZ:zz};
}

// ---- Presentation authority adapter: snapshots in, geometry out; no damage logic. ----
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
    if(p.impactV!=null&&(!Number.isFinite(p.impactV)||p.impactV<0||p.impactV>1))throw new RangeError('impactV outside [0,1]');
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
      authority:{...p.after},terminal,event:{id:p.eventId,branch:p.branch,startMs:displayNowMs,impactV:p.impactV??null}};
    this.targets.set(p.targetId,state);
    return {accepted:true,cancelAudioEventId:old?.event?.id??null,state:structuredClone(state)};
  }
  sample(targetId,nowMs){
    this.advanceClock(nowMs);const s=this.targets.get(targetId);if(!s)return null;
    const e=s.event;
    return {targetId,instanceId:s.instanceId,authority:{...s.authority},
      envelope:sampleEnvelope(e?.branch??'idle',e?nowMs-e.startMs:0,{authoritativeActive:s.authority.active,impactV:e?.impactV??null})};
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

// ---- Cause-coded SFX. Mono PCM; pan follows TARGET, never the caster. ----
const SFX={
  create:{gain:[[0,0],[.006,.82],[.06,.38],[.38,.23],[.61,.16],[.65,0]],f0:460,f1:640,rough:.07},
  absorb:{gain:[[0,0],[.003,1],[.027,.57],[.13,.30],[.46,.12],[.65,0]],f0:270,f1:230,rough:.19},
  fracture:{gain:[[0,0],[.003,.95],[.040,.24],[.066,.12],[.080,.72],[.13,.30],[.35,.09],[.48,0]],f0:910,f1:380,rough:.52},
  bust:{gain:[[0,0],[.013,.62],[.065,.67],[.21,.30],[.40,.08],[.48,0]],f0:720,f1:210,rough:.09},
};
export function sampleSFXEnvelope(branch,timeSec){
  if(!SFX[branch])throw new RangeError('Audio branch invalid');finite(timeSec,'timeSec');
  const T=DURATIONS_MS[branch]/1000,p=SFX[branch];
  const gain=timeSec<0||timeSec>=T?0:piecewiseLinear(p.gain,timeSec);
  return {gain,frequencyHz:mix(p.f0,p.f1,clamp(timeSec/T)),roughness:p.rough,durationSec:T,
    playbackRate:1,cause:({create:'junction engagement',absorb:'bounded load capture',fracture:'cohesion failure',bust:'coupling revocation'})[branch]};
}
/** PCM is not an image. No recorded/borrowed effects, samples or external assets. */
export function renderSFX(branch,{sampleRate=48000,seed=1}={}){
  if(!SFX[branch])throw new RangeError('Audio branch invalid');
  if(!Number.isInteger(sampleRate)||sampleRate<22050||sampleRate>192000)throw new RangeError('sampleRate [22050,192000] required');
  const T=DURATIONS_MS[branch]/1000,p=SFX[branch],out=new Float32Array(Math.round(T*sampleRate));
  let rng=(seed>>>0)||1,lp=0,hiLP=0;
  const lowA=1-Math.exp(-TAU*600/sampleRate), highA=1-Math.exp(-TAU*3600/sampleRate);
  for(let i=0;i<out.length;i++){
    const t=i/sampleRate,env=sampleSFXEnvelope(branch,t);
    rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;const n=(rng>>>0)/2147483648-1;
    lp+=lowA*(n-lp);hiLP+=highA*((n-lp)-hiLP);
    const phase=TAU*(p.f0*t+.5*(p.f1-p.f0)/T*t*t);
    let tone=.60*Math.sin(phase)+.25*Math.sin(phase*1.618)+.15*Math.sin(phase*2.731);
    if(branch==='bust')tone=.75*Math.sin(phase)+.25*Math.sin(.502*phase);
    // Analytically bounded blend; final extra boundary sample is forced to zero.
    out[i]=.125*env.gain*((1-p.rough)*tone+p.rough*clamp(hiLP,-1,1));
  }
  out[0]=0;out[out.length-1]=0;
  return {samples:out,sampleRate,durationSec:T,peakLimit:.125,version:VERSION};
}
/** Browser utility; call only from a user gesture. The game's mixer owns voice limits. */
export function playSFX(audioContext,branch,{destination=audioContext.destination,pan=0,seed=1,volume=.5}={}){
  if(!Number.isFinite(volume)||volume<0||volume>.5)throw new RangeError('Reference volume [0,.5]');
  const pcm=renderSFX(branch,{sampleRate:audioContext.sampleRate,seed});
  const buffer=audioContext.createBuffer(1,pcm.samples.length,pcm.sampleRate);buffer.copyToChannel(pcm.samples,0);
  const source=audioContext.createBufferSource(),gain=audioContext.createGain(),panner=audioContext.createStereoPanner();
  source.buffer=buffer;source.playbackRate.value=1;gain.gain.value=volume;panner.pan.value=clamp(pan,-1,1);
  source.connect(gain).connect(panner).connect(destination);source.start();
  let cancelled=false;source.onended=()=>{source.disconnect();gain.disconnect();panner.disconnect();};
  return {source,pcm,cancel(){if(cancelled)return;cancelled=true;const t=audioContext.currentTime;
    gain.gain.cancelAndHoldAtTime(t);gain.gain.linearRampToValueAtTime(0,t+.008);source.stop(t+.008);}};
}

// CLI intentionally prints small JSON, never rasterizes an image.
if(typeof process!=='undefined'&&process.versions?.node&&process.argv[1]&&
   new URL(import.meta.url).pathname===process.argv[1]){
  const [branch='create',age='120',h='64']=process.argv.slice(2);
  try{const ageMs=Number(age),hPx=Number(h);const impactV=.57;const authoritativeActive=['create','absorb','idle'].includes(branch); // CLI FIXTURE ONLY
    console.log(JSON.stringify({version:VERSION,envelope:sampleEnvelope(branch,ageMs,{impactV,authoritativeActive}),
      representativeSurface:sampleSurface(branch,ageMs,{u:.145,v:.57,hPx,impactV,authoritativeActive}),
      sfx:SFX[branch]?sampleSFXEnvelope(branch,ageMs/1000):null},null,2));
  }catch(e){console.error(e.message);process.exitCode=1;}
}
