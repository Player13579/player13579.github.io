(() => {
  'use strict';
  const PRESENTATION = Object.freeze({ width: 980, height: 620, anchorHeight: 64 });
  const EFFECT_VIEW = Object.freeze({
    'heal-astra': { magnification: 4, focusX: 490, focusY: 310 },
    'sunbeam-astra': { magnification: 1.18, focusX: 490, focusY: 310 },
    'luck-astra': { magnification: 3.5, focusX: 490, focusY: 195 },
    'barrier-pro': { magnification: 3.0, focusX: 490, focusY: 310 }
  });
  const version = (id, title, page, source, status, detail, anchor = 'actor-H64', zoom = 1) =>
    Object.freeze({ id, title, page, source, status, detail, anchor, zoom });
  const entries = [
    { id: 'heal-astra', title: 'ヒール', versions: [
      version('heal-astra-prototype', 'Astra版', 'heal-astra-preview.html', 'webgpu-heal-astra-prototype.js', '品質合格・採用済み', '採用済みのヒール。WebGPUで自動ループ再生します。', 'actor-H64', 0.7937),
      version('heal-webgpu-20260924', '旧版（9月24日）', 'heal-webgpu-preview.html', 'webgpu-heal-e.js', '旧版・品質不採用・本編未採用', 'Astra版より前のヒール。比較用にWebGPUで再生できます。現行ヒールには使用しません。', 'actor-H64', 0.7937)
    ] },
    { id: 'sunbeam-astra', title: 'サンビーム', versions: [
      version('sunbeam-astra-clean-v3', 'Astra v3', 'sunbeam-astra-clean-v3-preview.html', 'webgpu-sunbeam-astra-clean-v3.js', '品質合格・採用済み・本編接続待ち', '手元から伝播し対象へ届く最新版。Eとして採用済み。本編の実イベント接続は未完了。', 'effect-H64'),
    ] },
    { id: 'luck-astra', title: '幸運', versions: [
      version('luck-astra-clean-v4', 'Astra v4', 'luck-astra-v4-preview.html', 'webgpu-luck-astra-v4.js', '品質合格・採用済み・本編接続待ち', '独立制作した最新版。Eとして採用済み。本編の実イベント接続は未完了。'),
    ] },
    { id: 'barrier-pro', title: 'バリア（GPT Pro比較）', versions: [
      version('barrier-pro-r03', 'GPT Pro r0.3', 'barrier-pro-r03/preview.html', 'barrier-pro-r03/barrier-pro-renderer.mjs', '造形評価高・発光調整待ち・本編未採用', 'GPT Pro独立改稿。4事象は実WebGPUで再生可能。ユーザーは造形品質を高く評価し、発光の不足を指摘。主形を保ちながら発光を調整中で、本編への採用は未決定。', 'effect-H64'),
      version('barrier-pro-r02', 'GPT Pro r0.2', 'barrier-pro-r02/preview.html', 'barrier-pro-r02/barrier-pro-renderer.mjs', '比較試作・品質不合格・本編未採用', 'ChatGPT Proによる独立設計。実WebGPUでは主形が小さな不透明の球状に見え、保護空域と吸収の作用差が読めないため改稿中。', 'effect-H64'),
      version('barrier-pro-r01', 'GPT Pro r0.1', 'barrier-pro-r01/preview.html', 'barrier-pro-r01/barrier-pro.wgsl', '比較試作・品質不合格・本編未採用', 'GPT Pro独立初稿。実WebGPU再生はできるが、原寸では細く暗い支持線だけが読め、保護空域は不十分。', 'effect-H64')
    ] }
  ].map(group => Object.freeze({ ...group, versions: Object.freeze(group.versions) }));
  const params = new URLSearchParams(location.search);
  let selectedIndex = 0;
  let selectedVersionIndex = 0;
  const catalog = document.getElementById('catalog');
  const stage = document.getElementById('stage');
  const notice = document.getElementById('notice');
  const versionSelect = document.getElementById('version-select');
  let fitObserver = null;
  const buttons = entries.map((entry, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'item'; button.dataset.id = entry.id;
    button.setAttribute('aria-current', 'false');
    const title = document.createElement('strong'); title.textContent = `${entry.title} · ${entry.versions[0].title}`;
    const status = document.createElement('span'); status.textContent = entry.versions[0].status;
    button.append(title, status); button.addEventListener('click', () => select(index, 0));
    catalog.append(button); return button;
  });
  document.getElementById('entry-counter').textContent = `${entries.length} 件`;

  function makePreview(item) {
    const preview = new URL(item.page, location.href);
    preview.searchParams.set('embed', '1');
    if (params.has('verify')) preview.searchParams.set('verify', params.get('verify') || '1');
    preview.searchParams.set('height', String(PRESENTATION.anchorHeight));
    if (item.zoom !== 1) preview.searchParams.set('zoom', String(item.zoom));
    return preview;
  }
  function fitPreview(iframe, item, group) {
    const view = EFFECT_VIEW[item.id] || EFFECT_VIEW[group.id] || { magnification: 1, focusX: 490, focusY: 310 };
    const fit = Math.min(stage.clientWidth / PRESENTATION.width, stage.clientHeight / PRESENTATION.height);
    const scale = fit * view.magnification;
    iframe.style.left = `${stage.clientWidth / 2 - view.focusX * scale}px`;
    iframe.style.top = `${stage.clientHeight / 2 - view.focusY * scale}px`;
    iframe.style.transform = `scale(${scale})`;
    iframe.dataset.fitScale = String(fit);
    iframe.dataset.displayScale = String(scale);
    iframe.dataset.magnification = String(view.magnification);
    iframe.dataset.focusX = String(view.focusX);
    iframe.dataset.focusY = String(view.focusY);
  }
  function select(index, versionIndex = 0) {
    selectedIndex = (index + entries.length) % entries.length;
    const group = entries[selectedIndex];
    selectedVersionIndex = Math.min(versionIndex, group.versions.length - 1);
    const item = group.versions[selectedVersionIndex];
    document.getElementById('selected-title').textContent = `${group.title} · ${item.title}`;
    document.getElementById('selected-description').textContent = item.detail;
    document.getElementById('selected-status').textContent = item.status;
    document.getElementById('selected-source').textContent = `WebGPU: ${item.source}`;
    versionSelect.replaceChildren(...group.versions.map((v, i) => {
      const option = document.createElement('option'); option.value = String(i);
      option.textContent = `${v.title} — ${v.status}`; return option;
    }));
    versionSelect.value = String(selectedVersionIndex);
    versionSelect.disabled = group.versions.length < 2;
    versionSelect.onchange = () => select(selectedIndex, Number(versionSelect.value));
    const sourceLink = document.getElementById('selected-link');
    const preview = makePreview(item); sourceLink.href = preview.href;
    sourceLink.textContent = '元のWebGPUプレビューを見る ↗';
    buttons.forEach((button, i) => button.setAttribute('aria-current', i === selectedIndex ? 'true' : 'false'));
    stage.querySelector('iframe')?.remove(); notice.hidden = false;
    if (!navigator.gpu) { notice.textContent = 'このブラウザーでは WebGPU を使用できません。'; return; }
    notice.textContent = 'WebGPU プレビューを読み込んでいます…';
    const iframe = document.createElement('iframe'); iframe.title = `${group.title} ${item.title} WebGPU 自動再生`;
    iframe.allow = 'autoplay'; iframe.width = String(PRESENTATION.width); iframe.height = String(PRESENTATION.height);
    iframe.src = preview.href; fitPreview(iframe, item, group);
    iframe.addEventListener('load', () => {
      try {
        const child = iframe.contentDocument; if (!child) throw new Error('プレビューにアクセスできません');
        const error = child.getElementById('error');
        const updateNotice = () => { const message = error?.textContent?.trim(); notice.textContent = message || ''; notice.hidden = !message; };
        updateNotice(); if (error) new MutationObserver(updateNotice).observe(error, { childList: true, characterData: true, subtree: true });
      } catch (error) { notice.textContent = error.message; notice.hidden = false; }
    });
    iframe.addEventListener('error', () => { notice.textContent = 'プレビューを読み込めませんでした'; notice.hidden = false; });
    stage.append(iframe); fitObserver?.disconnect(); fitObserver = new ResizeObserver(() => fitPreview(iframe, item, group)); fitObserver.observe(stage);
  }
  window.__webgpuEGallery = Object.freeze({ presentation: PRESENTATION,
    entries: Object.freeze(entries.map(group => Object.freeze({ id: group.id,
      latest: group.versions[0].id, versions: group.versions }))) });
  select(0);
})();
