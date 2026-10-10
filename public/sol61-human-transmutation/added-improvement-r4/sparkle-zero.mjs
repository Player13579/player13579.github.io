// 人体錬成追加改善 R4。R3の円形光源を保ち、光量・放射時間・観測散乱配分を改稿。独立ゼロ設計ではない。
// Source module ABI is retained so the host's event, target, material and SFX stay exact.
// 明示展開：22.5°斜線と112.5°斜線の交差光条多数でキラキラ演出
export const REGISTERED_ORIGINAL = Object.freeze({
  sha256: '4f1901dfd275bfec01b6f4fd7da66f190e0b2396320de2fb36cc20a5e36490a3',
  crop: Object.freeze([0, 0, 256, 256]),
  support: Object.freeze([57, 16, 141, 225]),
});
// Integer texels in the verified original crop, ordered feet -> head.
// Actual sample position is their texel center; no bbox-grid alpha lottery.
export const REGISTERED_TEXELS = Object.freeze([
  [116,232],[138,232],[120,218],[140,218],
  [80,207],[129,207],[177,207],[66,191],[118,191],[186,191],
  [91,175],[143,175],[174,175],[99,157],[131,157],[166,157],
  [111,140],[156,140],[117,123],[147,123],
  [104,106],[134,106],[155,106],[90,88],[164,88],
  [117,66],[163,66],[112,41],[144,41],[132,24],
].map(p => Object.freeze(p)));

export const SPARKLE_REVISION = Object.freeze({
  count: REGISTERED_TEXELS.length, lifetimeMs: 1200,
  pulseMs: 156, repeatOffsetMs: 200, repeatGain: .74,
  footArrivalMs: 90, bodySweepMs: 700, fixMs: 24,
  delayMinMs: 16, delayStepMs: 7, delayVariants: 7,
  angleRadians: Math.PI / 8, sourceSigmaCss: .48,
  upperSourceSigmaCss: .64, upperFirstSiteIndex: 18,
  rayRadiusCssAtH64: 6.6, psfWeight: .80,
  sourceRGB: Object.freeze([21.6,34.2,28.35]),
  authorship: 'GPT-6.1-Sol',
});
// Compatibility export is a host binding, not a claim to R1 identity.
export const SPARKLE_ZERO = SPARKLE_REVISION;

export function sparkleSite(index) {
  if (!Number.isInteger(index) || index < 0 || index >= SPARKLE_REVISION.count) throw new RangeError('site');
  const [x,y] = REGISTERED_TEXELS[index];
  const u=(x+.5-57)/141, v=(y+.5-16)/225;
  const arrivalMs=90+(1-v)*700;
  const fixedMs=arrivalMs+24;
  // Delay variants stagger neighboring nuclei after their own material is fixed.
  const delayMs=16+((index*5+2)%7)*7;
  return Object.freeze({u,v,x:x+.5,y:y+.5,arrivalMs,fixedMs,atMs:fixedMs+delayMs,delayMs});
}
export function sparklePulse(ageMs, atMs) {
  if (!Number.isFinite(ageMs) || !Number.isFinite(atMs) || ageMs < 0 || ageMs >= 1200) return 0;
  const pulse=start=>{
    const q=(ageMs-start)/156;
    return q>0 && q<1 ? Math.sin(Math.PI*q)**2 : 0;
  };
  return Math.max(pulse(atMs),.74*pulse(atMs+200));
}

export function sparkleSiteSigmaCss(index) {
  if (!Number.isInteger(index) || index < 0 || index >= SPARKLE_REVISION.count) throw new RangeError('site');
  return index >= SPARKLE_REVISION.upperFirstSiteIndex ? SPARKLE_REVISION.upperSourceSigmaCss : SPARKLE_REVISION.sourceSigmaCss;
}

