// effect.wgsl — reference pixels, y down; the front of the slot occludes the sheet at lipY.
struct View {
  size: vec2f,
  ageMs: f32,
  scale: f32,
  reduced: f32,
  activeFlag: f32,
  pad: vec2f,
}
@group(0) @binding(0) var<uniform> view: View;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let tri = array<vec2f, 3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
  return vec4f(tri[i], 0, 1);
}
fn roundedBox(p: vec2f, halfSize: vec2f, r: f32) -> f32 {
  let d = abs(p) - halfSize + vec2f(r);
  return length(max(d, vec2f(0))) + min(max(d.x, d.y), 0.0) - r;
}
fn cover(d: f32, aa: f32) -> f32 { return 1.0 - smoothstep(-aa, aa, d); }
fn bell(x: f32) -> f32 { return exp(-x*x); }
fn displayRGB(c: vec3f) -> vec3f {
  let x = clamp(c / (1.0 + 0.32*c), vec3f(0), vec3f(1));
  return select(12.92*x, 1.055*pow(x, vec3f(1.0/2.4))-0.055, x > vec3f(0.0031308));
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let px = max(view.scale, 0.001);
  let p = (pos.xy - 0.5*view.size)/px + vec2f(0,-10);
  let aa = 0.66/px;
  let live = view.activeFlag > 0.5 && view.ageMs >= 0.0 && view.ageMs < 920.0;
  let t = select(0.0, view.ageMs, live);
  let still = view.reduced > 0.5;
  let approach = smoothstep(0.0, 210.0, t);
  let feed = smoothstep(210.0, 575.0, t);
  let rise = smoothstep(0.0, 90.0, t);
  let lamp = rise * (0.66 + 0.34*smoothstep(205.0, 285.0, t)) * (1.0-smoothstep(635.0, 920.0, t));
  let lipY = 2.4;
  let halfPaper = vec2f(19.5,25.0);
  let leadX = select(-8.0*(1.0-approach), 0.0, still);
  let bottom = select(mix(-18.0, lipY, approach) + 51.5*feed, lipY+4.0, still);
  let opacity = rise * (1.0-select(smoothstep(0.97,1.0,feed), smoothstep(275.0,575.0,t), still));

  // A recessed opal guide: initially concentrated under the approaching edge,
  // with the whole guide carrying light once the trailing edge has passed.
  let reach = select(18.0 + 16.0*feed, 29.0, still);
  let drive = lamp * (0.39 + 0.61*bell((p.x-leadX)/reach));
  let pool = drive * bell(max(abs(p.x)-22.0,0.0)/24.0) * bell((p.y-2.0)/24.0);
  let returned = opacity * smoothstep(-19.0,lipY,bottom) * bell((p.x-leadX)/16.5);
  let bed = roundedBox(p-vec2f(0,9), vec2f(59,22), 11.0);
  let body = roundedBox(p-vec2f(0,6), vec2f(47,13), 7.5);
  let slit = roundedBox(p-vec2f(0,-0.5), vec2f(38,3.7), 3.6);
  var c = vec3f(0.010,0.017,0.026) + vec3f(0.055,0.115,0.103)*pool;
  let bedColor = vec3f(0.034,0.053,0.066) + vec3f(0.13,0.27,0.24)*pool;
  c = mix(c, bedColor*(0.78+0.22*smoothstep(-3.0,0.0,bed)), cover(bed,aa));

  let bevel = 1.0-smoothstep(4.0,19.0,p.y);
  let satin = vec3f(0.049,0.081,0.089) + vec3f(0.043,0.058,0.060)*bevel;
  let wrap = exp(-abs(p.y-lipY)/16.0);
  let shoulder = bell((p.y-5.6)/3.4);
  let litBody = satin + drive*wrap*(vec3f(0.26,0.62,0.51) + vec3f(0.30,0.40,0.33)*shoulder)
                      + lamp*returned*wrap*vec3f(0.22,0.13,0.044);
  c = mix(c, litBody, cover(body,aa));
  c = mix(c, vec3f(0.006,0.012,0.015), cover(slit,aa));
  let guide = roundedBox(p-vec2f(0,-2.5), vec2f(35.6,1.25), 1.2);
  c = mix(c, vec3f(0.07,0.11,0.12) + drive*vec3f(0.93,1.22,0.90), cover(guide,aa));
  c += vec3f(0.105,0.17,0.12)*drive*exp(-max(guide,0.0)/3.0);

  if (opacity > 0.0) {
    // Pivot about the leading edge. The triangular flap is the reverse of the same sheet.
    let angle = select(-0.18*(1.0-approach), 0.0, still);
    let v = p-vec2f(leadX,bottom);
    let q = vec2f(dot(v,vec2f(cos(angle),sin(angle))), dot(v,vec2f(-sin(angle),cos(angle)))+halfPaper.y);
    let corner = vec2f(halfPaper.x-q.x, q.y+halfPaper.y);
    let cut = (9.0-corner.x-corner.y)*0.707107;
    let paper = max(roundedBox(q,halfPaper,1.1), cut);
    let visibleD = max(paper, p.y-lipY);
    let fold = cover(max(corner.x,corner.y)-9.0,aa);
    let curl = 1.0-0.27*smoothstep(5.5,19.5,q.x) - 0.10*smoothstep(14.0,19.5,-q.x);
    let incident = lamp*(0.28+0.83*exp(-max(lipY-p.y,0.0)/38.0)) * curl;
    let face = vec3f(0.29,0.30,0.25)*curl + vec3f(1.08,0.90,0.54)*incident;
    let reverse = vec3f(0.15,0.20,0.20) + vec3f(0.49,0.66,0.54)*incident;
    // Short-range image spread only from the exposed stock; keep the front lip solid.
    let bleed = opacity*incident*exp(-max(visibleD,0.0)/3.7)*(1.0-smoothstep(lipY,lipY+3.0,p.y));
    c += vec3f(0.23,0.18,0.10)*bleed;
    c = mix(c, mix(face,reverse,fold), opacity*cover(visibleD,aa));
  }
  return vec4f(displayRGB(c), 1.0);
}
