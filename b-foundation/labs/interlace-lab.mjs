import { DEFAULT_SETTINGS, constructInterlace, interlaceSvg } from './interlace-geometry.mjs';
import { constructInterlaceRing, interlaceRingSvg } from './interlace-ring.mjs';

const ids = [
  'layout', 'pattern', 'periods', 'width', 'clearance', 'invert', 'monochrome', 'reset',
  'baseline-preview', 'current-preview', 'baseline-caption', 'current-caption', 'status',
  'save-svg', 'save-json', 'crossing-select', 'crossing-info', 'flip-crossing', 'reset-crossings',
];
const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const rangeIds = ['periods', 'width', 'clearance'];
let currentModel = null;
let currentSvg = '';
let currentOverrides = new Set();
let selectedCrossing = null;
let lastSettings = null;

function settingsFromControls() {
  return {
    periods: el.periods.valueAsNumber,
    width: el.width.valueAsNumber,
    clearance: el.clearance.valueAsNumber,
    pattern: el.pattern.value,
    invert: el.invert.checked,
    monochrome: el.monochrome.checked,
  };
}

function updateOutputs(settings) {
  document.getElementById('periods-value').value = String(settings.periods);
  document.getElementById('width-value').value = settings.width.toFixed(3);
  document.getElementById('clearance-value').value = settings.clearance.toFixed(3);
}

function replacePreview(svgElement, markup, prefix) {
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const root = parsed.documentElement;
  if (root.localName !== 'svg' || parsed.querySelector('parsererror')) {
    throw new Error('SVGを読み取れませんでした。');
  }
  svgElement.replaceChildren();
  svgElement.setAttribute('viewBox', root.getAttribute('viewBox'));
  svgElement.setAttribute('width', root.getAttribute('width'));
  svgElement.setAttribute('height', root.getAttribute('height'));
  for (const child of root.childNodes) svgElement.append(document.importNode(child, true));
  svgElement.dataset.idPrefix = prefix;
}

function caption(settings, layout, individualCount = 0) {
  const order = settings.pattern === 'alternating' ? '交互の基本配置' : '同順の基本配置';
  const direction = settings.invert ? '上下を反転' : '標準の上下';
  const color = settings.monochrome ? '単色' : '3色';
  const shape = layout === 'ring' ? '輪の縁飾り' : 'まっすぐな帯';
  const individual = individualCount ? `・個別変更${individualCount}か所` : '';
  return `${shape}・${settings.periods}周期・幅${settings.width.toFixed(3)}・すき間${settings.clearance.toFixed(3)}・${order}${individual}・${direction}・${color}`;
}

function buildLayout(settings, layout, prefix, overrides = []) {
  if (layout === 'ring') {
    return {
      model: constructInterlaceRing(settings, overrides),
      svg: interlaceRingSvg(settings, prefix, overrides),
    };
  }
  if (layout === 'open') {
    return {
      model: constructInterlace(settings, overrides),
      svg: interlaceSvg(settings, prefix, overrides),
    };
  }
  throw new TypeError('図案の形を選択してください。');
}

function setActionsEnabled(enabled) {
  el['save-svg'].disabled = !enabled;
  el['save-json'].disabled = !enabled;
  el['crossing-select'].disabled = !enabled;
  el['flip-crossing'].disabled = !enabled || selectedCrossing === null;
  el['reset-crossings'].disabled = !enabled || currentOverrides.size === 0;
}

function addSelectionMarker(svgElement, point) {
  svgElement.querySelector('.selection-marker')?.remove();
  if (!point) return;
  const ns = 'http://www.w3.org/2000/svg';
  const group = document.createElementNS(ns, 'g');
  group.setAttribute('class', 'selection-marker');
  group.setAttribute('aria-hidden', 'true');
  group.setAttribute('pointer-events', 'none');
  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx', String(point[0]));
  circle.setAttribute('cy', String(point[1]));
  circle.setAttribute('r', '0.15');
  circle.setAttribute('class', 'selection-halo');
  const outline = document.createElementNS(ns, 'circle');
  outline.setAttribute('cx', String(point[0]));
  outline.setAttribute('cy', String(point[1]));
  outline.setAttribute('r', '0.12');
  outline.setAttribute('class', 'selection-outline');
  group.append(circle, outline);
  svgElement.append(group);
}

