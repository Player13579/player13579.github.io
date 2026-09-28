// r0.4 analytic-volume renderer. No decoded image inputs; every shape is procedural.
// Goal at H64: one connected outer reserve -> inward delivery -> internal stored capacity.
struct Globals {
  view: vec4f,
  counts: vec4f,
  optical: vec4f,
  fixture: vec4f,
}
struct Volume {
  centerOpacity: vec4f,
  extentKind: vec4f,
  orientationEmission: vec4f, // cos, sin, emission, local_payload
  response: vec4f,            // local_flow_or_receipt, global_charge, global_outside, phase_tag
}
struct BodyPart {
  centerProtection: vec4f,
  extentKind: vec4f,
  orientation: vec4f,
  albedo: vec4f,
}
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}
struct SceneOutput {
  @location(0) radiance: vec4f,
  @location(1) bloomSeed: vec4f,
}
@group(0) @binding(0) var<uniform> globals: Globals;
@group(0) @binding(1) var<storage, read> volumes: array<Volume>;
@group(0) @binding(2) var<storage, read> bodyParts: array<BodyPart>;

@vertex fn fullscreenVertex(@builtin(vertex_index) index: u32) -> VertexOutput {
  let vertices = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  let xy = vertices[index];
  var result: VertexOutput;
  result.position = vec4f(xy, 0.0, 1.0);
  result.uv = xy * vec2f(0.5, -0.5) + vec2f(0.5);
  return result;
}
fn rotateToLocal(v: vec2f, rotation: vec2f) -> vec2f {
  return vec2f(rotation.x * v.x + rotation.y * v.y, -rotation.y * v.x + rotation.x * v.y);
}
fn rotateToWorld(v: vec2f, rotation: vec2f) -> vec2f {
  return vec2f(rotation.x * v.x - rotation.y * v.y, rotation.y * v.x + rotation.x * v.y);
}
fn normalAt(unitLocal: vec3f, extent: vec3f, rotation: vec2f) -> vec3f {
  let gradient = unitLocal / max(extent, vec3f(0.001));
  return normalize(vec3f(rotateToWorld(gradient.xy, rotation), gradient.z) + vec3f(0.0, 0.0, 0.00001));
}
fn receivingLight(worldPoint: vec3f, surfaceNormal: vec3f) -> vec3f {
  var incident = vec3f(0.0);
  for (var i = 0u; i < u32(globals.counts.x); i++) {
    let v = volumes[i];
    let delta = v.centerOpacity.xyz - worldPoint;
    let normalizedDistance = length(delta / max(v.extentKind.xyz, vec3f(1.0)));
    let attenuation = exp(-1.55 * max(0.0, normalizedDistance - 0.18));
    let facing = max(0.0, dot(surfaceNormal, normalize(delta + vec3f(0.0,0.0,0.001))));
    incident += vec3f(0.05, 0.24, 0.46) * attenuation * facing * v.centerOpacity.w * v.orientationEmission.z;
  }
  return min(incident, vec3f(0.14, 0.52, 0.80)) * globals.optical.y;
}

