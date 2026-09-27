/* Sunbeam E. No game-state writes, textures, Canvas2D, or GPU readback.
 * One renderer + one SFX service per scene/session. Host coordinates are CSS px.
 * record() receives the COMPLETE set of this scene's E plans for one frame.
 * frame = { id: increasing safe integer, encoder, colorView, width, height }.
 * Target: already rendered, opaque, single-sampled color; draw UI afterwards.
 */
export const CONTRACT = Object.freeze({
  maxRangeWorld: 950, hitWidthWorld: 52,
  lifetimeActorMs: 1200, motionCharacterMs: 820, visualWidthWorld: 48
});
const VERSION = 'sunbeam-e/1';
const LAYERS = ['spill', 'base', 'transport', 'emission'];
const receipts = new WeakMap();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function smooth(a, b, x) {
  const u = clamp((x - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
}
function requireThat(ok, message) {
  if (!ok) throw new TypeError(`Sunbeam E: ${message}`);
}
function number(x, name, lo = -1e12, hi = 1e12) {
  requireThat(Number.isFinite(x) && x >= lo && x <= hi, name);
  return x;
}
function boolean(x, name) {
  requireThat(typeof x === 'boolean', name);
  return x;
}
function point(x, name) {
  requireThat(Array.isArray(x) && x.length === 2, name);
  return x.map((v, i) => number(v, `${name}[${i}]`, -1e7, 1e7));
}
function seed(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) / 4294967296) * Math.PI * 2;
}
function freezeTree(x) {
  if (x && typeof x === 'object') {
    for (const value of Object.values(x)) freezeTree(value);
    Object.freeze(x);
  }
  return x;
}

/** Pure: only validates/copies input and computes immutable CPU data.
 * camera.zoom * camera.cssPxPerWorld = CSS px per world unit.
 * rays: 1 or 2 {palmCss:[x,y], endCss:[x,y], directionCss:[dx,dy]}.
 * The host projects the supplied firing-hand anchor and endpoint every frame.
 * Optional rangeWorld validates the host's collision range, separately from palm offsets.
 * Optional ray.lengthWorld audits projection length, not collision range.
 * Character time is diagnostic only. actorRate defaults to 1 (actor ms/real ms).
 */