function updateCrossingControls(model) {
  const select = el['crossing-select'];
  const selected = selectedCrossing === null ? '' : String(selectedCrossing);
  select.replaceChildren(new Option('交差を選択', ''));
  for (const crossing of model.crossings) {
    const pair = crossing.pair.map((index) => `帯${index + 1}`).join('と');
    select.add(new Option(`交差${crossing.index + 1}: ${pair}（上: 帯${crossing.over + 1}）`, String(crossing.index)));
  }
  select.value = selected;
  const crossing = selectedCrossing === null
    ? null
    : model.crossings.find((item) => item.index === selectedCrossing);
  if (!crossing) {
    selectedCrossing = null;
    el['crossing-info'].textContent = '交差は未選択です。図の交差を押すか、一覧から選んでください。';
    addSelectionMarker(el['current-preview'], null);
  } else {
    const pair = crossing.pair.map((index) => `帯${index + 1}`).join('と');
    el['crossing-info'].textContent = `交差${crossing.index + 1}: ${pair}の組で、現在は帯${crossing.over + 1}が上です。`;
    addSelectionMarker(el['current-preview'], crossing.point);
  }
  el['flip-crossing'].disabled = selectedCrossing === null;
  el['reset-crossings'].disabled = currentOverrides.size === 0;
}

function render(notice = '') {
  const settings = settingsFromControls();
  const layout = el.layout.value;
  updateOutputs(settings);
  try {
    const referenceSettings = { ...settings, pattern: 'stacked' };
    const baseline = buildLayout(referenceSettings, layout, 'interlace-baseline');
    const current = buildLayout(settings, layout, 'interlace-current', [...currentOverrides].sort((a, b) => a - b));
    replacePreview(el['baseline-preview'], baseline.svg, 'interlace-baseline');
    replacePreview(el['current-preview'], current.svg, 'interlace-current');
    currentModel = current.model;
    currentSvg = current.svg;
    el['baseline-caption'].textContent = `重ねるだけの基準図。${caption(referenceSettings, layout)}`;
    el['current-caption'].textContent = caption(settings, layout, currentOverrides.size);
    updateCrossingControls(current.model);
    const individual = currentOverrides.size ? `個別指定${currentOverrides.size}か所。` : '';
    el.status.textContent = `${notice}${individual}${current.model.strands.length}本の帯、${current.model.crossings.length}か所の交差を表示しています。`;
    el.status.setAttribute('role', 'status');
    setActionsEnabled(true);
  } catch {
    currentModel = null;
    currentSvg = '';
    el['current-preview'].replaceChildren();
    el['current-caption'].textContent = '設定を確認してください。';
    el.status.textContent = 'この設定では図を構成できません。値を調整してください。';
    el.status.setAttribute('role', 'alert');
    el['crossing-select'].disabled = true;
    el['crossing-select'].value = '';
    el['crossing-info'].textContent = '図を構成できないため、交差を選べません。';
    setActionsEnabled(false);
  }
}

function applySettingsChange() {
  const settings = settingsFromControls();
  const layout = el.layout.value;
  const notices = [];
  if (lastSettings && settings.pattern !== lastSettings.pattern && currentOverrides.size) {
    currentOverrides.clear();
    notices.push('並び方を変えたため個別指定を解除しました。');
  }
  if (lastSettings && settings.periods !== lastSettings.periods) {
    const limit = 6 * settings.periods;
    const before = currentOverrides.size;
    currentOverrides = new Set([...currentOverrides].filter((index) => index < limit));
    const removed = before - currentOverrides.size;
    if (removed) notices.push(`範囲外になった個別指定${removed}か所を取り除きました。`);
    if (selectedCrossing !== null && selectedCrossing >= limit) {
      selectedCrossing = null;
      notices.push('選択中の交差が範囲外になったため選択を解除しました。');
    }
  }
  lastSettings = { ...settings };
  render(notices.join(''));
}

