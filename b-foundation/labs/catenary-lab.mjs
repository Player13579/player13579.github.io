import { BASE_SETTINGS, DEFAULT_SETTINGS, constructCatenary, sharedViewBox } from './catenary-geometry.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';

function byId(id) { return document.getElementById(id); }

function cloneSettings(settings) { return { ...settings }; }

function readSettings() {
  return {
    span: Number(byId('span').value),
    height: Number(byId('height').value),
    slack: Number(byId('slack').value) / 100,
  };
}

function svgElement(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function clearSvg(svg) { svg.replaceChildren(); }

function linePath(points) {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${-y}`).join(' ');
}

function caption(model) {
  return `全長（目標）${model.requestedLength.toFixed(2)} 単位 / 最大たるみ ${model.sag.value.toFixed(2)} 単位`;
}

function paint(svg, model, box, guides, lineClass) {
  clearSvg(svg);
  svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
  svg.appendChild(svgElement('path', {
    d: linePath(model.points), class: `catenary-line ${lineClass}`, 'aria-hidden': 'true',
  }));
  if (guides) {
    const [[x0, y0], [x1, y1]] = model.endpoints;
    svg.appendChild(svgElement('path', {
      d: `M${x0} ${-y0} L${x1} ${-y1}`, class: 'catenary-chord', 'aria-hidden': 'true',
    }));
    for (const [x, y] of model.endpoints) {
      svg.appendChild(svgElement('circle', {
        cx: x, cy: -y, r: box.width * .006, class: 'catenary-endpoint', 'aria-hidden': 'true',
      }));
    }
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
  byId('status').textContent = message;
  byId('status').setAttribute('role', isError ? 'alert' : 'status');
}

function setOutputs() {
  for (const [input, output, suffix] of [
    ['span', 'span-value', ' 単位'], ['height', 'height-value', ' 単位'], ['slack', 'slack-value', '%'],
  ]) {
    const value = Number(byId(input).value);
    byId(output).value = `${value.toFixed(input === 'slack' ? 0 : 2)}${suffix}`;
  }
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
  const box = sharedViewBox([model]);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" preserveAspectRatio="xMidYMid meet"><path d="${linePath(model.points)}" fill="none" stroke="#147d78" stroke-width="0.05" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`;
}

function jsonData(model) {
  return {
    version: 1,
    kind: 'hanging_cable_geometry',
    settings: model.settings,
    units: 'local length units',
    model: {
      endpoints: model.endpoints,
      requestedLength: model.requestedLength,
      source: model.source,
      points: model.points,
      slopes: model.slopes,
      curvatures: model.curvatures,
      steps: model.steps,
      polygonalLength: model.polygonalLength,
      minimum: model.minimum,
      sag: model.sag,
      bounds: model.bounds,
      assumptions: model.assumptions,
      actualTension: model.actualTension,
    },
    limits: {
      interpolation: model.bounds.interpolation,
      scope: model.bounds.scope,
      lengthResidual: model.source.lengthResidual,
      polygonalLength: model.polygonalLength,
      actualTension: model.actualTension,
    },
  };
}

function init() {
  let baselineSettings = cloneSettings(BASE_SETTINGS);
  let currentSettings = cloneSettings(DEFAULT_SETTINGS);
  let baselineModel;
  let currentModel;

  const renderBaselineOnly = () => {
    baselineModel = constructCatenary(baselineSettings);
    paint(byId('baseline-preview'), baselineModel, sharedViewBox([baselineModel]), byId('show-guides').checked, 'baseline-line');
    byId('baseline-caption').textContent = caption(baselineModel);
  };

  const render = () => {
    setOutputs();
    currentSettings = readSettings();
    try {
      currentModel = constructCatenary(currentSettings);
      baselineModel = constructCatenary(baselineSettings);
      const box = sharedViewBox([baselineModel, currentModel]);
      byId('empty-message').hidden = true;
      paint(byId('baseline-preview'), baselineModel, box, byId('show-guides').checked, 'baseline-line');
      paint(byId('current-preview'), currentModel, box, byId('show-guides').checked, 'current-line');
      byId('baseline-caption').textContent = caption(baselineModel);
      byId('current-caption').textContent = caption(currentModel);
      enableActions(true);
      announce('表示を更新しました。');
    } catch {
      currentModel = undefined;
      clearCurrent();
      try { renderBaselineOnly(); } catch { /* Keep the last valid baseline visible. */ }
      byId('current-caption').textContent = 'この条件では形を計算できません。';
      byId('empty-message').textContent = 'この条件では形を計算できませんでした。両端の位置や長さを少し調整してください。';
      announce('この条件では形を計算できませんでした。設定を調整してください。', true);
    }
  };

  const applySettings = settings => {
    byId('span').value = String(settings.span);
    byId('height').value = String(settings.height);
    byId('slack').value = String(Math.round(settings.slack * 100));
  };

  for (const id of ['span', 'height', 'slack']) byId(id).addEventListener('input', render);
  byId('show-guides').addEventListener('change', render);
  byId('pin').addEventListener('click', () => {
    if (!currentModel) return;
    baselineSettings = cloneSettings(currentSettings);
    render();
    announce('今の形を比較用に残しました。');
  });
  byId('reset').addEventListener('click', () => {
    currentSettings = cloneSettings(DEFAULT_SETTINGS);
    baselineSettings = cloneSettings(BASE_SETTINGS);
    applySettings(currentSettings);
    byId('show-guides').checked = true;
    render();
    announce('初期状態に戻しました。');
    byId('reset').focus();
  });
  byId('save-svg').addEventListener('click', () => {
    if (!currentModel) return;
    try {
      download('hanging-cable.svg', standaloneSvg(currentModel), 'image/svg+xml;charset=utf-8');
      announce('SVGファイルの保存を開始しました。');
    } catch {
      announce('SVGを保存できませんでした。ブラウザーの保存設定を確認してください。', true);
    }
  });
  byId('save-json').addEventListener('click', () => {
    if (!currentModel) return;
    try {
      download('hanging-cable.json', `${JSON.stringify(jsonData(currentModel), null, 2)}\n`, 'application/json;charset=utf-8');
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
