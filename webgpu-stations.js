/* Station props and interaction marks for the shared ordered WebGPU world frame.
 * The caller supplies prepared images, room-composite readiness, camera, and
 * one shared device/frame/text atlas. Geometry is in logical viewport pixels. */
(function (root) {
  'use strict';
  const finite = Number.isFinite;
  const TAU = Math.PI * 2;
  // Facility props ship as opaque WebP on a green matte. This pass runs once
  // per image upload on the caller's device and writes premultiplied RGBA for
  // the shared primitive sprite pipeline. The used station cells (0 and 5)
  // have no intentional green paint; openings through the prop remain clear.
  const chromaShader = /* wgsl */ `
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var keyed: texture_storage_2d<rgba8unorm, write>;
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let dimensions = textureDimensions(source);
  if (gid.x >= dimensions.x || gid.y >= dimensions.y) { return; }
  let texel = textureLoad(source, vec2i(gid.xy), 0);
  let r = texel.r;
  let g = texel.g;
  let b = texel.b;
  let matte = g > 76.0 / 255.0 && r < 82.0 / 255.0 && b < 92.0 / 255.0 &&
    g > r * 1.35 && g > b * 1.25;
  let alpha = select(texel.a, 0.0, matte);
  textureStore(keyed, vec2i(gid.xy), vec4f(texel.rgb * alpha, alpha));
}`;
  const color = (r, g, b, a = 1) => [r / 255, g / 255, b / 255, a];
  const ready = image => Boolean(image && image.complete !== false &&
    (image.naturalWidth || image.width) > 0 && (image.naturalHeight || image.height) > 0);
  function sourceFor(atlas, cell) {
    const image = Array.isArray(atlas) ? atlas[cell] : atlas;
    if (!ready(image)) return null;
    const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
    return { image, sourceSize: [width, height], crop: Array.isArray(atlas)
      ? [0, 0, width, height]
      : [(cell % 3) * width / 3, Math.floor(cell / 3) * height / 2, width / 3, height / 2] };
  }
  function integrated(station, rooms, compositeReady) {
    if (!compositeReady) return false;
    const room = station.room && station.room !== 'corridor'
      ? rooms.find(entry => entry.id === station.room)
      : rooms.find(entry => station.x >= entry.x && station.x <= entry.x + entry.w &&
        station.y >= entry.y && station.y <= entry.y + entry.h);
    return Boolean(room);
  }
  function plan({ scene, tasks = [], rooms = [], compositeReady = false, facilityProps,
    self = null, taskRange, camera, zoom, viewport } = {}) {
    if (!Array.isArray(scene) || !Array.isArray(tasks) || !Array.isArray(rooms) ||
        !camera || !viewport || ![camera.x, camera.y, zoom, viewport.width, viewport.height].every(finite) ||
        zoom <= 0 || viewport.width <= 0 || viewport.height <= 0 ||
        !finite(taskRange) || taskRange < 0) {
      throw new TypeError('Stations require scene, tasks, rooms, range, camera, zoom, and logical viewport');
    }
    const taskIds = new Set(tasks.filter(task => task && !task.done).map(task => task.stationId));
    const right = camera.x + viewport.width / zoom, bottom = camera.y + viewport.height / zoom;
    const entries = [];
    for (const station of scene) {
      if (!station || !finite(station.x) || !finite(station.y) ||
          station.x < camera.x - 180 || station.x > right + 180 ||
          station.y < camera.y - 180 || station.y > bottom + 180) continue;
      const active = taskIds.has(station.id);
      const type = station.type;
      const symbol = type === 'task' ? (station.task === 'download' ? 'DL' : station.task === 'upload' ? 'UP' : 'T')
        : type === 'utility' ? 'U' : type === 'emergency' ? '!' : '';
      const width = type === 'emergency' ? 82 : 74;
      const height = type === 'emergency' ? 64 : 70;
      const isIntegrated = integrated(station, rooms, compositeReady);
      const source = isIntegrated ? null :
        sourceFor(facilityProps, type === 'emergency' ? 5 : 0);
      const near = type !== 'task' && type !== 'vending' && self &&
        finite(self.x) && finite(self.y) && Math.hypot(self.x - station.x, self.y - station.y) <= taskRange;
      entries.push(Object.freeze({ id: station.id, type, active, symbol,
        label: active ? String(station.label ?? '') : '',
        x: (station.x - camera.x) * zoom, y: (station.y - camera.y) * zoom,
        zoom, width, height, source, integrated: isIntegrated, near: Boolean(near) }));
    }
    return Object.freeze(entries);
  }
  function create({ device, textAtlas } = {}) {
    if (!device?.createTexture || !device?.createShaderModule || !device?.createComputePipeline ||
        !device?.createBindGroup || !device?.createCommandEncoder ||
        !device?.queue?.copyExternalImageToTexture || !device?.queue?.submit ||
        typeof textAtlas?.layout !== 'function' || typeof textAtlas?.ensure !== 'function' ||
        !Array.isArray(textAtlas.textures)) {
      throw new TypeError('Stations require the shared WebGPU device and text atlas');
    }
    const images = new Map(), owned = new Set();
    const shader = device.createShaderModule({ label: 'DVA station green-matte removal', code: chromaShader });
    const chroma = device.createComputePipeline({ label: 'DVA station prop chroma',
      layout: 'auto', compute: { module: shader, entryPoint: 'main' } });
    let destroyed = false;
    function makePlan(input) {
      if (destroyed) throw new Error('Station pass destroyed');
      return plan(input);
    }
    async function prepare(input) {
      const entries = makePlan(input);
      const strings = entries.flatMap(entry => [entry.symbol, entry.label]).filter(Boolean);
      if (strings.length) await textAtlas.ensure(strings.join('\n'));
      if (destroyed) throw new Error('Station pass destroyed');
      return entries;
    }
    function textureFor(source) {
      const { image, sourceSize } = source;
      const existing = images.get(image);
      if (existing && existing.width === sourceSize[0] && existing.height === sourceSize[1]) return existing.texture;
      let input, texture;
      try {
        input = device.createTexture({ label: 'DVA station source atlas',
          size: sourceSize, format: 'rgba8unorm', usage: 0x02 | 0x04 | 0x10 });
        texture = device.createTexture({ label: 'DVA station keyed atlas',
        size: sourceSize, format: 'rgba8unorm', usage: 0x04 | 0x08 });
        device.queue.copyExternalImageToTexture({ source: image },
          { texture: input, premultipliedAlpha: false }, sourceSize);
        const group = device.createBindGroup({ layout: chroma.getBindGroupLayout(0), entries: [
          { binding: 0, resource: input.createView() },
          { binding: 1, resource: texture.createView() }
        ] });
        const encoder = device.createCommandEncoder({ label: 'DVA station prop chroma upload' });
        const pass = encoder.beginComputePass();
        pass.setPipeline(chroma);
        pass.setBindGroup(0, group);
        pass.dispatchWorkgroups(Math.ceil(sourceSize[0] / 8), Math.ceil(sourceSize[1] / 8));
        pass.end();
        device.queue.submit([encoder.finish()]);
      } catch (error) {
        try { input?.destroy(); } catch (_) {}
        try { texture?.destroy(); } catch (_) {}
        throw error;
      }
      images.set(image, { width: sourceSize[0], height: sourceSize[1], texture });
      owned.add(input);
      owned.add(texture); // Earlier frame commands can still refer to an old image texture.
      return texture;
    }
    function layout(value, size) {
      const result = textAtlas.layout(value, { size, missing: 'error' });
      if (!result || !Array.isArray(result.quads) || !finite(result.width)) throw new Error('Invalid station text layout');
      for (const glyph of result.quads) if (!textAtlas.textures[glyph.page]) {
        throw new Error(`Station text atlas page ${glyph.page} unavailable; call prepare first`);
      }
      return result;
    }
    function glyphs(frame, target, result, x, centerY, tint) {
      const top = result.quads.length ? Math.min(...result.quads.map(g => g.y)) : 0;
      const bottom = result.quads.length ? Math.max(...result.quads.map(g => g.y + g.h)) : result.height;
      const left = x - result.width / 2, shiftY = centerY - (top + bottom) / 2;
      for (const glyph of result.quads) frame.sprite(target, { x: left + glyph.x, y: shiftY + glyph.y,
        w: glyph.w, h: glyph.h, uv: glyph.uv, texture: textAtlas.textures[glyph.page],
        color: tint, mode: 'source-over' });
    }
    function roundedRect(frame, target, x, y, w, h, radius, tint) {
      const rows = Math.max(1, Math.ceil(h));
      for (let row = 0; row < rows; row++) {
        const top = y + h * row / rows, bottom = y + h * (row + 1) / rows;
        const distance = Math.min((top + bottom) / 2 - y, y + h - (top + bottom) / 2);
        const inset = distance >= radius ? 0 : radius - Math.sqrt(Math.max(0, radius * radius - (radius - distance) ** 2));
        frame.rect(target, { x: x + inset, y: top, w: w - 2 * inset, h: bottom - top,
          color: tint, mode: 'source-over' });
      }
    }
    function record({ frame, shapes, target, viewport, preparedPlan, ...sceneInput } = {}) {
      if (destroyed) throw new Error('Station pass destroyed');
      if (preparedPlan === undefined) preparedPlan = makePlan({ ...sceneInput, viewport });
      if (!Array.isArray(preparedPlan)) throw new TypeError('Call prepare before recording stations');
      if (!preparedPlan.length) return { drawn: 0, batches: [] };
      if (typeof frame?.stage !== 'function' || typeof frame.rect !== 'function' ||
          typeof frame.sprite !== 'function' || typeof shapes?.enqueue !== 'function' ||
          typeof target !== 'string' || !target || !viewport ||
          ![viewport.width, viewport.height].every(value => finite(value) && value > 0) ||
          ![viewport.pixelWidth, viewport.pixelHeight].every(value => Number.isInteger(value) && value > 0)) {
        throw new TypeError('Stations require shared frame, shapes, target, and committed viewport');
      }
      const layouts = preparedPlan.map(entry => ({
        symbol: entry.symbol ? layout(entry.symbol, (entry.active ? 10 : 9) * entry.zoom) : null,
        label: entry.active ? layout(entry.label, 12 * entry.zoom) : null
      }));
      // Resolve uploads before recording anything; a failed upload cannot leave a partial station pass.
      const propTextures = preparedPlan.map(entry => entry.source ? textureFor(entry.source) : null);
      const batches = [];
      function circle(commands, name) {
        batches.push(shapes.enqueue(frame, { target, width: viewport.width, height: viewport.height,
          pixelWidth: viewport.pixelWidth, pixelHeight: viewport.pixelHeight,
          commands, label: `world:stations:${name}` }));
      }
      try {
        frame.stage('world:stations');
        preparedPlan.forEach((entry, index) => {
          const { x, y, zoom, type, active, source, integrated, width, height, near } = entry;
          const symbolY = y + height * .34 * zoom + .5 * zoom;
          if (source) frame.sprite(target, { x: x - width * zoom / 2, y: y - height * zoom / 2,
            w: width * zoom, h: height * zoom, crop: source.crop, sourceSize: source.sourceSize,
            texture: propTextures[index], color: [1, 1, 1, active ? 1 : .9], mode: 'source-over' });
          if (!source && !integrated && type !== 'vending' && type !== 'task') {
            const fill = type === 'utility' ? color(56, 189, 248) :
              type === 'emergency' ? color(239, 68, 68) : color(154, 169, 184);
            circle([{ kind: 'circle', x, y, radius: (active ? 20 : 14) * zoom, color: fill },
              { kind: 'arc', x, y, radius: (active ? 20 : 14) * zoom, start: 0, sweep: TAU,
                lineWidth: (active ? 4 : 2) * zoom,
                color: active ? color(224, 251, 255) : color(255, 255, 255, .42) }], 'fallback');
          }
          if (type !== 'task' && type !== 'vending') circle([
            { kind: 'circle', x, y: y + height * .34 * zoom, radius: (active ? 14 : 11) * zoom,
              color: color(7, 16, 20, .88) }], 'symbol-disc');
          if (layouts[index].symbol) glyphs(frame, target, layouts[index].symbol, x, symbolY,
            active ? color(223, 251, 255) : color(248, 250, 252));
          if (active) {
            roundedRect(frame, target, x - 45 * zoom, y + 28 * zoom, 90 * zoom, 22 * zoom,
              7 * zoom, color(248, 252, 255, .94));
            glyphs(frame, target, layouts[index].label, x, y + 39 * zoom, color(16, 50, 69));
          }
          if (near) circle([{ kind: 'arc', x, y, radius: (active ? 34 : 24) * zoom,
            start: 0, sweep: TAU, lineWidth: (active ? 4 : 1) * zoom,
            color: active ? color(6, 214, 255, .85) : color(45, 212, 191, .35) }], 'proximity');
        });
      } catch (error) {
        for (const batch of batches) { try { batch?.destroy?.(); } catch (_) {} }
        throw error; // The caller discards its failed shared frame.
      }
      return { drawn: preparedPlan.length, batches };
    }
    return Object.freeze({ plan: makePlan, prepare, record, destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const texture of owned) texture.destroy();
      owned.clear(); images.clear();
    } });
  }
  const api = Object.freeze({ plan, create, chromaShader });
  root.DvaWebGPUStations = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
