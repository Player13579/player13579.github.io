export function backingProjectionScale(worldToCssScale, backingWidth, cssWidth) {
  if (![worldToCssScale, backingWidth, cssWidth].every(Number.isFinite) || worldToCssScale <= 0 || backingWidth <= 0 || cssWidth <= 0) return null;
  const result = worldToCssScale * (backingWidth / cssWidth);
  return Number.isFinite(result) && result > 0 ? result : null;
}
