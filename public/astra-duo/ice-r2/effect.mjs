export const title = "投擲氷の着地破砕";
export const duration = 1.32;

export const shader = `
fn iceOver(top: vec4f, under: vec4f) -> vec4f {
  return top + under * (1.0 - top.a);
}
fn icePaint(c: vec3f, a: f32) -> vec4f {
  return vec4f(c * a, a);
}
fn iceRotation(p: vec2f, a: f32) -> vec2f {
  return vec2f(cos(a)*p.x - sin(a)*p.y, sin(a)*p.x + cos(a)*p.y);
}
// Three planar cells share one irregular crown until their fracture planes open.
fn iceCell(p: vec2f, k: i32) -> f32 {
  let rim = max(max(abs(p.x + 0.15*p.y)-0.44, abs(p.y-0.11*p.x)-0.26),
                max(abs(dot(p,vec2f(0.77,0.64)))-0.397, abs(dot(p,vec2f(-0.69,0.724)))-0.364));
  let left = dot(p,vec2f(0.87,0.49))+0.018;
  let fork = dot(p,vec2f(-0.33,0.944))-0.035;
  if (k == 0) { return max(rim,left); }
  if (k == 1) { return max(rim,max(-left,fork)); }
  return max(rim,max(-left,-fork));
}
struct IceMotion {
  pivot: vec2f,
  sole: vec2f,
  spin: f32,
  hop: f32,
}
fn iceMotion(k: i32, split: f32) -> IceMotion {
  let pivot = array<vec2f,3>(vec2f(-0.22,-0.01),vec2f(0.17,-0.10),vec2f(0.12,0.155))[k];
  let drift = array<vec2f,3>(vec2f(-0.52,0.085),vec2f(0.40,-0.20),vec2f(0.26,0.30))[k];
  let flight = array<f32,3>(0.34,0.45,0.29)[k];
  let phase = clamp(split/flight,0.0,1.0);
  let hop = array<f32,3>(0.15,0.30,0.09)[k]*4.0*phase*(1.0-phase);
  let travel = phase*0.84 + 0.16*(1.0-exp(-8.0*max(0.0,split-flight)));
  let spin = array<f32,3>(-0.33,0.56,-0.19)[k]*travel;
  return IceMotion(pivot,pivot+drift*travel,spin,hop);
}
fn effect(uv: vec2f, t: f32, size: vec2f) -> vec4f {
  if (t < 0.0 || t >= 1.32) { return vec4f(0.0); }
  let aa = 0.012;
  let split = max(0.0,t-0.048);
  let reveal = smoothstep(0.0,0.022,t);
  let fade = (1.0-smoothstep(0.93,1.32,t))*reveal;
  var groundLight = 0.0;
  var castShadow = 0.0;
  for (var k = 0; k < 3; k++) {
    let motion = iceMotion(k,split);
    // Project the actual underside onto the floor. It joins the visible foot at zero hop.
    let base = uv-motion.sole-vec2f(0.024,0.006);
    let spillPoint = iceRotation(base-vec2f(0.085,0.085),-motion.spin)+motion.pivot;
    let spillDistance = iceCell(spillPoint,k);
    let nearFloor = 1.0-smoothstep(0.0,0.31,motion.hop);
    let spill = (1.0-smoothstep(-0.04,0.20,spillDistance))*(0.65+0.35*nearFloor);
    groundLight = max(groundLight,spill);
    let offset = vec2f(0.044,0.050)+vec2f(0.25,0.12)*motion.hop;
    let shadowPoint = iceRotation(base-offset,-motion.spin)+motion.pivot;
    let penumbra = 0.022+0.12*motion.hop;
    let shade = (1.0-smoothstep(-0.028,penumbra,iceCell(shadowPoint,k)))*(0.64+0.36*nearFloor);
    castShadow = max(castShadow,shade);
  }
  // Cold light transmitted through the ice makes the dark contact edge readable.
  var outc = icePaint(vec3f(0.13,0.27,0.32),groundLight*0.80*fade);
  outc = iceOver(icePaint(vec3f(0.020,0.052,0.068),castShadow*0.87*fade),outc);
  for (var k = 0; k < 3; k++) {
    let motion = iceMotion(k,split);
    let pivot = motion.pivot;
    let spin = motion.spin;
    let q = iceRotation(uv-motion.sole+vec2f(0.0,motion.hop+0.11),-spin)+pivot;
    let face = iceCell(q,k);
    // Sweep the crown down through the thickness. The exposed plane is darkest at the foot.
    var wall = face;
    for(var j = 1; j <= 6; j++) {
      wall = min(wall,iceCell(q-iceRotation(vec2f(0.024,0.116),-spin)*(f32(j)/6.0),k));
    }
    let body = 1.0-smoothstep(-aa,aa,wall);
    let crown = 1.0-smoothstep(-aa,aa,face);
    let transmitted = smoothstep(-0.34,0.24,q.x-0.47*q.y);
    let blue = mix(vec3f(0.115,0.345,0.45),vec3f(0.40,0.77,0.82),transmitted);
    outc = iceOver(icePaint(blue,fade*body*0.90),outc);
    let ridge = (1.0-smoothstep(0.007,0.035,abs(face+0.012))) *
                clamp(0.70-q.y+0.28*q.x,0.22,1.0);
    let facet = smoothstep(-0.014,0.014,dot(q-pivot,vec2f(0.57,0.82))-0.035);
    var tint = mix(vec3f(0.38,0.69,0.77),vec3f(0.68,0.88,0.90),transmitted);
    tint += vec3f(0.079,0.065,0.04)*facet;
    tint = mix(tint,vec3f(0.90,0.99,1.0),ridge);
    outc = iceOver(icePaint(tint,fade*crown*(0.70+0.26*ridge)),outc);
  }
  return outc;
}`;

export function playSound(ctx, dest) {
  const start = ctx.currentTime;
  const tone = (at, hz, endHz, length, level) => {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.frequency.setValueAtTime(hz, at);
    osc.frequency.exponentialRampToValueAtTime(endHz, at + length);
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(level, at + 0.003);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(amp);
    amp.connect(dest);
    osc.start(at);
    osc.stop(at + length + 0.005);
    osc.onended = () => { osc.disconnect(); amp.disconnect(); };
  };
  tone(start, 175, 62, 0.115, 0.33);
  const crack = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.058), ctx.sampleRate);
  const samples = crack.getChannelData(0);
  let seed = 1309;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    samples[i] = (seed / 2147483648 - 1) * Math.exp(-5*i/samples.length);
  }
  const src = ctx.createBufferSource();
  const band = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = crack;
  band.type = 'bandpass';
  band.frequency.value = 2250;
  band.Q.value = 0.75;
  gain.gain.value = 0.42;
  src.connect(band); band.connect(gain); gain.connect(dest);
  src.start(start + 0.048);
  src.onended = () => { src.disconnect(); band.disconnect(); gain.disconnect(); };
  for (const [delay, hz, level] of [[0.338, 680, 0.11], [0.388, 492, 0.14], [0.498, 970, 0.095]]) {
    tone(start + delay, hz, hz*0.86, 0.062, level);
    tone(start + delay, hz*2.38, hz*2.22, 0.037, level*0.34);
  }
}
