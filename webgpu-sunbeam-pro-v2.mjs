/**
 * Sunbeam E v2 — standalone ES module; no imports or effect assets.
 *
 * INPUT / HOST CONTRACT
 * ---------------------
 * The public API matches sunbeam-e.mjs:
 *   plan(input), create({ device, format, audio? }), synthesizeSFX(sampleRate),
 *   timeProfile(actorMs, axialFraction), TEST_TIMES, testInput(age, twoPalms).
 * create() returns { record, driver: { submitted, abandon }, sfx, destroy }.
 *
 * World range 950, collision width 52, lifetime 1200 ACTOR ms and the existing
 * 820 CHARACTER ms pose are game facts, not adjustable rendering parameters.
 * No code in this module writes game state or touches Heal E.
 * Host supplies CURRENT projected palm/endpoint coordinates in CSS pixels,
 * including its camera transform. DPR is applied exactly once. Thickness uses
 * camera.zoom * camera.cssPxPerWorld * DPR. No body-centre fallback is used.
 * rangeWorld validates the host's collision range; palm-to-end geometric length
 * is NOT used to reclamp host endpoints. Zero-length rays produce no beam.
 *
 * VISUAL DESIGN (analytic fields, not material-shaded cylinders)
 * ------------------------------------------------------------
 * B is a complete phenomenon: actual palm apertures, converging supplies,
 * connected hot axial core, travelling asymmetric pressure shoulders, coloured
 * density, moving side cavities, and a finite terminal compression surface.
 * The cavities never cut the core. No particle/line-only stage exists.
 * extensions=false draws B alone; extensions=true records:
 *   0 spill    — light around the actual apertures and outside the volume;
 *   1 B        — the entire continuous beam, including its luminous core;
 *   2 radiance — forward-moving stimulated light around pressure shoulders;
 *   3 corona   — thin, interrupted optical fringes, not a tube outline.
 * Removing any extension cannot remove transport, the source or the endpoint.
 * Colours are fixed artistic radiance values. No background input, sampling,
 * luminance detection, exposure adaptation, textures, blur or history is used.
 *
 * TWO PALMS
 * ---------
 * Compatible co-directed inputs form ONE trunk. Ray 0 supplies the white-hot
 * core; ray 1 supplies a broader amber pressure jacket. Both start at their
 * supplied palms and converge over a short, smooth connection. The midpoint is
 * only a coordinate chart: it is never an emitter. The terminal cross-section
 * interpolates the two supplied end anchors; it is not a new range/aim value.
 * Distinct, incompatible aims or tiny separated rays cannot honestly be merged
 * without changing the host's aim. They remain separate finite phenomena, with
 * max-union radiance rather than additive duplication. plan().topology reports
 * this case. Coincident palms do not double energy or change the one-beam shape.
 *
 * ACTOR TIME (no wall clock in plan or WGSL)
 * -----------------------------------------
 * 0–90: actual apertures open into a connected advancing front.
 * 90–1020: persistent supply, pressure transport and nonconstant cross-section.
 * 1020–1170: a final broad compression moves outward; root supply still >=74%.
 * 1150 is intentionally still strong, thick and moving, not a faint residue.
 * 1170–1200: the same full-width finite volume fades; at 1200 it draws nothing.
 * reducedMotion: no advancing front or contour wobble, 12% internal speed,
 * no fast final compression, but unchanged core brightness and nominal width.
 * The short-ray nominal visual half-width is min(24, geometricLength * .23).
 * This is visual geometry only and does not modify the 52-world collision width.
 *
 * SHARED FRAME / SUBMISSION
 * -------------------------
 * format is 'bgra8unorm' or 'rgba8unorm', as in the original API.
 * Use an already drawn, opaque, single-sampled world target. Redraw the world
 * each frame; do not accumulate E. Resolve host MSAA before E; draw UI after E.
 * frame = { id, encoder, colorView, width, height, sampledAtMs }.
 * width/height are framebuffer pixels; id increases within this renderer.
 * sampledAtMs is performance.now() when the host samples anchors/actor clocks.
 * record(frame, plans) gets the scene's COMPLETE E set (including empty []).
 * It ONLY records. It never calls encoder.finish() or queue.submit().
 *
 * receipt = effect.record(frame, inputs.map(plan));
 * The trusted DRIVER finishes that same encoder and submits it exactly once.
 * AFTER submission, the driver calls:
 *   await effect.driver.submitted(receipt, {
 *     frameId: frame.id, encoder: frame.encoder,
 *     validation, done
 *   });
 * validation: Promise<null | GPUError>, covering driver encoding/finish/submit.
 * done: the queue.onSubmittedWorkDone() promise obtained AFTER that submit.
 * E's own record-time error scopes are also checked. Only then may the host call
 * effect.sfx?.accept(receipt). Record-only, failed, foreign or reused receipts
 * do not authorize audio. This trusts the driver's report; it does not pretend
 * to independently authenticate queue submission or physical monitor scanout.
 * Unsubmitted frame: driver.abandon(receipt), then NEVER submit that encoder.
 * Await destroy() once the host will no longer submit unsubmitted E encoders.
 *
 * AUDIO
 * -----
 * audio = { context, destination?, gates, consumedIds, volume? }.
 * Host creates/unlocks its AudioContext. E never resumes it, fetches a URL or
 * plays a silent unlock file. gates.owner/room/verify/unlock(meta) must ALL
 * return strictly true. verify=true means playback is permitted by the host's
 * verification policy, not 'verification mode is active'. Throws fail closed.
 * consumedIds is the host-owned session Set of cause IDs; keep it across scene
 * recreation. Rejected or started IDs are never queued for later playback.
 * Same cause / two palms -> one nonlooping source, not one source per frame.
 * Host state changes: sfx.refreshGates() or sfx.stopAll(). Missing receipts fade
 * to silence at 160 ms and stop at 180 ms. Max six sources / six real seconds.
 * Host retains responsibility for other sounds and its final output mix.
 *
 * COST / INSPECTION
 * -----------------
 * B only: 1 pass and 1 draw/cause. Full: 4 passes and 4 draws/cause. Two compatible
 * palms use one trunk evaluation plus short feeder evaluations, not two full
 * beams. 6 vertices/draw, 176 bytes uniform data/cause (aligned per device),
 * maximum 64 plans and 8 unacknowledged frames. No readback or GPU-to-2D path.
 * Inspect 550 and 1150 at testInput()'s unchanged 980x620, DPR1, zoom1.65.
 * Also inspect B-only, one/two palms, 20/52/950 world lengths and TEST_TIMES.
 * Exported data/WGSL are source inspection aids, not claimed visual approval.
 *
 * Normative API references:
 * https://www.w3.org/TR/webgpu/
 * https://www.w3.org/TR/WGSL/
 * https://www.w3.org/TR/webaudio/
 */

