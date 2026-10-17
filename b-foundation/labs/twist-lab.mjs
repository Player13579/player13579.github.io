import { BASELINE_SETTINGS, DEFAULT_SETTINGS, REFLECTANCE, VIEW_BOX, constructTwistedBand, sampleSurface } from './twisted-band-geometry.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const INITIAL_SETTINGS = { ...DEFAULT_SETTINGS };
const FACE_NAMES = { front: '表側', back: '裏側', edge: '真横' };

function byId(id) { return document.getElementById(id); }
function readSettings() {
  const settings = {};
  for (const [id, key] of [['twist', 'twist'], ['phase', 'phase'], ['width', 'width'], ['light', 'light']]) {
    const input = byId(id);
    const value = input.valueAsNumber;
    if (!input.validity.valid || input.validity.badInput || !Number.isFinite(value)) throw new RangeError('invalid input');
    settings[key] = value;
  }
  return settings;
}

function svgElement(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}
function clearSvg(svg) { svg.replaceChildren(); }
function yFlip([x, y]) { return [x, -y]; }
function pointsAttribute(points) { return points.map((point) => yFlip(point).join(',')).join(' '); }
function fixedViewBox() { return VIEW_BOX.join(' '); }
function color(rgb) { return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`; }

function addWireframe(group, model) {
  const width = model.settings.width;
  const v0 = -width / 2, v1 = width / 2;
  const samples = model.stations.map((t) => [
    sampleSurface(model.settings, t, v0).projected,
    sampleSurface(model.settings, t, v1).projected,
  ]);
  const lines = samples.map((section) => [section[0], section[1]]);
  lines.push(samples.map((section) => section[0]));
  lines.push(samples.map((section) => section[1]));
  for (const points of lines) {
    const attrs = { points: pointsAttribute(points), 'aria-hidden': 'true' };
    group.appendChild(svgElement('polyline', { ...attrs, class: 'wireframe-halo' }));
    group.appendChild(svgElement('polyline', { ...attrs, class: 'wireframe-line' }));
  }
}

function paint(svg, model, clipId, showWireframe) {
  clearSvg(svg);
  svg.setAttribute('viewBox', fixedViewBox());
  const defs = svgElement('defs');
  const clip = svgElement('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' });
  clip.appendChild(svgElement('polygon', {
    points: pointsAttribute(model.silhouette),
    'clip-rule': 'evenodd',
    'fill-rule': 'evenodd',
  }));
  defs.appendChild(clip);
  svg.appendChild(defs);
  const cells = svgElement('g', { 'clip-path': `url(#${clipId})` });
  for (const cell of model.cells) {
    const fill = color(cell.sample.rgb);
    cells.appendChild(svgElement('polygon', {
      points: pointsAttribute(cell.projected),
      fill,
      stroke: fill,
      class: 'surface-cell',
      'data-face': cell.sample.face,
      'aria-hidden': 'true',
    }));
  }
  svg.appendChild(cells);
  if (showWireframe) {
    const helpers = svgElement('g', { 'aria-hidden': 'true' });
    addWireframe(helpers, model);
    svg.appendChild(helpers);
  }
}

function caption(settings, model) {
  const faceText = model.limits.edgeOn ? '・正面投影は線状に縮みます' : '';
  return `ねじれ ${settings.twist}°・始まり ${settings.phase}°・幅 ${settings.width.toFixed(1)}・相対光量 ${settings.light.toFixed(2)}${faceText}`;
}

function announce(message, error = false) {
  const status = byId('status');
  status.textContent = message;
  status.setAttribute('role', error ? 'alert' : 'status');
}
function enableActions(enabled) {
  for (const id of ['pin', 'save-svg', 'save-json']) byId(id).disabled = !enabled;
}
function clearCurrent(message) {
  clearSvg(byId('current-preview'));
  byId('current-preview').removeAttribute('viewBox');
  byId('empty-message').textContent = message;
  byId('empty-message').hidden = false;
  enableActions(false);
}

function updateOutputs() {
  byId('twist-value').value = `${Number(byId('twist').value)}°`;
  byId('phase-value').value = `${Number(byId('phase').value)}°`;
  byId('width-value').value = Number(byId('width').value).toFixed(1);
  byId('light-value').value = Number(byId('light').value).toFixed(2);
}

function exportWireframe(model) {
  const width = model.settings.width, v0 = -width / 2, v1 = width / 2;
  const samples = model.stations.map((t) => [
    sampleSurface(model.settings, t, v0).projected,
    sampleSurface(model.settings, t, v1).projected,
  ]);
  const lines = samples.map((section) => [section[0], section[1]]);
  lines.push(samples.map((section) => section[0]));
  lines.push(samples.map((section) => section[1]));
  return lines.map((points) => {
    const coords = pointsAttribute(points);
    return `<polyline points="${coords}" fill="none" stroke="#fffefa" stroke-width="3.2" vector-effect="non-scaling-stroke"/><polyline points="${coords}" fill="none" stroke="#26383a" stroke-width="1.35" vector-effect="non-scaling-stroke"/>`;
  }).join('');
}

function standaloneSvg(model, showWireframe) {
  const clipId = 'twisted-band-export-clip';
  const silhouette = pointsAttribute(model.silhouette);
  const cells = model.cells.map((cell) => {
    const fill = color(cell.sample.rgb);
    return `<polygon points="${pointsAttribute(cell.projected)}" fill="${fill}" stroke="${fill}" stroke-width="0.02" stroke-linejoin="round"/>`;
  }).join('');
  const wire = showWireframe ? exportWireframe(model) : '';
  const [x, y, width, height] = VIEW_BOX;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="457" viewBox="${x} ${y} ${width} ${height}" preserveAspectRatio="xMidYMid meet"><title>帯のねじれと表裏の明暗</title><desc>固定した視点光に対する近似的な拡散反射表示です。物理的な布の動きや材質を示しません。</desc><defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><polygon points="${silhouette}" clip-rule="evenodd" fill-rule="evenodd"/></clipPath></defs><g clip-path="url(#${clipId})">${cells}</g>${wire}</svg>\n`;
}

function jsonData(model, showWireframe) {
  return {
    version: 1,
    kind: 'twisted_band_reference',
    settings: model.settings,
    coordinates: {
      worldAxes: 'x_right_y_up_z_toward_viewer',
      projection: 'orthographic_from_plus_z_toward_minus_z',
      svgYAxis: 'flipped_from_world_y_up',
      localUnits: 'arbitrary_design_length_units',
    },
    model: model.source,
    geometry: model,
    display: {
      wireframe: showWireframe,
      reflectance: REFLECTANCE,
      lightDirection: [0, 0, 1],
      light: model.settings.light,
      shading: 'sampled_patch_center_lambert_diffuse_srgb',
      seamTreatment: 'same-color cell stroke clipped to sampled silhouette',
    },
  };
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

function init() {
  let baselineSettings = { ...BASELINE_SETTINGS };
  let baselineModel;
  let currentModel;
  let currentSettings;

  const render = () => {
    updateOutputs();
    try {
      currentSettings = readSettings();
      currentModel = constructTwistedBand(currentSettings);
      baselineModel = constructTwistedBand(baselineSettings);
      const wireframe = byId('show-wireframe').checked;
      paint(byId('baseline-preview'), baselineModel, 'twisted-band-baseline-clip', wireframe);
      paint(byId('current-preview'), currentModel, 'twisted-band-current-clip', wireframe);
      byId('baseline-caption').textContent = caption(baselineSettings, baselineModel);
      byId('current-caption').textContent = caption(currentSettings, currentModel);
      byId('empty-message').hidden = true;
      enableActions(true);
      if (currentModel.limits.edgeOn) announce('表示を更新しました。有効な条件です。正面投影が線状に縮んでいます。');
      else announce('表示を更新しました。');
    } catch {
      currentModel = undefined;
      clearCurrent('この条件では投影を表示できません。設定を確認してください。');
      try {
        baselineModel = constructTwistedBand(baselineSettings);
        paint(byId('baseline-preview'), baselineModel, 'twisted-band-baseline-clip', byId('show-wireframe').checked);
        byId('baseline-caption').textContent = caption(baselineSettings, baselineModel);
      } catch { /* Keep the last visible baseline if it cannot be reconstructed. */ }
      byId('current-caption').textContent = '現在の帯を表示できません。';
      announce('現在の設定では投影を構成できません。値を確認してください。', true);
    }
  };

  for (const id of ['twist', 'phase', 'width', 'light']) byId(id).addEventListener('input', render);
  byId('show-wireframe').addEventListener('change', render);
  byId('pin').addEventListener('click', () => {
    if (!currentModel) return;
    baselineSettings = { ...currentSettings };
    render();
    announce('今の帯を比較用に残しました。');
  });
  byId('reset').addEventListener('click', () => {
    for (const [id, key] of [['twist', 'twist'], ['phase', 'phase'], ['width', 'width'], ['light', 'light']]) {
      byId(id).value = String(INITIAL_SETTINGS[key]);
    }
    byId('show-wireframe').checked = false;
    baselineSettings = { ...BASELINE_SETTINGS };
    render();
    announce('初期状態に戻しました。');
  });
  byId('save-svg').addEventListener('click', () => {
    if (!currentModel) return;
    try {
      download('twisted-band.svg', standaloneSvg(currentModel, byId('show-wireframe').checked), 'image/svg+xml;charset=utf-8');
      announce('SVGファイルの保存を開始しました。');
    } catch {
      announce('SVGを保存できませんでした。ブラウザーの保存設定を確認してください。', true);
    }
  });
  byId('save-json').addEventListener('click', () => {
    if (!currentModel) return;
    try {
      download('twisted-band.json', `${JSON.stringify(jsonData(currentModel, byId('show-wireframe').checked), null, 2)}\n`, 'application/json;charset=utf-8');
      announce('形状データの保存を開始しました。');
    } catch {
      announce('形状データを保存できませんでした。ブラウザーの保存設定を確認してください。', true);
    }
  });
  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();