(() => {
  'use strict';
  const PRESENTATION = Object.freeze({ width: 980, height: 620, anchorHeight: 64 });
  const EFFECT_VIEW = Object.freeze({
    'heal-astra': { magnification: 4, focusX: 490, focusY: 310 },
    'sunbeam-astra': { magnification: 1.18, focusX: 490, focusY: 310 },
    'sunbeam-pro-live-v1': { magnification: 1.2, focusX: 490, focusY: 310 },
    'sunbeam-pro-file-draft': { magnification: 1.2, focusX: 490, focusY: 310 },
    'sunbeam-pro-v2': { magnification: 1.2, focusX: 490, focusY: 310 },
    'luck-astra': { magnification: 3.5, focusX: 490, focusY: 195 },
    'luck-pro-r01': { magnification: 1.5, focusX: 490, focusY: 310 },
    'luck-pro-r02': { magnification: 1.5, focusX: 490, focusY: 310 },
    'barrier-pro': { magnification: 3.0, focusX: 490, focusY: 310 },
    'barrier-pro-r05': { magnification: 1.8, focusX: 490, focusY: 310 },
    'barrier-pro-r06': { magnification: 1.0, focusX: 490, focusY: 310 },
    'barrier-pro-r07': { magnification: 1.0, focusX: 490, focusY: 310 },
    'barrier-pro-r08': { magnification: 1.0, focusX: 490, focusY: 310 },
    'barrier-pro-r09': { magnification: 1.0, focusX: 490, focusY: 310 },
    'stamina-pro': { magnification: 4.0, focusX: 490, focusY: 496 },
    'stamina-pro-r03': { magnification: 1.0, focusX: 490, focusY: 310 },
    'stamina-pro-r04': { magnification: 1.0, focusX: 490, focusY: 310 },
    'stamina-pro-r02': { magnification: 2.3, focusX: 490, focusY: 310 },
    'mana-pro': { magnification: 2.0, focusX: 490, focusY: 310 },
    'mana-pro-r02': { magnification: 2.0, focusX: 627, focusY: 336 },
    'mana-pro-r03': { magnification: 2.2, focusX: 627, focusY: 310 },
    'mana-pro-r04': { magnification: 1.5, focusX: 490, focusY: 310 },
    'mana-pro-clean-r01': { magnification: 6.0, focusX: 490, focusY: 310 },
    'rational-pro-r01': { magnification: 1.0, focusX: 490, focusY: 310 },
    'ninjutsu-pro-r01': { magnification: 1.0, focusX: 490, focusY: 310 },
    'facility-bookshelf-pro-r01': { magnification: 2.0, focusX: 490, focusY: 310 },
    'facility-reading-lamp-pro-r01': { magnification: 2.0, focusX: 490, focusY: 310 },
    'facility-security-console-pro-r01': { magnification: 2.0, focusX: 490, focusY: 310 },
    'item-pickup-pro-r01': { magnification: 1.0, focusX: 490, focusY: 310 },
    'taser-pro-r01': { magnification: 1.0, focusX: 490, focusY: 310 },
    'item-use-pro-r01': { magnification: 1.0, focusX: 490, focusY: 310 },
    'stamina-pro-r05': { magnification: 1.0, focusX: 490, focusY: 310 },
    'facility-next3-pro-r01': { magnification: 1.0, focusX: 490, focusY: 310 },
    'heart-teleport-pro-r01': { magnification: 1.0, focusX: 490, focusY: 310 },
    'emp-pro': { magnification: 2.0, focusX: 490, focusY: 310 }
  });
  const version = (id, title, page, source, status, detail, anchor = 'actor-H64', zoom = 1, replayable = false) =>
    Object.freeze({ id, title, page, source, status, detail, anchor, zoom, replayable });
  // These Pro previews were independently replayed in the gallery's embedded WebGPU route.
  const replayedProVersions = new Set([
    'sunbeam-pro-file-draft', 'sunbeam-pro-live-v1', 'sunbeam-pro-v2',
    'luck-pro-r02', 'luck-pro-r01',
    'barrier-pro-r09', 'barrier-pro-r08', 'barrier-pro-r07', 'barrier-pro-r06', 'barrier-pro-r05', 'barrier-pro-r04', 'barrier-pro-r03', 'barrier-pro-r02', 'barrier-pro-r01',
    'stamina-pro-r05', 'stamina-pro-r04', 'stamina-pro-r03', 'stamina-pro-r02', 'stamina-pro-r01',
    'mana-pro-clean-r01', 'mana-pro-r04', 'mana-pro-r03', 'mana-pro-r02', 'mana-pro-r01',
    'rational-pro-r01', 'ninjutsu-pro-r01',
    'facility-bookshelf-pro-r01', 'facility-reading-lamp-pro-r01', 'facility-security-console-pro-r01',
    'item-pickup-pro-r01', 'taser-pro-r01', 'item-use-pro-r01', 'facility-next3-pro-r01', 'heart-teleport-pro-r01',
    'emp-pro-r03', 'emp-pro-r02', 'emp-pro-r01', 'emp-pro-p0',
    'shoot-pro-r03', 'shoot-pro-r02', 'shoot-pro-r01', 'headshot-pro-v05', 'headshot-pro-v04', 'headshot-pro-v03', 'headshot-pro-v02', 'headshot-pro-v01'
  ]);
  const entries = [
    { id: 'heal-astra', title: 'ヒール', versions: [
      version('heal-astra-prototype', 'Astra版', 'heal-astra-preview.html', 'webgpu-heal-astra-prototype.js', 'ユーザー品質採用・発光と主形を確認済み', '採用済みヒール。追加のキラキラと強発光時のフレアは別版の改稿候補です。連続再生の全寿命と聴感は未受入です。', 'actor-H64', 0.7937),
      version('heal-webgpu-20260924', '旧版（9月24日）', 'heal-webgpu-preview.html', 'webgpu-heal-e.js', '旧版・品質不採用・本編未採用', 'Astra版より前のヒール。比較用にWebGPUで再生できます。現行ヒールには使用しません。', 'actor-H64', 0.7937, true)
    ] },
    { id: 'sunbeam-astra', title: 'サンビーム', versions: [
      version('sunbeam-astra-clean-v3', 'Astra v3', 'sunbeam-astra-clean-v3-preview.html', 'webgpu-sunbeam-astra-clean-v3.js', 'ユーザー品質採用・本編ソース接続済み・公開版未反映', '手元から伝播する三つの光路を持つ採用版。作業中の本編ソースでは実イベントからWebGPU描画・SFXへ接続済みで、公開ゲーム版には未反映です。実画面・実音声は今回未確認。掌光源のレンズフレア強化は別版の改稿候補です。', 'effect-H64'),
      version('sunbeam-pro-file-draft', 'GPT Pro旧完成稿', 'sunbeam-pro-older/file-v1.html', 'sunbeam-pro-older/sunbeam-pro-file-v1.mjs', 'GPT Pro旧版・実GPU再生可能・品質未受入・本編未採用', 'ファイルプレビューから回収した旧完成稿。独立したWebGPU自動ループで再生可能。版番号は原稿にないため付けていません。', 'effect-H64', 1, true),
      version('sunbeam-pro-live-v1', 'GPT Pro初稿', 'sunbeam-pro-older/live-gpu-v1.html', 'sunbeam-pro-older/sunbeam-pro-live-gpu-v1.mjs', 'GPT Pro旧版・実GPU再生可能・品質未受入・本編未採用', '最初のPro原稿。片手・両手の実GPU再生記録があり、比較用に自動ループします。', 'effect-H64', 1, true),
      version('sunbeam-pro-v2', 'GPT Pro v2', 'sunbeam-v2-gallery.html', 'webgpu-sunbeam-pro-v2.mjs', 'GPT Pro旧版・実GPU再生可能・品質未受入・本編未採用', '旧Pro v2をWebGPUで比較再生します。品質とSFXの受入、本編採用は未了です。', 'effect-H64', 1, true),
    ] },
    { id: 'luck-astra', title: '幸運', versions: [
      version('luck-astra-clean-v4', 'Astra v4', 'luck-astra-v4-preview.html', 'webgpu-luck-astra-v4.js', 'ユーザー品質採用・本編ソース接続済み・公開版未反映', '採用済み幸運v4。作業中の本編ソースでは実イベントからWebGPU描画・SFXへ接続済みで、公開ゲーム版には未反映です。実画面・実音声は今回未確認。幸運の因果表現は別版の改稿候補です。'),
      version('luck-pro-r02', 'GPT Pro r0.2', 'luck-pro-replay/luck-pro-r02.html', 'luck-pro-replay/luck-e-revision.mjs', 'GPT Pro改稿・実GPU再生可能・品質未受入・本編未採用', '改稿版は実GPUで再生可能。旧r0.1より広い青金色の形が見えるが、視覚品質とSFXは未受入です。', 'actor-H64', 1, true),
      version('luck-pro-r01', 'GPT Pro r0.1', 'luck-pro-replay/luck-pro-r01.html', 'luck-pro-replay/luck-e.mjs', 'GPT Pro旧版・実GPU再生可能・品質不合格・本編未採用', '旧Pro初稿は細い金色の線だけに見えるため品質不合格。比較用に再生します。', 'actor-H64', 1, true),
    ] },
    { id: 'shoot-pro', title: '射撃（GPT Pro）', versions: [
      version('shoot-pro-r03', 'GPT Pro r0.3', 'shoot-pro-r03/index.html', 'shoot-pro-r03/src/renderer.js', 'GPT Pro制作・実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', '5武器の自動巡回と暗明を実WebGPUで確認。SMG初動の主形、全寿命とSFXの品質確認が残ります。白飛び自体は棄却理由にしません。', 'effect-H64', 1, true),
      version('shoot-pro-r02', 'GPT Pro r0.2', 'shoot-pro-r02/index.html', 'shoot-pro-r02/src/renderer.js', 'GPT Pro旧版・実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', '5武器と暗明を自動ループする旧版。単独WebGPU活動中画素を確認しましたが、品質と音は未受入です。', 'effect-H64', 1, true),
      version('shoot-pro-r01', 'GPT Pro r0.1', 'shoot-pro-r01/index.html', 'shoot-pro-r01/src/renderer.js', 'GPT Pro旧版・技術互換adapterで実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', '原本のWGSL予約語だけを意味不変に改名した互換版。5武器の暗明自動ループを実WebGPUで確認しましたが、品質と音は未受入です。', 'effect-H64', 1, true)
    ] },
    { id: 'headshot-pro', title: 'ヘッドショット接触（GPT Pro）', versions: [
      version('headshot-pro-v05', 'GPT Pro v5', 'webgpu-headshot-pro-v05/embed.html', 'webgpu-headshot-pro-v05/src/renderer.mjs', 'GPT Pro制作・実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', '共通接触表現のH64暗明をWebGPU自動ループで確認。Pro原本の造形・音源を保持し、全寿命の原寸品質と聴感、実ゲーム重なりは未受入です。', 'effect-H64', 1, true),
      version('headshot-pro-v04', 'GPT Pro v4', 'headshot-pro-v04/embed.html', 'headshot-pro-v04/src/renderer.mjs', 'GPT Pro制作・実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', 'H64/H32・暗明の4面で自動再生し、10種の技術的な実GPU提出と描画を確認しました。10種は技術再生範囲を示します。視覚品質とSFX聴感は未受入です。', 'effect-H64', 1, true),
      version('headshot-pro-v03', 'GPT Pro v3', 'headshot-pro-v03/index.html', 'headshot-pro-v03/src/renderer.mjs', 'GPT Pro旧版・実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', '5武器×HIP/AIMのH64/H32自動巡回を実WebGPUで確認。同じ武器のHIP/AIMがH32では似る旧版で、品質未受入です。', 'effect-H64', 1, true),
      version('headshot-pro-v02', 'GPT Pro v2', 'headshot-pro-v02/index.html', 'headshot-pro-v02/src/renderer.mjs', 'GPT Pro旧版・実GPU再生可能・品質不合格・SFX聴感未確認・本編未採用', '10種の接触形がほぼ同じ橙の斜線に見えるため品質不合格。比較用にH64/H32、暗明を自動ループ再生します。', 'effect-H64', 1, true),
      version('headshot-pro-v01', 'GPT Pro v1', 'headshot-pro-v01/index.html', 'headshot-pro-v01/src/renderer.mjs', 'GPT Pro旧版・実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', '5武器×HIP/AIMのH64を実WebGPUで並列自動ループ再生。全10種の描画を確認しましたが、視覚品質と音は未受入です。', 'effect-H64', 1, true)
    ] },
    { id: 'barrier-pro', title: 'バリア（GPT Pro比較）', versions: [
      version('barrier-pro-r09', 'GPT Pro r0.9', 'barrier-pro-r09/embed.html', 'barrier-pro-r09/barrier-pro-renderer.mjs', 'GPT Pro制作・実GPU再生可能・視覚品質審査中・SFX聴感未確認・本編未採用', 'create・absorb・fracture・bustの暗明8面をH64自動ループで確認。原本の造形と音源を保持した技術再生版です。視覚品質と聴感は版別審査中で、本編には接続していません。', 'effect-H64', 1, true),
      version('barrier-pro-r08', 'GPT Pro r0.8', 'barrier-pro-r08/embed.html', 'barrier-pro-r08/barrier-pro-renderer.mjs', 'GPT Pro制作・実GPU再生可能・視覚品質未達・SFX聴感未確認・本編未採用', 'H64の暗明でcreate・absorb・fracture・bustをChrome実WebGPU再生。立体感は増したが、実寸では輪郭がぼやけ、4事象の作用差が弱く、明背景のbustは形が読みにくい。視覚評価60/100、SFXは未評価。本編接続は未受入です。', 'effect-H64', 1, true),
      version('barrier-pro-r07', 'GPT Pro r0.7', 'barrier-pro-r07/embed.html', 'barrier-pro-r07/barrier-pro-renderer.mjs', 'ユーザー品質採用・本編接続作業中・SFX聴感未確認', '2026-09-28のユーザー指示でr0.7を採用。4事象のH64自動ループとGPUエラー0は確認済み。以前の品質未達評価は採用指示で更新しました。本編への版固有接続とSFX聴感はまだ検証中です。', 'effect-H64', 1, true),
      version('barrier-pro-r06', 'GPT Pro r0.6', 'barrier-pro-r06/embed.html', 'barrier-pro-r06/barrier-pro-renderer.mjs', 'GPT Pro旧版・技術互換adapterで実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', '原本の合成テクスチャ型不一致をadapterで修復して四事象を自動再生。白飛びは棄却理由にせず、四事象の造形・作用とSFXの品質確認を残します。', 'effect-H64', 1, true),
      version('barrier-pro-r05', 'GPT Pro r0.5', 'barrier-pro-r05/embed.html', 'barrier-pro-r05/barrier-pro-renderer.mjs', 'GPT Pro制作・実GPU再生可能・品質不合格・SFX聴感未確認・本編未採用', '吸収中のH64保護空域が小さな不透明のカップ状へ潰れるため品質不合格。既存設計の自動ループWebGPU比較版で、本編には接続していません。', 'effect-H64', 1, true),
      version('barrier-pro-r04', 'GPT Pro r0.4', 'barrier-pro-r04/index.html', 'barrier-pro-r04/preview.mjs', 'GPT Pro制作・実GPU再生可能・品質未受入・SFX聴感未確認・本編未採用', 'GPT Proによる巻膜案。過去にカフ状に見えるとの報告があります。背景の明暗や淡さを不合格理由にせず、形態と全寿命の視覚品質を独立に再審査中です。SFX聴感も未受入です。', 'effect-H64', 1, true),
      version('barrier-pro-r03', 'GPT Pro r0.3', 'barrier-pro-r03/preview.html', 'barrier-pro-r03/barrier-pro-renderer.mjs', 'GPT Pro制作・実GPU再生可能・品質未達・本編未採用', 'GPT Pro独立改稿。4事象を実WebGPUで再生できます。以前の造形高評価は撤回され、保護面と発光の品質は未達です。', 'effect-H64', 1, true),
      version('barrier-pro-r02', 'GPT Pro r0.2', 'barrier-pro-r02/preview.html', 'barrier-pro-r02/barrier-pro-renderer.mjs', '比較試作・品質不合格・本編未採用', 'ChatGPT Proによる独立設計。実WebGPUでは主形が小さな不透明の球状に見え、保護空域と吸収の作用差が読めないため改稿中。', 'effect-H64', 1, true),
      version('barrier-pro-r01', 'GPT Pro r0.1', 'barrier-pro-r01/preview.html', 'barrier-pro-r01/barrier-pro.wgsl', '比較試作・品質不合格・本編未採用', 'GPT Pro独立初稿。実WebGPU再生はできるが、原寸では細く暗い支持線だけが読め、保護空域は不十分。', 'effect-H64', 1, true)
    ] },
    { id: 'stamina-pro', title: 'スタミナ回復（GPT Pro）', versions: [
      version('stamina-pro-r05', 'GPT Pro r0.5', 'stamina-pro-r05/index.html', 'stamina-pro-r05/src/renderer.mjs', 'GPT Pro制作・実GPU再生可能・視覚品質審査中・SFX聴感未確認・本編未採用', '身体へ内向きに充填する独立改稿。予約語の意味不変な互換改名とイベント時代の照合を行い、暗明H64で実WebGPUの動く発光を確認。原寸の造形・全寿命・実聴と本編接続は未受入です。', 'effect-H64', 1, true),
      version('stamina-pro-r04', 'GPT Pro r0.4', 'webgpu-stamina-pro-r04/embed.html', 'webgpu-stamina-pro-r04/src/renderer.js', 'GPT Pro制作・実GPU再生可能・視覚品質審査中・SFX聴感未確認・本編未採用', '暗明H64で収束から身体への充填までを実WebGPU自動ループで確認。構文・shader・音声一回性は検証済み。視覚品質と聴感の版別審査、本編接続は未了です。', 'effect-H64', 1, true),
      version('stamina-pro-r03', 'GPT Pro r0.3', 'webgpu-stamina-pro-r03/index.html', 'webgpu-stamina-pro-r03/src/renderer.js', 'GPT Pro制作・実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', 'H64の収束・充填・蓄勢案。実Chrome WebGPUでコンパイル・描画と一部位相を確認。全寿命の視覚品質、SFX聴感、実ゲーム接続は未受入です。', 'effect-H64', 1, true),
      version('stamina-pro-r02', 'GPT Pro r0.2', 'webgpu-stamina-pro-r02/index.html', 'webgpu-stamina-pro-r02/src/renderer.mjs', 'GPT Pro制作・実GPU再生可能・品質不合格・SFX聴感未確認・本編未採用', '原寸では主形が細い帯と小さな平面に見えるため品質不採用。4画面の検査UIから一つのH64描画面だけをギャラリーへ埋め込み、自動ループします。', 'effect-H64', 1, true),
      version('stamina-pro-r01', 'GPT Pro r0.1', 'stamina-pro-r01-preview.html', 'stamina-pro-r01/renderer.mjs', 'GPT Pro制作・再生可能・品質未受入・SFX聴感未確認・本編未採用', '身体へ充填されるスタミナ回復案。限定的な実WebGPU再生は確認済み。原寸の全寿命、聴感、ゲーム本編での発動は未受入です。', 'effect-H64', 1, true)
    ] },
    { id: 'mana-pro', title: 'マナ獲得（GPT Pro）', versions: [
      version('mana-pro-clean-r01', 'GPT Pro 独立新稿 r0.1', 'mana-gain-pro-clean-r01/gallery.html', 'mana-gain-pro-clean-r01/src/renderer.js', 'GPT Pro制作・実GPU再生可能・H64視覚品質未達・SFX聴感未確認・本編未採用', '独立新稿をWebGPUで自動ループ再生。原寸H64では主形が小さな菱形状に留まり、身体への到着・蓄積が読めないため創作改稿を要します。発光とGPU描画は確認済み。聴感と本編接続は未受入です。', 'effect-H64', 1, true),
      version('mana-pro-r04', 'GPT Pro r0.4', 'webgpu-mana-pro-r04/embed.html', 'webgpu-mana-pro-r04/src/gpu.js', 'GPT Pro制作・実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', '外部供給帯から身体境界の変換を経て体内へ充填する改稿。暗明H64でWebGPU描画を確認。全寿命の視覚品質とSFX聴感、本編接続は未受入です。', 'effect-H64', 1, true),
      version('mana-pro-r03', 'GPT Pro r0.3', 'webgpu-mana-pro-r03/index.html', 'webgpu-mana-pro-r03/src/renderer.js', 'GPT Pro制作・技術互換adapterで実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', 'Pro原本のWGSL三項演算子を同義のselectへ最小修正し、H64単発を実WebGPUで再生。身体への獲得表現の全寿命品質と聴感は未受入です。', 'effect-H64', 1, true),
      version('mana-pro-r02', 'GPT Pro r0.2', 'webgpu-mana-pro-r02/index.html', 'webgpu-mana-pro-r02/src/renderer.js', 'GPT Pro制作・実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', '新しい容積受容案。実ChromeのWebGPUでコンパイルと描画を確認。ギャラリーではH64単発を自動再生します。全寿命の視覚品質と音、実ゲームでの接続は未受入です。', 'effect-H64', 1, true),
      version('mana-pro-r01', 'GPT Pro r0.1', 'webgpu-mana-pro-r01/index.html', 'webgpu-mana-pro-r01/preview/replay.js', 'GPT Pro制作・再生可能・品質未受入・SFX聴感未確認・本編未採用', '身体の周囲から胸郭へ収束するマナ獲得案。提出物の実WebGPU再生は確認済み。ギャラリー表示、全寿命、聴感とゲーム本編の接続は別途検証中です。', 'effect-H64', 1, true)
    ] },
    { id: 'rational-pro', title: '理性の錬気（GPT Pro）', versions: [
      version('rational-pro-r01', 'GPT Pro r0.1', 'action-rational-pro-r01/replay.html', 'action-rational-pro-r01/src/gpu.mjs', 'GPT Pro制作・実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', '銅金色の場が中心の水平通路を開く独立設計。暗明H64のWebGPU再生を確認しました。原寸の全寿命とSFX品質、本編接続は未受入です。', 'effect-H64', 1, true)
    ] },
    { id: 'ninjutsu-pro', title: '忍殺準備（GPT Pro）', versions: [
      version('ninjutsu-pro-r01', 'GPT Pro r0.1', 'action-ninjutsu-pro-r01/gallery-preview.html', 'action-ninjutsu-pro-r01/src/gpu.mjs', 'GPT Pro制作・実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', '忍殺準備の開始を表す独立設計。濃紺と紫の内向き曲線で張力を示します。錬気ではありません。暗明H64のWebGPU再生を確認済み。原寸の全寿命とSFX品質、本編接続は未受入です。', 'effect-H64', 1, true)
    ] },
    { id: 'heart-teleport-pro', title: '心臓転移（GPT Pro）', versions: [
      version('heart-teleport-pro-r01', 'GPT Pro r0.1', 'heart-teleport-pro-r01/index.html', 'heart-teleport-pro-r01/source/src/gpu.mjs', 'GPT Pro制作・実GPU再生可能・視覚品質審査中・SFX聴感未確認・本編未採用', '発動者側だけに表示する心臓転移E。暗明H64の実WebGPUフレームで描画を確認。着地点の座標や方向を表現せず、造形・音の品質と本編接続は未受入です。', 'effect-H64', 1, true)
    ] },
    { id: 'facility-bookshelf-pro', title: '資料棚（GPT Pro）', versions: [
      version('facility-bookshelf-pro-r01', 'GPT Pro r0.1', 'facility-pro-r01/embed.html?effect=bookshelf', 'facility-pro-r01/package/src/effects/bookshelf/index.js', 'GPT Pro制作・実GPU再生可能・視覚品質審査中・SFX聴感未確認・本編未採用', '研究施設の資料棚E。暗明2面のWebGPU自動ループを確認。造形・音の品質と本編接続は未受入です。', 'effect-H64', 1, true)
    ] },
    { id: 'facility-reading-lamp-pro', title: '読書灯（GPT Pro）', versions: [
      version('facility-reading-lamp-pro-r01', 'GPT Pro r0.1', 'facility-pro-r01/embed.html?effect=reading-lamp', 'facility-pro-r01/package/src/effects/reading-lamp/index.js', 'GPT Pro制作・実GPU再生可能・視覚品質審査中・SFX聴感未確認・本編未採用', '研究施設の読書灯E。暗明2面のWebGPU自動ループを確認。造形・音の品質と本編接続は未受入です。', 'effect-H64', 1, true)
    ] },
    { id: 'facility-security-console-pro', title: '警備コンソール（GPT Pro）', versions: [
      version('facility-security-console-pro-r01', 'GPT Pro r0.1', 'facility-pro-r01/embed.html?effect=security-console', 'facility-pro-r01/package/src/effects/security-console/index.js', 'GPT Pro制作・実GPU再生可能・視覚品質審査中・SFX聴感未確認・本編未採用', '研究施設の警備コンソールE。暗明2面のWebGPU自動ループを確認。造形・音の品質と本編接続は未受入です。', 'effect-H64', 1, true)
    ] },
    { id: 'item-pickup-pro', title: 'アイテム取得（GPT Pro）', versions: [
      version('item-pickup-pro-r01', 'GPT Pro r0.1', 'item-pickup-pro-r01/embed.html', 'item-pickup-pro-r01/src/renderer.mjs', 'GPT Pro制作・実GPU再生可能・視覚品質審査中・SFX聴感未確認・本編未採用', '取得成功receiptにだけ結ぶ独立設計。原本ソースを保持した暗明H64のWebGPU自動ループで活動画素を確認。取得物や行先を示す演出ではありません。視覚品質、実聴と本編接続は未受入です。', 'effect-H64', 1, true)
    ] },
    { id: 'taser-pro', title: 'テーザー接触（GPT Pro）', versions: [
      version('taser-pro-r01', 'GPT Pro r0.9 preview', 'taser-pro-r01/embed.html', 'taser-pro-r01/src/renderer.js', 'GPT Pro制作・実GPU再生可能・視覚品質審査中・SFX聴感未確認・本編未採用', 'テーザーの減速付与接触を表す独立設計。Intel非fallback WebGPUで暗明H64の活動画素、ループ更新、シェーダーエラー0件を確認。全寿命の品質と実聴、本編接続は未受入です。', 'effect-H64', 1, true)
    ] },
    { id: 'item-use-pro', title: 'アイテム使用（GPT Pro）', versions: [
      version('item-use-pro-r01', 'GPT Pro r0.1', 'item-use-pro-r01/r01/index.html', 'item-use-pro-r01/r01/src/renderer.mjs', 'GPT Pro制作・実GPU再生可能・視覚品質審査中・SFX聴感未確認・本編未採用', 'ミネラルウォーター、海水、解毒薬の使用成立を分けた独立設計。暗明H64の6例で実WebGPU画素を確認。視覚品質、実聴、BODY動作との共存、本編接続は未受入です。', 'effect-H64', 1, true)
    ] },
    { id: 'facility-next3-pro', title: '施設の新規3種（GPT Pro）', versions: [
      version('facility-next3-pro-r01', 'GPT Pro r0.1', 'facility-next3-pro-r01/index.html', 'facility-next3-pro-r01/src/renderer.mjs', 'GPT Pro制作・実GPU再生可能・視覚品質審査中・SFX聴感未確認・本編未採用', 'カメラ三脚、投影装置、読書灯を暗明6面で自動再生。Chromeの実WebGPU描画と82件の原本テストを確認。原寸の造形・全寿命・実聴と本編接続は未受入です。', 'effect-H64', 1, true)
    ] },
    { id: 'emp-pro', title: 'EMP（GPT Pro）', versions: [
      version('emp-pro-r03', 'GPT Pro r0.3', 'webgpu-emp-pro-r03/index.html', 'webgpu-emp-pro-r03/src/emp-e.js', 'GPT Pro制作・5枝実GPU再生可能・品質保留・SFX聴感未確認・本編未採用', 'Pro改稿のチャージ・放出・共鳴・相殺・ロックを自動巡回。Chromeで少なくとも共鳴の主形を実GPU確認。全枝の全寿命・原寸品質・実聴・本編接続は未受入です。', 'effect-H64', 1, true),
      version('emp-pro-r02', 'GPT Pro r0.2', 'webgpu-emp-pro-r02/index.html', 'webgpu-emp-pro-r02/src/emp-e.js', 'GPT Pro制作・5枝再生可能・実GPU一部確認・品質保留・SFX聴感未確認・本編未採用', 'チャージ、通常放出、共鳴、相殺、ストレージロックをH64で自動巡回します。実Chromeでは放出・共鳴・相殺の一部状態を描画確認済み。全5枝の全寿命と視覚品質、実聴、実ゲームは未受入です。', 'effect-H64', 1, true),
      version('emp-pro-r01', 'GPT Pro r0.1', 'emp-pro-r01/r01/index.html', 'emp-pro-r01/r01/src/emp-e.js', 'GPT Pro制作・再生可能・品質未受入・SFX聴感未確認・本編未採用', 'GPT Pro独立設計 r0.1。確認記録は通常転送と共鳴の一部状態に限られます。視覚品質・全分岐・全寿命・性能・SFX聴感は未受入です。', 'effect-H64', 1, true),
      version('emp-pro-p0', 'GPT Pro P0', 'emp-pro-r01/p0/index.html', 'emp-pro-r01/p0/src/emp-e.js', 'GPT Pro制作・P0ブロックアウト・再生可能・最終品質ではない・本編未採用', 'r0.1制作途中の凍結ブロックアウトです。原形を維持した比較再生用で、最終品質を示しません。GPU確認は限定状態のみ。', 'effect-H64', 1, true)
    ] }
  ].map(group => ({ ...group, versions: group.versions.filter(v =>
    v.status.includes('ユーザー品質採用') || v.status.includes('ユーザー審査待ち') ||
    (group.id === 'heal-astra' && v.id === 'heal-webgpu-20260924' && v.replayable) ||
    (v.replayable && replayedProVersions.has(v.id))) }))
    .filter(group => group.versions.length > 0)
    .map(group => Object.freeze({ ...group, versions: Object.freeze(group.versions) }));
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
    preview.searchParams.set('galleryRelease', 'pro-replays-20260928-v52');
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
      title: group.title,
      latest: group.versions[0].id, versions: group.versions }))) });
  select(0);
})();

