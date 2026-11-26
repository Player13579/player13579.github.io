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
  var vertices = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  return vec4f(vertices[i], 0, 1);
}

fn srgb(c: vec3f) -> vec3f {
  let x = clamp(c, vec3f(0), vec3f(1));
  return select(12.92 * x, 1.055 * pow(x, vec3f(1.0 / 2.4)) - vec3f(0.055), x > vec3f(0.0031308));
}

fn coverage(d: f32, aa: f32) -> f32 {
  return 1.0 - smoothstep(-aa, aa, d);
}

// A rolled lip: v runs from the glass-facing cut to the matte outer shoulder.
// The two cuts face one another; their slopes and roll set the reflected bands.
fn lipColor(x: f32, lipY: f32, slope: f32, side: f32, v: f32, shut: f32,
            paneLight: f32, filmLight: f32, touch: f32) -> vec3f {
  let inward = normalize(vec2f(side * slope, -side));
  let bank = mix(1.45, 0.12, smoothstep(0.0, 1.0, v)) * (1.0 - 0.34 * shut);
  let n = normalize(vec3f(inward * bank, 1.0));
  let toEye = vec3f(0, 0, 1);
  let toGlass = normalize(vec3f(-x, -lipY, 4.0));
  let halfGlass = normalize(toGlass + toEye);
  let glassLobe = pow(max(dot(n, halfGlass), 0.0), 7.0);
  let cut = 1.0 - smoothstep(0.12, 1.0, v);

  // Low ambient return stays on the moving material after the powered reflection is gone.
  let toFill = normalize(vec3f(-0.28, 0.54, 0.78));
  let facing = max(dot(n, toFill), 0.0);
  let shoulder = 1.0 - 0.62 * smoothstep(0.48, 1.0, v);
  let satin = vec3f(0.095, 0.165, 0.196) * (0.32 + 0.68 * facing) * shoulder;
  let guided = vec3f(0.068, 0.405, 0.340) * filmLight * (0.18 + 0.82 * cut);
  let reflected = vec3f(0.34, 0.48, 0.38) * paneLight * glassLobe * cut;
  // A local change in the satin return as the lips seat, not a relit lens.
  let seatReturn = vec3f(0.118, 0.180, 0.185) * facing * touch * exp(-abs(x) / 12.0) * cut;
  return satin + guided + reflected + seatReturn;
}

@fragment fn fs(@builtin(position) screen: vec4f) -> @location(0) vec4f {
  let bg = vec3f(0.009, 0.019, 0.035);
  let t = view.ageMs;
  if (view.activeFlag < 0.5 || t >= 1070.0) {
    return vec4f(srgb(bg), 1);
  }

  let p = (screen.xy - view.size * 0.5) / view.scale;
  let aa = 0.66 / view.scale;
  let halfW = 35.0;
  if (abs(p.x) > halfW + 5.0 + aa || abs(p.y) > 26.0 + aa) {
    return vec4f(srgb(bg), 1);
  }

  let reveal = smoothstep(0.0, 65.0, t);
  let power = 1.0 - smoothstep(112.0, 310.0, t);
  let shut = smoothstep(238.0, 610.0, t);
  let freeGap = mix(13.8, 8.0, view.reduced) * (1.0 - shut);
  let u = clamp(p.x / halfW, -1.0, 1.0);
  let arch = 1.0 - u * u;
  let archSlope = -2.0 * u / halfW;
  let bow = 1.8 * shut;
  let joint = bow * arch;
  let upperY = (bow - freeGap) * arch;
  let lowerY = (bow + freeGap) * arch;

  // Expose the shoulders during the roll; edge-on at contact they form a single welt.
  let roll = 4.0 * shut * (1.0 - shut);
  let taper = 0.48 + 0.52 * arch;
  let upperDepth = taper * (mix(5.4, 2.35, shut) + 2.8 * roll);
  let lowerDepth = taper * (mix(4.4, 1.65, shut) + 2.3 * roll);
  let outerTop = upperY - upperDepth;
  let outerBottom = lowerY + lowerDepth;
  let vu = clamp((upperY - p.y) / upperDepth, 0.0, 1.0);
  let vl = clamp((p.y - lowerY) / lowerDepth, 0.0, 1.0);

  // Differences of ordered coverages partition the pixel. Even a subpixel gap
  // contributes in proportion to its width, and exactly zero glass survives contact.
  let aboveTop = coverage(p.y - upperY, aa);
  let aboveBottom = coverage(p.y - lowerY, aa);
  let upperArea = aboveTop - coverage(p.y - outerTop, aa);
  let paneArea = aboveBottom - aboveTop;
  let lowerArea = coverage(p.y - outerBottom, aa) - aboveBottom;
  let endHalf = mix(halfW, 2.0, smoothstep(725.0, 1002.0, t));
  let span = coverage(abs(p.x) - endHalf, aa);

  // Light travels sideways through the pane. The bonded cut retains a small
  // fraction as the input dies; the direct reflection has no such storage.
  let pathLoss = exp(-abs(p.x) / 41.0);
  let feed = power * pathLoss;
  let retained = 0.27 * (1.0 - power) * exp(-max(t - 218.0, 0.0) / 136.0);
  let film = (power + retained) * pathLoss;
  let touch = smoothstep(579.0, 610.0, t) * exp(-max(t - 610.0, 0.0) / 86.0);
  let upperCol = lipColor(p.x, upperY, (bow - freeGap) * archSlope, -1.0, vu, shut, feed, film, touch);
  let lowerCol = lipColor(p.x, lowerY, (bow + freeGap) * archSlope, 1.0, vl, shut, feed, film, touch);

  let lensP = p - vec2f(0.0, joint);
  let r = length(lensP);
  let paneFlux = feed * (0.64 + 0.36 * exp(-abs(lensP.y) / 8.0));
  var paneCol = vec3f(0.019, 0.045, 0.065) + vec3f(0.080, 0.465, 0.415) * paneFlux;
  let irisArea = coverage(r - 8.4, aa);
  let pupilArea = coverage(r - 3.45, aa);
  let irisFlux = power * (1.0 - 0.34 * smoothstep(4.0, 8.4, r));
  let irisCol = vec3f(0.056, 0.100, 0.119) + vec3f(0.39, 0.74, 0.55) * irisFlux;
  paneCol = mix(paneCol, irisCol, irisArea);
  paneCol = mix(paneCol, vec3f(0.011, 0.030, 0.040), pupilArea);
  let glintP = (lensP - vec2f(-3.4, -4.0)) / vec2f(2.8, 1.65);
  paneCol += vec3f(0.46, 0.26, 0.26) * power * exp(-dot(glintP, glintP));

  // Short-range spill from the cut, bounded by the sign, behind all solid coverage.
  let outsideY = max(outerTop - p.y, p.y - outerBottom);
  let clearance = length(max(vec2f(abs(p.x) - halfW, outsideY), vec2f(0)));
  let backing = bg + vec3f(0.026, 0.082, 0.080) * feed * (1.0 - smoothstep(0.0, 5.0, clearance));
  let col = backing + span * (upperArea * (upperCol - backing) + paneArea * (paneCol - backing) + lowerArea * (lowerCol - backing));
  let dissolve = 1.0 - smoothstep(846.0, 1028.0, t);
  return vec4f(srgb(mix(bg, col, reveal * dissolve)), 1);
}
