/* Mystery-box material sprites for the shared ordered WebGPU world frame.
 * The caller supplies the scene, camera, image, frame, target, and shared device.
 * Coordinates are world units until the shared renderer's logical viewport.
 * Closed boxes use the current proximity alpha and 140-unit point cull. A reveal
 * scene entry may supply opening, emission, alpha, and cull:false; its timing and
 * any surrounding effects remain the caller's responsibility. */
(function (root) {
  'use strict';
  const finite = Number.isFinite;
  const SCALE = 112 / 892;
  const ATLAS_SIZE = [1548, 516];
  const SOURCE_SIZE = Object.freeze([1548, 516]);
  const SIZE = 1254 * SCALE;
  const X_OFFSET = -594 * SCALE;
  const Y_OFFSET = 45 - 1199 * SCALE;
  const clamp = value => Math.min(1, Math.max(0, value));
  const ready = image => Boolean(image?.complete && image.naturalWidth === ATLAS_SIZE[0] &&
    image.naturalHeight === ATLAS_SIZE[1]);
  const multiply = (a, b) => [
    a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]
  ];
  function lidTransform(x, y, opening) {
    const pivotX = x + 6 * SCALE, pivotY = y + 45 - 549 * SCALE;
    const angle = -.035 * opening, cosine = Math.cos(angle), sine = Math.sin(angle);
    return [cosine, sine, -sine, cosine,
      pivotX + 3 * opening - cosine * pivotX + sine * pivotY,
      pivotY - 36 * opening - sine * pivotX - cosine * pivotY];
  }
  const validView = (camera, zoom, viewport) => Boolean(camera && viewport &&
    [camera.x, camera.y, zoom, viewport.width, viewport.height].every(finite) &&
    zoom > 0 && viewport.width > 0 && viewport.height > 0);
  function boxInView(box, camera, zoom, viewport) {
    if (!box || ![box.x, box.y].every(finite)) return false;
    const right = camera.x + viewport.width / zoom;
    const bottom = camera.y + viewport.height / zoom;
    return !(box.cull !== false && (box.x < camera.x - 140 || box.x > right + 140 ||
      box.y < camera.y - 140 || box.y > bottom + 140));
  }
  function requiresMaterial({ scene, camera, zoom, viewport } = {}) {
    if (!Array.isArray(scene)) return true;
    if (!scene.length) return false;
    if (!validView(camera, zoom, viewport) ||
        !finite(camera.x + viewport.width / zoom) ||
        !finite(camera.y + viewport.height / zoom)) return true;
    // A wholly offscreen set cannot draw. If placement is uncertain,
    // keep the required material gate until valid data arrives.
    return scene.some(box => !box || ![box.x, box.y].every(finite) ||
      boxInView(box, camera, zoom, viewport));
  }
  function plan({ scene, self = null, camera, zoom, viewport, image } = {}) {
    if (!Array.isArray(scene) || !validView(camera, zoom, viewport)) {
      throw new TypeError('Mystery boxes require scene, world camera, zoom, and logical viewport');
    }
    if (!scene.length || !ready(image)) return Object.freeze([]);
    const world = [zoom, 0, 0, zoom, -camera.x * zoom, -camera.y * zoom];
    const commands = [];
    for (const box of scene) {
      if (!boxInView(box, camera, zoom, viewport)) continue;
      const { x, y } = box;
      const near = self && finite(self.x) && finite(self.y) &&
        Math.hypot(self.x - x, self.y - y) <= Number(box.useRange || 82);
      const alpha = box.alpha === undefined ? (near ? 1 : .84) : box.alpha;
      const opening = box.opening ?? 0, emission = box.emission ?? 0;
      if (![alpha, opening, emission].every(finite) || alpha < 0 || alpha > 1 ||
          opening < 0 || opening > 1 || emission < 0 || emission > 1) {
        throw new RangeError('Mystery-box alpha, opening, and emission must be in 0..1');
      }
      const base = { x: x + X_OFFSET, y: y + Y_OFFSET, w: SIZE, h: SIZE,
        sourceSize: SOURCE_SIZE, transform: world };
      const push = (part, cell, opacity, mode, transform = world) => commands.push(Object.freeze({
        stage: 'world:mystery-boxes', part, boxId: box.id, image,
        sprite: Object.freeze({ ...base, crop: [cell * 516 + 2, 2, 512, 512],
          transform, color: [1, 1, 1, clamp(opacity)], mode })
      }));
      push('body', 0, alpha, 'source-over');
      if (emission > 0) push('emission', 2, alpha * emission, 'additive');
      push('lid', 1, alpha, 'source-over', opening > 0 ?
        multiply(world, lidTransform(x, y, opening)) : world);
    }
    return Object.freeze(commands);
  }
  function create({ device } = {}) {
    if (!device?.createTexture || !device?.queue?.copyExternalImageToTexture) {
      throw new TypeError('Shared WebGPU device and queue required');
    }
    const images = new Map(), owned = new Set();
    let destroyed = false;
    function textureFor(image) {
      if (destroyed) throw new Error('Mystery-box pass destroyed');
      if (!ready(image)) throw new TypeError('Mystery-box atlas unavailable');
      let texture = images.get(image);
      if (texture) return texture;
      texture = device.createTexture({ label: 'DVA mystery-box material atlas',
        size: ATLAS_SIZE, format: 'rgba8unorm', usage: 0x02 | 0x04 | 0x10 });
      try { device.queue.copyExternalImageToTexture({ source: image },
        { texture, premultipliedAlpha: true }, ATLAS_SIZE); }
      catch (error) { texture.destroy(); throw error; }
      images.set(image, texture);
      owned.add(texture);
      return texture;
    }
    function record({ frame, target, scene, self, camera, zoom, viewport, image, atlasPlaceholder = false } = {}) {
      if (destroyed) throw new Error('Mystery-box pass destroyed');
      const commands = plan({ scene, self, camera, zoom, viewport, image });
      if (!commands.length) {
        if (atlasPlaceholder !== true || image?.complete !== false) return 0;
        const markers = scene.filter(box => boxInView(box, camera, zoom, viewport) &&
          box.type === 'mysteryBox' && box.kind === 'mystery-box' &&
          typeof box.id === 'string' && /^mystery_box_.+/.test(box.id) &&
          box.interactive === true && box.alpha === undefined &&
          box.opening === undefined && box.emission === undefined && box.cull === undefined);
        if (!markers.length) return 0;
        if (typeof frame?.stage !== 'function' || typeof frame?.rect !== 'function' ||
            typeof target !== 'string' || !target ||
            ![viewport.pixelWidth, viewport.pixelHeight].every(value => finite(value) && value > 0)) {
          throw new TypeError('Shared frame, target, and committed viewport required');
        }
        frame.stage('world:mystery-boxes');
        for (const box of markers) {
          const x = (box.x - camera.x) * zoom, y = (box.y - camera.y) * zoom;
          const k = Math.max(0.8, Math.min(1.5, zoom));
          const rect = (dx, dy, w, h, color) => frame.rect(target, {
            x: x + dx * k, y: y + dy * k, w: w * k, h: h * k, color
          });
          rect(-13, -10, 26, 20, [.1, .05, .18, .94]);
          rect(-10, -5, 20, 12, [.52, .30, .75, .92]);
          rect(-11, -7, 22, 4, [.83, .66, .96, 1]);
          rect(-1.5, -7, 3, 14, [1, .82, .45, 1]);
        }
        return markers.length;
      }
      if (typeof frame?.stage !== 'function' || typeof frame.sprite !== 'function' ||
          typeof target !== 'string' || !target ||
          ![viewport.pixelWidth, viewport.pixelHeight].every(value => finite(value) && value > 0)) {
        throw new TypeError('Shared frame, target, and committed viewport required');
      }
      const texture = textureFor(image);
      frame.stage('world:mystery-boxes');
      for (const command of commands) frame.sprite(target, { ...command.sprite, texture });
      return commands.length;
    }
    return Object.freeze({ plan, record, destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const texture of owned) texture.destroy();
      owned.clear(); images.clear();
    } });
  }
  const api = Object.freeze({ plan, create, ready, requiresMaterial });
  root.DvaWebGPUMysteryBoxes = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
