/* r0.7 Barrier receipt planner for the shared WebGPU game frame. */
(function (root) {
  'use strict';

  const finite = Number.isFinite;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const MAX_EVENTS = 24;
  const TYPE = 'durable-barrier';
  const EVENT_MAP = Object.freeze({
    'action-stand:durability-created': Object.freeze({
      variant: 'create', owner: 'targetId', other: 'playerId', duration: 650
    }),
    'preparation-barrier-hit:durability-hit': Object.freeze({
      variant: 'absorb', owner: 'playerId', other: 'targetId', duration: 650
    }),
    'preparation-barrier-hit:durability-broken': Object.freeze({
      variant: 'fracture', owner: 'playerId', other: 'targetId', duration: 480
    }),
    'action-push:timed-bust-break': Object.freeze({
      variant: 'bust', owner: 'targetId', other: 'playerId', duration: 480
    })
  });

  function resolveEvent(effect) {
    return EVENT_MAP[`${String(effect?.type || '')}:${String(effect?.variant || '')}`] || null;
  }

  function validate({ scene, camera, zoom, viewport } = {}) {
    if (!scene || !Array.isArray(scene.effects) || !Array.isArray(scene.players) ||
        !finite(scene.nowMs) || !camera || ![camera.x, camera.y, zoom].every(finite) ||
        !viewport || ![viewport.width, viewport.height].every(finite) ||
        viewport.width <= 0 || viewport.height <= 0 || zoom <= 0 ||
        (viewport.kind !== undefined && viewport.kind !== 'main'))
      throw new TypeError('Barrier E needs timed effects, actors, camera, zoom, and logical viewport');
    if (viewport.pixelWidth !== undefined &&
        (!Number.isInteger(viewport.pixelWidth) || viewport.pixelWidth < 1 ||
         !Number.isInteger(viewport.pixelHeight) || viewport.pixelHeight < 1))
      throw new TypeError('Barrier E needs valid physical viewport dimensions');
  }

  function plan(input = {}) {
    validate(input);
    const { scene, camera, zoom } = input;
    const sourceEvents = scene.effects.filter(effect => resolveEvent(effect));
    if (sourceEvents.length > MAX_EVENTS)
      throw new RangeError(`Barrier E exceeds ${MAX_EVENTS} concurrent events`);

    const ids = new Set();
    const planned = [];
    for (const effect of sourceEvents) {
      const id = String(effect?.id ?? '');
      if (!id || ids.has(id)) throw new Error('Barrier E needs distinct one-shot event IDs');
      ids.add(id);

      const spec = resolveEvent(effect);
      const startedAt = Number(effect.startedAt);
      if (!finite(startedAt))
        throw new Error(`Barrier E ${id} rejected: finite local event clock required`);
      const elapsedMs = scene.nowMs - startedAt;
      if (elapsedMs < 0 || elapsedMs >= spec.duration) continue;

      const ownerId = String(effect[spec.owner] || '');
      if (!ownerId)
        throw new Error(`Barrier E ${id} rejected: ${spec.owner} must identify the barrier owner`);
      const owner = scene.players.find(player => String(player?.id || '') === ownerId);
      if (!owner || ![owner.x, owner.y].every(finite))
        throw new Error(`Barrier E ${id} rejected: owner ${ownerId} needs a finite world position`);

      const world = Object.freeze({ x: owner.x, y: owner.y });
      const screen = Object.freeze({
        x: (owner.x - camera.x) * zoom,
        y: (owner.y - camera.y) * zoom
      });
      const tMs = clamp(elapsedMs, 0, spec.duration);
      planned.push(Object.freeze({
        id,
        effectId: id,
        type: effect.type,
        sourceVariant: effect.variant,
        variant: spec.variant,
        ownerId,
        otherId: String(effect[spec.other] || ''),
        ownerWorld: world,
        ownerScreen: screen,
        center: screen,
        startedAt,
        tMs,
        elapsedMs: tMs,
        duration: spec.duration,
        durationMs: spec.duration,
        progress: tMs / spec.duration,
        reducedMotion: Boolean(scene.reducedMotion)
      }));
    }
    return planned;
  }

  function create() {
    let destroyed = false;
    function record(input = {}) {
      if (destroyed) throw new Error('Barrier E pass destroyed');
      const events = plan(input);
      // The r0.7 shared-device renderer consumes these immutable event claims.
      // It owns all GPU commands; this planner intentionally emits no legacy geometry.
      return { drawn: events.length, events, commands: [] };
    }
    return Object.freeze({ record, destroy() { destroyed = true; } });
  }

  const api = Object.freeze({ TYPE, MAX_EVENTS, EVENT_MAP, resolveEvent, plan, create });
  root.DvaWebGPUBarrierE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