export function plan(input) {
  requireThat(input && typeof input === 'object', 'input object required');
  const id = input.eventId;
  requireThat(typeof id === 'string' && id.length > 0 && id.length <= 256, 'eventId');
  const now = number(input.actorNowMs, 'actorNowMs');
  const start = number(input.startActorMs, 'startActorMs');
  const age = number(now - start, 'elapsed actor time');
  const characterMs = number(input.characterElapsedMs ?? 0, 'characterElapsedMs', 0);
  const rate = number(input.actorRate ?? 1, 'actorRate', 0, 4);
  const rangeWorld = input.rangeWorld === undefined ? null : number(input.rangeWorld, 'rangeWorld', 0, 950);
  const alive = boolean(input.alive, 'alive');
  const visible = boolean(input.visible, 'visible');
  const cancelled = boolean(input.cancelled ?? false, 'cancelled');
  const two = boolean(input.twoPalms, 'twoPalms');
  const reduced = boolean(input.reducedMotion ?? false, 'reducedMotion');
  const quality = input.quality ?? 'full';
  requireThat(quality === 'full' || quality === 'low', 'quality');
  const vp = input.viewport;
  const cam = input.camera;
  requireThat(vp && cam, 'viewport and camera required');
  const dpr = number(vp.dpr, 'dpr', 0.25, 8);
  const cssW = number(vp.widthCss, 'widthCss', 1, 32768);
  const cssH = number(vp.heightCss, 'heightCss', 1, 32768);
  const zoom = number(cam.zoom, 'camera.zoom', 0.01, 100);
  const unit = number(cam.cssPxPerWorld ?? 1, 'camera.cssPxPerWorld', 0.01, 100);
  const scaleCss = zoom * unit;
  const scale = scaleCss * dpr;
  const width = Math.round(cssW * dpr), height = Math.round(cssH * dpr);
  requireThat(Array.isArray(input.rays) && input.rays.length === (two ? 2 : 1), 'rays/twoPalms mismatch');
  const rays = input.rays.map((ray, index) => {
    requireThat(ray && typeof ray === 'object', `ray ${index}`);
    const a = point(ray.palmCss, 'palmCss');
    const b = point(ray.endCss, 'endCss');
    const dir = point(ray.directionCss, 'directionCss');
    const dn = Math.hypot(...dir);
    requireThat(dn > 1e-9, 'direction must be nonzero');
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    const lengthWorld = len / scaleCss; // Geometric draw length, NOT collision range.
    if (ray.lengthWorld !== undefined) {
      const expected = number(ray.lengthWorld, 'ray.lengthWorld', 0);
      requireThat(Math.abs(len - expected * scaleCss) <= Math.max(0.25, len * 0.001), 'projection/length mismatch');
      if (expected === 0) requireThat(len < 1e-7, 'zero draw length must have coincident endpoints');
    }
    if (len > 1e-7) {
      requireThat((dx * dir[0] + dy * dir[1]) / (len * dn) > 0.9999, 'direction/end mismatch');
    }
    return { segment: [a[0] * dpr, a[1] * dpr, b[0] * dpr, b[1] * dpr],
      direction: len > 1e-7 ? [dx / len, dy / len] : [dir[0] / dn, dir[1] / dn],
      lengthWorld, lengthPx: len * dpr };
  });
  const enabled = LAYERS.map(name => boolean(input.layers?.[name] ?? true, `layers.${name}`));
  if (quality === 'low') { enabled[0] = false; enabled[2] = false; }
  const intensity = (0.32 + 0.68 * smooth(0, 64, age)) * (1 - smooth(1120, 1200, age));
  const widthFactor = 0.88 + 0.12 * smooth(0, 64, age);
  const front = reduced ? 1 : 0.12 + 0.88 * smooth(0, 64, age);
  const axis = (rays.find(r => r.lengthPx > 0) ?? rays[0]).direction;
  const normal = [-axis[1], axis[0]];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let minA = Infinity, minN = Infinity, maxA = -Infinity, maxN = -Infinity;
  for (const ray of rays) {
    const s = ray.segment;
    const rayFront = 1 + (front - 1) * smooth(80, 160, ray.lengthWorld);
    for (const p of [[s[0], s[1]], [s[0] + (s[2] - s[0]) * rayFront, s[1] + (s[3] - s[1]) * rayFront]]) {
      const a = p[0] * axis[0] + p[1] * axis[1];
      const n = p[0] * normal[0] + p[1] * normal[1];
      minA = Math.min(minA, a); maxA = Math.max(maxA, a);
      minN = Math.min(minN, n); maxN = Math.max(maxN, n);
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    }
  }
  const shortScale = Math.min(1, Math.max(...rays.map(r => r.lengthWorld)) / 100);
  const pad = (enabled[0] ? 84 : 27) * scale * shortScale + 2;
  const rect = [minA - pad, minN - pad, maxA + pad, maxN + pad];
  const sx = clamp(Math.floor(minX - pad), 0, width);
  const sy = clamp(Math.floor(minY - pad), 0, height);
  const ex = clamp(Math.ceil(maxX + pad), 0, width);
  const ey = clamp(Math.ceil(maxY + pad), 0, height);
  const active = alive && visible && !cancelled && age >= 0 && age < 1200;
  const drawable = active && rays.some(r => r.lengthPx >= 1e-5) && ex > sx && ey > sy && enabled.some(Boolean);
  const first = rays[0].segment, second = (rays[1] ?? rays[0]).segment;
  const uniform = [width, height, age / 1000, intensity,
    scale, widthFactor, front, reduced ? 1 : 0,
    ...rect, axis[0], axis[1], seed(id), rays.length, ...first, ...second];
  const pan = clamp((rays.reduce((sum, r) => sum + r.segment[0], 0) / rays.length / width) * 2 - 1, -0.8, 0.8);
  return freezeTree({ version: VERSION, eventId: id, ageMs: age, characterElapsedMs: characterMs,
    actorRate: rate, rangeWorld, width, height, active, drawable, enabled, uniform, pan,
    scissor: [sx, sy, ex - sx, ey - sy], rays,
    // Values are reports, not collision objects and not gameplay modifications.
    maxRangeWorld: 950, hitWidthWorld: 52, visualWidthWorld: 48 * widthFactor * shortScale });
}

