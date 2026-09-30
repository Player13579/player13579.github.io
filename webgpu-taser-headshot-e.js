/* Textureless, contact-only WebGPU candidates for taser and gunner headshot.
 * These events carry target-side world points, not muzzle anchors or a shot ray.
 * Headshot is emitted before killPlayer resolves dodge/guards, so its mark never
 * claims death. Sound, kill camera, and special-ammo impact remain other owners. */
(function (root) {
  'use strict';
  const finite = Number.isFinite;
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const MAX_EVENTS = 32;
  const TASER_MS = 480;
  const HEADSHOT_MS = 420;
  const HEADSHOT_WEAPONS = new Set(['handgun', 'smg', 'assault', 'shotgun', 'sniper', 'taser']);
  const color = (r, g, b, a) => [r / 255, g / 255, b / 255, clamp(a)];

  function validate({ scene, camera, zoom, viewport } = {}) {
    if (!scene || !Array.isArray(scene.effects) || !Array.isArray(scene.players) ||
        !finite(scene.nowMs) || !camera || ![camera.x, camera.y, zoom].every(finite) || zoom <= 0 ||
        !viewport || ![viewport.width, viewport.height].every(finite) || viewport.width <= 0 || viewport.height <= 0 ||
        (viewport.kind !== undefined && viewport.kind !== 'main'))
      throw new TypeError('Taser/Headshot E needs timed effects, public actors, camera, zoom, and logical viewport');
    if ((viewport.pixelWidth !== undefined || viewport.pixelHeight !== undefined) &&
        (!Number.isInteger(viewport.pixelWidth) || viewport.pixelWidth < 1 ||
         !Number.isInteger(viewport.pixelHeight) || viewport.pixelHeight < 1))
      throw new TypeError('Taser/Headshot E needs valid physical viewport dimensions');
  }

  function line(a, b, width, rgba) {
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    if (!finite(length) || length < 1e-4) return null;
    const c = dx / length, s = dy / length;
    return { x: -length / 2, y: -width / 2, w: length, h: width,
      transform: [c, s, -s, c, (a.x + b.x) / 2, (a.y + b.y) / 2], color: rgba, mode: 'additive' };
  }

  function targetVisible(player, viewerId) {
    return Boolean(player && player.visible !== false && player.hidden !== true &&
      (!player.invisible || String(player.id) === String(viewerId || '')) &&
      !player.inVent && !player.ejected);
  }

  function classify(effect) {
    const type = String(effect.type || ''), variant = String(effect.variant || '');
    if (type === 'action-taser' && variant === '') return { kind: 'taser' };
    if (type !== 'action-gunner-headshot') return null;
    const match = /^(aim|hip):([a-z0-9_-]+)$/.exec(variant);
    if (!match || !HEADSHOT_WEAPONS.has(match[2])) return null;
    return { kind: 'headshot', aim: match[1] === 'aim', weapon: match[2] };
  }

  function plan({ scene, camera, zoom, viewport } = {}) {
    validate({ scene, camera, zoom, viewport });
    const active = scene.effects.filter(e => classify(e));
    if (active.length > MAX_EVENTS) throw new RangeError(`Taser/Headshot E exceeds ${MAX_EVENTS} active events`);
    const seen = new Set(), output = [];
    for (const effect of active) {
      const id = String(effect.id || ''), targetId = String(effect.targetId || '');
      if (!id || seen.has(id)) throw new Error('Taser/Headshot E requires distinct authoritative event IDs');
      seen.add(id);
      if (!targetId || !finite(effect.startedAt) || !finite(effect.x) || !finite(effect.y))
        throw new Error(`Taser/Headshot E ${id} requires targetId, local start, and authoritative contact point`);
      const classification = classify(effect), duration = classification.kind === 'taser' ? TASER_MS : HEADSHOT_MS;
      const age = scene.nowMs - effect.startedAt;
      if (age < 0 || age >= duration) continue;
      const target = scene.players.find(p => String(p?.id || '') === targetId);
      // Never let a stale/unredacted magic-effect coordinate reveal a concealed actor.
      if (!targetVisible(target, scene.viewerId)) continue;
      const progress = clamp(age / duration);
      output.push({ id, targetId, kind: classification.kind, ...classification,
        point: { x: (effect.x - camera.x) * zoom, y: (effect.y - camera.y) * zoom },
        age, duration, progress, reducedMotion: Boolean(scene.reducedMotion),
        alpha: (1 - smooth(progress)) * (scene.reducedMotion ? 0.62 : 0.92),
        // Target coordinates are the server event source; no origin/ray is supplied.
        contactOnly: true, killOutcomeUnknown: classification.kind === 'headshot' });
    }
    return output;
  }

  function commandsFor(event) {
    const { point: c, progress: p, reducedMotion: reduced } = event;
    const commands = [], fade = event.alpha;
    const addLine = (a, b, width, rgba) => { const cmd = line(a, b, width, rgba); if (cmd) commands.push(cmd); };
    if (event.kind === 'taser') {
      // Two separated forked contact arcs communicate electrical disruption without a beam.
      const spread = reduced ? 7 : 5 + p * 9;
      for (const side of [-1, 1]) {
        const points = [
          { x: c.x + side * 2, y: c.y - 8 },
          { x: c.x + side * (spread * 0.5), y: c.y - 2 },
          { x: c.x + side * (spread * 0.25), y: c.y + 3 },
          { x: c.x + side * spread, y: c.y + 9 }
        ];
        for (let i = 0; i < points.length - 1; i++)
          addLine(points[i], points[i + 1], i === 1 ? 2.8 : 2.1,
            color(115 + i * 26, 219 + i * 10, 255, fade * (0.9 - i * 0.13)));
      }
      const width = reduced ? 9 : 4 + p * 6;
      addLine({ x: c.x - width, y: c.y }, { x: c.x + width, y: c.y }, 1.7, color(210, 248, 255, fade * 0.82));
    } else {
      // A compact head-contact diamond and cross marks the successful headshot roll.
      // It deliberately does not imply lethal resolution, which follows in killPlayer.
      const size = reduced ? 7 : 4.5 + Math.sin(p * Math.PI) * 4;
      const warm = event.weapon === 'smg' ? [255, 186, 96] : event.weapon === 'sniper' ? [187, 175, 255] : [255, 232, 184];
      const a = color(warm[0], warm[1], warm[2], fade);
      const diamond = [
        { x: c.x, y: c.y - size }, { x: c.x + size * 0.8, y: c.y },
        { x: c.x, y: c.y + size }, { x: c.x - size * 0.8, y: c.y }, { x: c.x, y: c.y - size }
      ];
      for (let i = 0; i < diamond.length - 1; i++) addLine(diamond[i], diamond[i + 1], 2.4, a);
      const arm = reduced ? 5 : 3 + p * 5;
      addLine({ x: c.x - arm, y: c.y }, { x: c.x + arm, y: c.y }, 1.6, color(255, 250, 224, fade * 0.9));
      addLine({ x: c.x, y: c.y - arm }, { x: c.x, y: c.y + arm }, 1.6, color(255, 250, 224, fade * 0.9));
      // Aim/hip is kept as a small, distinct contact cadence, not a kill badge.
      if (!reduced && event.aim) {
        const notch = size + 2;
        addLine({ x: c.x - notch, y: c.y - notch * 0.55 }, { x: c.x - notch + 3, y: c.y - notch * 0.55 }, 1.8, color(210, 225, 255, fade * 0.75));
      }
    }
    return commands;
  }

  function create() {
    let destroyed = false;
    function record({ frame, target, viewport, scene, camera, zoom } = {}) {
      if (destroyed) throw new Error('Taser/Headshot E pass destroyed');
      if (typeof frame?.stage !== 'function' || typeof frame?.rect !== 'function' || typeof target !== 'string' || !target)
        throw new TypeError('Taser/Headshot E needs the shared rectangle frame and target');
      const effects = plan({ scene, camera, zoom, viewport });
      const commands = effects.flatMap(commandsFor);
      if (commands.length > MAX_EVENTS * 12) throw new RangeError('Taser/Headshot E primitive budget exceeded');
      if (!commands.length) return { drawn: 0, effects, commands: [] };
      frame.stage('world:taser-headshot-e');
      for (const command of commands) frame.rect(target, command);
      return { drawn: effects.length, effects, commands };
    }
    return Object.freeze({ record, destroy() { destroyed = true; } });
  }

  const api = Object.freeze({ TASER_MS, HEADSHOT_MS, MAX_EVENTS, classify, plan, commandsFor, create });
  root.DvaWebGPUTaserHeadshotE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