const siteVectors=REGISTERED_TEXELS.map(([x,y])=>`vec2f(${x}.5,${y}.5)`).join(',\n    ');
export const ZERO_WORLD_HELPERS = /* wgsl */ `
fn zsSite(i: u32) -> vec3f {
  let points = array<vec2f,30>(
    ${siteVectors});
  let uv=(points[i]-vec2f(57.,16.))/vec2f(141.,225.);
  let rowArrival=90.+(1.-uv.y)*700.;
  let rowFixed=rowArrival+24.;
  let delay=16.+f32((i*5u+2u)%7u)*7.;
  return vec3f(uv,rowFixed+delay);
}
fn zsBurst(age: f32, start: f32) -> f32 {
  let q=(age-start)/156.;
  if (q <= 0. || q >= 1.) { return 0.; }
  let s=sin(3.141592653589793*q); return s*s;
}
fn zsPulse(age: f32, start: f32) -> f32 {
  if (age < 0. || age >= 1200.) { return 0.; }
  return max(zsBurst(age,start),.74*zsBurst(age,start+200.));
}
// Area quadrature of a circular emitter; coverage is not a square particle.
fn zsFootprint(q: vec2f, sigma: f32) -> f32 {
  var radiance=0.;
  for(var y=0; y<3; y++) {
    for(var x=0; x<3; x++) {
      let d=q+vec2f((f32(x)-1.)/3.,(f32(y)-1.)/3.);
      radiance+=exp(-dot(d,d)/(2.*sigma*sigma));
    }
  }
  return radiance/9.;
}
fn zsPointRadiation(pixel: vec2f, support: vec4f, age: f32,
    dpr: f32, heightCss: f32, enabled: bool) -> vec3f {
  if (!enabled || age < 0. || age >= 1200.) { return vec3f(0.); }
  let sigmaScale=dpr*clamp(heightCss/64.,.75,2.);
  // Coarse rejection must contain the upper sites' complete circular support.
  let maxSigma=.64*sigmaScale;
  if (any(pixel < support.xy-vec2f(4.*maxSigma)) ||
      any(pixel > support.xy+support.zw+vec2f(4.*maxSigma))) { return vec3f(0.); }
  var light=vec3f(0.);
  for(var i=0u; i<30u; i++) {
    let site=zsSite(i); let pulse=zsPulse(age,site.z);
    if (pulse <= 0.) { continue; }
    let center=support.xy+site.xy*support.zw;
    let alpha=zsAlpha(center);
    if (alpha <= .02) { continue; }
    let sigma=select(.48,.64,i >= 18u)*sigmaScale;
    let q=pixel-center;
    if (dot(q,q) > 16.*sigma*sigma) { continue; }
    light+=vec3f(21.6,34.2,28.35)*pulse*alpha*zsFootprint(q,sigma);
  }
  return light;
}
`;

export function sparkleKernelWeight(t) {
  const q=Math.abs(t);
  const fade=Math.min(1,Math.max(0,(q-.84)/.16));
  return Math.exp(-1.7*q)*(1-fade*fade*(3-2*fade));
}
export const ZERO_OBSERVER_HELPERS = /* wgsl */ `
// Source-bound finite continuous two-axis aperture response, not world stars.
fn zsSample(pixel: vec2f, extent: vec2f) -> vec3f {
  let uv=pixel/extent;
  if (any(uv < vec2f(0.)) || any(uv > vec2f(1.))) { return vec3f(0.); }
  return textureSampleLevel(zsSourceTex,zsSampler,uv,0.).rgb;
}
fn zsObserve(pixel: vec2f, extent: vec2f, support: vec4f,
    dpr: f32, heightCss: f32, observerEnabled: bool) -> vec3f {
  let direct=zsSample(pixel,extent);
  if (!observerEnabled) { return direct; }
  let radius=6.6*dpr*clamp(heightCss/64.,.75,2.);
  if (any(pixel < support.xy-vec2f(radius+4.*dpr)) ||
      any(pixel > support.xy+support.zw+vec2f(radius+4.*dpr))) { return direct; }
  let axis=vec2f(.3826834323650898,-.9238795325112867);
  let perpendicular=vec2f(-axis.y,axis.x);
  var scattered=vec3f(0.); var norm=0.;
  // At most .66 backing px between samples at H128/DPR2; no separated copies.
  for(var i=-40; i<=40; i++) {
    let t=f32(i)/40.;
    let weight=exp(-1.7*abs(t))*(1.-smoothstep(.84,1.,abs(t)));
    scattered+=weight*(
      zsSample(pixel+axis*t*radius,extent)+
      zsSample(pixel+perpendicular*t*radius,extent));
    norm+=2.*weight;
  }
  return .20*direct+.80*scattered/max(norm,.00001);
}
`;

export const R2_SITES = Object.freeze(Array.from({length:SPARKLE_REVISION.count},(_,i)=>sparkleSite(i)));
