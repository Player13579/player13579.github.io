import {
  BASELINE_POSE,
  DEFAULT_POSE,
  DEFAULT_SOURCE_SETTINGS,
  MAX_SOURCE_BYTES,
  VIEW_BOX,
  constructPlanarProjection,
  parseRosetteSource,
  validatePose,
} from './planar-projection.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const clone = (value) => structuredClone(value);
const byId = (id) => document.getElementById(id);
const boxText = () => `${VIEW_BOX[0]} ${VIEW_BOX[1]} ${VIEW_BOX[2]} ${VIEW_BOX[3]}`;

function element(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function svgPath(points) {
  if (!Array.isArray(points) || points.length < 3) throw new TypeError('polygon coordinates are incomplete');
  return `${points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${-y}`).join(' ')} Z`;
}

function homographyPoint(H, [x, y]) {
  const X = H[0][0] * x + H[0][1] * y + H[0][2];
  const Y = H[1][0] * x + H[1][1] * y + H[1][2];
  const W = H[2][0] * x + H[2][1] * y + H[2][2];
  if (![X, Y, W].every(Number.isFinite) || W === 0) throw new TypeError('plane guide projection is invalid');
  return [X / W, Y / W];
}

function paint(svg, model, helpers) {
  svg.replaceChildren();
  svg.setAttribute('viewBox', boxText());
  if (helpers) {
    const H = model.homography;
    const pathPoints = (coords) => coords.map((point) => homographyPoint(H, point));
    const corners = model.plane.projectedCorners;
    svg.appendChild(element('path', { d: svgPath(corners), class: 'plane-boundary', 'aria-hidden': 'true' }));
    const lines = [-0.5, 0, 0.5];
    for (const t of lines) {
      for (const family of [
        [[t, -1], [t, 1]],
        [[-1, t], [1, t]],
      ]) {
        svg.appendChild(element('path', { d: svgPathOpen(pathPoints(family)), class: 'plane-guide', 'aria-hidden': 'true' }));
      }
    }
  }
  for (const instance of model.instances) {
    svg.appendChild(element('path', {
      d: svgPath(instance.projectedPolygon),
      class: 'plane-instance',
      'data-instance-index': instance.index,
      'aria-hidden': 'true',
    }));
  }
}

function svgPathOpen(points) {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${-y}`).join(' ');
}

function poseFromControls() {
  return validatePose({
    projection: byId('projection').value,
    tilt: Number(byId('tilt').value),
    roll: Number(byId('roll').value),
    distance: Number(byId('distance').value),
  });
}

function caption(model) {
  const perspective = model.pose.projection === 'perspective';
  const projection = perspective ? '透視投影' : '正射影';
  const distance = perspective ? `距離 ${model.pose.distance.toFixed(2)}` : '距離は不使用';
  return `${projection}・傾き ${model.pose.tilt}°・回転 ${model.pose.roll}°・${distance}・配置数 ${model.instances.length}`;
}

function setOutputs() {
  byId('tilt-value').value = `${byId('tilt').value}°`;
  byId('roll-value').value = `${byId('roll').value}°`;
  byId('distance-value').value = Number(byId('distance').value).toFixed(2);
  const ortho = byId('projection').value === 'orthographic';
  byId('distance').disabled = ortho;
  byId('distance-help').textContent = ortho
    ? '正射影では距離を変えても形は変わりません。'
    : '焦点距離も距離に合わせるため、距離は遠近感を調整します。';
}

