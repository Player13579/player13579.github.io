/* Main-frame HUD. All geometry is in logical viewport pixels; CSS dimensions
 * affect only the legacy responsive HUD scale. The caller owns the GPU frame. */
(function (root) {
  'use strict';
  const finite = Number.isFinite;
  const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
  const rgba = (hex, alpha = 1) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, alpha];
  };
  const colors = Object.freeze({ panel: rgba('#081820', .88), border: rgba('#67e8f9', .7),
    track: [1, 1, 1, .14] });
  const number = (value, fallback = 0) => Number(value) || fallback;
  const compact = (value, integer = false) => {
    const n = Number(value);
    if (!finite(n)) return '∞';
    if (Math.abs(n) >= 1_000_000) return n.toExponential(Math.abs(n) >= 1_000_000_000 ? 0 : 1).replace('e+', 'e');
    return String(integer ? Math.round(n) : Math.round(n * 100) / 100);
  };
  const healthString = n => n > 0 && n < .001 ? n.toFixed(4) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  const readyString = (label, ms) => ms <= 0 ? `${label} READY` : `${label} ${Math.ceil(ms / 1000)}s`;

  function plan({ data, viewport, scene = {}, measure } = {}) {
    if (!viewport || viewport.kind !== 'main' || ![viewport.width, viewport.height].every(v => finite(v) && v > 0)) {
      throw new TypeError('HUD requires a logical main viewport');
    }
    if (typeof measure !== 'function') throw new TypeError('HUD requires atlas-derived measure(text, size)');
    const self = data?.self;
    const empty = () => ({ drawn: false, bars: [], shapes: [], texts: [], acquisitionHudRects: {}, acquisitionCreditRect: null });
    if (!self || !['playing', 'meeting'].includes(data.phase)) return empty();
    const w = viewport.width, h = viewport.height;
    if (!finite(scene.now) || !finite(scene.mana)) throw new TypeError('HUD requires precomputed server now and displayed mana');
    const timestamp = scene.now;
    const stamina = number(self.stamina), mana = scene.mana;
    const healthFloor = self.limitBreakPassive ? 1 : 2;
    const serializedHealth = Number(self.health);
    const health = self.alive ? Math.max(0, finite(serializedHealth) ? serializedHealth :
      Math.max(0, healthFloor - number(self.bodyHits)) + Math.max(0, number(self.overheal))) : 0;
    const maxHealth = Math.max(healthFloor, number(self.maxHealth, healthFloor), health);
    const cooldown = Math.max(0, number(self.killReadyAt) - timestamp);
    const empCooldown = Math.max(0, number(self.empReadyAt) - timestamp);
    const vibeCooldown = self.special === 'alchemist' ? Math.max(0, number(self.vibeCodingReadyAt) - timestamp) : 0;
    const maxStamina = Math.max(100, number(self.maxStoredStamina, 500));
    const manaMax = Math.max(2, number(self.maxMana, 2));
    const acceleration = self.accelerationMultiplier != null && finite(Number(self.accelerationMultiplier))
      ? Math.max(0, Number(self.accelerationMultiplier)) : 1;
    const accEnabled = self.movementAccEnabled !== false;
    const accThreshold = Math.max(1, number(self.movementAccThreshold, 2));
    const accMax = Math.max(1, number(self.movementAccMax, 2));
    const accActive = self.movementAccActive === true || (self.movementAccActive == null && accEnabled &&
      acceleration + 1e-6 >= accThreshold && Number(self.movementAcc) > 1.5);
    const ratio = maxHealth > 0 ? health / maxHealth : 0;
    const infinite = Boolean(self.fighterInfiniteResources);
    const bars = [
      { label: 'SP', value: infinite ? maxStamina : Math.max(0, stamina), max: maxStamina,
        color: stamina <= 0 ? '#fb7185' : '#22c55e', text: infinite ? '∞' : `${compact(stamina, true)}/${compact(maxStamina, true)}` },
      { label: 'MP', value: infinite ? manaMax : Math.max(0, mana), max: manaMax,
        color: self.mentalState === '理知' ? '#a78bfa' : self.mentalState === '気概' ? '#fbbf24' : '#fb7185',
        text: infinite ? '∞' : `${compact(mana)}/${compact(manaMax)}` },
      { label: 'HP', value: infinite ? maxHealth : health, max: maxHealth,
        color: ratio >= .75 ? '#22c55e' : ratio >= .325 ? '#f59e0b' : '#f43f5e',
        text: infinite ? '∞' : `${Math.abs(health) >= 1_000_000 ? compact(health) : healthString(health)}/${Math.abs(maxHealth) >= 1_000_000 ? compact(maxHealth) : healthString(maxHealth)}` }
    ];
    const cssWidth = scene.canvasCssWidth || w;
    const cssScale = clamp(cssWidth / Math.max(1, w), .1, 1);
    const overlap = Math.max(0, number(scene.soloMissionHudOverlapCss));
    const hudTop = data.soloMission && overlap > 0 && cssWidth < 500 ? Math.ceil((overlap + 8) / cssScale) : 14;
    const offset = hudTop - 14;
    const width = Math.min(w - 28, Math.floor(Math.min(220, Math.max(172, cssWidth - 28)) / cssScale));
    const labelSize = clamp(Math.ceil(13 / cssScale), 18, 36);
    const valueSize = clamp(Math.ceil(12 / cssScale), 17, 34);
    const detailSize = Math.max(12, Math.ceil(9 / cssScale));
    const lineHeight = Math.max(19, detailSize + 10);
    const barHeight = Math.max(10, Math.ceil(11 / cssScale));
    const rowHeight = Math.max(31, labelSize + 12);
    const barX = Math.max(68, Math.ceil(27 + labelSize * 2.1));
    const barRightInset = Math.max(48, Math.ceil(valueSize * 4.5));
    const minBarWidth = Math.max(36, Math.ceil(42 / cssScale));
    const liveIdea = Math.max(0, number(self.ideaProgressMs)) + (number(self.ideaProgressUpdatedAt) > 0
      ? Math.max(0, timestamp - number(self.ideaProgressUpdatedAt)) * Math.max(1, number(self.ideaProgressRate, 1)) : 0);
    const idea = number(self.ideaNextThresholdMs) > 0 && number(self.ideaProgressStartedAt) > 0
      ? Math.max(0, Math.ceil((number(self.ideaNextThresholdMs) - liveIdea) / 1000)) : 0;
    const detailTop = 40 + bars.length * rowHeight;
    const vibeOffset = self.special === 'alchemist' ? lineHeight : 0;
    const desireOffset = self.desireBiasLabel ? lineHeight * 2 : 0;
    const normalHeight = detailTop + vibeOffset + desireOffset + (idea > 0 ? lineHeight * 6 : lineHeight * 5);
    const availableHeight = Math.max(0, h - hudTop - 14);
    const showLuck = availableHeight >= detailTop + lineHeight * 3 + vibeOffset;
    const showMental = availableHeight >= detailTop + lineHeight * 4 + vibeOffset;
    const showDesire = Boolean(self.desireBiasLabel) && availableHeight >= detailTop + lineHeight * 6 + vibeOffset;
    const showIdea = idea > 0 && !self.ideaBlockedByDesire &&
      availableHeight >= detailTop + lineHeight * 5 + vibeOffset + (showDesire ? desireOffset : 0);
    const height = Math.min(normalHeight, Math.max(detailTop + lineHeight * 2 + vibeOffset, availableHeight));
    const shapes = [], texts = [], hit = {};
    const shape = (x, y, sw, sh, radius, color, stroke = false) => shapes.push({ x, y, w: sw, h: sh, radius, color, stroke });
    const text = (value, x, baseline, size, color, align = 'left', weight = 800, name = '', vertical = 'alphabetic') => {
      const measuredWidth = measure(String(value), size);
      if (!finite(measuredWidth) || measuredWidth < 0) throw new Error('Invalid HUD text metric');
      const left = align === 'right' ? x - measuredWidth : x;
      texts.push({ text: String(value), x: left, baseline, size, color: rgba(color), weight, name, vertical, width: measuredWidth });
      return { left, width: measuredWidth };
    };
    shape(14, hudTop, width, height, 8, colors.panel);
    shape(14, hudTop, width, height, 8, colors.border, true);
    bars.forEach((bar, index) => {
      const y = offset + 36 + index * rowHeight;
      hit[bar.label.toLowerCase()] = { left: 22, top: y - rowHeight / 2, width: Math.max(1, width - 22), height: rowHeight, radius: 5 };
      text(bar.label, 27, y, labelSize, bar.color, 'left', 900, `bar-${bar.label}-label`, 'middle');
      const valueWidth = Math.ceil(measure(bar.text, valueSize));
      const barWidth = Math.max(minBarWidth, width - barX - valueWidth - barRightInset);
      shape(barX, y - barHeight / 2, barWidth, barHeight, barHeight / 2, colors.track);
      const fill = clamp(bar.max > 0 ? bar.value / bar.max : 0, 0, 1);
      if (fill > 0) shape(barX, y - barHeight / 2, Math.max(2, barWidth * fill), barHeight, barHeight / 2, rgba(bar.color));
      text(bar.text, width, y, valueSize, '#f8fafc', 'right', 800, `bar-${bar.label}-value`, 'middle');
    });
    const d = offset + detailTop;
    const gap = Math.ceil(8 / cssScale);
    const firstWidth = Math.max(measure(readyString('EMP', empCooldown), detailSize),
      self.special === 'alchemist' ? measure(readyString('VIBE', vibeCooldown), detailSize) : 0);
    const creditCooldown = `短縮 ${(Math.max(0, number(self.manaGpuCooldownCreditMs)) / 1000).toFixed(1)}s`;
    const secondWidth = Math.max(measure(readyString('KILL', cooldown), detailSize),
      self.special === 'alchemist' ? measure(creditCooldown, detailSize) : 0);
    const secondX = Math.min(width - secondWidth - gap, Math.max(127, Math.ceil(27 + firstWidth + gap)));
    const ec = scene.fighterAccess ? `   EC ${Math.max(0, Math.floor(number(self.fighterEnergyCharge)))}` : '';
    const acc = `ACC ×${acceleration.toFixed(2)} / 移動固定 ${accActive ? `ACC${accMax.toFixed(0)}` : accEnabled ? '待機' : 'OFF'}${ec}`;
    const accBox = text(acc, 27, d, detailSize, '#7dd3fc', 'left', 800, 'acc');
    hit.acc = { left: 22, top: d - detailSize, width: accBox.width + 10, height: lineHeight, radius: 4 };
    const ready = (label, remaining, x, y) => {
      text(readyString(label, remaining), x, y, detailSize,
        remaining <= 0 ? '#ecfeff' : '#94a3b8', 'left', 800, label.toLowerCase());
      if (remaining <= 0) texts[texts.length - 1].glow = true;
    };
    if (!scene.tabletOpen || empCooldown > 0) ready('EMP', empCooldown, 27, d + lineHeight);
    if (!scene.tabletOpen || cooldown > 0) ready('KILL', cooldown, secondX, d + lineHeight);
    if (self.special === 'alchemist') {
      text(creditCooldown, secondX, d + lineHeight * 2, detailSize, '#22d3ee', 'left', 800, 'shortening');
      ready('VIBE', vibeCooldown, 27, d + lineHeight * 2);
    }
    const credit = `${Math.round(number(self.credits))}C`;
    const creditY = d + lineHeight * 2 + vibeOffset;
    const creditBox = text(credit, 27, creditY, detailSize, '#fbbf24', 'left', 800, 'credits');
    const creditRect = { left: 22, top: creditY - 16, width: creditBox.width + 10, height: 23, radius: 4 };
    hit.credits = creditRect;
    if (showLuck) text(`幸運／直観 ${number(self.luck).toFixed(2)}`, 27, d + lineHeight * 3 + vibeOffset,
      detailSize, number(self.luck) >= 0 ? '#f0abfc' : '#fb7185', 'left', 800, 'luck');
    const mind = self.mentalPoints || {};
    if (showMental) text(self.desireDebtActive
      ? `心状態:欲望（MP負債 ${compact(mana)} / 停止休息5秒または練気3秒でMP2）`
      : `心状態:${self.mentalState || '気概'}（MP${number(mind.manaPoints)}+SP${number(mind.staminaPoints)}=${number(mind.total)} / 上限比）`,
      27, d + lineHeight * 4 + vibeOffset, detailSize, '#e2e8f0', 'left', 800, 'mental');
    if (showDesire) {
      text(self.desireBiasLabel, 27, d + lineHeight * 5 + vibeOffset, detailSize, '#fb7185', 'left', 800, 'desire');
      text(String(self.desireBiasDetail || '').slice(0, 34), 27, d + lineHeight * 6 + vibeOffset,
        9, '#fecdd3', 'left', 700, 'desire-detail');
    }
    if (showIdea) {
      const label = ['真/美', '真/美', '善', '善のイデア'][Math.min(3, number(self.ideaStage))];
      text(`${label} 天上時間 ${idea}s`, 27, d + lineHeight * 5 + vibeOffset + (showDesire ? desireOffset : 0),
        showDesire ? 9 : detailSize, '#fde68a', 'left', showDesire ? 700 : 800, 'idea');
    }
    return { drawn: true, bars, shapes, texts, acquisitionHudRects: hit,
      acquisitionCreditRect: creditRect, layout: { width, height, hudTop, cssScale, detailTop,
        showLuck, showMental, showDesire, showIdea, idea } };
  }

  // Rect strips preserve the rounded silhouette and keep each translucent pixel
  // covered once. Border is an inset ring, so no Canvas stroke or 2D pass exists.
  function rounded(frame, target, s) {
    const { x, y, w, h, radius, color, stroke } = s;
    if (w <= 0 || h <= 0) return;
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    const bands = Math.max(1, Math.ceil(h));
    let pending = null;
    const flush = () => {
      if (!pending) return;
      frame.rect(target, pending.rect);
      pending = null;
    };
    const addRect = (rect, bandBottom) => {
      if (pending && pending.rect.x === rect.x && pending.rect.w === rect.w &&
          pending.rect.color === rect.color && pending.bottom === rect.y) {
        pending.rect.h = bandBottom - pending.rect.y;
        pending.bottom = bandBottom;
        return;
      }
      flush();
      pending = { rect: { ...rect }, bottom: bandBottom };
    };
    for (let i = 0; i < bands; i++) {
      const top = y + i * h / bands, bottom = y + (i + 1) * h / bands;
      const sample = (i + .5) * h / bands;
      const distance = Math.min(sample, h - sample);
      const inset = distance >= r || r === 0 ? 0 : r - Math.sqrt(Math.max(0, r * r - (r - distance) ** 2));
      if (!stroke) addRect({ x: x + inset, y: top, w: w - 2 * inset, h: bottom - top, color }, bottom);
      else {
        const line = 1.5;
        if (sample <= line || h - sample <= line) addRect(
          { x: x + inset, y: top, w: w - 2 * inset, h: bottom - top, color }, bottom);
        else {
          addRect({ x: x + inset, y: top, w: line, h: bottom - top, color }, bottom);
          addRect({ x: x + w - inset - line, y: top, w: line, h: bottom - top, color }, bottom);
        }
      }
    }
    flush();
  }
  function create({ textAtlas, atlasMetrics } = {}) {
    if (typeof textAtlas?.layout !== 'function' || !Array.isArray(textAtlas.textures)) {
      throw new TypeError('HUD requires uploaded GPU text atlas');
    }
    if (!finite(atlasMetrics?.ascent) || !finite(atlasMetrics?.pixelSize) || atlasMetrics.pixelSize <= 0) {
      throw new TypeError('HUD requires source atlas ascent and pixelSize for exact baselines');
    }
    const ascentRatio = atlasMetrics.ascent / atlasMetrics.pixelSize;
    const measure = (value, size) => textAtlas.layout(value, { size }).width;
    function makePlan(input) { return plan({ ...input, measure }); }
    async function prepare(input) {
      if (typeof textAtlas.ensure !== 'function') throw new TypeError('HUD text atlas needs ensure');
      const result = makePlan(input);
      if (!result.drawn) return result;
      await textAtlas.ensure(result.texts.map(t => t.text).join('\n'));
      return result;
    }
    function draw({ frame, target, viewport, data, scene, preparedPlan } = {}) {
      if (typeof frame?.stage !== 'function' || typeof frame.rect !== 'function' ||
          typeof frame.sprite !== 'function' || typeof target !== 'string' || !target ||
          viewport?.kind !== 'main' || ![viewport.width, viewport.height,
            viewport.pixelWidth, viewport.pixelHeight].every(v => finite(v) && v > 0) ||
          !Array.isArray(viewport.logicalToPixel) || viewport.logicalToPixel.length !== 6 ||
          !viewport.logicalToPixel.every(finite) || viewport.logicalToPixel[0] <= 0 ||
          viewport.logicalToPixel[3] <= 0) {
        throw new TypeError('HUD requires shared frame, target and committed main viewport');
      }
      const result = preparedPlan || makePlan({ data, viewport, scene });
      if (!result.drawn) return result;
      const layouts = result.texts.map(item => textAtlas.layout(item.text, { size: item.size }));
      for (const layout of layouts) for (const q of layout.quads) {
        if (!textAtlas.textures[q.page]) throw new Error('HUD atlas page is not loaded; call prepare first');
      }
      frame.stage('hud');
      for (const s of result.shapes) rounded(frame, target, s);
      result.texts.forEach((item, index) => {
        const layout = layouts[index];
        const glyphTop = Math.min(...layout.quads.map(q => q.y));
        const glyphBottom = Math.max(...layout.quads.map(q => q.y + q.h));
        const top = item.vertical === 'middle' && layout.quads.length
          ? item.baseline - (glyphTop + glyphBottom) / 2
          : item.baseline - ascentRatio * item.size;
        if (item.glow) for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3],
          [-2, -2], [2, -2], [-2, 2], [2, 2]]) for (const q of layout.quads) {
          frame.sprite(target, { x: item.x + q.x + dx, y: top + q.y + dy,
            w: q.w, h: q.h, uv: q.uv, texture: textAtlas.textures[q.page],
            color: rgba('#22d3ee', .08), mode: 'source-over' });
        }
        for (const q of layout.quads) frame.sprite(target, { x: item.x + q.x, y: top + q.y,
          w: q.w, h: q.h, uv: q.uv, texture: textAtlas.textures[q.page], color: item.color,
          mode: 'source-over' });
      });
      return result;
    }
    return Object.freeze({ plan: makePlan, prepare, draw });
  }
  const api = Object.freeze({ plan, create });
  root.DvaWebGPUHud = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
