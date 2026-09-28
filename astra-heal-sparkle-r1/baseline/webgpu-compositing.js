/* Ordered WebGPU backdrop compositing. All inputs are full-target-size,
 * premultiplied RGBA, top-left aligned, and TEXTURE_BINDING-capable. The caller
 * renders the base scene to a sampled texture, then calls frame.encode with a
 * command encoder and final target view outside any open render pass. The
 * surface owns two reusable ping-pong textures. Submit before begin() again;
 * destroy the surface when the GPU no longer uses those textures. */
(function (root) {
  'use strict';
  const shader = /* wgsl */ `
@group(0) @binding(0) var backdrop: texture_2d<f32>;
@group(0) @binding(1) var source: texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) id: u32) -> @builtin(position) vec4f {
  let points = array<vec2f, 3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(points[id], 0, 1);
}
fn back(pixel: vec4f) -> vec4f {
  return textureLoad(backdrop, vec2i(pixel.xy), 0);
}
fn src(pixel: vec4f) -> vec4f {
  return textureLoad(source, vec2i(pixel.xy), 0);
}
@fragment fn copy(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  return back(pixel);
}
@fragment fn screen(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let b = back(pixel); let s = src(pixel);
  return vec4f(b.rgb + s.rgb - b.rgb * s.rgb, s.a + b.a * (1.0 - s.a));
}
@fragment fn multiply(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let b = back(pixel); let s = src(pixel);
  return vec4f(b.rgb * (1.0 - s.a) + s.rgb * (1.0 - b.a) + b.rgb * s.rgb,
    s.a + b.a * (1.0 - s.a));
}
@fragment fn destinationIn(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let b = back(pixel); let mask = src(pixel).a;
  return b * mask;
}`;

  function requireView(value, name) {
    if (!value || typeof value !== 'object') throw new TypeError(`${name} requires a GPU texture view`);
    return typeof value.createView === 'function' ? value.createView() : value;
  }
  function create({ device, format } = {}) {
    if (!device || typeof device.createShaderModule !== 'function') throw new TypeError('WebGPU device required');
    if (typeof format !== 'string' || !format) throw new TypeError('Target format required');
    const module = device.createShaderModule({ label: 'DVA backdrop compositor', code: shader });
    const pipelines = new Map();
    function pipeline(mode) {
      if (!pipelines.has(mode)) pipelines.set(mode, device.createRenderPipeline({
        label: `DVA composite ${mode}`, layout: 'auto',
        vertex: { module, entryPoint: 'vs' },
        fragment: { module, entryPoint: mode === 'destination-in' ? 'destinationIn' : mode, targets: [{ format, writeMask: 0xf }] },
        primitive: { topology: 'triangle-list' }
      }));
      return pipelines.get(mode);
    }
    let destroyed = false;
    function createSurface({ width, height } = {}) {
      if (destroyed) throw new Error('Compositor destroyed');
      const max = device.limits?.maxTextureDimension2D || 8192;
      if (![width, height].every(Number.isInteger) || width < 1 || height < 1 || width > max || height > max) {
        throw new RangeError('Invalid compositing surface size');
      }
      const scratch = [0, 1].map(index => device.createTexture({
        label: `DVA composite ping ${index}`, size: [width, height], format,
        usage: 0x04 | 0x10 // TEXTURE_BINDING | RENDER_ATTACHMENT
      }));
      let surfaceDestroyed = false, active = false;
      function begin(initial) {
        if (destroyed || surfaceDestroyed) throw new Error('Compositing surface destroyed');
        if (active) throw new Error('Compositing frame already open');
        const initialView = requireView(initial, 'Initial scene');
        active = true;
        const operations = [];
        let encoded = false;
        const frame = Object.freeze({
          get length() { return operations.length; },
          add(mode, texture) {
            if (encoded || !active || surfaceDestroyed || destroyed) throw new Error('Compositing frame closed');
            if (!['screen', 'multiply', 'destination-in'].includes(mode)) throw new Error(`Unsupported composite mode: ${mode}`);
            operations.push({ mode, view: requireView(texture, 'Composite source') });
            return frame;
          },
          screen(texture) { return frame.add('screen', texture); },
          multiply(texture) { return frame.add('multiply', texture); },
          destinationIn(texture) { return frame.add('destination-in', texture); },
          encode(encoder, targetView) {
            if (encoded || !active || surfaceDestroyed || destroyed) throw new Error('Compositing frame closed');
            if (!encoder || typeof encoder.beginRenderPass !== 'function') throw new TypeError('Command encoder required');
            const output = requireView(targetView, 'Final target');
            encoded = true;
            active = false;
            function draw(mode, backdropView, sourceView, destination, label) {
              const material = pipeline(mode);
              const entries = [{ binding: 0, resource: backdropView }];
              if (sourceView) entries.push({ binding: 1, resource: sourceView });
              const group = device.createBindGroup({ layout: material.getBindGroupLayout(0), entries });
              const pass = encoder.beginRenderPass({ label, colorAttachments: [{
                view: destination, loadOp: 'clear', clearValue: { r: 0, g: 0, b: 0, a: 0 }, storeOp: 'store'
              }] });
              try { pass.setPipeline(material); pass.setBindGroup(0, group); pass.draw(3); }
              finally { pass.end(); }
            }
            let current = initialView;
            operations.forEach((operation, index) => {
              const next = scratch[index & 1].createView();
              draw(operation.mode, current, operation.view, next, `DVA composite ${index}: ${operation.mode}`);
              current = next;
            });
            draw('copy', current, null, output, 'DVA composite present');
            return operations.length;
          },
          discard() {
            if (encoded || !active) return false;
            encoded = true; active = false; return true;
          }
        });
        return frame;
      }
      return Object.freeze({
        width, height, begin,
        destroy() {
          if (surfaceDestroyed) return;
          if (active) throw new Error('Cannot destroy an open compositing frame');
          surfaceDestroyed = true;
          scratch.forEach(texture => texture.destroy());
        }
      });
    }
    return Object.freeze({ createSurface, destroy() { destroyed = true; } });
  }
  const api = Object.freeze({ create, shader });
  root.DvaWebGPUCompositing = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
