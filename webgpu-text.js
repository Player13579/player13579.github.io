/* Offline-atlas text for DVA WebGPU primitive batches. Textures are loaded on
 * demand and unsupported clusters use a visible replacement glyph. No Canvas
 * 2D APIs or browser font rasterization are used. */
(function (root) {
  'use strict';
  const finite = n => typeof n === 'number' && Number.isFinite(n);

  function clusters(value) {
    const normalized = value.normalize('NFC');
    if (typeof Intl.Segmenter === 'function') {
      return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        .segment(normalized), part => part.segment);
    }
    const result = [];
    for (const char of normalized) {
      if (result.length && (/[\p{M}\uFE0E\uFE0F]/u.test(char) ||
          result[result.length - 1].endsWith('\u200D') || char === '\u200D')) {
        result[result.length - 1] += char;
      } else result.push(char);
    }
    return result;
  }

  function glyphFor(cluster, glyphs) {
    const codepoints = Array.from(cluster);
    if (codepoints.length === 1) return glyphs[codepoints[0].codePointAt(0)];
    if (codepoints.length === 2 && /[\uFE0E\uFE0F]/u.test(codepoints[1])) {
      return glyphs[codepoints[0].codePointAt(0)];
    }
    return undefined;
  }

  function create({ manifest, textures } = {}) {
    if (!manifest || manifest.schema !== 'dva-webgpu-text-atlas-v1' ||
        !finite(manifest.pixelSize) || manifest.pixelSize <= 0 ||
        !finite(manifest.ascent) || !finite(manifest.descent) ||
        !finite(manifest.pageSize) || manifest.pageSize <= 0 ||
        !Array.isArray(manifest.pages) || !manifest.glyphs ||
        !Array.isArray(textures) || textures.length !== manifest.pages.length) {
      throw new TypeError('Valid text atlas and one GPU texture per page required');
    }
    const glyphs = manifest.glyphs;
    const fallback = glyphs[manifest.fallbackCodepoint || 0xfffd];
    const lineHeight = manifest.ascent + manifest.descent;
    function layout(text, { x = 0, y = 0, size = manifest.pixelSize, missing = 'replace' } = {}) {
      if (typeof text !== 'string' || ![x, y, size].every(finite) || size <= 0) {
        throw new TypeError('Text and finite position/size required');
      }
      if (!['error', 'skip', 'replace'].includes(missing)) throw new RangeError('Invalid missing-glyph policy');
      if (missing === 'replace' && !fallback) throw new Error('Visible fallback glyph required');
      const scale = size / manifest.pixelSize;
      const quads = [], absent = [];
      let penX = x, baseline = y + manifest.ascent * scale, maxWidth = 0, lines = 1;
      for (const character of clusters(text)) {
        if (character === '\r') continue;
        if (character === '\n' || character === '\r\n') {
          maxWidth = Math.max(maxWidth, penX - x);
          penX = x;
          baseline += lineHeight * scale;
          lines++;
          continue;
        }
        if (character === '\t') {
          const space = glyphs[32];
          penX += (space ? space.advance : manifest.pixelSize / 2) * scale * 4;
          continue;
        }
        let glyph = glyphFor(character, glyphs);
        if (!glyph) {
          absent.push(character);
          if (missing === 'replace') glyph = fallback;
          else continue;
        }
        if (glyph.w > 0 && glyph.h > 0) {
          if (!Number.isInteger(glyph.page) || glyph.page < 0 || glyph.page >= textures.length ||
              ![glyph.x, glyph.y, glyph.w, glyph.h, glyph.left, glyph.top, glyph.advance].every(finite) ||
              glyph.x < 0 || glyph.y < 0 || glyph.x + glyph.w > manifest.pageSize ||
              glyph.y + glyph.h > manifest.pageSize) throw new Error('Invalid atlas glyph');
          quads.push({
            page: glyph.page, x: penX + glyph.left * scale, y: baseline + glyph.top * scale,
            w: glyph.w * scale, h: glyph.h * scale,
            uv: [glyph.x / manifest.pageSize, glyph.y / manifest.pageSize,
              glyph.w / manifest.pageSize, glyph.h / manifest.pageSize],
          });
        }
        penX += glyph.advance * scale;
      }
      if (absent.length && missing === 'error') {
        const codepoints = [...new Set(absent.flatMap(c => Array.from(c, cp =>
          `U+${cp.codePointAt(0).toString(16).toUpperCase()}`)))];
        throw new Error(`Text atlas missing glyphs: ${codepoints.join(', ')}`);
      }
      maxWidth = Math.max(maxWidth, penX - x);
      return Object.freeze({ width: maxWidth, height: lines * lineHeight * scale,
        missing: Object.freeze(absent), quads: Object.freeze(quads) });
    }
    function draw(batch, text, options = {}) {
      if (!batch || typeof batch.sprite !== 'function') throw new TypeError('WebGPU primitive batch required');
      const color = options.color || [1, 1, 1, 1];
      if (!Array.isArray(color) || color.length !== 4 || color.some(v => !finite(v) || v < 0 || v > 1)) {
        throw new RangeError('Color must be RGBA values in 0..1');
      }
      const result = layout(text, options);
      const unavailable = result.quads.find(q => !textures[q.page]);
      if (unavailable) throw new Error(`Text atlas page ${unavailable.page} is not loaded; call ensure(text)`);
      for (const q of result.quads) {
        batch.sprite({
        x: q.x, y: q.y, w: q.w, h: q.h, uv: q.uv,
        texture: textures[q.page], color, mode: 'source-over'
        });
      }
      return result;
    }
    return Object.freeze({ layout, draw, lineHeight });
  }

  async function upload({ device, manifest, baseUrl = root.location?.href, fetcher = root.fetch,
    decode = root.createImageBitmap, eager = false } = {}) {
    if (!device || typeof device.createTexture !== 'function' || !device.queue?.copyExternalImageToTexture ||
        typeof fetcher !== 'function' || typeof decode !== 'function' ||
        !manifest || manifest.schema !== 'dva-webgpu-text-atlas-v1' ||
        !Array.isArray(manifest.pages) || !Number.isInteger(manifest.pageSize) ||
        manifest.pageSize < 1 || !baseUrl) {
      throw new TypeError('WebGPU device, fetch, and createImageBitmap required');
    }
    const textures = Array(manifest.pages.length).fill(null);
    const pending = new Map();
    let destroyed = false;
    async function loadPage(index) {
      if (destroyed) throw new Error('Text atlas has been destroyed');
      if (textures[index]) return;
      if (pending.has(index)) return pending.get(index);
      const promise = (async () => {
        const page = manifest.pages[index];
        if (typeof page !== 'string' || !/^atlas-\d+\.png$/.test(page)) throw new Error('Invalid atlas page');
        const url = new URL(page, baseUrl).href;
        let response, retried = false;
        try {
          response = await fetcher(url);
        } catch (error) {
          // Fetch reports network failures as TypeError. Do not retry an abort.
          if (destroyed || !(error instanceof TypeError)) throw error;
          retried = true;
          response = await fetcher(url, { cache: 'reload' });
        }
        if (!response?.ok && !retried && !destroyed &&
            (response?.status === 408 || (response?.status >= 500 && response.status <= 599))) {
          // At most one retry per page load, including in the network-error path.
          response = await fetcher(url, { cache: 'reload' });
        }
        if (!response?.ok) throw new Error(`Atlas page failed: ${page}`);
        const bitmap = await decode(await response.blob());
        try {
          if (bitmap.width !== manifest.pageSize || bitmap.height !== manifest.pageSize) throw new Error('Atlas page size mismatch');
          const texture = device.createTexture({ label: `DVA text ${page}`,
            size: [bitmap.width, bitmap.height], format: 'rgba8unorm', usage: 0x04 | 0x02 | 0x10 });
          try {
            device.queue.copyExternalImageToTexture(
              { source: bitmap, flipY: false }, { texture, premultipliedAlpha: true },
              [bitmap.width, bitmap.height]);
            if (destroyed) throw new Error('Text atlas has been destroyed');
            textures[index] = texture;
          } catch (error) { texture.destroy(); throw error; }
        } finally { bitmap.close?.(); }
      })();
      pending.set(index, promise);
      try { await promise; } finally { pending.delete(index); }
    }
    const api = create({ manifest, textures });
    const uploaded = Object.freeze({ ...api, textures,
      async ensure(text) {
        const pages = [...new Set(api.layout(text).quads.map(q => q.page))];
        await Promise.all(pages.map(loadPage));
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        textures.forEach(t => t?.destroy());
        textures.fill(null);
      }
    });
    if (eager) {
      try { await Promise.all(manifest.pages.map((_, i) => loadPage(i))); }
      catch (error) { uploaded.destroy(); throw error; }
    }
    return uploaded;
  }

  const api = Object.freeze({ create, upload });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DvaWebGPUText = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
