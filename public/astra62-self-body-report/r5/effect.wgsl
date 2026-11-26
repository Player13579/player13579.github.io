struct View {
    size: vec2f,
    ageMs: f32,
    scale: f32,
    reduced: f32,
    activeFlag: f32,
    pad: vec2f,
}

@group(0) @binding(0) var<uniform> view: View;

const CREST_MS: f32 = 370.0;
const TRAVEL_MS: f32 = 390.0;
const CONTACT_RADIUS: f32 = 3.1;
const FULL_RUN: f32 = 27.0;
const SHORT_RUN: f32 = 10.0;
const CAP_RADIUS: f32 = 2.72;
const CAP_SKIRT: f32 = 1.20;
const PORT_AA_MAX: f32 = 1.20;
const REAR_FACE: f32 = 1.15;
const REAR_BLEND_MIN: f32 = 0.70;
const REAR_BLEND_MAX: f32 = 0.85;
const ARC_SKIRT: f32 = 4.0;

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let corner = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
    return vec4f(2.0 * corner - vec2f(1.0), 0.0, 1.0);
}

fn encodeSrgb(linearColor: vec3f) -> vec3f {
    let x = clamp(linearColor, vec3f(0.0), vec3f(1.0));
    let upper = 1.055 * pow(x, vec3f(1.0 / 2.4)) - vec3f(0.055);
    return select(12.92 * x, upper, x > vec3f(0.0031308));
}

fn coverage(d: f32, aa: f32) -> f32 {
    return 1.0 - smoothstep(-aa, aa, d);
}

fn nearby(d: f32, reach: f32) -> f32 {
    let k = 1.0 - smoothstep(0.0, reach, max(0.0, d));
    return k * k;
}

fn illuminate(baseColor: vec3f, flux: vec3f) -> vec3f {
    let room = max(vec3f(0.001), vec3f(1.0) - baseColor);
    return baseColor + room * (vec3f(1.0) - exp(-flux / room));
}

fn roundedRect(p: vec2f, halfSize: vec2f, rounding: f32) -> f32 {
    let k = abs(p) - halfSize + vec2f(rounding);
    return length(max(k, vec2f(0.0))) + min(max(k.x, k.y), 0.0) - rounding;
}

fn strokeDistance(p: vec2f, a: vec2f, b: vec2f) -> f32 {
    let v = b - a;
    let u = clamp(dot(p - a, v) / max(dot(v, v), 0.0001), 0.0, 1.0);
    return length(p - (a + u * v));
}

fn signDistance(q: vec2f) -> f32 {
    let head = length(q - vec2f(-12.6, -2.0)) - 2.72;
    let trunk = strokeDistance(q, vec2f(-2.1, -1.55), vec2f(2.55, 0.65)) - 2.34;
    let knee = vec2f(6.35, -2.85);
    let thigh = strokeDistance(q, vec2f(2.15, 0.69), knee) - 1.90;
    let shin = strokeDistance(q, knee, vec2f(10.35, 2.35)) - 1.75;
    return min(min(head, trunk), min(thigh, shin));
}

fn stripSection(q: vec2f, a: vec2f, b: vec2f, lo: f32, hi: f32) -> vec3f {
    let v = b - a;
    let vv = max(dot(v, v), 0.0001);
    let u = clamp(dot(q - a, v) / vv, 0.0, 1.0);
    let offset = q - (a + u * v);
    return vec3f(length(offset), mix(lo, hi, u), dot(offset, vec2f(-v.y, v.x)) * inverseSqrt(vv));
}

fn nearerStrip(a: vec3f, b: vec3f) -> vec3f {
    return select(a, b, b.x < a.x);
}

fn foldedStrip(q: vec2f) -> vec3f {
    let a = vec2f(-14.0, 3.7);
    let b = vec2f(-10.0, 10.0);
    let c = vec2f(12.2, 10.0);
    let d = vec2f(17.25, 5.0);
    let e = vec2f(17.25, -7.4);
    let f = vec2f(12.1, -13.2);
    var s = stripSection(q, a, b, 0.0, 0.13);
    s = nearerStrip(s, stripSection(q, b, c, 0.13, 0.52));
    s = nearerStrip(s, stripSection(q, c, d, 0.52, 0.65));
    s = nearerStrip(s, stripSection(q, d, e, 0.65, 0.86));
    return nearerStrip(s, stripSection(q, e, f, 0.86, 1.0));
}

fn travelPhase(t: f32) -> f32 {
    return clamp((t - CREST_MS) / TRAVEL_MS, 0.0, 1.0);
}