export const CONTRACT = Object.freeze({
  rangeWorld: 950,
  hitWidthWorld: 52,
  lifetimeActorMs: 1200,
  poseCharacterMs: 820
});

export const VERSION = 'sunbeam-e-v2';
export const LAYER_RULES = Object.freeze([
  Object.freeze({ name: 'spill', extension: true, role: 'Aperture and volume light spill' }),
  Object.freeze({ name: 'B', extension: false, role: 'Complete connected luminous transport' }),
  Object.freeze({ name: 'radiance', extension: true, role: 'Travelling pressure excitation' }),
  Object.freeze({ name: 'corona', extension: true, role: 'Thin intermittent optical boundary' })
]);

const PLAN_BRAND = Symbol('Sunbeam E v2 plan');
const RECEIPTS = new WeakMap();
const UNIFORM_FLOATS = 44;
const UNIFORM_BYTES = UNIFORM_FLOATS * 4;
const MAX_PLANS = 64;
const MAX_PENDING_FRAMES = 8;
const TAU = 2 * Math.PI;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function requireValue(condition, message) {
  if (!condition) throw new TypeError(`Sunbeam E v2: ${message}`);
}

function finite(value, name, low = -1e12, high = 1e12) {
  requireValue(typeof value === 'number' && Number.isFinite(value) &&
    value >= low && value <= high, name);
  return value;
}

function boolean(value, name) {
  requireValue(typeof value === 'boolean', name);
  return value;
}

function identifier(value, name) {
  requireValue(typeof value === 'string' && value.length > 0 && value.length <= 256, name);
  return value;
}

function point(value, name) {
  requireValue(Array.isArray(value) && value.length === 2, name);
  return value.map((component, index) => finite(component, `${name}[${index}]`, -1e7, 1e7));
}

function smooth(low, high, value) {
  const fraction = clamp((value - low) / (high - low), 0, 1);
  return fraction * fraction * (3 - 2 * fraction);
}

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

function eventPhase(eventId) {
  let hash = 2166136261;
  for (let index = 0; index < eventId.length; index++) {
    hash = Math.imul(hash ^ eventId.charCodeAt(index), 16777619);
  }
  return (hash >>> 0) / 4294967296 * TAU;
}

/** Pure timing probe. Supply is a pressure factor, not geometric coverage. */
export function timeProfile(ms, axialFraction = 0) {
  finite(ms, 'actor age');
  finite(axialFraction, 'axial fraction', 0, 1);
  const active = ms >= 0 && ms < CONTRACT.lifetimeActorMs;
  return {
    gain: active ? (0.66 + 0.34 * smooth(0, 60, ms)) *
      (1 - smooth(1170, 1200, ms)) : 0,
    supply: 1 - 0.26 * smooth(1020 + 110 * axialFraction,
      1120 + 65 * axialFraction, ms)
  };
}

function segmentIntersectsViewport(start, end, width, height) {
  let enter = 0;
  let leave = 1;
  for (let axis = 0; axis < 2; axis++) {
    const difference = end[axis] - start[axis];
    const maximum = axis === 0 ? width : height;
    if (Math.abs(difference) < 1e-9) {
      if (start[axis] < 0 || start[axis] > maximum) return false;
      continue;
    }
    const first = -start[axis] / difference;
    const second = (maximum - start[axis]) / difference;
    enter = Math.max(enter, Math.min(first, second));
    leave = Math.min(leave, Math.max(first, second));
  }
  return leave > enter;
}

