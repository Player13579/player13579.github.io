(() => {
  'use strict';
  const PRESENTATION = Object.freeze({ width: 980, height: 620, anchorHeight: 64 });
  const EFFECT_VIEW = Object.freeze({
    'heal-astra': { magnification: 4, focusX: 490, focusY: 310 },
    'sunbeam-astra': { magnification: 1.18, focusX: 490, focusY: 310 },
    'luck-astra': { magnification: 3.5, focusX: 490, focusY: 195 },
    'stamina-astra': { magnification: 4, focusX: 490, focusY: 310 },
    'mana-astra': { magnification: 3.4, focusX: 490, focusY: 355 },
    'emp-astra': { magnification: 2.2, focusX: 490, focusY: 310 },
    'barrier-astra': { magnification: 3.7, focusX: 490, focusY: 355 },
    'barrier-astra-r5r2': { magnification: 4.4, focusX: 490, focusY: 310 },
    'barrier-astra-r5r1': { magnification: 4.4, focusX: 490, focusY: 310 },
    'barrier-astra-r5': { magnification: 4.4, focusX: 490, focusY: 310 },
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
      version('sunbeam-astra-clean-v2', 'Astra v2', 'sunbeam-astra-clean-v2-preview.html', 'webgpu-sunbeam-astra-clean-v2.js', '試作・品質未受入・本編未採用', '独立設計の旧版。再生可能。品質と本編接続は未受入.', 'effect-H64'),
      version('sunbeam-astra-clean-v1', 'Astra v1', 'sunbeam-astra-clean-v1-preview.html', 'webgpu-sunbeam-astra-clean-v1.js', '試作・品質未受入・本編未採用', '独立設計の初版。再生可能。品質と本編接続は未受入.', 'effect-H64')
    ] },
    { id: 'luck-astra', title: '幸運', versions: [
      version('luck-astra-clean-v4', 'Astra v4', 'luck-astra-v4-preview.html', 'webgpu-luck-astra-v4.js', '品質合格・採用済み・本編接続待ち', '独立制作した最新版。Eとして採用済み。本編の実イベント接続は未完了。'),
      version('luck-astra-clean-v3', 'Astra v3', 'luck-astra-v3-preview.html', 'webgpu-luck-astra-v3.js', '却下・再生可能・本編未採用', '独立設計の旧版。翼の見え方により却下。品質と本編接続は未受入.'),
      version('luck-astra-clean-v2', 'Astra v2', 'luck-astra-v2-preview.html', 'webgpu-luck-astra-v2.js', '却下・再生可能・本編未採用', '独立設計の旧版。翼の見え方により却下。品質と本編接続は未受入.')
    ] },
    { id: 'stamina-astra', title: 'スタミナ回復', versions: [
      version('stamina-astra-zero-v2', 'Astraゼロ設計 v2', 'webgpu-stamina-astra-zero-v2-preview.html', 'webgpu-stamina-astra-zero-v2-preview.js', '試作・品質未達・本編未採用', '左右の流入面から全身への充填を狙った新案。WebGPU再生は確認済みだが、H64で面・受け渡し・前線が十分に読めず品質未達。'),
      version('stamina-astra-zero-v1', 'Astraゼロ設計 v1', 'webgpu-stamina-astra-zero-preview.html', 'webgpu-stamina-astra-zero-preview.js', '試作・品質未達・本編未採用', '実WebGPUで全寿命の連続再生を確認。実寸の形と聴感が品質基準に未達。')
    ] },
    { id: 'mana-astra', title: 'マナ獲得', versions: [version('mana-astra-zero-v1', 'Astraゼロ設計 v1', 'webgpu-mana-astra-zero-preview.html', 'webgpu-mana-astra-zero-preview.js', '試作・品質未達・本編未採用', '実WebGPUの自動ループを確認。滑らかさ、実寸の形と聴感が品質基準に未達。')] },
    { id: 'emp-astra', title: 'EMP', versions: [version('emp-astra-zero-v1', 'Astraゼロ設計 v1', 'webgpu-emp-astra-zero-preview.html', 'webgpu-emp-astra-zero-preview.js', '試作・品質未達・本編未採用', '充填・放出・共振・相殺・蓄積を実WebGPUで再生。実寸の形と聴感が品質基準に未達。', 'effect-H64')] },
    { id: 'barrier-astra', title: 'バリア', versions: [
      version('barrier-astra-r5r2', 'Astra r5r2', 'webgpu-barrier-astra-v5-r2-gallery-preview.html', 'webgpu-barrier-astra-v5-gallery-runtime.js', '試作・品質不合格・本編未採用', '空域を狙った再設計。実WebGPU原寸では青い球状に見え、保護面と空域が読めないため不合格。', 'effect-H64'),
      version('barrier-astra-r5r1', 'Astra r5r1', 'webgpu-barrier-astra-v5-r1-gallery-preview.html', 'webgpu-barrier-astra-v5-gallery-runtime.js', '試作・品質不合格・本編未採用', '非対称包囲場の試作。原寸では固体の三日月容器に見え、吸収動作も弱いため不合格。', 'effect-H64'),
      version('barrier-astra-r5', 'Astra r5', 'webgpu-barrier-astra-v5-r0-gallery-preview.html', 'webgpu-barrier-astra-v5-gallery-runtime.js', '試作・品質不合格・本編未採用', '透過包囲場の試作。合成修正後も矩形チューブ状に見え、保護場として不合格。', 'effect-H64'),
      version('barrier-astra-review-fixes', 'Astra r4 review-fixes', 'webgpu-barrier-astra-zero-v4reviewfix-preview.html', 'webgpu-barrier-astra-zero-v4reviewfix-preview.js', '試作・品質不合格・本編未採用', '破壊時の奥膜遅延とreduced motionを修正。原寸での面と因果は改善したが兜状の輪郭と実速度のフレーム欠落が残り、完成品質には不合格。', 'effect-H64'),
      version('barrier-astra-optics1', 'Astra r4 optics1', 'webgpu-barrier-astra-zero-v4optics1-preview.html', 'webgpu-barrier-astra-zero-v4optics1-preview.js', '試作・品質未受入・本編未採用', 'r4の局所発光・透過改稿。4事象を実WebGPUで再生。原寸の可読性、全寿命、聴感は未受入。', 'effect-H64'),
      version('barrier-astra-r4', 'Astra r4', 'webgpu-barrier-astra-zero-v3r4-preview.html', 'webgpu-barrier-astra-zero-v3r4-preview.js', '試作・品質未受入・本編未採用', 'r4形状・層の4事象を実WebGPUで再生。初期画面で暗く形が読めず品質未受入。', 'effect-H64'),
      version('barrier-astra-r3', 'Astra r3', 'webgpu-barrier-astra-zero-v3r3-preview.html', 'webgpu-barrier-astra-zero-v3r3-preview.js', '試作・品質未受入・本編未採用', 'r3の支持配置を含む4事象を実WebGPUで再生。平坦な高不透明面と暗い接続部が残り品質未受入。', 'effect-H64'),
      version('barrier-astra-r2', 'Astra r2', 'webgpu-barrier-astra-zero-v3r2-preview.html', 'webgpu-barrier-astra-zero-v3r2-preview.js', '試作・品質未受入・本編未採用', 'r2の4事象を実WebGPUで再生。独立改稿履歴として保持し、品質・本編接続は未受入。', 'effect-H64'),
      version('barrier-astra-r1', 'Astra r1', 'webgpu-barrier-astra-zero-v3-preview.html', 'webgpu-barrier-astra-zero-v3-preview.js', '試作・品質未受入・本編未採用', '独立設計r1の4事象を実WebGPUで連続再生。初稿の履歴で、品質・本編接続は未受入。', 'effect-H64'),
      version('barrier-astra-zero-v2', 'Astraゼロ設計 v2', 'webgpu-barrier-astra-zero-v2-preview.html', 'webgpu-barrier-astra-zero-v2-preview.js', '試作・品質未達・本編未採用', '包囲面の成立・吸収・耐久破壊・バスト解除を実WebGPUで再生。比較画面ではキャラを表示しません。広い白飛びと4枝の形状差が品質基準に未達。', 'effect-H64'),
      version('barrier-astra-zero-v1', 'Astraゼロ設計 v1', 'webgpu-barrier-astra-zero-preview.html', 'webgpu-barrier-astra-zero-preview.js', '試作・品質未達・本編未採用', '成立・持続・吸収・耐久破壊・バスト解除を実WebGPUで再生。実寸の形と聴感が品質基準に未達。')
    ] },
    { id: 'barrier-pro', title: 'バリア（GPT Pro比較）', versions: [
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
