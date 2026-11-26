/* Immutable viewport coordinates for WebGPU presentation and input. */
(function (root) {
  'use strict';

  const SIZES = Object.freeze({ main: Object.freeze([980, 620]), expanded: Object.freeze([1200, 760]) });
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const positive = value => finite(value) && value > 0;
  const matrix = (a, d, e = 0, f = 0) => Object.freeze([a, 0, 0, d, e, f]);
  const inverse = value => matrix(1 / value[0], 1 / value[3], -value[4] / value[0], -value[5] / value[3]);
  const transform = (value, x, y) => Object.freeze({ x: value[0] * x + value[4], y: value[3] * y + value[5] });

  function mainLogicalSize(rect, responsiveMain = false) {
    if (!responsiveMain || !positive(rect?.width) || !positive(rect?.height)) return SIZES.main;
    const [baseWidth, baseHeight] = SIZES.main;
    const scale = Math.min(rect.width / baseWidth, rect.height / baseHeight);
    // Presentation passes are authored for integer logical dimensions.
    // Round the fitted axis (at most half a logical unit) before committing
    // projection, hit testing, and the physical drawing surface.
    const width = Math.min(8192, Math.max(baseWidth, Math.round(rect.width / scale)));
    const height = Math.min(8192, Math.max(baseHeight, Math.round(rect.height / scale)));
    return positive(width) && positive(height) ? Object.freeze([width, height]) : SIZES.main;
  }

  function createSnapshot(options) {
    const kind = options?.kind || 'main';
    const size = SIZES[kind];
    if (!size) throw new RangeError('Unknown viewport kind');
    const rect = options?.rect;
    if (!rect || !finite(rect.left) || !finite(rect.top) || !positive(rect.width) || !positive(rect.height)) {
      throw new RangeError('Viewport CSS rectangle must be visible and finite');
    }
    const responsiveMain = kind === 'main' && options?.responsiveMain === true;
    const [width, height] = responsiveMain ? mainLogicalSize(rect, true) : size;
    // Existing pointer input maps each CSS axis independently. The expanded
    // map may have a noncanonical CSS aspect ratio in the responsive dialog;
    // preserve that mapping instead of rejecting otherwise valid taps.
    const dpr = options.dpr ?? 1;
    const max = options.maxTextureDimension2D ?? 8192;
    if (!positive(dpr) || !Number.isInteger(max) || max < 1) throw new RangeError('Invalid backing limit or DPR');
    const backingScale = Math.min(dpr, max / rect.width, max / rect.height);
    const pixelWidth = Math.max(1, Math.min(max, Math.round(rect.width * backingScale)));
    const pixelHeight = Math.max(1, Math.min(max, Math.round(rect.height * backingScale)));
    const cssToLogical = matrix(width / rect.width, height / rect.height,
      -rect.left * width / rect.width, -rect.top * height / rect.height);
    const logicalToPixel = matrix(pixelWidth / width, pixelHeight / height);
    let worldToLogical, committedMainCamera;
    if (kind === 'expanded') {
      const map = options.map;
      if (!positive(map?.width) || !positive(map?.height)) throw new RangeError('Expanded viewport requires map dimensions');
      const padding = options.padding ?? 38;
      if (!finite(padding) || padding < 0 || padding * 2 >= Math.min(width, height)) throw new RangeError('Invalid expanded map padding');
      const scale = Math.min((width - padding * 2) / map.width, (height - padding * 2) / map.height);
      worldToLogical = matrix(scale, scale, (width - map.width * scale) / 2, (height - map.height * scale) / 2);
    } else {
      const camera = options.camera || { x: 0, y: 0, zoom: 1 };
      if (!finite(camera.x) || !finite(camera.y) || !positive(camera.zoom)) throw new RangeError('Invalid world camera');
      worldToLogical = matrix(camera.zoom, camera.zoom, -camera.x * camera.zoom, -camera.y * camera.zoom);
      if (responsiveMain) committedMainCamera = Object.freeze({ x: camera.x, y: camera.y, zoom: camera.zoom });
    }
    const worldToPixel = matrix(worldToLogical[0] * logicalToPixel[0],
      worldToLogical[3] * logicalToPixel[3],
      worldToLogical[4] * logicalToPixel[0], worldToLogical[5] * logicalToPixel[3]);
    const snapshot = {
      kind, width, height, pixelWidth, pixelHeight, dpr: backingScale,
      ...(responsiveMain ? { responsiveMain: true, committedMainCamera } : {}),
      rect: Object.freeze({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }),
      cssToLogical, logicalToCss: inverse(cssToLogical),
      logicalToPixel, pixelToLogical: inverse(logicalToPixel),
      worldToLogical, logicalToWorld: inverse(worldToLogical),
      worldToPixel, pixelToWorld: inverse(worldToPixel),
      pointer(clientX, clientY) {
        if (!finite(clientX) || !finite(clientY)) return null;
        return transform(cssToLogical, clientX, clientY);
      },
      world(x, y) { return transform(worldToLogical, x, y); },
      unproject(x, y) { return transform(snapshot.logicalToWorld, x, y); }
    };
    return Object.freeze(snapshot);
  }

  function validSample(sample) {
    if (!sample || sample.hidden) return false;
    const values = [sample.width, sample.height, sample.visualWidth, sample.visualHeight,
      sample.rootWidth, sample.rootHeight];
    if (!values.every(value => finite(value) && value >= 120)) return false;
    const mismatch = (a, b) => Math.abs(a - b) > Math.max(2, a * 0.03);
    if (mismatch(sample.width, sample.visualWidth) ||
        mismatch(sample.width, sample.rootWidth) ||
        mismatch(sample.height, sample.rootHeight)) return false;
    if (!mismatch(sample.height, sample.visualHeight)) return true;
    // Safari's persistent browser chrome can shorten only the visual viewport.
    // The app marks this inset ready after observing a stable foreground sample;
    // a transient resume or keyboard sample must not reach the canvas gate.
    const scale = sample.visualViewportScale ?? 1;
    const deficit = sample.height - sample.visualHeight;
    return sample.visualInsetReady === true && sample.editableViewportFocus !== true &&
      finite(scale) && Math.abs(scale - 1) <= 0.01 &&
      deficit > 0 && deficit <= Math.min(160, sample.height * 0.25);
  }

  function sampleKey(sample) {
    return [sample.width, sample.height, sample.visualWidth, sample.visualHeight,
      sample.rootWidth, sample.rootHeight].map(value => Math.round(value * 10)).join(':');
  }

  function createStableGate() {
    let committed = null;
    let key = '';
    let frames = 0;
    let suspended = true;
    return Object.freeze({
      get snapshot() { return committed; },
      get suspended() { return suspended; },
      suspend() { suspended = true; key = ''; frames = 0; },
      observe(sample, options) {
        if (!validSample(sample)) { key = ''; frames = 0; return null; }
        let next;
        try { next = createSnapshot(options); } catch (_) { key = ''; frames = 0; return null; }
        const nextKey = sampleKey(sample) + ':' + [next.kind, next.rect.left, next.rect.top,
          next.rect.width, next.rect.height, next.pixelWidth, next.pixelHeight,
          next.width, next.height, Boolean(next.responsiveMain)].join(':');
        frames = nextKey === key ? frames + 1 : 1;
        key = nextKey;
        if (frames < 2) return null;
        committed = next;
        suspended = false;
        return next;
      }
    });
  }

  const api = Object.freeze({ SIZES, mainLogicalSize, createSnapshot, createStableGate, validSample, transform });
  root.DvaWebGPUViewport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