@fragment fn sceneFragment(input: VertexOutput) -> SceneOutput {
  let xy = vec2f((input.position.x - globals.view.x * 0.5) / globals.view.z + globals.fixture.x,
                 (globals.view.w - input.position.y) / globals.view.z);
  let darkBackground = vec3f(0.009, 0.013, 0.025);
  let lightBackground = vec3f(0.77, 0.80, 0.85);
  var background = mix(darkBackground, lightBackground, globals.counts.z);
  if (globals.fixture.y > 0.5) {
    let groundLine = (1.0 - smoothstep(0.20, 0.65, abs(xy.y))) * 0.085;
    background = mix(background, mix(vec3f(0.23), vec3f(0.08), globals.counts.z), groundLine);
  }
  var bodyDepth = -10000.0;
  var bodyCoverage = 0.0;
  var protect = 0.0;
  var bodyColor = background;
  for (var i = 0u; i < u32(globals.counts.y); i++) {
    let b = bodyParts[i];
    let localXY = rotateToLocal(xy - b.centerProtection.xy, b.orientation.xy) / b.extentKind.xy;
    let radial2 = dot(localXY, localXY);
    let aa = 0.55 / (globals.view.z * min(b.extentKind.x, b.extentKind.y));
    if (radial2 < 1.0 + aa) {
      let localZ = sqrt(max(0.0, 1.0 - radial2));
      let z = b.centerProtection.z + b.extentKind.z * localZ;
      if (z > bodyDepth) {
        bodyDepth = z;
        bodyCoverage = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, radial2);
        protect = b.centerProtection.w * bodyCoverage;
        let n = normalAt(vec3f(localXY, localZ), b.extentKind.xyz, b.orientation.xy);
        let lightAmount = max(0.0, dot(n, normalize(vec3f(-0.55, 0.80, 0.68))));
        let diffuse = 0.40 + 0.30 * smoothstep(0.10, 0.22, lightAmount) + 0.33 * smoothstep(0.63,0.78,lightAmount);
        let reflected = receivingLight(vec3f(xy, z), n) * b.albedo.xyz * 1.45;
        bodyColor = b.albedo.xyz * diffuse + reflected;
      }
    }
  }
  let opaqueColor = mix(background, bodyColor, bodyCoverage);
  var spans: array<vec4f, 48>;
  var front = -10000.0;
  var back = 10000.0;
  var contributors = 0u;
  for (var i = 0u; i < u32(globals.counts.x); i++) {
    let v = volumes[i];
    let localXY = rotateToLocal(xy - v.centerOpacity.xy, v.orientationEmission.xy) / max(v.extentKind.xy, vec2f(0.001));
    let radial2 = dot(localXY, localXY);
    spans[i] = vec4f(localXY, radial2, 0.0);
    if (radial2 < 1.0 && v.centerOpacity.w > 0.00001) {
      let depthRadius = sqrt(1.0 - radial2) * v.extentKind.z;
      let nearZ = v.centerOpacity.z + depthRadius;
      let farZ = v.centerOpacity.z - depthRadius;
      if (nearZ > bodyDepth || bodyCoverage < 0.5) {
        spans[i].w = 1.0;
        front = max(front, nearZ); back = min(back, farZ); contributors++;
      }
    }
  }
  if (bodyCoverage >= 0.5) { back = max(back, bodyDepth); }
  var fieldColor = vec3f(0.0);
  var transmission = 1.0;
  if (contributors > 0u && front > back) {
    let steps = u32(clamp(globals.fixture.z, 16.0, 96.0));
    let dz = (front - back) / f32(steps);
    for (var step = 0u; step < steps; step++) {
      let z = front - (f32(step) + 0.5) * dz;
      var extinction = 0.0;
      var weightedRadiance = vec3f(0.0);
      for (var i = 0u; i < u32(globals.counts.x); i++) {
        if (spans[i].w < 0.5) { continue; }
        let v = volumes[i];
        let localZ = (z - v.centerOpacity.z) / max(v.extentKind.z, 0.001);
        let local = vec3f(spans[i].xy, localZ);
        let q2 = spans[i].z + localZ * localZ;
        if (q2 >= 1.0) { continue; }
        let q = sqrt(q2);
        let boundary = 1.0 - smoothstep(0.80, 1.0, q);
        let density = boundary * v.centerOpacity.w;
        let n = normalAt(local, v.extentKind.xyz, v.orientationEmission.xy);
        let incidence = 0.42 + 0.58 * max(0.0, dot(n, normalize(vec3f(-0.5,0.72,0.64))));
        let kind = v.extentKind.w;
        let payload = v.orientationEmission.w;
        let localSignal = v.response.x;
        let globalCharge = v.response.y;
        let globalOutside = v.response.z;
        let phaseTag = v.response.w;
        var sigma = density * 0.30;
        var sleeve = vec3f(0.0);
        var middle = vec3f(0.0);
        var core = vec3f(0.0);
        if (kind < 0.5) {
          let shellShape = pow(max(0.0, 1.0 - q), 0.52);
          sigma = density * (0.18 + 0.04 * payload);
          sleeve = vec3f(0.010,0.075,0.16) * (0.70 + 0.30 * incidence);
          middle = vec3f(0.090,0.49,0.98) * shellShape * (0.38 + 0.22 * payload + 0.10 * localSignal);
          core = vec3f(0.84,0.95,1.00) * pow(max(0.0, 1.0 - q / 0.82), 1.25) * 0.32 * payload;
        } else if (kind < 1.5) {
          let conduit = pow(max(0.0, 1.0 - q), 0.44);
          let frontBias = clamp(local.x * 0.5 + 0.5, 0.0, 1.0);
          sigma = density * (0.23 + 0.06 * localSignal);
          sleeve = vec3f(0.010,0.070,0.145) * (0.65 + 0.35 * incidence);
          middle = vec3f(0.090,0.49,0.98) * conduit * (0.55 + 0.35 * localSignal);
          core = vec3f(0.84,0.95,1.00) * pow(max(0.0, 1.0 - q / 0.72), 0.92) * (0.50 + 0.85 * localSignal) * (0.75 + 0.25 * frontBias);
        } else if (kind < 2.5) {
          let chamber = pow(max(0.0, 1.0 - q), 0.58);
          let rim = smoothstep(0.48, 0.92, q);
          sigma = density * (0.28 + 0.08 * payload);
          sleeve = mix(vec3f(0.006,0.032,0.11), vec3f(0.014,0.10,0.22), rim) * (0.74 + 0.26 * incidence);
          middle = vec3f(0.060,0.38,0.94) * chamber * (0.46 + 0.42 * payload + 0.08 * globalCharge);
          core = vec3f(0.84,0.95,1.00) * pow(max(0.0, 1.0 - q / 0.76), 1.05) * (0.38 + 1.05 * payload + 0.08 * phaseTag);
        } else {
          let column = pow(max(0.0, 1.0 - q), 0.60);
          sigma = density * (0.22 + 0.08 * payload);
          sleeve = vec3f(0.008,0.046,0.13) * (0.72 + 0.28 * incidence);
          middle = vec3f(0.080,0.44,0.96) * column * (0.36 + 0.24 * globalCharge);
          core = vec3f(0.84,0.95,1.00) * pow(max(0.0, 1.0 - q / 0.86), 1.40) * (0.28 + 0.60 * payload + 0.18 * (1.0 - globalOutside));
        }
        let sourceRadiance = sleeve + middle + core * (0.60 + 0.70 * v.orientationEmission.z);
        extinction += sigma;
        weightedRadiance += sigma * sourceRadiance;
      }
      if (extinction > 0.000001) {
        let sliceAlpha = 1.0 - exp(-extinction * dz);
        fieldColor += transmission * sliceAlpha * weightedRadiance / extinction;
        transmission *= 1.0 - sliceAlpha;
      }
      if (transmission < 0.002) { break; }
    }
  }
  var result: SceneOutput;
  result.radiance = vec4f(fieldColor + transmission * opaqueColor, protect);
  result.bloomSeed = vec4f(max(fieldColor - vec3f(0.95), vec3f(0.0)) * 0.20, 1.0 - transmission);
  return result;
}