function selectCrossing(index) {
  if (!currentModel || !Number.isInteger(index) || index < 0 || index >= currentModel.crossings.length) return;
  selectedCrossing = index;
  render();
}

function download(filename, content, mime) {
  let objectUrl;
  const anchor = document.createElement('a');
  try {
    objectUrl = URL.createObjectURL(new Blob([content], { type: mime }));
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    el.status.textContent = `${filename} の保存を開始しました。`;
    el.status.setAttribute('role', 'status');
  } catch {
    el.status.textContent = '保存を開始できませんでした。ブラウザーの設定を確認して、もう一度お試しください。';
    el.status.setAttribute('role', 'alert');
  } finally {
    anchor.remove();
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

for (const id of rangeIds) el[id].addEventListener('input', applySettingsChange);
for (const id of ['pattern', 'invert', 'monochrome', 'layout']) el[id].addEventListener('change', applySettingsChange);
el['crossing-select'].addEventListener('change', () => {
  const value = el['crossing-select'].value;
  selectedCrossing = value === '' ? null : Number(value);
  render();
});
el['flip-crossing'].addEventListener('click', () => {
  if (selectedCrossing === null || !currentModel) return;
  if (currentOverrides.has(selectedCrossing)) currentOverrides.delete(selectedCrossing);
  else currentOverrides.add(selectedCrossing);
  render();
});
el['reset-crossings'].addEventListener('click', () => {
  if (!currentOverrides.size) return;
  currentOverrides.clear();
  render('個別指定をすべて戻しました。');
});
el['current-preview'].addEventListener('pointerup', (event) => {
  if (!currentModel) return;
  const matrix = el['current-preview'].getScreenCTM();
  if (!matrix) return;
  let nearest = null;
  for (const crossing of currentModel.crossings) {
    const [x, y] = crossing.point;
    const px = matrix.a * x + matrix.c * y + matrix.e;
    const py = matrix.b * x + matrix.d * y + matrix.f;
    const distance = Math.hypot(event.clientX - px, event.clientY - py);
    if (!nearest || distance < nearest.distance) nearest = { index: crossing.index, distance };
  }
  if (nearest && nearest.distance <= 20) selectCrossing(nearest.index);
});
el.reset.addEventListener('click', () => {
  currentOverrides.clear();
  selectedCrossing = null;
  el.layout.value = 'open';
  el.pattern.value = DEFAULT_SETTINGS.pattern;
  el.periods.value = String(DEFAULT_SETTINGS.periods);
  el.width.value = String(DEFAULT_SETTINGS.width);
  el.clearance.value = String(DEFAULT_SETTINGS.clearance);
  el.invert.checked = DEFAULT_SETTINGS.invert;
  el.monochrome.checked = DEFAULT_SETTINGS.monochrome;
  lastSettings = { ...DEFAULT_SETTINGS };
  render('初期状態に戻しました。');
});
el['save-svg'].addEventListener('click', () => {
  if (currentModel && currentSvg) download('interlaced-bands.svg', currentSvg, 'image/svg+xml;charset=utf-8');
});
el['save-json'].addEventListener('click', () => {
  if (currentModel) download('interlaced-bands.json', `${JSON.stringify(currentModel, null, 2)}\n`, 'application/json;charset=utf-8');
});

el.layout.value = 'open';
el.pattern.value = DEFAULT_SETTINGS.pattern;
el.periods.value = String(DEFAULT_SETTINGS.periods);
el.width.value = String(DEFAULT_SETTINGS.width);
el.clearance.value = String(DEFAULT_SETTINGS.clearance);
el.invert.checked = DEFAULT_SETTINGS.invert;
el.monochrome.checked = DEFAULT_SETTINGS.monochrome;
lastSettings = { ...DEFAULT_SETTINGS };
render();
