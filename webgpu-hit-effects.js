/* World-space impact fragments on the shared WebGPU frame. The caller owns
 * expiry, frame submission, the shape renderer, and returned batch cleanup. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const finite = Number.isFinite;
  const clamp = value => Math.max(0, Math.min(1, value));

  function hsl(hue, saturation, lightness) {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const sector = ((hue % 360) + 360) % 360 / 60;
    const secondary = chroma * (1 - Math.abs(sector % 2 - 1));
    const parts = sector < 1 ? [chroma, secondary, 0] :
      sector < 2 ? [secondary, chroma, 0] :
      sector < 3 ? [0, chroma, secondary] :
      sector < 4 ? [0, secondary, chroma] :
      sector < 5 ? [secondary, 0, chroma] : [chroma, 0, secondary];
    const offset = lightness - chroma / 2;
    return parts.map(component => component + offset).concat(1);
  }

  function seedFor(id) {
    let seed = 17;
    for (const character of String(id)) seed = ((seed * 31) + character.charCodeAt(0)) >>> 0;
    return seed;
  }

  function plan({ scene, camera, zoom, viewport, visibility } = {}) {
    if (!scene || !Array.isArray(scene.effects) || !finite(scene.now) ||
        !camera || ![camera.x, camera.y, zoom].every(finite) || zoom <= 0 ||
        !viewport || ![viewport.width, viewport.height].every(value => finite(value) && value > 0)) {
      throw new TypeError('Hit effects require a scene, camera, zoom and logical viewport');
    }
    // Live shape registry uses the default 4096-command limit. A hit emits
    // exactly 77 commands; do not let culling mask an exceptional overflow.
    const canCull = visibility?.allowCull === true && scene.effects.length <= 53 &&
      viewport.kind === 'main' && scene.now >= 0 && scene.now <= 86400000 &&
      zoom >= 0.5 && zoom <= 2 &&
      [viewport.width, viewport.height, viewport.pixelWidth, viewport.pixelHeight]
        .every(value => Number.isInteger(value) && value >= 1 && value <= 32768) &&
      Math.abs(camera.x) <= 32768 && Math.abs(camera.y) <= 32768;
    const commands = [];
    for (const effect of scene.effects) {
      if (!effect || ![effect.x, effect.y, effect.startedAt, effect.duration].every(finite) ||
          effect.duration <= 0 || scene.now - effect.startedAt >= effect.duration) continue;
      const progress = clamp((scene.now - effect.startedAt) / effect.duration);
      // Conservative support of every authored hit quad: travel <= 104.7,
      // falling drift <= 34, glow radius <= 21.425 world units; rotated
      // cores/spokes and the outer flash ring are smaller. The shared shader
      // adds 2 logical units (up to 2*sqrt(2) rotated); keep extra f32 margin.
      if (canCull && typeof effect.id === 'string' &&
          Math.abs(effect.x) <= 32768 && Math.abs(effect.y) <= 32768) {
        const x = (effect.x - camera.x) * zoom;
        const y = (effect.y - camera.y) * zoom;
        const extent = 162 * zoom + 6;
        if (x + extent < 0 || y + extent < 0 ||
            x - extent > viewport.width || y - extent > viewport.height) {
          visibility.culled = true;
          continue;
        }
      }
      const seed = seedFor(effect.id);
      for (let index = 0; index < 22; index += 1) {
        const angle = ((seed % 360) + index * 137.5) * Math.PI / 180;
        const speed = 38 + ((seed >> (index % 12)) & 31) + index * 1.7;
        const travel = speed * Math.sin(progress * Math.PI * .62);
        const x = (effect.x + Math.cos(angle) * travel - camera.x) * zoom;
        const y = (effect.y + Math.sin(angle) * travel + progress * progress * 34 - camera.y) * zoom;
        const alpha = (1 - progress) * (index % 3 === 0 ? .95 : .72);
        const hue = (seed + index * 43 + scene.now / 7) % 360;
        const radius = Math.max(1.2, (effect.lethal ? 6.5 : 5) *
          (1 - progress * .65) * (.7 + (index % 4) * .1)) * zoom;
        const core = hsl(hue, .96, .62);
        const halo = hsl(hue, 1, .72);
        commands.push({ kind: 'glow', x, y, radius: radius * 1.45 + 12 * zoom,
          color: halo, alpha: alpha * .32, mode: 'additive' });
        commands.push({ kind: 'ellipse', x, y, rx: radius * 1.45, ry: radius,
          rotation: angle, color: core, alpha, mode: 'additive' });
        if (index % 3 === 0) {
          const sparkRadius = radius * 2.4;
          const sparkAngle = angle + scene.now / 420;
          const sparkColor = hsl(hue + 35, 1, .78);
          // Four crossing tapered strokes retain the eight-point silhouette.
          for (let spoke = 0; spoke < 4; spoke += 1) {
            commands.push({ kind: 'ellipse', x, y, rx: sparkRadius,
              ry: Math.max(.45 * zoom, sparkRadius * .11),
              rotation: sparkAngle + spoke * Math.PI / 4,
              color: sparkColor, alpha, mode: 'additive' });
          }
        }
      }
      commands.push({ kind: 'arc', x: (effect.x - camera.x) * zoom,
        y: (effect.y - camera.y) * zoom,
        radius: (16 + progress * (effect.lethal ? 76 : 52)) * zoom,
        lineWidth: 3 * zoom, start: 0, sweep: TAU,
        color: hsl((seed + scene.now / 5) % 360, 1, .72),
        alpha: 1 - progress, mode: 'additive' });
    }
    return commands;
  }

  function record({ shapes, frame, target, viewport, scene, camera, zoom } = {}) {
    if (typeof shapes?.enqueue !== 'function' || typeof frame?.stage !== 'function' ||
        typeof frame?.add !== 'function' || typeof target !== 'string' || !target ||
        !Number.isInteger(viewport?.pixelWidth) || viewport.pixelWidth < 1 ||
        !Number.isInteger(viewport?.pixelHeight) || viewport.pixelHeight < 1) {
      throw new TypeError('Hit effects require a shared GPU frame and committed target');
    }
    const visibility = { allowCull: target === 'main', culled: false };
    const commands = plan({ scene, camera, zoom, viewport, visibility });
    if (!commands.length && !visibility.culled) return null;
    // Keep the same shared primitive flush boundary even when all hits clip.
    frame.stage('world:hit-effects');
    if (!commands.length) return null;
    return shapes.enqueue(frame, { target, width: viewport.width,
      height: viewport.height, pixelWidth: viewport.pixelWidth,
      pixelHeight: viewport.pixelHeight, label: 'world:hit-effects', commands });
  }

  const api = Object.freeze({ plan, record });
  root.DvaWebGPUHitEffects = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
