/* Ordered WebGPU rectangles and textured quads. Coordinates are target pixels:
 * origin top-left, x right, y down. UV is [left, top, width, height] with top-left
 * origin; crop/sourceSize instead accepts source pixels. Rotation (radians) and
 * flips pivot around the normalized destination pivot (default center). An optional
 * transform [a,b,c,d,e,f] applies a Canvas-style affine transform after that local
 * transform. Lower order draws first; equal order keeps record order. Sprite
 * textures must contain premultiplied RGBA (upload external images
 * with premultipliedAlpha:true). Tint/rectangle color is straight RGBA in 0..1.
 * The caller owns the device, render pass, target, textures, submission, and
 * batch lifetime. Destroy a batch only after its commands have been submitted. */
(function (root) {
  'use strict';

  const shader = /* wgsl */ `
struct View { size: vec4f }
struct Draw { rect: vec4f, uv: vec4f, tint: vec4f, spare: vec4f }
@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var<storage, read> draws: array<Draw>;
@group(1) @binding(0) var image: texture_2d<f32>;
@group(1) @binding(1) var imageSampler: sampler;
struct Vertex { @builtin(position) position: vec4f, @location(0) uv: vec2f,
  @location(1) @interpolate(flat) index: u32 }
@vertex fn vs(@builtin(vertex_index) vertex: u32, @builtin(instance_index) index: u32) -> Vertex {
  let corner = array<vec2f, 6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),
    vec2f(0,1),vec2f(1,0),vec2f(1,1))[vertex];
  let draw = draws[index];
  let local = corner * draw.rect.zw;
  let pixel = draw.rect.xy + vec2f(
    draw.spare.x * local.x + draw.spare.z * local.y,
    draw.spare.y * local.x + draw.spare.w * local.y);
  var result: Vertex;
  result.position = vec4f(pixel / view.size.xy * vec2f(2,-2) + vec2f(-1,1), 0, 1);
  result.uv = draw.uv.xy + corner * draw.uv.zw;
  result.index = index;
  return result;
}
@fragment fn solid(input: Vertex) -> @location(0) vec4f {
  let color = draws[input.index].tint;
  return vec4f(color.rgb * color.a, color.a);
}
@fragment fn textured(input: Vertex) -> @location(0) vec4f {
  let draw = draws[input.index];
  let halfTexel = vec2f(0.5) / vec2f(textureDimensions(image));
  let uvMin = min(draw.uv.xy, draw.uv.xy + draw.uv.zw);
  let uvMax = max(draw.uv.xy, draw.uv.xy + draw.uv.zw);
  let center = (uvMin + uvMax) * 0.5;
  let clampedUV = clamp(input.uv, min(uvMin + halfTexel, center), max(uvMax - halfTexel, center));
  let sample = textureSample(image, imageSampler, clampedUV);
  let tint = draw.tint;
  return vec4f(sample.rgb * tint.rgb * tint.a, sample.a * tint.a);
}`;
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  function positive(value, name) {
    if (!finite(value) || value <= 0) throw new RangeError(`${name} must be positive and finite`);
  }
  function rgba(value) {
    if (!Array.isArray(value) || value.length !== 4 || !value.every(finite) || value.some(x => x < 0 || x > 1)) {
      throw new RangeError('Color must contain four finite 0..1 components');
    }
    return value;
  }
  function unit(value, name) {
    if (!finite(value) || value < 0 || value > 1) throw new RangeError(`${name} must be finite and in 0..1`);
    return value;
  }
  function tuple(value, length, name) {
    if (!Array.isArray(value) || value.length !== length || !value.every(finite)) {
      throw new RangeError(`${name} must contain ${length} finite numbers`);
    }
    return value;
  }
  function geometry(item, x, y, w, h) {
    const rotation = item.rotation === undefined ? 0 : item.rotation;
    if (!finite(rotation)) throw new RangeError('Rotation must be finite');
    if (item.flipX !== undefined && typeof item.flipX !== 'boolean') throw new TypeError('flipX must be boolean');
    if (item.flipY !== undefined && typeof item.flipY !== 'boolean') throw new TypeError('flipY must be boolean');
    const pivot = item.pivot === undefined ? [0.5, 0.5] : tuple(item.pivot, 2, 'Pivot');
    pivot.forEach((value, index) => unit(value, `Pivot ${index}`));
    const affine = item.transform === undefined ? [1, 0, 0, 1, 0, 0] : tuple(item.transform, 6, 'Transform');
    const cosine = Math.cos(rotation), sine = Math.sin(rotation);
    const flipX = item.flipX ? -1 : 1, flipY = item.flipY ? -1 : 1;
    const localA = cosine * flipX, localB = sine * flipX;
    const localC = -sine * flipY, localD = cosine * flipY;
    const [ta, tb, tc, td, te, tf] = affine;
    const basis = [ta * localA + tc * localB, tb * localA + td * localB,
      ta * localC + tc * localD, tb * localC + td * localD];
    const pivotX = x + w * pivot[0], pivotY = y + h * pivot[1];
    const originX = pivotX + localA * (x - pivotX) + localC * (y - pivotY);
    const originY = pivotY + localB * (x - pivotX) + localD * (y - pivotY);
    const result = [ta * originX + tc * originY + te, tb * originX + td * originY + tf,
      w, h];
    if (![...result, ...basis].every(finite)) throw new RangeError('Transformed rectangle must be finite');
    return { rect: result, basis };
  }
  function blend(mode) {
    if (mode !== 'source-over' && mode !== 'additive' && mode !== 'screen') {
      throw new Error(`Unsupported blend mode: ${mode}`);
    }
    if (mode === 'screen') return {
      // Premultiplied screen: backdrop + source - backdrop * source.
      color: { srcFactor: 'one-minus-dst', dstFactor: 'one', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
    };
    return {
      color: { srcFactor: 'one', dstFactor: mode === 'additive' ? 'one' : 'one-minus-src-alpha', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: mode === 'additive' ? 'one' : 'one-minus-src-alpha', operation: 'add' }
    };
  }
  function create({ device, format, maxDraws = 16384 } = {}) {
    if (!device || typeof device.createShaderModule !== 'function') throw new TypeError('WebGPU device required');
    if (typeof format !== 'string' || !format) throw new TypeError('Target format required');
    if (!Number.isInteger(maxDraws) || maxDraws < 1) throw new RangeError('Invalid draw limit');
    if (maxDraws * 64 > (device.limits?.maxStorageBufferBindingSize || 128 * 1024 * 1024)) {
      throw new RangeError('Draw limit exceeds storage binding size');
    }
    const module = device.createShaderModule({ label: 'DVA ordered primitives', code: shader });
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
    const pipelines = new Map();
    let destroyed = false;
    function pipeline(kind, mode) {
      const key = `${kind}:${mode}`;
      if (!pipelines.has(key)) pipelines.set(key, device.createRenderPipeline({
        label: `DVA ${key}`,
        layout: 'auto', vertex: { module, entryPoint: 'vs' },
        fragment: { module, entryPoint: kind === 'rect' ? 'solid' : 'textured', targets: [{ format, blend: blend(mode), writeMask: 0xf }] },
        primitive: { topology: 'triangle-list' }
      }));
      return pipelines.get(key);
    }
    function createBatch({ width, height } = {}) {
      if (destroyed) throw new Error('Renderer destroyed');
      positive(width, 'Width'); positive(height, 'Height');
      const commands = [];
      let encoded = false, disposed = false, resources = [];
      function record(kind, item) {
        if (encoded || disposed || destroyed) throw new Error('Batch is closed');
        if (commands.length >= maxDraws) throw new RangeError('Draw limit exceeded');
        const { x, y, w, h, mode = 'source-over' } = item;
        if (![x, y, w, h].every(finite)) throw new RangeError('Rectangle must be finite');
        positive(w, 'Width'); positive(h, 'Height');
        blend(mode);
        if (item.tint !== undefined && item.color !== undefined) throw new TypeError('Use either tint or color');
        const color = rgba(item.tint || item.color || [1, 1, 1, 1]).slice();
        const alpha = item.alpha === undefined ? 1 : unit(item.alpha, 'Alpha');
        color[3] *= alpha;
        const order = item.order === undefined ? 0 : item.order;
        if (!finite(order)) throw new RangeError('Order must be finite');
        const { rect, basis } = geometry(item, x, y, w, h);
        let uv = [0, 0, 1, 1], texture = null;
        if (kind === 'sprite') {
          texture = item.texture;
          if (!texture || (typeof texture.createView !== 'function' && typeof texture !== 'object')) {
            throw new TypeError('Sprite requires a GPU texture or texture view');
          }
          if (item.crop !== undefined && item.uv !== undefined) throw new TypeError('Use either crop or UV');
          if (item.crop !== undefined) {
            const crop = tuple(item.crop, 4, 'Crop');
            const sourceSize = item.sourceSize || [texture.width, texture.height];
            tuple(sourceSize, 2, 'Source size');
            positive(sourceSize[0], 'Source width'); positive(sourceSize[1], 'Source height');
            if (crop[0] < 0 || crop[1] < 0 || crop[2] <= 0 || crop[3] <= 0 ||
              crop[0] + crop[2] > sourceSize[0] || crop[1] + crop[3] > sourceSize[1]) {
              throw new RangeError('Crop must fit inside source texture');
            }
            uv = [crop[0] / sourceSize[0], crop[1] / sourceSize[1], crop[2] / sourceSize[0], crop[3] / sourceSize[1]];
          } else {
            uv = (item.uv || uv);
            tuple(uv, 4, 'Sprite UV');
          }
          if (uv[2] <= 0 || uv[3] <= 0 || uv[0] < 0 || uv[1] < 0 ||
            uv[0] + uv[2] > 1 || uv[1] + uv[3] > 1) throw new RangeError('Invalid sprite UV');
          uv = uv.slice();
        }
        commands.push({ kind, mode, rect, basis, uv, color, texture, order, sequence: commands.length });
        return batch;
      }
      const batch = Object.freeze({
        get length() { return commands.length; },
        rect(item) { return record('rect', item); },
        sprite(item) { return record('sprite', item); },
        encode(pass) {
          if (encoded || disposed || destroyed) throw new Error('Batch is closed');
          if (!pass || typeof pass.draw !== 'function') throw new TypeError('Render pass required');
          encoded = true;
          if (!commands.length) return 0;
          const viewBuffer = device.createBuffer({ label: 'DVA primitive view', size: 16, usage: 0x40 | 0x08 });
          const drawBuffer = device.createBuffer({ label: 'DVA primitive draws', size: commands.length * 64, usage: 0x80 | 0x08 });
          resources = [viewBuffer, drawBuffer];
          device.queue.writeBuffer(viewBuffer, 0, new Float32Array([width, height, 0, 0]));
          const ordered = commands.slice().sort((a, b) => a.order - b.order || a.sequence - b.sequence);
          const values = new Float32Array(ordered.length * 16);
          ordered.forEach((command, index) => {
            values.set(command.rect, index * 16);
            values.set(command.uv, index * 16 + 4);
            values.set(command.color, index * 16 + 8);
            values.set(command.basis, index * 16 + 12);
          });
          device.queue.writeBuffer(drawBuffer, 0, values);
          const groups = new Map();
          ordered.forEach((command, index) => {
            const material = pipeline(command.kind, command.mode);
            pass.setPipeline(material);
            let group = groups.get(material);
            if (!group) {
              group = device.createBindGroup({ layout: material.getBindGroupLayout(0), entries: [
                { binding: 0, resource: { buffer: viewBuffer } }, { binding: 1, resource: { buffer: drawBuffer } }
              ] });
              groups.set(material, group);
            }
            pass.setBindGroup(0, group);
            if (command.kind === 'sprite') {
              const textureView = typeof command.texture.createView === 'function' ? command.texture.createView() : command.texture;
              pass.setBindGroup(1, device.createBindGroup({ layout: material.getBindGroupLayout(1), entries: [
                { binding: 0, resource: textureView }, { binding: 1, resource: sampler }
              ] }));
            }
            pass.draw(6, 1, 0, index);
          });
          return commands.length;
        },
        destroy() {
          if (disposed) return;
          disposed = true;
          for (const resource of resources) resource.destroy();
          resources = [];
        }
      });
      return batch;
    }
    return Object.freeze({ createBatch, get shader() { return shader; }, destroy() { destroyed = true; } });
  }
  const api = Object.freeze({ create, shader });
  root.DvaWebGPUPrimitives = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