export const WGSL = /* wgsl */ `
struct Params {
  screen: vec4<f32>, // framebuffer width, height, actor seconds, common envelope
  style: vec4<f32>,  // px/world, width factor, front fraction, reduced motion
  rect: vec4<f32>,   // bounds along the chosen screen-space basis
  axis: vec4<f32>,   // basis direction xy, event phase, palm count
  ray0: vec4<f32>,
  ray1: vec4<f32>,
}
@group(0) @binding(0) var<uniform> u: Params;
override MODE: u32 = 1u; // 0 spill, 1 base, 2 transport, 3 emission

@vertex fn vs(@builtin(vertex_index) id: u32) -> @builtin(position) vec4<f32> {
  let corners = array<vec2<f32>, 6>(
    vec2(0.0,0.0), vec2(1.0,0.0), vec2(0.0,1.0),
    vec2(0.0,1.0), vec2(1.0,0.0), vec2(1.0,1.0));
  let q = mix(u.rect.xy, u.rect.zw, corners[id]);
  let p = u.axis.xy * q.x + vec2(-u.axis.y, u.axis.x) * q.y;
  return vec4(p.x / u.screen.x * 2.0 - 1.0, 1.0 - p.y / u.screen.y * 2.0, 0.0, 1.0);
}
fn gaussian(x: f32) -> f32 { return exp(-x*x); }
fn shade(p: vec2<f32>, ray: vec4<f32>) -> vec4<f32> {
  let delta = ray.zw - ray.xy;
  let fullLength = length(delta);
  if (fullLength < 0.00001) { return vec4(0.0); }
  let d = delta / fullLength;
  let rel = p - ray.xy;
  let x = dot(rel, d);
  let y = dot(rel, vec2(-d.y, d.x));
  let unit = u.style.x;
  let front = mix(1.0, u.style.z, smoothstep(80.0*unit, 160.0*unit, fullLength));
  let extent = max(fullLength * front, 0.00001);
  let opticalUnit = unit * min(1.0, fullLength / (100.0*unit));
  let rise = max(min(84.0 * unit, extent * 0.40), 0.00001);
  let radius = max(24.0 * opticalUnit * u.style.y * (0.38 + 0.62 * smoothstep(0.0, rise, x)), 0.00001);
  let eta = y / radius;
  let capLength = min(20.0 * unit, extent * 0.22);
  let cut = extent - capLength * eta * eta;
  // Coverage AA is one framebuffer pixel, not a minimum gameplay width.
  let side = 1.0 - smoothstep(radius - 0.8, radius + 0.8, abs(y));
  let axial = smoothstep(-0.8, 0.8, x) * (1.0 - smoothstep(cut - 0.8, cut + 0.8, x));
  let body = side * axial;
  let env = u.screen.w;
  let t = u.screen.z;
  let moving = 1.0 - u.style.w;
  let worldX = x / unit;
  let drift = moving * 0.045 * sin(worldX * 0.020 - t * 5.0 + u.axis.z);
  let hotSheet = gaussian((eta + 0.24 + drift) / 0.23);
  let secondSheet = gaussian((eta - 0.47 - drift) / 0.17);
  let clearLane = gaussian((eta - 0.10) / 0.15);
  let source = gaussian(x / max(min(32.0 * unit, extent * 0.3), 0.00001)) * gaussian(eta / 0.70);
  let tip = gaussian((x - cut) / max(min(8.0 * unit, extent * 0.12), 0.00001));
  if (MODE == 0u) {
    let along = smoothstep(-30.0*opticalUnit, 0.0, x) * (1.0 - smoothstep(extent, extent+30.0*opticalUnit, x));
    let halo = gaussian(y / (37.0*opticalUnit)) * along * (1.0 - body*0.65);
    let rootLight = gaussian(length(rel / (26.0*opticalUnit)));
    let endRel = p - (ray.xy + d*extent);
    let endLight = gaussian(length(endRel / (22.0*opticalUnit)));
    let light = (0.095*halo + 0.14*rootLight + 0.055*endLight) * env;
    return vec4(vec3(1.0,0.59,0.12)*light, 0.0);
  }
  if (MODE == 1u) {
    let density = 0.48 + 0.20*gaussian(eta/0.75) - 0.25*clearLane;
    let a = body * env * min(density + source*0.16, 0.88);
    let gold = mix(vec3(0.64,0.22,0.018), vec3(1.0,0.69,0.14), gaussian(eta/0.80));
    let color = mix(gold, vec3(1.0,0.91,0.60), source*0.48);
    return vec4(color*a, a);
  }
  if (MODE == 2u) {
    // Wide moving radiance bands. They never mask or fragment the base.
    let wave = 0.5 + 0.5*sin(worldX*0.036 - t*15.0 + eta*1.8 + u.axis.z);
    let bands = mix(0.56, 0.30 + 0.70*wave*wave, moving);
    let flux = body*env*(0.13*hotSheet + 0.095*secondSheet)*bands;
    return vec4(vec3(1.0,0.75,0.28)*flux, 0.0);
  }
  let edge = gaussian((abs(eta)-0.88)/0.11);
  let release = 1.0 + moving*0.12*gaussian((t-0.085)/0.05);
  let energy = body*env*release*(0.045 + 0.78*hotSheet + 0.36*secondSheet + 0.62*source + 0.18*tip);
  let rgb = vec3(1.0,0.93,0.72)*energy + vec3(1.0,0.51,0.07)*edge*body*env*0.16;
  return vec4(rgb, 0.0);
}
@fragment fn fs(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  let a = shade(position.xy, u.ray0);
  if (u.axis.w < 1.5) { return a; }
  // A geometric/optical union: identical palms do not double opacity or light.
  return max(a, shade(position.xy, u.ray1));
}
`;