fn frontRadius(u: f32, reduced: f32) -> f32 {
    let m = clamp(reduced, 0.0, 1.0);
    return CONTACT_RADIUS + mix(FULL_RUN, SHORT_RUN, m) * mix(u, u * (2.0 - u), m);
}

fn releaseBlend(aa: f32) -> f32 {
    return clamp(aa, REAR_BLEND_MIN, REAR_BLEND_MAX);
}

// Shared back face of the moving material, not a mask on the composited scene.
// Both arc terms vanish at radial <= radius - REAR_FACE - releaseBlend(aa).
fn backFace(radial: f32, radius: f32, aa: f32) -> f32 {
    let b = releaseBlend(aa);
    return smoothstep(-REAR_FACE - b, -REAR_FACE + b, radial - radius);
}

fn waveGeometry(at: vec2f, radius: f32, travel: f32) -> vec3f {
    let axis = normalize(vec2f(0.72, -0.694));
    let side = vec2f(-axis.y, axis.x);
    let radial = length(at);
    let direction = at / max(radial, 0.0001);
    let endSign = select(-1.0, 1.0, dot(at, side) >= 0.0);
    let endDir = 0.64 * axis + (sqrt(1.0 - 0.64 * 0.64) * endSign) * side;
    let nearestDir = select(endDir, direction, dot(direction, axis) >= 0.64);
    let crown = smoothstep(0.64, 0.97, dot(nearestDir, axis));
    let halfWidth = mix(1.48, 2.55, smoothstep(0.0, 0.35, travel)) * mix(0.72, 1.0, crown);
    let d = length(at - radius * nearestDir) - halfWidth;
    return vec3f(d, smoothstep(-halfWidth, 0.85 * halfWidth, radial - radius), crown);
}