/** Validate and copy host input. This function has no clocks or side effects. */
export function plan(input) {
  requireValue(input && input.camera && input.viewport, 'input, camera and viewport are required');
  const eventId = identifier(input.eventId, 'eventId');
  const ownerId = identifier(input.ownerId, 'ownerId');
  const roomId = identifier(input.roomId, 'roomId');
  const age = finite(finite(input.actorNowMs, 'actorNowMs') -
    finite(input.startActorMs, 'startActorMs'), 'actor age');
  const rate = finite(input.actorRate ?? 1, 'actorRate', 0, 4);
  const rangeWorld = finite(input.rangeWorld, 'rangeWorld', 0, CONTRACT.rangeWorld);
  const characterMs = finite(input.characterElapsedMs ?? 0, 'characterElapsedMs', 0);
  const alive = boolean(input.alive, 'alive');
  const visible = boolean(input.visible, 'visible');
  const cancelled = boolean(input.cancelled ?? false, 'cancelled');
  const twoPalms = boolean(input.twoPalms, 'twoPalms');
  const reducedMotion = boolean(input.reducedMotion ?? false, 'reducedMotion');
  const extensions = boolean(input.extensions ?? true, 'extensions');
  const dpr = finite(input.viewport.dpr, 'DPR', 0.25, 8);
  const width = Math.round(finite(input.viewport.widthCss, 'viewport width', 1, 32768) * dpr);
  const height = Math.round(finite(input.viewport.heightCss, 'viewport height', 1, 32768) * dpr);
  requireValue(width > 0 && height > 0, 'rounded framebuffer size');
  const cssScale = finite(input.camera.zoom, 'camera.zoom', 0.01, 100) *
    finite(input.camera.cssPxPerWorld ?? 1, 'camera.cssPxPerWorld', 0.01, 100);
  const scale = cssScale * dpr;
  requireValue(Array.isArray(input.rays) && input.rays.length === (twoPalms ? 2 : 1),
    'rays and twoPalms disagree');

  const rays = input.rays.map((ray, index) => {
    requireValue(ray && typeof ray === 'object', `ray ${index}`);
    const palm = point(ray.palmCss, 'palmCss');
    const endpoint = point(ray.endCss, 'endCss');
    const direction = point(ray.directionCss, 'directionCss');
    const directionLength = Math.hypot(...direction);
    requireValue(directionLength > 1e-8, 'direction must be nonzero');
    const difference = [endpoint[0] - palm[0], endpoint[1] - palm[1]];
    const lengthCss = Math.hypot(...difference);
    if (lengthCss > 1e-6) {
      const agreement = (difference[0] * direction[0] + difference[1] * direction[1]) /
        (lengthCss * directionLength);
      requireValue(agreement > 0.9999, 'direction must agree with the supplied endpoint');
    }
    const length = lengthCss / cssScale;
    if (ray.lengthWorld !== undefined) {
      const expected = finite(ray.lengthWorld, 'optional geometric lengthWorld', 0);
      requireValue(Math.abs(lengthCss - expected * cssScale) <= Math.max(0.1, lengthCss * 0.001),
        'optional lengthWorld does not match the projected geometric length');
    }
    const opening = reducedMotion ? 1 : smooth(0, 90, age);
    const initialLength = Math.min(length, 18);
    return {
      segment: [palm[0] * dpr, palm[1] * dpr, endpoint[0] * dpr, endpoint[1] * dpr],
      direction: lengthCss > 1e-6 ? difference.map(value => value / lengthCss) :
        direction.map(value => value / directionLength),
      shape: [length, Math.min(24, length * 0.23),
        initialLength + (length - initialLength) * opening, clamp(length * 1.72, 240, 1720)]
    };
  });

  const first = rays[0];
  const second = rays[1] ?? first;
  const origin = [(first.segment[0] + second.segment[0]) / 2,
    (first.segment[1] + second.segment[1]) / 2];
  const meanEnd = [(first.segment[2] + second.segment[2]) / 2,
    (first.segment[3] + second.segment[3]) / 2];
  const averageLengthPx = Math.hypot(meanEnd[0] - origin[0], meanEnd[1] - origin[1]);
  const axis = averageLengthPx > 1e-6 ? [(meanEnd[0] - origin[0]) / averageLengthPx,
    (meanEnd[1] - origin[1]) / averageLengthPx] : [...first.direction];
  const normal = [-axis[1], axis[0]];
  const local = (x, y) => [((x - origin[0]) * axis[0] + (y - origin[1]) * axis[1]) / scale,
    ((x - origin[0]) * normal[0] + (y - origin[1]) * normal[1]) / scale];
  const palms = [local(first.segment[0], first.segment[1]), local(second.segment[0], second.segment[1])];
  const ends = [local(first.segment[2], first.segment[3]), local(second.segment[2], second.segment[3])];
  const shortLength = Math.min(first.shape[0], second.shape[0]);
  const commonHalfWidth = Math.min(24, shortLength * 0.23);
  const palmDistance = Math.hypot(palms[1][0] - palms[0][0], palms[1][1] - palms[0][1]);
  const transverseEndGap = Math.abs(ends[1][1] - ends[0][1]);
  const longitudinalEndGap = Math.abs(ends[1][0] - ends[0][0]);
  const directionAgreement = first.direction[0] * second.direction[0] +
    first.direction[1] * second.direction[1];
  const coincident = twoPalms && palmDistance < 1e-5 &&
    Math.hypot(ends[1][0] - ends[0][0], ends[1][1] - ends[0][1]) < 1e-5;
  const mergeable = twoPalms && !coincident && shortLength > 1e-5 &&
    directionAgreement > 0.94 && transverseEndGap <= commonHalfWidth * 1.35 &&
    longitudinalEndGap <= Math.min(36, shortLength * 0.12) &&
    (transverseEndGap > 0.2 || longitudinalEndGap < 0.2) &&
    palmDistance <= Math.min(120, shortLength * 0.65) &&
    Math.min(ends[0][0], ends[1][0]) > Math.max(palms[0][0], palms[1][0]);
  // 0: one actual beam (also coincident palms), 1: a fused trunk, 2: distinct aims.
  const mode = mergeable ? 1 : (twoPalms && !coincident ? 2 : 0);
  const commonLength = Math.max(0, (ends[0][0] + ends[1][0]) / 2);
  const mergeDistance = Math.min(commonLength * 0.31, Math.max(38, palmDistance * 1.75));
  const commonFront = reducedMotion ? Math.max(ends[0][0], ends[1][0]) :
    Math.min(commonLength, 18) + (Math.max(ends[0][0], ends[1][0]) -
      Math.min(commonLength, 18)) * smooth(0, 90, age);

  const lower = [Infinity, Infinity];
  const upper = [-Infinity, -Infinity];
  for (const ray of rays) {
    if (ray.shape[0] * scale < 0.01) continue;
    const padding = (extensions ? 2.8 : 1.12) * ray.shape[1] * scale + 2;
    for (const distance of [0, ray.shape[2]]) {
      const position = [ray.segment[0] + ray.direction[0] * distance * scale,
        ray.segment[1] + ray.direction[1] * distance * scale];
      for (const [index, basis] of [axis, normal].entries()) {
        const projection = position[0] * basis[0] + position[1] * basis[1];
        lower[index] = Math.min(lower[index], projection - padding);
        upper[index] = Math.max(upper[index], projection + padding);
      }
    }
  }
  if (!Number.isFinite(lower[0])) {
    lower.fill(0);
    upper.fill(0);
  }
  const corners = [lower, [lower[0], upper[1]], upper, [upper[0], lower[1]]].map(position =>
    [position[0] * axis[0] + position[1] * normal[0],
      position[0] * axis[1] + position[1] * normal[1]]);
  const left = clamp(Math.floor(Math.min(...corners.map(value => value[0]))), 0, width);
  const top = clamp(Math.floor(Math.min(...corners.map(value => value[1]))), 0, height);
  const right = clamp(Math.ceil(Math.max(...corners.map(value => value[0]))), 0, width);
  const bottom = clamp(Math.ceil(Math.max(...corners.map(value => value[1]))), 0, height);
  const active = alive && visible && !cancelled && age >= 0 && age < 1200;
  const drawable = active && right > left && bottom > top &&
    rays.some(ray => ray.shape[0] * scale >= 0.01);
  const audible = drawable && rays.some(ray => ray.shape[0] * scale >= 0.01 &&
    segmentIntersectsViewport(ray.segment.slice(0, 2),
      [ray.segment[0] + ray.direction[0] * ray.shape[2] * scale,
        ray.segment[1] + ray.direction[1] * ray.shape[2] * scale], width, height));

  const result = freezeDeep({
    [PLAN_BRAND]: true,
    eventId, ownerId, roomId, age, rate, rangeWorld, characterMs,
    width, height, drawable, audible, extensions,
    topology: mode === 1 ? 'merged' : mode === 2 ? 'independent-aims' : 'single',
    scissor: [left, top, right - left, bottom - top],
    // Opaque uniform payload; consumers should use record(), not this layout.
    data: [width, height, age / 1000, scale,
      ...lower, ...upper, ...axis, eventPhase(eventId), Number(reducedMotion),
      ...origin, mode, rays.length, ...first.segment, ...second.segment,
      ...first.shape, ...second.shape,
      commonLength, commonHalfWidth, mergeDistance, commonFront,
      ...palms[0], ...palms[1], ...ends[0], ...ends[1]]
  });
  return result;
}