function pushScopes(device) {
  for (const type of ['internal', 'out-of-memory', 'validation']) device.pushErrorScope(type);
}
function popScopes(device) {
  const promises = [device.popErrorScope(), device.popErrorScope(), device.popErrorScope()];
  return Promise.all(promises).then(errors => errors.filter(Boolean));
}
/** Async pipeline creation; shares, and never destroys, the host device/target. */
export async function create({ device, format, maxEvents = 128 }) {
  requireThat(device?.queue && typeof device.createRenderPipelineAsync === 'function', 'WebGPU device');
  requireThat(['bgra8unorm','rgba8unorm','bgra8unorm-srgb','rgba8unorm-srgb','rgba16float'].includes(format), 'color format');
  requireThat(Number.isSafeInteger(maxEvents) && maxEvents > 0 && maxEvents <= 4096, 'maxEvents');
  const stride = Math.ceil(96 / device.limits.minUniformBufferOffsetAlignment) * device.limits.minUniformBufferOffsetAlignment;
  let layout, pipelines, module, jobs = [], setupError;
  pushScopes(device);
  try {
    module = device.createShaderModule({ label: VERSION, code: WGSL });
    layout = device.createBindGroupLayout({ entries: [{ binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform', hasDynamicOffset: true, minBindingSize: 96 } }] });
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout] });
    const additive = { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
      alpha: { srcFactor: 'zero', dstFactor: 'one', operation: 'add' } };
    const over = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
    jobs = LAYERS.map((name, mode) => device.createRenderPipelineAsync({
      label: `${VERSION}/${name}`, layout: pipelineLayout,
      vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', constants: { MODE: mode },
        targets: [{ format, blend: mode === 1 ? over : additive }] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      multisample: { count: 1 }
    }));
  } catch (error) { setupError = error; }
  // Close all device-global scopes synchronously, before the first await.
  const setupScopes = popScopes(device);
  const results = await Promise.allSettled([
    Promise.all(jobs), setupScopes, module?.getCompilationInfo()
  ]);
  if (setupError) throw setupError;
  for (const r of results) if (r.status === 'rejected') throw r.reason;
  if (results[1].value.length) throw new Error(results[1].value.map(e => e.message).join('\n'));
  const shaderErrors = results[2].value.messages.filter(m => m.type === 'error');
  if (shaderErrors.length) throw new Error(shaderErrors.map(m => `${m.lineNum}:${m.linePos} ${m.message}`).join('\n'));
  pipelines = results[0].value;
  let disposed = false, lastRecordedId = -1, lastSubmittedId = -1;
  const pending = new Map();
  const inFlight = new Set();
  device.lost.then(() => { disposed = true; for (const b of inFlight) b.destroy(); inFlight.clear();
    for (const state of pending.values()) state.buffer?.destroy(); pending.clear(); });

  function record(frame, plans) {
    requireThat(!disposed, 'renderer disposed/device lost');
    requireThat(frame && Number.isSafeInteger(frame.id) && frame.id > lastRecordedId, 'increasing frame.id');
    requireThat(frame.encoder && frame.colorView, 'frame encoder/colorView');
    requireThat(Number.isInteger(frame.width) && Number.isInteger(frame.height) && frame.width > 0 && frame.height > 0 &&
      frame.width <= device.limits.maxTextureDimension2D && frame.height <= device.limits.maxTextureDimension2D, 'frame size');
    requireThat(Array.isArray(plans) && plans.length <= maxEvents, 'plans/maxEvents');
    const ids = new Set();
    for (const p of plans) {
      requireThat(p?.version === VERSION && Object.isFrozen(p) && p.uniform.length === 24, 'use plan(input)');
      requireThat(p.width === frame.width && p.height === frame.height, 'plan/target size mismatch');
      requireThat(!ids.has(p.eventId), 'duplicate cause ID in one frame'); ids.add(p.eventId);
    }
    requireThat(!pending.has(frame), 'frame already recorded');
    const draws = plans.filter(p => p.drawable);
    let buffer = null, bind = null;
    pushScopes(device);
    try {
      if (draws.length) {
        buffer = device.createBuffer({ label: `${VERSION}/frame-${frame.id}`, size: stride * draws.length,
          usage: GPUBufferUsage.UNIFORM, mappedAtCreation: true });
        const bytes = buffer.getMappedRange();
        draws.forEach((p, i) => new Float32Array(bytes, i * stride, 24).set(p.uniform));
        buffer.unmap();
        bind = device.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer, offset: 0, size: 96 } }] });
        for (let layer = 0; layer < LAYERS.length; layer++) {
          if (!draws.some(p => p.enabled[layer])) continue;
          const pass = frame.encoder.beginRenderPass({ label: `${VERSION}/${LAYERS[layer]}`,
            colorAttachments: [{ view: frame.colorView, loadOp: 'load', storeOp: 'store' }] });
          pass.setPipeline(pipelines[layer]);
          for (let i = 0; i < draws.length; i++) {
            const p = draws[i];
            if (!p.enabled[layer]) continue;
            pass.setBindGroup(0, bind, [i * stride]);
            pass.setScissorRect(...p.scissor);
            pass.draw(6);
          }
          pass.end();
        }
      }
    } catch (error) {
      buffer?.destroy(); void popScopes(device); throw error;
    }
    const errors = popScopes(device);
    pending.set(frame, { id: frame.id, encoder: frame.encoder, buffer, errors, plans: [...plans] });
    lastRecordedId = frame.id;
    return Object.freeze({ frameId: frame.id, draws: draws.reduce((n, p) => n + p.enabled.filter(Boolean).length, 0),
      events: draws.length, uniformBytes: draws.length * stride });
  }

  // Host may add other commands to this same encoder BEFORE submit().
  // Do not finish/submit this encoder elsewhere: this is the submission owner.
  async function submit(frame) {
    requireThat(!disposed, 'renderer disposed/device lost');
    const state = pending.get(frame);
    requireThat(state && state.id > lastSubmittedId && frame.encoder === state.encoder, 'unrecorded/out-of-order frame');
    pending.delete(frame);
    lastSubmittedId = state.id;
    pushScopes(device);
    const submittedAt = performance.now();
    let syncError;
    try { device.queue.submit([state.encoder.finish()]); } catch (e) { syncError = e; }
    const submissionErrors = popScopes(device);
    if (state.buffer) inFlight.add(state.buffer);
    try {
      const [recordErrors, submitErrors] = await Promise.all([
        state.errors, submissionErrors, device.queue.onSubmittedWorkDone()
      ]);
      if (syncError) throw syncError;
      if (disposed) throw new Error('Sunbeam E: device lost or renderer disposed');
      const errors = [...recordErrors, ...submitErrors];
      if (errors.length) throw new Error(errors.map(e => e.message).join('\n'));
      const receipt = Object.freeze({ frameId: state.id,
        renderedEventIds: Object.freeze(state.plans.filter(p => p.drawable && p.enabled[1]).map(p => p.eventId)) });
      receipts.set(receipt, { frameId: state.id, submittedAt, plans: state.plans });
      return receipt;
    } finally { state.buffer?.destroy(); inFlight.delete(state.buffer); }
  }
  function discard(frame) {
    const state = pending.get(frame);
    if (!state) return false;
    pending.delete(frame); state.buffer?.destroy();
    // The discarded encoder must never be submitted; it references this buffer.
    return true;
  }
  async function destroy() {
    if (disposed && !pending.size && !inFlight.size) return;
    disposed = true;
    for (const frame of pending.keys()) discard(frame);
    try { await device.queue.onSubmittedWorkDone(); } catch { /* device lost */ }
    for (const b of inFlight) b.destroy();
    inFlight.clear(); pipelines = []; layout = null;
  }
  return Object.freeze({ record, submit, discard, destroy });
}

