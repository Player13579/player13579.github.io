(() => {
  'use strict';
  const PRESENTATION = Object.freeze({ width: 980, height: 620, anchorHeight: 64 });
  const EFFECT_VIEW = Object.freeze({
    'heal-astra-prototype': { magnification: 4, focusX: 490, focusY: 310 },
    'sunbeam-astra-clean-v3': { magnification: 1.18, focusX: 490, focusY: 310 },
    'luck-astra-clean-v4': { magnification: 3.5, focusX: 490, focusY: 195 },
    'barrier-astra': { magnification: 2.3, focusX: 510, focusY: 370 },
    'barrier-pro-r07': { magnification: 1.0, focusX: 490, focusY: 310 }
  });
  const version = (id, title, page, source, status, detail, anchor = 'actor-H64', zoom = 1) =>
    Object.freeze({ id, title, page, source, status, detail, anchor, zoom, replayable: true });
  // List technically replayable Astra versions, including trials that did not pass quality review.
  const entries = Object.freeze([
    Object.freeze({ id: 'heal-astra', title: 'ヒール', versions: Object.freeze([
      version('heal-astra-prototype', 'Astra版', 'heal-astra-preview.html', 'webgpu-heal-astra-prototype.js', 'ユーザー品質採用・発光と主形を確認済み', '採用済みヒール。連続再生の全寿命と聴感は未受入です。', 'actor-H64', 0.7937)
    ]) }),
    Object.freeze({ id: 'sunbeam-astra', title: 'サンビーム', versions: Object.freeze([
      version('sunbeam-astra-clean-v3', 'Astra v3', 'sunbeam-astra-clean-v3-preview.html', 'webgpu-sunbeam-astra-clean-v3.js', '品質合格・採用済み', '手元から伝播する三つの光路を持つ採用版。', 'effect-H64'),
      version('sunbeam-astra-clean-v2', 'Astra v2', 'sunbeam-astra-clean-v2-preview.html', 'webgpu-sunbeam-astra-clean-v2.js', '試作・品質未受入・本編未採用', '履歴上WebGPU再生可能。品質受入前の試作です。', 'effect-H64'),
      version('sunbeam-astra-clean-v1', 'Astra v1', 'sunbeam-astra-clean-v1-preview.html', 'webgpu-sunbeam-astra-clean-v1.js', '試作・品質未受入・本編未採用', '履歴上WebGPU再生可能。品質受入前の試作です。', 'effect-H64')
    ]) }),
    Object.freeze({ id: 'luck-astra', title: '幸運', versions: Object.freeze([
      version('luck-astra-clean-v4', 'Astra v4', 'luck-astra-v4-preview.html', 'webgpu-luck-astra-v4.js', '品質合格・採用済み', '採用済み幸運v4.'),
      version('luck-astra-clean-v3', 'Astra v3', 'luck-astra-v3-preview.html', 'webgpu-luck-astra-v3.js', '却下・品質未達・本編未採用', '履歴上WebGPU再生可能。翼の見た目が品質基準に届かず却下。'),
      version('luck-astra-clean-v2', 'Astra v2', 'luck-astra-v2-preview.html', 'webgpu-luck-astra-v2.js', '却下・品質未達・本編未採用', '履歴上WebGPU再生可能。翼の見た目が品質基準に届かず却下。'),
      version('luck-astra-clean-v1', 'Astra v1', 'luck-astra-v1-preview.html', 'webgpu-luck-astra-v1.js', '品質未審査・本編未採用', 'WebGPUプレビューとソースを掲載。品質判定記録なし。')
    ]) }),
    Object.freeze({ id: 'mana-astra', title: 'マナ', versions: Object.freeze([
      version('mana-astra-v5-pilot', 'Astra v5 pilot', 'webgpu-mana-astra-v5-pilot.html', 'webgpu-mana-astra-v5-pilot.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-clean-v4-pilot', 'Astra clean v4 pilot', 'mana-astra-clean-v4-pilot.html', 'webgpu-mana-astra-clean-v4-pilot.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-clean-v3', 'Astra clean v3', 'mana-astra-clean-v3-preview.html', 'webgpu-mana-astra-clean-v3.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-clean-v2', 'Astra clean v2', 'mana-astra-clean-v2-preview.html', 'webgpu-mana-astra-clean-v2.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-clean-v1', 'Astra clean v1', 'mana-astra-clean-v1-preview.html', 'webgpu-mana-astra-clean-v1.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-zero-v1', 'Astra zero v1', 'webgpu-mana-astra-zero-preview.html', 'webgpu-mana-astra-zero-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPU自動ループ再生済み。形状、滑らかさ、SFXが品質未達。')
    ]) }),
    Object.freeze({ id: 'stamina-astra', title: 'スタミナ', versions: Object.freeze([
      version('stamina-astra-clean-v3', 'Astra clean v3', 'stamina-astra-clean-v3-preview.html', 'webgpu-stamina-astra-clean-v3.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('stamina-astra-clean-v2', 'Astra clean v2', 'stamina-astra-clean-v2-preview.html', 'webgpu-stamina-astra-clean-v2.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('stamina-astra-clean-v1', 'Astra clean v1', 'stamina-astra-clean-v1-preview.html', 'webgpu-stamina-astra-clean-v1.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('stamina-astra-zero-v2', 'Astra zero v2', 'webgpu-stamina-astra-zero-v2-preview.html', 'webgpu-stamina-astra-zero-v2-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPU再生済み。H64シルエットと移送前面が読みにくい。'),
      version('stamina-astra-zero-v1', 'Astra zero v1', 'webgpu-stamina-astra-zero-preview.html', 'webgpu-stamina-astra-zero-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPU全寿命連続再生済み。形状とSFXが品質未達。')
    ]) }),
    Object.freeze({ id: 'emp-astra', title: 'EMP', versions: Object.freeze([
      version('emp-astra-v1.8', 'Astra v1.8', 'astra-emp-v1/versions/v1.8/index.html', 'astra-emp-v1/versions/v1.8/emp.mjs', '技術再生可能・品質審査中・本編未採用', 'Astraの技術再生可能版。品質審査中で本編未採用です。', 'effect-H64'),
      version('emp-astra-v1.7', 'Astra v1.7', 'astra-emp-v1/versions/v1.7/index.html', 'astra-emp-v1/versions/v1.7/emp.mjs', '品質不合格・本編未採用', 'Astra v1.7。品質不合格で本編未採用です。', 'effect-H64'),
      version('emp-astra-v1.6', 'Astra v1.6', 'astra-emp-v1/versions/v1.6/index.html', 'astra-emp-v1/versions/v1.6/emp.mjs', '品質不合格・本編未採用', 'Astra v1.6。品質不合格で本編未採用です。', 'effect-H64'),
      version('emp-astra-v1.5', 'Astra v1.5', 'astra-emp-v1/versions/v1.5/index.html', 'astra-emp-v1/versions/v1.5/emp.mjs', '品質不合格・本編未採用', 'Astra v1.5。品質不合格で本編未採用です。', 'effect-H64'),
      version('emp-astra-v1.4', 'Astra v1.4 · 復元再生', 'astra-emp-v1/versions/v1.4/index.html', 'astra-emp-v1/versions/v1.4/emp.mjs', '品質不合格・本編未採用', '原本欠落のため復元した再生版。チャージ・保管ロックの表示と形状が品質不合格です。', 'effect-H64'),
      version('emp-astra-v1.3', 'Astra v1.3 · 復元再生', 'astra-emp-v1/versions/v1.3/index.html', 'astra-emp-v1/versions/v1.3/emp.mjs', '品質不合格・本編未採用', '原本欠落のため復元した再生版。共鳴の識別とアルファ縁に品質上の問題があります。', 'effect-H64'),
      version('emp-astra-v1.2', 'Astra v1.2 · 復元再生', 'astra-emp-v1/versions/v1.2/index.html', 'astra-emp-v1/versions/v1.2/emp.mjs', '品質不合格・本編未採用', '原本欠落のため復元した再生版。薄いリング形状と共鳴表現が品質不合格です。', 'effect-H64'),
      version('emp-astra-zero-v1', 'Astra zero v1', 'webgpu-emp-astra-zero-preview.html', 'webgpu-emp-astra-zero-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPUでチャージ、放電、共鳴、キャンセル、保管ロックを再生済み。')
    ]) }),
    Object.freeze({ id: 'barrier-astra', title: 'バリア · Astra履歴', versions: Object.freeze([
      version('barrier-astra-r5r2', 'Astra r5 r2', 'webgpu-barrier-astra-v5-r2-gallery-preview.html', 'webgpu-barrier-astra-v5-gallery-runtime.js', '品質不合格・本編未採用', 'アーカイブ試作。青い球状に見えるとして不合格。'),
      version('barrier-astra-r5r1', 'Astra r5 r1', 'webgpu-barrier-astra-v5-r1-gallery-preview.html', 'webgpu-barrier-astra-v5-gallery-runtime.js', '品質不合格・本編未採用', 'アーカイブ試作。固い三日月状のカップに見えるとして不合格。'),
      version('barrier-astra-r5', 'Astra r5 r0', 'webgpu-barrier-astra-v5-r0-gallery-preview.html', 'webgpu-barrier-astra-v5-gallery-runtime.js', '品質不合格・本編未採用', 'アーカイブ試作。矩形の筒に見えるとして不合格。'),
      version('barrier-astra-review-fixes', 'Astra v4 review fixes', 'webgpu-barrier-astra-zero-v4reviewfix-preview.html', 'webgpu-barrier-astra-zero-v4reviewfix-preview.js', '品質不合格・本編未採用', 'アーカイブ試作。'),
      version('barrier-astra-optics1', 'Astra v4 optics 1', 'webgpu-barrier-astra-zero-v4optics1-preview.html', 'webgpu-barrier-astra-zero-v4optics1-preview.js', '品質未受入・本編未採用', 'アーカイブ試作。'),
      version('barrier-astra-r4', 'Astra r4', 'webgpu-barrier-astra-zero-v3r4-preview.html', 'webgpu-barrier-astra-zero-v3r4-preview.js', '品質未受入・本編未採用', 'アーカイブ試作。'),
      version('barrier-astra-r3', 'Astra r3', 'webgpu-barrier-astra-zero-v3r3-preview.html', 'webgpu-barrier-astra-zero-v3r3-preview.js', '品質未受入・本編未採用', 'アーカイブ試作。'),
      version('barrier-astra-r2', 'Astra r2', 'webgpu-barrier-astra-zero-v3r2-preview.html', 'webgpu-barrier-astra-zero-v3r2-preview.js', '品質未受入・本編未採用', 'アーカイブ試作。'),
      version('barrier-astra-r1', 'Astra r1', 'webgpu-barrier-astra-zero-v3-preview.html', 'webgpu-barrier-astra-zero-v3-preview.js', '品質未受入・本編未採用', 'アーカイブ試作。'),
      version('barrier-astra-zero-v2', 'Astra zero v2', 'webgpu-barrier-astra-zero-v2-preview.html', 'webgpu-barrier-astra-zero-v2-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPU再生可能。'),
      version('barrier-astra-zero-v1', 'Astra zero v1', 'webgpu-barrier-astra-zero-preview.html', 'webgpu-barrier-astra-zero-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPU再生可能。')
    ]) }),
    Object.freeze({ id: 'barrier-pro', title: 'バリア', versions: Object.freeze([
      version('barrier-pro-r07', 'GPT Pro r0.7', 'barrier-pro-r07/embed.html', 'barrier-pro-r07/barrier-pro-renderer.mjs', 'ユーザー品質採用・本編接続済み・SFX聴感未確認', 'ユーザーが版指定で採用したr0.7。制作元の帰属は保持します。実ゲーム発動と聴感の受入は未了です。', 'effect-H64')
    ]) })
  ]);
  const params = new URLSearchParams(location.search);
  let selectedIndex = 0;
  let selectedVersionIndex = 0;
  const catalog = document.getElementById('catalog');
  const stage = document.getElementById('stage');
  const notice = document.getElementById('notice');
  const versionSelect = document.getElementById('version-select');
  let fitObserver = null;
  let previewStatusPoll = null;
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
    preview.searchParams.set('galleryRelease', 'astra-history-20260928-v61');
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
    iframe.style.transformOrigin = 'top left';
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
    if (previewStatusPoll !== null) window.clearInterval(previewStatusPoll);
    previewStatusPoll = null;
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
        updateNotice();
        // Preview hosts differ in how they expose status; polling avoids cross-frame
        // Node identity failures during rapid version switching.
        previewStatusPoll = window.setInterval(updateNotice, 250);
      } catch (error) { notice.textContent = error.message; notice.hidden = false; }
    });
    iframe.addEventListener('error', () => { notice.textContent = 'プレビューを読み込めませんでした'; notice.hidden = false; });
    stage.append(iframe); fitObserver?.disconnect(); fitObserver = new ResizeObserver(() => fitPreview(iframe, item, group)); fitObserver.observe(stage);
  }
  window.__webgpuEGallery = Object.freeze({ presentation: PRESENTATION,
    entries: Object.freeze(entries.map(group => Object.freeze({ id: group.id,
      title: group.title,
      latest: group.versions[0].id, versions: group.versions }))) });
  select(0);
})();

