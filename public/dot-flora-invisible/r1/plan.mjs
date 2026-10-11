const finite = Number.isFinite;
const MAX_DURATION_MS = 1600;
const DEFAULT_MAGIC_DURATION_MS = 1200;
const PROFILE = Object.freeze({ radiusX: 59, radiusY: 77, anchorY: 48 });

/**
 * Adapt a server event to the app.js local consumer contract. app.js stamps
 * startedAt from its local receivedAt/frameNow clock and uses
 * max(magicEffectDuration(type), durationMs); event.at is server-clock data.
 */
export function normalizeRawEvent(rawEvent, receivedAt) {
  if (!rawEvent || typeof rawEvent !== 'object' || !finite(receivedAt) || receivedAt < 0) return null;
  if (rawEvent.type !== 'flora-invisible' || !finite(rawEvent.at) || rawEvent.at < 0 ||
      typeof rawEvent.id !== 'string' || !rawEvent.id ||
      typeof rawEvent.playerId !== 'string' || !rawEvent.playerId ||
      typeof rawEvent.viewerId !== 'string' || !rawEvent.viewerId ||
      !finite(rawEvent.durationMs) || rawEvent.durationMs <= 0) return null;
  // Match app.js's consumer conversion, without treating raw event.at as a
  // timestamp in the page's performance.now domain.
  return Object.freeze({
    ...rawEvent,
    startedAt: receivedAt,
    duration: Math.max(DEFAULT_MAGIC_DURATION_MS, rawEvent.durationMs)
  });
}

export function outsideViewport({ type, player, camera, zoom, viewport } = {}) {
  if (type !== 'flora-invisible' || !player || !camera || viewport?.kind !== 'main' ||
      ![player.x, player.y, camera.x, camera.y, zoom, viewport.width, viewport.height,
        viewport.pixelWidth, viewport.pixelHeight].every(finite) || zoom <= 0 ||
      viewport.width <= 0 || viewport.height <= 0 || viewport.pixelWidth <= 0 || viewport.pixelHeight <= 0) return false;
  const sx = zoom * viewport.pixelWidth / viewport.width;
  const sy = zoom * viewport.pixelHeight / viewport.height;
  const centerX = (player.x - camera.x) * sx;
  const centerY = (player.y - PROFILE.anchorY - camera.y) * sy;
  const radiusX = PROFILE.radiusX * sx;
  const radiusY = PROFILE.radiusY * sy;
  return [centerX, centerY, radiusX, radiusY].every(finite) &&
    (centerX + radiusX * 1.25 < 0 || centerX - radiusX * 1.25 > viewport.pixelWidth ||
      centerY + radiusY * 1.25 < 0 || centerY - radiusY * 1.25 > viewport.pixelHeight);
}

export function plan({ effect, player, viewerId, now, phase, camera, zoom, viewport,
  reducedMotion = false, alpha = 1 } = {}) {
  if (!effect || !player || phase !== 'playing' || effect.type !== 'flora-invisible' ||
      typeof effect.id !== 'string' || !effect.id || typeof effect.playerId !== 'string' ||
      typeof player.id !== 'string' || effect.playerId !== player.id ||
      effect.viewerId !== viewerId || viewerId !== player.id ||
      !player.alive || player.ejected || player.inVent || !finite(player.x) || !finite(player.y) ||
      !finite(effect.startedAt) || effect.startedAt < 0 || !finite(effect.duration) || effect.duration <= 0 ||
      !finite(now) || now < 0 || !finite(alpha) || alpha <= 0 || alpha > 1) return null;
  if (!camera || viewport?.kind !== 'main' ||
      ![camera.x, camera.y, zoom, viewport.width, viewport.height,
        viewport.pixelWidth, viewport.pixelHeight].every(finite) || zoom <= 0 ||
      viewport.width <= 0 || viewport.height <= 0 || !Number.isInteger(viewport.pixelWidth) ||
      !Number.isInteger(viewport.pixelHeight) || viewport.pixelWidth <= 0 || viewport.pixelHeight <= 0) return null;

  const durationMs = Math.min(effect.duration, MAX_DURATION_MS);
  const elapsed = now - effect.startedAt;
  if (elapsed < 0 || elapsed >= durationMs) return null;

  const sx = zoom * viewport.pixelWidth / viewport.width;
  const sy = zoom * viewport.pixelHeight / viewport.height;
  const centerX = (player.x - camera.x) * sx;
  const centerY = (player.y - PROFILE.anchorY - camera.y) * sy;
  const radiusX = PROFILE.radiusX * sx;
  const radiusY = PROFILE.radiusY * sy;
  if (![centerX, centerY, radiusX, radiusY].every(finite) || radiusX <= 0 || radiusY <= 0 ||
      outsideViewport({ type: effect.type, player, camera, zoom, viewport })) return null;
  return Object.freeze({
    effectId: effect.id,
    actorId: player.id,
    type: effect.type,
    privateCue: true,
    progress: elapsed / durationMs,
    durationMs,
    reducedMotion: Boolean(reducedMotion),
    alpha,
    centerX,
    centerY,
    radiusX,
    radiusY,
    pixelWidth: viewport.pixelWidth,
    pixelHeight: viewport.pixelHeight,
    sourceOrigin: effect.startedAt,
    sourceNow: now
  });
}

export function pack(p) {
  if (!p || ![p.progress, p.durationMs, p.alpha, p.centerX, p.centerY,
    p.radiusX, p.radiusY, p.pixelWidth, p.pixelHeight].every(finite) ||
      p.durationMs <= 0 || p.progress < 0 || p.progress >= 1 ||
      p.radiusX <= 0 || p.radiusY <= 0 || p.alpha <= 0 || p.alpha > 1 ||
      !Number.isInteger(p.pixelWidth) || !Number.isInteger(p.pixelHeight) ||
      p.pixelWidth <= 0 || p.pixelHeight <= 0 || typeof p.reducedMotion !== 'boolean') {
    throw new TypeError('Valid Flora invisibility plan required');
  }
  const values = new Float32Array([
    p.pixelWidth, p.pixelHeight, p.centerX, p.centerY,
    p.radiusX, p.radiusY, 0, 0,
    p.progress, 1, p.reducedMotion ? 1 : 0, p.alpha,
    0, 0, 0, 0
  ]);
  if (!values.every(finite)) throw new RangeError('Flora invisibility plan exceeds float32 range');
  return values;
}



