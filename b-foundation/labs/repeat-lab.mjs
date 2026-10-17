import { BASE_SETTINGS, DEFAULT_SETTINGS, sharedViewBox } from './curve-repeat-geometry.mjs';
import { DEFAULT_SEED, parseBandSeed, constructSeedRepeat } from './repeat-seed.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const INITIAL_SETTINGS = { ...DEFAULT_SETTINGS };
const MAX_BAND_FILE_BYTES = 1_048_576;
const SPACING_NAMES = { parameter: '横方向でそろえる', arc: '曲線に沿ってそろえる' };
const ORIENTATION_NAMES = { tangent: '曲線に沿わせる', fixed: '一定の向きに保つ' };

function byId(id) { return document.getElementById(id); }
function numberValue(id) { return byId(id).valueAsNumber; }
function copySeed(seed) {
  return {
    kind: seed.kind,
    bandSettings: seed.bandSettings ? { ...seed.bandSettings } : null,
    size: seed.size,
  };
}
function copySettings(settings) { return { ...settings }; }

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

function readSize() {
  const input = byId('seed-size');
  const size = input.valueAsNumber;
  if (!input.validity.valid || input.validity.badInput || !Number.isFinite(size)) throw new RangeError('invalid size');
  return size;
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

function seedLabel(seed, filename = '') {
  return seed.kind === 'band' ? `読み込んだ帯${filename ? `（${filename}）` : ''}` : '見本の菱形';
}

function describe(settings, seed, model, filename = '') {
  const { minArcInterval, maxArcInterval } = model.metrics;
  return `${seedLabel(seed, filename)}・${settings.count}個・曲線に沿う中心間隔 約${minArcInterval.toFixed(3)}〜${maxArcInterval.toFixed(3)} 局所単位・大きさ ${seed.size.toFixed(2)}（${SPACING_NAMES[settings.spacing]}、${ORIENTATION_NAMES[settings.orientation]}）`;
}

function seedStatusText(seed, filename = '') {
  return `現在の飾り：${seedLabel(seed, filename)}。大きさ ${seed.size.toFixed(2)}。`;
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
  const disabled = !enabled;
  byId('pin').disabled = disabled;
  byId('save-svg').disabled = disabled;
  byId('save-json').disabled = disabled;
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
    kind: 'planar_curve_repeat_seed_layout',
    settings: model.settings,
    curve: model.curve,
    marks: model.marks,
    pathPoints: model.pathPoints,
    arcIntervals: model.arcIntervals,
    chordIntervals: model.chordIntervals,
    metrics: model.metrics,
    bounds: model.bounds,
    seed: model.seed,
    display: {
      glyph: model.seed.kind === 'diamond' ? 'diamond' : 'source-band-outline',
      fill: '#147d78',
      maximumBoundingBoxEdge: model.seed.size,
      units: 'local length units',
      svgYAxis: 'flipped_from_math_y_up',
    },
    units: 'local length units',
    limits: {
      sourceNormalization: 'The source polygon is normalized by its sampled polygon bounding-box center and longest edge; the center is not an area centroid or perceptual center. The source shape approximation is inherited.',
      placement: 'Arc spacing is not chord or edge spacing. Contact, overlap, projection, material, motion, perception, and beauty are not evaluated.',
      input: 'This file input accepts only planar_band_geometry version 1 settings. This exported repeated-layout document is not accepted by that input.',
    },
  };
}

