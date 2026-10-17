import { BASE_SETTINGS, DEFAULT_SETTINGS, constructBand, sharedViewBox } from './band-geometry.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const INITIAL_SETTINGS = { ...DEFAULT_SETTINGS };
const PROFILE_NAMES = {
  uniform: '均一に曲げる',
  tighten: '終わりほど強く曲げる',
  relax: '始まりほど強く曲げる',
  s: 'S字に曲げる',
};

function byId(id) { return document.getElementById(id); }

function readSettings() {
  return {
    profile: byId('profile').value,
    strength: Number(byId('strength').value),
    flip: byId('flip').checked,
    widthStart: Number(byId('width-start').value),
    widthEnd: Number(byId('width-end').value),
  };
}

function description(settings) {
  const direction = settings.flip ? '上下反転・' : '';
  return `${direction}${PROFILE_NAMES[settings.profile]}、強さ ${settings.strength}、太さ ${settings.widthStart.toFixed(2)} から ${settings.widthEnd.toFixed(2)}`;
}

function svgElement(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function clearSvg(svg) { svg.replaceChildren(); }

function pointsToPath(points) {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${-y}`).join(' ') + ' Z';
}

function paint(svg, model, viewBox, showCenterline) {
  clearSvg(svg);
  svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
  const band = svgElement('path', { d: pointsToPath(model.polygon), class: 'band-fill', 'aria-hidden': 'true' });
  svg.appendChild(band);
  if (showCenterline) {
    const center = model.points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${-y}`).join(' ');
    svg.appendChild(svgElement('path', { d: center, class: 'centerline', 'aria-hidden': 'true' }));
    svg.appendChild(svgElement('circle', { cx: model.points[0][0], cy: -model.points[0][1], r: viewBox.width * .008, class: 'origin', 'aria-hidden': 'true' }));
  }
}

function clearCurrent() {
  clearSvg(byId('current-preview'));
  byId('current-preview').removeAttribute('viewBox');
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
  const status = byId('status');
  status.textContent = message;
  status.setAttribute('role', isError ? 'alert' : 'status');
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
    try { link?.remove(); } finally { URL.revokeObjectURL(url); }
  }
}

function standaloneSvg(model) {
  const box = sharedViewBox([model]);
  const path = pointsToPath(model.polygon);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" preserveAspectRatio="xMidYMid meet"><path d="${path}" fill="#147d78"/></svg>\n`;
}

function jsonData(model) {
  return {
    version: 1,
    kind: 'planar_band_geometry',
    settings: model.settings,
    source: model.source,
    units: 'local length units',
    limits: model.bounds,
    geometry: {
      points: model.points,
      leftPoints: model.leftPoints,
      rightPoints: model.rightPoints,
      polygon: model.polygon,
      arcLengths: model.arcLengths,
      tangentAngles: model.tangentAngles,
      widths: model.widths,
      steps: model.steps,
      bounds: model.bounds,
      localFactorBound: model.localFactorBound,
      caps: model.caps,
      globalOverlap: model.globalOverlap,
    },
  };
}

function init() {
  let baselineSettings = { ...BASE_SETTINGS };
  let baselineModel;
  let currentModel;
  let currentSettings;

  const paintBaselineAlone = () => {
    baselineModel = constructBand(baselineSettings);
    paint(byId('baseline-preview'), baselineModel, sharedViewBox([baselineModel]), byId('show-centerline').checked);
    byId('baseline-caption').textContent = description(baselineSettings);
  };

  const render = () => {
    for (const [input, output, precision] of [
      ['strength', 'strength-value', 0], ['width-start', 'width-start-value', 2], ['width-end', 'width-end-value', 2],
    ]) byId(output).value = Number(byId(input).value).toFixed(precision);

    currentSettings = readSettings();
    if (currentSettings.widthStart === 0 && currentSettings.widthEnd === 0) {
      currentModel = undefined;
      clearCurrent();
      try { paintBaselineAlone(); } catch { /* Keep the last valid baseline visible. */ }
      byId('current-caption').textContent = '太さを設定してください。';
      byId('empty-message').textContent = '両端がどちらも0のため、帯の形は作れません。始まりか終わりの太さを少し上げてください。';
      announce('帯を作るには、少なくとも片方の端に太さが必要です。', true);
      return;
    }

    try {
      currentModel = constructBand(currentSettings);
      baselineModel = constructBand(baselineSettings);
      const box = sharedViewBox([baselineModel, currentModel]);
      byId('empty-message').hidden = true;
      paint(byId('baseline-preview'), baselineModel, box, byId('show-centerline').checked);
      paint(byId('current-preview'), currentModel, box, byId('show-centerline').checked);
      byId('baseline-caption').textContent = description(baselineSettings);
      byId('current-caption').textContent = description(currentSettings);
      enableActions(true);
      announce('表示を更新しました。');
    } catch (error) {
      currentModel = undefined;
      clearCurrent();
      byId('current-caption').textContent = 'この条件では形を計算できません。';
      byId('empty-message').textContent = 'この条件では形を構成できませんでした。曲がりを弱めるか、太さを調整してください。';
      announce('この条件では形を構成できませんでした。曲がりを弱めるか、太さを調整してください。', true);
    }
  };

  for (const id of ['profile', 'strength', 'width-start', 'width-end', 'flip']) byId(id).addEventListener('input', render);
  byId('show-centerline').addEventListener('change', render);
  byId('pin').addEventListener('click', () => {
    if (!currentModel) return;
    baselineSettings = { ...currentSettings };
    render();
    announce('今の形を比較用に残しました。');
  });
  byId('reset').addEventListener('click', () => {
    byId('profile').value = INITIAL_SETTINGS.profile;
    byId('strength').value = String(INITIAL_SETTINGS.strength);
    byId('flip').checked = INITIAL_SETTINGS.flip;
    byId('width-start').value = String(INITIAL_SETTINGS.widthStart);
    byId('width-end').value = String(INITIAL_SETTINGS.widthEnd);
    byId('show-centerline').checked = true;
    baselineSettings = { ...BASE_SETTINGS };
    render();
    announce('初期状態に戻しました。');
  });
  byId('save-svg').addEventListener('click', () => {
    if (!currentModel) return;
    try {
      download('band-shape.svg', standaloneSvg(currentModel), 'image/svg+xml;charset=utf-8');
      announce('SVGファイルの保存を開始しました。');
    } catch {
      announce('SVGを保存できませんでした。ブラウザーの保存設定を確認してください。', true);
    }
  });
  byId('save-json').addEventListener('click', () => {
    if (!currentModel) return;
    try {
      download('band-shape.json', `${JSON.stringify(jsonData(currentModel), null, 2)}\n`, 'application/json;charset=utf-8');
      announce('形状データの保存を開始しました。');
    } catch {
      announce('形状データを保存できませんでした。ブラウザーの保存設定を確認してください。', true);
    }
  });

  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