export const WGSL = /* wgsl */ `
struct Parameters {
  view: vec4<f32>,        // width, height, actor seconds, pixels/world
  bounds: vec4<f32>,      // projected screen-space rectangle
  basis: vec4<f32>,       // direction.xy, cause phase, reduced motion
  chart: vec4<f32>,       // coordinate origin.xy, topology mode, palm count
  ray0: vec4<f32>,        // host palm.xy, host endpoint.xy
  ray1: vec4<f32>,
  shape0: vec4<f32>,      // length, nominal half-width, current front, speed
  shape1: vec4<f32>,
  fusion: vec4<f32>,      // common length, half-width, merge distance, front
  palms: vec4<f32>,       // actual palms in the common coordinate chart
  ends: vec4<f32>,        // actual endpoints in the common coordinate chart
}
@group(0) @binding(0) var<uniform> parameters: Parameters;
override PASS: u32 = 1u;
const TAU: f32 = 6.28318530718;

@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4<f32> {
  let corners = array<vec2<f32>, 6>(
    vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0),
    vec2(0.0, 1.0), vec2(1.0, 0.0), vec2(1.0, 1.0));
  let projected = mix(parameters.bounds.xy, parameters.bounds.zw, corners[index]);
  let direction = parameters.basis.xy;
  let pixel = projected.x * direction + projected.y * vec2(-direction.y, direction.x);
  return vec4(2.0 * pixel.x / parameters.view.x - 1.0,
    1.0 - 2.0 * pixel.y / parameters.view.y, 0.0, 1.0);
}

fn square(value: f32) -> f32 { return value * value; }
fn gaussian(value: f32) -> f32 { return exp(-value * value); }
fn fourth(value: f32) -> f32 { let s = value * value; return s * s; }

// Broad pressure packets. The SAME transported coordinate drives geometry,
// radiance and the coloured sleeve. They are not a decorative overlay.
fn pressure(retardedTime: f32, offset: f32) -> f32 {
  let phase = retardedTime / 0.213 + parameters.basis.z / TAU + offset * 0.13;
  let age = fract(phase);
  // Sharp advancing compression, followed by a long connected rarefaction.
  // This asymmetric shape avoids the repeated smooth bulges of a glossy tube.
  let primary = smoothstep(0.0, 0.085, age) * (1.0 - smoothstep(0.15, 0.81, age));
  let variation = 0.89 + 0.11 * sin(floor(phase) * 7.31 + parameters.basis.z);
  let secondary = 0.5 + 0.5 * sin(TAU * retardedTime / 0.347 - offset);
  return 0.88 * primary * variation + 0.12 * square(secondary);
}

// Optical synthesis of a single connected cross-section. role=1 is the amber
// pressure feeder; all trunk/core sections use role=0. Every pass shares this
// geometry, so extension removal cannot turn B into a motionless ribbon.
fn crossSection(
  local: vec2<f32>, beamLength: f32, halfWidth: f32, cut: f32,
  amplitude: f32, aperture: f32, terminal: f32, role: f32,
  distanceFromSupply: f32, transportSpeed: f32
) -> vec4<f32> {
  if (beamLength < 0.000001 || halfWidth < 0.000001 || amplitude < 0.00001) {
    return vec4(0.0);
  }
  let x = local.x;
  let y = local.y;
  let aa = 0.8 / parameters.view.w;
  let support = select(1.12, 2.8, PASS == 0u) * halfWidth + aa;
  if (abs(y) > support || x < -support || x > cut + support) { return vec4(0.0); }
  let time = parameters.view.z;
  let reduced = parameters.basis.w;
  let motion = 1.0 - reduced;
  let clock = mix(time, 0.327 + 0.12 * time, reduced);
  let q = clock - max(distanceFromSupply, 0.0) / transportSpeed;
  let along = clamp(distanceFromSupply / beamLength, 0.0, 1.0);
  let life = (0.66 + 0.34 * smoothstep(0.0, 0.060, time)) *
    (1.0 - smoothstep(1.170, 1.200, time));
  let drain = smoothstep(1.020 + 0.110 * along, 1.120 + 0.065 * along, time);
  let quietDrain = smoothstep(1.020, 1.185, time);
  let supply = 1.0 - 0.26 * mix(drain, quietDrain, reduced);
  let closing = motion * gaussian((time - (1.055 + 0.125 * along)) / 0.029) *
    smoothstep(1.000, 1.025, time);
  let openingDistance = max(min(64.0, beamLength * 0.40), 0.000001);
  let mouthOpening = 0.30 + 0.70 * smoothstep(0.0, openingDistance, x);
  let nominal = halfWidth * mix(1.0, mouthOpening, aperture);
  let displacement = motion * nominal * 0.07 * sin(TAU * q / 0.301 + 1.1) *
    smoothstep(0.0, 0.16, along);
  let sideOffset = select(-0.86, 0.46, y >= displacement);
  let shoulder = pressure(q, sideOffset);
  let radiusFactor = mix(0.54 + 0.39 * shoulder + 0.07 * closing, 0.87, reduced);
  // The receiving zone stays broad enough to include both supplied end
  // anchors; it compresses arriving light instead of simply sawing off a rod.
  let receiverWidth = halfWidth * 0.84 * terminal *
    smoothstep(cut - halfWidth * 1.60, cut - halfWidth * 0.12, x);
  let radius = max(max(nominal * radiusFactor, receiverWidth), 0.000001);
  let transverse = (y - displacement) / radius;
  let outerCoverage = 1.0 - smoothstep(radius * 0.91, radius + aa, abs(y - displacement));
  let entrance = smoothstep(-aa, aa, x);
  let endCoverage = 1.0 - smoothstep(cut - aa, cut + aa * 0.12, x);
  let body = amplitude * life * outerCoverage * entrance * endCoverage;
  // Centre of a pressure packet leads its shoulders: an outward-pointing front.
  let packet = pressure(q - 0.043 * pow(abs(transverse), 1.18), 0.0);
  let frontAge = fract((q - 0.043 * pow(abs(transverse), 1.18)) / 0.213 +
    parameters.basis.z / TAU);
  let pressureFace = gaussian((frontAge - 0.11) / 0.055) *
    smoothstep(0.0, 0.025, frontAge) * exp(-fourth(transverse / 0.87));
  let opticalScale = max(halfWidth / 24.0, 0.000001);
  let apertureLength = max(min(14.0 * opticalScale, beamLength * 0.24), 0.000001);
  let source = aperture * gaussian(x / apertureLength) * gaussian(transverse / 0.79);
  let capLength = max(min(19.0 * opticalScale, beamLength * 0.21), 0.000001);
  let receive = terminal * gaussian((x - cut + 0.50 * capLength) / (0.38 * capLength)) *
    exp(-fourth(transverse / 0.88)) * (0.48 + 0.52 * packet);

  if (PASS == 0u) {
    let outward = smoothstep(-halfWidth * 0.72, halfWidth * 0.16, x) *
      (1.0 - smoothstep(cut - halfWidth * 0.12, cut + halfWidth * 0.78, x));
    let atmosphere = gaussian(y / (halfWidth * 1.06)) * outward;
    let rootLight = aperture * gaussian(length(local / (halfWidth * 0.73)));
    let glow = amplitude * life * supply *
      (0.19 * atmosphere * (0.42 + 0.58 * packet) + 0.35 * rootLight);
    return vec4(vec3(1.0, 0.56, 0.09) * glow, 0.0);
  }

  // Pockets live beside the core, never through it. They move and alternate,
  // rather than becoming a pair of permanent parallel transparent channels.
  let upperPocket = gaussian((transverse - 0.67 - 0.06 * sin(17.0 * q)) / 0.14) *
    smoothstep(0.10, 0.88, sin(25.0 * q + 0.9 + parameters.basis.z));
  let lowerPocket = gaussian((transverse + 0.65 + 0.07 * sin(19.0 * q)) / 0.16) *
    smoothstep(0.12, 0.90, sin(25.0 * q + 3.9 + parameters.basis.z));
  let cavity = max(upperPocket, lowerPocket);
  let sleeveTransmission = 1.0 - 0.92 * cavity;
  let coreWidth = radius * (0.38 + 0.23 * packet + 0.07 * closing);
  let coreCentre = displacement + motion * radius * 0.035 * sin(31.0 * q);
  let coreCoverage = 1.0 - smoothstep(coreWidth * 0.66, coreWidth + aa, abs(y - coreCentre));
  let hotSource = source * 0.95;
  let hotCap = receive * 1.20;
  let heatCoverage = min(1.0, max(coreCoverage, max(0.92 * pressureFace, max(hotSource, hotCap))));

  if (PASS == 1u) {
    let colouredAlpha = body * sleeveTransmission * (0.23 + 0.55 * square(packet)) *
      (0.85 + 0.15 * supply);
    let colourPosition = clamp(0.28 + 0.61 * packet + 0.18 * (1.0 - abs(transverse)), 0.0, 1.0);
    let gold = mix(vec3(0.60, 0.11, 0.008), vec3(1.0, 0.68, 0.075), colourPosition);
    let coreAlpha = body * heatCoverage * (0.86 + 0.13 * packet) * pow(supply, 0.12);
    let hotColour = mix(vec3(1.0, 0.68, 0.18), vec3(1.0, 0.995, 0.94),
      clamp(0.39 + 0.65 * packet + 0.30 * source + 0.32 * receive, 0.0, 1.0));
    let feederColour = mix(vec3(1.0, 0.41, 0.025), vec3(1.0, 0.77, 0.20), packet);
    let coreColour = mix(hotColour, feederColour, role);
    let alpha = coreAlpha + colouredAlpha * (1.0 - coreAlpha);
    // B carries actual emitted light, not only a pale colour at partial alpha.
    // Emission is restricted to the connected core/pressure face, not the whole
    // silhouette. RGB may exceed coverage alpha; that is intentional radiance.
    let emissionColour = mix(vec3(1.0, 0.97, 0.84), vec3(1.0, 0.43, 0.035), role);
    let emission = body * heatCoverage * (0.085 + 0.14 * packet + 0.07 * closing);
    let rgb = coreColour * coreAlpha + gold * colouredAlpha * (1.0 - coreAlpha) +
      emissionColour * emission;
    return vec4(rgb, alpha);
  }

  if (PASS == 2u) {
    let innerScatter = gaussian(transverse / 0.70) * (1.0 - 0.94 * coreCoverage);
    let excitation = (0.08 + 0.25 * packet + 0.14 * closing) * innerScatter *
      (1.0 - 0.85 * cavity) + 0.16 * source + 0.29 * receive + 0.12 * pressureFace;
    let gain = body * supply * excitation;
    return vec4(vec3(1.0, 0.59, 0.09) * gain, 0.0);
  }

  // Localised optical edge fragments. No continuous pair of bright lines.
  let thinBoundary = gaussian((abs(transverse) - 0.925) / 0.048);
  let leading = smoothstep(0.48, 0.92, packet);
  let boundaryPower = body * supply * thinBoundary * leading * 0.38;
  let boundaryColour = select(vec3(0.36, 0.78, 1.0), vec3(1.0, 0.71, 0.17), y > displacement);
  return vec4(boundaryColour * boundaryPower, 0.0);
}

fn singleBeam(pixel: vec2<f32>, ray: vec4<f32>, shape: vec4<f32>) -> vec4<f32> {
  if (shape.x < 0.000001) { return vec4(0.0); }
  let delta = ray.zw - ray.xy;
  let pixelLength = length(delta);
  if (pixelLength < 0.00001) { return vec4(0.0); }
  let direction = delta / pixelLength;
  let relative = (pixel - ray.xy) / parameters.view.w;
  let local = vec2(dot(relative, direction), dot(relative, vec2(-direction.y, direction.x)));
  let cap = min(11.0 * shape.y / 24.0, shape.z * 0.15);
  let cut = shape.z - cap * 0.55 * square(local.y / max(shape.y, 0.000001));
  return crossSection(local, shape.x, shape.y, cut, 1.0, 1.0, 1.0, 0.0,
    local.x, shape.w);
}

fn mergedBeam(pixel: vec2<f32>) -> vec4<f32> {
  let direction = parameters.basis.xy;
  let normal = vec2(-direction.y, direction.x);
  let relative = (pixel - parameters.chart.xy) / parameters.view.w;
  let local = vec2(dot(relative, direction), dot(relative, normal));
  let commonLength = max(parameters.fusion.x, 0.000001);
  let halfWidth = max(parameters.fusion.y, 0.000001);
  let mergeDistance = max(parameters.fusion.z, 0.000001);
  let speed = clamp(commonLength * 1.72, 240.0, 1720.0);
  let end0 = parameters.ends.xy;
  let end1 = parameters.ends.zw;
  let endSpan = end1.y - end0.y;
  var cut = end0.x;
  var distanceOutsideEnds = local.y - end0.y;
  if (abs(endSpan) > 0.00001) {
    let across = clamp((local.y - end0.y) / endSpan, 0.0, 1.0);
    let endPoint = mix(end0, end1, across);
    cut = endPoint.x;
    distanceOutsideEnds = local.y - endPoint.y;
  }
  // A finite receiving face through the actual supplied endpoint anchors.
  cut -= min(11.0 * halfWidth / 24.0, commonLength * 0.15) *
    0.55 * square(distanceOutsideEnds / halfWidth);
  cut = min(cut, parameters.fusion.w);
  let trunkWeight = smoothstep(mergeDistance * 0.57, mergeDistance, local.x);
  var result = crossSection(local, commonLength, halfWidth, cut, trunkWeight,
    0.0, 1.0, 0.0, local.x, speed);

  // The two short feeders vanish after joining. There is never a second full
  // white trunk. Their chart starts are precisely the host palm coordinates.
  for (var hand = 0u; hand < 2u; hand++) {
    let palm = select(parameters.palms.xy, parameters.palms.zw, hand == 1u);
    let endpoint = select(parameters.ends.xy, parameters.ends.zw, hand == 1u);
    let shape = select(parameters.shape0, parameters.shape1, hand == 1u);
    let forward = local.x - palm.x;
    let remaining = max(mergeDistance - palm.x, commonLength * 0.04);
    let join = smoothstep(0.0, remaining, forward);
    let slope = (endpoint.y - palm.y) / max(endpoint.x - palm.x, 0.000001);
    let centre = (palm.y + slope * forward) * (1.0 - join);
    let feederWeight = 1.0 - smoothstep(remaining * 0.77, remaining * 1.22, forward);
    let role = f32(hand);
    let feederHalfWidth = halfWidth * select(0.74, 0.93, hand == 1u);
    let feederCut = min(shape.z, remaining * 1.24);
    let feeder = crossSection(vec2(forward, local.y - centre), commonLength,
      feederHalfWidth, feederCut, feederWeight, 1.0, 0.0, role,
      forward, speed);
    // Union, never energy addition at the overlap; this also caps the feeders.
    result = max(result, feeder);
  }
  return result;
}

@fragment fn fragmentMain(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  if (parameters.view.z < 0.0 || parameters.view.z >= 1.2) { return vec4(0.0); }
  if (parameters.chart.z > 0.5 && parameters.chart.z < 1.5) {
    return mergedBeam(position.xy);
  }
  let first = singleBeam(position.xy, parameters.ray0, parameters.shape0);
  if (parameters.chart.z < 1.5) { return first; }
  return max(first, singleBeam(position.xy, parameters.ray1, parameters.shape1));
}
`;

