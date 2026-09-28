export const H64_READBACK_SOURCE = 'public/shoot-pro-r03/src/renderer.js#ShotRenderer.readPixels';

export function selectH64CaptureShot(shots, variant, targetAgeMs = 80, toleranceMs = 24) {
  if (!Array.isArray(shots) || !Number.isFinite(targetAgeMs) || !Number.isFinite(toleranceMs) || toleranceMs < 0) {
    throw new TypeError('invalid H64 capture request');
  }
  const targetAge = targetAgeMs / 1000;
  const tolerance = toleranceMs / 1000;
  return shots
    .filter(shot => shot.variant === variant && Number.isFinite(shot.age) && shot.age > 0 && shot.age < shot.life && Math.abs(shot.age - targetAge) <= tolerance)
    .sort((a, b) => Math.abs(a.age - targetAge) - Math.abs(b.age - targetAge))[0] ?? null;
}

export async function captureH64(renderer, shot, { variant, background, canvasRect, frame }) {
  if (!renderer || typeof renderer.readPixels !== 'function' || !shot || shot.variant !== variant) {
    throw new TypeError('renderer and matching active shot are required');
  }
  const pixels = await renderer.readPixels();
  if (!(pixels.rgba instanceof Uint8Array) || pixels.width !== 320 || pixels.height !== 64 || pixels.rgba.length !== 320 * 64 * 4) {
    throw new Error('readPixels did not return the native 320×64 H64 buffer');
  }
  return {
    source: H64_READBACK_SOURCE,
    variant,
    weaponId: shot.id,
    ageMs: shot.age * 1000,
    lifeMs: shot.life * 1000,
    background,
    frame,
    rendererVisibleShots: renderer.stats?.visibleShots ?? null,
    h64: { width: pixels.width, height: pixels.height, cssWidth: canvasRect.width, cssHeight: canvasRect.height },
    rgba: pixels.rgba
  };
}
