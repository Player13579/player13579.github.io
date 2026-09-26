(() => {
  'use strict';

  // Keep every replayable Astra-designed version visible, including unaccepted trials.
  const entries = [{
    id: 'heal-astra-prototype',
    title: 'ヒール · Astra版',
    detail: '採用済みのヒール。WebGPUで自動ループ再生します。',
    status: '採用済み・再生可能',
    source: 'webgpu-heal-astra-prototype.js',
    page: 'heal-astra-preview.html'
  }, {
    id: 'sunbeam-astra-clean-v3', title: 'サンビーム · Astra v3',
    detail: '手元から伝播し対象へ届く最新版。ユーザー評価は良好。聴感と本編接続は未受入。',
    status: 'ユーザー評価良好・本編未採用', source: 'webgpu-sunbeam-astra-clean-v3.js', page: 'sunbeam-astra-clean-v3-preview.html'
  }, {
    id: 'luck-astra-clean-v4', title: '幸運 · Astra v4',
    detail: '独立制作した最新版。ユーザー評価は良好。聴感と本編接続は未受入。',
    status: 'ユーザー評価良好・本編未採用', source: 'webgpu-luck-astra-v4.js', page: 'luck-astra-v4-preview.html'
  }, {
    id: 'stamina-astra-zero-v1', title: 'スタミナ回復 · Astraゼロ設計 v1',
    detail: '実WebGPUで全寿命の連続再生を確認。実寸の形と聴感の品質は未受入。本編接続は未受入。',
    status: '試作・品質未受入・本編未採用', source: 'webgpu-stamina-astra-zero-preview.js', page: 'webgpu-stamina-astra-zero-preview.html'
  }, {
    id: 'mana-astra-zero-v1', title: 'マナ獲得 · Astraゼロ設計 v1',
    detail: '実WebGPUの自動ループを確認。再生の滑らかさ、実寸の形と聴感の品質は未受入。本編接続は未受入。',
    status: '試作・品質未受入・本編未採用', source: 'webgpu-mana-astra-zero-preview.js', page: 'webgpu-mana-astra-zero-preview.html'
  }, {
    id: 'emp-astra-zero-v1', title: 'EMP · Astraゼロ設計 v1',
    detail: '充填・放出・共振・相殺・蓄積の実WebGPU再生を確認。実寸の形と聴感の品質は未受入。本編接続は未受入。',
    status: '試作・品質未受入・本編未採用', source: 'webgpu-emp-astra-zero-preview.js', page: 'webgpu-emp-astra-zero-preview.html'
  }];
  const params = new URLSearchParams(location.search);
  let selectedIndex = 0;
  const catalog = document.getElementById('catalog');
  const stage = document.getElementById('stage');
  const notice = document.getElementById('notice');
  const buttons = entries.map((entry, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'item';
    button.dataset.id = entry.id;
    button.setAttribute('aria-current', 'false');
    const title = document.createElement('strong');
    title.textContent = entry.title;
    const status = document.createElement('span');
    status.textContent = entry.status;
    button.append(title, status);
    button.addEventListener('click', () => select(index));
    catalog.append(button);
    return button;
  });
  const counter = document.getElementById('entry-counter');
  counter.textContent = `${entries.length} 件`;

  function makePreview(entry) {
    const preview = new URL(entry.page, location.href);
    preview.searchParams.set('embed', '1');
    if (params.has('verify')) preview.searchParams.set('verify', params.get('verify') || '1');
    for (const key of ['phase', 'zoom']) {
      if (params.has(key)) preview.searchParams.set(key, params.get(key));
    }
    return preview;
  }

  function select(index) {
    selectedIndex = (index + entries.length) % entries.length;
    const entry = entries[selectedIndex];
    document.getElementById('selected-title').textContent = entry.title;
    document.getElementById('selected-description').textContent = entry.detail;
    document.getElementById('selected-status').textContent = entry.status;
    document.getElementById('selected-source').textContent = `WebGPU: ${entry.source}`;
    const sourceLink = document.getElementById('selected-link');
    const preview = makePreview(entry);
    sourceLink.href = preview.href;
    sourceLink.textContent = '元のWebGPUプレビューを見る ↗';
    buttons.forEach((button, buttonIndex) => {
      button.setAttribute('aria-current', buttonIndex === selectedIndex ? 'true' : 'false');
    });
    stage.querySelector('iframe')?.remove();
    notice.hidden = false;
    if (!navigator.gpu) {
      notice.textContent = 'このブラウザーでは WebGPU を使用できません。';
      return;
    }
    notice.textContent = 'WebGPU プレビューを読み込んでいます…';
    const iframe = document.createElement('iframe');
    iframe.title = `${entry.title} WebGPU 自動再生`;
    iframe.allow = 'autoplay';
    iframe.src = preview.href;
    iframe.addEventListener('load', () => {
      try {
        const child = iframe.contentDocument;
        if (!child) throw new Error('プレビューにアクセスできません');
        const error = child.getElementById('error');
        const updateNotice = () => {
          const message = error?.textContent?.trim();
          notice.textContent = message || '';
          notice.hidden = !message;
        };
        updateNotice();
        if (error) new MutationObserver(updateNotice).observe(error, { childList: true, characterData: true, subtree: true });
      } catch (error) {
        notice.textContent = error.message;
        notice.hidden = false;
      }
    });
    iframe.addEventListener('error', () => {
      notice.textContent = 'プレビューを読み込めませんでした';
      notice.hidden = false;
    });
    stage.append(iframe);
  }

  if (!entries.length) {
    counter.textContent = '0 件';
    notice.textContent = '表示できるAstra制作Eはありません。';
    return;
  }
  select(0);
})();
