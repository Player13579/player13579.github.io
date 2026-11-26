/* Marker explanation on the shared main WebGPU frame. The caller owns the
 * explanation lifetime, pointer target, DOM fallback, and frame submission. */
(function (root) {
  'use strict';
  const finite = Number.isFinite;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const color = (r, g, b, a) => [r / 255, g / 255, b / 255, a];
  const CYAN = color(125, 211, 252, .92);
  const TITLE = color(248, 250, 252, 1);
  const DETAIL = color(241, 245, 249, 1);
  const WIDTH = 420;
  const segment = value => typeof Intl.Segmenter === 'function'
    ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value), part => part.segment)
    : Array.from(value);

  function requireViewport(viewport) {
    const logicalSizeReady = viewport?.responsiveMain === true
      ? finite(viewport.width) && viewport.width >= 980 && finite(viewport.height) && viewport.height >= 620
      : viewport?.width === 980 && viewport?.height === 620;
    if (viewport?.kind !== 'main' || !logicalSizeReady ||
        ![viewport.pixelWidth, viewport.pixelHeight].every(v => finite(v) && v > 0) ||
        !Array.isArray(viewport.logicalToPixel) || viewport.logicalToPixel.length !== 6 ||
        !viewport.logicalToPixel.every(finite) || viewport.logicalToPixel[0] <= 0 ||
        viewport.logicalToPixel[3] <= 0) {
      throw new TypeError('Committed main viewport required for marker explanation');
    }
  }

  function create({ textAtlas } = {}) {
    if (typeof textAtlas?.layout !== 'function' || !Array.isArray(textAtlas.textures)) {
      throw new TypeError('Shared GPU text atlas required');
    }
    function measure(value, size) {
      const layout = textAtlas.layout(value, { size, missing: 'replace' });
      if (!layout || !finite(layout.width) || layout.width < 0) throw new Error('Invalid marker text metric');
      return layout.width;
    }
    function wrap(value, size, maxWidth) {
      const lines = [];
      let line = '';
      for (const cluster of segment(String(value).normalize('NFC'))) {
        if (cluster === '\n' || cluster === '\r\n') { lines.push(line); line = ''; continue; }
        if (line && measure(line + cluster, size) > maxWidth) { lines.push(line); line = ''; }
        line += cluster;
      }
      lines.push(line);
      return lines;
    }
    function plan({ viewport, scene } = {}) {
      requireViewport(viewport);
      if (!scene) return Object.freeze({ drawn: false, domFallback: false, reason: 'empty' });
      if (typeof scene.title !== 'string' || typeof scene.detail !== 'string' ||
          ![scene.x, scene.y, scene.now, scene.startedAt].every(finite)) {
        throw new TypeError('Marker scene requires title, detail, anchor, now and startedAt');
      }
      const bubbleWidth = Math.max(1, Math.min(WIDTH, viewport.width - 20));
      const textWidth = Math.max(1, bubbleWidth - 28);
      const titleLines = wrap(scene.title, 14, textWidth);
      const detailLines = wrap(scene.detail, 11, textWidth);
      const titleLineHeight = 14 * 1.3, detailLineHeight = 11 * 1.4;
      const bubbleHeight = 28 + titleLines.length * titleLineHeight + detailLines.length * detailLineHeight;
      const alpha = 1 - (1 - clamp((scene.now - scene.startedAt) / 130, 0, 1)) ** 3;
      if (bubbleHeight > viewport.height - 20 || bubbleWidth < 218) {
        return Object.freeze({ drawn: false, domFallback: true, reason: 'oversized',
          anchorX: scene.x, anchorY: scene.y, bubbleWidth, bubbleHeight,
          titleLines, detailLines, alpha });
      }
      const above = scene.y >= bubbleHeight + 38;
      const bubbleX = clamp(scene.x - bubbleWidth / 2, 10, viewport.width - bubbleWidth - 10);
      const bubbleY = clamp(above ? scene.y - bubbleHeight - 24 : scene.y + 24,
        10, viewport.height - bubbleHeight - 10);
      const pointerX = clamp(scene.x, bubbleX + 18, bubbleX + bubbleWidth - 18);
      const pointerY = above ? bubbleY + bubbleHeight : bubbleY;
      return Object.freeze({ drawn: true, domFallback: false, bubbleX, bubbleY,
        bubbleWidth, bubbleHeight, textWidth, titleLines, detailLines,
        titleLineHeight, detailLineHeight, pointerX, pointerY,
        anchorX: scene.x, anchorY: scene.y, above, alpha });
    }
    async function prepare(input) {
      const result = plan(input);
      if (!result.drawn) return result;
      if (typeof textAtlas.ensure !== 'function') throw new TypeError('GPU text atlas ensure required');
      await textAtlas.ensure([...result.titleLines, ...result.detailLines].join('\n'));
      return result;
    }
    function line(frame, target, x1, y1, x2, y2, thickness, ink) {
      const length = Math.hypot(x2 - x1, y2 - y1);
      if (length < .001) return;
      frame.rect(target, { x: (x1 + x2) / 2 - length / 2,
        y: (y1 + y2) / 2 - thickness / 2, w: length, h: thickness,
        rotation: Math.atan2(y2 - y1, x2 - x1), color: ink });
    }
    function draw({ frame, target, viewport, scene, preparedPlan } = {}) {
      const result = preparedPlan || plan({ viewport, scene });
      if (!result.drawn) return result;
      requireViewport(viewport);
      if (typeof frame?.stage !== 'function' || typeof frame.rect !== 'function' ||
          typeof frame.sprite !== 'function' || typeof target !== 'string' || !target) {
        throw new TypeError('Shared frame and target required');
      }
      const lines = [
        ...result.titleLines.map((text, index) => ({ text, index, size: 14, title: true })),
        ...result.detailLines.map((text, index) => ({ text, index, size: 11, title: false }))
      ];
      const layouts = lines.map(item => textAtlas.layout(item.text, { size: item.size, missing: 'replace' }));
      for (const layout of layouts) {
        if (!Array.isArray(layout?.quads) || !finite(layout.width) || !finite(layout.height)) {
          throw new Error('Invalid marker atlas layout');
        }
        for (const glyph of layout.quads) {
          if (!textAtlas.textures[glyph.page]) throw new Error(`Marker atlas page ${glyph.page} is not loaded; call prepare first`);
        }
      }
      frame.stage('marker-explanation');
      const { bubbleX: x, bubbleY: y, bubbleWidth: w, bubbleHeight: h, alpha } = result;
      // Three soft outer rings approximate the former cyan shadow; each band
      // avoids overlap with the next to keep source-over alpha predictable.
      for (let ring = 3; ring >= 1; ring--) {
        const inset = ring * 3;
        const glow = color(34, 211, 238, alpha * (.035 + (4 - ring) * .018));
        frame.rect(target, { x: x - inset, y: y - inset, w: w + inset * 2, h: 2, color: glow });
        frame.rect(target, { x: x - inset, y: y + h + inset - 2, w: w + inset * 2, h: 2, color: glow });
        frame.rect(target, { x: x - inset, y: y - inset + 2, w: 2, h: h + inset * 2 - 4, color: glow });
        frame.rect(target, { x: x + w + inset - 2, y: y - inset + 2, w: 2, h: h + inset * 2 - 4, color: glow });
      }
      const bands = Math.ceil(h);
      for (let row = 0; row < bands; row++) {
        const top = y + row * h / bands, bottom = y + (row + 1) * h / bands;
        const distance = Math.min((row + .5) * h / bands, h - (row + .5) * h / bands);
        const inset = distance >= 8 ? 0 : 8 - Math.sqrt(Math.max(0, 64 - (8 - distance) ** 2));
        const t = (row + .5) / bands;
        const fill = color(8 + 12 * t, 26 + 13 * t, 40 + 15 * t, (.48 - .08 * t) * alpha);
        frame.rect(target, { x: x + inset, y: top, w: w - 2 * inset, h: bottom - top, color: fill });
      }
      const border = [...CYAN.slice(0, 3), CYAN[3] * alpha];
      for (let row = 0; row < bands; row++) {
        const top = y + row * h / bands, bottom = y + (row + 1) * h / bands;
        const distance = Math.min((row + .5) * h / bands, h - (row + .5) * h / bands);
        const inset = distance >= 8 ? 0 : 8 - Math.sqrt(Math.max(0, 64 - (8 - distance) ** 2));
        if (distance <= 2) frame.rect(target, { x: x + inset, y: top,
          w: w - 2 * inset, h: bottom - top, color: border });
        else {
          frame.rect(target, { x: x + inset, y: top, w: 2, h: bottom - top, color: border });
          frame.rect(target, { x: x + w - inset - 2, y: top, w: 2, h: bottom - top, color: border });
        }
      }
      // Triangle interior uses horizontal strips; edges use rotated primitive
      // rectangles, all within the existing shared frame.
      const px = result.pointerX, py = result.pointerY;
      const ax = result.anchorX, ay = result.anchorY;
      const steps = Math.max(1, Math.ceil(Math.abs(ay - py)));
      for (let row = 0; row < steps; row++) {
        const t = (row + .5) / steps;
        const cy = py + (ay - py) * t;
        const center = px + (ax - px) * t;
        const half = 8 * (1 - t);
        frame.rect(target, { x: center - half, y: cy - .5, w: Math.max(.01, half * 2), h: 1,
          color: color(14, 32, 48, .44 * alpha) });
      }
      line(frame, target, px - 8, py, ax, ay, 2, border);
      line(frame, target, ax, ay, px + 8, py, 2, border);
      for (let index = 0; index < lines.length; index++) {
        const item = lines[index], layout = layouts[index];
        const center = item.title
          ? y + 10 + result.titleLineHeight * (item.index + .5)
          : y + 18 + result.titleLines.length * result.titleLineHeight +
            result.detailLineHeight * (item.index + .5);
        const visible = layout.quads;
        const minY = visible.length ? Math.min(...visible.map(q => q.y)) : 0;
        const maxY = visible.length ? Math.max(...visible.map(q => q.y + q.h)) : layout.height;
        const top = center - (minY + maxY) / 2;
        const ink = item.title ? TITLE : DETAIL;
        for (const glyph of visible) frame.sprite(target, { x: x + 14 + glyph.x,
          y: top + glyph.y, w: glyph.w, h: glyph.h, uv: glyph.uv,
          texture: textAtlas.textures[glyph.page], color: [...ink.slice(0, 3), alpha] });
      }
      return result;
    }
    return Object.freeze({ plan, prepare, draw });
  }
  const api = Object.freeze({ create, supportsResponsiveMain: true });
  root.DvaWebGPUMarkerExplanation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