/** Non-silent, deterministic 1.2 s mono PCM. No URL, network or loop. */
export function synthesizeSFX(sampleRate = 48000) {
  number(sampleRate, 'sampleRate', 8000, 192000);
  const data = new Float32Array(Math.ceil(sampleRate * 1.2));
  let rng = 0x6193a527, low = 0, high = 0, phase = 0, peak = 0;
  const aLow = 1 - Math.exp(-2 * Math.PI * 350 / sampleRate);
  const aHigh = 1 - Math.exp(-2 * Math.PI * 2400 / sampleRate);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5;
    const noise = (rng >>> 0) / 2147483648 - 1;
    low += aLow * (noise - low); high += aHigh * (noise - high);
    const air = high - low;
    const frequency = 172 + 38 * smooth(0, 0.12, t) - 24 * smooth(1.12, 1.2, t);
    phase += 2 * Math.PI * frequency / sampleRate;
    const tone = 0.27 * Math.sin(phase) + 0.10 * Math.sin(phase * 2) + 0.045 * Math.sin(phase * 3);
    const supply = 1 - smooth(0.07, 0.18, t);
    const release = smooth(0.025, 0.065, t) * (1 - smooth(0.095, 0.20, t));
    const sustain = 0.76 + 0.05 * Math.sin(2 * Math.PI * 2.2 * t);
    const envelope = smooth(0, 0.009, t) * (1 - smooth(1.12, 1.2, t));
    const value = envelope * (tone * (sustain + supply * 0.14) + air * (0.12 + release * 0.48));
    data[i] = value; peak = Math.max(peak, Math.abs(value));
  }
  const gain = 0.35 / Math.max(peak, 1e-9);
  for (let i = 0; i < data.length; i++) data[i] *= gain;
  data[0] = 0; data[data.length - 1] = 0;
  return data;
}

