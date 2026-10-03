/* Four-nozzle, textureless Hover Sprint E for the shared WebGPU frame.
 * All feet/back anchors and travel heading are caller-supplied world geometry. */
(function (root) {
  'use strict';
  const finite = Number.isFinite;
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const TYPE = 'hover-sprint-active';
  const VARIANT = 'auto-unsupported';
  const START_MS = 360;
  const END_MS = 360;
  const MAX_ACTORS = 16;
  const MAX_EVENTS = 16;
  function validate({ scene, camera, zoom, viewport } = {}) {
    if (!scene || !Array.isArray(scene.players) || !Array.isArray(scene.events) ||
        ![scene.nowMs, scene.serverNow].every(finite) || !camera || ![camera.x, camera.y, zoom].every(finite) ||
        !viewport || ![viewport.width, viewport.height].every(finite) || viewport.width <= 0 ||
        viewport.height <= 0 || zoom <= 0 ||
        (viewport.kind !== undefined && viewport.kind !== 'main'))
      throw new TypeError('Hover Sprint E needs clocks, actors, events, camera, zoom, and logical viewport');
    if (viewport.pixelWidth !== undefined &&
        (!Number.isInteger(viewport.pixelWidth) || viewport.pixelWidth < 1 ||
         !Number.isInteger(viewport.pixelHeight) || viewport.pixelHeight < 1))
      throw new TypeError('Hover Sprint E needs valid physical viewport dimensions');
  }
  function pointList(value, owner, part) {
    if (!Array.isArray(value) || value.length !== 2 || value.some(p => !p || ![p.x, p.y].every(finite)))
      throw new Error(`Hover Sprint E ${owner} requires exactly two explicit ${part} world anchors`);
    return value.map(p => ({ x: p.x, y: p.y }));
  }
  function makeEffect(player, event, phase, input) {
    const { scene, camera, zoom } = input;
    const id = String(player.id || '');
    if (!id) throw new Error('Hover Sprint E actor needs a player ID');
    if (!player.alive || player.ejected || player.inVent) return null;
    const feetWorld = pointList(player.feetJetsWorld, id, 'feet');
    const backWorld = pointList(player.backJetsWorld, id, 'back');
    const heading = player.travelHeading;
    if (!heading || ![heading.x, heading.y].every(finite) || Math.hypot(heading.x, heading.y) < 1e-6)
      throw new Error(`Hover Sprint E ${id} requires explicit nonzero travelHeading`);
    const magnitude = Math.hypot(heading.x, heading.y);
    const direction = { x: heading.x / magnitude, y: heading.y / magnitude };
    const toScreen = p => ({ x: (p.x - camera.x) * zoom, y: (p.y - camera.y) * zoom });
    const onsetAge = event ? Math.max(0, scene.nowMs - event.startedAt) : START_MS;
    const until = Number(player.hoverSprintUntil);
    const remaining = finite(until) ? until - scene.serverNow : 0;
    let alpha, progress = 0;
    if (phase === 'onset') {
      progress = clamp(onsetAge / START_MS);
      alpha = 0.38 + 0.62 * (1 - smooth(progress));
    } else if (phase === 'end') {
      progress = clamp(1 - remaining / END_MS);
      alpha = 0.56 * (1 - smooth(progress));
    } else {
      progress = finite(until) && Number(player.hoverSprintDurationMs) > 0
        ? clamp(1 - remaining / Number(player.hoverSprintDurationMs)) : 0;
      alpha = scene.reducedMotion ? 0.38 : 0.52;
    }
    return { id, playerId: id, phase, eventId: event?.id || '',
      startedAt: event?.startedAt ?? (finite(until) ? until - (Number(player.hoverSprintDurationMs) || 8000) : scene.serverNow),
      expiresAt: until, remaining, progress, reducedMotion: Boolean(scene.reducedMotion),
      direction, alpha, zoom,
      feet: feetWorld.map(toScreen), back: backWorld.map(toScreen) };
  }
  function plan(input = {}) {
    validate(input);
    const { scene } = input;
    const players = new Map();
    for (const player of scene.players) {
      const id = String(player?.id || '');
      if (!id) continue;
      if (players.has(id)) throw new Error(`Hover Sprint E duplicate player ${id}`);
      players.set(id, player);
    }
    const active = [...players.values()].filter(p => p.alive && !p.ejected && !p.inVent &&
      finite(p.hoverSprintUntil) && p.hoverSprintUntil > scene.serverNow);
    if (active.length > MAX_ACTORS) throw new RangeError(`Hover Sprint E exceeds ${MAX_ACTORS} active actors`);
    const events = scene.events.filter(e => e?.type === TYPE && e.variant === VARIANT);
    if (events.length > MAX_EVENTS) throw new RangeError(`Hover Sprint E exceeds ${MAX_EVENTS} activation events`);
    const eventIds = new Set(), eventByPlayer = new Map();
    for (const event of events) {
      const eventId = String(event.id || ''), ownerId = String(event.playerId || '');
      if (!eventId || eventIds.has(eventId)) throw new Error('Hover Sprint E requires distinct activation event IDs');
      eventIds.add(eventId);
      if (!finite(event.startedAt)) throw new Error(`Hover Sprint E ${eventId} requires local event start time`);
      const age = scene.nowMs - event.startedAt;
      if (age < 0 || age >= START_MS) continue;
      if (!ownerId) throw new Error(`Hover Sprint E ${eventId} requires exact playerId ownership`);
      if (eventByPlayer.has(ownerId)) throw new Error(`Hover Sprint E player ${ownerId} has overlapping activation events`);
      const player = players.get(ownerId);
      if (!player) throw new Error(`Hover Sprint E ${eventId} owner ${ownerId} is unavailable`);
      if (!active.includes(player)) continue; // The server's live state owns ignition too.
      eventByPlayer.set(ownerId, event);
    }
    const result = [];
    const ids = new Set(active.map(p => String(p.id)));
    for (const id of ids) {
      const player = players.get(id), event = eventByPlayer.get(id) || null;
      const remaining = Number(player.hoverSprintUntil) - scene.serverNow;
      const phase = event ? 'onset' : remaining <= END_MS ? 'end' : 'sustain';
      const effect = makeEffect(player, event, phase, input);
      if (effect) result.push(effect);
    }
    return result;
  }
  function segment(a, b, width, rgba) {
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    if (!finite(length) || length < 1e-4) return null;
    const c = dx / length, s = dy / length;
    return { x: -length / 2, y: -width / 2, w: length, h: width,
      transform: [c, s, -s, c, (a.x + b.x) / 2, (a.y + b.y) / 2],
      color: rgba, mode: 'additive' };
  }
  function commandsFor(effect) {
    const commands = [];
    const pairs = [...effect.feet.map(p => ({ point: p, kind: 'feet' })),
      ...effect.back.map(p => ({ point: p, kind: 'back' }))];
    for (let i = 0; i < pairs.length; i++) {
      const { point, kind } = pairs[i];
      const scale = effect.zoom;
      const tailLength = (kind === 'feet' ? 31 : 25) * scale *
        (effect.phase === 'onset' ? 0.56 + 0.64 * smooth(effect.progress) :
          effect.phase === 'end' ? 1 - 0.32 * effect.progress : 1);
      const tail = { x: point.x - effect.direction.x * tailLength,
        y: point.y - effect.direction.y * tailLength };
      const side = { x: -effect.direction.y, y: effect.direction.x };
      const warm = kind === 'feet' ? [255, 189, 96] : [138, 218, 255];
      const opacity = effect.alpha * (effect.reducedMotion ? 0.76 : 0.9);
      const main = segment(tail, point, (kind === 'feet' ? 4 : 3.2) * scale,
        [warm[0] / 255, warm[1] / 255, warm[2] / 255, clamp(opacity)]);
      if (main) commands.push(main);
      const coreTail = { x: point.x - effect.direction.x * tailLength * 0.72,
        y: point.y - effect.direction.y * tailLength * 0.72 };
      const core = segment(coreTail, point, Math.max(1, 1.15 * scale),
        [0.91, 0.98, 1, clamp(opacity * 0.96)]);
      if (core) commands.push(core);
      if (!effect.reducedMotion) {
        for (const sign of [-1, 1]) {
          const a = { x: tail.x + side.x * sign * 2.8 * scale, y: tail.y + side.y * sign * 2.8 * scale };
          const b = { x: point.x - effect.direction.x * 5 * scale + side.x * sign * 1.2 * scale,
            y: point.y - effect.direction.y * 5 * scale + side.y * sign * 1.2 * scale };
          const edge = segment(a, b, 1.05 * scale,
            [warm[0] / 255, warm[1] / 255, warm[2] / 255, clamp(opacity * 0.44)]);
          if (edge) commands.push(edge);
        }
      }
      if (effect.phase === 'onset' && !effect.reducedMotion) {
        const flash = segment({ x: point.x - effect.direction.x * tailLength * 0.22,
          y: point.y - effect.direction.y * tailLength * 0.22 }, point,
        7 * scale * (1 - effect.progress) + scale,
        [1, 0.94, 0.77, clamp((1 - effect.progress) * 0.45)]);
        if (flash) commands.push(flash);
      }
    }
    return commands;
  }
  function create() {
    let destroyed = false;
    function record({ frame, target, viewport, scene, camera, zoom } = {}) {
      if (destroyed) throw new Error('Hover Sprint E pass destroyed');
      if (typeof frame?.stage !== 'function' || typeof frame?.rect !== 'function' ||
          typeof target !== 'string' || !target)
        throw new TypeError('Hover Sprint E needs the shared rectangle frame and target');
      const effects = plan({ scene, camera, zoom, viewport });
      if (!effects.length) return { drawn: 0, effects, commands: [] };
      const commands = effects.flatMap(commandsFor);
      if (commands.length > MAX_ACTORS * 20) throw new RangeError('Hover Sprint E geometry exceeded its bounded primitive budget');
      frame.stage('world:hover-sprint-e');
      for (const command of commands) frame.rect(target, command);
      return { drawn: effects.length, effects, commands };
    }
    return Object.freeze({ record, destroy() { destroyed = true; } });
  }
  const api = Object.freeze({ TYPE, VARIANT, START_MS, END_MS, MAX_ACTORS, MAX_EVENTS, plan, create });
  root.DvaWebGPUHoverSprintE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
