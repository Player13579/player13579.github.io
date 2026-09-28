/* ChatGPT Pro Barrier r0.7 game GPU adapter. The four event fields and fsBarrier
 * come from barrier-pro-r07/barrier-pro-shader.wgsl; this module only places the
 * transparent result on the already-painted shared WebGPU target. No SFX here.
 *
 * await DvaWebGPUBarrierProR07Game.create({ device, format }) -> pass
 * pass.record({ frame, target, viewport, events }) where viewport has logical
 * width/height and physical pixelWidth/pixelHeight, and each event has
 * { id, event:'create'|'absorb'|'fracture'|'bust', tMs,
 *   center:{x,y}, receiverHeightPx }. Center and height are the submitted
 * player's sprite-quad center/height in logical viewport pixels. The caller
 * owns receipt validation, visibility, lifetime, room identity, and audio.
 * Record after players; the one r0.7 membrane is composited in the front slot.
 * The caller submits the frame. destroy() only releases adapter-owned GPU data.
 */
(function (root) {
  'use strict';
  const VERSION = 'barrier-pro-r0.7';
  const EVENTS = Object.freeze({ create: [0, 650], absorb: [1, 650], fracture: [2, 480], bust: [3, 480] });
  const MAX_EVENTS = 24;
  const COMPOSITE_WGSL = `
@group(0) @binding(0) var barrierTex : texture_2d<f32>;
struct Placement { origin: vec2<i32>, extent: vec2<i32> };
@group(0) @binding(1) var<uniform> placement : Placement;
@vertex fn vsMain(@builtin(vertex_index) index:u32)->@builtin(position) vec4<f32> {
  var positions=array<vec2<f32>,3>(vec2<f32>(-1.0,-3.0),vec2<f32>(3.0,1.0),vec2<f32>(-1.0,1.0));
  return vec4<f32>(positions[index],0.0,1.0);
}
@fragment fn fsMain(@builtin(position) position:vec4<f32>)->@location(0) vec4<f32> {
  let pixel=vec2<i32>(position.xy)-placement.origin;
  if (any(pixel<vec2<i32>(0)) || any(pixel>=placement.extent)) { return vec4<f32>(0.0); }
  return textureLoad(barrierTex,pixel,0);
}`;
  const blend = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
  const finite = Number.isFinite;

  async function create({ device, format } = {}) {
    if (!device?.createShaderModule || !device?.createRenderPipeline || !device?.queue?.writeBuffer ||
        typeof format !== 'string' || !format) throw new TypeError('Barrier r0.7 needs the shared GPU device and target format');
    const sourceUrl = new URL('./barrier-pro-r07/barrier-pro-shader.wgsl?adapter=game-r07', root.location?.href || 'http://localhost/');
    const response = await root.fetch(sourceUrl);
    if (!response.ok) throw new Error(`Barrier r0.7 shader HTTP ${response.status}`);
    const sourceModule = device.createShaderModule({ label: 'Barrier Pro r0.7 source', code: await response.text() });
    const diagnostics = await sourceModule.getCompilationInfo();
    const errors = diagnostics.messages.filter(message => message.type === 'error');
    if (errors.length) throw new Error(`Barrier r0.7 WGSL: ${errors.map(message => message.message).join('; ')}`);
    const compositeModule = device.createShaderModule({ label: 'Barrier Pro r0.7 local composite', code: COMPOSITE_WGSL });
    const compositeDiagnostics = await compositeModule.getCompilationInfo();
    const compositeErrors = compositeDiagnostics.messages.filter(message => message.type === 'error');
    if (compositeErrors.length) throw new Error(`Barrier r0.7 composite WGSL: ${compositeErrors.map(message => message.message).join('; ')}`);
    const barrierPipeline = device.createRenderPipeline({
      label: 'Barrier Pro r0.7 premultiplied field', layout: 'auto',
      vertex: { module: sourceModule, entryPoint: 'vsMain' },
      fragment: { module: sourceModule, entryPoint: 'fsBarrier', targets: [{ format: 'rgba16float' }] },
      primitive: { topology: 'triangle-list' }
    });
    const compositePipeline = device.createRenderPipeline({
      label: 'Barrier Pro r0.7 local source-over', layout: 'auto',
      vertex: { module: compositeModule, entryPoint: 'vsMain' },
      fragment: { module: compositeModule, entryPoint: 'fsMain', targets: [{ format, blend }] },
      primitive: { topology: 'triangle-list' }
    });
    let destroyed = false;
    const liveResources = new Set();
    function release(resources) { for (const resource of resources) { if (liveResources.delete(resource)) resource.destroy(); } }
    function record({ frame, target, viewport, events = [] } = {}) {
      if (destroyed || typeof frame?.addEncoder !== 'function' || typeof target !== 'string' || !target ||
          !Array.isArray(events) || !viewport || ![viewport.width, viewport.height,
            viewport.pixelWidth, viewport.pixelHeight].every(finite) ||
          viewport.width <= 0 || viewport.height <= 0 || viewport.pixelWidth < 1 || viewport.pixelHeight < 1)
        throw new TypeError('Barrier r0.7 needs an active shared frame, target, events and viewport');
      if (events.length > MAX_EVENTS) throw new RangeError(`Barrier r0.7 exceeds ${MAX_EVENTS} concurrent events`);
      const dprX = viewport.pixelWidth / viewport.width, dprY = viewport.pixelHeight / viewport.height;
      if (Math.abs(dprX - dprY) > 0.02) throw new TypeError('Barrier r0.7 viewport X/Y scale differs');
      const ids = new Set();
      const planned = events.map(item => {
        const name = String(item?.event || '');
        const spec = EVENTS[name], id = String(item?.id || '');
        if (!spec || !id || ids.has(id) || !finite(item?.tMs) || item.tMs < 0 || item.tMs >= spec[1] ||
            ![item?.center?.x, item?.center?.y, item?.receiverHeightPx].every(finite) || item.receiverHeightPx <= 0)
          throw new TypeError('Barrier r0.7 needs distinct live IDs, exact event age and positive sprite quad');
        ids.add(id);
        const physicalH = item.receiverHeightPx * dprX;
        const side = Math.max(2, Math.round(2 * physicalH));
        if (side > device.limits.maxTextureDimension2D) throw new RangeError('Barrier r0.7 local field exceeds GPU texture limit');
        const originX = Math.round(item.center.x * dprX - side / 2);
        const originY = Math.round(item.center.y * dprY - side / 2);
        return { id, name, kind: spec[0], tMs: item.tMs, durationMs: spec[1], side, originX, originY };
      });
      if (!planned.length) return Object.freeze({ drawn: 0, eventIds: Object.freeze([]) });
      const resources = [];
      frame.addEncoder({ label: 'barrier-pro-r07-game', reads: [], writes: [target],
        encode(encoder, info) {
          if (destroyed) return;
          const size = info.size(target);
          if (size.width !== viewport.pixelWidth || size.height !== viewport.pixelHeight || info.format !== format)
            throw new Error('Barrier r0.7 shared target or format changed before encode');
          for (const item of planned) {
            const texture = device.createTexture({ label: 'Barrier Pro r0.7 local HDR', size: [item.side, item.side],
              format: 'rgba16float', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
            resources.push(texture); liveResources.add(texture);
            const uniform = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
            const raw = new ArrayBuffer(32), f32 = new Float32Array(raw), u32 = new Uint32Array(raw);
            f32.set([item.side, item.side, item.side / 2, item.tMs / item.durationMs]);
            u32.set([item.kind, 0, 1, 0], 4);
            device.queue.writeBuffer(uniform, 0, raw);
            resources.push(uniform); liveResources.add(uniform);
            const barrierBind = device.createBindGroup({ layout: barrierPipeline.getBindGroupLayout(0),
              entries: [{ binding: 0, resource: { buffer: uniform } }] });
            let pass = encoder.beginRenderPass({ colorAttachments: [{ view: texture.createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
            pass.setPipeline(barrierPipeline); pass.setBindGroup(0, barrierBind); pass.draw(3); pass.end();
            const placement = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
            device.queue.writeBuffer(placement, 0, new Int32Array([item.originX, item.originY, item.side, item.side]));
            resources.push(placement); liveResources.add(placement);
            const compositeBind = device.createBindGroup({ layout: compositePipeline.getBindGroupLayout(0),
              entries: [{ binding: 0, resource: texture.createView() }, { binding: 1, resource: { buffer: placement } }] });
            pass = encoder.beginRenderPass({ colorAttachments: [{ view: info.view(target), loadOp: 'load', storeOp: 'store' }] });
            pass.setPipeline(compositePipeline); pass.setBindGroup(0, compositeBind); pass.draw(3); pass.end();
          }
        },
        onSubmitted(proof) { void Promise.all([proof?.validation, proof?.done]).then(() => release(resources), () => release(resources)); },
        onProofError() { release(resources); }, onAbandon() { release(resources); }
      });
      return Object.freeze({ drawn: planned.length, eventIds: Object.freeze(planned.map(item => item.id)) });
    }
    return Object.freeze({ VERSION, record, destroy() { if (destroyed) return; destroyed = true; release([...liveResources]); } });
  }
  root.DvaWebGPUBarrierProR07Game = Object.freeze({ VERSION, EVENTS, MAX_EVENTS, create });
  if (typeof module !== 'undefined' && module.exports) module.exports = root.DvaWebGPUBarrierProR07Game;
})(typeof globalThis !== 'undefined' ? globalThis : window);
