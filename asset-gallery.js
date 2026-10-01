(() => {
  'use strict';
  const PRESENTATION = Object.freeze({ width: 980, height: 620, anchorHeight: 64 });
  const EFFECT_VIEW = Object.freeze({
    // Each frozen Sol version is framed from its own iframe CSS canvas and H64 actor size.
    // The target on-screen actor height is 240 CSS px; focus is each canvas' actual center
    // mapped into the 980x620 gallery iframe (including Stamina r8's centered 480x260 canvas).
    'stamina-sol61-r8': { magnification: 240 / (64 * (530 / 260)), focusX: 490, focusY: 310 },
    'mana-zero-sol61-r4': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'mana-zero-sol61-r6': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    // Native embed is 980x620; the centered actor was measured at 63px of the requested H64.
    'mana-zero-sol61-r8': { magnification: 240 / 63, focusX: 490, focusY: 310 },
    // r13 deliberately compares dark/light H64 actors side-by-side; keep both in frame.
    'stamina-sol61-r13': { magnification: 1, focusX: 490, focusY: 310 },
    // Clock r4's package contract is a single centered H64 actor in a native 980x620 canvas.
    'cooldown-clock-zero-r4': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'mana-zero-sol61-r7': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'mana-zero-sol61-r5': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'stamina-sol61-r9-frontfix': { magnification: 240 / (64 * (980 / 480)), focusX: 490, focusY: 200 },
    'stamina-sol61-r10': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'stamina-sol61-r12': { magnification: 240 / 64, focusX: 490, focusY: 293.75 },
    'stamina-sol61-r11': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'cooldown-clock-zero-r1': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'cooldown-clock-zero-r3': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'cooldown-clock-zero-r2': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'barrier-sol61-r4': { magnification: 4, focusX: 490, focusY: 310 },
    'barrier-sol61-r6': { magnification: 4, focusX: 490, focusY: 310 },
    'barrier-sol61-r5': { magnification: 4, focusX: 490, focusY: 310 },
    // Barrier r8 exposes the full contract canvas; preserve its 49:31 view and H64 bounds.
    'barrier-sol61-r8': { magnification: 1, focusX: 490, focusY: 310 },
    // Fidelity-fixed r8 keeps the complete native 49:31 field; do not zoom/crop.
    'barrier-sol61-r8-fidelityfix-a1': { magnification: 1, focusX: 490, focusY: 310 },
    // r9 a1 is a native dual-cell 980x620 comparison; preserve both full 490x620 cells.
    'barrier-sol61-r9-gallery-a1': { magnification: 1, focusX: 490, focusY: 310 },
    // r10 keeps the native 49:31 contract canvas and full dual/dark-light composition.
    'barrier-sol61-r10': { magnification: 1, focusX: 490, focusY: 310 },
    'barrier-sol61-r11': { magnification: 1, focusX: 490, focusY: 310 },
    // H64 body anchor is at 75% canvas height; center the full actor/receipt bounds at 240px.
    'sol61-rational-free-r1': { magnification: 240 / 64, focusX: 490, focusY: 433 },
    // Dodge r1's native 980x620 package centers the H64 actor and its field at 490,310.
    'sol61-dodge-zero-r1': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'teleport-sol61-zero-r1': { magnification: 240 / 64, focusX: 490, focusY: 349 },
    'cooldown-sol61-shortening-zero': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'stamina-sol61-r7': { magnification: 240 / (64 * (530 / 260)), focusX: 490, focusY: 310 },
    'mana-zero-sol61-r3': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'mana-zero-sol61-r2': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'cooldown-sol61-r5-attempt-1': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'cooldown-sol61-r5-attempt-2': { magnification: 240 / 64, focusX: 490, focusY: 310 },
    'stamina-sol61-r6': { magnification: 2.4, focusX: 480, focusY: 260 },
    'barrier-sol61-r3': { magnification: 4, focusX: 490, focusY: 310 },
    'mana-zero-sol61-r1': { magnification: 4, focusX: 490, focusY: 312 },
    'barrier-sol61-r2': { magnification: 4, focusX: 490, focusY: 310 },
    'barrier-sol61-r2-draft1': { magnification: 4, focusX: 490, focusY: 310 },
    'cooldown-sol61-r4': { magnification: 4, focusX: 490, focusY: 312 },
    'barrier-sol61-r1': { magnification: 4, focusX: 490, focusY: 310 },
    'cooldown-sol61-r1': { magnification: 4, focusX: 490, focusY: 312 },
    'cooldown-sol61-r2': { magnification: 4, focusX: 490, focusY: 312 },
    'cooldown-sol61-r3': { magnification: 4, focusX: 490, focusY: 312 },
    'stamina-sol61-r4': { magnification: 1.86, focusX: 490, focusY: 316.5 },
    'stamina-sol61-r3': { magnification: 1.86, focusX: 490, focusY: 316.5 },
    'mana-sol61-r1': { magnification: 4.2, focusX: 300, focusY: 95 },
    'status-recovery-sol61-r1': { magnification: 1.18, focusX: 490, focusY: 245 },
    'status-recovery-sol61-r1-draft1': { magnification: 1.18, focusX: 490, focusY: 245 },
    'item-pickup-sol61-r1': { magnification: 3.2, focusX: 144, focusY: 72 },
    'stamina-sol61-r1': { magnification: 2.5, focusX: 490, focusY: 340 },
    'stamina-sol61-r2': { magnification: 2.5, focusX: 490, focusY: 340 },
    'item-pickup-sol-r2': { magnification: 3.5, focusX: 128, focusY: 80 },
    'heal-astra-prototype': { magnification: 4, focusX: 490, focusY: 310 },
    'sunbeam-astra-clean-v3': { magnification: 1.18, focusX: 490, focusY: 310 },
    'luck-astra-clean-v4': { magnification: 3.5, focusX: 490, focusY: 195 },
    // These H64 replay packages occupy a small part of their 980x620 source
    // canvas. Enlarge the gallery view only; each preview still renders H64.
    'mana-astra': { magnification: 4.25, focusX: 245, focusY: 310 },
    'stamina-astra-r01-replay': { magnification: 4.25, focusX: 490, focusY: 496 },
    'stamina-recovery-v2-r02': { magnification: 4.25, focusX: 490, focusY: 496 },
    'stamina-recovery-v2-r03': { magnification: 4.25, focusX: 490, focusY: 496 },
    'sunbeam-lens-v2-r01': { magnification: 2.25, focusX: 480, focusY: 310 },
    'sunbeam-lens-v2-r02': { magnification: 2.25, focusX: 480, focusY: 310 },
    'sunbeam-lens-v2-r03': { magnification: 2.25, focusX: 480, focusY: 310 },
    'sunbeam-lens-v2-r04': { magnification: 2.25, focusX: 480, focusY: 310 },
    'sunbeam-lens-v2-r05': { magnification: 2.25, focusX: 480, focusY: 310 },
    'sunbeam-optical-sol61-r06': { magnification: 2.25, focusX: 480, focusY: 310 },
    'sunbeam-optical-sol61-r07': { magnification: 2.25, focusX: 480, focusY: 310 },
    'vibe-coding-sol61-r1': { magnification: 240 / 64, focusX: 490, focusY: 320.75 },
    'mana-receive-v2-r03': { magnification: 3.0, focusX: 300, focusY: 321 },
    'mana-receive-v2-r04': { magnification: 3.0, focusX: 300, focusY: 131 },
    'mana-receive-v2-r05': { magnification: 3.0, focusX: 300, focusY: 131 },
    'mana-receive-v2-r06': { magnification: 3.0, focusX: 300, focusY: 131 },
    'mana-receive-v2-r07': { magnification: 3.0, focusX: 300, focusY: 131 },
    'stamina-astra': { magnification: 4.25, focusX: 518, focusY: 343 },
    'status-cleanse-astra': { magnification: 4.25, focusX: 490, focusY: 310 },
    'status-cleanse-astra-r29': { magnification: 4.25, focusX: 490, focusY: 310 },
    'cooldown-astra': { magnification: 1.0, focusX: 490, focusY: 310 },
    'barrier-pro-r07': { magnification: 1.0, focusX: 490, focusY: 310 }
  });
  const version = (id, title, page, source, status, detail, anchor = 'actor-H64', zoom = 1, metadata = {}) =>
    Object.freeze({ id, title, page, source, status, detail, anchor, zoom, ...metadata, replayable: true });
  // List technically replayable Astra versions, including trials that did not pass quality review.
  const entries = Object.freeze([
    Object.freeze({ id: 'teleport-sol61', title: '転移', defaultVersionId: 'teleport-sol61-zero-r1', integration: 'not-integrated', reason: '新しいSolゼロ設計のWebGPU候補。本編接続と品質審査は未完了。', versions: Object.freeze([
      version('teleport-sol61-zero-r1', 'GPT-6.1-Sol zero r1', 'public/sol61-teleport-zero-r1/index.html', 'public/sol61-teleport-zero-r1/artist.mjs', '実WebGPU再生確認済み・品質審査前・未採用・本編未接続', '作者: GPT-6.1-Sol。忠実な再生実装: GPT-6-Luna。出発と到着を760 E-msで交互に再生するデジタルゲート。現象固有SFXを同じ時計で再生し、初回は音声操作が必要。人物・マップへの受光はこの独立プレビューでは無効。本編の実人物との接続、視覚品質、通常音声の聴感は未受入。', 'effect-H64', 1, {originalCreatorDisplayName: 'GPT-6.1-Sol', designAuthorDisplayName: 'GPT-6.1-Sol', runtimeAuthorDisplayName: 'GPT-6-Luna', creatorDisplayName: 'GPT-6.1-Sol (design) + GPT-6-Luna (implementation)', creatorModelId: 'gpt-6.1-sol+gpt-6-luna', adoption: 'unknown', qualityStatus: 'not_run', technicalReplayStatus: 'pass', normalAudioListening: 'not_run', gameIntegrationStatus: 'not_connected', technicalEvidence: 'outputs/request-20261001/teleport-zero-r1/native/READY.json'})
    ]) }),
    Object.freeze({ id: 'item-pickup-sol', title: 'アイテム取得', defaultVersionId: 'item-pickup-sol61-r1', versions: Object.freeze([
      version('item-pickup-sol61-r1', 'GPT-6.1-Sol r1', 'public/sol61-item-pickup-e/r1/preview.html', 'public/sol61-item-pickup-e/r1/design.mjs', 'アイテム取得全般としてユーザー採用済み・本編接続中', '作者: GPT-6.1-Sol。ユーザーがr1をアイテム取得全般の共通Eとして採用。接地取得・箱・戦利品・受け取り等の成功した取得に適用する。取得元から実際の受領枠へ光が移動し、枠の輪郭へ定着する。有限VFXとSFXが同期ループ。原版の作者と表現を保持し、本編全経路への接続・実発動・聴感は検証中。', 'effect-H64'),
      version('item-pickup-sol-r2', 'Sol r2', 'public/sol-item-pickup-e/sol-r2/preview.html', 'public/sol-item-pickup-e/sol-r2/item-pickup-e.js', '品質完成候補・ユーザー採用未確認・本編未接続', '作者: GPT-6-Sol。正規action-item-pickupイベントから新規設計。接地面の収束、連続した曲面移送、受領部の強い局所光をWebGPUで自動再生。暗明H64の全寿命とGPUエラー0、SFX数値を確認。聴感と実キャラ遮蔽・本編接続は未審査。ユーザー採用未確認。', 'effect-H64')
    ]) }),
    Object.freeze({ id:'rational-free-sol', title:'固有能力のマナ消費免除', defaultVersionId:'sol61-rational-free-r1', integration:'not-integrated', reason:'技術再生可能なGPT-6.1-Sol設計のRational Free r1。2026-10-01ユーザー採用。品質審査・通常聴感・本編統合は未実施。', versions:Object.freeze([
      version('sol61-rational-free-r1','GPT-6.1-Sol r1','public/sol61-rational-free/r1/index.html?embed=1','public/sol61-rational-free/r1/index.html','実WebGPU技術再生pass・視覚品質未審査・聴感未検証・本編未接続・ユーザー採用済み','作者: GPT-6.1-Sol。忠実なruntime・パッケージ実装: GPT-6-Luna。2026-10-01ユーザー採用。本編未接続、通常聴感未検査。元の12ファイルartist freezeはSHA-256一致。今回の正規Pages package内atlas実測SHA-256 cf3df51d88129ad51e175dd894ef2c269626a2d60fec912289789e099d8fcb8fを使用したverify付き実GPU検証でcanvas 980×620、H64 actor registration、78 frame submissions、3 receipt cycles、GPU fault・shader warnings・console errors 0、verify audio context/gain 0を確認。歴史GPU report内のatlas SHAは手入力と確認されたため履歴として保存し、現行byte検証には使わない。','actor-H64',1,{note:'正規Pages packageでの新規verify実GPU再生はpass。2026-10-01ユーザー採用。品質審査・通常聴感・本編統合は未実施。歴史GPU reportのatlas SHAは測定値ではなく、今回のpackage内atlas実測SHAは cf3df51d88129ad51e175dd894ef2c269626a2d60fec912289789e099d8fcb8f。',originalCreatorDisplayName:'GPT-6.1-Sol',designAuthorDisplayName:'GPT-6.1-Sol',runtimeAuthorDisplayName:'GPT-6-Luna',creatorModelId:'gpt-6.1-sol+gpt-6-luna',creatorDisplayName:'GPT-6.1-Sol (design) + GPT-6-Luna (implementation)',adoption:'adopted',qualityStatus:'not_run',technicalReplayStatus:'pass',normalAudioListening:'not_run',gameIntegrationStatus:'not_connected',technicalEvidence:'outputs/request-20260930/rational-r1-gallery-package/native-gpu-replay.json',packageClosure:'outputs/request-20260930/rational-r1-gallery-package/package-closure.json'})
    ]) }),
    Object.freeze({ id: 'heal-astra', title: 'ヒール', defaultVersionId: 'heal-astra-sparkle-r1', versions: Object.freeze([
      version('heal-astra-sparkle-r1', 'Astra sparkle r1', 'public/astra-heal-sparkle-r1/index.html', 'public/astra-heal-sparkle-r1/heal-sparkle.js', 'ユーザー採用済み・ゲームコード接続済み・公開起動確認済み', '作者: GPT-6-Astra。ユーザー指定でHeal sparkle r1を採用。既存の視覚審査候補記録は維持し、明背景の一部でコントラスト低下あり。聴感未実施、公開Play→準備画面のWebGPU起動確認済み。実発動・全寿命・SFX聴感は未確認。', 'actor-H64'),
      version('heal-astra-sparkle-r3', 'Astra sparkle r3', 'public/astra-heal-sparkle-r3/index.html', 'public/astra-heal-sparkle-r3/heal-sparkle.js', '視覚品質候補・ユーザー未採用・本編未接続', '作者: GPT-6-Astra。光条角度は全点・全位相で統一（主光条−64°、交差光条+26°）。品質理由: 全点/全位相でHeal基準角−64°。H64暗明で読める十字光条、元主形/発光保持、OFF元版一致。明背景の主光流に重なる一部点は局所差が弱い。音実聴未実施、本編未接続、ユーザー未採用。', 'actor-H64'),
      version('heal-astra-sparkle-r2', 'Astra sparkle r2', 'public/astra-heal-sparkle-r2/index.html', 'public/astra-heal-sparkle-r2/heal-sparkle.js', '比較用旧稿・角度統一条件未対応・未採用・本編未接続', '作者: GPT-6-Astra。回復リボン接線に合わせて光条ごとに角度を変える旧稿で、現在の統一角度条件には未対応。元記録のH64視覚品質候補: H64暗明で題材に沿う交差光条・元主形・発光保持を確認。34 A/B画像で減光チャンネル0。明背景の白い主光流と重なる点は局所差が小さい。実聴未実施、本編未接続、ユーザー未採用。', 'actor-H64'),
      version('heal-astra-sparkle-draft-b', 'Astra sparkle draft B', 'public/astra-heal-sparkle-r1/draft-b/index.html', 'public/astra-heal-sparkle-r1/draft-b/heal-sparkle.js', '品質不合格・旧試作・未採用', '作者: GPT-6-Astra。履歴品質理由: Receiver moved into torso; maintenance sparkle still too small. 後続r1に置換。', 'actor-H64'),
      version('heal-astra-sparkle-draft-a', 'Astra sparkle draft A', 'public/astra-heal-sparkle-r1/draft-a/index.html', 'public/astra-heal-sparkle-r1/draft-a/heal-sparkle.js', '品質不合格・旧試作・未採用', '作者: GPT-6-Astra。履歴品質理由: Maintenance sparkle too weak; one receiver anchor near face. 後続r1に置換。', 'actor-H64'),
      version('heal-astra-prototype', 'Astra旧採用原版', 'heal-astra-preview.html', 'webgpu-heal-astra-prototype.js', '旧採用版・r1へ更新', '以前の採用原版として来歴を保持。現行採用版はユーザー指定のsparkle r1。原版の採用履歴は変えず、現在の版選択とは区別しています。', 'actor-H64', 0.7937)
    ]) }),
    Object.freeze({ id: 'vibe-coding-sol61', title: 'バイブコーディング', defaultVersionId: 'vibe-coding-sol61-r1', versions: Object.freeze([
      version('vibe-coding-sol61-r1', 'GPT-6.1-Sol r1', 'public/sol61-vibe-coding/r1/index.html?embed=1', 'public/sol61-vibe-coding/r1/package-manifest.json', '実WebGPU再生確認済み・品質候補・採用未確認・本編未接続', '設計: GPT-6.1-Sol。凍結artist sourceを保持し、actor atlas転送先の必須用途フラグを修正。実GPUでキャラalpha4,837画素と同じイベントに属するE描画を確認。品質・通常SFX聴感・本編接続は未受入。', 'effect-H64', 1, {creator:'gpt-6.1-sol',creatorDisplayName:'GPT-6.1-Sol',adoption:'unknown',qualityStatus:'candidate',technicalReplayStatus:'pass',normalAudioListening:'not_run',gameIntegrationStatus:'not_connected'}),
    ]) }),
    Object.freeze({ id: 'sunbeam-astra', title: 'サンビーム', defaultVersionId: 'sunbeam-lens-v2-r05', versions: Object.freeze([
      version('sunbeam-optical-sol61-r07', 'GPT-6.1-Sol optical r07', 'public/sol61-sunbeam-optical-r07/index.html?embed=1&height=64', 'public/sol61-sunbeam-optical-r07/effect.mjs', '実WebGPU再生確認済み・改修候補・ユーザー未採用・本編未接続', '光学改稿: GPT-6.1-Sol。基盤: GPT-6-Astraの採用済みr05を保持。薄いリング状ゴーストと画面内に見える部分を分離。全寿命11時点・源OFF・OBS OFF・光源/観測中心の変更を実GPU記録。通常SFX聴感と品質の最終受入は未実施。現行採用版r05は保持。', 'effect-H64', 1, {creator:'gpt-6.1-sol',creatorDisplayName:'GPT-6.1-Sol (optical revision); GPT-6-Astra (preserved base)',adoption:'not-adopted',qualityStatus:'candidate',technicalReplayStatus:'pass',normalAudioListening:'not_run',gameIntegrationStatus:'not_connected'}),
      version('sunbeam-optical-sol61-r06', 'GPT-6.1-Sol optical r06', 'public/sol61-sunbeam-optical-r06/index.html?embed=1&height=64', 'public/sol61-sunbeam-optical-r06/effect.mjs', '実WebGPU再生確認済み・改修候補・ユーザー未採用・本編未接続', '光学改稿: GPT-6.1-Sol。基盤: GPT-6-Astraの採用済みr05を保持。開いた虹色円弧と丸形・六角形ゴーストを同じ光源・観測光軸へ接続。暗背景の全寿命、明背景ピーク、源OFF・OBS OFF・位置変更を実GPU確認。通常SFX聴感と品質の最終受入は未実施。現行採用版r05は保持。', 'effect-H64', 1, {creator:'gpt-6.1-sol',creatorDisplayName:'GPT-6.1-Sol (optical revision); GPT-6-Astra (preserved base)',adoption:'not-adopted',qualityStatus:'candidate',technicalReplayStatus:'pass',normalAudioListening:'not_run',gameIntegrationStatus:'not_connected'}),
      version("sunbeam-lens-v2-r05", "Astra lens r05", "public/astra-sunbeam-lens-ghost-v2/sunbeam-r05/index.html?embed=1&height=64", "public/astra-sunbeam-lens-ghost-v2/sunbeam-r05/effect.mjs", "ユーザー採用済み・本編接続待ち", "作者: GPT-6-Astra。ユーザーが現行最新版r05を採用。ギャラリー同等iframeでWebGPU描画・自動ループ確認済み。採用原版の表現・作者を保持し、本編の実発動・掌の発射元・レンズゴースト・SFX聴感は接続時に検証する。", 'effect-H64'),
      version("sunbeam-lens-v2-r04", "Astra lens r04", "public/astra-sunbeam-lens-ghost-v2/sunbeam-r04/index.html?embed=1&height=64", "public/astra-sunbeam-lens-ghost-v2/sunbeam-r04/effect.mjs", "品質候補・ユーザー未採用・本編未接続", "作者: GPT-6-Astra。技術再生確認済み。品質候補に留まり、SFX聴感/ユーザー採用/本編接続は未受入。", 'effect-H64'),
      version("sunbeam-lens-v2-r03", "Astra lens r03", "public/astra-sunbeam-lens-ghost-v2/sunbeam-r03/index.html?embed=1&height=64", "public/astra-sunbeam-lens-ghost-v2/sunbeam-r03/effect.mjs", "品質候補・ユーザー未採用・本編未接続", "作者: GPT-6-Astra。技術再生確認済み。品質候補に留まり、SFX聴感/ユーザー採用/本編接続は未受入。", 'effect-H64'),
      version("sunbeam-lens-v2-r02", "Astra lens r02", "public/astra-sunbeam-lens-ghost-v2/sunbeam-r02/index.html?embed=1&height=64", "public/astra-sunbeam-lens-ghost-v2/sunbeam-r02/effect.mjs", "品質不合格・ユーザー未採用・本編未接続", "作者: GPT-6-Astra。技術再生確認済み。品質不合格の歴史版。ユーザー未採用、本編未接続。", 'effect-H64'),
      version("sunbeam-lens-v2-r01", "Astra lens r01", "public/astra-sunbeam-lens-ghost-v2/sunbeam-r01/index.html?embed=1&height=64", "public/astra-sunbeam-lens-ghost-v2/sunbeam-r01/effect.mjs", "品質不合格・ユーザー未採用・本編未接続", "作者: GPT-6-Astra。技術再生確認済み。品質不合格の歴史版。ユーザー未採用、本編未接続。", 'effect-H64'),
      version('sunbeam-lens-ghost-r5', 'Astra lens-ghost r5', 'public/astra-sunbeam-lens-ghost-v1/versions/r5/index.html?embed=1&height=64', 'public/astra-sunbeam-lens-ghost-v1/versions/r5/sunbeam.js', '品質不合格・ユーザー未採用・本編未接続', '作者: GPT-6-Astra。凍結sourceで実WebGPU再生pass。品質理由: ghostはぼけた丸い粒子列に見え、主beamも細い白線＋橙縁に留まる。光学像と光束の厚みが未達で改稿。連続再生は外れ値を含み、完全な滑らかさは未受入。SFX聴感未実施、ユーザー未採用、本編未接続。', 'effect-H64'),
      version('sunbeam-lens-ghost-r4', 'Astra lens-ghost r4', 'public/astra-sunbeam-lens-ghost-v1/versions/r4/index.html?embed=1&height=64', 'public/astra-sunbeam-lens-ghost-v1/versions/r4/sunbeam.js', '品質不合格・ユーザー未採用・本編未接続', '作者: GPT-6-Astra。凍結sourceで実WebGPU再生pass。品質理由: 虹色Cが光源/beamから孤立した記号に見え、横長veilも第二の光束に読める。時間構造には改善があったが全体品質未達。連続再生は外れ値を含み、完全な滑らかさは未受入。SFX聴感未実施、ユーザー未採用、本編未接続。', 'effect-H64'),
      version('sunbeam-lens-ghost-r3', 'Astra lens-ghost r3', 'public/astra-sunbeam-lens-ghost-v1/versions/r3/index.html?embed=1&height=64', 'public/astra-sunbeam-lens-ghost-v1/versions/r3/sunbeam.js', '品質不合格・ユーザー未採用・本編未接続', '作者: GPT-6-Astra。凍結sourceで実WebGPU再生pass。品質理由: 時点を変えても主形がほぼ同じで、時間状態が読み分けにくい。虹Cと焦点外円が孤立し、source peakと同期したveilも不足。SFX聴感未実施、ユーザー未採用、本編未接続。', 'effect-H64'),
      version('sunbeam-lens-ghost-r2', 'Astra lens-ghost r2', 'public/astra-sunbeam-lens-ghost-v1/versions/r2/index.html?embed=1&height=64', 'public/astra-sunbeam-lens-ghost-v1/versions/r2/sunbeam.js', '品質不合格・ユーザー未採用・本編未接続', '作者: GPT-6-Astra。凍結sourceで実WebGPU再生pass。品質理由: 虹色円弧が独立した括弧の列に見え、主beamは細線状で体積と作用の厚みが弱い。連続再生は外れ値を含み、SFX聴感未実施、ユーザー未採用、本編未接続。', 'effect-H64'),
      version('sunbeam-lens-ghost-r1', 'Astra lens-ghost r1', 'public/astra-sunbeam-lens-ghost-v1/versions/r1/index.html?embed=1&height=64', 'public/astra-sunbeam-lens-ghost-v1/versions/r1/sunbeam.js', '品質不合格・ユーザー未採用・本編未接続', '作者: GPT-6-Astra。凍結sourceで実WebGPU再生pass。品質理由: 六つの類似輪郭が独立した図形の羅列に見え、結像系全体の応答が成立していない。連続再生の最大gapは暗108.2ms/明124.6msで原因未確定。SFX聴感未実施、ユーザー未採用、本編未接続。', 'effect-H64'),
      version('sunbeam-astra-clean-v3', 'Astra v3', 'sunbeam-astra-clean-v3-preview.html', 'webgpu-sunbeam-astra-clean-v3.js', '品質保留・再改修中・ユーザー採用保留・本編未採用', '以前の視覚採用判断は保留され、品質改修中です。再審査が終わるまでユーザー採用と本編接続は承認されていません。', 'effect-H64'),
      version('sunbeam-astra-clean-v2', 'Astra v2', 'sunbeam-astra-clean-v2-preview.html', 'webgpu-sunbeam-astra-clean-v2.js', '試作・品質未受入・本編未採用', '履歴上WebGPU再生可能。品質受入前の試作です。', 'effect-H64'),
      version('sunbeam-astra-clean-v1', 'Astra v1', 'sunbeam-astra-clean-v1-preview.html', 'webgpu-sunbeam-astra-clean-v1.js', '試作・品質未受入・本編未採用', '履歴上WebGPU再生可能。品質受入前の試作です。', 'effect-H64')
    ]) }),
    Object.freeze({ id: 'credit-acquisition', title: 'クレジット獲得', defaultVersionId: 'luck-astra-zero-r09', versions: Object.freeze([
      version('luck-astra-zero-r09', 'Astra r09（旧幸運9）', 'public/astra-luck-zero-v1/versions/r09/index.html?embed=1&height=64', 'public/astra-luck-zero-v1/versions/r09/luck-zero-r09.js', 'クレジット獲得としてユーザー採用済み・本編接続中', '作者: GPT-6-Astra（設計・実装）。2026-09-30に旧幸運r09をクレジット獲得Eとして版指定で採用。原版の形・動き・固有SFXと作者を保持。実WebGPU独立再生は既確認。本編gain-credits接続・実発動・聴感は検証中。幸運題材としての旧品質不合格記録は履歴に残すが、今回のクレジット獲得としての採用指示を優先する。', 'actor-H64')
    ]) }),
    Object.freeze({ id: 'luck-astra', title: '幸運', defaultVersionId: 'luck-astra-zero-r03', versions: Object.freeze([
      version('luck-astra-zero-r08', 'Astra ゼロ設計 r08', 'public/astra-luck-zero-v1/versions/r08/index.html?embed=1&height=64', 'public/astra-luck-zero-v1/versions/r08/luck-zero-r08.js', '品質不合格・未採用・本編未接続', '作者: GPT-6-Astra（設計・実装）。GPT-6-Lunaは採用済み受益者spriteの読み取りを監査。実WebGPU standalone再生pass、H64・3 cycle。品質理由: H64 OFFで主形が太い発光crestでなく3枚の羽/リボンに見える。H160でも細い光帯が分離し、接触後に外形がほぼ変わらず、袖/足の小反射で受益伝達を示せない。Star-ONのglintも改善せず。記録理由: “H64 OFF main form reads as three feathers/ribbons rather than a thick luminous breaking crest.” “Three optical surfaces remain separated as thin bands, including at H160; geometric normal offsets do not create a readable continuous luminous volume.” 性能は記録runで連続性pass（RAF P95 18.3ms、最大18.5ms）。SFX聴感未実施、非採用、本編未接続。', 'actor-H64'),
      version('luck-astra-zero-r06', 'Astra ゼロ設計 r06', 'public/astra-luck-zero-v1/versions/r06/index.html?embed=1&height=64', 'public/astra-luck-zero-v1/versions/r06/luck-zero-r06.js', '品質不合格・性能不合格・未採用・本編未接続', '作者: GPT-6-Astra。実GPU standalone再生確認済み。品質理由: Star-OFF H64は肩外の淡い橙2斑点に留まり、受益者投影への集中は背面alphaに隠れて弱い霞と小さな照明になる。2像から良好な受益状態への変化が視認できず、Star-ONでも改善しない。性能不合格: RAF間隔P95 53.9ms、最大161.7ms（原因未特定）。聴感未実施、ユーザー未採用、本編未接続。', 'actor-H64'),
      version('luck-astra-zero-r05', 'Astra ゼロ設計 r05', 'public/astra-luck-zero-v1/versions/r05/index.html?embed=1&height=64', 'public/astra-luck-zero-v1/versions/r05/luck-zero-r05.js', '品質不合格・性能不合格・未採用・本編未接続', '作者: GPT-6-Astra。実GPU standalone再生確認済み。品質理由: sparkle OFFでも浅い黄色の不規則な床リングが全体を占め、.14–.82で形成と受益者応答が分離せず、袖/脚への反射も弱い。光条はこの主因を補えない。性能も不合格: RAF間隔P95 53.2ms、最大162.1ms（原因未特定）。聴感未実施、ユーザー未採用、本編未接続。', 'actor-H64'),
      version('luck-astra-zero-r04', 'Astra ゼロ設計 r04', 'public/astra-luck-zero-v1/versions/r04/index.html?embed=1&height=64', 'public/astra-luck-zero-v1/versions/r04/luck-zero-r04.js', '品質不合格・未採用・本編未接続', '作者: GPT-6-Astra。実GPU standalone再生確認済み。品質理由: 白い矢印→金のX/翼・受益分離・quad境界切れ。背景屈折は未実装。聴感未実施、ユーザー未採用、本編未接続。', 'actor-H64'),
      version('luck-astra-zero-r03', 'Astra ゼロ設計 r03', 'public/astra-luck-zero-v1/versions/r03/index.html?embed=1&height=64', 'public/astra-luck-zero-v1/versions/r03/luck-zero-r03.js', 'ユーザー採用済み・本編接続検証中', '作者: GPT-6-Astra。GPT-6-Lunaは採用済み受益者spriteの読み取りを監査。ユーザー指定でゼロ設計r03を採用。実GPU standalone再生pass。従来レビューは品質不合格を記録: 平面クローバー印・縦消去・後半の緑色替え。後続の採用判断を反映し、旧品質記録は履歴として保持。性能は記録上pass、SFX聴感未実施。本編接続・実発動は別途検証中。', 'actor-H64'),
      version('luck-astra-zero-r02', 'Astra ゼロ設計 r02', 'public/astra-luck-zero-v1/versions/r02/index.html?embed=1&height=64', 'public/astra-luck-zero-v1/versions/r02/luck-zero-r02.js', '品質不合格・未採用・本編未接続', '作者: GPT-6-Astra。実GPU standalone再生確認済み。品質理由: 3本の棒・顔横断・黄色い装甲・受益側光条埋没。GPU頂点変形で技術性能は改善したが、視覚不合格。聴感未実施、ユーザー未採用、本編未接続。', 'actor-H64'),
      version('luck-astra-zero-r01', 'Astra ゼロ設計 r01', 'public/astra-luck-zero-v1/versions/r01/index.html?embed=1&height=64', 'public/astra-luck-zero-v1/versions/r01/luck-zero-r01.js', '品質不合格・未採用・本編未接続', '作者: GPT-6-Astra。実GPU standalone再生確認済み。品質理由: 三日月記号化・到来時の点化・受益分離・フレーム不安定。聴感未実施、ユーザー未採用、本編未接続。', 'actor-H64'),
      version('luck-astra-v4-sparkle-r02', 'Astra v4 sparkle r02', 'public/astra-luck-v4-sparkle-v1/versions/r02/index.html?embed=1&height=64', 'public/astra-luck-v4-sparkle-v1/versions/r02/webgpu-luck-v4-sparkle-r02.js', '比較用旧稿・角度統一条件未対応・未採用・本編未接続', '作者: GPT-6-Astra。採用済みv4への履歴改修で、胴/受益者の位置ごとに光条の向きを変える旧稿。最新の角度統一条件には未対応。元記録の局所視覚候補: Primary confirmed topic-directed diagonal glints passing from selected state to recipient readable on dark/light H64 while original main phenomenon is preserved. 聴感not_run・本編未接続。ゼロ設計の新幸運版を制作中。', 'actor-H64'),
      version('luck-astra-v4-sparkle-r01', 'Astra v4 sparkle r01', 'public/astra-luck-v4-sparkle-v1/versions/r01/index.html?embed=1&height=64', 'public/astra-luck-v4-sparkle-v1/versions/r01/webgpu-luck-v4-sparkle-r01.js', '品質不合格・既採用版の履歴改修・未採用・本編未接続', '作者: GPT-6-Astra。採用済みv4への履歴改修。品質理由: Chosen-side sparkle not readable at H64 dark .50; late foot points too weak as glints. 聴感not_run・本編未接続。ゼロ設計の新幸運版を制作中。', 'actor-H64'),
      version('luck-astra-clean-v4', 'Astra v4（旧採用版）', 'luck-astra-v4-preview.html', 'webgpu-luck-astra-v4.js', '旧採用版・r03へ更新', '以前の採用版Luck v4として来歴を保持。現行採用版はユーザー指定のゼロ設計r03。v4採用の履歴は変えず、現在の版選択と区別。'),
      version('luck-astra-clean-v3', 'Astra v3', 'luck-astra-v3-preview.html', 'webgpu-luck-astra-v3.js', '却下・品質未達・本編未採用', '履歴上WebGPU再生可能。翼の見た目が品質基準に届かず却下。'),
      version('luck-astra-clean-v2', 'Astra v2', 'luck-astra-v2-preview.html', 'webgpu-luck-astra-v2.js', '却下・品質未達・本編未採用', '履歴上WebGPU再生可能。翼の見た目が品質基準に届かず却下。'),
      version('luck-astra-clean-v1', 'Astra v1', 'luck-astra-v1-preview.html', 'webgpu-luck-astra-v1.js', '品質未審査・本編未採用', 'WebGPUプレビューとソースを掲載。品質判定記録なし。')
    ]) }),
    Object.freeze({ id: 'mana-astra', title: 'マナ', defaultVersionId: 'mana-zero-sol61-r6', versions: Object.freeze([
      version('mana-zero-sol61-r7', 'GPT-6.1-Sol zero r7', 'public/sol61-mana-zero/r7/preview.html?embed=1', 'public/sol61-mana-zero/r7/effect.mjs', '技術再生・ケイデンスpass・品質不合格・未採用・本編未接続・聴感未検証', '創作設計: GPT-6.1-Sol。忠実なruntime adapter・集中検査・実WebGPU再生: GPT-6-Luna。凍結されたSol設計とシェーダーを変更せず実装。Intel gen-12lp実GPUでシェーダーcompile・描画・4ループを確認、GPUエラー0。品質不合格: .50–.80sも胸の小さな帯が目立ち、身体へ届いて定着する受領の主現象が弱い。ユーザー未採用、本編未接続、SFX聴感未検証。', 'effect-H64'),
      version('mana-zero-sol61-r6', 'GPT-6.1-Sol zero r6', 'public/sol61-mana-zero/r6/preview.html?embed=1', 'public/sol61-mana-zero/r6/effect.mjs', '2026-09-30ユーザー採用済み・過去の視覚品質不合格・技術再生pass・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。凍結H64技術再生pass。過去の品質レビューでは不合格。2026-09-30にユーザーがr6を採用。採用状態を品質合格や本編接続と混同しない。SFX聴感未受入、本編未接続。', 'effect-H64'),
      version('mana-zero-sol61-r8', 'GPT-6.1-Sol zero r8', 'public/sol61-mana-zero/r8/index.html?embed=1', 'public/sol61-mana-zero/r8/manifest.json', '技術再生pass・品質未審査・未採用・本編未接続・聴感未検証', '設計・創作ソース: GPT-6.1-Sol。確定設計に忠実なWebGPU runtime adapter・検査・技術再生: GPT-6-Luna。Intel gen-12lpで全寿命dark/light・OFF介入を技術再生、GPU/console errors 0。native actor visible H63px at requested H64. 品質レビュー保留、現行採用版はMana zero r6。ゲーム未接続、SFX聴感未検証。', 'effect-H64'),
      version('mana-zero-sol61-r5', 'GPT-6.1-Sol zero r5', 'public/sol61-mana-zero/r5/preview.html?embed=1', 'public/sol61-mana-zero/r5/effect.mjs', '品質不合格・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。凍結済みH64で技術再生pass、品質fail。SFX聴感未受入、ユーザー未採用、本編未接続。', 'effect-H64'),
      version('mana-zero-sol61-r4', 'GPT-6.1-Sol zero r4', 'public/sol61-mana-zero/r4/preview.html?embed=1', 'public/sol61-mana-zero/r4/effect.mjs', '品質不合格・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。凍結品質記録: H64暗明で縦stripe/衣装の帯に読め、受領固有の身体応答が不成立。技術再生はpass（実GPU compile/submission、全寿命4 cycle）。SFX聴感未実施、ユーザー未採用、本編未接続。', 'effect-H64'),
      version('mana-zero-sol61-r3', 'GPT-6.1-Sol zero r3', 'public/sol61-mana-zero/r3/preview.html?embed=1', 'public/sol61-mana-zero/r3/effect.mjs', '品質不合格・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。凍結履歴の技術再生pass・品質fail。ユーザー未採用、本編未接続、実聴未実施。', 'effect-H64'),
      version('mana-zero-sol61-r2', 'GPT-6.1-Sol zero r2', 'public/sol61-mana-zero/r2/preview.html?embed=1', 'public/sol61-mana-zero/r2/effect.mjs', '品質不合格・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。凍結履歴の技術再生pass・品質fail。ユーザー未採用、本編未接続、実聴未実施。', 'effect-H64'),
      version('mana-zero-sol61-r1', 'GPT-6.1-Sol zero r1', 'public/sol61-mana-zero/r1/preview.html?embed=1', 'public/sol61-mana-zero/r1/effect.mjs', 'ゼロ設計・品質不合格・未採用', '作者: GPT-6.1-Sol。旧供給粒・shader・音を使わず新規設計。実GPU全寿命・4ループを確認。新しい連続容積は衣装のパッチや鎧の内張りに見えるため不合格。有限固有SFXあり、聴感未受入。本編未接続、次稿を制作中。', 'effect-H64'),
      version('mana-sol61-r1', 'GPT-6.1-Sol r1（Astra r07改良）', 'public/sol61-mana-e/r1/index.html?embed=1&single=1', 'public/sol61-mana-e/r1/mana.wgsl', '品質未達・旧構造継承確認・未採用', '改修作者: GPT-6.1-Sol。親原版: GPT-6-Astra r07。以前の改善指示に沿った版。入力監査で供給粒・キラキラ・音の同一部分を確認し、実表示でも小さな塊と衣装発光に寄る弱点が残ったため改良系列を中止。新しいゼロ設計を制作中。再生可能な比較履歴として保持し、本編未接続、聴感未受入。', 'effect-H64'),
      version("mana-receive-v2-r07", "Astra receive r07", "public/astra-mana-receive-v2/mana-r07/index.html?embed=1&height=64&single=1", "public/astra-mana-receive-v2/mana-r07/renderer.mjs", "品質不合格（自主レビュー）・ユーザー未採用・本編未接続", "作者: GPT-6-Astra。実WebGPU再生確認済み。自主レビュー不合格: サンプル画像の取得位相では粒子効果が見えず、終盤の受領光も小さい。ユーザー未採用、本編未接続。", 'effect-H64'),
      version("mana-receive-v2-r06", "Astra receive r06", "public/astra-mana-receive-v2/mana-r06/index.html?embed=1&height=64&single=1", "public/astra-mana-receive-v2/mana-r06/renderer.mjs", "品質不合格（自主レビュー）・ユーザー未採用・本編未接続", "作者: GPT-6-Astra。修正で接触タイミングは改善したが、取り込み後半が小さな手元光に縮小し、ケイデンス/聴感も未受入。自主レビュー不合格、ユーザー未採用、本編未接続。", 'effect-H64'),
      version("mana-receive-v2-r05", "Astra receive r05", "public/astra-mana-receive-v2/mana-r05/index.html?embed=1&height=64&single=1", "public/astra-mana-receive-v2/mana-r05/renderer.mjs", "品質不合格・ユーザー未採用・本編未接続", "作者: GPT-6-Astra。品質不合格、ユーザー未採用、本編未接続。", 'effect-H64'),
      version("mana-receive-v2-r04", "Astra receive r04", "public/astra-mana-receive-v2/mana-r04/index.html?embed=1&height=64&single=1", "public/astra-mana-receive-v2/mana-r04/renderer.mjs", "品質未受入・ユーザー未採用・本編未接続", "作者: GPT-6-Astra。局所的改善あり。最終品質未受入、ユーザー未採用、本編未接続。", 'effect-H64'),
      version("mana-receive-v2-r03", "Astra receive r03", "public/astra-mana-receive-v2/mana-r03/index.html?embed=1&height=64&single=1", "public/astra-mana-receive-v2/mana-r03/renderer.mjs", "品質不合格・ユーザー未採用・本編未接続", "作者: GPT-6-Astra。品質不合格（torso bibに見える）。ユーザー未採用、本編未接続.", 'effect-H64'),
      version('mana-astra-r15', 'Astra r15', 'public/astra-mana-receive-v1/versions/r15/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r15/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。r15 H64 t0.74/0.96 looks like a cyan selection outline, not mana transfer/received volume', 'actor-H64'),
      version('mana-astra-r14', 'Astra r14', 'public/astra-mana-receive-v1/versions/r14/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r14/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当後続改稿指示: 受領後半が小さな腹部発光へ戻り、全身のreceived-state changeが未達。', 'actor-H64'),
      version('mana-astra-r13', 'Astra r13', 'public/astra-mana-receive-v1/versions/r13/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r13/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当H64 t0.74不合格: 青緑/紫の翼または外套に見え、マナが到着し蓄積する構造として読めない。', 'actor-H64'),
      version('mana-astra-r12', 'Astra r12', 'public/astra-mana-receive-v1/versions/r12/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r12/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当/自己評価不合格: 入力体積から全身開口へ変形したが、後半がC字の輪/殻に見え、蓄積の非円周構造にならない。', 'actor-H64'),
      version('mana-astra-r11', 'Astra r11', 'public/astra-mana-receive-v1/versions/r11/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r11/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当H64不合格: 0.53/0.74/0.96sの三日月壁・紫量・空洞・時間差が小さな水色腹部楕円へ潰れ、身体への蓄積が読めない。', 'actor-H64'),
      version('mana-astra-r10', 'Astra r10', 'public/astra-mana-receive-v1/versions/r10/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r10/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当H64不合格: 0.53sは小さな錠剤光片、0.74sは衣装のほぼ一様な青緑着色。受け手内部の蓄積構造が読めない。', 'actor-H64'),
      version('mana-astra-r9', 'Astra r9', 'public/astra-mana-receive-v1/versions/r9/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r9/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当不採用: 手から左下へ投射する扇形beamに見え、受領方向が逆。0.30/0.53/0.74sの身体変化も弱い。', 'actor-H64'),
      version('mana-astra-r8', 'Astra r8', 'public/astra-mana-receive-v1/versions/r8/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r8/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当不採用: 翼を消した結果、源の球とアクターが分離。0.74sの接続が消え、主形/因果がr7より弱まる。', 'actor-H64'),
      version('mana-astra-r7', 'Astra r7', 'public/astra-mana-receive-v1/versions/r7/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r7/renderer.mjs', '品質審査中・本編未採用', '作者: GPT-6-Astra。審査中: 実衣装との遮蔽/発光は改善したが、外の布/翼が支配的。受領の因果を要改善。', 'actor-H64'),
      version('mana-astra-r6', 'Astra r6', 'public/astra-mana-receive-v1/versions/r6/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r6/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当不採用: 青い筆跡と腹の白楕円。単純mannequinでは肌/衣装の相互作用を判定できない。', 'actor-H64'),
      version('mana-astra-r5', 'Astra r5', 'public/astra-mana-receive-v1/versions/r5/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r5/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当不採用: 太いチューブが数字6/疑問符に見え、腰の閉ループが支配的。色/輝度も単調。', 'actor-H64'),
      version('mana-astra-r4', 'Astra r4', 'public/astra-mana-receive-v1/versions/r4/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r4/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。自己不採用: 開いた曲線を使っても、左右の合成輪郭が大きなU字を作る。', 'actor-H64'),
      version('mana-astra-r3', 'Astra r3', 'public/astra-mana-receive-v1/versions/r3/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r3/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。自己不採用: 透過性は改善したが、閉じた縁が腰の輪と肩のストラップに見える。', 'actor-H64'),
      version('mana-astra-r2', 'Astra r2', 'public/astra-mana-receive-v1/versions/r2/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r2/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当不採用: 青い膨らんだ塊が人物を覆い、供給/輸送/受領が同質に見える。', 'actor-H64'),
      version('mana-astra-r1', 'Astra r1', 'public/astra-mana-receive-v1/versions/r1/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r1/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当不採用: H64の輸送が細い線、後半が小さな点。受領の状態が弱い。', 'actor-H64'),
      version('mana-astra-clean-v3', 'Astra clean v3', 'mana-astra-clean-v3-preview.html', 'webgpu-mana-astra-clean-v3.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-clean-v2', 'Astra clean v2', 'mana-astra-clean-v2-preview.html', 'webgpu-mana-astra-clean-v2.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-clean-v1', 'Astra clean v1', 'mana-astra-clean-v1-preview.html', 'webgpu-mana-astra-clean-v1.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-zero-v1', 'Astra zero v1', 'webgpu-mana-astra-zero-preview.html', 'webgpu-mana-astra-zero-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPU自動ループ再生済み。形状、滑らかさ、SFXが品質未達。')
    ]) }),
    Object.freeze({ id: 'stamina-astra', title: 'スタミナ', defaultVersionId: 'stamina-sol61-r11', versions: Object.freeze([
      version('stamina-sol61-r12', 'GPT-6.1-Sol r12', 'public/sol61-stamina-e/r12/index.html?embed=1', 'public/sol61-stamina-e/r12/runtime.mjs', '技術再生pass・視覚品質不合格・未採用・本編未接続・聴感未検証', '創作/品質判断: GPT-6.1-Sol。忠実なWebGPU移植・公開パッケージ検査: GPT-6-Luna。修正済みH64原寸・暗明の全寿命で胸部の心臓様形状が主となり、活力回復の作用と必須光条が読めず品質不合格。GPU compile/submission pass。原画URLだけを同一byteの同梱PNGへ変更して実embed再生を確認。聴感・cadence・本編は未受入。', 'effect-H64'),
      version('stamina-sol61-r13', 'GPT-6.1-Sol r13', 'public/sol61-stamina-e/r13/index.html?embed=1', 'public/sol61-stamina-e/r13/manifest.json', '技術再生pass・品質未審査・未採用・聴感未検査・本編未接続', '創作設計: GPT-6.1-Sol。忠実なruntime実装: GPT-6-Luna。凍結r13のGPU技術passを保持し、canonical Pages packageは依存7ファイルを原本と一致、runtimeの画像URLだけを同一byte package内body.pngへ修正。暗/明のH64比較2体は全体表示。品質レビュー・SFX聴感・本編統合は未実施。採用版はr11。', 'effect-H64'),
      version('stamina-sol61-r11', 'GPT-6.1-Sol r11', 'public/sol61-stamina-e/r11/index.html?embed=1', 'public/sol61-stamina-e/r11/runtime.mjs', '技術再生pass・過去の視覚品質不合格・2026-09-30ユーザー採用済み・本編未接続・聴感未検証', '創作/品質判定: GPT-6.1-Sol。音声境界修正と集中検査: GPT-6-Luna。H64の全寿命では腕横の白い光片と衣装光が主となり、回復作用として読めないため過去レビューで品質不合格。2026-09-30にユーザーがr11を採用。採用状態を品質合格や本編接続と混同しない。実GPU compile/submission pass。captureとsubmission件数が一致せず滑らかさ未受入。SFX聴感未実施。r10の改稿でありゼロ設計ではない。', 'effect-H64'),
      version('stamina-sol61-r10', 'GPT-6.1-Sol r10', 'public/sol61-stamina-e/r10/index.html?embed=1', 'public/sol61-stamina-e/r10/runtime.mjs', '技術再生pass・視覚品質不合格・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。凍結manifestの技術再生pass。H64では弱い灰/茶色の衣装・身体の印に留まり、連続した配送/受領が読めないため品質不合格。ユーザー未採用、本編未接続、SFX聴感未実施。design.mjsは品質メタデータのみの差とsource manifestに記録されている。', 'effect-H64'),
      version('stamina-sol61-r9-frontfix', 'GPT-6.1-Sol r9 · front/rear契約修正', 'public/sol61-stamina-e/r9-front-contract-fix/index.html?embed=1', 'public/sol61-stamina-e/r9-front-contract-fix/runtime.mjs', '技術再生pass・視覚品質不合格・未採用・本編未接続・聴感未受入', '設計作者: GPT-6.1-Sol。front/rear合成契約の実装: GPT-6-Luna。凍結ソースhashに束縛した実WebGPU H64 480×260再生を確認。main-only、obs-off、combined全寿命の技術検査pass。視覚品質は不合格（服まわりの光が目立つ）。verify音声gain=0のため聴感受入なし。ユーザー未採用、本編未接続。', 'effect-H64'),
      version('stamina-sol61-r8', 'GPT-6.1-Sol r8', 'public/sol61-stamina-e/r8/index.html?embed=1', 'public/sol61-stamina-e/r8/design.mjs', '品質不合格・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。凍結品質判定は不合格: packetは移動するが衣装発光/腕端の光片に分節し、活力による活動再開が主作用として読めない。技術再生pass。有限SFXのCPU契約pass、正常ブラウザーgestureと実聴は未実施。ユーザー未採用、本編未接続。', 'effect-H64'),
      version('stamina-sol61-r7', 'GPT-6.1-Sol r7', 'public/sol61-stamina-e/r7/index.html?embed=1', 'public/sol61-stamina-e/r7/design.mjs', '品質不合格・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。凍結履歴の技術再生pass・品質fail。ユーザー未採用、本編未接続、実聴未実施。', 'effect-H64'),
      version('stamina-sol61-r6', 'GPT-6.1-Sol r6', 'public/sol61-stamina-e/r6/index.html?embed=1&height=64', 'public/sol61-stamina-e/r6/design.mjs', '品質不合格・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。新規有限活力閃光の技術WebGPU再生は確認済み。左胸の付属片と衣装発光が主形を支配し、活力発現の動作が伝わらないため品質不合格。有限固有SFXあり、聴感未検証。改稿中の比較履歴。', 'effect-H64'),
      version('stamina-sol61-r4', 'GPT-6.1-Sol r4', 'public/sol61-stamina-e/r4/index.html?embed=1', 'public/sol61-stamina-e/r4/design.mjs', '品質不合格・未採用・本編未接続', '作者: GPT-6.1-Sol。実GPU暗明H64全寿命・3ループを確認。脚の形が装備や追加の肢に見えること、閉じた外形、一様な身体の着色が品質未達。原版の有限VFX/SFXを保持し次稿を制作中。聴感未受入。', 'effect-H64'),
      version('stamina-sol61-r3', 'GPT-6.1-Sol r3', 'public/sol61-stamina-e/r3/index.html?embed=1', 'public/sol61-stamina-e/r3/design.mjs', '品質不合格・未採用・本編未接続', '作者: GPT-6.1-Sol。実GPU暗明H64全寿命と3ループを確認した再生可能な不合格版。風・リボンへの意味の曖昧さ、明背景での弱い分離、小さな星の可読性が未達。次稿を制作中。有限SFXあり、聴感未受入。', 'effect-H64'),
      version('stamina-sol61-r2', 'GPT-6.1-Sol r2', 'public/sol61-stamina-e/r2/index.html', 'public/sol61-stamina-e/r2/design.mjs', '品質不合格（自主レビュー）・ユーザー未採用・本編未接続', '作者: GPT-6.1-Sol。独立した粒や帯を除き、身体へつながる流れと手足の角度統一キラキラへ改修。実WebGPUコンパイル・提出・3ループ確認。主流が細く、白い服の発光に埋もれるため品質不合格。版固有SFXの同期経路あり、聴感未検証。改善履歴として掲載。', 'actor-H64'),
      version('stamina-sol61-r1', 'GPT-6.1-Sol r1', 'public/sol61-stamina-e/r1/index.html', 'public/sol61-stamina-e/r1/design.mjs', '品質不合格・旧創作説明の入力露出確認・未採用', '作者: GPT-6.1-Sol。2026-09-30の入力監査で、旧Eの圧力面・胸集約・四肢経路の創作説明をAPI調査時に読んだことを確認。旧shaderのコピーは未確認だが、旧入力なしという以前の説明を訂正する。身体の着色と付属物のような発光が品質未達。この系列の改良を止め、別のゼロ設計へ移行。原版VFX/SFXは比較履歴として保持。', 'actor-H64'),
      version("stamina-recovery-v2-r03", "Astra recovery r03", "public/astra-stamina-recovery-v2/stamina-r03/index.html?embed=1&height=64", "public/astra-stamina-recovery-v2/stamina-r03/stamina.mjs", "品質未受入・ユーザー未採用・本編未接続", "作者: GPT-6-Astra。実WebGPU再生確認済み。静的品質の一部のみ確認、継続的な視覚/聴感受入未実施。ユーザー未採用、本編未接続。", 'effect-H64'),
      version("stamina-recovery-v2-r02", "Astra recovery r02", "public/astra-stamina-recovery-v2/stamina-r02/index.html?embed=1&height=64", "public/astra-stamina-recovery-v2/stamina-r02/stamina.mjs", "品質不合格・ユーザー未採用・本編未接続", "作者: GPT-6-Astra。実WebGPU再生確認済み。品質不合格、ユーザー未採用、本編未接続。", 'effect-H64'),      version('stamina-astra-r01-replay', 'Astra r01 · iframe再生修正', 'stamina-astra-r01/index.html?embed=1&height=64', 'stamina-astra-r01/stamina.mjs', '品質未判定・未採用・ゲーム未接続・iframe実再生確認済み', 'スタミナAstra r01。品質判定/ユーザー採用/ゲーム接続は未確認。ローカルChrome iframeで自動ループ30 GPU frames・errors 0を確認。埋め込み投影CSSと初期化成功表示の修正を含む。'),
      version('stamina-astra-clean-v3', 'Astra clean v3', 'stamina-astra-clean-v3-preview.html', 'webgpu-stamina-astra-clean-v3.js', '品質不採用・本編未採用', 'H64で扇形の光片から胸腹の発光ベストへ変わるが、スタミナ補給として読めず品質不採用。'),
      version('stamina-astra-clean-v2', 'Astra clean v2', 'stamina-astra-clean-v2-preview.html', 'webgpu-stamina-astra-clean-v2.js', '品質未受入・本編未採用', 'H64形状の自主レビュー記録あり。スタミナとしての独立識別評価は未実施で、最終品質は未受入。'),
      version('stamina-astra-clean-v1', 'Astra clean v1', 'stamina-astra-clean-v1-preview.html', 'webgpu-stamina-astra-clean-v1.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('stamina-astra-zero-v2', 'Astra zero v2', 'webgpu-stamina-astra-zero-v2-preview.html', 'webgpu-stamina-astra-zero-v2-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPU再生済み。H64シルエットと移送前面が読みにくい。'),
      version('stamina-astra-zero-v1', 'Astra zero v1', 'webgpu-stamina-astra-zero-preview.html', 'webgpu-stamina-astra-zero-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPU全寿命連続再生済み。形状とSFXが品質未達。')
    ]) }),
    Object.freeze({ id: 'emp-astra', title: 'EMP', versions: Object.freeze([
      version('emp-astra-v1.8', 'Astra v1.8', 'astra-emp-v1/versions/v1.8/index.html', 'astra-emp-v1/versions/v1.8/emp.mjs', 'ユーザー採用済み・本編接続済み・実発動/聴感未確認', 'ユーザー採用版。ゲームへの接続は完了し、実機での発動と聴感の受入は未確認です。', 'effect-H64'),
      version('emp-astra-v1.7', 'Astra v1.7', 'astra-emp-v1/versions/v1.7/index.html', 'astra-emp-v1/versions/v1.7/emp.mjs', '品質不合格・本編未採用', 'Astra v1.7。品質不合格で本編未採用です。', 'effect-H64'),
      version('emp-astra-v1.6', 'Astra v1.6', 'astra-emp-v1/versions/v1.6/index.html', 'astra-emp-v1/versions/v1.6/emp.mjs', '品質不合格・本編未採用', 'Astra v1.6。品質不合格で本編未採用です。', 'effect-H64'),
      version('emp-astra-v1.5', 'Astra v1.5', 'astra-emp-v1/versions/v1.5/index.html', 'astra-emp-v1/versions/v1.5/emp.mjs', '品質不合格・本編未採用', 'Astra v1.5。品質不合格で本編未採用です。', 'effect-H64'),
      version('emp-astra-v1.4', 'Astra v1.4 · 復元再生', 'astra-emp-v1/versions/v1.4/index.html', 'astra-emp-v1/versions/v1.4/emp.mjs', '品質不合格・本編未採用', '原本欠落のため復元した再生版。チャージ・保管ロックの表示と形状が品質不合格です。', 'effect-H64'),
      version('emp-astra-v1.3', 'Astra v1.3 · 復元再生', 'astra-emp-v1/versions/v1.3/index.html', 'astra-emp-v1/versions/v1.3/emp.mjs', '品質不合格・本編未採用', '原本欠落のため復元した再生版。共鳴の識別とアルファ縁に品質上の問題があります。', 'effect-H64'),
      version('emp-astra-v1.2', 'Astra v1.2 · 復元再生', 'astra-emp-v1/versions/v1.2/index.html', 'astra-emp-v1/versions/v1.2/emp.mjs', '品質不合格・本編未採用', '原本欠落のため復元した再生版。薄いリング形状と共鳴表現が品質不合格です。', 'effect-H64'),
      version('emp-astra-zero-v1', 'Astra zero v1', 'webgpu-emp-astra-zero-preview.html', 'webgpu-emp-astra-zero-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPUでチャージ、放電、共鳴、キャンセル、保管ロックを再生済み。')
    ]) }),
    Object.freeze({ id: 'recovery-astra', title: '回復', defaultVersionId: 'status-cleanse-astra-r29', versions: Object.freeze([
      version('status-cleanse-astra-r29', 'Astra r0.29（旧状態異常回復）', 'public/astra-status-cleanse-v1/versions/r29/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r29/cleanse.mjs', '回復Eとしてユーザー採用済み・本編接続待ち', '作者: GPT-6-Astra。ユーザーが採用済み状態異常回復r0.29を回復Eへ割り当て直した原版。表現・作者・旧来歴を保持する。新しい状態異常回復Eは別に青系で制作する。回復用途への本編接続・実発動・聴感は未確認。', 'actor-H64'),
    ]) }),
    Object.freeze({ id: 'status-cleanse-astra', title: '状態異常回復', defaultVersionId: 'status-recovery-sol61-r1', versions: Object.freeze([
      version('status-recovery-sol61-r1', 'GPT-6.1-Sol blue r1', 'public/sol61-status-recovery-blue/r1/index.html?embed=1', 'public/sol61-status-recovery-blue/r1/design.mjs', 'ユーザー採用済み・本編接続待ち・聴感未検証', '作者: GPT-6.1-Sol。青系最新版r1をユーザー採用。旧状態異常回復r0.29は回復E用途のまま保持。負の状態を描かず、身体輪郭の広面から腕・胸へ回復が定着する。実GPU暗明H64全寿命・3ループの記録を保持。有限SFXあり、本編の状態異常解除への接続・実発動・聴感は未確認。', 'effect-H64'),
      version('status-recovery-sol61-r1-draft1', 'GPT-6.1-Sol blue r1 初稿', 'public/sol61-status-recovery-blue/r1/history/attempt1/index.html?embed=1', 'public/sol61-status-recovery-blue/r1/history/attempt1/design.mjs', '旧試作・品質不合格・未採用', '作者: GPT-6.1-Sol。身体輪郭の連続性を改善する前の初稿。後続r1へ置換した再生可能な比較履歴。原本の有限VFX/SFXを保持。', 'effect-H64'),
      version('status-cleanse-astra-r37', 'Astra r0.37', 'public/astra-status-cleanse-v1/versions/r37/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r37/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: H64 Star-OFFで核が腕横の小さな光る石/ダイヤ装飾に見え、縮小しながら身体が光る。面の作用と回復伝達が読めず、pickup/equipment誤読条件に該当。WebGPU技術再生pass・3 loop・754 GPU submissions。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r36', 'Astra r0.36', 'public/astra-status-cleanse-v1/versions/r36/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r36/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: 始点・下降・受け渡しは改善し外部重心移動45.72pxを計測したが、主形はぼけた横発光帯から小さな光る台へ変わり、正の回復媒体として識別できない。WebGPU技術再生pass・3 loop・761 GPU submissions。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r35', 'Astra r0.35', 'public/astra-status-cleanse-v1/versions/r35/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r35/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: Star-OFFで胸からの放射は広がるが、中盤は汎用的な全身白光と太い輪郭haloとなり、終盤ピークも開始/進行/完了の差を作れない。Star-ONも救済せず。WebGPU技術再生pass・3 loop・2186 GPU submissions。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r34', 'Astra r0.34', 'public/astra-status-cleanse-v1/versions/r34/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r34/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: 遅い全身ピークは明確になったが、初期受領が弱く、中盤は左右/足の順次glintが中心で身体へ広く回復が作用する形にならない。WebGPU技術再生pass・3 loop・448 GPU submissions。連続再生は外れ値懸念あり。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r33', 'Astra r0.33', 'public/astra-status-cleanse-v1/versions/r33/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r33/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: 主光学場がspriteと重なって隠れ、H64で弱い短い外部光線だけが残る。中盤以降は似た全身radianceと小glintで、開始・伝播・完了の構造が読めない。WebGPU技術再生pass・3 loop・456 GPU submissions。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r32', 'Astra r0.32', 'public/astra-status-cleanse-v1/versions/r32/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r32/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: 外部volumeがH64で肩横の小さな丸い光へ縮み、接触しても形が身体へ移らない。続く表面反応は白い衣服照明とglintに見え、回復の伝播が成立しない。WebGPU技術再生pass・3 loop・435 GPU submissions。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r31', 'Astra r0.31', 'public/astra-status-cleanse-v1/versions/r31/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r31/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: H64の外向きfieldは小さな手/足jetや推進に見え、受け手の胴体も同様の明るいpatchに留まるため、正の回復反応を示せない。全sparkleはE-wide 22.5/112.5°。WebGPU技術再生pass・3 loop・466 GPU submissions。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r30', 'Astra r0.30', 'public/astra-status-cleanse-v1/versions/r30/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r30/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: 光路がactorのalpha/白い衣服に隠れて小さな肩U/リボンと細い飾りだけが残り、H64で回復方向が読めない。WebGPU技術再生pass・3 loop・408 GPU submissions。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r28', 'Astra r0.28', 'public/astra-status-cleanse-v1/versions/r28/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r28/cleanse.mjs', '品質保留・本編未採用', '作者: GPT-6-Astra。品質保留: Primary H64 review: inlet bar removed and late whole-body peak good, but early/middle transfer remains small local white-blue spots and thin edges. Continuous strong body-scale propagation is not yet readable.', 'actor-H64'),
      version('status-cleanse-astra-r27', 'Astra r0.27', 'public/astra-status-cleanse-v1/versions/r27/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r27/cleanse.mjs', '品質保留・本編未採用', '作者: GPT-6-Astra。品質保留: Primary H64 review: positive light arrival and angled sparkles improved; inlet still reads as short rectangular bar/projected plane, and later response is uniform white body glow plus side stars. Body-specific distribution remains weak.', 'actor-H64'),
      version('status-cleanse-astra-r26', 'Astra r0.26', 'public/astra-status-cleanse-v1/versions/r26/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r26/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当H64レビュー: 角/触角は解消したが、中盤U字弧は汎用回復オーラ、終盤は全身色替えに見えるため品質未達。', 'actor-H64'),
      version('status-cleanse-astra-r25', 'Astra r0.25', 'public/astra-status-cleanse-v1/versions/r25/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r25/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。Astra自己不合格: 背面光が胴で隠れ、上端だけが頭の左右の角/触角に見える。上端の長い停止も装飾感を強める。', 'actor-H64'),
      version('status-cleanse-astra-r24', 'Astra r0.24', 'public/astra-status-cleanse-v1/versions/r24/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r24/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。Astra自己不合格: 可視面積は改善したが、太い発光リボン/帯が身体を回る形に留まり、正の回復作用としての固有構造が不足。', 'actor-H64'),
      version('status-cleanse-astra-r23', 'Astra r0.23', 'public/astra-status-cleanse-v1/versions/r23/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r23/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。Astra自己不合格: 背面の光が隠れて序盤は光点、前面では首/胸の一本リボンに見え、回復の伝播面として読めない。', 'actor-H64'),
      version('status-cleanse-astra-r22', 'Astra r0.22', 'public/astra-status-cleanse-v1/versions/r22/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r22/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。Astra自己不合格: 腕の応答面が葉/羽、足元が足ひれに見え、回復作用よりアクセサリー出現を連想させる。', 'actor-H64'),
      version('status-cleanse-astra-r21', 'Astra r0.21', 'public/astra-status-cleanse-v1/versions/r21/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r21/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。Astra自己不合格: 接触/伝達順序は見えるが、矩形投光面と衣装の水平色替えに退化し、身体の正の回復応答の形が成立しない。', 'actor-H64'),
      version('status-cleanse-astra-r20', 'Astra r0.20', 'public/astra-status-cleanse-v1/versions/r20/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r20/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当H64レビュー: 負の描写と白塊は改善したが、2光片から均一な全身glowへの切替であり、正の回復の因果が抽象的・汎用的。', 'actor-H64'),
      version('status-cleanse-astra-r19', 'Astra r0.19', 'public/astra-status-cleanse-v1/versions/r19/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r19/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当H64レビュー: 明背景の到来が白い塊、ピークが均一で回復の主題として品質未達。', 'actor-H64'),
      version('status-cleanse-astra-r18', 'Astra r0.18', 'public/astra-status-cleanse-v1/versions/r18/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r18/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。H64で到来光の端から不要な白線が伸び、全身発光ピークもr17より弱い。Astra自己不合格。', 'actor-H64'),
      version('status-cleanse-astra-r17', 'Astra r0.17', 'public/astra-status-cleanse-v1/versions/r17/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r17/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当H64レビュー: 全身発光は改善したが、点列導入・均一な輪郭/白塗りと不可視glintに留まり、回復の主作用として品質未達。', 'actor-H64'),
      version('status-cleanse-astra-r16', 'Astra r0.16', 'public/astra-status-cleanse-v1/versions/r16/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r16/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。自己H64明暗レビュー：ぼかした影/薄い霧のfadeに見え、体積がほどける奥行きと清浄光の力が不足。身体反応もベージュの照明色へ寄り、正常復帰の意味が品質未達。', 'actor-H64'),
      version('status-cleanse-astra-r15', 'Astra r0.15', 'public/astra-status-cleanse-v1/versions/r15/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r15/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。自己H64明暗レビュー：初期異常は小さな柄ずれに留まり、解除前線が直交する白線/箱状に読める。局所屈折と収束方向の意味が品質未達。', 'actor-H64'),
      version('status-cleanse-astra-r14', 'Astra r0.14', 'public/astra-status-cleanse-v1/versions/r14/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r14/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当H64全寿命レビュー：角は出たが、胸前の紫Xベルトが外れるだけ。状態異常と回復の独自現象・発光の力が成立していない。服/ロープ/ベルト状拘束の系列を放棄し新設計待ち。', 'actor-H64'),
      version('status-cleanse-astra-r13', 'Astra r0.13', 'public/astra-status-cleanse-v1/versions/r13/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r13/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。自己H64明暗レビュー：可変幅の板が暗い丸い節の連なりに潰れ、厚み/破断面の機能が読めない。r12の材質可読性を改善できず品質未達。', 'actor-H64'),
      version('status-cleanse-astra-r12', 'Astra r0.12', 'public/astra-status-cleanse-v1/versions/r12/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r12/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当H64全寿命レビュー：付着から身体離脱の因果は改善したが、均一幅の紫ロープがX字に乗って抜ける形。面・材質・接着破断・回復後作用が品質未達。', 'actor-H64'),
      version('status-cleanse-astra-r11', 'Astra r0.11', 'public/astra-status-cleanse-v1/versions/r11/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r11/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。自己H64レビュー：不規則な付着面に変えたが、破れた外套の印象が残り、状態回復の意味が弱い。', 'actor-H64'),
      version('status-cleanse-astra-r10', 'Astra r0.10', 'public/astra-status-cleanse-v1/versions/r10/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r10/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当H64全寿命レビュー：初期は普通の紫衣装/マント、剥離は左右へ開くマントと緑の衣装照明に読める。状態回復固有の造形として品質未達。', 'actor-H64'),
      version('status-cleanse-astra-r09', 'Astra r0.9', 'public/astra-status-cleanse-v1/versions/r09/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r09/cleanse.mjs', '品質不合格・本編未採用', 'H64原寸で付着の剥離と受け手の変化が読み取れず、品質不合格。', 'actor-H64'),
      version('status-cleanse-astra-r08', 'Astra r0.8', 'public/astra-status-cleanse-v1/versions/r08/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r08/cleanse.mjs', '品質不合格・本編未採用', '剥離片が突然現れる布切れに見え、元の被覆との連続性が弱い。清浄側は局所的すぎてH64でほぼ読めない。', 'actor-H64'),
      version('status-cleanse-astra-r07', 'Astra r0.7', 'public/astra-status-cleanse-v1/versions/r07/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r07/cleanse.mjs', '品質不合格・本編未採用', 'ユーザー評価では全身発光部分のみ良好。品質不合格理由（記録）: H64では紫から緑への衣装色替えに見え、付着が剥がれる形や動きがほぼ見えない。', 'actor-H64'),
      version('status-cleanse-astra-r06', 'Astra r0.6', 'public/astra-status-cleanse-v1/versions/r06/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r06/cleanse.mjs', '品質不合格・本編未採用', '顔の保護は改善したが、背後の形が容器や浴槽に見える。', 'actor-H64'),
      version('status-cleanse-astra-r05', 'Astra r0.5', 'public/astra-status-cleanse-v1/versions/r05/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r05/cleanse.mjs', '品質不合格・本編未採用', '白い浄化帯が顔を横切り、H64で横棒に見える。', 'actor-H64'),
      version('status-cleanse-astra-r04', 'Astra r0.4', 'public/astra-status-cleanse-v1/versions/r04/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r04/cleanse.mjs', '品質不合格・本編未採用', '孤立したリボンの品質欠陥が残る。', 'actor-H64'),
      version('status-cleanse-astra-r03', 'Astra r0.3', 'public/astra-status-cleanse-v1/versions/r03/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r03/cleanse.mjs', '品質不合格・本編未採用', '孤立したリボンでは身体の状態回復が伝わらない。', 'actor-H64'),
      version('status-cleanse-astra-r02', 'Astra r0.2', 'public/astra-status-cleanse-v1/versions/r02/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r02/cleanse.mjs', '品質不合格・本編未採用', 'aliasは除去されたが、主形が光る花器に見える。', 'actor-H64'),
      version('status-cleanse-astra-r01', 'Astra r0.1', 'public/astra-status-cleanse-v1/versions/r01/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r01/cleanse.mjs', '品質不合格・本編未採用', '主形が小さな杯に見え、ray-marchに帯状aliasがある。', 'actor-H64')
    ]) }),
    Object.freeze({ id: 'cooldown-astra', title: '待機時間短縮', defaultVersionId: 'cooldown-clock-zero-r4', versions: Object.freeze([
      version('cooldown-clock-zero-r4', 'GPT-6.1-Sol zero clock r4 · 待機時間短縮', 'public/sol61-cooldown-clock-zero/r4/index.html?embed=1', 'public/sol61-cooldown-clock-zero/r4/manifest.json', 'ユーザー採用済み・技術再生pass・視覚レビュー保留・本編未接続・聴感未検証', 'ユーザーは2026-09-30に「GPT-6.1-Sol zero clock r4 · 待機時間短縮」を採用。創作設計: GPT-6.1-Sol。確定設計に忠実なruntime実装: GPT-6-Luna。凍結r4のWebGPU再生pass。canonical packageはアーティスト、WGSL、SFX、音声とatlasをhash検証し、runtimeのatlas URLのみpackage内同一byte fixtureへ置換。native viewport 980×620、中央H64 actorを維持。視覚品質レビュー保留、本編未接続、聴感未検証。', 'effect-H64'),
      version('cooldown-clock-zero-r3', 'GPT-6.1-Sol zero clock r3 · 待機時間短縮', 'public/sol61-cooldown-clock-zero/r3/index.html?embed=1', 'public/sol61-cooldown-clock-zero/r3/main.mjs', '技術再生pass・視覚品質不合格・未採用・本編未接続・聴感未検証', '創作: GPT-6.1-Sol。時計針の時計回り契約と忠実なruntime検査: GPT-6-Luna。時計針・発光弧・受益流を時計回りへ統一。H64暗明と全寿命の実GPU compile/submission、3完全cycleを確認。Sol視覚レビューでは1250msの右側crossが胸部光に埋没。observerモデルがなく、physical-lens bindingの根拠も未確認。動的品質試験は未実施のため視覚品質不合格。性能記録は再生証拠でありゲーム性能受入ではない。SFX橋渡しの集中検査pass、実聴・ユーザー採用・本編接続は未実施。', 'effect-H64'),
      version('cooldown-clock-zero-r2', 'GPT-6.1-Sol zero clock r2 · 待機時間短縮', 'public/sol61-cooldown-clock-zero/r2/index.html?embed=1', 'public/sol61-cooldown-clock-zero/r2/main.mjs', '技術再生pass・視覚品質不合格・cadence未達・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。凍結GPU再生pass。時計から手/身体への連続受益はr1より改善したが、終盤の受益状態と右sparkleの可読性が不足し品質不合格。performance/cadenceも未達（507.7ms stall記録、原因未特定）。ユーザー未採用、本編未接続、SFX聴感未実施。', 'effect-H64'),
      version('cooldown-clock-zero-r1', 'GPT-6.1-Sol zero clock r1 · 待機時間短縮', 'public/sol61-cooldown-clock-zero/r1/index.html?embed=1', 'public/sol61-cooldown-clock-zero/r1/main.mjs', '技術再生pass・視覚品質不合格・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。新時計ゼロ設計。clock主形は読め、時計針は現在/リセットへ戻さず短縮方向に進む。一方、H64で手から身体への受益伝達が局所flashに留まり、全体の空間的benefitが弱く品質不合格。技術再生pass（tested-a2一致hash、実WebGPU compile/submission、3完全cycle）。旧compile-a1はcompile失敗・frame 0のため除外。SFX聴感未実施、ユーザー未採用、本編未接続。', 'effect-H64'),
      version('cooldown-sol61-shortening-zero-r2', 'GPT-6.1-Sol zero r2 · 待機時間短縮', 'public/sol61-cooldown-zero/r2/preview.html?embed=1', 'public/sol61-cooldown-zero/r2/effect.mjs', '技術再生pass・視覚品質不合格・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。待機時間短縮ゼロ設計r2。凍結manifestの技術再生pass・品質不合格を維持。ユーザー未採用、本編未接続、SFX聴感未受入。', 'effect-H64'),
      version('cooldown-sol61-shortening-zero', 'GPT-6.1-Sol r5 · 待機時間短縮ゼロ', 'public/sol61-cooldown-zero-r5/shortening-zero/index.html?embed=1', 'public/sol61-cooldown-zero-r5/shortening-zero/design.mjs', '視覚品質不合格・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。待機時間短縮の意図を保つゼロ設計。数値上の残り待機時間短縮は既存ゲーム処理と分離。GPU技術再生pass、視覚意図は不合格: H64で斜めの発光楕円/宝石に読め、短縮効果として伝わらない。実聴未実施、ユーザー未採用、本編未接続。旧「幾何学的圧縮」案が意図と不一致だった履歴を保持。', 'effect-H64'),
      version('cooldown-sol61-r5-attempt-2', 'GPT-6.1-Sol r5 attempt 2', 'public/sol61-cooldown-zero-r5/versions/r5-attempt2/index.html?embed=1', 'public/sol61-cooldown-zero-r5/versions/r5-attempt2/design.mjs', '視覚品質不合格・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。凍結履歴のGPU compile/submission/複数loopはpass、視覚品質は不合格。ユーザー未採用、本編未接続、実聴未実施。', 'effect-H64'),
      version('cooldown-sol61-r5-attempt-1', 'GPT-6.1-Sol r5 attempt 1', 'public/sol61-cooldown-zero-r5/versions/r5-attempt1/index.html?embed=1', 'public/sol61-cooldown-zero-r5/versions/r5-attempt1/design.mjs', '視覚品質不合格・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。凍結履歴のGPU compile/submission/複数loopはpass、視覚品質は不合格。ユーザー未採用、本編未接続、実聴未実施。', 'effect-H64'),
      version('cooldown-sol61-r4', 'GPT-6.1-Sol zero r4', 'public/sol61-cooldown-zero/r4/preview.html?embed=1', 'public/sol61-cooldown-zero/r4/effect.mjs', '品質不合格・未採用・本編未接続', '作者: GPT-6.1-Sol。真の3D経路と前後遮蔽を実装し実GPU4ループ確認。前腕付近の形が発光するばね・コイルに見えるため不合格。有限固有SFXあり、聴感未受入。再生可能な比較履歴。', 'effect-H64'),
      version('cooldown-sol61-r3', 'GPT-6.1-Sol zero r3', 'public/sol61-cooldown-zero/r3/preview.html?embed=1', 'public/sol61-cooldown-zero/r3/effect.mjs', '品質不合格・未採用・本編未接続', '作者: GPT-6.1-Sol。実GPU全寿命・4ループを確認。初期が回復のU字の光、後半が胴体の帯に見えるため不合格。有限SFXあり、聴感未受入。次稿を制作中。', 'effect-H64'),
      version('cooldown-sol61-r2', 'GPT-6.1-Sol zero r2', 'public/sol61-cooldown-zero/r2/preview.html?embed=1', 'public/sol61-cooldown-zero/r2/effect.mjs', '品質未達・未採用・本編未接続', '作者: GPT-6.1-Sol。再生可能な改稿履歴。分割した挟み込みの形と身体発光の意味が未達。原版の有限VFX/SFXを保持。', 'effect-H64'),
      version('cooldown-sol61-r1', 'GPT-6.1-Sol zero r1', 'public/sol61-cooldown-zero/r1/preview.html?embed=1', 'public/sol61-cooldown-zero/r1/effect.mjs', '品質不合格・未採用・本編未接続', '作者: GPT-6.1-Sol。ゼロ設計の初稿。主形が梯子や柵に見えるため不合格。再生可能な履歴として原版の有限VFX/SFXを保持。', 'effect-H64'),
      version('cooldown-benefit-astra-r05-sparkle-r04', 'Astra r0.5 sparkle r0.4', 'public/astra-cooldown-benefit-r05-sparkle-v1/versions/r04/index.html?embed=1&height=64', 'public/astra-cooldown-benefit-r05-sparkle-v1/versions/r04/effect.mjs', '品質審査候補・ユーザー未採用・本編未接続', '作者: GPT-6-Astra。主担当H64全寿命レビュー候補: 圧縮角→足元→身体両側の順が読め、原版形状/発光を維持。品質理由: Primary H64 full-life review: compression corners -> feet -> both body sides are readable while original geometry/emission is preserved. Frozen visual-quality candidate; user adoption and auditory review pending.', 'actor-H64'),
      version('cooldown-benefit-astra-r05-sparkle-r03', 'Astra r0.5 sparkle r0.3', 'public/astra-cooldown-benefit-r05-sparkle-v1/versions/r03/index.html?embed=1&height=64', 'public/astra-cooldown-benefit-r05-sparkle-v1/versions/r03/effect.mjs', '品質保留・未採用・本編未接続', '作者: GPT-6-Astra。品質理由: Primary review: prism-corner sparkles visible, beneficiary sparkles too weak at H64 in phase .715-.845; not adopted.', 'actor-H64'),
      version('cooldown-benefit-astra-r05-sparkle-r02', 'Astra r0.5 sparkle r0.2', 'public/astra-cooldown-benefit-r05-sparkle-v1/versions/r02/index.html?embed=1&height=64', 'public/astra-cooldown-benefit-r05-sparkle-v1/versions/r02/effect.mjs', '品質不合格・未採用・本編未接続', '作者: GPT-6-Astra。品質理由: 受益者光条の幅は増えたが、中心が身体内にあり、H64で十字の核と腕を独立して判読しにくい。', 'actor-H64'),
      version('cooldown-benefit-astra-r05-sparkle-r01', 'Astra r0.5 sparkle r0.1', 'public/astra-cooldown-benefit-r05-sparkle-v1/versions/r01/index.html?embed=1&height=64', 'public/astra-cooldown-benefit-r05-sparkle-v1/versions/r01/effect.mjs', '品質不合格・未採用・本編未接続', '作者: GPT-6-Astra。品質理由: 圧縮角の光条は見えるが、受益者側の光条が元の強発光の内側に収まり、H64でキラキラの形を十分に読めない。', 'actor-H64'),
      version('astra-cooldown-benefit-r0.7', 'Astra r0.7', 'public/astra-cooldown-benefit-v1/versions/r07/index.html?embed=1&height=64', 'public/astra-cooldown-benefit-v1/versions/r07/effect.mjs', '品質審査中・本編未採用', '作者: GPT-6-Astra。主担当へH64/H160証拠を提出済み。品質判定待ちで、本編未採用です。', 'actor-H64'),
      version('astra-cooldown-benefit-r0.6', 'Astra r0.6', 'public/astra-cooldown-benefit-v1/versions/r06/index.html?embed=1&height=64', 'public/astra-cooldown-benefit-v1/versions/r06/effect.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。奥行きの層間隔が残り最後の一層へ収束しない。局所反射の左側が肩より顔寄り。', 'actor-H64'),
      version('astra-cooldown-benefit-r0.5', 'Astra r0.5', 'public/astra-cooldown-benefit-v1/versions/r05/index.html?embed=1&height=64', 'public/astra-cooldown-benefit-v1/versions/r05/effect.mjs', 'ユーザー採用済み・本編接続は検証中', '作者: GPT-6-Astra。ユーザー採用は視覚版の選択。旧H64全寿命レビュー: 圧縮→消失→受益者応答の順序は成立。主形が琥珀の箱型容器、終端が一様な全身mint着色に見え、固有性と空間的E品質が未達。本編への接続と発動は検証中。キラキラ改修中・新版未採用。', 'actor-H64'),
      version('astra-cooldown-benefit-r0.4', 'Astra r0.4', 'public/astra-cooldown-benefit-v1/versions/r04/index.html?embed=1&height=64', 'public/astra-cooldown-benefit-v1/versions/r04/effect.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。立体前後差はあるが琥珀リボンの通過に見える。H160のray-step縞、意味と最終状態の弱さ。', 'actor-H64'),
      version('astra-cooldown-benefit-r0.3', 'Astra r0.3', 'public/astra-cooldown-benefit-v1/versions/r03/index.html?embed=1&height=64', 'public/astra-cooldown-benefit-v1/versions/r03/effect.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。琥珀→mintの量変化は前進だが平面的な砂時計アイコンに見え、空間的Eの水準に達しない。', 'actor-H64'),
      version('astra-cooldown-benefit-r0.2', 'Astra r0.2', 'public/astra-cooldown-benefit-v1/versions/r02/index.html?embed=1&height=64', 'public/astra-cooldown-benefit-v1/versions/r02/effect.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。身体前を三本の弧が通過するように見え、待機の短縮と受益者の変化が読めない。', 'actor-H64'),
      version('astra-cooldown-benefit-r0.1', 'Astra r0.1', 'public/astra-cooldown-benefit-v1/versions/r01/index.html?embed=1&height=64', 'public/astra-cooldown-benefit-v1/versions/r01/effect.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。三面が汎用的な同心輪へ融合。SFX圧縮時刻も不一致。', 'actor-H64')
    ]) }),
    Object.freeze({ id: 'dodge-sol61', title: '回避', defaultVersionId: 'sol61-dodge-zero-r1', integration: 'not-integrated', reason: 'GPT-6.1-Sol Dodge r1 is technically replayable; user-adopted on 2026-10-01; independent visual quality review, listening and game integration remain pending.', versions: Object.freeze([
      version('sol61-dodge-zero-r1', 'GPT-6.1-Sol Dodge r1', 'public/sol61-dodge-zero/r1/index.html?embed=1', 'public/sol61-dodge-zero/r1/package-manifest.json', '技術再生pass・視覚品質未審査・ユーザー採用済み・本編未接続・聴感未実施・可視復帰未証明', '創作設計: GPT-6.1-Sol。凍結設計に忠実なruntime/package実装: GPT-6-Luna。正規パッケージのartist/WGSL/SFX原本SHAを保持。Native WebGPU自動loopとPages gallery nested verify replayを確認し、shader/GPU/browser errors 0、verify audio context/gain 0。有限SFXのoffset/source-pair/pool/mute/expiry/disposeはfake AudioContext 7/7 passだが実gesture pairと聴感は未実施。視覚品質審査未実施、2026-10-01ユーザー採用、本編未接続。explicit dispose後のfuture submitなし。visibility pauseをverifyで確認、visible returnは未証明。package closure: outputs/request-20260930/sol61-dodge-zero/r1/runtime/evidence/package-closure.json。', 'actor-H64', 1, {originalCreatorDisplayName:'GPT-6.1-Sol',designAuthorDisplayName:'GPT-6.1-Sol',runtimeAuthorDisplayName:'GPT-6-Luna',creatorModelId:'gpt-6.1-sol+gpt-6-luna',creatorDisplayName:'GPT-6.1-Sol (design) + GPT-6-Luna (implementation)',adoption:'adopted',qualityStatus:'pending-review',technicalReplayStatus:'pass',normalAudioListening:'not_run',gameIntegrationStatus:'not_connected',technicalEvidence:'outputs/request-20261001/dodge-r1-gallery-integration/nested-replay-proof.json',packageClosure:'outputs/request-20260930/sol61-dodge-zero/r1/runtime/evidence/package-closure.json'})
    ]) }),
    Object.freeze({id:'quantum-transmutation-sol61',title:'錬成',defaultVersionId:'quantum-transmutation-sol61-r1',integration:'not-integrated',reason:'GPT-6.1-Solの新規B設計r1。実WebGPU技術再生済み。2026-10-01ユーザー採用。品質審査・通常聴感・本編接続は未完了。',versions:Object.freeze([
      version('quantum-transmutation-sol61-r1','GPT-6.1-Sol 錬成 zero r1 · adapter a1','public/sol61-quantum-transmutation/r1/index.html?embed=1','public/sol61-quantum-transmutation/r1/package-manifest.json','実WebGPU技術再生pass・品質審査待ち・ユーザー採用済み・本編未接続・通常聴感未実施','創作設計: GPT-6.1-Sol。忠実runtime: GPT-6-Luna。原本shaderは保持しWGSL予約語を9token機械正規化したadapter a1。H64暗明12capture・自然loop2回・DPR/resize・GPU/browser/network errors0、verify音0。実背景復帰はshim検査のみでOS-level未証明。2026-10-01ユーザー採用済み。品質審査・聴感・本編は未受入。','effect-H64',1,{originalCreatorDisplayName:'GPT-6.1-Sol',designAuthorDisplayName:'GPT-6.1-Sol',runtimeAuthorDisplayName:'GPT-6-Luna',creatorModelId:'gpt-6.1-sol+gpt-6-luna',creatorDisplayName:'GPT-6.1-Sol (design) + GPT-6-Luna (runtime)',adoption:'adopted',qualityStatus:'pending-review',technicalReplayStatus:'pass',normalAudioListening:'not_run',physicalVisibilityStatus:'not_proven',gameIntegrationStatus:'not_connected',packageClosure:'public/sol61-quantum-transmutation/r1/package-manifest.json'})
    ])}),    Object.freeze({ id: 'barrier-pro', title: 'バリア', defaultVersionId: 'barrier-sol61-r11', integration: 'not-integrated', reason: "User adopted GPT-6.1-Sol Barrier r11 on 2026-10-01. Show r11 first in Adopted; r12 remains a replayable unadopted comparison. Prior visual quality judgments are preserved separately; listening and game connection remain pending.", versions: Object.freeze([
  version('barrier-sol61-r12', 'GPT-6.1-Sol Barrier zero r12', 'public/sol61-barrier-zero/r12/index.html?embed=1', 'public/sol61-barrier-zero/r12/PACKAGE-CLOSURE.json', '実WebGPU技術再生pass・視覚品質FAIL（明背景の後半伝達が判読困難）・未採用・本編未接続・通常聴感未実施・実可視性未証明', '創作設計・artist freeze: GPT-6.1-Sol。凍結設計に忠実なruntime/package: GPT-6-Luna。正規Pages候補でverify付きWebGPU再生、980×620/H64・3 shader modules・82 captures・6-phase loop wrap、GPU/browser/request/server errors 0、verify audio context/gain 0。r12のsource manifest 25/25・package closure 16/16 SHA一致。視覚品質はGPT-6.1-Solの実GPU画像82枚の審査でFAIL。明背景の結合出力285/350msで受領セル内の伝達を判読しにくい。白いピーク自体は不合格理由ではない。通常聴感not_run、visibility pause/resume not proven、game not connected、not adopted。', 'effect-H64', 1, {
    originalCreatorDisplayName: 'GPT-6.1-Sol', designAuthorDisplayName: 'GPT-6.1-Sol', runtimeAuthorDisplayName: 'GPT-6-Luna',
    creatorModelId: 'gpt-6.1-sol+gpt-6-luna', creatorDisplayName: 'GPT-6.1-Sol (design) + GPT-6-Luna (runtime)',
    adoption: 'not-adopted', qualityStatus: 'failed-light-late-transfer-readability', qualityEvidence: 'outputs/request-20260930/sol61-barrier-zero/r12/quality-review/REVIEW.json', technicalReplayStatus: 'pass',
    normalAudioListening: 'not_run', physicalVisibilityStatus: 'not_proven', gameIntegrationStatus: 'not_connected',
    technicalEvidence: 'outputs/request-20261001/barrier-r12-runtime/runtime-attempt-a1/evidence/NATIVE-GPU-PROOF.json',
    packageClosure: 'public/sol61-barrier-zero/r12/PACKAGE-CLOSURE.json'
  }),
      version("barrier-sol61-r11", "GPT-6.1-Sol Barrier zero r11", "public/sol61-barrier-zero/r11/index.html?embed=1", "public/sol61-barrier-zero/r11/package-manifest.json", "実WebGPU技術再生pass・視覚品質FAIL（後半の隣接セル伝達が結合出力で判読不能）・ユーザー採用済み・本編未接続・通常聴感未実施・実可視性未証明", "創作設計: GPT-6.1-Sol。忠実なruntime/package: GPT-6-Luna。native WebGPU technical replay pass。49枚の実GPU原画像を審査し、結合出力285/350msの後半伝達を品質FAILと判定、通常聴感未実施、物理的なvisibility未証明、本編未接続、2026-10-01ユーザー採用済み。", "effect-H64", 1, {"originalCreatorDisplayName":"GPT-6.1-Sol","designAuthorDisplayName":"GPT-6.1-Sol","runtimeAuthorDisplayName":"GPT-6-Luna","creatorModelId":"gpt-6.1-sol+gpt-6-luna","creatorDisplayName":"GPT-6.1-Sol (design) + GPT-6-Luna (runtime)","adoption":"adopted","qualityStatus":"failed-essential-late-transfer-readability","technicalReplayStatus":"pass","qualityEvidence":"outputs/request-20260930/sol61-barrier-zero/r11/quality-review/REVIEW.json","normalAudioListening":"not_run","gameIntegrationStatus":"not_connected","technicalEvidence":"outputs/request-20260930/sol61-barrier-zero/r11/runtime-attempt-a1/evidence/NATIVE-GPU-PROOF.json","packageClosure":"public/sol61-barrier-zero/r11/package-manifest.json"}),
      version('barrier-sol61-r10', 'GPT-6.1-Sol Barrier zero r10', 'public/sol61-barrier-zero/r10/index.html?embed=1', 'public/sol61-barrier-zero/r10/package-manifest.json', '実WebGPU技術再生pass・視覚品質FAIL（必須の被弾六辺形状と隣接セルへの伝播がH64の結合出力で判読不能）・未採用・本編未接続・通常聴感未実施・cadence未測定', '創作設計・品質判定: GPT-6.1-Sol。凍結版に忠実なruntime/package: GPT-6-Luna。Frozen r10 package closure 455a868aae2e05a87bde9102c384ae2889347931a1b164921215755fab7be6c3、公開manifest SHAと一致。実WebGPUの連続自動再生/6 phase loop/有限VFX-SFX bridgeを持つ。native GPU replayはpassだが、品質reviewは必須条件FAIL: known-hit時の連続六辺 inset contourおよびseedから隣接セルへの状態伝播を実寸H64のcombined outputで独立して追えない。技術passはこの失敗を覆さない。r10 native sequence review: outputs/request-20260930/sol61-barrier-zero/r10/attempts/quality-sequence-review-a1/REVIEW.md。未採用、本編未接続、通常聴感未実施、cadence未測定。', 'effect-H64', 1, {originalCreatorDisplayName:'GPT-6.1-Sol',designAuthorDisplayName:'GPT-6.1-Sol',runtimeAuthorDisplayName:'GPT-6-Luna',creatorModelId:'gpt-6.1-sol+gpt-6-luna',creatorDisplayName:'GPT-6.1-Sol (design) + GPT-6-Luna (implementation)',adoption:'not-adopted',qualityStatus:'fail-essential-known-hit-readability',technicalReplayStatus:'pass',normalAudioListening:'not_run',gameIntegrationStatus:'not_connected',technicalEvidence:'outputs/request-20260930/sol61-barrier-zero/r10/runtime-attempt-a1/evidence/NATIVE-GPU-PROOF.json',packageClosure:'public/sol61-barrier-zero/r10/package-manifest.json'}),
      version('barrier-sol61-r9-gallery-a1', 'GPT-6.1-Sol Barrier r9 · gallery adapter a1', 'public/sol61-barrier-zero/r9/gallery-entry-a1.html?embed=1', 'public/sol61-barrier-zero/r9/gallery-adapter-a1-composite-manifest.json', 'native automatic WebGPU replay pass · visual review pending · unadopted · game disconnected · listening not run', '創作設計: GPT-6.1-Sol。凍結設計の忠実runtimeとgallery adapter: GPT-6-Luna。最新composite manifest ed16bc1e9f77fe87bb36e6ac5e41c79657d4aa9e528706c3fb2fd4d1220a1344による自動再生版。native verifyで980×620/H64、全6 phaseとcycle wrap、submit103、GPU/browser error0、verify audio context/gain0を確認。視覚品質はRoot review pending（cross contribution remains weak）。未採用、聴感未実施、本編未接続。', 'effect-H64', 1, {originalCreatorDisplayName:'GPT-6.1-Sol',designAuthorDisplayName:'GPT-6.1-Sol',runtimeAuthorDisplayName:'GPT-6-Luna',creatorModelId:'gpt-6.1-sol+gpt-6-luna',creatorDisplayName:'GPT-6.1-Sol (design) + GPT-6-Luna (implementation)',adoption:'not-adopted',qualityStatus:'pending-review',technicalReplayStatus:'pass',normalAudioListening:'not_run',gameIntegrationStatus:'not_connected',technicalEvidence:'public/sol61-barrier-zero/r9/gallery-adapter-a1-native-proof.json',packageClosure:'public/sol61-barrier-zero/r9/gallery-adapter-a1-composite-manifest.json'}),
      version('barrier-sol61-r8-fidelityfix-a1', 'GPT-6.1-Sol zero r8 fidelityfix a1', 'public/sol61-barrier-zero/r8-fidelityfix-a1/entry.html?embed=1', 'public/sol61-barrier-zero/r8-fidelityfix-a1/runtime.mjs', 'native WebGPU技術再生pass・per-cell near runtime修正pass・視覚品質不合格（user-observed fail: digital semantics）・未採用・本編未接続・聴感未実施', '創作設計・formal B contract: GPT-6.1-Sol。忠実なruntime/adapter: GPT-6-Luna。canonical Pages packageでWebGPU compile/submitと全寿命58フレーム（29位相×main-only/combined）および12診断を再生、GPUエラー0、verify audio contextなし。near両passを各セルのscissorに適用。品質状態はuser-observed FAIL: digital semantics。技術再生はその失敗を覆さない。未採用、本編未接続、SFX聴感未実施。', 'effect-H64', 1, {designAuthorDisplayName:'GPT-6.1-Sol',runtimeAuthorDisplayName:'GPT-6-Luna'}),
      version('barrier-sol61-r8', 'GPT-6.1-Sol zero r8', 'public/sol61-barrier-zero/r8/entry.html?embed=1', 'public/sol61-barrier-zero/r8/release-manifest.json', '技術再生pass・視覚品質不合格（digitalとして読めない）・runtime忠実性未達（右側近光欠落）・未採用・本編未接続・聴感未検証', '創作設計: GPT-6.1-Sol。runtime adapter: GPT-6-Luna。実GPU技術再生passとpackage closureを保持。ユーザー視認レビューではdigital表現として読めないため視覚品質不合格。これとは別にruntime fidelity defectとしてdual表示のnear-blur scissorが左側セルだけを覆い、右側セルでは近光が欠落する。ユーザー未採用、本編未接続、SFX聴感未検証。', 'effect-H64'),
      version('barrier-sol61-r6', 'GPT-6.1-Sol zero r6', 'public/sol61-barrier-zero/r6/index.html?embed=1', 'public/sol61-barrier-zero/r6/runtime.mjs', '実GPU技術再生pass・視覚品質未達・未採用・本編未接続・聴感未実施', '作者: GPT-6.1-Sol（設計）。GPT-6-Lunaが設計凍結版に忠実なWebGPU runtime portとWGSL予約語の機械修正を担当。元r6はWGSL予約語smoothでコンパイル失敗。tested-a2では識別子トークンsmoothをeSmoothへ変更し、smoothstepと他の設計ソースを保持。GPU compile/submit pass。視覚品質は未達: nativeのprevent/protect境界が明確に読めず、主担当の品質審査中。ユーザー未採用、本編未接続、音声聴感未実施。', 'effect-H64'),
      version('barrier-sol61-r5', 'GPT-6.1-Sol zero r5', 'public/sol61-barrier-zero/r5/index.html?embed=1', 'public/sol61-barrier-zero/r5/runtime.mjs', '技術再生pass・視覚品質不合格・sparkle未達・未採用・本編未接続・聴感未検証', '作者: GPT-6.1-Sol。凍結版の実GPU native H64 main-only/combined暗明全寿命replay pass。視覚品質不合格。sparkleはRGBゲートを通らず、nativeで明確に読めないため未達。ユーザー未採用、本編未接続、SFX聴感未実施。', 'effect-H64'),
      version('barrier-sol61-r4', 'GPT-6.1-Sol zero r4', 'public/sol61-barrier-zero/r4/index.html?embed=1', 'public/sol61-barrier-zero/r4/runtime.mjs', '品質不合格・未採用・本編未接続・聴感未受入', '作者: GPT-6.1-Sol。技術再生可能な新規設計候補として掲載。品質不合格、ユーザー未採用、本編未接続、SFX聴感未受入。2026-09-30の採用撤回後、バリア群に現行採用版はありません。', 'effect-H64'),
      version('barrier-sol61-r3', 'GPT-6.1-Sol zero r3', 'public/sol61-barrier-zero/r3/index.html?embed=1', 'public/sol61-barrier-zero/r3/runtime.mjs', 'ユーザー不採用・質感不合格・本編未接続', '作者: GPT-6.1-Sol。ユーザー評価: プラスチックのような質感へ変わったため不採用。実GPUH64全寿命・3ループの技術再生記録は保持するが、品質合格を意味しない。改修予定。有限固有SFXあり、聴感未受入。', 'effect-H64'),
      version('barrier-sol61-r2', 'GPT-6.1-Sol zero r2', 'public/sol61-barrier-zero/r2/index.html?embed=1', 'public/sol61-barrier-zero/r2/runtime.mjs', '品質確認未完了・未採用・本編未接続', '作者: GPT-6.1-Sol。広い曲面と内外面の実3D透明殻へ改稿。実GPUコンパイル・H64全寿命・前後面・3ループ確認。定常時のデジタルな固有性は懸念が残り、品質合格ではない。有限SFXあり、聴感未受入。', 'effect-H64'),
      version('barrier-sol61-r2-draft1', 'GPT-6.1-Sol zero r2 初稿', 'public/sol61-barrier-zero/r2-draft1/index.html?embed=1', 'public/sol61-barrier-zero/r2-draft1/runtime.mjs', '旧初稿・品質未達・未採用', '作者: GPT-6.1-Sol。r2改稿前の実GPU再生可能な初稿。一般的な滑らかな泡に見え、固有性と面の役割が弱いため未達。原版の有限VFX/SFXを比較用に保持。', 'effect-H64'),
      version('barrier-sol61-r1', 'GPT-6.1-Sol zero r1', 'public/sol61-barrier-zero/r1/index.html?embed=1', 'public/sol61-barrier-zero/r1/runtime.mjs', '品質未達・未採用・本編未接続', '作者: GPT-6.1-Sol。旧GPT/Astra版の表現を使わずデジタルな耐久バリアを新規設計。実GPUコンパイル・3ループを確認。平面的な籠に見える形状が未達で次稿を制作中。生成・被弾・破壊の有限SFXあり、聴感未受入。', 'effect-H64'),
      version('barrier-pro-r07', 'GPT Pro r0.7（採用撤回）', 'barrier-pro-r07/embed.html', 'barrier-pro-r07/barrier-pro-renderer.mjs', '採用撤回・旧本編接続あり・SFX聴感未確認', '2026-09-30にユーザーが採用撤回。新規設計を制作中。原版と作者は保持し、旧本編接続の撤去・置換は別途進めます。', 'effect-H64')
    ]) })
  ]);
  const params = new URLSearchParams(location.search);
  const verifyMode = params.has('verify');
  const sfxBridge = window.createGallerySfxBridge?.({ verify: verifyMode });
  const audioRow = document.getElementById('gallery-audio');
  const audioButton = document.getElementById('gallery-audio-enable');
  const audioStatus = document.getElementById('gallery-audio-status');
  let activeAudioFrame = null;
  let activeAudioItem = null;
  let audioStarted = false;
  // GALLERY_AUDIO_POLICY_BEGIN
  function galleryAudioPolicy(category, verificationMode, item) {
    const explicitlyRequestedMapSfx = category === 'map' && item?.mapSfxPolicy === 'explicit-user-request';
    const categoryAllowsSfx = category === 'effect' || explicitlyRequestedMapSfx;
    return Object.freeze({
      rowHidden: verificationMode,
      buttonHidden: !categoryAllowsSfx,
      bridgeAllowed: !verificationMode && categoryAllowsSfx,
      autoUnlockAllowed: !verificationMode && category === 'effect',
      status: category === 'map' && !explicitlyRequestedMapSfx
        ? 'マップのSFXは明示的な要求がないため無効です。'
        : ''
    });
  }
  function shouldAutoUnlockGalleryAudio(category, verificationMode, target) {
    if (verificationMode || category !== 'effect') return false;
    return !target?.closest?.('[data-category="map"]');
  }
  // GALLERY_AUDIO_POLICY_END
  function updateGalleryAudioControl(category, item) {
    const policy = galleryAudioPolicy(category, verifyMode, item);
    audioRow.hidden = policy.rowHidden;
    audioButton.hidden = policy.buttonHidden;
    if (policy.status) audioStatus.textContent = policy.status;
    else if (category === 'effect' && !audioStarted) audioStatus.textContent = '最初の操作でEの効果音を有効にします。';
    return policy;
  }
  function reflectAudio(result) {
    if (verifyMode) return;
    if (result?.state === 'active') {
      audioStarted = true;
      audioButton.textContent = '音声再生中';
      audioButton.setAttribute('aria-pressed', 'true');
      audioStatus.textContent = '表示中のEの固有SFXをループに合わせて再生します。';
    } else if (result?.state === 'unsupported') {
      audioStatus.textContent = 'この版の固有SFXは再生できません。';
    } else if (result?.state === 'unavailable') {
      audioStatus.textContent = 'プレビューの準備後に音声を開始します。';
    }
  }
  function beginGalleryAudio() {
    if (!galleryAudioPolicy(currentCategory, verifyMode, activeAudioItem).bridgeAllowed
      || !sfxBridge || !activeAudioFrame || !activeAudioItem) return;
    reflectAudio(sfxBridge.activateFromGesture(activeAudioFrame, activeAudioItem));
  }
  audioButton.addEventListener('click', beginGalleryAudio);
  if (!verifyMode) {
    document.addEventListener('pointerdown', event => {
      if (!audioStarted && shouldAutoUnlockGalleryAudio(currentCategory, verifyMode, event.target)
        && !audioButton.contains(event.target)) beginGalleryAudio();
    }, { capture: true });
    document.addEventListener('keydown', event => {
      if (!audioStarted && (event.key === 'Enter' || event.key === ' ')
        && shouldAutoUnlockGalleryAudio(currentCategory, verifyMode, event.target)) beginGalleryAudio();
    }, { capture: true });
  }
  let selectedIndex = 0;
  let selectedVersionIndex = 0;
  const catalog = document.getElementById('catalog');
  const stage = document.getElementById('stage');
  const notice = document.getElementById('notice');
  const versionSelect = document.getElementById('version-select');
  let fitObserver = null;
  let mapSelectionGeneration = 0;
  let activeMapSelection = null;
  let mapOriginalComparison = false;
  const mapComparison = document.getElementById('map-comparison');
  const mapComparisonButton = document.getElementById('map-compare-toggle');
  // CATEGORY_MEMORY_HELPERS_BEGIN
  const CATEGORY_STORAGE_KEY = 'dva-gallery-category-v1';
  const VALID_CATEGORIES = new Set(['effect', 'map']);
  const isValidCategory = value => VALID_CATEGORIES.has(value);
  function resolveInitialCategory(urlCategory, storageProvider) {
    if (isValidCategory(urlCategory)) return urlCategory;
    try {
      const storage = typeof storageProvider === 'function' ? storageProvider() : storageProvider;
      const remembered = storage?.getItem(CATEGORY_STORAGE_KEY);
      if (isValidCategory(remembered)) return remembered;
    } catch {}
    return 'map';
  }
  function persistCategory(category, storageProvider) {
    if (!isValidCategory(category)) return false;
    try {
      const storage = typeof storageProvider === 'function' ? storageProvider() : storageProvider;
      if (!storage || typeof storage.setItem !== 'function') return false;
      storage.setItem(CATEGORY_STORAGE_KEY, category);
      return true;
    } catch { return false; }
  }
  // CATEGORY_MEMORY_HELPERS_END
  let currentCategory = resolveInitialCategory(params.get('category'), () => window.localStorage);
  let currentAdoptionFilter = 'unadopted';
  const selections = new Map();
  const adoptedVersionIds = new Set(['quantum-transmutation-sol61-r1','barrier-sol61-r11','status-recovery-sol61-r1','sunbeam-lens-v2-r05','item-pickup-sol61-r1','heal-astra-sparkle-r1','luck-astra-zero-r09','luck-astra-zero-r03','emp-astra-v1.8','status-cleanse-astra-r29','stamina-sol61-r11','mana-zero-sol61-r6','cooldown-clock-zero-r4']);
  const categoryTabs = [...document.querySelectorAll('[data-category]')];
  const layout = document.getElementById('gallery-layout');
  const emptyCategory = document.getElementById('empty-category');
  let previewStatusPoll = null;
  const defaultVersionIndex = entry => Math.max(0, entry.versions.findIndex(item => item.id === entry.defaultVersionId));
  let buttons = [];
  function adoptionState(item) {
    if (item.adoption) return item.adoption;
    if (adoptedVersionIds.has(item.id)) return 'adopted';
    if (/旧採用版|ユーザー採用済み|品質採用/.test(item.status || '')) return 'previously-adopted';
    if (/未採用|却下|撤回/.test(item.status || '')) return 'not-adopted';
    return 'unknown';
  }
  function adoptionStatusLabel(item) {
    const state = adoptionState(item);
    if (state === 'reference-only') return 'セット原画の参照';
    if (state === 'adopted') return '採用済み';
    if (state === 'previously-adopted') return '旧採用版（現行採用対象外）';
    if (state === 'not-adopted') return '未採用';
    return '採用状態不明';
  }
  function visibleVersionIndices(group) {
    const hasCurrentAdoption = group.versions.some(item => adoptionState(item) === 'adopted');
    if (currentCategory === 'effect') {
      if (currentAdoptionFilter === 'adopted') return hasCurrentAdoption ? group.versions.map((item, i) => item.replayable ? i : -1).filter(i => i >= 0).sort((a, b) => Number(adoptionState(group.versions[b]) === 'adopted') - Number(adoptionState(group.versions[a]) === 'adopted')) : [];
      return hasCurrentAdoption ? [] : group.versions.map((_, i) => i);
    }
    const mapGroupAdopted = group.versions.some(item => adoptionState(item) === 'adopted');
    if (currentAdoptionFilter === 'adopted') return mapGroupAdopted ? group.versions.map((_, i) => i).sort((a, b) => Number(adoptionState(group.versions[b]) === 'adopted') - Number(adoptionState(group.versions[a]) === 'adopted')) : [];
    return group.versions.map((item, i) => ['adopted','reference-only'].includes(adoptionState(item)) ? -1 : i).filter(i => i >= 0);
  }
  function setHeadline() {
    document.getElementById('list-heading').textContent = `${currentAdoptionFilter === 'adopted' ? '採用済み' : '未採用'}の${currentCategory === 'effect' ? 'エフェクト' : 'マップ'}一覧`;
  }
  function makePreview(item) {
    const preview = new URL(item.page, location.href);
    preview.searchParams.set('galleryRelease', 'barrier-r10-gallery-20261001-r25');
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
  function select(index, versionIndex) {
    mapSelectionGeneration++; activeMapSelection = null; mapOriginalComparison = false; mapComparison.hidden = true;
    stage.querySelector('img')?.remove();
    selectedIndex = (index + entries.length) % entries.length;
    const group = entries[selectedIndex];
    selectedVersionIndex = Math.min(versionIndex, group.versions.length - 1);
    const item = group.versions[selectedVersionIndex];
    updateGalleryAudioControl('effect', item);
    document.getElementById('selected-title').textContent = `${group.title} · ${item.title}`;
    document.getElementById('selected-description').textContent = item.detail;
    document.getElementById('selected-status').textContent = item.status;
    document.getElementById('selected-source').textContent = `WebGPU: ${item.source}`;
    const shownVersions = visibleVersionIndices(group);
    versionSelect.replaceChildren(...shownVersions.map((originalIndex, i) => {
      const v = group.versions[originalIndex]; const option = document.createElement('option'); option.value = String(i);
      const state = adoptionState(v);
      option.textContent = `${v.title} — ${adoptionStatusLabel(v)} · ${v.status}`; return option;
    }));
    versionSelect.value = String(Math.max(0, shownVersions.indexOf(selectedVersionIndex)));
    versionSelect.disabled = shownVersions.length < 2;
    versionSelect.onchange = () => select(selectedIndex, shownVersions[Number(versionSelect.value)]);
    const sourceLink = document.getElementById('selected-link');
    const preview = makePreview(item); sourceLink.href = preview.href;
    sourceLink.textContent = '元のWebGPUプレビューを見る ↗';
    buttons.forEach((button, i) => button.setAttribute('aria-current', i === selectedIndex ? 'true' : 'false'));
    if (previewStatusPoll !== null) window.clearInterval(previewStatusPoll);
    previewStatusPoll = null;
    const previousFrame = stage.querySelector('iframe');
    if (previousFrame) sfxBridge?.detachFrame(previousFrame);
    previousFrame?.remove();
    activeAudioFrame = null; activeAudioItem = null;
    notice.hidden = false;
    if (!navigator.gpu) { notice.textContent = 'このブラウザーでは WebGPU を使用できません。'; return; }
    notice.textContent = 'WebGPU プレビューを読み込んでいます…';
    const iframe = document.createElement('iframe'); iframe.title = `${group.title} ${item.title} WebGPU 自動再生`;
    iframe.allow = 'autoplay'; iframe.width = String(PRESENTATION.width); iframe.height = String(PRESENTATION.height);
    iframe.src = preview.href; fitPreview(iframe, item, group);
    iframe.addEventListener('load', () => {
      activeAudioFrame = iframe; activeAudioItem = item;
      reflectAudio(sfxBridge?.attachFrame(iframe, item));
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
  const exposedEntries = entries.map(group => Object.freeze({ id: group.id,
      title: group.title, integration: group.integration, reason: group.reason,
      category: 'effect',
      latest: group.versions[0].id, defaultVersionId: group.defaultVersionId || group.versions[0].id,
      versions: Object.freeze(group.versions.map(item => Object.freeze({ ...item,
        category: 'effect',
        creatorModelId: item.creatorModelId || (item.id === 'barrier-pro-r07' ? 'chatgpt-pro' : ['stamina-sol61-r9-frontfix','stamina-sol61-r13','mana-zero-sol61-r8','cooldown-clock-zero-r4','barrier-sol61-r8','barrier-sol61-r8-fidelityfix-a1'].includes(item.id) ? 'gpt-6.1-sol+gpt-6-luna' : item.id.startsWith('cooldown-clock-zero-r') ? 'gpt-6.1-sol' : item.id.includes('-sol61-') ? 'gpt-6.1-sol' : item.id === 'item-pickup-sol-r2' ? 'gpt-6-sol' : 'gpt-6-astra'),
        creatorDisplayName: item.creatorDisplayName || (item.id === 'barrier-pro-r07' ? 'GPT Pro' : ['stamina-sol61-r9-frontfix','stamina-sol61-r13','mana-zero-sol61-r8','cooldown-clock-zero-r4','barrier-sol61-r8','barrier-sol61-r8-fidelityfix-a1'].includes(item.id) ? 'GPT-6.1-Sol (design) + GPT-6-Luna (implementation)' : item.id.startsWith('cooldown-clock-zero-r') ? 'GPT-6.1-Sol' : item.id.includes('-sol61-') ? 'GPT-6.1-Sol' : item.id === 'item-pickup-sol-r2' ? 'GPT-6-Sol' : 'GPT-6-Astra'),
        qualityStatus: item.qualityStatus || (/不合格|不達|未達/.test(item.status) ? 'fail' : /保留|未受入|品質未検証|品質未審査/.test(item.status) ? 'pending' : 'candidate'),
        userAdoptionStatus: adoptionState(item), adoptionStatusLabel: adoptionStatusLabel(item),
        gameIntegrationStatus: item.gameIntegrationStatus || (/本編接続済み/.test(item.status) ? 'verified' : /本編未接続|本編未採用/.test(item.status) ? 'not-integrated' : 'unverified'),
        previewKind: 'webgpu', technicalReplayStatus: item.technicalReplayStatus || (item.replayable ? 'listed-existing-replay-contract' : 'unavailable')
      }))) }));
  window.__webgpuEGallery = Object.freeze({ presentation: PRESENTATION, categories: Object.freeze(['map','effect']),
    entries: Object.freeze(exposedEntries) });
  function isEligibleEnvironmentEMapVersion(item) {
    return item.previewKind === 'webgpu'
      && item.replayable === true
      && item.environmentEStatus === 'technically-replayable'
      && typeof item.originalSrc === 'string' && item.originalSrc.length > 0
      && typeof item.originalHash === 'string' && /^[a-f0-9]{64}$/i.test(item.originalHash);
  }
  const imageGroups = [
    {"id":"security-server-gpt6sol-r01","category":"map","title":"サーバー室 + 環境E","creatorDisplayName":"GPT-6-Sol (original) + version-specific E/runtime attribution","quality":"pending-review","adoption":"adopted","defaultVersionId":"security-room-e-gpt6sol-luna-r04","integration":"not-integrated","geometryStatus":"pending","environmentEStatus":"technically-replayable","adoptionUnit":"original-map-plus-environment-e","reason":"採用対象は原画と環境Eが同時再生されるr04セット。原画単体の採用ではありません。geometry/衝突/攻撃遮蔽・通常聴感・本編接続は未受入。","versions":[{"id":"security-room-e-gpt6sol-luna-r04","title":"サーバー室 原画＋環境E r04","previewKind":"webgpu","replayable":true,"page":"public/sol61-server-room-e/r04/index.html?embed=1","source":"public/sol61-server-room-e/r04/package-manifest.json","adoption":"adopted","qualityStatus":"pending-review","technicalReplayStatus":"pass","environmentEStatus":"technically-replayable","adoptionUnit":"original-map-plus-environment-e","originalCreatorDisplayName":"GPT-6-Sol","designAuthorDisplayName":"GPT-6.1-Sol","runtimeAuthorDisplayName":"GPT-6-Luna","originalSrc":"public/sol61-server-room-e/r04/security-room-r01-original.png","originalHash":"b13814c922b644ef1c29929c7604df8e9e5f5980ef32c9fe466335e57d01ea64","normalAudioListening":"not_run","note":"原画SHA b13814c922b644ef1c29929c7604df8e9e5f5980ef32c9fe466335e57d01ea64 を保持したWebGPU環境Eセット。実GPU埋込自動ループ・有限auth receipt確認済み、verify音0。原画OFF完全一致。品質と聴感・geometry・本編受入は別途未完了。"},{"id":"security-room-e-gpt6sol-r05","title":"サーバー室 原画＋環境E r05","previewKind":"webgpu","replayable":true,"page":"public/sol61-server-room-e/r05/index.html?embed=1","source":"public/sol61-server-room-e/r05/package-manifest.json","adoption":"not-adopted","qualityStatus":"unknown","technicalReplayStatus":"pass","environmentEStatus":"technically-replayable","adoptionUnit":"original-map-plus-environment-e","originalCreatorDisplayName":"GPT-6-Sol","designAuthorDisplayName":"GPT-6.1-Sol","runtimeAuthorDisplayName":"primary-assigned runtime contributor (model identity unresolved)","originalSrc":"public/sol61-server-room-e/r05/security-room-r01-original.png","originalHash":"b13814c922b644ef1c29929c7604df8e9e5f5980ef32c9fe466335e57d01ea64","normalAudioListening":"not_applicable_no_map_sfx_requested","gameIntegrationStatus":"not_connected","technicalEvidence":"outputs/request-20261001/server-r05-improvement/native/QUEUE-FIXED-CASES.json","note":"r01原画SHA-256を保持する環境E r05候補。native WebGPUのcombined/allOFF/sourceOnly/receiverOnly readbackは完了。品質レビュー未実施、未採用、geometry/衝突/通常ゲーム接続は未検証。マップSFXは依頼されていません。"},{"id":"security-server-gpt6sol-r01-original","title":"セット原画の参照 · 単体採用ではありません","src":"assets/sol-map-history/security-room-r01-original.png","hash":"b13814c922b644ef1c29929c7604df8e9e5f5980ef32c9fe466335e57d01ea64","creatorDisplayName":"GPT-6-Sol","qualityStatus":"original-reference-only","adoption":"reference-only","role":"reference-only","standaloneAdoption":false,"geometryStatus":"pending","environmentEStatus":"reference-only","note":"r04採用セットに含まれる原画の参照。原画単体を現行採用版として扱いません。原本1340×1174 RGB、SHA-256一致。"}]},
    {id:'security-gpt-pro',category:'map',title:'警備室 · ChatGPT 5.6 Pro',creatorDisplayName:'ChatGPT 5.6 Pro',quality:'geometry-unverified',adoption:'not-adopted',integration:'not-integrated',reason:'既存ProブランチのBコードから生成した警備室の原本。食堂設備や椅子の反復を避けた独立候補。開口・アンカー・衝突・隣室接続の数値受入は未了。ゲームには未統合。',versions:[
      {id:'security-pro-candidate-01',title:'ChatGPT 5.6 Pro candidate 01',src:'assets/gpt-map-history/security-candidate-01.png',hash:'a80e8e94427d721fb0cc0ada28a6d239406c4f9870f8c28d70e72556d89023d8',qualityStatus:'geometry-unverified',adoption:'not-adopted',note:'1305×1206 RGBAの生成原本。ブランチ表示モデルはChatGPT 5.6 Pro。Bコードと生成記録: outputs/request-20260930/security-candidate。監視卓・機器ラック・保管庫を中心とする候補。開口・物体の数値照合は未了、床の多くはalpha253で完全不透明の契約に未達。'}]},
    {id:'cafeteria-gpt-pro',category:'map',title:'カフェテリア · GPT Pro',creatorDisplayName:'GPT Pro',quality:'rejected-geometry',adoption:'not-adopted',integration:'not-integrated',reason:'ChatGPT Proの画像生成候補。4版すべて未採用・ゲーム未統合。North/West opening geometryが不合格。Bコード/生成記録: outputs/request-20260929/map-resume/generation-manifest.json。',versions:[
      {id:'cafeteria-pro-candidate-04',title:'GPT Pro candidate 04',src:'assets/cafeteria-pro-candidate-04.png',hash:'ef0abe403f5f490613c2d0964675d3be40f096dce6dc51f500ee9ba53d2bf92c',qualityStatus:'rejected-geometry',adoption:'not-adopted',note:'北・西両開口の目視推定が契約に不合格。独立したpixel-segmented QAではない。最後の保存候補。'},
      {id:'cafeteria-pro-candidate-03',title:'GPT Pro candidate 03',src:'assets/cafeteria-pro-candidate-03.png',hash:'5f4db0fa28657bde8572b50e7cdb092acd8e3713efea318d61c7a1c1d375bb83',qualityStatus:'rejected-geometry',adoption:'not-adopted',note:'開口幅/中心の目視推定が契約に不合格。独立したpixel-calibrated QAではない。歴史候補として保持。'},
      {id:'cafeteria-pro-candidate-02',title:'GPT Pro candidate 02',src:'assets/cafeteria-pro-candidate-02.png',hash:'83987386bb00cc712b10380c25c011f7311ee300307ab35a99153d074886f7f0',qualityStatus:'rejected-geometry',adoption:'not-adopted',note:'北・西の両開口が内側endcap間の幅と中心条件に不合格。歴史候補として保持。'},
      {id:'cafeteria-pro-candidate-01',title:'GPT Pro candidate 01',src:'assets/cafeteria-pro-candidate-01.png',hash:'eaf56895b2d8bfda638ffe12a7ef3f5d812070b1b4d655afca4538c7f7b8f57',qualityStatus:'rejected-geometry',adoption:'not-adopted',note:'西側の開口幅不足（約143 logical units / 要求190）。歴史候補として保持。'}]}
,
    {id:'medical-gpt-history',category:'map',title:'医療室 · GPT試作',creatorDisplayName:'ChatGPT (model unverified)',quality:'mixed',adoption:'previously-adopted',integration:'not-integrated',reason:'2026-10-01に医療室の採用は撤回されました。一室プロトタイプの原本と以前の採用履歴を保持します。現在採用中の医療室版はありません。',versions:[
      {id:'medical-room-normal-20260930-r2',title:'通常版ゼロ試作 r2',src:'assets/gpt-map-history/medical-zero-normal-r2.png',hash:'e511e9fd0bf876ea159004c96bd3336d0260615a1a8929991f85a5080ddf9cd8',creatorDisplayName:'ChatGPT 6 Pro',qualityStatus:'visual-rejected-deformation-and-geometry-unaccepted',adoption:'unknown',note:'ユーザー指摘でデフォルメ造形は品質不合格。高密度版禁止を造形簡略化へ読み替えず、現実的な医療室を別のBコードから制作する。同じ検査済みBコード、参照画像なしで新規生成。真上視点を改善し医療6設備・椅子1脚を維持。外周余白、ベッド幅、棚・手洗い・東開口の位置は数値契約と差があり実画素受入は未了。本編未接続。原本を保持し配置を計測中。'},
      {id:'medical-room-normal-20260930-r1',title:'通常版ゼロ試作 r1',src:'assets/gpt-map-history/medical-zero-normal-r1.png',hash:'e862dd2fd3d7c1b4555df3d4465d82b4ca24c4e593ea1f3aa9e73073844cdeca',creatorDisplayName:'ChatGPT 6 Pro',qualityStatus:'visual-rejected-deformation-and-geometry-unaccepted',adoption:'unknown',note:'同系列の医療室デフォルメ試作。造形品質未達を保持し、通常物量で写実性を保つ別稿を制作。2026-09-30に一室単位で新規生成。観測モデル表示6 Pro、画像バックエンド版不明。医療6設備・椅子1脚、販売機なし。全体図や旧室画像の入力なし。Bコード構造検査合格だが、外周余白・斜俯瞰・設備位置の近似があり真上と配置契約の実画素受入は未了。参照画像なしで修正版を制作中。本編未接続。'},
      {id:'medical-room-dense-attempt-01',title:'高密度試作 attempt 01（不採用）',src:'assets/gpt-map-history/medical-dense-attempt-01.png',hash:'db22a3413315b6a10dba92d040eef80f396a86efe7b0c2a45c29b8d111c2cc26',creatorDisplayName:'ChatGPT (model unverified)',qualityStatus:'rejected-overfurnished',adoption:'not-adopted',note:'2026-09-30の訂正で不採用を再確認。今後高密度版は制作しない。医療室は通常版としてゼロから新規制作する。旧原本と作者は履歴として保持。'},
      {id:'medical-room-attempt-02-b',title:'医療室 attempt 02-b',src:'assets/gpt-map-history/medical-attempt-02-b.png',hash:'eb778cc07b399fc1e6e372615b145ab337fd5afc47d59e41fe28c6bd01fb73c9',creatorDisplayName:'ChatGPT (model unverified)',qualityStatus:'accepted-one-room-prototype',adoption:'previously-adopted',note:'2026-10-01にユーザーが撤回した旧採用版。原画・作者・履歴を保持。一室プロトタイプの目視配置検証はpassでしたが、ドア/既存compositor整合・衝突・実ゲーム検証は未完了。現在採用中ではありません。'},
      {id:'medical-room-attempt-02-a',title:'医療室 attempt 02-a',src:'assets/gpt-map-history/medical-attempt-02-a.png',hash:'34249c1f432a9ab8798b75524cee80c5f8dbdf2a0659ff9a8894a341ba4072a4',creatorDisplayName:'ChatGPT (model unverified)',qualityStatus:'intermediate-unselected',adoption:'not-adopted',note:'2回目の生成で保存された途中候補。attempt 02-bに選択されず、採用・統合なし。'},
      {id:'medical-room-attempt-01',title:'医療室 attempt 01',src:'assets/gpt-map-history/medical-attempt-01.png',hash:'f192d79cacd886615ea438d40764719b17bb74f18749860876e0a0794b67bc2a',creatorDisplayName:'ChatGPT (model unverified)',qualityStatus:'rejected-position-contract',adoption:'not-adopted',note:'初回位置契約に不合格。新しい2回目候補へ置換。'}]},
    {id:'station-gpt-history',category:'map',title:'研究施設マップ · 初期全体図',creatorDisplayName:'ChatGPT (model unverified)',quality:'pending-review',adoption:'not-adopted',integration:'not-integrated',reason:'2026-09-23の初期全体図原本。レビュー記録では視覚受入が保留、navigation acceptance未実施。マップ採用・本編統合なし。',versions:[
      {id:'station-attempt-02',title:'全体図 attempt 02',src:'assets/gpt-map-history/station-attempt-02.png',hash:'6e20da4be101dc4ed8852d72fb2be5f320a779573158ddb22d386286c0049b18',creatorDisplayName:'ChatGPT (model unverified)',qualityStatus:'pending-review',adoption:'not-adopted',note:'2026-09-23保存原本。技術メモは視覚受入保留、移動受入未実施。'},
      {id:'station-attempt-01',title:'全体図 attempt 01',src:'assets/gpt-map-history/station-attempt-01.png',hash:'d2a80b2ced722b5ba639b7e38640c1ddb0152c1cadf5c487bf7be31ff7f1d16e',creatorDisplayName:'ChatGPT (model unverified)',qualityStatus:'pending-review',adoption:'not-adopted',note:'2026-09-23保存原本。技術メモは視覚受入保留、移動受入未実施。'}]},
    {id:'cafeteria-gpt-20260923',category:'map',title:'カフェテリア + 環境E',creatorDisplayName:'ChatGPT (model unverified)',quality:'pending-review',adoption:'previously-adopted',defaultVersionId:'cafeteria-room-e-gptpro-sol61-luna-r2',integration:'not-integrated',reason:'2026-10-01に撤回された旧採用版です。原画・環境E・作者と技術再生履歴は保持しますが、現在採用中ではありません。',versions:[
      {id:'cafeteria-room-attempt-04',title:'一室試作 attempt 04（旧採用・撤回）',src:'assets/gpt-map-history/cafeteria-20260923-attempt-04.png',hash:'c1c1ea6ecb84b643b721760cece01914560093b1e67d5f222e720082af776a65',creatorDisplayName:'GPT Pro',qualityStatus:'user-adopted-geometry-unresolved',adoption:'previously-adopted',note:'attempt 04原画は以前採用されましたが、2026-10-01に採用撤回。以前のNorth/West開口・配置検証の不合格は未解決で、現在採用中・ゲーム統合済みではありません。'},
      {id:'cafeteria-room-e-gptpro-sol61-luna-r2',title:'attempt 04 + environment E r2（旧採用・撤回）',previewKind:'webgpu',replayable:true,page:'public/sol61-cafeteria-room-e/r2/index.html?embed=1',source:'public/sol61-cafeteria-room-e/r2/package-manifest.json',creatorDisplayName:'GPT Pro / GPT-6.1-Sol / GPT-6-Luna',originalCreatorDisplayName:'GPT Pro',designAuthorDisplayName:'GPT-6.1-Sol',runtimeAuthorDisplayName:'GPT-6-Luna',originalMapSha256:'c1c1ea6ecb84b643b721760cece01914560093b1e67d5f222e720082af776a65',qualityStatus:'pending-review',adoption:'previously-adopted',technicalReplayStatus:'pass',normalAudioListening:'not_run',gameIntegrationStatus:'not_connected',technicalEvidence:'outputs/request-20260930/sol61-cafeteria-room-e/r2-runtime/native-full.json',packageClosure:'public/sol61-cafeteria-room-e/r2/package-manifest.json',note:'以前採用されたr2ですが、2026-10-01に採用撤回。r2 package/hashと試作履歴を保持。環境E技術再生pass、視覚品質レビュー保留、通常聴感未検証、ゲーム未接続。現在採用中ではありません。'},
      {id:'cafeteria-room-e-gptpro-sol61-luna-r1',title:'attempt 04 + environment E r1',previewKind:'webgpu',replayable:true,page:'public/sol61-cafeteria-room-e/r1/index.html?embed=1',source:'public/sol61-cafeteria-room-e/r1/package-manifest.json',creatorDisplayName:'GPT Pro / GPT-6.1-Sol / GPT-6-Luna',originalCreatorDisplayName:'GPT Pro',designAuthorDisplayName:'GPT-6.1-Sol',runtimeAuthorDisplayName:'GPT-6-Luna',originalMapSha256:'c1c1ea6ecb84b643b721760cece01914560093b1e67d5f222e720082af776a65',qualityStatus:'pending-review',adoption:'not-adopted',note:'環境E r1は未採用で、現在も採用中ではありません。元の原画 attempt 04とr2には旧採用履歴がありますが、その採用は2026-10-01に撤回されました。GPT-6.1-SolがEを設計しGPT-6-Lunaが忠実なruntimeを実装。視覚品質レビュー・聴感・本編接続は未実施。'},
      {id:'cafeteria-room-attempt-03',title:'一室試作 attempt 03',src:'assets/gpt-map-history/cafeteria-20260923-attempt-03.png',hash:'a86a55567a3377c9df52955c2ca9cbceb23feffda7fce46209780677bf146c10',creatorDisplayName:'ChatGPT (model unverified)',qualityStatus:'rejected-geometry',adoption:'not-adopted',note:'北/西開口と室内構成は視覚確認されたが、設備 footprint・開口・南側歩行領域・回遊性のステーション縮尺レビュー不合格。'},
      {id:'cafeteria-room-attempt-02',title:'一室試作 attempt 02',src:'assets/gpt-map-history/cafeteria-20260923-attempt-02.png',hash:'9032820f1a241a45e8e6434cb31ab11936c7bdcd6235bd0ee20402e5e692f8f6',creatorDisplayName:'ChatGPT (model unverified)',qualityStatus:'rejected',adoption:'not-adopted',note:'改善版だが依頼していない南側出入口が含まれ、attempt 03に置換。'},
      {id:'cafeteria-room-attempt-01',title:'一室試作 attempt 01',src:'assets/gpt-map-history/cafeteria-20260923-attempt-01.png',hash:'4475795805cd3dcee358baf3fbccca452488579459179018ccad15eb5b3db5ec',creatorDisplayName:'GPT Pro',qualityStatus:'rejected',adoption:'not-adopted',note:'ChatGPT Pro生成。野菜自販機が不自然で椅子の隙間が狭いとのユーザー指摘。後続候補へ進み、採用・ゲーム統合なし。'}]},
    {id:'cafeteria-floor-component',category:'map',title:'カフェテリア床材 · コンポーネント',creatorDisplayName:'ChatGPT (model unverified)',quality:'accepted-component-only',adoption:'not-adopted',integration:'not-integrated',reason:'完成マップではなく、単一カフェテリア用の床材テクスチャ部品。反復タイルとしては継ぎ目未受入。ゲーム統合なし。',versions:[
      {id:'cafeteria-floor-attempt-02',title:'床材 attempt 02',src:'assets/gpt-map-history/cafeteria-floor-component.png',hash:'d205dea3669fe9b0a8f63b7cb0078c57a7c99d256853cc1cb2f8fd679e75f25c',creatorDisplayName:'ChatGPT (model unverified)',qualityStatus:'accepted-component-only',adoption:'not-adopted',note:'一次担当が単一カフェテリアの床材素材として受入。シームレスな反復利用は未受入。部品受入であり、マップ採用ではない。'}]},
    {id:'cafeteria-buffet-component',category:'map',title:'カフェテリア・ビュッフェ · コンポーネント',creatorDisplayName:'ChatGPT (model unverified)',quality:'accepted-component-only',adoption:'not-adopted',integration:'not-integrated',reason:'完成マップではなく単体設備の原画候補。画像作者の基底モデルは未確認で、生成コードの正確なコード先行手順にも証跡不足。',versions:[
      {id:'cafeteria-buffet-attempt-01',title:'ビュッフェ attempt 01',src:'assets/gpt-map-history/cafeteria-buffet-component.png',hash:'da99b673cd36a45f055e7442ab1b11e7ebeb9bdaf40699d561055a82ec4623f0',creatorDisplayName:'ChatGPT (model unverified)',qualityStatus:'accepted-component-only',adoption:'not-adopted',note:'Primary visual candidate acceptance only。コード全文の保存・厳密なコード再送証跡が不足。ゲーム未統合。'}]},
    {"id":"medical-room-code-only-r3","category":"map","title":"救護室 · ChatGPT Pro r3","creatorDisplayName":"ChatGPT Pro (underlying image model unverified)","quality":"root-viewed-candidate","adoption":"not-adopted","integration":"not-integrated","geometryStatus":"unverified","environmentEStatus":"awaiting-texture-adoption","reason":"ChatGPT ProのBコード添付のみで生成した救護室の一室原画候補。rootが画像を確認済み。採用・geometry/衝突・本編接続は未検証。環境Eはテクスチャ採用後に着手するため未作成。","versions":[{"id":"medical-room-code-only-r3-original","title":"ChatGPT Pro r3 original","src":"assets/map2-first-aid-code-only-r3-20261001/medical-room-r3-original.png","hash":"949c6f5d1a5a176e4b9cec098fda7b19b774d1b0cc99fb44f02b18f2e9543bc0","creatorDisplayName":"ChatGPT Pro (underlying image model unverified)","qualityStatus":"root-viewed-candidate","adoption":"not-adopted","geometryStatus":"unverified","environmentEStatus":"awaiting-texture-adoption","note":"原本1161×1355、SHA-256一致。ChatGPT Proの別childで生成。入力はmedical-r2 B-design-code.pyの完成ファイル添付だけ（添付の再ダウンロードSHAが元コードSHAと一致）、本文は空、追加promptなし。技術world grid 288×336はマップ構造契約であり、原画解像度指定ではない。geometry・衝突・本編統合は未検証。Eはテクスチャ採用待ち。来歴: assets/map2-first-aid-code-only-r3-20261001/provenance.json"}]},
    {"id":"medical-r3-original-environment-r1","category":"map","title":"救護室","creatorDisplayName":"ChatGPT Pro (original; underlying image model unverified) + GPT-6.1-Sol (r5 design requested; execution identity unresolved)","quality":"pending-improvement","adoption":"not-adopted","defaultVersionId":"medical-r4-original-environment-r5","integration":"not-integrated","geometryStatus":"unverified","environmentEStatus":"technically-replayable","adoptionUnit":"original-map-plus-environment-e","reason":"r5を最新版として先頭表示します。native WebGPU技術再生pass（ready 195 frames、エラー・shader message各0）。実寸品質は改善途中で最終合格ではありません。未採用・本編未接続・geometry/衝突未検証。r1/r2/r3/r4履歴を保持。マップSFXなし。","versions":[
      {"id":"medical-r4-original-environment-r5","title":"r4原画＋環境E r5","previewKind":"webgpu","replayable":true,"page":"public/sol61-medical-vfx-r4-environment/r5/index.html?embed=1","source":"public/sol61-medical-vfx-r4-environment/r5/manifest.json","adoption":"not-adopted","qualityStatus":"pending-improvement","technicalReplayStatus":"pass","environmentEStatus":"technically-replayable","adoptionUnit":"original-map-plus-environment-e","originalCreatorDisplayName":"ChatGPT Pro (underlying image model unverified)","designAuthorDisplayName":"GPT-6.1-Sol (requested; execution identity unresolved)","runtimeAuthorDisplayName":"execution identity unresolved","originalSrc":"public/sol61-medical-vfx-r4-environment/r5/medical-room-vfx-r4.png","originalHash":"9f3fe2fb6772daa8104dcf97abe1bf87e5254a17af4c629dd0d3b5d7088ffa7e","normalAudioListening":"not_applicable_no_map_sfx_requested","gameIntegrationStatus":"not_connected","technicalEvidence":"outputs/request-20261001/medical-vfx-r4-environment/r5/native/READY.json","note":"Primary native Chrome WebGPU replay passed: ready 195 frames, bgra8unorm, zero errors and shader messages; original 1164×1351. ON/OFF and OBS-off screenshots are preserved in the r5 native evidence folder. Material response is more visible than r4, but primary actual-size quality acceptance remains pending improvement. Unadopted, not connected to the main game; geometry/collision unverified. No map SFX."},
      {"id":"medical-r4-original-environment-r4","title":"r4原画＋環境E r4","previewKind":"webgpu","replayable":true,"page":"public/sol61-medical-vfx-r4-environment/r4/index.html?embed=1","source":"public/sol61-medical-vfx-r4-environment/r4/manifest.json","adoption":"not-adopted","qualityStatus":"pending-improvement","technicalReplayStatus":"pass","environmentEStatus":"technically-replayable","adoptionUnit":"original-map-plus-environment-e","originalCreatorDisplayName":"ChatGPT Pro (underlying image model unverified)","designAuthorDisplayName":"GPT-6.1-Sol (requested; execution identity unresolved)","runtimeAuthorDisplayName":"execution identity unresolved","originalSrc":"public/sol61-medical-vfx-r4-environment/r4/medical-room-vfx-r4.png","originalHash":"9f3fe2fb6772daa8104dcf97abe1bf87e5254a17af4c629dd0d3b5d7088ffa7e","normalAudioListening":"not_applicable_no_map_sfx_requested","gameIntegrationStatus":"not_connected","technicalEvidence":"outputs/request-20261001/medical-vfx-r4-environment/r4/MEDICAL-R4.json","note":"Primary native Chrome WebGPU replay pass: ready 49 frames, bgra8unorm, no errors or shader messages; original dimensions 1164×1351. Visual quality review at actual display size remains incomplete. Unadopted, not connected to the main game; geometry/collision unverified. No map SFX."},
      {"id":"medical-r4-original-environment-r3","title":"r4原画＋環境E r3","previewKind":"webgpu","replayable":true,"page":"public/sol61-medical-vfx-r4-environment/r3/index.html?embed=1","source":"public/sol61-medical-vfx-r4-environment/r3/manifest.json","adoption":"not-adopted","qualityStatus":"pending-improvement","technicalReplayStatus":"pass","environmentEStatus":"technically-replayable","adoptionUnit":"original-map-plus-environment-e","originalCreatorDisplayName":"ChatGPT Pro (underlying image model unverified)","designAuthorDisplayName":"GPT-6.1-Sol (requested; execution identity unresolved)","runtimeAuthorDisplayName":"execution identity unresolved","originalSrc":"public/sol61-medical-vfx-r4-environment/r3/medical-room-vfx-r4.png","originalHash":"9f3fe2fb6772daa8104dcf97abe1bf87e5254a17af4c629dd0d3b5d7088ffa7e","normalAudioListening":"not_applicable_no_map_sfx_requested","gameIntegrationStatus":"not_connected","technicalEvidence":"outputs/request-20261001/medical-vfx-r4-environment/r3/NATIVE-REPLAY.json","note":"native WebGPU replay pass: ready 26 frames, bgra8unorm, no shader messages or errors; original dimensions 1164×1351, OBS OFF. Visual quality failed/pending improvement: right floor has a strong rounded-rectangle light patch and lower floor a short white band; both look pasted on. Unadopted, not game-integrated; geometry/collision unverified. No map SFX."},
      {"id":"medical-r4-original-environment-r2","title":"r4原画＋環境E r2","previewKind":"webgpu","replayable":true,"page":"public/sol61-medical-vfx-r4-environment/r2/index.html?embed=1","source":"public/sol61-medical-vfx-r4-environment/r2/manifest.json","adoption":"not-adopted","qualityStatus":"unknown","technicalReplayStatus":"pass","environmentEStatus":"technically-replayable","adoptionUnit":"original-map-plus-environment-e","originalCreatorDisplayName":"ChatGPT Pro (underlying image model unverified)","designAuthorDisplayName":"GPT-6.1-Sol (requested; execution identity unresolved)","runtimeAuthorDisplayName":"execution identity unresolved","originalSrc":"public/sol61-medical-vfx-r4-environment/r2/medical-room-vfx-r4.png","originalHash":"9f3fe2fb6772daa8104dcf97abe1bf87e5254a17af4c629dd0d3b5d7088ffa7e","normalAudioListening":"not_applicable_no_map_sfx_requested","gameIntegrationStatus":"not_connected","technicalEvidence":"outputs/request-20261001/medical-vfx-r4-gallery-registration/NATIVE-REPLAY.json","note":"native Chrome WebGPU replay passed: ready 63 frames, bgra8unorm, no errors/shader messages; original comparison ready 16 frames with E off. Quality remains unknown/unreviewed; effect difference was observed as subtle. Not adopted, not geometry/game accepted. No map SFX."},
      {"id":"medical-r4-original-environment-r1","title":"r4原画＋環境E r1","previewKind":"webgpu","replayable":true,"page":"public/sol61-medical-vfx-r4-environment/r1/index.html?embed=1","source":"public/sol61-medical-vfx-r4-environment/r1/manifest.json","adoption":"not-adopted","qualityStatus":"unknown","technicalReplayStatus":"pass","environmentEStatus":"technically-replayable","adoptionUnit":"original-map-plus-environment-e","originalCreatorDisplayName":"ChatGPT Pro (underlying image model unverified)","designAuthorDisplayName":"GPT-6.1-Sol","runtimeAuthorDisplayName":"GPT-6.1-Sol (package author; implementation split not recorded)","originalSrc":"public/sol61-medical-vfx-r4-environment/r1/medical-room-vfx-r4.png","originalHash":"9f3fe2fb6772daa8104dcf97abe1bf87e5254a17af4c629dd0d3b5d7088ffa7e","normalAudioListening":"not_applicable_no_map_sfx_requested","gameIntegrationStatus":"not_connected","technicalEvidence":"outputs/request-20261001/medical-vfx-r4-gallery-registration/NATIVE-REPLAY.json","note":"native Chrome WebGPU replay passed: ready 31 frames, no errors/shader messages. Quality remains unknown/unreviewed; effect difference was observed as subtle. Not adopted, not geometry/game accepted. No map SFX."},
      {"id":"medical-r3-original-environment-r1","title":"原画＋環境E r1（r3原画）","previewKind":"webgpu","replayable":true,"page":"public/sol61-medical-r3-environment/r1/index.html?embed=1","source":"public/sol61-medical-r3-environment/r1/package-manifest.json","adoption":"not-adopted","qualityStatus":"unknown","technicalReplayStatus":"pass","environmentEStatus":"technically-replayable","adoptionUnit":"original-map-plus-environment-e","originalCreatorDisplayName":"ChatGPT Pro (underlying image model unverified)","designAuthorDisplayName":"GPT-6.1-Sol (requested; actual execution identity unresolved)","runtimeAuthorDisplayName":"primary native runtime contributor (model identity unresolved)","originalSrc":"public/sol61-medical-r3-environment/r1/medical-room-r3-original.png","originalHash":"949c6f5d1a5a176e4b9cec098fda7b19b774d1b0cc99fb44f02b18f2e9543bc0","normalAudioListening":"not_applicable_no_map_sfx_requested","gameIntegrationStatus":"not_connected","technicalEvidence":"outputs/request-20261001/medical-r3-environment/r1/native/CASES-FINAL.json","note":"native WebGPU combined/original/sourceOFF/OBS_OFF case set completed with ready frames 84–103 and zero errors. Quality remains unknown/unreviewed; not adopted or game-integrated. Map SFX were not requested."}]}
  ].filter(group => ['security-server-gpt6sol-r01','medical-r3-original-environment-r1'].includes(group.id))
    .map(group => ({ ...group, versions: group.versions.filter(isEligibleEnvironmentEMapVersion) }))
    .filter(group => group.versions.length > 0);
  function makeMapPreview(item) {
    if (item.previewKind !== 'webgpu' || item.replayable !== true || !item.page) throw new TypeError('WebGPU map preview requires a replayable page');
    const preview = new URL(item.page, location.href);
    preview.searchParams.set('embed', '1');
    preview.searchParams.set('galleryRelease', 'map-webgpu-20260930-r1');
    preview.searchParams.delete('height'); preview.searchParams.delete('zoom');
    if (params.has('verify')) preview.searchParams.set('verify', params.get('verify') || '1');
    else preview.searchParams.delete('verify');
    return preview;
  }
  function fitMapFrame(iframe) {
    const scale = Math.min(stage.clientWidth / PRESENTATION.width, stage.clientHeight / PRESENTATION.height);
    const width = PRESENTATION.width * scale, height = PRESENTATION.height * scale;
    iframe.width = String(PRESENTATION.width); iframe.height = String(PRESENTATION.height);
    iframe.style.left = `${(stage.clientWidth - width) / 2}px`;
    iframe.style.top = `${(stage.clientHeight - height) / 2}px`;
    iframe.style.transformOrigin = 'top left'; iframe.style.transform = `scale(${scale})`;
    iframe.dataset.mapFitScale = String(scale);
  }
  function disposeMapPreview() {
    const frame = stage.querySelector('iframe');
    if (frame) { sfxBridge?.detachFrame(frame); frame.remove(); }
    if (previewStatusPoll !== null) window.clearInterval(previewStatusPoll);
    fitObserver?.disconnect(); fitObserver = null;
    previewStatusPoll = null; activeAudioFrame = null; activeAudioItem = null;
  }
  window.addEventListener('pagehide', () => { mapSelectionGeneration++; disposeMapPreview(); }, { once: true });
  const exposedMapEntries = imageGroups.map(group => Object.freeze({
    id: group.id, title: group.title, category: 'map', defaultVersionId: group.defaultVersionId, creatorDisplayName: group.creatorDisplayName,
    qualityStatus: group.quality, userAdoptionStatus: group.adoption, gameIntegrationStatus: group.integration, geometryStatus: group.geometryStatus || 'unverified', environmentEStatus: group.environmentEStatus || 'not-applicable',
    reason: group.reason,
    versions: Object.freeze(group.versions.map(item => Object.freeze({ ...item,
      category: 'map', creatorDisplayName: item.creatorDisplayName || group.creatorDisplayName,
      originalCreatorDisplayName: item.originalCreatorDisplayName || group.originalCreatorDisplayName,
      designAuthorDisplayName: item.designAuthorDisplayName || group.designAuthorDisplayName,
      runtimeAuthorDisplayName: item.runtimeAuthorDisplayName || group.runtimeAuthorDisplayName,
      qualityStatus: item.qualityStatus || group.quality,
      userAdoptionStatus: adoptionState(item), gameIntegrationStatus: group.integration,
      previewKind: item.previewKind || 'image',
      technicalReplayStatus: item.previewKind === 'webgpu' ? (item.technicalReplayStatus || (item.replayable === true && item.page ? 'replayable' : 'unavailable')) : 'saved-original'
    })))
  }));
  window.__webgpuEGallery = Object.freeze({ ...window.__webgpuEGallery, mapEntries: Object.freeze(exposedMapEntries) });
  function resolveInitialGalleryLink() {
    const keys=['category','filter','asset','version'];
    if(!keys.some(key=>params.has(key)))return Object.freeze({status:'default'});
    const supplied=Object.fromEntries(keys.filter(key=>params.has(key)).map(key=>[key,params.get(key)]));
    const fallback=()=>{currentAdoptionFilter='unadopted';return Object.freeze({status:'fallback',reason:'invalid-or-ineligible'});};
    let category=currentCategory,filter=currentAdoptionFilter;
    if(params.has('category')){if(!['map','effect'].includes(supplied.category))return fallback();category=supplied.category;}
    if(params.has('filter')){if(!['adopted','unadopted'].includes(supplied.filter))return fallback();filter=supplied.filter;}
    const effects=entries;
    const maps=imageGroups.filter(group=>group.category==='map');
    let group=null;
    if(params.has('asset')){
      group=[...effects,...maps].find(candidate=>candidate.id===supplied.asset)||null;
      if(!group)return fallback();
      const actualCategory=effects.includes(group)?'effect':'map';
      if(params.has('category')&&category!==actualCategory)return fallback();
      if(!params.has('category'))category=actualCategory;
    }
    if(params.has('version')&&!group)return fallback();
    currentCategory=category;currentAdoptionFilter=filter;
    if(!group)return Object.freeze({status:'category-filter',category,filter});
    const indices=visibleVersionIndices(group);
    if(!indices.length)return fallback();
    let versionIndex;
    if(params.has('version')){
      versionIndex=group.versions.findIndex(item=>item.id===supplied.version);
      if(versionIndex<0||!indices.includes(versionIndex))return fallback();
    }else{
      versionIndex=indices.find(index=>group.versions[index].id===group.defaultVersionId)??indices[0];
    }
    selections.set(`${category}:${filter}`,{groupId:group.id,versionId:group.versions[versionIndex].id});
    return Object.freeze({status:'selected',category,filter,asset:group.id,version:group.versions[versionIndex].id});
  }
  const initialDeepLink=resolveInitialGalleryLink();
  window.__webgpuEGallery = Object.freeze({ ...window.__webgpuEGallery, initialDeepLink });
  async function showMapOriginal(group, item, generation) {
    notice.hidden = false;
    notice.textContent = '原画のSHA-256を確認しています…';
    try {
      if (!item.originalSrc || !/^[a-f0-9]{64}$/i.test(item.originalHash || ''))
        throw new Error('比較用の原画source/hashがありません');
      const url = new URL(item.originalSrc, location.href);
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`原画HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map(value => value.toString(16).padStart(2, '0')).join('');
      if (digest !== item.originalHash.toLowerCase()) throw new Error('原画SHA-256がmetadataと一致しません');
      if (generation !== mapSelectionGeneration || currentCategory !== 'map'
        || activeMapSelection?.versionId !== item.id || !mapOriginalComparison) return;
      const img = document.createElement('img');
      img.alt = `${group.title} ${item.title} 原画のみ`;
      img.src = url.href;
      img.dataset.sha256 = digest;
      img.dataset.originalSrc = item.originalSrc;
      img.addEventListener('error', () => {
        if (generation !== mapSelectionGeneration) return;
        notice.textContent = '確認済みの原画PNGを表示できませんでした'; notice.hidden = false;
      });
      stage.append(img);
      notice.hidden = true;
      document.getElementById('selected-source').textContent = `検証済み原画PNG · ${item.originalSrc} · SHA-256 ${digest}`;
      const link = document.getElementById('selected-link');
      link.href = url.href; link.textContent = '原画PNGを見る ↗';
    } catch (error) {
      if (generation !== mapSelectionGeneration) return;
      notice.textContent = error.message; notice.hidden = false;
    }
  }
  function selectImage(group, versionIndex) {
    const item=group.versions[versionIndex];
    const webgpu = item.previewKind === 'webgpu';
    if (activeMapSelection?.versionId !== item.id) mapOriginalComparison = false;
    const generation = ++mapSelectionGeneration;
    activeMapSelection = { groupId: group.id, versionId: item.id, versionIndex };
    const canCompareOriginal = webgpu && typeof item.originalSrc === 'string' && /^[a-f0-9]{64}$/i.test(item.originalHash || '');
    mapComparison.hidden = !canCompareOriginal;
    mapComparisonButton.setAttribute('aria-pressed', String(mapOriginalComparison));
    mapComparisonButton.textContent = mapOriginalComparison ? '原画＋Eに戻す' : '原画のみで比較';
    if (webgpu && (item.replayable !== true || !item.page)) throw new TypeError('Unplayable WebGPU maps are excluded from the gallery');
    disposeMapPreview(); stage.querySelector('img')?.remove();
    const audioPolicy = updateGalleryAudioControl('map', item);
    notice.hidden=true;
    if (webgpu && mapOriginalComparison) {
      void showMapOriginal(group, item, generation);
    } else if (webgpu) {
      const preview = makeMapPreview(item);
      const iframe = document.createElement('iframe'); iframe.title = group.title+' '+item.title+' WebGPU room preview';
      if (audioPolicy.bridgeAllowed) iframe.allow = 'autoplay';
      iframe.src = preview.href; fitMapFrame(iframe);
      iframe.addEventListener('load',()=>{
        if (iframe !== stage.querySelector('iframe')) return;
        if (audioPolicy.bridgeAllowed) {
          activeAudioFrame = iframe; activeAudioItem = item;
          reflectAudio(sfxBridge?.attachFrame(iframe,item));
        }
        try {
          const child = iframe.contentDocument; if (!child) throw new Error('プレビューにアクセスできません');
          const error = child.getElementById('error');
          const updateNotice = () => { const message = error?.textContent?.trim(); notice.textContent = message || ''; notice.hidden = !message; };
          updateNotice(); previewStatusPoll = window.setInterval(updateNotice,250);
        } catch (error) { notice.textContent=error.message; notice.hidden=false; }
      });
      iframe.addEventListener('error',()=>{notice.textContent='プレビューを読み込めませんでした';notice.hidden=false;});
      stage.append(iframe); fitObserver = new ResizeObserver(()=>fitMapFrame(iframe)); fitObserver.observe(stage);
    } else {
      const img=document.createElement('img'); img.alt=group.title+' '+item.title; img.src=item.src; img.dataset.sha256=item.hash;
      img.addEventListener('error',()=>{notice.textContent='画像原本を読み込めませんでした';notice.hidden=false;}); stage.append(img);
    }
    document.getElementById('selected-title').textContent=group.title+' · '+item.title;
    const quality=item.qualityStatus||group.quality;
    const adoption=adoptionState(item);
    const authors=[item.originalCreatorDisplayName&&'原画作者: '+item.originalCreatorDisplayName,item.designAuthorDisplayName&&'E作者: '+item.designAuthorDisplayName,item.runtimeAuthorDisplayName&&'runtime作者: '+item.runtimeAuthorDisplayName].filter(Boolean).join(' · ');
    document.getElementById('selected-description').textContent=(authors?authors+'。 ':'')+'作者: '+(item.creatorDisplayName||group.creatorDisplayName||'不明')+'。版: '+item.id+'。品質状態: '+quality+'。採用状態: '+(adoption==='unknown'?'unknown':adoption)+'。本編接続: '+group.integration+'。'+(item.note||group.reason)+(item.hash?' 原本SHA-256: '+item.hash:'');
    document.getElementById('selected-status').textContent=quality+' · '+adoptionStatusLabel(item)+' · '+group.integration;
    document.getElementById('selected-source').textContent=webgpu?'WebGPUマップ · '+(item.source||item.page):'保存原本画像 · '+item.src;
    const link=document.getElementById('selected-link');link.href=webgpu?makeMapPreview(item).href:item.src;link.textContent=webgpu?'WebGPUマッププレビューを見る ↗':'原本画像を見る ↗';
    const visible=visibleVersionIndices(group).map(i=>({v:group.versions[i],i}));
    versionSelect.replaceChildren(...visible.map(({v,i},n)=>{const o=document.createElement('option');o.value=String(n);o.textContent=v.title+' — '+adoptionStatusLabel(v)+(v.qualityStatus?' · '+v.qualityStatus:'');o.dataset.versionId=v.id;return o;}));
    versionSelect.value=String(Math.max(0,visible.findIndex(x=>x.i===versionIndex)));versionSelect.disabled=visible.length<2;
    versionSelect.onchange=()=>selectImage(group,visible[Number(versionSelect.value)].i);
    buttons.forEach(b=>b.setAttribute('aria-current',b.dataset.id===group.id?'true':'false'));
    document.getElementById('entry-counter').textContent=imageGroups.filter(g=>g.category===group.category).length+' 群 · '+visible.length+' 版';
    selections.set(`${currentCategory}:${currentAdoptionFilter}`,{groupId:group.id,versionId:item.id});
  }
  mapComparisonButton.addEventListener('click', () => {
    if (currentCategory !== 'map' || !activeMapSelection) return;
    mapOriginalComparison = !mapOriginalComparison;
    selectImage(imageGroups.find(group => group.id === activeMapSelection.groupId), activeMapSelection.versionIndex);
  });
  function renderSelection() {
    if (currentCategory !== 'map') { mapSelectionGeneration++; activeMapSelection = null; mapOriginalComparison = false; mapComparison.hidden = true; }
    setHeadline();
    updateGalleryAudioControl(currentCategory, null);
    document.getElementById('effect-scale-contract').hidden = currentCategory !== 'effect';
    categoryTabs.forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.category===currentCategory)));
    adoptionTabs.forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.filter===currentAdoptionFilter)));
    layout.hidden=false;emptyCategory.hidden=true;catalog.replaceChildren();buttons=[];
    const groups=currentCategory==='effect'?entries:imageGroups.filter(g=>g.category===currentCategory);
    const matching=groups.map(group=>({group,indices:visibleVersionIndices(group)})).filter(row=>row.indices.length);
    if(!matching.length){
      mapSelectionGeneration++; activeMapSelection = null; mapOriginalComparison = false; mapComparison.hidden = true;
      layout.hidden=true;emptyCategory.hidden=false;emptyCategory.textContent=`${document.getElementById('list-heading').textContent}はありません。`;
      const previousFrame = stage.querySelector('iframe');
      if (previousFrame) sfxBridge?.detachFrame(previousFrame);
      previousFrame?.remove();stage.querySelector('img')?.remove();
      activeAudioFrame = null; activeAudioItem = null;
      if(previewStatusPoll!==null)window.clearInterval(previewStatusPoll);previewStatusPoll=null;
      fitObserver?.disconnect();fitObserver=null;versionSelect.replaceChildren();versionSelect.disabled=true;
      document.getElementById('entry-counter').textContent='0 件';return;
    }
    for(const {group,indices} of matching){
      const b=document.createElement('button');b.type='button';b.className='item';b.dataset.id=group.id;
      const remembered=selections.get(`${currentCategory}:${currentAdoptionFilter}`);
      const preferred=remembered?.groupId===group.id?indices.find(i=>group.versions[i].id===remembered.versionId):undefined;
      const first=preferred??indices.find(i=>group.versions[i].id===group.defaultVersionId)??indices[0];
      const item=group.versions[first];const title=document.createElement('strong');title.textContent=group.title+' · '+item.title;
      const status=document.createElement('span');status.textContent=currentCategory==='effect'?`${adoptionStatusLabel(item)} · ${item.status}`:`${adoptionStatusLabel(item)} · ${item.qualityStatus||group.quality}`;
      b.append(title,status);b.addEventListener('click',()=>currentCategory==='effect'?select(entries.indexOf(group),first):selectImage(group,first));catalog.append(b);buttons.push(b);
    }
    const remembered=selections.get(`${currentCategory}:${currentAdoptionFilter}`);
    const preferred=matching.findIndex(row=>row.group.id===remembered?.groupId);
    const selectedRow=matching[preferred>=0?preferred:0];
    const savedVersion=remembered?.groupId===selectedRow.group.id?selectedRow.indices.find(i=>selectedRow.group.versions[i].id===remembered.versionId):undefined;
    const selectedVersion=savedVersion??selectedRow.indices.find(i=>selectedRow.group.versions[i].id===selectedRow.group.defaultVersionId)??selectedRow.indices[0];
    if(currentCategory==='effect')select(entries.indexOf(selectedRow.group),selectedVersion);else selectImage(selectedRow.group,selectedVersion);
    const versionsCount=matching.reduce((n,row)=>n+row.indices.length,0);
    document.getElementById('entry-counter').textContent=`${matching.length} 群 · ${versionsCount} 版`;
  }
  const adoptionTabs=[...document.querySelectorAll('[data-filter]')];
  adoptionTabs.forEach(tab=>tab.addEventListener('click',()=>{currentAdoptionFilter=tab.dataset.filter;renderSelection();}));
  categoryTabs.forEach(tab=>tab.addEventListener('click',()=>{if(!isValidCategory(tab.dataset.category))return;currentCategory=tab.dataset.category;persistCategory(currentCategory,()=>window.localStorage);renderSelection();}));
  for(const group of imageGroups)for(const version of group.versions)version.adoption ??= group.adoption;
  renderSelection();})();
