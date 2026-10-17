import { BASE_SETTINGS, DEFAULT_SETTINGS, constructRosette, sharedViewBox } from './rosette-geometry.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PROFILE_NAMES = {
  uniform: '均一に曲げる',
  tighten: '終わりほど強く曲げる',
  relax: '始まりほど強く曲げる',
  s: 'S字に曲げる',
};

function byId(id) { return document.getElementById(id); }

function cloneSettings(settings) {
  return { ...settings, seed: { ...settings.seed } };
}

function readSettings() {
  return {
    group: byId('group').value,
    sectors: Number(byId('sectors').value),
    radius: Number(byId('radius').value),
    tilt: Number(byId('tilt').value),
    orientation: Number(byId('orientation').value),
    seed: {
      profile: byId('profile').value,
      strength: Number(byId('strength').value),
      flip: byId('flip').checked,
      widthStart: Number(byId('width-start').value),
      widthEnd: Number(byId('width-end').value),
    },
  };
}

function svgElement(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function clearSvg(svg) { svg.replaceChildren(); }

function pointPath(points) {
  if (!points.length) return '';
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${-y}`).join(' ') + ' Z';
}

function caption(model) {
  const group = model.settings.group === 'cyclic' ? '回転だけ' : '回転と鏡映';
  return `${group}・配置数 ${model.instanceCount}（分割 ${model.settings.sectors}）`;
}

function paint(svg, model, box, helpers, colorClass) {
  clearSvg(svg);
  svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
  for (const instance of model.instances) {
    svg.appendChild(svgElement('path', {
      d: pointPath(instance.polygon),
      class: `rosette-instance ${colorClass}`,
      'aria-hidden': 'true',
    }));
  }
  if (helpers) {
    for (const instance of model.instances) {
      const [x, y] = instance.translation;
      svg.appendChild(svgElement('path', {
        d: `M0 0 L${x} ${-y}`,
        class: 'rosette-guide',
        'aria-hidden': 'true',
      }));
    }
    svg.appendChild(svgElement('circle', {
      cx: 0, cy: 0, r: box.width * .005, class: 'rosette-origin', 'aria-hidden': 'true',
    }));
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
  for (const [input, output, suffix, precision] of [
    ['sectors', 'sectors-value', '', 0], ['radius', 'radius-value', ' 単位', 2],
    ['tilt', 'tilt-value', '°', 0], ['orientation', 'orientation-value', '°', 0],
    ['strength', 'strength-value', '', 0], ['width-start', 'width-start-value', '', 2],
    ['width-end', 'width-end-value', '', 2],
  ]) byId(output).value = `${Number(byId(input).value).toFixed(precision)}${suffix}`;
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
  const paths = model.instances.map(instance => `<path d="${pointPath(instance.polygon)}" fill="#147d78" fill-rule="nonzero"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" preserveAspectRatio="xMidYMid meet">${paths}</svg>\n`;
}

function jsonData(model) {
  return {
    version: 1,
    kind: 'radial_band_arrangement',
    settings: model.settings,
    units: 'local length units',
    model: {
      seed: model.seed,
      instances: model.instances,
      instanceCount: model.instanceCount,
      groupOrder: model.groupOrder,
      bounds: model.bounds,
      globalOverlap: model.globalOverlap,
      distinctMotifs: model.distinctMotifs,
    },
    bounds: model.bounds,
    limits: {
      approximation: model.bounds,
      globalOverlap: model.globalOverlap,
      distinctMotifs: model.distinctMotifs,
    },
  };
}

function init() {
  let baselineSettings = cloneSettings(BASE_SETTINGS);
  let currentSettings = cloneSettings(DEFAULT_SETTINGS);
  let baselineModel;
  let currentModel;

  const renderBaselineOnly = () => {
    baselineModel = constructRosette(baselineSettings);
    paint(byId('baseline-preview'), baselineModel, sharedViewBox([baselineModel]), byId('show-guides').checked, 'baseline-instance');
    byId('baseline-caption').textContent = caption(baselineModel);
  };

  const render = () => {
    setOutputs();
    currentSettings = readSettings();

    if (currentSettings.seed.widthStart === 0 && currentSettings.seed.widthEnd === 0) {
      currentModel = undefined;
      clearCurrent();
      try { renderBaselineOnly(); } catch { /* Keep the last valid baseline visible. */ }
      byId('current-caption').textContent = '帯の太さを設定してください。';
      byId('empty-message').textContent = '両端がどちらも0のため、帯を並べられません。始まりか終わりの太さを少し上げてください。';
      announce('帯を並べるには、少なくとも片方の端に太さが必要です。', true);
      return;
    }

    try {
      currentModel = constructRosette(currentSettings);
      baselineModel = constructRosette(baselineSettings);
      const box = sharedViewBox([baselineModel, currentModel]);
      byId('empty-message').hidden = true;
      paint(byId('baseline-preview'), baselineModel, box, byId('show-guides').checked, 'baseline-instance');
      paint(byId('current-preview'), currentModel, box, byId('show-guides').checked, 'current-instance');
      byId('baseline-caption').textContent = caption(baselineModel);
      byId('current-caption').textContent = caption(currentModel);
      enableActions(true);
      announce(`表示を更新しました。配置数 ${currentModel.instanceCount}。`);
    } catch {
      currentModel = undefined;
      clearCurrent();
      try { renderBaselineOnly(); } catch { /* Keep the last valid baseline visible. */ }
      byId('current-caption').textContent = 'この条件では紋様を構成できません。';
      byId('empty-message').textContent = 'この条件では紋様を構成できませんでした。分割数や元の帯の太さを調整してください。';
      announce('この条件では紋様を構成できませんでした。設定を調整してください。', true);
    }
  };

  function applySettings(settings) {
    byId('group').value = settings.group;
    byId('sectors').value = String(settings.sectors);
    byId('radius').value = String(settings.radius);
    byId('tilt').value = String(settings.tilt);
    byId('orientation').value = String(settings.orientation);
    byId('profile').value = settings.seed.profile;
    byId('strength').value = String(settings.seed.strength);
    byId('width-start').value = String(settings.seed.widthStart);
    byId('width-end').value = String(settings.seed.widthEnd);
    byId('flip').checked = settings.seed.flip;
  }

  for (const id of ['group', 'sectors', 'radius', 'tilt', 'orientation', 'profile', 'strength', 'width-start', 'width-end', 'flip']) {
    byId(id).addEventListener('input', render);
  }
  byId('show-guides').addEventListener('change', render);
  byId('pin').addEventListener('click', () => {
    if (!currentModel) return;
    baselineSettings = cloneSettings(currentSettings);
    render();
    announce('今の紋様を比較用に残しました。');
  });
  byId('reset').addEventListener('click', () => {
    currentSettings = cloneSettings(DEFAULT_SETTINGS);
    baselineSettings = cloneSettings(BASE_SETTINGS);
    applySettings(currentSettings);
    byId('show-guides').checked = false;
    byId('seed-controls').open = false;
    render();
    announce('初期状態に戻しました。');
    byId('reset').focus();
  });
  byId('save-svg').addEventListener('click', () => {
    if (!currentModel) return;
    try {
      download('rosette-shape.svg', standaloneSvg(currentModel), 'image/svg+xml;charset=utf-8');
      announce('SVGファイルの保存を開始しました。');
    } catch {
      announce('SVGを保存できませんでした。ブラウザーの保存設定を確認してください。', true);
    }
  });
  byId('save-json').addEventListener('click', () => {
    if (!currentModel) return;
    try {
      download('rosette-shape.json', `${JSON.stringify(jsonData(currentModel), null, 2)}\n`, 'application/json;charset=utf-8');
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