@fragment
fn fs(@builtin(position) px: vec4f) -> @location(0) vec4f {
    let bg = vec3f(0.021, 0.019, 0.032);
    let t = view.ageMs;
    if (view.activeFlag < 0.5 || t <= 0.0 || t >= 1120.0) {
        return vec4f(encodeSrgb(bg), 1.0);
    }

    let drawScale = max(view.scale, 0.001);
    let aa = 0.67 / drawScale;
    let portAA = min(aa, PORT_AA_MAX);
    let q = (px.xy - 0.5 * view.size) / drawScale - vec2f(-5.0, 7.0);
    if (max(abs(q.x), abs(q.y)) > 72.0 + aa || t >= 1090.0) {
        return vec4f(encodeSrgb(bg), 1.0);
    }
    let presence = smoothstep(0.0, 78.0, t) * (1.0 - smoothstep(865.0, 1090.0, t));
    let root = vec2f(12.0, -12.0);
    let tip = vec2f(15.0, -27.0);
    let at = q - tip;
    let radial = length(at);
    let capD = radial - CAP_RADIUS;

    let sinceCrest = max(0.0, t - CREST_MS);
    let quick = exp(-sinceCrest / 82.0);
    let slow = exp(-sinceCrest / 560.0);
    let paneStore = 0.20 + 0.16 * quick + 0.64 * slow;
    let bandStore = 0.23 * quick + 0.77 * slow;
    let mastStore = 0.47 * quick + 0.53 * slow;
    let rise = smoothstep(320.0, CREST_MS, t);
    let pilot = rise * rise * (0.84 * exp(-sinceCrest / 52.0) + 0.16 * exp(-sinceCrest / 225.0));

    let travel = travelPhase(t);
    let radius = frontRadius(travel, view.reduced);
    let arc = waveGeometry(at, radius, travel);
    let transfer = 1.0 - exp(-sinceCrest / 31.0);
    let carrier = transfer * (1.0 - smoothstep(595.0, 780.0, t)) / (1.0 + 0.46 * travel);
    let sectionGain = carrier * backFace(radial, radius, aa);
    let arcColor = mix(vec3f(1.06, 0.32, 0.058), vec3f(1.74, 1.04, 0.37), arc.y);
    let arcLight = arcColor * (sectionGain * mix(0.76, 1.0, arc.z) * coverage(arc.x, portAA));
    let arcSkirt = vec3f(0.24, 0.089, 0.017) * (sectionGain * nearby(arc.x, ARC_SKIRT));
    let capSkirt = vec3f(0.34, 0.14, 0.034) * (pilot * nearby(capD, CAP_SKIRT));
    var color = illuminate(bg, arcLight + arcSkirt + capSkirt);

    // Only the surface-bound catch extends down the mast; it cannot fill free space.
    let mastData = stripSection(q, root, tip, 0.0, 1.0);
    let mastMask = coverage(mastData.x - 1.88, portAA);
    let mastStation = mastData.y;
    let mastFill = mastStore * smoothstep(306.0 + 14.0 * mastStation, 350.0 + 20.0 * mastStation, t);
    let insertMask = smoothstep(-1.36, -0.53, mastData.z) * (1.0 - smoothstep(1.08, 1.65, mastData.z));
    let metalFace = smoothstep(-1.48, 1.35, mastData.z);
    let metalColor = mix(vec3f(0.081, 0.055, 0.061), vec3f(0.32, 0.21, 0.15), metalFace);
    let mastLight = vec3f(1.20, 0.61, 0.15) * (mastFill * insertMask)
                  + vec3f(0.53, 0.27, 0.081) * (pilot * nearby(capD, 11.8) * metalFace);
    color = mix(color, illuminate(metalColor, mastLight), mastMask);

    let shellD = roundedRect(q, vec2f(21.0, 14.0), 4.0);
    let s = foldedStrip(q);
    let stripD = s.x - mix(1.96, 2.42, smoothstep(0.45, 0.74, s.y));
    let stripMask = coverage(stripD, aa);
    let flow = bandStore * smoothstep(170.0 + 136.0 * s.y, 214.0 + 136.0 * s.y, t);
    let foldFace = smoothstep(-1.15, 1.56, s.z);

    let paneBox = roundedRect(q - vec2f(-2.35, -1.4), vec2f(15.55, 7.8), 2.15);
    let paneD = max(paneBox, max(q.x - q.y - 18.3, q.y - q.x - 20.2) * 0.70710678);
    let station = clamp((q.x + 17.9 + 0.25 * (q.y + 1.4)) / 31.1, 0.0, 1.0);
    let charged = smoothstep(78.0 + 104.0 * station, 134.0 + 104.0 * station, t);
    let stored = charged * paneStore;

    let enamel = mix(vec3f(0.19, 0.037, 0.043), vec3f(0.41, 0.083, 0.055),
                     smoothstep(-16.0, 9.0, -q.y - 0.30 * q.x));
    let resin = mix(vec3f(0.20, 0.051, 0.037), vec3f(0.42, 0.12, 0.052), foldFace);
    let resinFlux = mix(vec3f(0.87, 0.235, 0.046), vec3f(1.54, 0.78, 0.19), foldFace);
    let upperLip = (1.0 - smoothstep(-8.5, -5.0, q.y)) * smoothstep(-16.0, -6.0, q.x)
                 * (1.0 - smoothstep(8.0, 14.0, q.x));
    let shoulder = smoothstep(5.0, 12.0, q.x) * (1.0 - smoothstep(-12.0, -7.2, q.y));
    let shellCatch = vec3f(0.52, 0.15, 0.038) * (flow * nearby(stripD, 4.8))
                   + vec3f(0.38, 0.13, 0.039) * (stored * upperLip * nearby(paneD, 5.2))
                   + vec3f(0.64, 0.28, 0.069) * (pilot * shoulder * nearby(capD, 21.0));
    var housing = mix(illuminate(enamel, shellCatch), illuminate(resin, resinFlux * flow), stripMask);

    let joint = stripMask * (1.0 - smoothstep(0.06, 0.16, s.y));
    let seatMask = coverage(paneD - 1.40, aa) * (1.0 - joint);
    let wallCatch = stored * smoothstep(1.5, 6.0, q.y) * nearby(paneD, 1.40);
    let wallColor = illuminate(vec3f(0.046, 0.025, 0.034), vec3f(0.36, 0.14, 0.032) * wallCatch);
    housing = mix(housing, wallColor, seatMask);
    let cutFace = smoothstep(-1.6, 1.8, q.y + 0.25 * q.x + 3.60);
    let glassColor = mix(vec3f(0.056, 0.039, 0.040), vec3f(0.094, 0.058, 0.047), cutFace);
    let glassFlux = mix(vec3f(1.01, 0.36, 0.064), vec3f(1.46, 0.84, 0.26), cutFace);
    let clearGlass = illuminate(glassColor, glassFlux * stored);
    let printedPane = mix(clearGlass, vec3f(0.036, 0.021, 0.027), coverage(signDistance(q), aa));
    housing = mix(housing, printedPane, coverage(paneD, aa));
    color = mix(color, housing, coverage(shellD, aa));

    let capFacet = smoothstep(-1.9, 1.65, 0.68 * at.x - 0.73 * at.y);
    let capColor = mix(vec3f(0.17, 0.062, 0.032), vec3f(0.31, 0.135, 0.060), capFacet);
    let capFlux = mix(vec3f(1.30, 0.63, 0.17), vec3f(1.98, 1.36, 0.69), capFacet) * pilot;
    color = mix(color, illuminate(capColor, capFlux), coverage(capD, portAA));
    return vec4f(encodeSrgb(mix(bg, color, presence)), 1.0);
}
