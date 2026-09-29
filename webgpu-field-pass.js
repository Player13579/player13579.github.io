/* Authored field pass for the shared WebGPU frame. This module owns no canvas,
 * adapter, device, RAF or Canvas 2D fallback. Its caller supplies the ordered
 * frame and a WebGPU presentation target registered with the frame core. */
(function (root) {
  'use strict';

  const field = root.DvaWebGPUFieldStatic || (typeof require === 'function' ? require('./webgpu-field-static.js') : null);
  const roomOverlay = root.DvaWebGPURoomOverlay || (typeof require === 'function' ? require('./webgpu-room-overlay.js') : null);
  const textureUsage = root.GPUTextureUsage || { COPY_DST: 0x02, TEXTURE_BINDING: 0x04, RENDER_ATTACHMENT: 0x10 };
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const align = value => Math.ceil(value / 256) * 256;

  function validatePatches(patches, map, device) {
    if (patches === undefined) return [];
    if (!Array.isArray(patches)) throw new TypeError('Field patches must be an array');
    const ids = new Set();
    const rects = [];
    for (const patch of patches) {
      if (!patch || typeof patch.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(patch.id) || ids.has(patch.id)) {
        throw new TypeError('Field patch ids must be unique non-empty identifiers');
      }
      ids.add(patch.id);
      const { x, y, w, h, image: source } = patch;
      if (![x, y, w, h].every(finite) || !Number.isInteger(x) || !Number.isInteger(y) ||
          !Number.isInteger(w) || !Number.isInteger(h) || x < 0 || y < 0 || w < 1 || h < 1 ||
          x + w > map.width || y + h > map.height) {
        throw new RangeError(`Field patch ${patch.id} has an invalid world rectangle`);
      }
      const sw = Number(source?.naturalWidth ?? source?.width);
      const sh = Number(source?.naturalHeight ?? source?.height);
      if (!source || source.complete === false || !Number.isInteger(sw) || !Number.isInteger(sh) || sw < 1 || sh < 1) {
        throw new TypeError(`Field patch ${patch.id} has invalid source dimensions`);
      }
      if (Math.max(sw, sh) > device.limits.maxTextureDimension2D) {
        throw new RangeError(`Field patch ${patch.id} exceeds WebGPU texture limit`);
      }
      if (patch.room) {
        if (!roomOverlay || patch.room.id !== roomOverlay.CAFETERIA.id ||
            x !== patch.room.x || y !== patch.room.y || w !== patch.room.w || h !== patch.room.h)
          throw new RangeError(`Field patch ${patch.id} has unsupported room geometry`);
        roomOverlay.mapping(source, patch.room);
      }
      const rect = { x, y, w, h, id: patch.id, image: source, sw, sh, room: patch.room };
      for (const other of rects) {
        if (x < other.x + other.w && x + w > other.x && y < other.y + other.h && y + h > other.y) {
          throw new RangeError(`Field patches ${other.id} and ${patch.id} overlap`);
        }
      }
      rects.push(rect);
    }
    return rects;
  }

  const patchShader = /* wgsl */`@group(0) @binding(0) var sourceTexture:texture_2d<f32>;
@group(0) @binding(1) var sourceSampler:sampler;
struct VertexOut { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) id:u32)->VertexOut {
 let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));let q=p[id];
 var out:VertexOut;out.position=vec4f(q,0,1);out.uv=vec2f(q.x*.5+.5,.5-q.y*.5);return out;
}
@fragment fn fs(input:VertexOut)->@location(0) vec4f {
 return textureSampleLevel(sourceTexture,sourceSampler,input.uv,0);
}`;

  async function create(options = {}) {
    const { owner, map, image } = options;
    if (!field?.createGeometryMask || !field?.shader) throw new Error('WebGPU authored field module unavailable');
    if (!owner || owner.state !== 'ready') throw new Error('Shared WebGPU frame owner unavailable');
    if (!map || !Number.isInteger(map.width) || !Number.isInteger(map.height) ||
        map.width < 1 || map.height < 1 || !image || image.complete === false ||
        Number(image.naturalWidth ?? image.width) !== map.width ||
        Number(image.naturalHeight ?? image.height) !== map.height) {
      throw new Error('Authored map image and geometry must match');
    }
    const device = owner.device;
    if (Math.max(map.width, map.height) > device.limits.maxTextureDimension2D) {
      throw new RangeError('Authored map exceeds WebGPU texture limit');
    }
    const resources = [];
    const own = resource => { resources.push(resource); return resource; };
    let destroyed = false;
    const onTiming = typeof options.onTiming === 'function' ? options.onTiming : null;
    let lastTiming = -Infinity;
    const timingNow = () => {
      const raw = root.performance && typeof root.performance.now === 'function'
        ? root.performance.now() : Date.now();
      const value = finite(raw) ? Math.max(raw, lastTiming) : (finite(lastTiming) ? lastTiming : 0);
      lastTiming = value;
      return value;
    };
    const emitTiming = event => { try { onTiming?.(Object.freeze(event)); } catch (_) {} };
    const beginTiming = phaseName => {
      const startTime = timingNow();
      emitTiming({ name: `field.${phaseName}.begin`, atMs: startTime });
      return { phaseName, startTime };
    };
    const endTiming = (token, error) => {
      if (!token) return;
      const endTime = timingNow();
      emitTiming({ name: `field.${token.phaseName}.${error ? 'failed' : 'resolved'}`,
        atMs: endTime, durationMs: Math.max(0, endTime - token.startTime) });
    };
    const measure = (phaseName, operation) => {
      const token = beginTiming(phaseName);
      try {
        const result = operation();
        if (result && typeof result.then === 'function') {
          return Promise.resolve(result).then(value => { endTiming(token); return value; }, error => {
            endTiming(token, error); throw error;
          });
        }
        endTiming(token);
        return result;
      } catch (error) { endTiming(token, error); throw error; }
    };
    const totalTiming = beginTiming('total');
    try {
      const patches = await measure('patch-validation', () => validatePatches(options.patches, map, device));
      const module = await measure('field-shader-compilation', async () => {
        const shaderModule = device.createShaderModule({ label: 'DVA shared authored field shader', code: field.shader });
        if (typeof shaderModule.getCompilationInfo === 'function') {
          const info = await shaderModule.getCompilationInfo();
          const errors = info.messages.filter(message => message.type === 'error');
          if (errors.length) throw new Error(errors.map(message => message.message).join('; '));
        }
        return shaderModule;
      });
      const pipelineDescriptor = { layout: 'auto', vertex: { module, entryPoint: 'vs' },
        fragment: { module, entryPoint: 'fs', targets: [{ format: owner.format }] },
        primitive: { topology: 'triangle-list' } };
      const pipeline = await measure(typeof device.createRenderPipelineAsync === 'function'
        ? 'field-pipeline-async' : 'field-pipeline-sync', () => typeof device.createRenderPipelineAsync === 'function'
          ? device.createRenderPipelineAsync(pipelineDescriptor)
          : device.createRenderPipeline(pipelineDescriptor));
      if (owner.state !== 'ready') throw new Error('Shared WebGPU device lost during field setup');
      const { uniform, material, geometry } = await measure('texture-allocation', () => ({
        uniform: own(device.createBuffer({ size: 48, usage: 0x40 | 0x08 })),
        material: own(device.createTexture({ label: 'DVA authored field image',
          size: [map.width, map.height], format: 'rgba8unorm',
          usage: textureUsage.COPY_DST | textureUsage.TEXTURE_BINDING | textureUsage.RENDER_ATTACHMENT })),
        geometry: own(device.createTexture({ label: 'DVA authored field coverage',
          size: [map.width, map.height], format: 'r8unorm', usage: 0x04 | 0x02 }))
      }));
      await measure('map-image-copy-enqueue', () => device.queue.copyExternalImageToTexture({ source: image },
        { texture: material, premultipliedAlpha: true, colorSpace: 'srgb' }, [map.width, map.height]));
      if (patches.length) {
        const patchModule = await measure('patch-shader-compilation', async () => {
          const value = device.createShaderModule({ label: 'DVA authored field patch compositor', code: patchShader });
          if (typeof value.getCompilationInfo === 'function') {
            const info = await value.getCompilationInfo();
            const errors = info.messages.filter(message => message.type === 'error');
            if (errors.length) throw new Error(errors.map(message => message.message).join('; '));
          }
          return value;
        });
        const patchDescriptor = { layout: 'auto', vertex: { module: patchModule, entryPoint: 'vs' },
            fragment: { module: patchModule, entryPoint: 'fs', targets: [{ format: 'rgba8unorm', blend: {
              color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
            } }] }, primitive: { topology: 'triangle-list' } };
        const patchPipeline = await measure(typeof device.createRenderPipelineAsync === 'function'
          ? 'patch-pipeline-async' : 'patch-pipeline-sync', () => typeof device.createRenderPipelineAsync === 'function'
            ? device.createRenderPipelineAsync(patchDescriptor) : device.createRenderPipeline(patchDescriptor));
        const patchSampler = await measure('patch-bindings', () => device.createSampler({ minFilter: 'linear', magFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' }));
        let roomPipeline;
        if (patches.some(patch => patch.room)) {
          const roomModule = await measure('room-shader-compilation', async () => {
            const value = device.createShaderModule({ label: 'DVA polygon-clipped room overlay', code: roomOverlay.shader });
            if (typeof value.getCompilationInfo === 'function') {
              const info = await value.getCompilationInfo();
              const errors = info.messages.filter(message => message.type === 'error');
              if (errors.length) throw new Error(errors.map(message => message.message).join('; '));
            }
            return value;
          });
          const roomDescriptor = { layout: 'auto',
            vertex: { module: roomModule, entryPoint: 'vs' },
            fragment: { module: roomModule, entryPoint: 'fs', targets: [{ format: 'rgba8unorm', blend: {
              color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
            } }] }, primitive: { topology: 'triangle-list' } };
          roomPipeline = await measure(typeof device.createRenderPipelineAsync === 'function'
            ? 'room-pipeline-async' : 'room-pipeline-sync', () => typeof device.createRenderPipelineAsync === 'function'
              ? device.createRenderPipelineAsync(roomDescriptor) : device.createRenderPipeline(roomDescriptor));
        }
        await measure('patch-textures-copy-and-bindings-enqueue', async () => {
          for (const patch of patches) {
          const texture = own(device.createTexture({ label: `DVA field patch ${patch.id}`, size: [patch.sw, patch.sh],
            format: 'rgba8unorm', usage: textureUsage.COPY_DST | textureUsage.TEXTURE_BINDING | textureUsage.RENDER_ATTACHMENT }));
          device.queue.copyExternalImageToTexture({ source: patch.image }, { texture, premultipliedAlpha: true, colorSpace: 'srgb' }, [patch.sw, patch.sh]);
          const pipelineForPatch = patch.room ? roomPipeline : patchPipeline;
          const roomUniform = patch.room ? own(device.createBuffer({ size: 176, usage: 0x40 | 0x08 })) : null;
          if (roomUniform) device.queue.writeBuffer(roomUniform, 0, roomOverlay.uniformData(patch.image, patch.room));
          const patchBind = device.createBindGroup({ layout: pipelineForPatch.getBindGroupLayout(0), entries: [
            { binding: 0, resource: texture.createView() }, { binding: 1, resource: patchSampler },
            ...(roomUniform ? [{ binding: 2, resource: { buffer: roomUniform } }] : [])
          ] });
          const encoder = device.createCommandEncoder({ label: `DVA field patch ${patch.id}` });
          const pass = encoder.beginRenderPass({ colorAttachments: [{ view: material.createView(), loadOp: 'load', storeOp: 'store' }] });
          pass.setPipeline(pipelineForPatch); pass.setBindGroup(0, patchBind);
          pass.setViewport(patch.x, patch.y, patch.w, patch.h, 0, 1); pass.draw(3); pass.end();
          device.queue.submit([encoder.finish()]);
          }
        });
      }
      const alpha = options.mask || await measure('geometry-mask-cpu', () => field.createGeometryMask(map));
      if (!(alpha instanceof Uint8Array) || alpha.byteLength !== map.width * map.height) {
        throw new Error('Authored field coverage has invalid dimensions');
      }
      const bytesPerRow = align(map.width);
      const upload = bytesPerRow === map.width ? alpha : new Uint8Array(bytesPerRow * map.height);
      if (upload !== alpha) {
        for (let y = 0; y < map.height; y += 1) {
          upload.set(alpha.subarray(y * map.width, (y + 1) * map.width), y * bytesPerRow);
        }
      }
      await measure('geometry-upload-enqueue', () => device.queue.writeTexture({ texture: geometry }, upload, { bytesPerRow }, [map.width, map.height]));
      const { sampler, bind } = await measure('field-bindings', () => {
        const sampler = device.createSampler({ minFilter: 'linear', magFilter: 'linear',
          addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
        const bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: { buffer: uniform } },
        { binding: 1, resource: material.createView() },
        { binding: 2, resource: geometry.createView() },
        { binding: 3, resource: sampler }
        ] });
        return { sampler, bind };
      });
      const pass = Object.freeze({
        enqueue(frame, { target, width, height, pixelWidth = width, pixelHeight = height,
          cameraX, cameraY, zoom } = {}) {
          if (destroyed || owner.state !== 'ready') throw new Error('Shared WebGPU field pass unavailable');
          if (!frame || typeof frame.add !== 'function' || typeof target !== 'string' || !target ||
              !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
              !Number.isInteger(pixelWidth) || !Number.isInteger(pixelHeight) ||
              pixelWidth < 1 || pixelHeight < 1 ||
              ![cameraX, cameraY, zoom].every(finite) || zoom <= 0) {
            throw new TypeError('Invalid WebGPU field frame or camera');
          }
          device.queue.writeBuffer(uniform, 0, new Float32Array([
            width, height, pixelWidth, pixelHeight, cameraX, cameraY, zoom, 0,
            map.width, map.height, 0, 0
          ]));
          frame.add({ target, label: 'map:authored-field',
            clear: { r: 205 / 255, g: 238 / 255, b: 250 / 255, a: 1 },
            encode(pass, info) {
              if (info.width !== pixelWidth || info.height !== pixelHeight) {
                throw new Error('Field backing dimensions differ from committed presentation target');
              }
              pass.setPipeline(pipeline);
              pass.setBindGroup(0, bind);
              pass.draw(3);
            }
          });
          return frame;
        },
        destroy() {
          if (destroyed) return;
          destroyed = true;
          for (const resource of resources) {
            try { resource.destroy(); } catch (_) {}
          }
          resources.length = 0;
        }
      });
      endTiming(totalTiming);
      return pass;
    } catch (error) {
      endTiming(totalTiming, error);
      for (const resource of resources) {
        try { resource.destroy(); } catch (_) {}
      }
      throw error;
    }
  }

  const api = Object.freeze({ create });
  root.DvaWebGPUFieldPass = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
