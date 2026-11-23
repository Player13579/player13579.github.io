/* Shared-frame player nameplates and preparation hit geometry. This module
 * uses the caller's player anchor transform and GPU text atlas only. */
(function (root) {
  'use strict';
  const finite = Number.isFinite;
  const LABEL_LIMIT = 14;
  const LABEL_SIZE = 10;
  const FOOT_Y = 31;
  const BODY_SCALE = .72;
  const PLATE_Y = FOOT_Y + (-78 - FOOT_Y) * BODY_SCALE;

  function matrix(value, name) {
    if (!Array.isArray(value) || value.length !== 6 || !value.every(finite))
      throw new TypeError(`${name} must be a finite affine transform`);
    return value;
  }
  function transformPoint(m, x, y) {
    return { x: m[0] * x + m[2] * y + m[4],
      y: m[1] * x + m[3] * y + m[5] };
  }
  function transformedAabb(m, rect) {
    const points = [transformPoint(m, rect.x, rect.y),
      transformPoint(m, rect.x + rect.w, rect.y),
      transformPoint(m, rect.x, rect.y + rect.h),
      transformPoint(m, rect.x + rect.w, rect.y + rect.h)];
    const xs = points.map(point => point.x), ys = points.map(point => point.y);
    const left = Math.min(...xs), top = Math.min(...ys);
    const right = Math.max(...xs), bottom = Math.max(...ys);
    return { x: left, y: top, width: right - left, height: bottom - top };
  }
  // Both vertex-triangle quads and linear-filtered glyph fragments are confined
  // to their authored quad. Bound the union before the affine transform; do not
  // infer clipping from the actor anchor or from the nameplate width alone.
  function entirelyOffscreen(entry, viewport, textures, textTop) {
    if (viewport?.kind !== 'main' ||
        ![viewport.width, viewport.height].every(v => Number.isInteger(v) && v >= 32 && v <= 8192))
      return false;
    const m = entry.transform;
    if (m.slice(0, 4).some(v => Math.abs(v) > 16) ||
        m.slice(4).some(v => Math.abs(v) > 8192)) return false;
    let left = entry.plate.x, right = left + entry.plate.w;
    let top = entry.plate.y, bottom = top + entry.plate.h;
    for (const g of entry.layout.quads) {
      // Keep any existing downstream validation observable for malformed
      // UVs/texture sources, even if the author placed a glyph outside the view.
      const [u, v, w, h] = g.uv;
      const texture = textures[g.page];
      if (u < 0 || v < 0 || w <= 0 || h <= 0 || u + w > 1 || v + h > 1 ||
          (typeof texture !== 'object' && typeof texture?.createView !== 'function')) return false;
      const x = -entry.layout.width / 2 + g.x, y = textTop + g.y;
      left = Math.min(left, x); right = Math.max(right, x + g.w);
      top = Math.min(top, y); bottom = Math.max(bottom, y + g.h);
    }
    if (![left, right, top, bottom].every(v => finite(v) && Math.abs(v) <= 1024)) return false;
    const bounds = transformedAabb(m, { x: left, y: top, w: right - left, h: bottom - top });
    // With guarded affine and local coordinates, shader products/sums and
    // f32 clip conversion have <1 logical pixel of rounding error. Keep eight
    // pixels of slack and retain all tangents and uncertain ranges as drawn.
    return bounds.x + bounds.width < -8 || bounds.y + bounds.height < -8 ||
      bounds.x > viewport.width + 8 || bounds.y > viewport.height + 8;
  }
  function readCommand(command) {
    if (!command || command.stage !== 'world:players:sprite' ||
        command.playerId == null || typeof command.playerId === 'object')
      throw new TypeError('Authored player sprite command required');
    const transform = matrix(command.anchorTransform, 'Player anchorTransform');
    const alpha = command.sprite?.color?.[3];
    if (!finite(alpha) || alpha < 0 || alpha > 1)
      throw new TypeError('Player command needs a valid sprite alpha');
    const raw = command.name ?? command.identity?.label ?? command.identity;
    if (typeof raw !== 'string') throw new TypeError('Player command identity label required');
    const label = raw.slice(0, LABEL_LIMIT);
    return { command, transform: [...transform], alpha, label };
  }
  function create({ textAtlas } = {}) {
    if (typeof textAtlas?.layout !== 'function' ||
        typeof textAtlas?.ensure !== 'function' || !Array.isArray(textAtlas.textures))
      throw new TypeError('Shared GPU text atlas with layout, ensure and textures required');

    const preparedLabels = new Set();
    function layoutLabel(label, playerId) {
      const layout = textAtlas.layout(label, { size: LABEL_SIZE, missing: 'replace' });
      if (!layout || !finite(layout.width) || layout.width < 0 ||
          !Array.isArray(layout.quads) || !finite(layout.height) || layout.height < 0)
        throw new Error(`Invalid player name atlas layout: ${playerId}`);
      for (const glyph of layout.quads) {
        if (!glyph || !Number.isInteger(glyph.page) || glyph.page < 0 ||
            ![glyph.x, glyph.y, glyph.w, glyph.h].every(finite) ||
            glyph.w <= 0 || glyph.h <= 0 || !Array.isArray(glyph.uv) ||
            glyph.uv.length !== 4 || !glyph.uv.every(finite))
          throw new Error(`Invalid player name glyph geometry: ${playerId}`);
        if (!textAtlas.textures[glyph.page])
          throw new Error(`Player name atlas page ${glyph.page} is missing`);
      }
      return layout;
    }
    async function prepareLabels({ labels } = {}) {
      if (!Array.isArray(labels) || labels.some(label => typeof label !== 'string'))
        throw new TypeError('Player name labels must be strings');
      const clipped = [...new Set(labels.map(label => label.slice(0, LABEL_LIMIT)))];
      await textAtlas.ensure(clipped.join('\n'));
      for (const label of clipped) {
        layoutLabel(label, 'prepared-label');
        preparedLabels.add(label);
      }
      return Object.freeze({ prepared: clipped.length, labels: Object.freeze(clipped) });
    }

    function record({ frame, target, commands, selfPlayerId, preparation = false, viewport, phase } = {}) {
      if (!Array.isArray(commands) ||
          typeof frame?.stage !== 'function' || typeof frame?.rect !== 'function' ||
          typeof frame?.sprite !== 'function' || typeof target !== 'string' || !target)
        throw new TypeError('Current player commands, shared frame and target required');
      const entries = commands.map(command => {
        const entry = readCommand(command);
        if (!preparedLabels.has(entry.label))
          throw new Error(`Player name label was not prepared: ${entry.label}`);
        const layout = layoutLabel(entry.label, command.playerId);
        const width = Math.min(92, Math.max(44, layout.width + 12));
        const plate = { x: -width / 2, y: PLATE_Y, w: width, h: 14 };
        const skinLocal = { x: -47 * BODY_SCALE,
          y: FOOT_Y + (-63 - FOOT_Y) * BODY_SCALE,
          w: 94 * BODY_SCALE, h: (31 - (-63)) * BODY_SCALE };
        const canEdit = preparation === true &&
          String(command.playerId) === String(selfPlayerId) && entry.alpha > 0;
        const hits = canEdit ? [
          Object.freeze({ field: 'skin', playerId: String(command.playerId),
            ...transformedAabb(entry.transform, skinLocal) }),
          ...(entry.label ? [Object.freeze({ field: 'name',
            playerId: String(command.playerId), ...transformedAabb(entry.transform, plate) })] : [])
        ] : [];
        return { ...entry, layout, width, plate, hits };
      });
      frame.stage('player-nameplates');
      for (const entry of entries) {
        if (entry.alpha <= 0 || !entry.label) continue;
        const textTop = entry.plate.y + Math.max(0, (14 - entry.layout.height) / 2);
        if (!preparation && phase === 'playing' &&
            entirelyOffscreen(entry, viewport, textAtlas.textures, textTop)) continue;
        const transform = entry.transform;
        const plateAlpha = entry.alpha * .96;
        const radius = 6;
        for (let row = 0; row < 14; row++) {
          const distance = Math.min(row + .5, 13.5 - row);
          const inset = distance >= radius ? 0 :
            radius - Math.sqrt(Math.max(0, radius * radius - (radius - distance) ** 2));
          frame.rect(target, { x: entry.plate.x + inset,
            y: entry.plate.y + row, w: entry.width - inset * 2, h: 1,
            transform, color: [226 / 255, 232 / 255, 240 / 255, plateAlpha] });
        }
        for (const glyph of entry.layout.quads) frame.sprite(target, {
          x: -entry.layout.width / 2 + glyph.x,
          y: textTop + glyph.y, w: glyph.w, h: glyph.h, uv: glyph.uv,
          texture: textAtlas.textures[glyph.page], transform,
          color: [15 / 255, 23 / 255, 42 / 255, entry.alpha]
        });
      }
      const hits = Object.freeze(entries.flatMap(entry => entry.hits));
      return Object.freeze({ drawn: entries.filter(entry =>
        entry.alpha > 0 && entry.label).length, hits,
        geometry: Object.freeze(entries.map(entry => Object.freeze({
          playerId: String(entry.command.playerId), label: entry.label,
          width: entry.width, plate: Object.freeze({ ...entry.plate }),
          transform: Object.freeze([...entry.transform]), alpha: entry.alpha
        }))) });
    }
    return Object.freeze({ prepareLabels, record });
  }

  const api = Object.freeze({ create, constants: Object.freeze({ LABEL_LIMIT,
    LABEL_SIZE, PLATE_Y, BODY_SCALE }) });
  root.DvaWebGPUPlayerNameplates = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
