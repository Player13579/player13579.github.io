/* Main-frame WebGPU mode banner. The caller supplies authoritative mode state,
 * the committed logical main viewport, shared renderer frame and text atlas.
 * Schedule after minimap and before sensory. */
(function (root) {
  'use strict';

  const PANEL = Object.freeze([8 / 255, 25 / 255, 32 / 255, .88]);
  const INK = Object.freeze([236 / 255, 254 / 255, 1, 1]);
  const finite = Number.isFinite;

  // The caller must compute throwTargetClairvoyanceActive with the same game
  // rules as app.js, and resolve the followed/aimed player names before drawing.
  function message(scene) {
    if (!scene) return null;
    if (scene.throwTargetClairvoyanceActive) return '千里眼 / 着地点追従 / 全域投擲';
    if (scene.clairvoyanceActive) {
      return `千里眼 / ${scene.followTargetName || '追尾先なし'}を追尾 / ←→で切替 / Zで解除`;
    }
    if (!scene.aimTargetId) return null;
    const remaining = Math.max(0, Number(scene.aimReadyAt) - Number(scene.now));
    if (!finite(remaining)) throw new TypeError('Aim mode requires finite aimReadyAt and now');
    const name = scene.aimTargetName || '対象';
    return remaining > 0
      ? `忍殺静止中: ${name} / 残り ${(remaining / 1000).toFixed(1)}秒`
      : `${scene.special === 'assassin' ? '忍殺キル（死体なし）' : '忍殺撃破'}処理中: ${name}`;
  }

  async function prepare(scene, textAtlas) {
    const value = message(scene);
    if (!value) return false;
    if (typeof textAtlas?.ensure !== 'function') throw new TypeError('Shared GPU text atlas required');
    await textAtlas.ensure(value);
    return true;
  }

  function create({ textAtlas } = {}) {
    if (typeof textAtlas?.layout !== 'function' || !Array.isArray(textAtlas.textures)) {
      throw new TypeError('Shared GPU text atlas required');
    }
    function draw({ frame, target, viewport, scene } = {}) {
      const value = message(scene);
      if (!value) return Object.freeze({ drawn: false });
      if (typeof frame?.stage !== 'function' || typeof frame?.rect !== 'function' ||
          typeof frame?.sprite !== 'function' || typeof target !== 'string' || !target ||
          viewport?.kind !== 'main' || ![viewport.width, viewport.height,
            viewport.pixelWidth, viewport.pixelHeight].every(v => finite(v) && v > 0) ||
          !Array.isArray(viewport.logicalToPixel) || viewport.logicalToPixel.length !== 6 ||
          !viewport.logicalToPixel.every(finite)) {
        throw new TypeError('Shared frame, target and committed main viewport required');
      }
      if (viewport.logicalToPixel[0] <= 0 || viewport.logicalToPixel[3] <= 0) {
        throw new RangeError('Viewport pixel scale must be positive');
      }
      const layout = textAtlas.layout(value, { size: 13 });
      if (!Array.isArray(layout?.quads) || !finite(layout.width) || !finite(layout.height)) {
        throw new Error('Invalid mode banner text layout');
      }
      for (const glyph of layout.quads) {
        if (!textAtlas.textures[glyph.page]) throw new Error('Mode banner text atlas page is not loaded');
      }
      frame.stage('mode-banner');
      const x = viewport.width / 2 - 180;
      // At radius 6, one-logical-pixel horizontal bands reproduce the
      // roundRect silhouette to within half a logical pixel. Bands do not
      // overlap, preserving the original 0.88 alpha at every covered point.
      for (let row = 0; row < 34; row++) {
        const distance = Math.min(row + .5, 33.5 - row);
        const inset = distance >= 6 ? 0 : 6 - Math.sqrt(36 - (6 - distance) ** 2);
        frame.rect(target, { x: x + inset, y: 16 + row,
          w: 360 - 2 * inset, h: 1, color: PANEL });
      }
      const left = viewport.width / 2 - layout.width / 2;
      const top = 33 - layout.height / 2;
      for (const glyph of layout.quads) {
        frame.sprite(target, { x: left + glyph.x, y: top + glyph.y,
          w: glyph.w, h: glyph.h, uv: glyph.uv,
          texture: textAtlas.textures[glyph.page], color: INK });
      }
      return Object.freeze({ drawn: true, message: value, glyphs: layout.quads.length });
    }
    return Object.freeze({ prepare: scene => prepare(scene, textAtlas), draw });
  }

  const api = Object.freeze({ message, prepare, create });
  root.DvaWebGPUModeBanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
