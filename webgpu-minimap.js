/* Dormant WebGPU minimap pass. The caller owns the shared device, main target,
 * committed viewport, frame submission, and per-frame release after submit.
 * All geometry is written directly to the shared target; no 2D context exists. */
(function (root) {
  'use strict';

  const shader = /* wgsl */ `
struct View { size: vec2f, unused: vec2f }
@group(0) @binding(0) var<uniform> view: View;
struct Vertex { @location(0) position: vec2f, @location(1) color: vec4f }
struct Fragment { @builtin(position) position: vec4f, @location(0) color: vec4f }
@vertex fn vs(input: Vertex) -> Fragment {
  var output: Fragment;
  output.position = vec4f(input.position / view.size * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  output.color = input.color;
  return output;
}
@fragment fn fs(input: Fragment) -> @location(0) vec4f {
  return vec4f(input.color.rgb * input.color.a, input.color.a);
}`;
  const hex = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255).concat(1);
  const clamp = value => Math.max(0, Math.min(1, value));
  const finite = value => Number.isFinite(value);

  function plan(scene, viewport) {
    const map = scene?.map, bounds = scene?.bounds;
    if (viewport?.kind !== 'main' || !finite(viewport.width) || !finite(viewport.height) ||
        !finite(viewport.pixelWidth) || !finite(viewport.pixelHeight) ||
        !Array.isArray(viewport.logicalToPixel) || viewport.logicalToPixel.length !== 6 ||
        !viewport.logicalToPixel.every(finite) || !map || !(map.width > 0 && map.height > 0) ||
        !bounds || ![bounds.x, bounds.y, bounds.width, bounds.height].every(finite) ||
        bounds.width <= 18 || bounds.height <= 18 || !finite(scene.now)) {
      throw new TypeError('Minimap requires a scene and committed main WebGPU viewport');
    }
    const scale = Math.min((bounds.width - 18) / map.width, (bounds.height - 18) / map.height);
    const ox = bounds.x + 9, oy = bounds.y + 9;
    const shapes = [];
    const push = (kind, values, color) => shapes.push({ kind, values, color });
    // Canvas roundRect fill has a radius of 8 logical pixels.
    push('roundRect', [bounds.x, bounds.y, bounds.width, bounds.height, 8], [238 / 255, 246 / 255, 250 / 255, .84]);
    const rect = (x, y, w, h, color) => push('rect', [ox + x * scale, oy + y * scale, w * scale, h * scale], color);
    const disc = (x, y, radius, color) => push('disc', [ox + x * scale, oy + y * scale, radius * scale], color);
    const ring = (x, y, radius, width, color) => push('ring', [ox + x * scale, oy + y * scale, radius * scale, width * scale], color);
    const floor = hex('#6f8798');
    for (const area of [...(map.rooms || []), ...(map.corridorAreas || [])]) rect(area.x, area.y, area.w, area.h, floor);
    for (const task of scene.tasks || []) {
      if (task.done) continue;
      const station = map.stations?.find(item => item.id === task.stationId);
      if (station) disc(station.x, station.y, 28, hex('#2dd4bf'));
    }
    for (const body of scene.bodies || []) rect(body.x - 12, body.y - 12, 24, 24, hex('#ef4444'));
    for (const effect of scene.worldSoundEffects || []) {
      const progress = clamp((scene.now - effect.startedAt) / effect.duration);
      ring(effect.x, effect.y, 55 + progress * 110, 12, [239 / 255, 68 / 255, 68 / 255, 1 - progress]);
      disc(effect.x, effect.y, 32, [220 / 255, 38 / 255, 38 / 255, 1 - progress * .65]);
    }
    if (scene.hackTracking || scene.hackEffective) {
      for (const player of scene.players || []) {
        if (player.id === scene.selfId || !player.alive || player.ejected) continue;
        disc(player.x, player.y, 24, hex(player.role === 'attacker' ? '#fb7185' : '#38bdf8'));
        ring(player.x, player.y, 24, 10, hex('#f8fafc'));
      }
    }
    for (const player of scene.players || []) {
      if (player.id !== scene.selfId || player.ejected) continue;
      const pulse = .5 + .5 * Math.sin(scene.now / 170);
      ring(player.x, player.y, 48 + pulse * 15, 18, hex('#ffffff'));
      disc(player.x, player.y, 34, hex('#fef08a'));
      ring(player.x, player.y, 34, 14, hex('#0e7490'));
    }
    return Object.freeze({ bounds, scale, shapes: Object.freeze(shapes) });
  }

  function verticesFor(planResult, viewport) {
    const sx = viewport.logicalToPixel[0], sy = viewport.logicalToPixel[3];
    const fanTriangleCount = (start, end) => Math.max(12, Math.ceil((end - start) / (Math.PI * 2) * 48));
    const fullFanTriangles = fanTriangleCount(0, Math.PI * 2);
    const rectVertices = (w, h) => w <= 0 || h <= 0 ? 0 : 6;
    let vertexCount = 0;
    for (const shape of planResult.shapes) {
      const v = shape.values;
      if (shape.kind === 'rect') vertexCount += rectVertices(v[2], v[3]);
      else if (shape.kind === 'disc') vertexCount += fullFanTriangles * 3;
      else if (shape.kind === 'ring') vertexCount += 48 * 6;
      else if (shape.kind === 'roundRect') {
        const [x, y, w, h, r] = v;
        vertexCount += rectVertices(w - 2 * r, h);
        vertexCount += rectVertices(r, h - 2 * r);
        vertexCount += rectVertices(r, h - 2 * r);
        vertexCount += 3 * fanTriangleCount(Math.PI, Math.PI * 1.5);
        vertexCount += 3 * fanTriangleCount(Math.PI * 1.5, Math.PI * 2);
        vertexCount += 3 * fanTriangleCount(Math.PI * .5, Math.PI);
        vertexCount += 3 * fanTriangleCount(0, Math.PI * .5);
      }
    }

    const result = new Float32Array(vertexCount * 6);
    let offset = 0;
    const emit = (x, y, color) => {
      result[offset++] = x * sx;
      result[offset++] = y * sy;
      result[offset++] = color[0];
      result[offset++] = color[1];
      result[offset++] = color[2];
      result[offset++] = color[3];
    };
    const tri = (ax, ay, bx, by, cx, cy, color) => {
      emit(ax, ay, color); emit(bx, by, color); emit(cx, cy, color);
    };
    const quad = (ax, ay, bx, by, cx, cy, dx, dy, color) => {
      tri(ax, ay, bx, by, cx, cy, color);
      tri(ax, ay, cx, cy, dx, dy, color);
    };
    const rect = (x, y, w, h, color) => {
      if (w <= 0 || h <= 0) return;
      quad(x, y, x + w, y, x + w, y + h, x, y + h, color);
    };
    const fan = (x, y, radius, color, start = 0, end = Math.PI * 2) => {
      const count = Math.max(12, Math.ceil((end - start) / (Math.PI * 2) * 48));
      for (let i = 0; i < count; i++) {
        const a = start + (end - start) * i / count, b = start + (end - start) * (i + 1) / count;
        const ax = x + Math.cos(a) * radius, ay = y + Math.sin(a) * radius;
        const bx = x + Math.cos(b) * radius, by = y + Math.sin(b) * radius;
        tri(x, y, ax, ay, bx, by, color);
      }
    };
    const ring = (x, y, radius, width, color) => {
      const outer = radius + width / 2, inner = Math.max(0, radius - width / 2);
      for (let i = 0; i < 48; i++) {
        const a = i * Math.PI * 2 / 48, b = (i + 1) * Math.PI * 2 / 48;
        const ax = x + Math.cos(a) * inner, ay = y + Math.sin(a) * inner;
        const bx = x + Math.cos(a) * outer, by = y + Math.sin(a) * outer;
        const cx = x + Math.cos(b) * outer, cy = y + Math.sin(b) * outer;
        const dx = x + Math.cos(b) * inner, dy = y + Math.sin(b) * inner;
        quad(ax, ay, bx, by, cx, cy, dx, dy, color);
      }
    };
    for (const shape of planResult.shapes) {
      const v = shape.values, c = shape.color;
      if (shape.kind === 'rect') rect(v[0], v[1], v[2], v[3], c);
      else if (shape.kind === 'disc') fan(v[0], v[1], v[2], c);
      else if (shape.kind === 'ring') ring(v[0], v[1], v[2], v[3], c);
      else if (shape.kind === 'roundRect') {
        const [x, y, w, h, r] = v;
        rect(x + r, y, w - 2 * r, h, c);
        rect(x, y + r, r, h - 2 * r, c);
        rect(x + w - r, y + r, r, h - 2 * r, c);
        fan(x + r, y + r, r, c, Math.PI, Math.PI * 1.5);
        fan(x + w - r, y + r, r, c, Math.PI * 1.5, Math.PI * 2);
        fan(x + r, y + h - r, r, c, Math.PI * .5, Math.PI);
        fan(x + w - r, y + h - r, r, c, 0, Math.PI * .5);
      }
    }
    if (offset !== result.length) throw new Error('Minimap vertex pre-count mismatch');
    return result;
  }

  function create({ device, format } = {}) {
    if (!device?.createRenderPipeline || !device?.createBuffer || !device?.queue?.writeBuffer ||
        typeof format !== 'string' || !format) throw new TypeError('Shared WebGPU device and format required');
    const module = device.createShaderModule({ label: 'DVA minimap vectors', code: shader });
    const pipeline = device.createRenderPipeline({
      label: 'DVA minimap vectors', layout: 'auto',
      vertex: { module, entryPoint: 'vs', buffers: [{ arrayStride: 24, attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x2' },
        { shaderLocation: 1, offset: 8, format: 'float32x4' }
      ] }] },
      fragment: { module, entryPoint: 'fs', targets: [{ format, blend: {
        color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
      } }] }, primitive: { topology: 'triangle-list' }
    });
    let destroyed = false;
    const live = new Set();
    // The cache is deliberately renderer-local and CPU-only. A minimap scene
    // adapter may create new wrapper/array objects every frame, so key the
    // reusable geometry by its ordered numeric content rather than identity.
    const staticGeometryCache = new Map();
    const STATIC_GEOMETRY_CACHE_LIMIT = 4;
    function staticGeometryKey(scene, viewport) {
      const map = scene?.map, bounds = scene?.bounds;
      const rooms = map?.rooms == null ? [] : map.rooms;
      const corridors = map?.corridorAreas == null ? [] : map.corridorAreas;
      // Preserve legacy support for iterables and malformed inputs by simply
      // bypassing caching; plan()/verticesFor() remain the behavior oracle.
      if (!Array.isArray(rooms) || !Array.isArray(corridors) ||
          !map || !bounds || !rooms.every(area => area &&
            [area.x, area.y, area.w, area.h].every(finite)) ||
          !corridors.every(area => area &&
            [area.x, area.y, area.w, area.h].every(finite))) return null;
      const values = [map.width, map.height, bounds.x, bounds.y, bounds.width,
        bounds.height, viewport.logicalToPixel[0], viewport.logicalToPixel[3]];
      if (!values.every(finite)) return null;
      for (const area of rooms) values.push(area.x, area.y, area.w, area.h);
      values.push('corridors');
      for (const area of corridors) values.push(area.x, area.y, area.w, area.h);
      // JSON is an unambiguous encoding for these finite numbers and ordered
      // tuples. Include a format tag so future geometry changes cannot alias.
      const exactValues = values.map(value => typeof value === 'number' && Object.is(value, -0)
        ? '-0' : value);
      return `minimap-static-v1:${JSON.stringify(exactValues)}`;
    }
    function touchStaticGeometry(key) {
      const geometry = staticGeometryCache.get(key);
      if (!geometry) return null;
      staticGeometryCache.delete(key);
      staticGeometryCache.set(key, geometry);
      return geometry;
    }
    function cacheStaticGeometry(key, geometry) {
      staticGeometryCache.set(key, geometry);
      while (staticGeometryCache.size > STATIC_GEOMETRY_CACHE_LIMIT) {
        staticGeometryCache.delete(staticGeometryCache.keys().next().value);
      }
      return geometry;
    }
    function verticesForFrame(planResult, scene, viewport) {
      const key = staticGeometryKey(scene, viewport);
      if (key === null) return verticesFor(planResult, viewport);
      const cached = touchStaticGeometry(key);
      const staticShapeCount = 1 + (scene.map.rooms == null ? 0 : scene.map.rooms.length) +
        (scene.map.corridorAreas == null ? 0 : scene.map.corridorAreas.length);
      const staticPlan = { shapes: planResult.shapes.slice(0, staticShapeCount) };
      const dynamicPlan = { shapes: planResult.shapes.slice(staticShapeCount) };
      const staticVertices = cached || cacheStaticGeometry(key, verticesFor(staticPlan, viewport));
      const dynamicVertices = verticesFor(dynamicPlan, viewport);
      const combined = new Float32Array(staticVertices.length + dynamicVertices.length);
      combined.set(staticVertices, 0);
      combined.set(dynamicVertices, staticVertices.length);
      return combined;
    }
    function draw({ frame, target, viewport, scene } = {}) {
      if (destroyed) throw new Error('Minimap renderer destroyed');
      if (!frame?.add || typeof target !== 'string' || !target) throw new TypeError('Shared frame and registered target required');
      const planned = plan(scene, viewport);
      const geometry = verticesForFrame(planned, scene, viewport);
      const buffer = device.createBuffer({ label: 'DVA minimap vertices', size: geometry.byteLength, usage: 0x20 | 0x08 });
      const uniform = device.createBuffer({ label: 'DVA minimap viewport', size: 16, usage: 0x40 | 0x08 });
      device.queue.writeBuffer(buffer, 0, geometry);
      device.queue.writeBuffer(uniform, 0, new Float32Array([viewport.pixelWidth, viewport.pixelHeight, 0, 0]));
      const group = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniform } }] });
      live.add(buffer); live.add(uniform);
      frame.add({ target, label: 'minimap:vectors', encode(pass) {
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, group);
        pass.setVertexBuffer(0, buffer);
        pass.draw(geometry.length / 6);
      } });
      let released = false;
      return Object.freeze({ release() {
        if (released) return;
        released = true;
        buffer.destroy(); uniform.destroy();
        live.delete(buffer); live.delete(uniform);
      }, vertices: geometry.length / 6 });
    }
    return Object.freeze({ draw, destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const buffer of live) buffer.destroy();
      live.clear();
      staticGeometryCache.clear();
    } });
  }
  const api = Object.freeze({ create, plan, verticesFor, shader });
  root.DvaWebGPUMinimap = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
