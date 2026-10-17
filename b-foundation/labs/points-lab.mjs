import { BASE_SETTINGS, DEFAULT_SETTINGS, constructLayout } from './point-layout.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW_BOX = '-.05 -.05 1.1 1.1';
const DOT_RADIUS = .008;
const SEED_MODULUS = 2 ** 32;

function byId(id) { return document.getElementById(id); }

function cloneSettings(settings) { return { ...settings }; }

function readSettings() {
  const seedInput = byId('seed');
  const seed = seedInput.valueAsNumber;
  if (seedInput.validity.badInput || !Number.isInteger(seed) || seed < 0 || seed > 4294967295 || !seedInput.validity.valid) return null;
  return {
    method: byId('method').value,
    count: Number(byId('count').value),
    seed,
  };
}

function svgElement(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function clearSvg(svg) { svg.replaceChildren(); }

function caption(model) {
  return `点数 ${model.settings.count} / 最短の中心間隔 ${model.minimumDistance.toFixed(4)} 正規化単位`;
}

function paint(svg, model, showNearest, dotClass) {
  clearSvg(svg);
  svg.setAttribute('viewBox', VIEW_BOX);
  svg.appendChild(svgElement('rect', { x: 0, y: 0, width: 1, height: 1, class: 'layout-frame', 'aria-hidden': 'true' }));
  if (showNearest && Array.isArray(model.closestPair)) {
    const [i, j] = model.closestPair;
    const [a, b] = [model.points[i], model.points[j]];
    svg.appendChild(svgElement('path', {
      d: `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`,
      class: 'nearest-link',
      'aria-hidden': 'true',
    }));
  }
  for (const [x, y] of model.points) {
    svg.appendChild(svgElement('circle', {
      cx: x, cy: y, r: DOT_RADIUS,
      class: `layout-dot ${dotClass}`,
      'aria-hidden': 'true',
    }));
  }
}

function clearCurrent() {
  clearSvg(byId('current-preview'));
  byId('current-preview').setAttribute('viewBox', VIEW_BOX);
  byId('empty-message').hidden = false;
  byId('pin').disabled = true;
  byId('save-svg').disabled = true;
  byId('save-json').disabled = true;
}

function enableActions(enabled) {
  byId('pin').disabled = !enabled;
  byId('save-svg').disabled = !enabled;
  byId('save-json').disabled = !enabled;
}

function announce(message, isError = false) {
  byId('status').textContent = message;
  byId('status').setAttribute('role', isError ? 'alert' : 'status');
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  let link;
  try {
    link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
  } finally {
    try { link?.remove(); } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
  }
}

function standaloneSvg(model) {
  const circles = model.points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${DOT_RADIUS}" fill="#147d78"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${VIEW_BOX}" preserveAspectRatio="xMidYMid meet">${circles}</svg>\n`;
}

function jsonData(model) {
  return {
    version: 1,
    kind: 'planar_point_arrangement',
    settings: model.settings,
    model,
    display: { radius: DOT_RADIUS, fill: '#147d78' },
    units: 'normalized screen coordinates',
    limits: model.guarantees,
  };
}

function init() {
  let baselineSettings = cloneSettings(BASE_SETTINGS);
  let currentSettings = cloneSettings(DEFAULT_SETTINGS);
  let baselineModel;
  let currentModel;

  const renderBaselineOnly = () => {
    baselineModel = constructLayout(baselineSettings);
    paint(byId('baseline-preview'), baselineModel, byId('show-nearest').checked, 'baseline-dot');
    byId('baseline-caption').textContent = caption(baselineModel);
  };

  const render = () => {
    byId('count-value').value = byId('count').value;
    currentSettings = readSettings();
    if (!currentSettings) {
      currentModel = undefined;
      clearCurrent();
      try { renderBaselineOnly(); } catch { /* Keep the last valid baseline visible. */ }
      byId('current-caption').textContent = '並びの番号を確認してください。';
      byId('empty-message').textContent = '並びの番号には0から4294967295までの整数を入力してください。修正すると配置を再開します。';
      announce('並びの番号を確認してください。', true);
      return;
    }

    try {
      currentModel = constructLayout(currentSettings);
      baselineModel = constructLayout(baselineSettings);
      byId('empty-message').hidden = true;
      paint(byId('baseline-preview'), baselineModel, byId('show-nearest').checked, 'baseline-dot');
      paint(byId('current-preview'), currentModel, byId('show-nearest').checked, 'current-dot');
      byId('baseline-caption').textContent = caption(baselineModel);
      byId('current-caption').textContent = caption(currentModel);
      enableActions(true);
      announce('表示を更新しました。');
    } catch {
      currentModel = undefined;
      clearCurrent();
      try { renderBaselineOnly(); } catch { /* Keep the last valid baseline visible. */ }
      byId('current-caption').textContent = 'この条件では配置を作成できません。';
      byId('empty-message').textContent = '点を配置できませんでした。条件を確認してください。';
      announce('点を配置できませんでした。設定を確認してください。', true);
    }
  };

  const applySettings = settings => {
    byId('method').value = settings.method;
    byId('count').value = String(settings.count);
    byId('seed').value = String(settings.seed);
  };

  for (const id of ['method', 'count', 'seed']) byId(id).addEventListener('input', render);
  byId('show-nearest').addEventListener('change', render);
  byId('next').addEventListener('click', () => {
    const seedInput = byId('seed');
    const previous = seedInput.valueAsNumber;
    const valid = !seedInput.validity.badInput && Number.isInteger(previous) && previous >= 0 && previous <= 4294967295 && seedInput.validity.valid;
    seedInput.value = String(valid ? (previous + 1) % SEED_MODULUS : DEFAULT_SETTINGS.seed);
    render();
    announce('別の並びを表示しました。');
  });
  byId('pin').addEventListener('click', () => {
    if (!currentModel) return;
    baselineSettings = cloneSettings(currentSettings);
    render();
    announce('今の配置を比較用に残しました。');
  });
  byId('reset').addEventListener('click', () => {
    currentSettings = cloneSettings(DEFAULT_SETTINGS);
    baselineSettings = cloneSettings(BASE_SETTINGS);
    applySettings(currentSettings);
    byId('show-nearest').checked = false;
    render();
    announce('初期状態に戻しました。');
    byId('reset').focus();
  });
  byId('save-svg').addEventListener('click', () => {
    if (!currentModel) return;
    try {
      download('point-layout.svg', standaloneSvg(currentModel), 'image/svg+xml;charset=utf-8');
      announce('SVGファイルの保存を開始しました。');
    } catch {
      announce('SVGを保存できませんでした。ブラウザーの保存設定を確認してください。', true);
    }
  });
  byId('save-json').addEventListener('click', () => {
    if (!currentModel) return;
    try {
      download('point-layout.json', `${JSON.stringify(jsonData(currentModel), null, 2)}\n`, 'application/json;charset=utf-8');
      announce('形状データの保存を開始しました。');
    } catch {
      announce('形状データを保存できませんでした。ブラウザーの保存設定を確認してください。', true);
    }
  });

  applySettings(currentSettings);
  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
