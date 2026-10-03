/* Persistent hazard material for the shared, ordered WebGPU world frame.
 * World coordinates remain logical; the presentation target owns physical DPR.
 * This pass owns only GPU copies of the already loaded transport atlases. */
(function (root) {
  'use strict';
  const sizes = Object.freeze({ fire: [2304, 2304], water: [3072, 1536], poison: [2304, 2048] });
  const keys = Object.freeze({ fire: 'fireMaterialTransport', water: 'waterMaterialTransport',
    poison: 'poisonMaterialTransport' });
  const poisonPoolPhases = 32;
  const poisonBubblePhases = 32;
  const finite = Number.isFinite;
  const ready = (image, kind) => Boolean(image?.complete &&
    image.naturalWidth === sizes[kind][0] && image.naturalHeight === sizes[kind][1]);
  const cycle = value => ((value % 1) + 1) % 1;

  function activePoisonField(field, serverNow) {
    return field?.kind === 'poison' && typeof field.id === 'string' && !!field.id &&
      typeof field.sourceId === 'string' && !!field.sourceId &&
      [field.x, field.y, field.radius, field.strength, field.createdAt, field.endsAt]
        .every(finite) && field.radius > 0 && field.strength >= .25 &&
      field.createdAt <= serverNow && serverNow < field.endsAt;
  }

  // The magic receipt names its authoritative field. A later field from the
  // same source cannot inherit an earlier receipt, even at the same center.
  function claimPoisonEffect({ effect, scene, camera, zoom, viewport } = {}) {
    if (effect?.type !== 'hazard-poison' || !scene || !Array.isArray(scene.hazardFields) ||
        !finite(scene.serverNow) || !camera || !viewport ||
        ![camera.x, camera.y, zoom, viewport.width, viewport.height].every(finite) ||
        zoom <= 0 || viewport.width <= 0 || viewport.height <= 0 ||
        !String(effect.id || '') || !String(effect.playerId || '') ||
        typeof effect.hazardFieldId !== 'string' || !effect.hazardFieldId ||
        ![effect.x, effect.y, effect.radius, effect.at, effect.startedAt, effect.duration,
          effect.hazardFieldCreatedAt, effect.hazardFieldEndsAt]
          .every(finite) || effect.radius <= 0 || effect.duration <= 0 ||
        effect.hazardFieldCreatedAt >= effect.hazardFieldEndsAt ||
        effect.at < effect.hazardFieldCreatedAt ||
        effect.at >= effect.hazardFieldEndsAt ||
        effect.at - effect.hazardFieldCreatedAt > 1000 ||
        !finite(Number(effect.variant)) || Number(effect.variant) < .25)
      return null;
    const fields = scene.hazardFields.filter(field => field?.id === effect.hazardFieldId);
    if (fields.length > 1) return null;
    const field = fields[0];
    if (!field) {
      // Expiry follows the receipt's server-authored end time. Capacity
      // eviction needs a separate server-authored retirement receipt.
      if (scene.serverNow >= effect.hazardFieldEndsAt)
        return Object.freeze({ fieldId: effect.hazardFieldId,
          omittedReason: 'authoritative-poison-field-expired' });
      const retired = Array.isArray(scene.hazardFieldRetirements) &&
        scene.hazardFieldRetirements.some(entry => entry?.id === effect.hazardFieldId &&
          entry.reason === 'evicted' && finite(entry.retiredAt) &&
          entry.retiredAt >= effect.hazardFieldCreatedAt && entry.retiredAt <= scene.serverNow);
      return retired ? Object.freeze({ fieldId: effect.hazardFieldId,
        omittedReason: 'authoritative-poison-field-evicted' }) : null;
    }
    if (field.kind !== 'poison' || field.sourceId !== String(effect.playerId) ||
        field.x !== effect.x || field.y !== effect.y || field.radius !== effect.radius ||
        field.strength !== Number(effect.variant) ||
        field.createdAt !== effect.hazardFieldCreatedAt ||
        field.endsAt !== effect.hazardFieldEndsAt) return null;
    if (scene.serverNow >= field.endsAt)
      return Object.freeze({ fieldId: field.id,
        omittedReason: 'authoritative-poison-field-expired' });
    if (!activePoisonField(field, scene.serverNow)) return null;
    const width = field.radius * 2.25 * zoom;
    const height = width * 256 / 384;
    const x = (field.x - camera.x) * zoom, y = (field.y - camera.y) * zoom;
    return Object.freeze({ fieldId: field.id, visible: x + width / 2 > 0 &&
      x - width / 2 < viewport.width && y + height / 2 > 0 &&
      y - height / 2 < viewport.height });
  }

  function plan({ scene, camera, zoom, viewport } = {}) {
    if (!scene || !camera || !viewport ||
        ![camera.x, camera.y, zoom, viewport.width, viewport.height, scene.now].every(finite) ||
        zoom <= 0 || viewport.width <= 0 || viewport.height <= 0) {
      throw new TypeError('Hazard fields require a timed scene, camera, zoom, and logical viewport');
    }
    const fields = Array.isArray(scene.hazardFields) ? scene.hazardFields : [];
    const serverNow = scene.serverNow;
    const textures = scene.textures || {};
    const reduced = Boolean(scene.reducedMotion);
    const time = scene.now / 1000;
    const transform = [zoom, 0, 0, zoom, -camera.x * zoom, -camera.y * zoom];
    const commands = [];
    const poisonIds = new Set();
    for (const field of fields) {
      const kind = String(field?.kind || '');
      if (kind === 'poison') {
        if (!finite(serverNow)) throw new TypeError('Poison fields need the authoritative server clock');
        if (!activePoisonField(field, serverNow)) {
          if (finite(field?.endsAt) && field.endsAt <= serverNow) continue;
          throw new TypeError('Poison field needs authoritative ID, source, extent and lifetime');
        }
        if (poisonIds.has(field.id)) throw new TypeError('Duplicate poison field ID');
        poisonIds.add(field.id);
      }
      // The old fallback sits behind three unconditional transport branches.
      // It has no authored atlas or defined behavior for other kinds.
      if (!sizes[kind]) continue;
      if (kind === 'poison' && !ready(textures[keys[kind]], kind))
        throw new Error('Active poison field transport unavailable');
      if (!ready(textures[keys[kind]], kind)) continue;
      const x = Number(field.x), y = Number(field.y);
      if (!finite(x) || !finite(y)) continue;
      const radius = Math.max(24, Number(field.radius) || 80);
      const image = textures[keys[kind]];
      const sourceSize = sizes[kind];
      const push = (part, crop, px, py, w, h, weight, mode) => {
        if (weight <= 0) return;
        commands.push(Object.freeze({ kind, fieldId: String(field.id || ''), part, image,
          sprite: Object.freeze({ x: px, y: py, w, h, crop, sourceSize, transform,
            color: [1, 1, 1, .72 * weight], mode }) }));
      };
      if (kind === 'fire') {
        const size = radius * 2.25;
        const phase = reduced ? 8 : cycle(time * .72 + x * .001) * 32;
        const first = Math.floor(phase), blend = phase - first;
        const fire = (index, weight, part) => push(part,
          [(index % 6) * 384, Math.floor(index / 6) * 384, 384, 384],
          x - size / 2, y - size / 2, size, size, weight, 'additive');
        fire(0, 1, 'root');
        fire(first + 1, (1 - blend) * .9, 'phase-a');
        if (blend > 0) fire((first + 1) % 32 + 1, blend * .9, 'phase-b');
      } else if (kind === 'water') {
        const width = radius * 2.25, height = width * 256 / 384;
        const phase = reduced ? 8 : cycle(time * .48 + x * .001) * 32;
        const first = Math.floor(phase), blend = phase - first;
        const water = (index, weight, part) => push(part,
          [(index % 8) * 384, Math.floor(index / 8) * 256, 384, 256],
          x - width / 2, y - height / 2, width, height, weight, 'source-over');
        water(1, 1, 'settled');
        water(14 + first, (1 - blend) * .65, 'phase-a');
        if (blend > 0) water(14 + (first + 1) % 32, blend * .65, 'phase-b');
      } else {
        const width = radius * 2.25, height = width * 256 / 384;
        const phase = reduced ? .32 : cycle(time * .23 + x * .001);
        const pool = (index, weight, part) => push(part,
          [(index % 6) * 384, Math.floor(index / 6) * 256, 384, 256],
          x - width / 2, y - height / 2, width, height, weight, 'source-over');
        pool(0, 1, 'pool');
        const q = phase * poisonPoolPhases, first = Math.floor(q), blend = q - first;
        pool(first + 1, (1 - blend) * .75, 'phase-a');
        if (blend > 0) pool((first + 1) % poisonPoolPhases + 1, blend * .75, 'phase-b');
        for (let index = 0; index < 3; index += 1) {
          const bubbleCycle = reduced ? .38 : cycle(time * .37 + index * .333);
          if (Math.sin(Math.PI * bubbleCycle) <= .001) continue;
          const frame = bubbleCycle * (poisonBubblePhases - 1);
          const firstBubble = Math.floor(frame), bubbleBlend = frame - firstBubble;
          const size = width * (index === 1 ? .145 : .115);
          const lift = reduced ? 0 : Math.max(0, (bubbleCycle - .3) / .7) * width * .17;
          const bx = x + [-.25, .06, .29][index] * width;
          const by = y + [.035, -.035, .065][index] * width - lift;
          const bubble = (cell, weight, part) => push(part,
            [(cell % 8) * 128, 1536 + Math.floor(cell / 8) * 128, 128, 128],
            bx - size / 2, by - size / 2, size, size, weight, 'source-over');
          bubble(firstBubble, 1 - bubbleBlend, `bubble-${index}-a`);
          if (bubbleBlend > 0) bubble(Math.min(firstBubble + 1, poisonBubblePhases - 1),
            bubbleBlend, `bubble-${index}-b`);
        }
      }
    }
    return Object.freeze(commands);
  }

  function create({ device } = {}) {
    if (!device?.createTexture || !device?.queue?.copyExternalImageToTexture) {
      throw new TypeError('Shared WebGPU device and queue required');
    }
    const cache = new Map(), owned = new Set();
    let destroyed = false;
    function textureFor(command) {
      if (destroyed) throw new Error('Hazard-field pass destroyed');
      const { image, kind } = command;
      const previous = cache.get(image);
      if (previous) return previous;
      const size = sizes[kind];
      const texture = device.createTexture({ label: `DVA ${kind} hazard transport`,
        size, format: 'rgba8unorm', usage: 0x02 | 0x04 | 0x10 });
      try { device.queue.copyExternalImageToTexture({ source: image },
        { texture, premultipliedAlpha: true }, size); }
      catch (error) { texture.destroy(); throw error; }
      cache.set(image, texture);
      owned.add(texture);
      return texture;
    }
    function record({ frame, target, viewport, scene, camera, zoom } = {}) {
      if (destroyed) throw new Error('Hazard-field pass destroyed');
      const commands = plan({ scene, camera, zoom, viewport });
      if (!commands.length) return 0;
      if (typeof frame?.stage !== 'function' || typeof frame.sprite !== 'function' ||
          typeof target !== 'string' || !target ||
          ![viewport.pixelWidth, viewport.pixelHeight].every(value => Number.isInteger(value) && value > 0)) {
        throw new TypeError('Shared frame, target, and committed viewport required');
      }
      // Resolve uploads before recording any commands in the shared frame.
      const textures = commands.map(textureFor);
      frame.stage('world:hazard-fields');
      commands.forEach((command, index) => frame.sprite(target,
        { ...command.sprite, texture: textures[index] }));
      return commands.length;
    }
    return Object.freeze({ plan, record, destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const texture of owned) texture.destroy();
      cache.clear(); owned.clear();
    } });
  }
  const api = Object.freeze({ plan, create, ready, claimPoisonEffect });
  root.DvaWebGPUHazardFields = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
