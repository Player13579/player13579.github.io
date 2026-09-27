(function (root) {
  "use strict";

  const capturedPointers = new Map();
  const terminalPointerEvents = new Set(["pointerup", "pointercancel", "lostpointercapture"]);

  function resolveSurface({ webgpuCanvas, webgpuFrameCurrent, webgpuOwner }) {
    return webgpuOwner && webgpuFrameCurrent ? webgpuCanvas || null : null;
  }

  function bindSurfaceEvents({ surfaces, resolveActiveSurface, handlers }) {
    const removers = [];
    for (const surface of surfaces || []) {
      if (!surface?.addEventListener) continue;
      for (const [type, descriptor] of Object.entries(handlers || {})) {
        const handler = typeof descriptor === "function" ? descriptor : descriptor?.handler;
        if (typeof handler !== "function") continue;
        const options = typeof descriptor === "function" ? undefined : descriptor.options;
        const listener = (event) => {
          const capturedSurface = capturedPointers.get(event.pointerId);
          if (resolveActiveSurface() !== surface && capturedSurface !== surface) return;
          handler(event);
          if (terminalPointerEvents.has(type) && capturedSurface === surface)
            capturedPointers.delete(event.pointerId);
        };
        surface.addEventListener(type, listener, options);
        removers.push(() => surface.removeEventListener?.(type, listener, options));
      }
    }
    return () => removers.splice(0).forEach((remove) => remove());
  }

  function capturePointer(event, resolveActiveSurface) {
    const active = resolveActiveSurface?.();
    const target = event?.currentTarget === active ? event.currentTarget : active;
    if (!target?.setPointerCapture || event?.pointerId == null) return false;
    try {
      target.setPointerCapture(event.pointerId);
      capturedPointers.set(event.pointerId, target);
      return true;
    } catch {
      return false;
    }
  }

  const api = Object.freeze({ resolveSurface, bindSurfaceEvents, capturePointer });
  root.DvaWebGPUGameInputSurface = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
