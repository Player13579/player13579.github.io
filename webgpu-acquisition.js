/* Textureless acquisition E. Screen-space inputs and the game clock belong to the caller. */
(function (root) {
  'use strict';
  const FLOATS_PER_EFFECT = 24;
  const QUADS_PER_EFFECT = 101; // 3 x 32 ribbon segments, 3 motes, one head, one UI rim.
  const shader = /* wgsl */ `
struct View { size: vec4f }
struct Effect {
  path: vec4f, // origin.xy, control.xy
  end: vec4f, // target.xy, current head.xy
  shape: vec4f, // heading, width, alpha, tailScale
  time: vec4f, // progress, elapsed milliseconds, reducedMotion, arrival alpha
  rect: vec4f, // left, top, width, height
  extra: vec4f, // border radius
}
@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var<storage, read> effects: array<Effect>;
struct Vertex {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) strength: f32,
  @location(2) @interpolate(flat) kind: u32,
  @location(3) @interpolate(flat) effectIndex: u32,
}
fn curve(e: Effect, t: f32) -> vec2f {
  let s = 1.0 - t;
  return s * s * e.path.xy + 2.0 * s * t * e.path.zw + t * t * e.end.xy;
}
fn tangent(e: Effect, t: f32) -> vec2f {
  let direction = 2.0 * (1.0 - t) * (e.path.zw - e.path.xy) + 2.0 * t * (e.end.xy - e.path.zw);
  let magnitude = length(direction);
  return select(vec2f(1.0, 0.0), direction / max(magnitude, 0.001), magnitude > 0.001);
}
fn ribbonPoint(e: Effect, t: f32, lane: f32, local: f32, span: f32) -> vec2f {
  let axis = tangent(e, t);
  let separation = lane * e.shape.y * 0.072 * sin(3.14159265 * local) * min(1.0, span * 8.0);
  return curve(e, t) + vec2f(-axis.y, axis.x) * separation;
}
@vertex fn vs(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> Vertex {
  // No vertex buffer: six vertices per analytic quad, including the animated Bezier ribbons.
  let corners = array<vec2f, 6>(vec2f(0, -1), vec2f(1, -1), vec2f(0, 1), vec2f(0, 1), vec2f(1, -1), vec2f(1, 1));
  let corner = corners[vertex];
  let index = instance / 101u;
  let primitive = instance % 101u;
  let e = effects[index];
  var point = e.end.zw;
  var uv = vec2f(corner.x * 2.0 - 1.0, corner.y);
  var strength = 0.0;
  var kind = 0u;
  let reduced = e.time.z > 0.5;
  let tailFraction = select(0.34, 0.20, reduced) * e.shape.w;
  let start = max(0.0, e.time.x - tailFraction);
  let span = max(0.001, e.time.x - start);
  if (primitive < 96u) {
    let laneIndex = primitive / 32u;
    let lane = f32(laneIndex) - 1.0;
    let local = (f32(primitive % 32u) + corner.x) / 32.0;
    let t = start + span * local;
    let axis = tangent(e, t);
    let taper = 1.0 - pow(1.0 - clamp(local / 0.72, 0.0, 1.0), 3.0);
    let halfWidth = max(0.65, e.shape.y * 0.027 * (0.16 + 0.84 * taper));
    point = ribbonPoint(e, t, lane, local, span) + vec2f(-axis.y, axis.x) * corner.y * halfWidth * 3.0;
    uv = vec2f(local, corner.y * 3.0);
    strength = e.shape.z * taper * select(0.60, 1.0, laneIndex == 1u) * e.shape.w;
    if (reduced && laneIndex != 1u) { strength = 0.0; }
  } else if (primitive < 99u) {
    kind = 1u;
    let mote = f32(primitive - 96u);
    let local = fract(e.time.y / 150.0 + mote * 0.31);
    let along = 0.18 + local * 0.76;
    let radius = max(0.8, e.shape.y * 0.01);
    point = ribbonPoint(e, start + span * along, mote - 1.0, along, span) + uv * radius * 4.0;
    strength = sin(3.14159265 * local) * e.shape.z * 0.65 * e.shape.w;
    if (reduced) { strength = 0.0; }
  } else if (primitive == 99u) {
    kind = 2u;
    let axis = vec2f(cos(e.shape.x), sin(e.shape.x));
    let normal = vec2f(-axis.y, axis.x);
    let extent = vec2f(max(4.0, e.shape.y * (0.055 + 0.13 * e.shape.w)), max(1.8, e.shape.y * (0.018 + 0.027 * e.shape.w)));
    point += axis * (uv.x * extent.x * 2.8) + normal * (uv.y * extent.y * 3.4);
    strength = e.shape.z * (0.14 + 0.86 * e.shape.w);
  } else {
    kind = 3u;
    let halfSize = max(vec2f(0.0), e.rect.zw * 0.5 - vec2f(1.0));
    uv *= halfSize + vec2f(15.0);
    point = e.rect.xy + e.rect.zw * 0.5 + uv;
    strength = e.time.w;
  }
  var out: Vertex;
  out.position = vec4f(point / view.size.xy * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  out.uv = uv;
  out.strength = strength;
  out.kind = kind;
  out.effectIndex = index;
  return out;
}
@fragment fn fs(in: Vertex) -> @location(0) vec4f {
  let e = effects[in.effectIndex];
  // Evaluate derivatives uniformly, including invisible primitives, for valid WGSL uniformity.
  let pixel = max(0.35, max(length(dpdx(in.uv)), length(dpdy(in.uv))));
  var glow = 0.0;
  var core = 0.0;
  if (in.kind == 0u) {
    let across = abs(in.uv.y);
    glow = exp(-across * across * 0.70) * 0.25;
    core = exp(-across * across * 22.0) * 0.85;
  } else if (in.kind == 1u) {
    let radiusSquared = dot(in.uv, in.uv);
    glow = exp(-radiusSquared * 6.0) * 0.33;
    core = exp(-radiusSquared * 36.0) * 0.95;
  } else if (in.kind == 2u) {
    let q = vec2f(in.uv.x * 2.8 - 0.20, in.uv.y * 3.4);
    let radiusSquared = dot(q, q);
    glow = exp(-radiusSquared * 1.15) * 0.42;
    core = exp(-dot(q * vec2f(1.8, 2.5), q * vec2f(1.8, 2.5))) * 0.98;
  } else {
    let halfSize = max(vec2f(0.0), e.rect.zw * 0.5 - vec2f(1.0));
    let radius = clamp(e.extra.x, 0.0, min(halfSize.x, halfSize.y));
    let q = abs(in.uv) - halfSize + vec2f(radius);
    let distance = abs(length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - radius);
    glow = exp(-distance * distance / 25.0) * 0.32;
    core = (1.0 - smoothstep(max(0.0, 1.0 - pixel), 1.0 + pixel, distance)) * 0.90;
  }
  let alpha = clamp((glow + core) * in.strength, 0.0, 1.0);
  // Warm-gold halo and pale-gold center; premultiplied color keeps transparent edges clean.
  let color = mix(vec3f(1.0, 0.55, 0.10), vec3f(1.0, 0.94, 0.67), core / max(glow + core, 0.0001));
  return vec4f(color * alpha, alpha);
}`;

  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
  const ease = value => 1 - Math.pow(1 - clamp(value), 3);

  function travelState(origin, target, elapsed, reduced) {
    const dx = target.x - origin.x, dy = target.y - origin.y, distance = Math.hypot(dx, dy);
    const control = { x: (origin.x + target.x) / 2, y: Math.min(origin.y, target.y) - Math.min(54, Math.max(18, distance * .14)) };
    const progress = reduced ? 1 : ease(elapsed / 900), inverse = 1 - progress;
    const point = { x: inverse * inverse * origin.x + 2 * inverse * progress * control.x + progress * progress * target.x,
      y: inverse * inverse * origin.y + 2 * inverse * progress * control.y + progress * progress * target.y };
    const tx = 2 * inverse * (control.x - origin.x) + 2 * progress * (target.x - control.x);
    const ty = 2 * inverse * (control.y - origin.y) + 2 * progress * (target.y - control.y);
    return { origin, target, control, point, progress, elapsed, reduced,
      heading: Math.hypot(tx, ty) > .001 ? Math.atan2(ty, tx) : Math.atan2(dy, dx || 1),
      width: Math.min(180, Math.max(78, distance * .25)),
      alpha: (reduced ? .62 : ease(elapsed / 135)) * (1 - ease((elapsed - (reduced ? 860 : 1170)) / 260)),
      tailScale: 1 - ease((elapsed - (reduced ? 520 : 900)) / 240) };
  }

  // Pure packing seam for deterministic coordinate/timing verification. CSS pixels, never world units.
  function packEffects(effects) {
    if (!Array.isArray(effects)) throw new TypeError('effects must be an array');
    const data = new Float32Array(effects.length * FLOATS_PER_EFFECT);
    effects.forEach((effect, index) => {
      const rect = effect.rect;
      const target = effect.target || (rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      const elapsed = effect.elapsed ?? effect.travel?.elapsed;
      const reduced = Boolean(effect.reduced ?? effect.travel?.reduced);
      if (!finite(elapsed) || elapsed < 0 || !rect || ![rect.left, rect.top, rect.width, rect.height].every(finite) || rect.width <= 0 || rect.height <= 0) {
        throw new TypeError('acquisition elapsed and destination must be finite and valid');
      }
      const travel = effect.travel || travelState(effect.origin, target, elapsed, reduced);
      const start = reduced ? 680 : 900;
      const arrival = effect.arrival ?? (ease((elapsed - start) / 120) * (1 - ease((elapsed - start - 360) / 300)));
      const values = [travel.origin?.x, travel.origin?.y, travel.control?.x, travel.control?.y,
        travel.target?.x, travel.target?.y, travel.point?.x, travel.point?.y,
        travel.heading, travel.width, travel.alpha, travel.tailScale, travel.progress, elapsed,
        reduced ? 1 : 0, arrival, rect.left, rect.top, rect.width, rect.height, rect.radius ?? 0, 0, 0, 0];
      if (!values.every(finite) || travel.width <= 0) throw new TypeError('invalid acquisition geometry');
      values[10] = clamp(values[10]); values[11] = clamp(values[11]); values[12] = clamp(values[12]); values[15] = clamp(values[15]);
      values[20] = clamp(values[20], 0, Math.min(rect.width, rect.height) / 2);
      data.set(values, index * FLOATS_PER_EFFECT);
    });
    if (!data.every(Number.isFinite)) throw new RangeError('acquisition geometry exceeds float32 range');
    return data;
  }

  function sizeForFrame(frame, maxDimension) {
    if (![frame.width, frame.height].every(finite) || frame.width <= 0 || frame.height <= 0) throw new TypeError('invalid viewport');
    const ratio = finite(frame.dpr) && frame.dpr > 0 ? frame.dpr : 1;
    const width = frame.pixelWidth ?? Math.round(frame.width * ratio);
    const height = frame.pixelHeight ?? Math.round(frame.height * ratio);
    if (![width, height].every(finite) || width <= 0 || height <= 0) throw new TypeError('invalid backing size');
    const scale = Math.min(1, maxDimension / width, maxDimension / height);
    return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
  }

  async function create(canvas, options = {}) {
    let device, context, uniform, storage, renderer, timer;
    const frameOwner = options.frameOwner || null;
    const shared = Boolean(frameOwner);
    const signal = shared ? options.initializationSignal : null;
    let state = 'initializing', notified = false, cancelled = false;
    let initializationStep = 'device';
    const notify = reason => {
      if (notified) return;
      notified = true;
      try { options.onFailure?.(reason); } catch (_) { /* A consumer callback cannot block cleanup. */ }
    };
    const cleanup = () => {
      if (!shared) { try { device?.removeEventListener?.('uncapturederror', onError); } catch (_) {} }
      for (const resource of [storage, uniform]) {
        // The owner has already destroyed its resources after device loss.
        // Only a still-registered resource is ours to destroy here.
        if (!resource || (shared && !frameOwner.release(resource))) continue;
        try { resource.destroy(); } catch (_) {}
      }
      if (!shared) {
        try { context?.unconfigure(); } catch (_) {}
        try { device?.destroy(); } catch (_) {}
      }
    };
    const fail = reason => {
      if (state === 'destroyed' || state === 'failed') return;
      state = 'failed'; cancelled = true; cleanup(); notify(reason);
    };
    const onError = event => { event.preventDefault?.(); fail(event.error?.message || 'WebGPU validation failure'); };
    const initialize = async () => {
      if (cancelled) return null;
      const gpu = shared ? null : (options.gpu || root.navigator?.gpu);
      if (shared) {
        if (frameOwner.state !== 'ready' || typeof frameOwner.own !== 'function' ||
          typeof frameOwner.release !== 'function') throw new Error('WebGPU frame owner unavailable');
        device = frameOwner.device;
      } else {
        if (!gpu || typeof canvas?.getContext !== 'function') throw new Error('WebGPU unavailable');
        const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (cancelled) return null;
        if (!adapter) throw new Error('WebGPU adapter unavailable');
        device = await adapter.requestDevice();
        if (cancelled) { cleanup(); return null; }
        device.addEventListener?.('uncapturederror', onError);
        device.lost.then(info => fail(info?.message || 'WebGPU device lost'), error => fail(String(error)));
      }
      initializationStep = 'shader';
      const module = device.createShaderModule({ label: 'DVA acquisition WGSL', code: shader });
      if (typeof module.getCompilationInfo === 'function') {
        const info = await module.getCompilationInfo();
        if (cancelled) return null;
        if (info.messages.some(message => message.type === 'error')) throw new Error('Acquisition WGSL compilation failed');
      }
      if (cancelled) { cleanup(); return null; }
      const format = shared ? frameOwner.format : gpu.getPreferredCanvasFormat();
      initializationStep = 'pipeline';
      const pipeline = await device.createRenderPipelineAsync({ label: 'DVA textureless photon E', layout: 'auto',
        vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{ format,
          blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } }] },
        primitive: { topology: 'triangle-list' } });
      if (cancelled) { cleanup(); return null; }
      if (!shared) {
        context = canvas.getContext('webgpu');
        if (!context) throw new Error('WebGPU canvas context unavailable');
        context.configure({ device, format, alphaMode: 'premultiplied' });
      }
      // GPUBufferUsage values are stable WebGPU flags, so this module can also run in a Node mock.
      initializationStep = 'uniform-buffer';
      uniform = device.createBuffer({ label: 'DVA acquisition viewport', size: 16, usage: 0x40 | 0x08 });
      initializationStep = 'uniform-owner';
      if (shared) frameOwner.own(uniform);
      let capacity = 0, bindGroup;
      const maxStorage = Math.min(device.limits.maxStorageBufferBindingSize, device.limits.maxBufferSize);
      const ensureStorage = count => {
        if (count <= capacity) return;
        const required = Math.max(1, count) * FLOATS_PER_EFFECT * 4;
        if (required > maxStorage) throw new RangeError('Acquisition batch exceeds GPU buffer limit');
        const bytes = Math.min(maxStorage, Math.max(16 * FLOATS_PER_EFFECT * 4, required * 2));
        const previous = storage;
        storage = device.createBuffer({ label: 'DVA acquisition effects', size: bytes, usage: 0x80 | 0x08 });
        if (shared) frameOwner.own(storage);
        capacity = Math.floor(bytes / (FLOATS_PER_EFFECT * 4));
        bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
          { binding: 0, resource: { buffer: uniform } }, { binding: 1, resource: { buffer: storage } } ] });
        if (previous && (!shared || frameOwner.release(previous))) previous.destroy();
      };
      initializationStep = 'storage';
      ensureStorage(1);
      if (cancelled) { cleanup(); return null; }
      state = 'ready';
      // A single storage/uniform pair is used by this renderer. Reusing it twice
      // before one owner.submit would make both passes read the final writeBuffer.
      const enqueuedFrames = new WeakSet();
      renderer = {
        get state() { return shared && state === 'ready' && frameOwner.state !== 'ready' ? frameOwner.state : state; },
        render(frame) {
          if (shared) throw new Error('Shared acquisition renderer requires enqueue(frame, target, drawFrame)');
          if (state !== 'ready') return false;
          try {
            const packed = packEffects(frame.effects || []);
            const size = sizeForFrame(frame, device.limits.maxTextureDimension2D);
            if (canvas.width !== size.width) canvas.width = size.width;
            if (canvas.height !== size.height) canvas.height = size.height;
            ensureStorage(frame.effects?.length || 1);
            device.queue.writeBuffer(uniform, 0, new Float32Array([frame.width, frame.height, size.width, size.height]));
            if (packed.byteLength) device.queue.writeBuffer(storage, 0, packed);
            const encoder = device.createCommandEncoder({ label: 'DVA acquisition frame' });
            const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
            if (packed.byteLength) {
              pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup);
              pass.draw(6, packed.length / FLOATS_PER_EFFECT * QUADS_PER_EFFECT);
            }
            pass.end(); device.queue.submit([encoder.finish()]);
            return true;
          } catch (error) { fail(error.message || String(error)); return false; }
        },
        // Enqueue exactly one acquisition pass per shared frame. The caller owns
        // frame submission and target ordering; drawFrame uses CSS coordinates,
        // while pixelWidth/pixelHeight (or dpr) must match the target backing size.
        enqueue(frame, target, drawFrame, passOptions = {}) {
          if (!shared) throw new Error('Standalone acquisition renderer uses render(drawFrame)');
          if (renderer.state !== 'ready') return false;
          if (!frame || typeof frame.add !== 'function' || typeof target !== 'string' || !target) {
            throw new TypeError('Shared acquisition pass requires a frame and target');
          }
          if (enqueuedFrames.has(frame)) throw new Error('Only one acquisition pass may be enqueued per frame');
          const packed = packEffects(drawFrame.effects || []);
          const size = sizeForFrame(drawFrame, device.limits.maxTextureDimension2D);
          if (packed.byteLength > 0) ensureStorage(drawFrame.effects.length);
          device.queue.writeBuffer(uniform, 0, new Float32Array([drawFrame.width, drawFrame.height, size.width, size.height]));
          if (packed.byteLength) device.queue.writeBuffer(storage, 0, packed);
          frame.add({ target, label: passOptions.label || 'DVA acquisition photons', clear: passOptions.clear,
            encode(pass, info) {
              if (info.device !== device || info.format !== format ||
                info.width !== size.width || info.height !== size.height) {
                throw new Error('Acquisition target device, format or backing size mismatch');
              }
              if (!packed.byteLength) return;
              pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup);
              pass.draw(6, packed.length / FLOATS_PER_EFFECT * QUADS_PER_EFFECT);
            } });
          enqueuedFrames.add(frame);
          return true;
        },
        destroy() {
          if (state === 'destroyed') return;
          state = 'destroyed'; cancelled = true; cleanup();
        }
      };
      return renderer;
    };
    const timeout = new Promise(resolve => {
      timer = setTimeout(() => { fail('WebGPU initialization timed out'); resolve(null); }, options.timeoutMs ?? 5000);
    });
    let abort;
    const cancellation = signal ? new Promise(resolve => {
      abort = () => { state = "destroyed"; cancelled = true; cleanup(); resolve(null); };
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    }) : null;
    try { return await Promise.race([initialize().catch(error => {
      fail(`Acquisition ${initializationStep}: ${error?.message || String(error)}`);
      return null;
    }), timeout, ...(cancellation ? [cancellation] : [])]); }
    finally { clearTimeout(timer); if (abort) signal.removeEventListener("abort", abort); }
  }

  const api = Object.freeze({ create, packEffects, sizeForFrame, shader, FLOATS_PER_EFFECT, QUADS_PER_EFFECT });
  root.DvaWebGPUAcquisition = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
