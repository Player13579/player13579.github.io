/** Shared runtime size gate. Invalid dimensions have no resize side effects. */
export function measureCanvasPixels(rect, dpr) {
  if (!Number.isFinite(dpr) || dpr <= 0 || !Number.isFinite(rect?.width) ||
      !Number.isFinite(rect?.height) || rect.width <= 0 || rect.height <= 0) return null;
  const width = Math.round(rect.width * dpr);
  const height = Math.round(rect.height * dpr);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) return null;
  return Object.freeze({ width, height, dpr });
}

export function createCanvasSizeGate({ getRect, getDpr, onResize, getSize }) {
  let deferred = false;
  return Object.freeze({
    sync() {
      const pixels = measureCanvasPixels(getRect(), getDpr());
      if (!pixels) {
        const becameDeferred = !deferred;
        deferred = true;
        return Object.freeze({ valid: false, changed: false, restored: false, becameDeferred });
      }
      const [oldWidth, oldHeight] = getSize();
      const changed = pixels.width !== oldWidth || pixels.height !== oldHeight;
      const restored = deferred;
      deferred = false;
      if (changed) onResize(pixels.width, pixels.height, pixels.dpr);
      return Object.freeze({ valid: true, changed, restored, width: pixels.width, height: pixels.height, dpr: pixels.dpr });
    },
    get deferred() { return deferred; }
  });
}

/** Ensures an invalid frame cannot invoke its allocator/encoder/submission body. */
export function runSizedFrame(syncSize, render) {
  const size = syncSize();
  if (!size.valid) return Object.freeze({ deferred: true, reason: 'invalid-canvas-size' });
  return render(size);
}

export function runLiveSizedFrame(isLive, syncSize, render) {
  if (!isLive()) return null;
  return runSizedFrame(syncSize, render);
}
