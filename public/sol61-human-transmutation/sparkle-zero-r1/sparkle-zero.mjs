// New analytic source and observer, authored independently of R13 glint logic.
// Expansion: 22.5°斜線と112.5°斜線の交差光条多数でキラキラ演出
export const SPARKLE_ZERO = Object.freeze({
  count: 36, lifetimeMs: 1200, pulseMs: 108, repeatOffsetMs: 142,
  angleRadians: Math.PI / 8, sourceSigmaCss: 0.72,
  rayRadiusCssAtH64: 5.5, psfWeight: 0.72,
  authorship: 'GPT-6.1-Sol',
});

export function sparkleSite(index) {
  if (!Number.isInteger(index) || index < 0 || index >= 36) throw new RangeError('site');
  const row = Math.floor(index / 6), column = index % 6;
  const jitter = ((index * 17 + 11) % 29) / 29;
  return {u: (column + 0.22 + 0.56 * jitter) / 6,
    v: (row + 0.3 + 0.4 * (1 - jitter)) / 6,
    atMs: 72 + index * 23 + jitter * 15};
}

export function sparklePulse(ageMs, atMs) {
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs >= 1200) return 0;
  const pulse = start => {
    const q = (ageMs - start) / 108;
    return q > 0 && q < 1 ? Math.sin(Math.PI * q) ** 2 : 0;
  };
  return Math.max(pulse(atMs), 0.8 * pulse(atMs + 142));
}

// Integration substitutes only noncreative ABI bindings:
// pixel/support/extent are backing pixels; heightCss is CSS height.
// Host supportUV is normalized within the registered crop. Convert with
// supportPx.xy=(rectCss.xy+supportUV.xy*rectCss.zw)*dpr;
// supportPx.zw=supportUV.zw*rectCss.zw*dpr.
// zsAlpha(positionPx): sample cropUV.xy+
// ((positionPx/dpr-rectCss.xy)/rectCss.zw)*cropUV.zw in the verified original.
// zsSourceTex / zsSampler: current rgba16float point-radiation attachment.
// No old GLINT_SITES, GLINT_OPTICS, glintAt or rayPSF imports are permitted.
export const ZERO_WORLD_HELPERS = /* wgsl */ `
fn zsSite(i: u32) -> vec3f {
  let j = f32((i * 17u + 11u) % 29u) / 29.;
  return vec3f((f32(i % 6u) + .22 + .56*j)/6.,
    (f32(i / 6u) + .3 + .4*(1.-j))/6., 72. + f32(i)*23. + j*15.);
}
fn zsBurst(age: f32, start: f32) -> f32 {
  let q = (age-start)/108.;
  if (q <= 0. || q >= 1.) { return 0.; }
  let s = sin(3.141592653589793*q); return s*s;
}
fn zsPulse(age: f32, start: f32) -> f32 {
  if (age < 0. || age >= 1200.) { return 0.; }
  return max(zsBurst(age,start), .8*zsBurst(age,start+142.));
}
// Pixel-footprint quadrature integrates a smooth circular emitter, rather than
// rasterizing a square sprite and subsequently reshaping that square.
fn zsFootprint(q: vec2f, sigma: f32) -> f32 {
  var radiance = 0.;
  for(var y = 0; y < 3; y++) {
    for(var x = 0; x < 3; x++) {
      let d = q + vec2f((f32(x)-1.)/3.,(f32(y)-1.)/3.);
      radiance += exp(-dot(d,d)/(2.*sigma*sigma));
    }
  }
  return radiance/9.;
}
fn zsPointRadiation(pixel: vec2f, support: vec4f, age: f32,
    dpr: f32, heightCss: f32, enabled: bool) -> vec3f {
  if (!enabled || age < 0. || age >= 1200.) { return vec3f(0.); }
  let sigma = .72*dpr*clamp(heightCss/64.,.75,2.);
  if (any(pixel < support.xy-vec2f(4.*sigma)) ||
      any(pixel > support.xy+support.zw+vec2f(4.*sigma))) { return vec3f(0.); }
  var light = vec3f(0.);
  for(var i = 0u; i < 36u; i++) {
    let site = zsSite(i); let pulse = zsPulse(age,site.z);
    if (pulse <= 0.) { continue; }
    let center = support.xy+site.xy*support.zw;
    let alpha = zsAlpha(center);
    if (alpha <= .02) { continue; }
    let q = pixel-center;
    if (dot(q,q) > 16.*sigma*sigma) { continue; }
    light += vec3f(2.4,3.8,3.15)*pulse*alpha*zsFootprint(q,sigma);
  }
  return light;
}
`;

export const ZERO_OBSERVER_HELPERS = /* wgsl */ `
// Aperture-axis scattering approximation. Both axes are shared by every source.
// It acts on actual current source radiance; OFF cannot synthesize light.
fn zsSample(pixel: vec2f, extent: vec2f) -> vec3f {
  // Outside the observed field there is no known radiance. Do not duplicate
  // the border source via the host sampler's clamp-to-edge address mode.
  let uv = pixel/extent;
  if (any(uv < vec2f(0.)) || any(uv > vec2f(1.))) { return vec3f(0.); }
  return textureSampleLevel(zsSourceTex,zsSampler,uv,0.).rgb;
}
fn zsObserve(pixel: vec2f, extent: vec2f, support: vec4f,
    dpr: f32, heightCss: f32, observerEnabled: bool) -> vec3f {
  let direct = zsSample(pixel,extent);
  if (!observerEnabled) { return direct; }
  let radius = 5.5*dpr*clamp(heightCss/64.,.75,2.);
  if (any(pixel < support.xy-vec2f(radius+4.*dpr)) ||
      any(pixel > support.xy+support.zw+vec2f(radius+4.*dpr))) { return direct; }
  // Clockwise from screen vertical: 22.5 degrees and its perpendicular.
  let axis = vec2f(.3826834323650898,-.9238795325112867);
  let perpendicular = vec2f(-axis.y,axis.x);
  var scattered = vec3f(0.); var norm = 0.;
  for(var i = -12; i <= 12; i++) {
    let t = f32(i)/12.;
    let weight = exp(-2.2*abs(t))*(1.-smoothstep(.80,1.,abs(t)));
    scattered += weight*(
      zsSample(pixel+axis*t*radius,extent)+
      zsSample(pixel+perpendicular*t*radius,extent));
    norm += 2.*weight;
  }
  return .28*direct+.72*scattered/max(norm,.00001);
}
`;
