struct View {
    size: vec2f,
    ageMs: f32,
    scale: f32,
    reduced: f32,
    activeFlag: f32,
    pad: vec2f,
}

@group(0) @binding(0) var<uniform> view: View;

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

// Finite support, including at the ends of a cut or a stroke.
fn nearby(d: f32, reach: f32) -> f32 {
    let k = 1.0 - smoothstep(0.0, reach, max(d, 0.0));
    return k * k;
}

fn illuminate(baseColor: vec3f, light: vec3f) -> vec3f {
    let room = max(vec3f(0.001), vec3f(1.0) - baseColor);
    return baseColor + room * (vec3f(1.0) - exp(-light / room));
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

// Opaque print in the guide: separated head, reclined trunk, bent leg.
fn signDistance(q: vec2f) -> f32 {
    let head = length(q - vec2f(-10.2, -2.15)) - 2.55;
    let trunk = strokeDistance(q, vec2f(-3.05, -1.55), vec2f(1.6, 0.15)) - 2.30;
    let thigh = strokeDistance(q, vec2f(1.35, 0.45), vec2f(5.5, -1.35)) - 1.65;
    let shin = strokeDistance(q, vec2f(5.5, -1.35), vec2f(10.15, 1.4)) - 1.48;
    return min(min(head, trunk), min(thigh, shin));
}

// Return (distance to strip axis, station on the whole fold, signed cross-strip position).
fn stripSection(q: vec2f, a: vec2f, b: vec2f, lo: f32, hi: f32) -> vec3f {
    let v = b - a;
    let vv = max(dot(v, v), 0.0001);
    let u = clamp(dot(q - a, v) / vv, 0.0, 1.0);
    let offset = q - (a + u * v);
    let across = dot(offset, vec2f(-v.y, v.x)) * inverseSqrt(vv);
    return vec3f(length(offset), mix(lo, hi, u), across);
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

// Nearest point on ONE finite circular arc; its round ends use the same distance as its face.
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
    let leadingSide = smoothstep(-halfWidth, 0.85 * halfWidth, radial - radius);
    return vec3f(d, leadingSide, crown);
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
    let q = (px.xy - 0.5 * view.size) / drawScale - vec2f(-5.0, 7.0);
    let presence = smoothstep(0.0, 78.0, t) * (1.0 - smoothstep(865.0, 1090.0, t));
    if (max(abs(q.x), abs(q.y)) > 72.0 + aa || t >= 1090.0) {
        return vec4f(encodeSrgb(bg), 1.0);
    }

    let root = vec2f(12.0, -12.0);
    let tip = vec2f(15.0, -27.0);
    let at = q - tip;
    let capD = length(at) - 2.72;
    let pilot = smoothstep(320.0, 370.0, t) * (1.0 - smoothstep(498.0, 716.0, t));
    let feedTail = 1.0 - smoothstep(410.0, 595.0, t);

    // The slightly pre-opened envelope is still at the contact radius until the carrier cue.
    let travel = clamp((t - 370.0) / 390.0, 0.0, 1.0);
    let radius = 3.1 + travel * mix(27.0, 10.0, clamp(view.reduced, 0.0, 1.0));
    let pulse = smoothstep(365.0, 395.0, t) * (1.0 - smoothstep(595.0, 780.0, t));
    let arc = waveGeometry(at, radius, travel);
    let beaconColor = vec3f(1.35, 0.50, 0.092);
    let arcColor = mix(vec3f(1.08, 0.29, 0.044), vec3f(1.72, 1.04, 0.39), arc.y);
    let arcLight = arcColor * (coverage(arc.x, aa) * pulse * mix(0.77, 1.0, arc.z));
    let localSpread = 0.27 * pilot * nearby(capD, 9.5) + 0.19 * pulse * nearby(arc.x, 6.8);
    var color = illuminate(bg, arcLight + beaconColor * localSpread);

    // A light-carrying insert in a metal mast, behind the opaque shoulder of the case.
    let mastData = stripSection(q, root, tip, 0.0, 1.0);
    let mastMask = coverage(mastData.x - 1.88, aa);
    let mastStation = mastData.y;
    let mastFill = smoothstep(306.0 + 14.0 * mastStation, 350.0 + 20.0 * mastStation, t) * feedTail;
    let insertMask = smoothstep(-1.36, -0.53, mastData.z) * (1.0 - smoothstep(1.08, 1.65, mastData.z));
    let metalFace = smoothstep(-1.48, 1.35, mastData.z);
    let metalColor = mix(vec3f(0.094, 0.064, 0.069), vec3f(0.37, 0.24, 0.17), metalFace);
    let mastLight = vec3f(1.24, 0.53, 0.12) * (mastFill * insertMask)
                  + beaconColor * (pilot * nearby(capD, 13.0) * (0.16 + 0.45 * metalFace));
    color = mix(color, illuminate(metalColor, mastLight), mastMask);

    // Brick enamel. Only the translucent folded section and its adjacent land follow the feed.
    let shellD = roundedRect(q, vec2f(21.0, 14.0), 4.0);
    let shellMask = coverage(shellD, aa);
    let s = foldedStrip(q);
    let stripD = s.x - mix(1.96, 2.42, smoothstep(0.45, 0.74, s.y));
    let stripMask = coverage(stripD, aa);
    let flow = smoothstep(170.0 + 136.0 * s.y, 214.0 + 136.0 * s.y, t) * feedTail;
    let foldFace = smoothstep(-1.15, 1.56, s.z);
    let enamel = mix(vec3f(0.21, 0.043, 0.050), vec3f(0.43, 0.093, 0.060),
                     smoothstep(-16.0, 9.0, -q.y - 0.30 * q.x));
    let resin = mix(vec3f(0.21, 0.052, 0.040), vec3f(0.45, 0.126, 0.055), foldFace);
    let resinFlux = mix(vec3f(0.85, 0.18, 0.028), vec3f(1.58, 0.68, 0.15), foldFace);
    let topLand = smoothstep(5.0, 12.0, q.x) * (1.0 - smoothstep(-12.0, -7.2, q.y));
    let shellCatch = vec3f(0.40, 0.102, 0.024) * (flow * nearby(stripD, 3.8))
                   + beaconColor * (0.53 * pilot * topLand * nearby(capD, 20.0));
    var housing = illuminate(mix(enamel, resin, stripMask), shellCatch + resinFlux * (stripMask * flow));

    // Cut-corner glass. Across its oblique ground face the broad emitting area changes depth/color.
    let paneBox = roundedRect(q - vec2f(-1.8, -1.4), vec2f(15.0, 7.8), 2.15);
    let paneD = max(paneBox, max(q.x - q.y - 18.3, q.y - q.x - 20.2) * 0.70710678);
    let station = clamp((q.x + 16.7 + 0.25 * (q.y + 1.4)) / 30.0, 0.0, 1.0);
    let charged = smoothstep(78.0 + 104.0 * station, 134.0 + 104.0 * station, t);
    let stored = charged * (1.0 - 0.43 * smoothstep(350.0, 595.0, t));
    let cutFace = smoothstep(-1.9, 2.1, q.y + 0.31 * q.x + 1.15);
    let glassColor = mix(vec3f(0.048, 0.038, 0.047), vec3f(0.085, 0.053, 0.052), cutFace);
    let glassFlux = mix(vec3f(0.90, 0.255, 0.045), vec3f(1.54, 0.87, 0.30), cutFace);

    // Black seal, opened only where the strip leaves the plate. The lower cut wall takes pane light.
    let joint = stripMask * (1.0 - smoothstep(0.06, 0.16, s.y));
    let seatMask = coverage(paneD - 1.40, aa) * (1.0 - joint);
    let wallCatch = stored * smoothstep(1.5, 6.0, q.y) * nearby(paneD, 1.40);
    housing = mix(housing, illuminate(vec3f(0.046, 0.025, 0.034), vec3f(0.36, 0.14, 0.032) * wallCatch), seatMask);
    let printMask = coverage(signDistance(q), aa);
    let clearGlass = illuminate(glassColor, glassFlux * stored);
    let darkPrint = mix(glassColor, vec3f(0.042, 0.024, 0.030), charged);
    housing = mix(housing, mix(clearGlass, darkPrint, printMask), coverage(paneD, aa));
    color = mix(color, housing, shellMask);

    let capFacet = smoothstep(-1.9, 1.65, 0.68 * at.x - 0.73 * at.y);
    let capColor = mix(vec3f(0.30, 0.13, 0.070), vec3f(0.48, 0.26, 0.12), capFacet);
    let capFlux = mix(beaconColor, vec3f(2.05, 1.32, 0.62), capFacet) * pilot;
    color = mix(color, illuminate(capColor, capFlux), coverage(capD, aa));

    return vec4f(encodeSrgb(mix(bg, color, presence)), 1.0);
}