function download(filename, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
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
  const paths = model.instances.map((instance) =>
    `<path d="${svgPath(instance.projectedPolygon)}" fill="#147d78" fill-rule="nonzero"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${boxText()}" preserveAspectRatio="xMidYMid meet">${paths}</svg>
`;
}

function modelJson(model, showPlane) {
  return {
    version: 1,
    kind: 'planar_motif_projection',
    pose: model.pose,
    sourceSettings: model.sourceSettings,
    model,
    display: { showPlane },
  };
}

function announce(message, error = false) {
  byId('status').textContent = message;
  byId('status').setAttribute('role', error ? 'alert' : 'status');
}

function init() {
  let baselinePose = clone(BASELINE_POSE);
  let currentPose = clone(DEFAULT_POSE);
  let baselineSource = clone(DEFAULT_SOURCE_SETTINGS);
  let currentSource = clone(DEFAULT_SOURCE_SETTINGS);
  let baselineModel;
  let currentModel;
  let loadGeneration = 0;

  function setActions(enabled) {
    byId('pin').disabled = !enabled;
    byId('save-svg').disabled = !enabled;
    byId('save-json').disabled = !enabled;
  }

  function render() {
    setOutputs();
    currentPose = poseFromControls();
    try {
      baselineModel = constructPlanarProjection(baselinePose, baselineSource);
      currentModel = constructPlanarProjection(currentPose, currentSource);
      const helpers = byId('show-plane').checked;
      paint(byId('baseline-preview'), baselineModel, helpers);
      paint(byId('current-preview'), currentModel, helpers);
      byId('baseline-caption').textContent = caption(baselineModel);
      byId('current-caption').textContent = caption(currentModel);
      setActions(true);
      announce(`投影を更新しました。配置数 ${currentModel.instances.length}。`);
    } catch {
      currentModel = undefined;
      byId('current-preview').replaceChildren();
      byId('current-preview').setAttribute('viewBox', boxText());
      byId('current-caption').textContent = 'この条件では投影を構成できません。';
      setActions(false);
      announce('投影を構成できませんでした。条件を確認してください。', true);
    }
  }

  function applyPose(pose) {
    byId('projection').value = pose.projection;
    byId('tilt').value = String(pose.tilt);
    byId('roll').value = String(pose.roll);
    byId('distance').value = String(pose.distance);
  }

  for (const id of ['projection', 'tilt', 'roll', 'distance']) byId(id).addEventListener('input', render);
  byId('show-plane').addEventListener('change', render);
  byId('source-file').addEventListener('change', async (event) => {
    const input = event.currentTarget;
    const generation = ++loadGeneration;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > MAX_SOURCE_BYTES) {
      announce('ファイルが大きすぎます。8 MiB 以下の紋様JSONを選んでください。', true);
      input.value = '';
      return;
    }
    announce('紋様データを確認しています。');
    try {
      const text = await file.text();
      if (generation !== loadGeneration) return;
      const settings = parseRosetteSource(text);
      if (generation !== loadGeneration) return;
      currentSource = clone(settings);
      byId('source-status').textContent = `読み込み済み: ${file.name}（設定から再構成）`;
      render();
      announce('紋様データを読み込み、現在の投影を更新しました。');
    } catch {
      if (generation !== loadGeneration) return;
      announce('このファイルは読み込めませんでした。放射状の紋様ページから保存した形状JSONを選んでください。', true);
      input.value = '';
    }
  });
  byId('pin').addEventListener('click', () => {
    if (!currentModel) return;
    baselinePose = clone(currentPose);
    baselineSource = clone(currentSource);
    render();
    announce('現在の投影と元の紋様を比較用に残しました。');
  });
  byId('reset-source').addEventListener('click', () => {
    loadGeneration += 1;
    currentSource = clone(DEFAULT_SOURCE_SETTINGS);
    byId('source-file').value = '';
    byId('source-status').textContent = '初期の紋様を表示しています。';
    render();
    announce('元の紋様を初期状態に戻しました。投影条件はそのままです。');
  });
  byId('reset-all').addEventListener('click', () => {
    loadGeneration += 1;
    baselinePose = clone(BASELINE_POSE);
    currentPose = clone(DEFAULT_POSE);
    baselineSource = clone(DEFAULT_SOURCE_SETTINGS);
    currentSource = clone(DEFAULT_SOURCE_SETTINGS);
    applyPose(currentPose);
    byId('source-file').value = '';
    byId('source-status').textContent = '初期の紋様を表示しています。';
    byId('show-plane').checked = true;
    render();
    announce('すべて初期状態に戻しました。');
  });
  byId('save-svg').addEventListener('click', () => {
    if (!currentModel) return;
    try {
      download('planar-motif.svg', standaloneSvg(currentModel), 'image/svg+xml;charset=utf-8');
      announce('SVGファイルの保存を開始しました。');
    } catch {
      announce('SVGを保存できませんでした。ブラウザーの保存設定を確認してください。', true);
    }
  });
  byId('save-json').addEventListener('click', () => {
    if (!currentModel) return;
    try {
      download('planar-motif.json', `${JSON.stringify(modelJson(currentModel, byId('show-plane').checked), null, 2)}
`, 'application/json;charset=utf-8');
      announce('投影データの保存を開始しました。');
    } catch {
      announce('投影データを保存できませんでした。ブラウザーの保存設定を確認してください。', true);
    }
  });
  applyPose(currentPose);
  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