function init() {
  let baselineSettings = copySettings(BASE_SETTINGS);
  let baselineSeed = copySeed(DEFAULT_SEED);
  let baselineFilename = '';
  let currentSeed = copySeed(DEFAULT_SEED);
  let currentFilename = '';
  let baselineModel;
  let currentModel;
  let currentSettings;
  let loadGeneration = 0;
  let pending = false;

  const updateOutputs = () => {
    byId('rise-value').value = Number(byId('rise').value).toFixed(2).replace(/\.00$/, '');
    byId('count-value').value = String(Number(byId('count').value));
    byId('angle-value').value = `${Number(byId('angle').value)}°`;
    byId('seed-size-value').value = Number(byId('seed-size').value).toFixed(2);
  };

  const render = ({ announceUpdate = true } = {}) => {
    updateOutputs();
    const showCurve = byId('show-curve').checked;
    try {
      currentSettings = readSettings();
      currentSeed = { ...copySeed(currentSeed), size: readSize() };
      currentModel = constructSeedRepeat(currentSettings, currentSeed);
      baselineModel = constructSeedRepeat(baselineSettings, baselineSeed);
      const box = sharedViewBox([baselineModel, currentModel]);
      byId('empty-message').hidden = true;
      paint(byId('baseline-preview'), baselineModel, box, showCurve);
      paint(byId('current-preview'), currentModel, box, showCurve);
      byId('baseline-caption').textContent = describe(baselineSettings, baselineSeed, baselineModel, baselineFilename);
      byId('current-caption').textContent = describe(currentSettings, currentSeed, currentModel, currentFilename);
      byId('seed-status').textContent = seedStatusText(currentSeed, currentFilename);
      enableActions(!pending);
      if (announceUpdate) announce(pending ? '帯模様を読み込んでいます。' : '表示を更新しました。');
      return true;
    } catch {
      currentModel = undefined;
      clearCurrent('入力を確認してください。範囲内の条件で配置を構成できません。');
      try {
        baselineModel = constructSeedRepeat(baselineSettings, baselineSeed);
        paint(byId('baseline-preview'), baselineModel, sharedViewBox([baselineModel]), showCurve);
        byId('baseline-caption').textContent = describe(baselineSettings, baselineSeed, baselineModel, baselineFilename);
      } catch { /* Keep the last visible baseline if reconstruction fails. */ }
      byId('current-caption').textContent = 'この条件では配置を表示できません。';
      if (announceUpdate) announce('入力を確認してください。範囲内の条件で配置を構成できません。', true);
      return false;
    }
  };

  const invalidatePendingLoad = () => {
    loadGeneration += 1;
    pending = false;
    enableActions(Boolean(currentModel));
  };

  const restoreAfterCancelledLoad = () => {
    if (!pending) return;
    loadGeneration += 1;
    pending = false;
    enableActions(Boolean(currentModel));
    announce('ファイルの読み込みをキャンセルしました。現在の配置を保っています。');
  };

  const handleBandFile = async () => {
    const input = byId('band-file');
    const file = input.files?.[0];
    if (!file) {
      restoreAfterCancelledLoad();
      return;
    }
    const previousSeed = copySeed(currentSeed);
    const previousFilename = currentFilename;
    loadGeneration += 1;
    const generation = loadGeneration;
    pending = true;
    enableActions(false);
    announce('帯模様の形状データを読み込んでいます。');
    if (file.size > MAX_BAND_FILE_BYTES) {
      byId('band-file').value = '';
      pending = false;
      enableActions(Boolean(currentModel));
      announce('ファイルが大きすぎます。1 MiB以下の形状データを選んでください。直前の配置はそのままです。', true);
      return;
    }
    try {
      const text = await file.text();
      const bandSettings = parseBandSeed(text);
      if (generation !== loadGeneration) return;
      currentSeed = { kind: 'band', bandSettings: { ...bandSettings }, size: readSize() };
      currentFilename = file.name;
      pending = false;
      const valid = render({ announceUpdate: false });
      if (!valid) throw new Error('seed render failed');
      byId('band-file').value = '';
      announce(`帯模様を読み込みました：${file.name}`);
    } catch {
      if (generation !== loadGeneration) return;
      pending = false;
      currentSeed = previousSeed;
      currentFilename = previousFilename;
      byId('band-file').value = '';
      render({ announceUpdate: false });
      enableActions(Boolean(currentModel));
      byId('seed-status').textContent = seedStatusText(currentSeed, currentFilename);
      announce('このファイルは読み込めませんでした。帯模様ツールで保存した形状データを確認してください。直前の配置はそのままです。', true);
    }
  };

  for (const id of ['spacing', 'orientation', 'rise', 'count', 'angle']) {
    byId(id).addEventListener(id === 'spacing' || id === 'orientation' ? 'change' : 'input', () => render());
  }
  byId('seed-size').addEventListener('input', () => render());
  byId('show-curve').addEventListener('change', () => render());
  byId('band-file').addEventListener('change', handleBandFile);
  byId('band-file').addEventListener('cancel', restoreAfterCancelledLoad);
  byId('use-diamond').addEventListener('click', () => {
    invalidatePendingLoad();
    byId('band-file').value = '';
    currentSeed = { ...copySeed(DEFAULT_SEED), size: readSize() };
    currentFilename = '';
    render({ announceUpdate: false });
    announce('見本の菱形に戻しました。大きさと曲線の条件は保っています。');
  });
  byId('pin').addEventListener('click', () => {
    if (!currentModel || pending) return;
    baselineSettings = copySettings(currentSettings);
    baselineSeed = copySeed(currentSeed);
    baselineFilename = currentFilename;
    render({ announceUpdate: false });
    announce('今の配置を比較用に残しました。');
  });
  byId('reset').addEventListener('click', () => {
    invalidatePendingLoad();
    byId('band-file').value = '';
    byId('spacing').value = INITIAL_SETTINGS.spacing;
    byId('orientation').value = INITIAL_SETTINGS.orientation;
    byId('rise').value = String(INITIAL_SETTINGS.rise);
    byId('count').value = String(INITIAL_SETTINGS.count);
    byId('angle').value = String(INITIAL_SETTINGS.angle);
    byId('seed-size').value = String(DEFAULT_SEED.size);
    byId('show-curve').checked = true;
    currentSeed = copySeed(DEFAULT_SEED);
    currentFilename = '';
    baselineSettings = copySettings(BASE_SETTINGS);
    baselineSeed = copySeed(DEFAULT_SEED);
    baselineFilename = '';
    render({ announceUpdate: false });
    announce('初期状態に戻しました。');
  });
  byId('save-svg').addEventListener('click', () => {
    if (!currentModel || pending) return;
    try {
      download('curve-repeat.svg', standaloneSvg(currentModel), 'image/svg+xml;charset=utf-8');
      announce('SVGファイルの保存を開始しました。');
    } catch {
      announce('SVGを保存できませんでした。ブラウザーの保存設定を確認してください。', true);
    }
  });
  byId('save-json').addEventListener('click', () => {
    if (!currentModel || pending) return;
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