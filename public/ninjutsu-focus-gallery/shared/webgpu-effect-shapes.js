/* Ordered TE geometry for a shared DvaWebGPUFrameCore frame. Coordinates are
 * logical target pixels (top-left origin, y down); colors are straight RGBA 0..1.
 * The caller owns frame submission and destroys the returned batch afterward.
 * Supported: filled circles/rotated ellipses, stroked full/partial arcs,
 * concentric radial and linear gradients (up to four stops), and soft glows.
 * Unsupported TE vocabulary: arbitrary paths/Bezier strokes, clips, shadows,
 * textures, image masks, non-concentric two-circle radial gradients, more than
 * four gradient stops, screen/multiply compositing, and text.
 * This is an explicit scene command renderer, never a Canvas 2D proxy. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const stride = 32;
  const shader = /* wgsl */ `
struct View { size: vec4f }
struct Shape { geometry: vec4f, parameters: vec4f, gradient: vec4f,
  offsets: vec4f, colors: array<vec4f, 4> }
@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var<storage, read> shapes: array<Shape>;
struct Vertex { @builtin(position) position: vec4f,
  @location(0) pixel: vec2f, @location(1) @interpolate(flat) index: u32 }
@vertex fn vs(@builtin(vertex_index) vertex: u32, @builtin(instance_index) index: u32) -> Vertex {
  let s = shapes[index];
  let corner = array<vec2f, 6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),
    vec2f(-1,1),vec2f(1,-1),vec2f(1,1))[vertex];
  let extent = s.geometry.zw + vec2f(s.parameters.w * 0.5 + 2.0);
  let c = cos(s.parameters.x);
  let sn = sin(s.parameters.x);
  let local = corner * extent;
  let pixel = s.geometry.xy + vec2f(c * local.x - sn * local.y,
    sn * local.x + c * local.y);
  var out: Vertex;
  out.position = vec4f(pixel / view.size.xy * vec2f(2,-2) + vec2f(-1,1), 0, 1);
  out.pixel = pixel;
  out.index = index;
  return out;
}
fn colorAt(s: Shape, t: f32) -> vec4f {
  var color = s.colors[0];
  for (var i = 0u; i < 3u; i = i + 1u) {
    let a = s.offsets[i];
    let b = s.offsets[i + 1u];
    let weight = clamp((t - a) / max(b - a, 0.000001), 0.0, 1.0);
    if (t >= a) { color = mix(s.colors[i], s.colors[i + 1u], weight); }
  }
  return color;
}
fn shade(input: Vertex, material: u32) -> vec4f {
  let s = shapes[input.index];
  let delta = input.pixel - s.geometry.xy;
  let c = cos(s.parameters.x);
  let sn = sin(s.parameters.x);
  let local = vec2f(c * delta.x + sn * delta.y, -sn * delta.x + c * delta.y);
  let radius = max(s.geometry.zw, vec2f(0.0001));
  let oval = length(local / radius);
  var signedDistance = (oval - 1.0) * min(radius.x, radius.y);
  if (s.parameters.w > 0.0) {
    signedDistance = abs(signedDistance) - s.parameters.w * 0.5;
    let angle = atan2(local.y, local.x);
    let relative = fract((angle - s.parameters.y) / 6.28318530718) * 6.28318530718;
    if (s.parameters.z < 6.28318 && relative > s.parameters.z) {
      let first = radius * vec2f(cos(s.parameters.y), sin(s.parameters.y));
      let last = radius * vec2f(cos(s.parameters.y + s.parameters.z), sin(s.parameters.y + s.parameters.z));
      signedDistance = min(length(local - first), length(local - last)) - s.parameters.w * 0.5;
    }
  }
  let aa = max(fwidth(signedDistance), 0.5);
  let coverage = 1.0 - smoothstep(-aa, aa, signedDistance);
  var color = s.colors[0];
  if (material == 1u) {
    let direction = s.gradient.zw - s.gradient.xy;
    let t = dot(input.pixel - s.gradient.xy, direction) / max(dot(direction, direction), 0.000001);
    color = colorAt(s, clamp(t, 0.0, 1.0));
  } else if (material == 2u) {
    let t = (length(input.pixel - s.geometry.xy) - s.gradient.z) /
      max(s.gradient.w - s.gradient.z, 0.000001);
    color = colorAt(s, clamp(t, 0.0, 1.0));
  }
  let alpha = color.a * coverage;
  return vec4f(color.rgb * alpha, alpha);
}
@fragment fn solid(input: Vertex) -> @location(0) vec4f { return shade(input, 0u); }
@fragment fn linear(input: Vertex) -> @location(0) vec4f { return shade(input, 1u); }
@fragment fn radial(input: Vertex) -> @location(0) vec4f { return shade(input, 2u); }
`;
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  function number(n, name, min = -Infinity) {
    if (!finite(n) || n < min) throw new RangeError(`${name} must be finite and at least ${min}`);
    return n;
  }
  function color(value) {
    if (!Array.isArray(value) || value.length !== 4 || value.some(n => !finite(n) || n < 0 || n > 1)) {
      throw new RangeError('Color must be RGBA values in 0..1');
    }
    return value.slice();
  }
  function stops(value) {
    if (!Array.isArray(value) || value.length < 2 || value.length > 4) throw new RangeError('Gradient needs two to four stops');
    let previous = -1;
    const result = value.map(stop => {
      if (!stop || !finite(stop.at) || stop.at < 0 || stop.at > 1 || stop.at <= previous) {
        throw new RangeError('Gradient stops must increase within 0..1');
      }
      previous = stop.at;
      return { at: stop.at, color: color(stop.color) };
    });
    while (result.length < 4) result.push({ at: 1, color: result[result.length - 1].color.slice() });
    return result;
  }
  function create({ device, format, maxDraws = 4096 } = {}) {
    if (!device || typeof device.createShaderModule !== 'function') throw new TypeError('Shared WebGPU device required');
    if (typeof format !== 'string' || !format) throw new TypeError('Target format required');
    if (!Number.isInteger(maxDraws) || maxDraws < 1 || maxDraws * stride * 4 > (device.limits?.maxStorageBufferBindingSize || 128 * 1024 * 1024)) {
      throw new RangeError('Invalid shape draw limit');
    }
    const module = device.createShaderModule({ label: 'DVA effect shapes', code: shader });
    const pipelines = new Map();
    let destroyed = false;
    function pipeline(material, mode) {
      const key = `${material}:${mode}`;
      if (!pipelines.has(key)) pipelines.set(key, device.createRenderPipeline({
        label: `DVA effect ${key}`, layout: 'auto', vertex: { module, entryPoint: 'vs' },
        fragment: { module, entryPoint: material, targets: [{ format, blend: {
          color: { srcFactor: 'one', dstFactor: mode === 'additive' ? 'one' : 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: mode === 'additive' ? 'one' : 'one-minus-src-alpha', operation: 'add' }
        } }] }, primitive: { topology: 'triangle-list' }
      }));
      return pipelines.get(key);
    }
    function createBatch({ width, height } = {}) {
      number(width, 'Width', 1); number(height, 'Height', 1);
      if (destroyed) throw new Error('Shape renderer destroyed');
      const commands = [];
      let encoded = false, disposed = false, buffers = [];
      function add(item) {
        if (encoded || disposed || destroyed) throw new Error('Shape batch is closed');
        if (commands.length >= maxDraws) throw new RangeError('Shape draw limit exceeded');
        if (!item || !['circle', 'ellipse', 'arc', 'glow'].includes(item.kind)) throw new TypeError('Unsupported shape kind');
        const x = number(item.x, 'X'), y = number(item.y, 'Y');
        const rx = number(item.kind === 'circle' || item.kind === 'arc' || item.kind === 'glow' ? item.radius : item.rx, 'Radius X', 0.0001);
        const ry = item.kind === 'ellipse' ? number(item.ry, 'Radius Y', 0.0001) : rx;
        const rotation = number(item.rotation ?? 0, 'Rotation');
        const lineWidth = item.kind === 'arc' ? number(item.lineWidth, 'Line width', 0.0001) : 0;
        const start = item.kind === 'arc' ? number(item.start, 'Arc start') : 0;
        const sweep = item.kind === 'arc' ? number(item.sweep, 'Arc sweep', 0.0001) : TAU;
        if (sweep > TAU) throw new RangeError('Arc sweep exceeds one revolution');
        const mode = item.mode ?? (item.kind === 'glow' ? 'additive' : 'source-over');
        if (mode !== 'source-over' && mode !== 'additive') throw new TypeError('Unsupported shape blend mode');
        const order = number(item.order ?? 0, 'Order');
        const alpha = number(item.alpha ?? 1, 'Alpha', 0);
        if (alpha > 1) throw new RangeError('Alpha must be within 0..1');
        let material = 'solid', gradient = [0, 0, 0, 1];
        let shades = [{ at: 0, color: color(item.color || [1, 1, 1, 1]) }];
        if (item.gradient) {
          const g = item.gradient;
          shades = stops(g.stops);
          if (g.type === 'linear') {
            ['x0', 'y0', 'x1', 'y1'].forEach(key => number(g[key], `Gradient ${key}`));
            if (g.x0 === g.x1 && g.y0 === g.y1) throw new RangeError('Linear gradient needs length');
            gradient = [g.x0, g.y0, g.x1, g.y1]; material = 'linear';
          } else if (g.type === 'radial') {
            const inner = number(g.innerRadius ?? 0, 'Inner radius', 0);
            const outer = number(g.outerRadius ?? rx, 'Outer radius', 0.0001);
            if (outer <= inner) throw new RangeError('Outer radius must exceed inner radius');
            gradient = [x, y, inner, outer]; material = 'radial';
          } else throw new TypeError('Unsupported gradient type');
        } else if (item.kind === 'glow') {
          const base = color(item.color || [1, 1, 1, 1]);
          shades = stops([{ at: 0, color: base }, { at: 1, color: [base[0], base[1], base[2], 0] }]);
          gradient = [x, y, 0, rx]; material = 'radial';
        }
        if (item.gradient && item.color) throw new TypeError('Use gradient or color');
        while (shades.length < 4) shades.push({ at: 1, color: shades[shades.length - 1].color.slice() });
        const values = [x, y, rx, ry, rotation, start, sweep, lineWidth, ...gradient,
          ...shades.map(s => s.at), ...shades.flatMap(s => [s.color[0], s.color[1], s.color[2], s.color[3] * alpha])];
        commands.push({ material, mode, order, sequence: commands.length, values });
        return batch;
      }
      const batch = Object.freeze({
        get length() { return commands.length; }, add,
        encode(pass) {
          if (encoded || disposed || destroyed) throw new Error('Shape batch is closed');
          if (!pass || typeof pass.draw !== 'function') throw new TypeError('Render pass required');
          encoded = true;
          if (!commands.length) return 0;
          const ordered = commands.slice().sort((a, b) => a.order - b.order || a.sequence - b.sequence);
          const viewBuffer = device.createBuffer({ label: 'DVA effect shape view', size: 16, usage: 0x40 | 0x08 });
          const drawBuffer = device.createBuffer({ label: 'DVA effect shape draws', size: ordered.length * stride * 4, usage: 0x80 | 0x08 });
          buffers = [viewBuffer, drawBuffer];
          device.queue.writeBuffer(viewBuffer, 0, new Float32Array([width, height, 0, 0]));
          device.queue.writeBuffer(drawBuffer, 0, new Float32Array(ordered.flatMap(command => command.values)));
          const groups = new Map();
          ordered.forEach((command, index) => {
            const material = pipeline(command.material, command.mode);
            let group = groups.get(material);
            if (!group) {
              group = device.createBindGroup({ layout: material.getBindGroupLayout(0), entries: [
                { binding: 0, resource: { buffer: viewBuffer } }, { binding: 1, resource: { buffer: drawBuffer } }
              ] });
              groups.set(material, group);
            }
            pass.setPipeline(material); pass.setBindGroup(0, group); pass.draw(6, 1, 0, index);
          });
          return commands.length;
        },
        destroy() {
          if (disposed) return;
          disposed = true;
          for (const buffer of buffers) buffer.destroy();
          buffers = [];
        }
      });
      return batch;
    }
    function enqueue(frame, { target, width, height, pixelWidth = width, pixelHeight = height,
      clear, commands = [], label = 'DVA effect shapes' } = {}) {
      if (!frame || typeof frame.add !== 'function') throw new TypeError('Shared WebGPU frame required');
      if (!Array.isArray(commands)) throw new TypeError('Shape commands must be an array');
      if (!Number.isInteger(pixelWidth) || !Number.isInteger(pixelHeight) || pixelWidth < 1 || pixelHeight < 1) {
        throw new RangeError('Shape backing dimensions must be positive integers');
      }
      const batch = createBatch({ width, height });
      try {
        commands.forEach(batch.add);
        frame.add({ target, label, clear, encode(pass, context) {
          if (context.device !== device || context.width !== pixelWidth ||
              context.height !== pixelHeight || context.format !== format) {
            throw new Error('Shape pass must use its shared device and matching target');
          }
          batch.encode(pass);
        } });
      } catch (error) { batch.destroy(); throw error; }
      return batch;
    }
    return Object.freeze({ createBatch, enqueue, destroy() { destroyed = true; } });
  }
  const api = Object.freeze({ create, shader });
  root.DvaWebGPUEffectShapes = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
