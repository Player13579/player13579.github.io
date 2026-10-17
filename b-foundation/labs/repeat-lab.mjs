import { BASE_SETTINGS, DEFAULT_SETTINGS, constructRepeat, sharedViewBox } from './curve-repeat-geometry.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const INITIAL_SETTINGS = { ...DEFAULT_SETTINGS };
const SPACING_NAMES = { parameter: '横方向でそろえる', arc: '曲線に沿ってそろえる' };
const ORIENTATION_NAMES = { tangent: '曲線に沿わせる', fixed: '一定の向きに保つ' };

function byId(id) { return document.getElementById(id); }
function numberValue(id) { return byId(id).valueAsNumber; }

function readSettings() {
  const settings = {
    spacing: byId('spacing').value,
    orientation: byId('orientation').value,
    rise: numberValue('rise'),
    count: numberValue('count'),
    angle: numberValue('angle'),
  };
  for (const id of ['rise', 'count', 'angle']) {
    const input = byId(id);
    if (!input.validity.valid || input.validity.badInput || !Number.isFinite(settings[id])) {
      throw new RangeError('invalid control value');
    }
  }
  return settings;
}

function svgElement(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function clearSvg(svg) { svg.replaceChildren(); }
function svgPoint([x, y]) { return [x, -y]; }
function pointList(points) { return points.map((point) => svgPoint(point).join(',')).join(' '); }
function polygonPoints(points) { return pointList(points); }

function setBox(svg, box) {
  svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
}

function paint(svg, model, box, showCurve) {
  clearSvg(svg);
  setBox(svg, box);
  if (showCurve) {
    svg.appendChild(svgElement('polyline', {
      points: pointList(model.pathPoints),
      class: 'curve-guide',
      'aria-hidden': 'true',
    }));
  }
  for (const mark of model.marks) {
    svg.appendChild(svgElement('polygon', {
      points: polygonPoints(mark.polygon),
      class: 'repeat-mark',
      'aria-hidden': 'true',
    }));
  }
}

function describe(settings, model) {
  const { minArcInterval, maxArcInterval } = model.metrics;
  return `${settings.count}個・曲線に沿う中心間隔 約${minArcInterval.toFixed(3)}〜${maxArcInterval.toFixed(3)} 局所単位（${SPACING_NAMES[settings.spacing]}、${ORIENTATION_NAMES[settings.orientation]}）`;
}

function clearCurrent(message) {
  const svg = byId('current-preview');
  clearSvg(svg);
  svg.removeAttribute('viewBox');
  byId('empty-message').hidden = false;
  byId('empty-message').textContent = message;
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
  const url = URL.createObjectURL(new Blob([content], { type }));
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
  const polygons = model.marks.map((mark) => `<polygon points="${polygonPoints(mark.polygon)}" fill="#147d78"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" preserveAspectRatio="xMidYMid meet">${polygons}</svg>\n`;
}

function jsonData(model) {
  return {
    version: 1,
    kind: 'planar_curve_repeat_layout',
    settings: model.settings,
    curve: model.curve,
    marks: model.marks,
    pathPoints: model.pathPoints,
    arcIntervals: model.arcIntervals,
    chordIntervals: model.chordIntervals,
    metrics: model.metrics,
    bounds: model.bounds,
    display: {
      glyph: 'diamond',
      fill: '#147d78',
      baselineFill: '#a9ada5',
      svgYAxis: 'flipped_from_math_y_up',
    },
    units: 'local length units',
    limits: 'The display polygon is illustrative, not material or thickness. Arc spacing is not chord or edge spacing; contact, overlap, projection, physical motion, perception, and beauty are not evaluated.',
  };
}

function init() {
  let baselineSettings = { ...BASE_SETTINGS };
  let baselineModel;
  let currentModel;
  let currentSettings;

  const updateOutputs = () => {
    byId('rise-value').value = Number(byId('rise').value).toFixed(2).replace(/\.00$/, '');
    byId('count-value').value = String(Number(byId('count').value));
    byId('angle-value').value = `${Number(byId('angle').value)}°`;
  };

  const render = () => {
    updateOutputs();
    const showCurve = byId('show-curve').checked;
    try {
      currentSettings = readSettings();
      currentModel = constructRepeat(currentSettings);
      baselineModel = constructRepeat(baselineSettings);
      const box = sharedViewBox([baselineModel, currentModel]);
      byId('empty-message').hidden = true;
      paint(byId('baseline-preview'), baselineModel, box, showCurve);
      paint(byId('current-preview'), currentModel, box, showCurve);
      byId('baseline-caption').textContent = describe(baselineSettings, baselineModel);
      byId('current-caption').textContent = describe(currentSettings, currentModel);
      enableActions(true);
      announce('表示を更新しました。');
    } catch {
      currentModel = undefined;
      clearCurrent('入力を確認してください。範囲内の条件で配置を構成できません。');
      try {
        baselineModel = constructRepeat(baselineSettings);
        setBox(byId('baseline-preview'), sharedViewBox([baselineModel]));
        paint(byId('baseline-preview'), baselineModel, sharedViewBox([baselineModel]), showCurve);
        byId('baseline-caption').textContent = describe(baselineSettings, baselineModel);
      } catch { /* Preserve the last visible baseline if reconstruction fails. */ }
      byId('current-caption').textContent = 'この条件では配置を表示できません。';
      announce('入力を確認してください。範囲内の条件で配置を構成できません。', true);
    }
  };

  for (const id of ['spacing', 'orientation', 'rise', 'count', 'angle']) {
    byId(id).addEventListener(id === 'spacing' || id === 'orientation' ? 'change' : 'input', render);
  }
  byId('show-curve').addEventListener('change', render);
  byId('pin').addEventListener('click', () => {
    if (!currentModel) return;
    baselineSettings = { ...currentSettings };
    render();
    announce('今の配置を比較用に残しました。');
  });
  byId('reset').addEventListener('click', () => {
    byId('spacing').value = INITIAL_SETTINGS.spacing;
    byId('orientation').value = INITIAL_SETTINGS.orientation;
    byId('rise').value = String(INITIAL_SETTINGS.rise);
    byId('count').value = String(INITIAL_SETTINGS.count);
    byId('angle').value = String(INITIAL_SETTINGS.angle);
    byId('show-curve').checked = true;
    baselineSettings = { ...BASE_SETTINGS };
    render();
    announce('初期状態に戻しました。');
  });
  byId('save-svg').addEventListener('click', () => {
    if (!currentModel) return;
    try {
      download('curve-repeat.svg', standaloneSvg(currentModel), 'image/svg+xml;charset=utf-8');
      announce('SVGファイルの保存を開始しました。');
    } catch {
      announce('SVGを保存できませんでした。ブラウザーの保存設定を確認してください。', true);
    }
  });
  byId('save-json').addEventListener('click', () => {
    if (!currentModel) return;
    try {
      download('curve-repeat.json', `${JSON.stringify(jsonData(currentModel), null, 2)}\n`, 'application/json;charset=utf-8');
      announce('形状データの保存を開始しました。');
    } catch {
      announce('形状データを保存できませんでした。ブラウザーの保存設定を確認してください。', true);
    }
  });

  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();