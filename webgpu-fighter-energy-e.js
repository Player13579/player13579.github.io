/* Fighter energy and sword E candidates for the shared textureless WebGPU frame. */
(function (root) {
  'use strict';
  const finite = Number.isFinite;
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const TYPES = Object.freeze({
    release: 'fighter-energy-release', impact: 'fighter-energy-impact',
    destructionSlash: 'fighter-energy-destruction-slash', milestone: 'fighter-energy-destruction-milestone',
    slash: 'fighter-slash', parry: 'fighter-slash-parry', shockwave: 'fighter-shockwave'
  });
  const DURATIONS = Object.freeze({
    [TYPES.release]: 700, [TYPES.impact]: 880, [TYPES.destructionSlash]: 680,
    [TYPES.milestone]: 1050, [TYPES.slash]: 440, [TYPES.parry]: 500, [TYPES.shockwave]: 760
  });
  function canonicalShockwaveDuration(event) {
    if (event?.type !== TYPES.shockwave || typeof event.variant !== 'string') return 0;
    if (/^one-body-damage:ec-cost-1:remaining-ec-(?:0|[1-9][0-9]*)$/.test(event.variant) &&
        event.durationMs === 760) return 760;
    if (/^giant-one-body-damage:ec-cost-100:remaining-ec-(?:0|[1-9][0-9]*)$/.test(event.variant) &&
        event.durationMs === 1150) return 1150;
    return 0;
  }
  const MAX_EVENTS = 24, MAX_RECTS_PER_EVENT = 18;
  const color = (r, g, b, a) => [r / 255, g / 255, b / 255, clamp(a)];
  function validate({ scene, camera, zoom, viewport } = {}) {
    if (!scene || !Array.isArray(scene.events) || !Array.isArray(scene.players) || !finite(scene.nowMs) ||
      !camera || ![camera.x, camera.y, zoom].every(finite) || zoom <= 0 || !viewport ||
      ![viewport.width, viewport.height].every(finite) || viewport.width <= 0 || viewport.height <= 0 ||
      (viewport.kind !== undefined && viewport.kind !== 'main'))
      throw new TypeError('Fighter Energy E requires local time, events, players, camera, zoom, and logical viewport');
    if ((viewport.pixelWidth !== undefined || viewport.pixelHeight !== undefined) &&
      (!Number.isInteger(viewport.pixelWidth) || viewport.pixelWidth < 1 ||
       !Number.isInteger(viewport.pixelHeight) || viewport.pixelHeight < 1))
      throw new TypeError('Fighter Energy E requires valid physical viewport dimensions');
  }
  function screen(x, y, camera, zoom, label) {
    if (![x, y].every(finite)) throw new Error(`Fighter Energy E requires finite ${label} coordinates`);
    return { x: (x - camera.x) * zoom, y: (y - camera.y) * zoom };
  }
  function point(event, prefix, camera, zoom, label) {
    return screen(event[`${prefix}X`], event[`${prefix}Y`], camera, zoom, label);
  }
  function plan(input = {}) {
    validate(input);
    const { scene, camera, zoom } = input;
    const events = scene.events.filter(e => e && Object.values(TYPES).includes(e.type));
    if (events.length > MAX_EVENTS) throw new RangeError('Fighter Energy E active event budget exceeded');
    const ids = new Set(), out = [];
    for (const event of events) {
      const id = String(event.id || ''), playerId = String(event.playerId || '');
      if (!id || ids.has(id)) throw new Error('Fighter Energy E requires unique event IDs');
      ids.add(id);
      if (!playerId || !finite(event.startedAt)) throw new Error(`Fighter Energy E ${id} requires playerId and local start time`);
      const duration = canonicalShockwaveDuration(event) || Math.min(DURATIONS[event.type], finite(event.durationMs) && event.durationMs > 0 ? event.durationMs : DURATIONS[event.type]);
      const age = scene.nowMs - event.startedAt;
      if (age < 0 || age >= duration) continue;
      const progress = clamp(age / duration), reducedMotion = Boolean(scene.reducedMotion);
      const origin = screen(event.x, event.y, camera, zoom, 'event origin');
      const owner = scene.players.find(p => String(p?.id || '') === playerId);
      if (event.type !== TYPES.impact && !owner) throw new Error(`Fighter Energy E ${id} owner ${playerId} unavailable`);
      let end = null, targetId = String(event.targetId || ''), kind;
      switch (event.type) {
        case TYPES.release:
          if (!event.handWorld || ![event.handWorld.x, event.handWorld.y].every(finite))
            throw new Error(`Fighter Energy E ${id} rejected: release requires explicit handWorld anchor`);
          if (![event.targetX, event.targetY].every(finite)) throw new Error(`Fighter Energy E ${id} rejected: release endpoint unavailable`);
          kind = 'release'; end = point(event, 'target', camera, zoom, 'release target'); break;
        case TYPES.impact:
          kind = 'impact'; break;
        case TYPES.destructionSlash:
          if (!targetId || ![event.targetX, event.targetY].every(finite))
            throw new Error(`Fighter Energy E ${id} rejected: destruction slash requires targetId and impact coordinates`);
          kind = 'destruction'; end = point(event, 'target', camera, zoom, 'destruction impact'); break;
        case TYPES.milestone:
          if (!/^\d+$/.test(String(event.variant || ''))) throw new Error(`Fighter Energy E ${id} rejected: milestone count missing`);
          kind = 'milestone'; break;
        case TYPES.slash:
          if (![event.targetX, event.targetY].every(finite)) throw new Error(`Fighter Energy E ${id} rejected: slash aim endpoint unavailable`);
          kind = 'slash'; end = point(event, 'target', camera, zoom, 'slash target'); break;
        case TYPES.parry:
          if (![event.targetX, event.targetY].every(finite)) throw new Error(`Fighter Energy E ${id} rejected: parry source endpoint unavailable`);
          kind = 'parry'; end = point(event, 'target', camera, zoom, 'parry source'); break;
        case TYPES.shockwave:
          if (![event.targetX, event.targetY].every(finite)) throw new Error(`Fighter Energy E ${id} rejected: shockwave path endpoint unavailable`);
          kind = 'shockwave'; end = point(event, 'target', camera, zoom, 'shockwave endpoint'); break;
      }
      const hand = event.handWorld ? screen(event.handWorld.x, event.handWorld.y, camera, zoom, 'hand anchor') : null;
      out.push({ id, type: event.type, playerId, targetId, kind, origin, end, hand, age, duration, progress,
        reducedMotion, alpha: (1 - progress) * (reducedMotion ? 0.62 : 0.9), variant: String(event.variant || '') });
    }
    return out;
  }
  function line(a, b, width, rgba) {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    if (!finite(len) || len < 0.01) return null;
    const c = dx / len, s = dy / len;
    return { x: -len / 2, y: -width / 2, w: len, h: width,
      transform: [c, s, -s, c, (a.x + b.x) / 2, (a.y + b.y) / 2], color: rgba, mode: 'additive' };
  }
  function rectAt(center, w, h, rgba) {
    return { x: center.x - w / 2, y: center.y - h / 2, w, h, color: rgba, mode: 'additive' };
  }
  function commandsFor(e) {
    const a = e.alpha, p = e.progress, reduced = e.reducedMotion, commands = [];
    const addLine = (x, y, width, c) => { const cmd = line(x, y, width, c); if (cmd) commands.push(cmd); };
    if (e.kind === 'release') {
      // An energy parcel travels only from the explicitly supplied handWorld anchor.
      const from = e.hand;
      const tip = { x: from.x + (e.end.x - from.x) * p, y: from.y + (e.end.y - from.y) * p };
      const tail = { x: from.x + (tip.x - from.x) * 0.35, y: from.y + (tip.y - from.y) * 0.35 };
      addLine(tail, tip, 10, color(255, 179, 74, a * 0.24));
      addLine({ x: tail.x, y: tail.y - 1.4 }, { x: tip.x, y: tip.y - 1.4 }, 3.2, color(255, 239, 177, a));
      commands.push(rectAt(tip, 11, 11, color(255, 216, 127, a * 0.8)));
    } else if (e.kind === 'impact') {
      const radius = (reduced ? 9 : 5 + 21 * p);
      for (let i = 0; i < (reduced ? 4 : 7); i++) {
        const angle = i * Math.PI * 2 / (reduced ? 4 : 7), inner = radius * 0.38, outer = radius;
        addLine({ x: e.origin.x + Math.cos(angle) * inner, y: e.origin.y + Math.sin(angle) * inner },
          { x: e.origin.x + Math.cos(angle) * outer, y: e.origin.y + Math.sin(angle) * outer }, 2.8, color(255, 188, 91, a));
      }
      commands.push(rectAt(e.origin, Math.max(3, radius * 0.46), Math.max(3, radius * 0.46), color(255, 245, 196, a * 0.9)));
    } else if (e.kind === 'destruction') {
      // Cut travels along server-recorded attacker-to-impact segment, then leaves a brief split mark.
      const tip = { x: e.origin.x + (e.end.x - e.origin.x) * Math.min(1, p * 1.5), y: e.origin.y + (e.end.y - e.origin.y) * Math.min(1, p * 1.5) };
      addLine(e.origin, tip, 9, color(213, 80, 255, a * 0.35));
      addLine({ x: e.origin.x, y: e.origin.y - 1 }, { x: tip.x, y: tip.y - 1 }, 2.4, color(246, 226, 255, a));
      if (p > 0.58) for (const side of [-1, 1]) addLine(
        { x: e.end.x, y: e.end.y },
        { x: e.end.x + side * (reduced ? 8 : 17) * (1 - p), y: e.end.y - (reduced ? 4 : 11) * (1 - p) },
        3.4, color(239, 151, 255, a));
    } else if (e.kind === 'milestone') {
      // EC threshold: four distinct arcs/rays around the fighter; milestone marker, not a projectile.
      const radius = reduced ? 18 : 11 + p * 16;
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2 + (reduced ? 0 : p * 0.55);
        const start = { x: e.origin.x + Math.cos(angle) * radius * 0.54, y: e.origin.y + Math.sin(angle) * radius * 0.54 };
        const finish = { x: e.origin.x + Math.cos(angle) * radius, y: e.origin.y + Math.sin(angle) * radius };
        addLine(start, finish, 3, color(255, 226, 103, a));
      }
      commands.push(rectAt(e.origin, 7, 7, color(255, 247, 174, a)));
    } else if (e.kind === 'slash') {
      const mid = { x: (e.origin.x + e.end.x) / 2, y: (e.origin.y + e.end.y) / 2 };
      const dx = e.end.x - e.origin.x, dy = e.end.y - e.origin.y, length = Math.hypot(dx, dy) || 1;
      const n = { x: -dy / length, y: dx / length };
      addLine({ x: mid.x - n.x * 12, y: mid.y - n.y * 12 }, { x: mid.x + n.x * 12, y: mid.y + n.y * 12 }, 5, color(183, 229, 255, a));
    } else if (e.kind === 'parry') {
      for (let i = 0; i < 3; i++) {
        const x = e.origin.x + (e.end.x - e.origin.x) * (0.25 + i * 0.18);
        const y = e.origin.y + (e.end.y - e.origin.y) * (0.25 + i * 0.18);
        commands.push(rectAt({ x, y }, 5, 5, color(153, 224, 255, a)));
      }
    } else if (e.kind === 'shockwave') {
      const head = { x: e.origin.x + (e.end.x - e.origin.x) * p, y: e.origin.y + (e.end.y - e.origin.y) * p };
      addLine(e.origin, head, 5.5, color(135, 220, 255, a * 0.7));
      addLine({ x: head.x - 3, y: head.y }, { x: head.x + 3, y: head.y }, 2.4, color(224, 250, 255, a));
    }
    return commands;
  }
  function create() {
    let destroyed = false;
    function record({ frame, target, viewport, scene, camera, zoom } = {}) {
      if (destroyed) throw new Error('Fighter Energy E pass destroyed');
      if (typeof frame?.stage !== 'function' || typeof frame?.rect !== 'function' || typeof target !== 'string' || !target)
        throw new TypeError('Fighter Energy E requires shared rectangle frame and target');
      const effects = plan({ scene, camera, zoom, viewport });
      const commands = effects.flatMap(commandsFor);
      if (commands.some(c => ![c.x, c.y, c.w, c.h, c.color?.[3]].every(finite)) ||
          commands.length > MAX_EVENTS * MAX_RECTS_PER_EVENT) throw new RangeError('Fighter Energy E invalid or over budget');
      if (commands.length) {
        frame.stage('world:fighter-energy-e');
        for (const command of commands) frame.rect(target, command);
      }
      return { drawn: effects.length, effects, commands };
    }
    return Object.freeze({ record, destroy() { destroyed = true; } });
  }
  const api = Object.freeze({ TYPES, DURATIONS, MAX_EVENTS, MAX_RECTS_PER_EVENT, canonicalShockwaveDuration, plan, create });
  root.DvaWebGPUFighterEnergyE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
