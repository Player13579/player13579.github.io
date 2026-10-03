/* Early persistent gravity-zone material in the ordered WebGPU world frame.
 * Coordinates and viewport are logical pixels. The caller supplies the
 * authoritative estimated server time. Shared frame.sprite supports screen blend. */
(function (root) {
  'use strict';
  const STORM_CELLS = [[3430,486,489,484,12,12,512,512],[492,486,490,485,11,11,512,512],[1962,486,490,485,11,11,512,512],[1968,0,491,486,11,11,512,512],[3443,0,492,485,10,12,512,512],[0,0,492,486,10,12,512,512],[492,0,492,486,10,12,512,512],[984,0,492,486,10,13,512,512],[0,486,492,485,10,14,512,512],[1476,0,492,486,10,14,512,512],[2459,0,492,485,10,15,512,512],[2951,0,492,485,10,15,512,512],[2940,486,490,484,11,16,512,512],[982,486,490,485,11,16,512,512],[1472,486,490,485,11,16,512,512],[2452,486,488,485,12,16,512,512],[976,971,487,484,13,16,512,512],[1463,971,486,484,13,16,512,512],[1949,971,485,484,14,16,512,512],[2921,971,484,483,14,16,512,512],[3405,971,484,483,14,16,512,512],[486,1455,484,482,14,16,512,512],[1455,1455,484,481,14,16,512,512],[2424,1455,484,480,14,16,512,512],[2908,1455,484,480,14,16,512,512],[3392,1455,484,480,14,16,512,512],[1939,1455,485,480,13,16,512,512],[970,1455,485,481,13,15,512,512],[0,1455,486,482,13,14,512,512],[2434,971,487,483,12,13,512,512],[0,971,488,484,12,12,512,512],[488,971,488,484,12,12,512,512],[2928,2185,244,242,6,7,256,256],[3172,2185,244,242,6,7,256,256],[1952,2430,244,242,6,7,256,256],[732,2672,244,242,6,7,256,256],[1464,2672,244,242,6,7,256,256],[1708,2672,244,242,6,7,256,256],[1952,2672,244,242,6,7,256,256],[2196,2672,244,242,6,7,256,256],[2440,2672,244,242,6,7,256,256],[2684,2672,244,242,6,7,256,256],[3416,2185,244,242,6,7,256,256],[3660,2185,244,242,6,7,256,256],[0,2430,244,242,6,7,256,256],[244,2430,244,242,6,7,256,256],[488,2430,244,242,6,7,256,256],[732,2430,244,242,6,7,256,256],[976,2430,244,242,6,7,256,256],[1220,2430,244,242,6,7,256,256],[1464,2430,244,242,6,7,256,256],[1708,2430,244,242,6,7,256,256],[2196,2430,244,242,6,7,256,256],[2440,2430,244,242,6,7,256,256],[2684,2430,244,242,6,7,256,256],[2928,2430,244,242,6,7,256,256],[3172,2430,244,242,6,7,256,256],[3416,2430,244,242,6,7,256,256],[3660,2430,244,242,6,7,256,256],[0,2672,244,242,6,7,256,256],[244,2672,244,242,6,7,256,256],[488,2672,244,242,6,7,256,256],[976,2672,244,242,6,7,256,256],[1220,2672,244,242,6,7,256,256],[2928,2672,244,242,6,7,256,256],[3172,2672,244,242,6,7,256,256],[1952,2914,244,242,6,7,256,256],[732,3156,244,242,6,7,256,256],[1464,3156,244,242,6,7,256,256],[1708,3156,244,242,6,7,256,256],[1952,3156,244,242,6,7,256,256],[2196,3156,244,242,6,7,256,256],[2440,3156,244,242,6,7,256,256],[2684,3156,244,242,6,7,256,256],[3416,2672,244,242,6,7,256,256],[3660,2672,244,242,6,7,256,256],[0,2914,244,242,6,7,256,256],[244,2914,244,242,6,7,256,256],[488,2914,244,242,6,7,256,256],[732,2914,244,242,6,7,256,256],[976,2914,244,242,6,7,256,256],[1220,2914,244,242,6,7,256,256],[1464,2914,244,242,6,7,256,256],[1708,2914,244,242,6,7,256,256],[2196,2914,244,242,6,7,256,256],[2440,2914,244,242,6,7,256,256],[2684,2914,244,242,6,7,256,256],[2928,2914,244,242,6,7,256,256],[3172,2914,244,242,6,7,256,256],[3416,2914,244,242,6,7,256,256],[3660,2914,244,242,6,7,256,256],[0,3156,244,242,6,7,256,256],[244,3156,244,242,6,7,256,256],[488,3156,244,242,6,7,256,256],[976,3156,244,242,6,7,256,256],[1220,3156,244,242,6,7,256,256],[2928,3156,244,242,6,7,256,256],[3172,3156,244,242,6,7,256,256],[3416,3156,244,242,6,7,256,256],[3660,3156,244,242,6,7,256,256],[2684,2185,244,243,6,7,256,256],[1464,2185,244,244,6,6,256,256],[1708,2185,244,244,6,6,256,256],[1952,2185,244,244,6,6,256,256],[2196,2185,244,244,6,6,256,256],[2440,2185,244,244,6,6,256,256],[244,2185,244,244,6,6,256,256],[488,2185,244,244,6,6,256,256],[732,2185,244,244,6,6,256,256],[976,2185,244,244,6,6,256,256],[1220,2185,244,244,6,6,256,256],[0,2185,244,245,6,6,256,256],[732,1937,244,246,6,5,256,256],[976,1937,244,246,6,5,256,256],[1220,1937,244,246,6,5,256,256],[1464,1937,244,246,6,5,256,256],[1708,1937,244,246,6,5,256,256],[1952,1937,244,246,6,5,256,256],[2196,1937,244,246,6,5,256,256],[2440,1937,244,246,6,5,256,256],[2684,1937,244,246,6,5,256,256],[2928,1937,244,246,6,5,256,256],[3172,1937,244,246,6,5,256,256],[3416,1937,244,246,6,5,256,256],[3660,1937,244,246,6,5,256,256],[0,1937,244,248,6,4,256,256],[244,1937,244,248,6,4,256,256],[488,1937,244,248,6,4,256,256],[0,3398,228,191,14,32,256,256],[228,3398,228,166,14,45,256,256],[456,3398,228,157,14,49,256,256]];
  const SAFE_CELLS = [[1794,882,298,294,75,76,448,448],[0,1176,298,294,75,76,448,448],[0,1470,298,294,75,76,448,448],[0,588,299,294,75,76,448,448],[897,588,299,294,75,76,448,448],[299,882,299,294,75,76,448,448],[598,882,299,294,75,76,448,448],[897,882,299,294,75,76,448,448],[1196,882,299,294,75,76,448,448],[1495,882,299,294,75,76,448,448],[0,0,299,294,75,76,448,448],[299,0,299,294,75,76,448,448],[598,0,299,294,75,76,448,448],[298,1176,298,294,75,76,448,448],[596,1176,298,294,75,76,448,448],[894,1176,298,294,75,76,448,448],[1192,1176,298,294,75,76,448,448],[1490,1176,298,294,75,76,448,448],[1788,1176,298,294,75,76,448,448],[897,0,299,294,74,76,448,448],[1196,0,299,294,74,76,448,448],[1495,0,299,294,74,76,448,448],[1794,0,299,294,74,76,448,448],[0,294,299,294,74,76,448,448],[299,294,299,294,74,76,448,448],[598,294,299,294,74,76,448,448],[897,294,299,294,74,76,448,448],[1196,294,299,294,74,76,448,448],[1495,294,299,294,74,76,448,448],[1794,294,299,294,74,76,448,448],[298,1470,298,294,75,76,448,448],[596,1470,298,294,75,76,448,448],[894,1470,298,294,75,76,448,448],[1192,1470,298,294,75,76,448,448],[1490,1470,298,294,75,76,448,448],[1788,1470,298,294,75,76,448,448],[0,1764,298,294,75,76,448,448],[298,1764,298,294,75,76,448,448],[299,588,299,294,75,76,448,448],[598,588,299,294,75,76,448,448],[1196,588,299,294,75,76,448,448],[1495,588,299,294,75,76,448,448],[1794,588,299,294,75,76,448,448],[0,882,299,294,75,76,448,448],[596,1764,298,294,75,76,448,448],[894,1764,298,294,75,76,448,448],[1192,1764,298,294,75,76,448,448],[1490,1764,298,294,75,76,448,448],[1788,1764,298,294,75,76,448,448]];
  const STORM_SIZE = [3940, 3589], SAFE_SIZE = [2099, 2058];
  const finite = Number.isFinite;
  const cycle = value => ((value % 1) + 1) % 1;
  const ready = (image, size) => Boolean(image?.complete &&
    image.naturalWidth === size[0] && image.naturalHeight === size[1]);
  function hitZone(effect, zones, now) {
    let best = null, distance = Infinity;
    for (const zone of zones) {
      if (!zone || zone.ownerId !== effect.playerId ||
          now >= Number(zone.barrierUntil || Number(zone.endsAt) - 1000) ||
          Number(effect.at) < Number(zone.startedAt) ||
          Number(effect.at) >= Number(zone.barrierUntil || Number(zone.endsAt) - 1000)) continue;
      const x = finite(Number(zone.safeX)) ? Number(zone.safeX) : Number(zone.x);
      const y = finite(Number(zone.safeY)) ? Number(zone.safeY) : Number(zone.y);
      const d = Math.hypot(Number(effect.x) - x, Number(effect.y) - y);
      if (d > Number(zone.barrierRadius || 140)) continue;
      if (d < distance || d === distance && Number(zone.startedAt) > Number(best?.startedAt || 0)) {
        best = zone; distance = d;
      }
    }
    return best;
  }
  function cellSprite(image, sourceSize, cell, x, y, width, height, transform, alpha, mode) {
    const [sx, sy, sw, sh, offsetX, offsetY, wholeW, wholeH] = cell;
    return { image, sourceSize, crop: [sx, sy, sw, sh],
      x: x + offsetX * width / wholeW, y: y + offsetY * height / wholeH,
      w: sw * width / wholeW, h: sh * height / wholeH,
      transform, color: [1, 1, 1, alpha], mode };
  }
  function plan({ scene, camera, zoom, viewport } = {}) {
    if (!scene || !camera || !viewport ||
        ![scene.now, camera.x, camera.y, zoom, viewport.width, viewport.height].every(finite) ||
        zoom <= 0 || viewport.width <= 0 || viewport.height <= 0) {
      throw new TypeError('Gravity zones require estimated server time, camera, zoom, and logical viewport');
    }
    const textures = scene.textures || {}, reduced = Boolean(scene.reducedMotion);
    const storm = ready(textures.gravityLocalMaterialV834, STORM_SIZE)
      ? textures.gravityLocalMaterialV834 : null;
    const safe = ready(textures.gravitySafeEyePressure, SAFE_SIZE)
      ? textures.gravitySafeEyePressure : null;
    const transform = [zoom, 0, 0, zoom, -camera.x * zoom, -camera.y * zoom];
    const right = camera.x + viewport.width / zoom, bottom = camera.y + viewport.height / zoom;
    const visible = (x, y, margin) => x >= camera.x - margin && x <= right + margin &&
      y >= camera.y - margin && y <= bottom + margin;
    const sprites = [], labels = [];
    const zones = Array.isArray(scene.gravityZones) ? scene.gravityZones : [];
    for (const zone of zones) {
      if (!zone || !finite(Number(zone.x)) || !finite(Number(zone.y))) continue;
      const x = Number(zone.x), y = Number(zone.y);
      const radius = Math.max(0, Number(zone.radius || 220));
      if (!finite(radius) || radius <= 0) continue;
      const end = Number(zone.endsAt), barrierUntil = Number(zone.barrierUntil || end - 1000);
      if (!finite(end) || !finite(barrierUntil)) continue;
      const stormVisible = visible(x, y, radius + 100);
      if (stormVisible) {
        if (storm) {
          const elapsed = Math.max(0, scene.now - (finite(Number(zone.startedAt)) ? Number(zone.startedAt) : scene.now));
          const phase = reduced ? 0 : cycle(elapsed / 3200) * 32;
          const first = Math.floor(phase), mix = reduced ? 0 : phase - first;
          for (const [index, weight] of [[first, 1 - mix], [(first + 1) % 32, mix]]) {
            if (weight <= 0) continue;
            sprites.push({ part: 'storm-flow', zoneId: zone.id,
              sprite: cellSprite(storm, STORM_SIZE, STORM_CELLS[index],
                x - radius, y - radius, radius * 2, radius * 2, transform, .72 * weight, 'additive') });
          }
          const base = reduced ? 0 : cycle(elapsed / 3200);
          for (let i = 0; i < 3; i += 1) {
            const t = reduced ? .34 + i * .08 : cycle(base + i * .31);
            const angle = i * 2.094 + .40, inward = t;
            const rockX = Math.cos(angle) * radius * (.81 - inward * .57);
            const rockY = Math.sin(angle) * radius * (.81 - inward * .57) + radius * .12 * inward * inward;
            const bank = reduced ? (i - 1) * .12 : (i % 2 ? -1 : 1) * Math.sin(t * Math.PI) * .35;
            const fade = reduced ? 1 : Math.max(0, Math.min(1, t / .12, (1 - t) / .17));
            const size = radius * (.15 + i * .025) * (1 - inward * .18);
            const rock = cellSprite(storm, STORM_SIZE, STORM_CELLS[128 + i],
              -size / 2, -size / 2, size,
              size * (1 - .18 * inward), transform, .94 * fade, 'source-over');
            // Canvas translates and rotates before cropping the packed rock.
            const c = Math.cos(bank), s = Math.sin(bank);
            rock.transform = [zoom * c, zoom * s, -zoom * s, zoom * c,
              (x + rockX - camera.x) * zoom, (y + rockY - camera.y) * zoom];
            sprites.push({ part: `storm-rock-${i}`, zoneId: zone.id, sprite: rock });
          }
        }
        labels.push({ zoneId: zone.id, x: (x - camera.x) * zoom,
          y: (y + radius + 20 - camera.y) * zoom, size: 11 * zoom,
          text: `${scene.now < barrierUntil ? '全域吸引' : '最終1秒・バリアなし'} ${Math.ceil(Math.max(0, end - scene.now) / 1000)}秒` });
      }
      if (safe && scene.now < barrierUntil) {
        const safeRadius = Math.max(0, Number(zone.barrierRadius || 140));
        const safeX = finite(Number(zone.safeX)) ? Number(zone.safeX) : x;
        const safeY = finite(Number(zone.safeY)) ? Number(zone.safeY) : y;
        if (!finite(safeRadius) || safeRadius <= 0 ||
            !visible(safeX, safeY, Math.max(safeRadius + 70, safeRadius * 1254 / 714))) continue;
        let cell = 32;
        if (!reduced) {
          const age = Math.max(0, scene.now - (Number(zone.startedAt) || scene.now));
          cell = Math.floor(cycle(age / 2400) * 32);
          let latest = null;
          for (const effect of Array.isArray(scene.magicEffects) ? scene.magicEffects : []) {
            if (effect?.type !== 'gravity-storm-barrier-hit' || effect.variant !== 'caster-barrier' ||
                effect.playerId !== zone.ownerId || !effect.playerId ||
                !finite(Number(effect.x)) || !finite(Number(effect.y)) ||
                hitZone(effect, zones, scene.now)?.id !== zone.id) continue;
            const elapsed = scene.frameNow - Number(effect.startedAt);
            if (!finite(elapsed) || elapsed < 0 || elapsed >= Number(effect.duration || 1200)) continue;
            if (!latest || Number(effect.startedAt) > Number(latest.startedAt)) latest = effect;
          }
          if (latest) cell = 33 + Math.min(15, Math.floor((scene.frameNow - Number(latest.startedAt)) /
            Number(latest.duration || 1200) * 16));
        }
        const size = safeRadius * 1254 / 357;
        sprites.push({ part: 'safe-eye', zoneId: zone.id,
          sprite: cellSprite(safe, SAFE_SIZE, SAFE_CELLS[cell],
            safeX - size / 2, safeY - size / 2, size, size, transform, .82, 'screen') });
      }
    }
    return Object.freeze({ sprites: Object.freeze(sprites), labels: Object.freeze(labels) });
  }
  function create({ device, textAtlas } = {}) {
    if (!device?.createTexture || !device?.queue?.copyExternalImageToTexture ||
        typeof textAtlas?.layout !== 'function' || typeof textAtlas?.ensure !== 'function' ||
        !Array.isArray(textAtlas.textures)) throw new TypeError('Shared WebGPU device and text atlas required');
    const cache = new Map(), owned = new Set();
    let destroyed = false;
    function textureFor(sprite) {
      const existing = cache.get(sprite.image);
      if (existing) return existing;
      const texture = device.createTexture({ label: 'DVA gravity packed material',
        size: sprite.sourceSize, format: 'rgba8unorm', usage: 0x02 | 0x04 | 0x10 });
      try { device.queue.copyExternalImageToTexture({ source: sprite.image },
        { texture, premultipliedAlpha: true }, sprite.sourceSize); }
      catch (error) { texture.destroy(); throw error; }
      cache.set(sprite.image, texture); owned.add(texture);
      return texture;
    }
    async function prepare(input) {
      if (destroyed) throw new Error('Gravity-zone pass destroyed');
      const result = plan(input);
      if (result.labels.length) await textAtlas.ensure(result.labels.map(label => label.text).join('\n'));
      if (destroyed) throw new Error('Gravity-zone pass destroyed');
      return result;
    }
    function record({ frame, target, viewport, preparedPlan } = {}) {
      if (destroyed) throw new Error('Gravity-zone pass destroyed');
      if (!preparedPlan || !Array.isArray(preparedPlan.sprites) || !Array.isArray(preparedPlan.labels))
        throw new TypeError('Call prepare before recording gravity zones');
      if (!preparedPlan.sprites.length && !preparedPlan.labels.length) return 0;
      if (typeof frame?.stage !== 'function' || typeof frame.sprite !== 'function' ||
          typeof target !== 'string' || !target || !viewport ||
          ![viewport.width, viewport.height].every(value => finite(value) && value > 0) ||
          ![viewport.pixelWidth, viewport.pixelHeight].every(value => Number.isInteger(value) && value > 0))
        throw new TypeError('Shared frame, target, and committed viewport required');
      const layouts = preparedPlan.labels.map(label => {
        const layout = textAtlas.layout(label.text, { size: label.size, missing: 'error' });
        if (!layout || !Array.isArray(layout.quads) || !finite(layout.width)) throw new Error('Invalid gravity text layout');
        for (const glyph of layout.quads) if (!textAtlas.textures[glyph.page])
          throw new Error(`Gravity text atlas page ${glyph.page} unavailable; call prepare first`);
        return layout;
      });
      const gpuTextures = preparedPlan.sprites.map(item => textureFor(item.sprite));
      frame.stage('world:gravity-zones');
      preparedPlan.sprites.forEach((item, index) => {
        const { image, ...sprite } = item.sprite;
        const command = { ...sprite, texture: gpuTextures[index] };
        frame.sprite(target, command);
      });
      preparedPlan.labels.forEach((label, index) => {
        const layout = layouts[index];
        const top = layout.quads.length ? Math.min(...layout.quads.map(g => g.y)) : 0;
        const bottom = layout.quads.length ? Math.max(...layout.quads.map(g => g.y + g.h)) : layout.height;
        const left = label.x - layout.width / 2, shiftY = label.y - bottom;
        for (const glyph of layout.quads) frame.sprite(target, {
          x: left + glyph.x, y: shiftY + glyph.y, w: glyph.w, h: glyph.h,
          uv: glyph.uv, texture: textAtlas.textures[glyph.page],
          color: [245 / 255, 243 / 255, 1, 1], mode: 'source-over' });
      });
      return preparedPlan.sprites.length + preparedPlan.labels.length;
    }
    return Object.freeze({ plan, prepare, record, destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const texture of owned) texture.destroy();
      cache.clear(); owned.clear();
    } });
  }
  const api = Object.freeze({ plan, create });
  root.DvaWebGPUGravityZones = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