function pushErrorScopes(device) {
  device.pushErrorScope('out-of-memory');
  device.pushErrorScope('internal');
  device.pushErrorScope('validation');
}

function popErrorScopes(device) {
  // Pop synchronously before any await: scopes are shared on the host device.
  const promises = [device.popErrorScope(), device.popErrorScope(), device.popErrorScope()];
  return Promise.all(promises).then(errors => errors.find(Boolean) ?? null, error => error);
}

function gpuFailure(error) {
  return error instanceof Error ? error : new Error(`Sunbeam E v2: ${error?.message ?? error}`);
}

/**
 * Create only E-owned resources on a shared device. No context configuration,
 * encoder completion, queue submission, asset load or audio unlock occurs here.
 */
export async function create({ device, format, audio } = {}) {
  requireValue(device?.queue && typeof device.createRenderPipelineAsync === 'function',
    'a WebGPU device is required');
  requireValue(format === 'bgra8unorm' || format === 'rgba8unorm', 'unsupported target format');
  const alignment = device.limits.minUniformBufferOffsetAlignment;
  const uniformStride = Math.ceil(UNIFORM_BYTES / alignment) * alignment;
  requireValue(Number.isSafeInteger(uniformStride) && uniformStride >= UNIFORM_BYTES,
    'uniform buffer alignment');
  const owner = { live: true };
  const pending = new Map();
  let bindGroupLayout;
  let shader;
  let pipelineJobs = [];
  let setupFailure;

  pushErrorScopes(device);
  try {
    shader = device.createShaderModule({ label: `${VERSION}/WGSL`, code: WGSL });
    bindGroupLayout = device.createBindGroupLayout({
      label: `${VERSION}/uniform-layout`,
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform', hasDynamicOffset: true, minBindingSize: UNIFORM_BYTES } }]
    });
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
    pipelineJobs = LAYER_RULES.map((layer, index) => device.createRenderPipelineAsync({
      label: `${VERSION}/${layer.name}`,
      layout: pipelineLayout,
      vertex: { module: shader, entryPoint: 'vertexMain' },
      fragment: {
        module: shader, entryPoint: 'fragmentMain', constants: { PASS: index },
        targets: [{ format, blend: {
          color: { srcFactor: 'one', operation: 'add',
            dstFactor: index === 1 ? 'one-minus-src-alpha' : index === 0 ? 'one-minus-src' : 'one' },
          alpha: { srcFactor: 'zero', dstFactor: 'one', operation: 'add' }
        } }]
      },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      multisample: { count: 1 }
    }));
  } catch (error) {
    setupFailure = error;
  }
  const setupErrors = popErrorScopes(device);
  const outcomes = await Promise.allSettled([
    Promise.all(pipelineJobs), setupErrors,
    shader?.getCompilationInfo() ?? Promise.resolve({ messages: [] })
  ]);
  if (setupFailure) throw setupFailure;
  const rejected = outcomes.find(outcome => outcome.status === 'rejected');
  if (rejected) throw gpuFailure(rejected.reason);
  if (outcomes[1].value) throw gpuFailure(outcomes[1].value);
  const shaderErrors = outcomes[2].value.messages.filter(message => message.type === 'error');
  if (shaderErrors.length) {
    throw new Error(shaderErrors.map(message =>
      `${VERSION}:${message.lineNum}:${message.linePos}: ${message.message}`).join('\n'));
  }
  let pipelines = outcomes[0].value;
  let sfx;
  try {
    sfx = audio ? createAudioService(audio, owner) : null;
  } catch (error) {
    owner.live = false;
    pipelines = [];
    bindGroupLayout = null;
    throw error;
  }
  let lastRecordedFrame = -1;
  let lastSubmittedFrame = -1;
  let destruction;

  device.lost.then(() => {
    owner.live = false;
    sfx?.stopAll();
    for (const [receipt, state] of pending) {
      state.buffer?.destroy();
      RECEIPTS.delete(receipt);
    }
    pending.clear();
  });

  function record(frame, plans) {
    requireValue(owner.live, 'renderer disposed or device lost');
    requireValue(frame && Number.isSafeInteger(frame.id) && frame.id > lastRecordedFrame &&
      frame.encoder && frame.colorView, 'frame id must increase; encoder and colorView are required');
    finite(frame.sampledAtMs, 'frame.sampledAtMs', 0, performance.now() + 4);
    requireValue(Number.isInteger(frame.width) && Number.isInteger(frame.height) &&
      frame.width > 0 && frame.height > 0 &&
      Math.max(frame.width, frame.height) <= device.limits.maxTextureDimension2D, 'frame size');
    requireValue(Array.isArray(plans) && plans.length <= MAX_PLANS, 'maximum 64 plans per frame');
    const causeIds = new Set();
    for (const candidate of plans) {
      requireValue(candidate?.[PLAN_BRAND] === true && Object.isFrozen(candidate) &&
        candidate.data?.length === UNIFORM_FLOATS && candidate.width === frame.width &&
        candidate.height === frame.height, 'use plan(input) for this framebuffer size');
      requireValue(!causeIds.has(candidate.eventId), 'duplicate cause ID in one frame');
      causeIds.add(candidate.eventId);
    }
    // Empty preparation frames have no Sunbeam GPU work or buffer. Keep their
    // receipt contract, but do not retain them in the bounded GPU-work queue.
    if (!plans.length) {
      const receipt = Object.freeze({ frameId: frame.id });
      RECEIPTS.set(receipt, {
        owner, id: frame.id, encoder: frame.encoder, sampledAtMs: frame.sampledAtMs,
        plans: [], buffer: null, validation: Promise.resolve(null), phase: 'recorded',
        work: null
      });
      lastRecordedFrame = frame.id;
      return receipt;
    }
    requireValue(pending.size < MAX_PENDING_FRAMES,
      'too many unacknowledged frames');
    const draws = plans.filter(candidate => candidate.drawable);
    let buffer = null;
    pushErrorScopes(device);
    try {
      if (draws.length) {
        buffer = device.createBuffer({
          label: `${VERSION}/frame-${frame.id}`,
          size: uniformStride * draws.length,
          usage: GPUBufferUsage.UNIFORM,
          mappedAtCreation: true
        });
        const memory = buffer.getMappedRange();
        draws.forEach((candidate, index) => {
          new Float32Array(memory, index * uniformStride, UNIFORM_FLOATS).set(candidate.data);
        });
        buffer.unmap();
        const bindGroup = device.createBindGroup({
          label: `${VERSION}/frame-uniforms`, layout: bindGroupLayout,
          entries: [{ binding: 0, resource: { buffer, offset: 0, size: UNIFORM_BYTES } }]
        });
        for (let index = 0; index < LAYER_RULES.length; index++) {
          const layer = LAYER_RULES[index];
          if (layer.extension && !draws.some(candidate => candidate.extensions)) continue;
          const pass = frame.encoder.beginRenderPass({
            label: `${VERSION}/${layer.name}`,
            colorAttachments: [{ view: frame.colorView, loadOp: 'load', storeOp: 'store' }]
          });
          try {
            pass.setPipeline(pipelines[index]);
            for (let draw = 0; draw < draws.length; draw++) {
              const candidate = draws[draw];
              if (layer.extension && !candidate.extensions) continue;
              pass.setBindGroup(0, bindGroup, [draw * uniformStride]);
              pass.setScissorRect(...candidate.scissor);
              pass.draw(6);
            }
          } finally {
            pass.end();
          }
        }
      }
    } catch (error) {
      buffer?.destroy();
      void popErrorScopes(device);
      // The host must discard this encoder after a synchronous record failure.
      throw error;
    }
    const receipt = Object.freeze({ frameId: frame.id });
    const state = {
      owner, id: frame.id, encoder: frame.encoder, sampledAtMs: frame.sampledAtMs,
      plans: [...plans], buffer, validation: popErrorScopes(device), phase: 'recorded', work: null
    };
    RECEIPTS.set(receipt, state);
    pending.set(receipt, state);
    lastRecordedFrame = frame.id;
    return receipt;
  }

  async function submitted(receipt, proof) {
    const state = pending.get(receipt) ?? RECEIPTS.get(receipt);
    requireValue(owner.live && state?.owner === owner && state.phase === 'recorded' &&
      state.id > lastSubmittedFrame,
      'unrecorded, reused, disposed or out-of-order receipt');
    requireValue(proof?.frameId === state.id && proof.encoder === state.encoder &&
      typeof proof.validation?.then === 'function' && typeof proof.done?.then === 'function',
      'driver must provide this encoder, frameId, validation promise and post-submit done promise');
    state.phase = 'submitted';
    lastSubmittedFrame = state.id;
    state.work = (async () => {
      try {
        // allSettled is intentional: do not free a submitted buffer early when
        // validation rejects before the GPU completion promise has settled.
        const results = await Promise.allSettled([state.validation, proof.validation, proof.done]);
        const failure = results.find(result => result.status === 'rejected');
        if (failure) throw gpuFailure(failure.reason);
        if (results[0].value !== null || results[1].value !== null) {
          throw gpuFailure(results[0].value ?? results[1].value);
        }
        requireValue(owner.live, 'renderer disposed or device lost before acknowledgement');
        state.phase = 'activated';
        return receipt;
      } finally {
        state.buffer?.destroy();
        state.buffer = null;
        pending.delete(receipt);
        if (state.phase !== 'activated') RECEIPTS.delete(receipt);
      }
    })();
    return state.work;
  }

  function abandon(receipt) {
    const state = pending.get(receipt) ?? RECEIPTS.get(receipt);
    requireValue(state?.owner === owner && state.phase === 'recorded',
      'only an unsubmitted record may be abandoned');
    state.buffer?.destroy();
    state.buffer = null;
    pending.delete(receipt);
    RECEIPTS.delete(receipt);
  }

  async function destroy() {
    if (destruction) return destruction;
    owner.live = false;
    sfx?.destroy();
    const completions = [];
    for (const [receipt, state] of pending) {
      if (state.phase === 'recorded') abandon(receipt);
      else completions.push(state.work);
    }
    destruction = Promise.allSettled(completions).then(() => {
      pipelines = [];
      bindGroupLayout = null;
    });
    return destruction;
  }

  return Object.freeze({ record, driver: Object.freeze({ submitted, abandon }), sfx, destroy });
}