/** accept() only accepts real, checked receipts minted by submit() above.
 * Keep one service for the session so the cause-ID tombstones remain valid.
 * Call unlock() directly from a user gesture; no silent-file workaround.
 */
export function createSFX({ context, destination = context?.destination, volume = 0.8, maxVoices = 6 } = {}) {
  requireThat(context && destination && typeof context.createBuffer === 'function', 'AudioContext/destination');
  number(volume, 'volume', 0, 1);
  requireThat(Number.isInteger(maxVoices) && maxVoices >= 1 && maxVoices <= 6, 'maxVoices 1..6');
  const pcm = synthesizeSFX(context.sampleRate);
  let buffer = context.createBuffer(1, pcm.length, context.sampleRate);
  buffer.copyToChannel(pcm, 0);
  const highpass = context.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 100; highpass.Q.value = 0.5;
  const lowpass = context.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 4200; lowpass.Q.value = 0.5;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -12; compressor.knee.value = 12; compressor.ratio.value = 4;
  compressor.attack.value = 0.005; compressor.release.value = 0.045;
  const master = context.createGain(); master.gain.value = 0.22 * volume;
  highpass.connect(lowpass); lowpass.connect(compressor); compressor.connect(master); master.connect(destination);
  const seen = new Set(), voices = new Map(), allocated = new Set();
  let disposed = false, lastFrame = -1, starts = 0, suppressed = 0;
  function hold(param, now) { param.cancelAndHoldAtTime(now); }
  function stop(id) {
    const v = voices.get(id);
    if (!v) return;
    voices.delete(id);
    const now = context.currentTime;
    hold(v.gain.gain, now); v.gain.gain.linearRampToValueAtTime(0, now + 0.018);
    try { v.source.stop(now + 0.024); } catch { /* already ended */ }
  }
  function renew(v, p, now, offset) {
    if (now >= v.deadline || now - v.born > 6 || p.actorRate === 0 || p.ageMs + 4 < v.lastAge) return false;
    // A discontinuous actor-clock seek is not replayed or scrubbed audibly.
    const predicted = v.position + (now - v.updated) * v.rate;
    const error = offset - predicted;
    if (Math.abs(error) > 0.16) return false;
    const nextRate = clamp(p.actorRate + clamp(error / 0.12, -0.15, 0.15), 0.05, 4);
    v.source.playbackRate.setValueAtTime(nextRate, now);
    v.position = predicted; v.updated = now; v.rate = nextRate; v.lastAge = p.ageMs;
    v.pan.pan.setTargetAtTime(p.pan, now, 0.02);
    hold(v.gain.gain, now);
    v.gain.gain.linearRampToValueAtTime(1, now + 0.008);
    v.gain.gain.setValueAtTime(1, now + 0.100);
    v.gain.gain.linearRampToValueAtTime(0, now + 0.160);
    v.deadline = Math.min(now + 0.180, v.born + 6);
    // Later stop() calls replace the pending stop while the source still lives.
    v.source.stop(v.deadline);
    return true;
  }
  function accept(receipt) {
    const packet = receipts.get(receipt);
    requireThat(packet, 'untrusted or already consumed submission receipt');
    receipts.delete(receipt);
    if (disposed || packet.frameId <= lastFrame) return false;
    lastFrame = packet.frameId;
    const delay = Math.max(0, (performance.now() - packet.submittedAt) / 1000);
    const now = context.currentTime;
    const candidates = packet.plans.filter(p => p.drawable && p.enabled[1]);
    const ids = new Set(candidates.map(p => p.eventId));
    for (const id of voices.keys()) if (!ids.has(id)) stop(id);
    for (const p of candidates) {
      const offset = p.ageMs / 1000 + delay * p.actorRate;
      const valid = context.state === 'running' && delay <= 0.160 && p.actorRate > 0 && offset < 1.2;
      let v = voices.get(p.eventId);
      if (v) {
        if (!valid || !renew(v, p, now, offset)) stop(p.eventId);
        continue;
      }
      if (seen.has(p.eventId)) continue;
      seen.add(p.eventId); // Never evict during the same session.
      if (!valid || offset >= 1.12 || allocated.size >= maxVoices) { suppressed++; continue; }
      const source = context.createBufferSource(); source.buffer = buffer; source.loop = false;
      const gain = context.createGain(); gain.gain.value = 0;
      const pan = context.createStereoPanner(); pan.pan.value = p.pan;
      source.connect(gain); gain.connect(pan); pan.connect(highpass);
      v = { source, gain, pan, born: now, updated: now, position: offset, rate: p.actorRate,
        lastAge: p.ageMs, deadline: now + 0.180 };
      voices.set(p.eventId, v); allocated.add(v);
      source.onended = () => {
        if (voices.get(p.eventId) === v) voices.delete(p.eventId);
        allocated.delete(v); source.disconnect(); gain.disconnect(); pan.disconnect();
      };
      source.playbackRate.value = p.actorRate;
      source.start(now, offset); starts++;
      renew(v, p, now, offset);
    }
    return true;
  }
  function stopAll() { for (const id of [...voices.keys()]) stop(id); }
  async function unlock() { requireThat(!disposed, 'SFX disposed'); await context.resume(); return context.state === 'running'; }
  function destroy() {
    if (disposed) return;
    disposed = true; stopAll();
    const now = context.currentTime;
    hold(master.gain, now); master.gain.linearRampToValueAtTime(0, now + 0.025);
    // A finite cleanup timer; it does not schedule sound or replay anything.
    setTimeout(() => {
      for (const v of allocated) {
        try { v.source.stop(); } catch { /* already stopped */ }
        v.source.onended = null; v.source.disconnect(); v.gain.disconnect(); v.pan.disconnect();
      }
      allocated.clear(); buffer = null;
      highpass.disconnect(); lowpass.disconnect(); compressor.disconnect(); master.disconnect();
    }, 60);
    seen.clear();
  }
  return Object.freeze({ accept, unlock, stopAll, destroy,
    stats: () => Object.freeze({ starts, suppressed, activeVoices: voices.size, consumedEventIds: seen.size }) });
}