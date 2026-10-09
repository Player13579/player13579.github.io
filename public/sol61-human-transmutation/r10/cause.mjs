// Source/target ABI only. No visual design or GPU/audio operations.
export const EVENT_TYPE = 'alchemy-human-transmutation';
export const DEFAULT_DURATION_MS = 1200;
export const VERSION_ID = 'human-transmutation-sol61-r10';

const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const nonempty = v => typeof v === 'string' && v.trim().length > 0;

export function planHumanTransmutation({ event, target, visualElapsedMs, sprite, scope } = {}) {
  if (!event || event.type !== EVENT_TYPE || !nonempty(event.id) ||
      !nonempty(event.playerId) || !nonempty(event.targetId) ||
      !Number.isFinite(event.at) || !Number.isFinite(event.x) || !Number.isFinite(event.y)) {
    throw new TypeError('An exact successful human-transmutation producer event is required');
  }
  if (!target || String(target.id) !== event.targetId) {
    throw new TypeError('Revived targetId must match the actual target; caster fallback is forbidden');
  }
  if (!Number.isFinite(visualElapsedMs)) {
    throw new TypeError('Cause-bound visual elapsed milliseconds must be explicit');
  }
  if (!scope || !nonempty(scope.id) || !Number.isSafeInteger(scope.generation) || scope.generation < 0) {
    throw new TypeError('An explicit render scope and generation are required');
  }
  const durationMs = Number(event.durationMs) > 0 ? Number(event.durationMs) : DEFAULT_DURATION_MS;
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 12000) {
    throw new TypeError('Human-transmutation duration must be finite and positive');
  }
  const ended = visualElapsedMs < 0 || visualElapsedMs >= durationMs;
  const visible = target.alive === true && !target.ejected && !target.inVent && !target.invisible;
  if (ended || !visible) return Object.freeze({ active: false, causeId: event.id,
    targetId: event.targetId, scopeId: scope.id, generation: scope.generation,
    reason: ended ? 'outside-finite-lifetime' : 'target-not-visible' });
  if (!finitePoint(target.bodyScreen)) throw new TypeError('Same-frame revived target bodyScreen is required');
  if (!sprite || !nonempty(sprite.sourceSha256) || !/^[0-9a-f]{64}$/i.test(sprite.sourceSha256) ||
      ![sprite.textureWidth, sprite.textureHeight, sprite.crop?.x, sprite.crop?.y,
        sprite.crop?.width, sprite.crop?.height, sprite.origin?.x, sprite.origin?.y,
        sprite.scale, sprite.alphaSupport?.x, sprite.alphaSupport?.y,
        sprite.alphaSupport?.width, sprite.alphaSupport?.height].every(Number.isFinite) ||
      sprite.scale <= 0 || sprite.textureWidth <= 0 || sprite.textureHeight <= 0 ||
      sprite.crop.width <= 0 || sprite.crop.height <= 0 || sprite.alphaSupport.width <= 0 ||
      sprite.alphaSupport.height <= 0) {
    throw new TypeError('Version-bound original sprite, crop, registration and alpha support are required');
  }
  const c = sprite.crop, a = sprite.alphaSupport;
  if (c.x < 0 || c.y < 0 || c.x + c.width > sprite.textureWidth ||
      c.y + c.height > sprite.textureHeight || a.x < 0 || a.y < 0 ||
      a.x + a.width > c.width || a.y + a.height > c.height) {
    throw new RangeError('Sprite crop/support lies outside its actual source');
  }
  const rect = Object.freeze({
    x: target.bodyScreen.x - sprite.origin.x * sprite.scale,
    y: target.bodyScreen.y - sprite.origin.y * sprite.scale,
    width: c.width * sprite.scale, height: c.height * sprite.scale,
  });
  return Object.freeze({ active: true, causeId: event.id, casterId: event.playerId,
    targetId: event.targetId, eventAt: event.at,
    originWorld: Object.freeze({ x: event.x, y: event.y }),
    scopeId: scope.id, generation: scope.generation,
    elapsedMs: visualElapsedMs, durationMs, phaseMs: visualElapsedMs * DEFAULT_DURATION_MS / durationMs,
    spriteRect: rect,
    actualActorHeight: a.height * sprite.scale,
    spriteSourceSha256: sprite.sourceSha256,
    spriteUvRect: Object.freeze([c.x / sprite.textureWidth, c.y / sprite.textureHeight,
      c.width / sprite.textureWidth, c.height / sprite.textureHeight]),
    alphaSupportUv: Object.freeze([a.x / c.width, a.y / c.height,
      a.width / c.width, a.height / c.height]),
  });
}