/** Deterministic, non-silent 1.2-second PCM; no URL, oscillator loop or reverb. */
export function synthesizeSFX(sampleRate = 48000) {
  finite(sampleRate, 'sampleRate', 8000, 192000);
  const pcm = new Float32Array(Math.ceil(sampleRate * 1.2));
  const lowCoefficient = 1 - Math.exp(-TAU * 240 / sampleRate);
  const highCoefficient = 1 - Math.exp(-TAU * 2200 / sampleRate);
  let randomState = 0x492bd617;
  let lowNoise = 0;
  let highNoise = 0;
  let phase = 0;
  let peak = 0;
  for (let index = 0; index < pcm.length; index++) {
    const time = index / sampleRate;
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    const noise = (randomState >>> 0) / 2147483648 - 1;
    lowNoise += lowCoefficient * (noise - lowNoise);
    highNoise += highCoefficient * (noise - highNoise);
    const air = highNoise - lowNoise;
    const frequency = 148 + 65 * smooth(0, 0.135, time) - 38 * smooth(1.02, 1.2, time);
    phase += TAU * frequency / sampleRate;
    const supply = 0.27 * Math.sin(phase) + 0.065 * Math.sin(2 * phase) +
      0.022 * Math.sin(3 * phase);
    const release = smooth(0.012, 0.048, time) * (1 - smooth(0.08, 0.17, time));
    const pressure = 0.90 + 0.055 * Math.sin(TAU * time / 0.238);
    const envelope = smooth(0, 0.010, time) * (1 - 0.25 * smooth(1.02, 1.16, time)) *
      (1 - smooth(1.155, 1.2, time));
    const sample = envelope * (supply * pressure + air * (0.14 + 0.45 * release));
    pcm[index] = sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  const normalization = 0.40 / Math.max(peak, 1e-9);
  for (let index = 0; index < pcm.length; index++) pcm[index] *= normalization;
  pcm[0] = 0;
  pcm[pcm.length - 1] = 0;
  return pcm;
}

function createAudioService({
  context, destination = context?.destination, gates, consumedIds, volume = 0.8
}, owner) {
  requireValue(context && destination && consumedIds instanceof Set,
    'audio requires context, destination and a host-owned session consumedIds Set');
  for (const gate of ['owner', 'room', 'verify', 'unlock']) {
    requireValue(typeof gates?.[gate] === 'function', `audio gate ${gate}`);
  }
  finite(volume, 'audio.volume', 0, 1);
  let audioBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 1.2), context.sampleRate);
  audioBuffer.copyToChannel(synthesizeSFX(context.sampleRate), 0);
  const highpass = context.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 85;
  highpass.Q.value = 0.5;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 3900;
  lowpass.Q.value = 0.5;
  const master = context.createGain();
  master.gain.value = 0.22 * volume;
  highpass.connect(lowpass);
  lowpass.connect(master);
  master.connect(destination);
  const voices = new Map();
  const allocated = new Set();
  let disposed = false;
  let lastAcceptedFrame = -1;

  function gateAllows(metadata) {
    if (!owner.live || disposed || context.state !== 'running') return false;
    try {
      return ['owner', 'room', 'verify', 'unlock'].every(name => gates[name](metadata) === true);
    } catch {
      return false;
    }
  }

  function stop(causeId) {
    const voice = voices.get(causeId);
    if (!voice) return;
    voices.delete(causeId);
    const now = context.currentTime;
    voice.gain.gain.cancelAndHoldAtTime(now);
    voice.gain.gain.linearRampToValueAtTime(0, now + 0.015);
    try { voice.source.stop(now + 0.022); } catch { /* Already stopped. */ }
  }

  function stopAll() {
    for (const causeId of [...voices.keys()]) stop(causeId);
  }

  function refreshGates() {
    for (const [causeId, voice] of voices) {
      if (!gateAllows(voice.metadata)) stop(causeId);
    }
  }

  function renew(voice, metadata, now, offset) {
    const predicted = voice.position + (now - voice.updated) * voice.rate;
    const error = offset - predicted;
    if (metadata.ownerId !== voice.metadata.ownerId || metadata.roomId !== voice.metadata.roomId ||
      now >= voice.deadline || now - voice.born >= 6 || metadata.age + 2 < voice.metadata.age ||
      Math.abs(error) > 0.13) return false;
    voice.rate = clamp(metadata.rate + clamp(error / 0.15, -0.12, 0.12), 0.05, 4);
    voice.position = predicted;
    voice.updated = now;
    voice.metadata = metadata;
    voice.source.playbackRate.setValueAtTime(voice.rate, now);
    const gain = voice.gain.gain;
    gain.cancelAndHoldAtTime(now);
    gain.linearRampToValueAtTime(1, now + 0.010);
    gain.setValueAtTime(1, now + 0.100);
    gain.linearRampToValueAtTime(0, now + 0.160);
    voice.deadline = Math.min(now + 0.180, voice.born + 6);
    // Replaces a still-future stop; never restarts an ended source.
    voice.source.stop(voice.deadline);
    return true;
  }

  function accept(receipt) {
    const packet = RECEIPTS.get(receipt);
    requireValue(packet?.owner === owner && packet.phase === 'activated',
      'SFX receipt has not been activated by this renderer\'s driver, or was already consumed');
    RECEIPTS.delete(receipt);
    if (disposed || !owner.live || packet.id <= lastAcceptedFrame) return false;
    lastAcceptedFrame = packet.id;
    const latency = (performance.now() - packet.sampledAtMs) / 1000;
    const now = context.currentTime;
    const candidates = packet.plans.filter(candidate => candidate.audible);
    const visibleIds = new Set(candidates.map(candidate => candidate.eventId));
    for (const causeId of voices.keys()) {
      if (!visibleIds.has(causeId)) stop(causeId);
    }
    for (const candidate of candidates) {
      const offset = candidate.age / 1000 + latency * candidate.rate;
      const permitted = latency >= 0 && latency <= 0.160 && candidate.rate >= 0.05 &&
        offset < 1.2 && gateAllows(candidate);
      const existing = voices.get(candidate.eventId);
      if (existing) {
        if (!permitted || !renew(existing, candidate, now, offset)) stop(candidate.eventId);
        continue;
      }
      if (consumedIds.has(candidate.eventId)) continue;
      consumedIds.add(candidate.eventId);
      if (!permitted || offset >= 1.12 || allocated.size >= 6) continue;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = audioBuffer;
      source.loop = false;
      source.playbackRate.value = candidate.rate;
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(highpass);
      const voice = {
        source, gain, metadata: candidate, position: offset, updated: now,
        rate: candidate.rate, born: now, deadline: now + 0.180
      };
      voices.set(candidate.eventId, voice);
      allocated.add(voice);
      source.onended = () => {
        if (voices.get(candidate.eventId) === voice) voices.delete(candidate.eventId);
        allocated.delete(voice);
        source.disconnect();
        gain.disconnect();
      };
      try {
        source.start(now, offset);
        if (!renew(voice, candidate, now, offset)) stop(candidate.eventId);
      } catch (error) {
        voices.delete(candidate.eventId);
        allocated.delete(voice);
        source.onended = null;
        try { source.stop(); } catch { /* Source might not have started. */ }
        source.disconnect();
        gain.disconnect();
        throw error;
      }
    }
    return true;
  }

  function onStateChange() {
    if (context.state === 'running') return;
    // Prevent a paused browser AudioContext from replaying stale voices on resume.
    voices.clear();
    for (const voice of allocated) {
      voice.gain.gain.cancelAndHoldAtTime(context.currentTime);
      voice.gain.gain.setValueAtTime(0, context.currentTime);
      try { voice.source.stop(context.currentTime); } catch { /* Already ended. */ }
    }
  }
  context.addEventListener('statechange', onStateChange);

  function destroy() {
    if (disposed) return;
    disposed = true;
    stopAll();
    context.removeEventListener('statechange', onStateChange);
    // One finite resource cleanup timer; not a playback timer or a retry queue.
    setTimeout(() => {
      for (const voice of allocated) {
        try { voice.source.stop(); } catch { /* Already ended. */ }
        voice.source.onended = null;
        voice.source.disconnect();
        voice.gain.disconnect();
      }
      allocated.clear();
      audioBuffer = null;
      highpass.disconnect();
      lowpass.disconnect();
      master.disconnect();
    }, 60);
    // consumedIds belongs to the host. Never clear or evict its session IDs.
  }

  return Object.freeze({ accept, refreshGates, stopAll, destroy });
}

export const TEST_TIMES = Object.freeze([
  0, 16, 45, 90, 180, 550, 819, 820, 1000, 1080, 1150, 1180, 1199, 1200
]);

/** Same default dimensions, anchor positions and range as the previous API. */
export function testInput(age = 550, twoPalms = true) {
  return {
    eventId: 'test/cause-1', ownerId: 'flora', roomId: 'test-room',
    actorNowMs: age, startActorMs: 0, actorRate: 1,
    characterElapsedMs: Math.min(age, 820), rangeWorld: 450,
    alive: true, visible: true, twoPalms,
    camera: { zoom: 1.65, cssPxPerWorld: 1 },
    viewport: { widthCss: 980, heightCss: 620, dpr: 1 },
    rays: (twoPalms ? [280, 314] : [297]).map(y => ({
      palmCss: [110, y], endCss: [852.5, y], directionCss: [1, 0]
    }))
  };
}
