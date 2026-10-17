import { DEFAULT_SETTINGS, constructInterlace, interlaceSvg } from './interlace-geometry.mjs';

const ids = ['pattern', 'periods', 'width', 'clearance', 'invert', 'monochrome', 'reset', 'baseline-preview', 'current-preview', 'baseline-caption', 'current-caption', 'status', 'save-svg', 'save-json'];
const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const controlIds = ['pattern', 'periods', 'width', 'clearance', 'invert', 'monochrome'];
const inputs = controlIds.map((id) => el[id]);
let currentSettings = { ...DEFAULT_SETTINGS };
let currentModel = null;
let currentSvg = '';

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

function caption(settings) {
  const order = settings.pattern === 'alternating' ? '交差ごとに上下を入れ替える' : '交差を同じ順で重ねる';
  const direction = settings.invert ? '上下を反転' : '標準の上下';
  const color = settings.monochrome ? '単色' : '3色';
  return `${settings.periods}周期・幅${settings.width.toFixed(3)}・すき間${settings.clearance.toFixed(3)}・${order}・${direction}・${color}`;
}

function setActionsEnabled(enabled) {
  el['save-svg'].disabled = !enabled;
  el['save-json'].disabled = !enabled;
}

function render() {
  const settings = settingsFromControls();
  updateOutputs(settings);
  try {
    const model = constructInterlace(settings);
    const referenceSettings = { ...settings, pattern: 'stacked' };
    const baselineMarkup = interlaceSvg(referenceSettings, 'interlace-baseline');
    const currentMarkup = interlaceSvg(settings, 'interlace-current');
    replacePreview(el['baseline-preview'], baselineMarkup, 'interlace-baseline');
    replacePreview(el['current-preview'], currentMarkup, 'interlace-current');
    currentSettings = settings;
    currentModel = model;
    currentSvg = currentMarkup;
    el['baseline-caption'].textContent = `重ねるだけの基準図。${caption(referenceSettings)}`;
    el['current-caption'].textContent = caption(settings);
    el.status.textContent = `${model.strands.length}本の帯、${model.crossings.length}か所の交差を表示しています。`;
    el.status.setAttribute('role', 'status');
    setActionsEnabled(true);
  } catch {
    currentModel = null;
    currentSvg = '';
    el['current-preview'].replaceChildren();
    el['current-caption'].textContent = '設定を確認してください。';
    el.status.textContent = 'この設定では図を構成できません。値を調整してください。';
    el.status.setAttribute('role', 'alert');
    setActionsEnabled(false);
  }
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

for (const input of inputs) input.addEventListener('input', render);
for (const input of inputs) input.addEventListener('change', render);
el.reset.addEventListener('click', () => {
  el.pattern.value = DEFAULT_SETTINGS.pattern;
  el.periods.value = String(DEFAULT_SETTINGS.periods);
  el.width.value = String(DEFAULT_SETTINGS.width);
  el.clearance.value = String(DEFAULT_SETTINGS.clearance);
  el.invert.checked = DEFAULT_SETTINGS.invert;
  el.monochrome.checked = DEFAULT_SETTINGS.monochrome;
  render();
});
el['save-svg'].addEventListener('click', () => {
  if (currentModel && currentSvg) download('interlaced-bands.svg', currentSvg, 'image/svg+xml;charset=utf-8');
});
el['save-json'].addEventListener('click', () => {
  if (currentModel) download('interlaced-bands.json', `${JSON.stringify(currentModel, null, 2)}\n`, 'application/json;charset=utf-8');
});

el.pattern.value = DEFAULT_SETTINGS.pattern;
el.periods.value = String(DEFAULT_SETTINGS.periods);
el.width.value = String(DEFAULT_SETTINGS.width);
el.clearance.value = String(DEFAULT_SETTINGS.clearance);
el.invert.checked = DEFAULT_SETTINGS.invert;
el.monochrome.checked = DEFAULT_SETTINGS.monochrome;
render();
