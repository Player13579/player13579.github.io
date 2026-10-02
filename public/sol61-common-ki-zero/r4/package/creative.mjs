// GPT-6.1-Sol: zero-authored common 錬気 artist kernel. No old Renki art input.
export const VERSION = 'common-ki-zero-sol61-r1';
export const LIFE_E_MS = 1200;
export const PROFILE = Object.freeze({
  type: 'action-renki', variants: Object.freeze(['', 'tenfold']),
  linearCore: Object.freeze([0.72, 0.91, 1]),
  linearEdge: Object.freeze([0.16, 0.39, 0.82]),
  supportH: Object.freeze([-0.72, -0.10, 0.72, 1.10]),
  maxPlates: 8, source: 'actor-bound emissive lamellae; fictional coherent field',
});
const sat = x => Math.max(0, Math.min(1, x));
const ease = x => { const q = sat(x); return q*q*(3-2*q); };
const lerp = (a,b,t) => a+(b-a)*t;
const pulse = (t,a,b,c,d) => ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
const yLum = rgb => rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
export function supports(event) {
  return !!event && typeof event.id === 'string' && event.id.length > 0 &&
    event.type === PROFILE.type && PROFILE.variants.includes(event.variant ?? '') &&
    typeof event.playerId === 'string' && event.playerId.length > 0 &&
    Number.isFinite(event.x) && Number.isFinite(event.y) &&
    Number.isFinite(event.at) && (event.durationMs === 0 ||
      Number.isFinite(event.durationMs) && event.durationMs >= LIFE_E_MS);
}
// Input is an already verified host capture, NOT a source admission authority.
// H is the qualified visible body-alpha support height in backing pixels.
export function buildFrame({ageEMs, variant = '', H, controls = {}}) {
  if (!Number.isFinite(ageEMs) || !Number.isFinite(H) || H <= 0 ||
      !PROFILE.variants.includes(variant)) throw new TypeError('Invalid common-ki artist input');
  const active = ageEMs >= 0 && ageEMs < LIFE_E_MS;
  const src = active && controls.source !== false;
  const strength = variant === 'tenfold' ? 1.52 : 1;
  const plates = [];
  if (src) {
    for (let i=0; i<4; i++) {
      const a = i*72;
      const motion = ease((ageEMs-a-60)/430);
      const envelope = pulse(ageEMs,a,a+100,660+i*20,1110+i*20);
      for (const side of [-1,1]) {
        // Four staggered continuous broad slats per side, never a circular orbit.
        const settle = ease((ageEMs-480)/210);
        const release = ease((ageEMs-820)/290);
        const x = side*(lerp(0.55-i*0.042,0.135+i*0.018,motion)+release*0.07);
        const y = lerp(0.25+i*0.105,0.52+i*0.07,motion)-release*0.08;
        const angle = side*lerp(-0.52,0.14,settle);
        const halfLength = lerp(0.132,0.098,motion)*(1-release*0.32);
        const halfWidth = lerp(0.026,0.037,settle);
        const radiance = strength*envelope*(1.8+4.7*pulse(ageEMs,460,620,710,850));
        plates.push(Object.freeze({x,y,angle,halfLength,halfWidth,radiance,
          z: side*0.08, areaH2: 4*halfLength*halfWidth, front: side > 0 ? i%2===0 : i%2!==0}));
      }
    }
  }
  const sourceFlux = plates.reduce((n,p) => n+p.radiance*p.areaH2,0);
  const peak = plates.reduce((n,p) => Math.max(n,p.radiance),0);
  return Object.freeze({version:VERSION,ageEMs,H,variant,active,
    plates:Object.freeze(plates), sourceFlux, peak,
    nearbyEnabled:src && controls.nearby !== false,
    observerEnabled:src && controls.observer !== false && peak > 2.2,
    supportH:PROFILE.supportH});
}
export function sourceAt(frame,x,y,front = null) {
  const rgb=[0,0,0];
  for (const p of frame.plates) {
    if (front !== null && p.front !== front) continue;
    const dx=x-p.x,dy=y-p.y,c=Math.cos(p.angle),s=Math.sin(p.angle);
    const u=Math.abs(c*dx+s*dy)/p.halfLength;
    const v=Math.abs(-s*dx+c*dy)/p.halfWidth;
    const edge=1-ease((Math.max(u,v)-0.64)/0.36);
    const core=1-ease((v-0.18)/0.60);
    for (let k=0;k<3;k++) rgb[k]+=p.radiance*edge*lerp(PROFILE.linearEdge[k],PROFILE.linearCore[k],core);
  }
  return rgb;
}
// Receiver in H units: [x,height,z], outward unit normal, linear albedo.
// Extended-emitter softened inverse square avoids point-source singularities.
// A planar floor is y=0, n=[0,1,0]. Host applies world occlusion before this.
export function nearbyAt(frame,position,normal,albedo,visibility = 1) {
  if (![...position,...normal,...albedo,visibility].every(Number.isFinite) ||
      position.length!==3 || normal.length!==3 || albedo.length!==3 ||
      Math.abs(Math.hypot(...normal)-1)>1e-5 || visibility<0 || visibility>1 ||
      albedo.some(x=>x<0 || x>1)) throw new TypeError('Invalid receiver');
  const rgb=[0,0,0]; if (!frame.nearbyEnabled) return rgb;
  for (const p of frame.plates) {
    const d=[p.x-position[0],p.y-position[1],p.z-position[2]];
    const r2=d.reduce((n,x)=>n+x*x,0),r=Math.sqrt(r2);
    if (r>=0.90 || r===0) continue;
    const cos=Math.max(0,d.reduce((n,x,i)=>n+x*normal[i],0)/r);
    const support=1-ease((r-0.62)/0.28);
    const irradiance=visibility*p.radiance*p.areaH2*cos*support/(r2+0.028);
    for(let k=0;k<3;k++) rgb[k]+=irradiance*albedo[k]*PROFILE.linearCore[k]/Math.PI;
  }
  return rgb;
}
// Selected OBS is a local imaging PSF, NOT a lens flare/ghost or physical fog.
// Host only calls this for actually visible source after body/scene occlusion.
export function observerAt(frame,x,y,visibleFractions) {
  if (!Array.isArray(visibleFractions) || visibleFractions.length!==frame.plates.length ||
      visibleFractions.some(v=>!Number.isFinite(v)||v<0||v>1)) throw new TypeError('OBS visibility proof needed');
  const rgb=[0,0,0]; if(!frame.observerEnabled) return rgb;
  frame.plates.forEach((p,i)=>{
    const d2=(x-p.x)**2+(y-p.y)**2;
    if(d2>=0.18**2) return;
    const kernel=(Math.exp(-d2/(2*0.025**2))*0.033+
      Math.exp(-d2/(2*0.078**2))*0.008)*(1-ease((Math.sqrt(d2)-0.14)/0.04));
    const threshold=Math.max(0,p.radiance*yLum(PROFILE.linearCore)-2.2);
    for(let k=0;k<3;k++) rgb[k]+=visibleFractions[i]*threshold*p.areaH2*kernel*PROFILE.linearCore[k];
  }); return rgb;
}
// Deterministic finite PCM; call only following accepted visual submission.
// Audio time is authored E seconds, host rate tracks the owning actor E rate.
export function synthesizeSfx(sampleRate=48000,variant='') {
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000 ||
      !PROFILE.variants.includes(variant)) throw new TypeError('Invalid SFX');
  const pcm=new Float32Array(Math.ceil(sampleRate*0.88));
  const mult=variant==='tenfold'?1.10:1;
  for(let i=0;i<pcm.length;i++) {
    const t=i/sampleRate;
    const flow=pulse(t,0,0.025,0.44,0.68),confirm=pulse(t,0.47,0.51,0.62,0.88);
    const phase=2*Math.PI*(210*t+135*t*t);
    pcm[i]=mult*(0.16*flow*(Math.sin(phase)+0.28*Math.sin(phase*2.004))+
      0.13*confirm*(Math.sin(2*Math.PI*720*t)+0.24*Math.sin(2*Math.PI*1081*t)));
  } return pcm;
}
// Artist emitter ABI only. Host generates rectangle coverage and feeds exact
// same captured plates. Output is linear premultiplied radiance, additive RGB.
// Alpha is coverage witness; it MUST NOT attenuate/replace the ordinary body.
export const SOURCE_WGSL = /* wgsl */ `
struct KiPlate { shape:vec4f, light:vec4f };
struct KiParams { footH:vec4f, sourceSampler:vec4f, plates:array<KiPlate,8> };
@group(0) @binding(0) var<uniform> ki:KiParams;
fn kiEase(x:f32)->f32 { let q=clamp(x,0.0,1.0); return q*q*(3.0-2.0*q); }
@fragment fn commonKiSource(@builtin(position) pixel:vec4f)->@location(0) vec4f {
 let point=vec2f((pixel.x-ki.footH.x)/ki.footH.z,(ki.footH.y-pixel.y)/ki.footH.z);
 var radiance=vec3f(0.0); var coverage=0.0;
 for(var i=0u;i<8u;i=i+1u) {
  let p=ki.plates[i]; if(p.light.x<=0.0 || (ki.sourceSampler.x>=0.0 && p.light.w!=ki.sourceSampler.x)) { continue; }
  let d=point-p.shape.xy; let c=cos(p.shape.z); let s=sin(p.shape.z);
  let u=abs(c*d.x+s*d.y)/p.shape.w;
  let v=abs(-s*d.x+c*d.y)/p.light.y;
  let edge=1.0-kiEase((max(u,v)-0.64)/0.36);
  let core=1.0-kiEase((v-0.18)/0.60);
  radiance+=p.light.x*edge*mix(vec3f(0.16,0.39,0.82),vec3f(0.72,0.91,1.0),core);
  coverage=max(coverage,edge);
 }
 return vec4f(radiance,coverage);
}`;
export function packSourceUniform(frame,footPx,front = null) {
  if(!Array.isArray(footPx)||footPx.length!==2||!footPx.every(Number.isFinite)) throw new TypeError('Invalid foot');
  const out=new Float32Array(72);
  out.set([footPx[0],footPx[1],frame.H,0],0);
  out.set([front===null?-1:Number(front),0,0,0],4);
  frame.plates.forEach((p,i)=>out.set([p.x,p.y,p.angle,p.halfLength,p.radiance,p.halfWidth,p.z,Number(p.front)],8+i*8));
  return out;
}
