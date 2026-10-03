/* Textureless preparation arrival E, recorded in the shared ordered WebGPU
 * world frame immediately before players. The caller owns roster positions,
 * sprite readiness and the preparation clock. */
(function (root) {
  'use strict';
  const finite = Number.isFinite;
  const clamp = value => Math.max(0, Math.min(1, value));
  const ink = (r, g, b, a) => [r / 255, g / 255, b / 255, a];
  function validate({ scene, camera, zoom, viewport }) {
    if (!scene || !Array.isArray(scene.players) || !(scene.entries instanceof Map) ||
      !camera || !viewport || ![scene.nowMs, camera.x, camera.y, zoom,
        viewport.width, viewport.height].every(finite) || zoom <= 0 ||
      viewport.width <= 0 || viewport.height <= 0)
      throw new TypeError('Preparation summons need a live roster, clock, camera, zoom, and logical viewport');
  }
  function plan(input = {}) {
    validate(input);
    const { scene, camera, zoom } = input;
    const entries = scene.entries;
    if (!scene.active) { entries.clear(); return []; }
    const roster = scene.players.filter(player => player && !player.isBot && !player.ejected);
    const ids = new Set(roster.map(player => String(player.id || '')));
    for (const id of entries.keys()) if (!ids.has(id)) entries.delete(id);
    const sessionKey = String(scene.roomId || '') + ':' + (Number(scene.roomSessionGeneration) || 0);
    const result = [];
    for (const player of roster) {
      const id = String(player.id || '');
      if (![player.x, player.y].every(finite)) throw new TypeError(`Preparation player ${id} needs a rendered world position`);
      let entry = entries.get(id);
      if (!entry || entry.sessionKey !== sessionKey) {
        entry = { sessionKey, appearedAt: scene.nowMs };
        entries.set(id, entry);
      }
      if (scene.reducedMotion) entry.summonExpired = true;
      if (!finite(entry.summonStartedAt) && !entry.summonExpired &&
          player.spriteReady) entry.summonStartedAt = scene.nowMs;
      if (!finite(entry.summonStartedAt) && scene.nowMs - entry.appearedAt > 4000)
        entry.summonExpired = true;
      const t = finite(entry.summonStartedAt) ? clamp((scene.nowMs - entry.summonStartedAt) / 980) : 1;
      const active = !scene.reducedMotion && finite(entry.summonStartedAt) && t < 1;
      const descent = scene.reducedMotion ? 0 : (1 - Math.min(1, t / 0.64)) ** 2 * 78;
      const impact = scene.reducedMotion ? 0 : Math.sin(clamp((t - 0.54) / 0.30) * Math.PI);
      entry.arrival = { active, descent, stanceX: 1 + impact * 0.105,
        stanceY: 1 - impact * 0.13, lean: (id.length % 2 ? 1 : -1) * impact * 0.035 };
      if (!active) continue;
      const worldX = finite(player.renderedX) ? player.renderedX : player.x;
      const worldY = finite(player.renderedY) ? player.renderedY : player.y;
      const x = (worldX - camera.x) * zoom;
      const footY = (worldY + 30 - camera.y) * zoom;
      const easeOut = 1 - (1 - t) ** 3;
      const angle = (t - 0.5) * 0.42;
      const size = Math.max(1, 116 * 0.56 * (0.64 + easeOut * 0.36)) * zoom;
      const beamHeight = (42 + 96 * easeOut) * 0.56 * zoom;
      const ringAlpha = (1 - t) * 0.86;
      const beamWidth = Math.max(1, 1.7 * 0.56) * zoom;
      const beams = [-1, 1].map(side => ({
        x0: x + side * size * 0.16, y0: footY - 3 * 0.56 * zoom,
        x1: x + side * size * 0.16 * 0.36, y1: footY - beamHeight,
        width: beamWidth, color: ink(184, 245, 255, 0.78 * ringAlpha)
      }));
      const motes = Array.from({ length: 5 }, (_, particle) => {
        const particleT = clamp((t - particle * 0.075) / 0.72);
        const lane = particle - 2;
        return { x: x + lane * (6 + 12 * particleT) * 0.56 * zoom - 0.56 * zoom,
          y: footY - 8 * 0.56 * zoom - particleT * beamHeight * 0.72,
          size: 2 * 0.56 * zoom,
          color: ink(216, 250, 255, 0.92 * (1 - particleT) * (1 - t * 0.25) * 0.8) };
      });
      const rings = [
        { radius: size * .47, thickness: Math.max(1.5, size * .055),
          color: ink(111, 231, 255, ringAlpha * (.82 + .18 * Math.sin(t * Math.PI * 8))) },
        { radius: size * .31, thickness: Math.max(1.2, size * .038),
          color: ink(191, 151, 255, ringAlpha * (.72 + .28 * Math.sin(t * Math.PI * 8 + .6))) }
      ].map(ring => ({ ...ring, segments: Array.from({ length: 24 }, (_, index) => {
        const a0 = index * Math.PI * 2 / 24 + angle;
        const a1 = (index + .84) * Math.PI * 2 / 24 + angle;
        const amid = (a0 + a1) / 2;
        const span = (a1 - a0) * ring.radius;
        return { x: x + Math.cos(amid) * ring.radius,
          y: footY + Math.sin(amid) * ring.radius,
          width: span + ring.thickness * .18, height: ring.thickness,
          angle: amid + Math.PI / 2, color: ring.color };
      }) }));
      const rays = Array.from({ length: 4 }, (_, index) => {
        const a = index * Math.PI / 2 + angle;
        const inner = size * .42, outer = size * .59;
        const middle = (inner + outer) / 2;
        const crossHalf = size * .045;
        const cx = x + Math.cos(a) * middle, cy = footY + Math.sin(a) * middle;
        return { x0: x + Math.cos(a) * inner, y0: footY + Math.sin(a) * inner,
          x1: x + Math.cos(a) * outer, y1: footY + Math.sin(a) * outer,
          width: Math.max(1, size * .035),
          color: ink(220, 251, 255, ringAlpha * .9),
          cross: { x0: cx - Math.sin(a) * crossHalf,
            y0: cy + Math.cos(a) * crossHalf,
            x1: cx + Math.sin(a) * crossHalf,
            y1: cy - Math.cos(a) * crossHalf,
            width: Math.max(1, size * .025), color: ink(232, 204, 255, ringAlpha * .75) }
        };
      });
      result.push({ id, x, footY, size, angle,
        ringAlpha, ringReady: true, rings, rays, beams, motes,
        arrival: entry.arrival });
    }
    return result;
  }
  function beamRect(beam) {
    const dx = beam.x1 - beam.x0, dy = beam.y1 - beam.y0;
    const length = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: -length / 2, y: -beam.width / 2, w: length, h: beam.width,
      transform: [c, s, -s, c, (beam.x0 + beam.x1) / 2, (beam.y0 + beam.y1) / 2],
      color: beam.color, mode: 'additive' };
  }
  function create({ device } = {}) {
    let destroyed = false;
    function record({ frame, target, viewport, scene, camera, zoom } = {}) {
      if (destroyed) throw new Error('Preparation summon pass destroyed');
      if (typeof frame?.stage !== 'function' || typeof frame?.rect !== 'function' ||
          typeof target !== 'string' || !target ||
          !Number.isInteger(viewport?.pixelWidth) || !Number.isInteger(viewport?.pixelHeight) ||
          viewport.pixelWidth < 1 || viewport.pixelHeight < 1)
        throw new TypeError('Preparation summons need a shared frame and physical backing dimensions');
      const effects = plan({ scene, camera, zoom, viewport });
      if (!effects.length) return { drawn: 0, effects };
      frame.stage('world:preparation-summons');
      for (const effect of effects) {
        for (const ring of effect.rings) {
          for (const segment of ring.segments) {
            const c = Math.cos(segment.angle), s = Math.sin(segment.angle);
            frame.rect(target, { x: -segment.width / 2, y: -segment.height / 2,
              w: segment.width, h: segment.height,
              transform: [c, s, -s, c, segment.x, segment.y],
              color: segment.color, mode: 'additive' });
          }
        }
        for (const ray of effect.rays) {
          frame.rect(target, beamRect(ray));
          frame.rect(target, beamRect(ray.cross));
        }
        for (const beam of effect.beams) frame.rect(target, beamRect(beam));
        for (const mote of effect.motes) if (mote.color[3] > 0)
          frame.rect(target, { x: mote.x, y: mote.y, w: mote.size, h: mote.size,
            color: mote.color, mode: 'additive' });
      }
      return { drawn: effects.length, effects };
    }
    return Object.freeze({ device, record, destroy() {
      if (destroyed) return;
      destroyed = true;
    } });
  }
  const api = Object.freeze({ plan, create });
  root.DvaWebGPUPreparationSummons = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
