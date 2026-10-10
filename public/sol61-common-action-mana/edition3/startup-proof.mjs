const MIN_STARTUP_AGE_MS = 80;

function halfToNumber(bits) {
  const sign = (bits & 0x8000) ? -1 : 1;
  const exponent = (bits >>> 10) & 0x1f;
  const fraction = bits & 0x03ff;
  if (exponent === 0x1f) return fraction ? NaN : sign * Infinity;
  if (exponent === 0) return fraction === 0 ? sign * 0 : sign * 2 ** -14 * (fraction / 1024);
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

export function isStartupSourceProofValid({ ageMs, sourceActive, frameCauseId, currentCauseId, bytes, bytesPerRow, width, height }) {
  if (!Number.isFinite(ageMs) || ageMs < MIN_STARTUP_AGE_MS || sourceActive !== true ||
      !frameCauseId || frameCauseId !== currentCauseId || !(bytes instanceof ArrayBuffer) ||
      !Number.isSafeInteger(bytesPerRow) || bytesPerRow < width * 8 ||
      !Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1 ||
      bytes.byteLength < bytesPerRow * height) return false;
  const view = new DataView(bytes);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelOffset = y * bytesPerRow + x * 8;
      for (let channel = 0; channel < 3; channel++) {
        const value = halfToNumber(view.getUint16(pixelOffset + channel * 2, true));
        if (Number.isFinite(value) && value > 0) return true;
      }
    }
  }
  return false;
}
