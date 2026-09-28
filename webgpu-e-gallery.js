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
      version('mana-astra-r9', 'Astra r9', 'public/astra-mana-receive-v1/versions/r9/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r9/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当不採用: 手から左下へ投射する扇形beamに見え、受領方向が逆。0.30/0.53/0.74sの身体変化も弱い。', 'actor-H64'),
      version('mana-astra-r8', 'Astra r8', 'public/astra-mana-receive-v1/versions/r8/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r8/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当不採用: 翼を消した結果、源の球とアクターが分離。0.74sの接続が消え、主形/因果がr7より弱まる。', 'actor-H64'),
      version('mana-astra-r7', 'Astra r7', 'public/astra-mana-receive-v1/versions/r7/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r7/renderer.mjs', '品質審査中・本編未採用', '作者: GPT-6-Astra。審査中: 実衣装との遮蔽/発光は改善したが、外の布/翼が支配的。受領の因果を要改善。', 'actor-H64'),
      version('mana-astra-r6', 'Astra r6', 'public/astra-mana-receive-v1/versions/r6/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r6/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当不採用: 青い筆跡と腹の白楕円。単純mannequinでは肌/衣装の相互作用を判定できない。', 'actor-H64'),
      version('mana-astra-r5', 'Astra r5', 'public/astra-mana-receive-v1/versions/r5/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r5/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当不採用: 太いチューブが数字6/疑問符に見え、腰の閉ループが支配的。色/輝度も単調。', 'actor-H64'),
      version('mana-astra-r4', 'Astra r4', 'public/astra-mana-receive-v1/versions/r4/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r4/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。自己不採用: 開いた曲線を使っても、左右の合成輪郭が大きなU字を作る。', 'actor-H64'),
      version('mana-astra-r3', 'Astra r3', 'public/astra-mana-receive-v1/versions/r3/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r3/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。自己不採用: 透過性は改善したが、閉じた縁が腰の輪と肩のストラップに見える。', 'actor-H64'),
      version('mana-astra-r2', 'Astra r2', 'public/astra-mana-receive-v1/versions/r2/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r2/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当不採用: 青い膨らんだ塊が人物を覆い、供給/輸送/受領が同質に見える。', 'actor-H64'),
      version('mana-astra-r1', 'Astra r1', 'public/astra-mana-receive-v1/versions/r1/index.html?embed=1&scale=1', 'public/astra-mana-receive-v1/versions/r1/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。主担当不採用: H64の輸送が細い線、後半が小さな点。受領の状態が弱い。', 'actor-H64'),
      version('mana-astra-v5-pilot', 'Astra v5 pilot', 'webgpu-mana-astra-v5-pilot.html', 'webgpu-mana-astra-v5-pilot.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-clean-v4-pilot', 'Astra clean v4 pilot', 'mana-astra-clean-v4-pilot.html', 'webgpu-mana-astra-clean-v4-pilot.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-clean-v3', 'Astra clean v3', 'mana-astra-clean-v3-preview.html', 'webgpu-mana-astra-clean-v3.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-clean-v2', 'Astra clean v2', 'mana-astra-clean-v2-preview.html', 'webgpu-mana-astra-clean-v2.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-clean-v1', 'Astra clean v1', 'mana-astra-clean-v1-preview.html', 'webgpu-mana-astra-clean-v1.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-zero-v1', 'Astra zero v1', 'webgpu-mana-astra-zero-preview.html', 'webgpu-mana-astra-zero-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPU自動ループ再生済み。形状、滑らかさ、SFXが品質未達。')
    ]) }),
    Object.freeze({ id: 'stamina-astra', title: 'スタミナ', versions: Object.freeze([
      version('stamina-astra-r8', 'Astra r8', 'public/astra-stamina-gain-v1/versions/r8/index.html?embed=1&height=64', 'public/astra-stamina-gain-v1/versions/r8/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。追加の脚の誤読は解消し、maleで体幹から支持点への方向は読めるが、身体照明と床の一点光に留まり、独立したEの主形/多層現象が不足。次稿は実脚に従属する少数の広い外部運動応答が必要。', 'actor-H64'),
      version('stamina-astra-r7', 'Astra r7', 'public/astra-stamina-gain-v1/versions/r7/index.html?embed=1&height=64', 'public/astra-stamina-gain-v1/versions/r7/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。対称括弧は消えたが、身体を回る一本のオレンジ帯に見え、スタミナ回復固有の意味と層が弱い。帯の微修正を停止。', 'actor-H64'),
      version('stamina-astra-r6', 'Astra r6', 'public/astra-stamina-gain-v1/versions/r6/index.html?embed=1&height=64', 'public/astra-stamina-gain-v1/versions/r6/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。H64で左右対称の大きなオレンジ括弧に見える。体幹から下肢への作用線と非対称の蓄積/解放が必要。', 'actor-H64'),
      version('stamina-astra-r5', 'Astra r5', 'public/astra-stamina-gain-v1/versions/r5/index.html?embed=1&height=64', 'public/astra-stamina-gain-v1/versions/r5/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。r4との差と移動する局所ピークがH64ではほぼ見えず、現構造の微修正で完成に達しない。次稿は造形と時間設計をゼロから再設計。', 'actor-H64'),
      version('stamina-astra-r4', 'Astra r4', 'public/astra-stamina-gain-v1/versions/r4/index.html?embed=1&height=64', 'public/astra-stamina-gain-v1/versions/r4/renderer.mjs', '品質未達・審査中・本編未採用', '作者: GPT-6-Astra。元の身体色は保持。H64で部位別・速度差が判別しづらく、完成品質は保留。', 'actor-H64'),
      version('stamina-astra-r3', 'Astra r3', 'public/astra-stamina-gain-v1/versions/r3/index.html?embed=1&height=64', 'public/astra-stamina-gain-v1/versions/r3/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。供給→腰接触→衣服照明は読めるが、単純な黄楕円と均一な黄変で全身への流れが不足。', 'actor-H64'),
      version('stamina-astra-r2', 'Astra r2', 'public/astra-stamina-gain-v1/versions/r2/index.html?embed=1&height=64', 'public/astra-stamina-gain-v1/versions/r2/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。広げた受信場も三叉の発光アイコンに見え、身体への蓄積が読めない。', 'actor-H64'),
      version('stamina-astra-r1', 'Astra r1', 'public/astra-stamina-gain-v1/versions/r1/index.html?embed=1&height=64', 'public/astra-stamina-gain-v1/versions/r1/renderer.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。H64では小さな鉤と3本の細線。供給と身体蓄積が読めない。', 'actor-H64'),
      version('stamina-astra-clean-v3', 'Astra clean v3', 'stamina-astra-clean-v3-preview.html', 'webgpu-stamina-astra-clean-v3.js', '品質不採用・本編未採用', 'H64で扇形の光片から胸腹の発光ベストへ変わるが、スタミナ補給として読めず品質不採用。'),
      version('stamina-astra-clean-v2', 'Astra clean v2', 'stamina-astra-clean-v2-preview.html', 'webgpu-stamina-astra-clean-v2.js', '品質未受入・本編未採用', 'H64形状の自主レビュー記録あり。スタミナとしての独立識別評価は未実施で、最終品質は未受入。'),
      version('stamina-astra-clean-v1', 'Astra clean v1', 'stamina-astra-clean-v1-preview.html', 'webgpu-stamina-astra-clean-v1.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('stamina-astra-zero-v2', 'Astra zero v2', 'webgpu-stamina-astra-zero-v2-preview.html', 'webgpu-stamina-astra-zero-v2-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPU再生済み。H64シルエットと移送前面が読みにくい。'),
      version('stamina-astra-zero-v1', 'Astra zero v1', 'webgpu-stamina-astra-zero-preview.html', 'webgpu-stamina-astra-zero-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPU全寿命連続再生済み。形状とSFXが品質未達。')
    ]) }),
    Object.freeze({ id: 'emp-astra', title: 'EMP', versions: Object.freeze([
      version('emp-astra-v1.8', 'Astra v1.8', 'astra-emp-v1/versions/v1.8/index.html', 'astra-emp-v1/versions/v1.8/emp.mjs', 'ユーザー採用済み・本編接続中（実装未完了）', 'ユーザー採用版。ゲームへの接続作業中で、実装完了や実機発動・聴感の受入とは別です。', 'effect-H64'),
      version('emp-astra-v1.7', 'Astra v1.7', 'astra-emp-v1/versions/v1.7/index.html', 'astra-emp-v1/versions/v1.7/emp.mjs', '品質不合格・本編未採用', 'Astra v1.7。品質不合格で本編未採用です。', 'effect-H64'),
      version('emp-astra-v1.6', 'Astra v1.6', 'astra-emp-v1/versions/v1.6/index.html', 'astra-emp-v1/versions/v1.6/emp.mjs', '品質不合格・本編未採用', 'Astra v1.6。品質不合格で本編未採用です。', 'effect-H64'),
      version('emp-astra-v1.5', 'Astra v1.5', 'astra-emp-v1/versions/v1.5/index.html', 'astra-emp-v1/versions/v1.5/emp.mjs', '品質不合格・本編未採用', 'Astra v1.5。品質不合格で本編未採用です。', 'effect-H64'),
      version('emp-astra-v1.4', 'Astra v1.4 · 復元再生', 'astra-emp-v1/versions/v1.4/index.html', 'astra-emp-v1/versions/v1.4/emp.mjs', '品質不合格・本編未採用', '原本欠落のため復元した再生版。チャージ・保管ロックの表示と形状が品質不合格です。', 'effect-H64'),
      version('emp-astra-v1.3', 'Astra v1.3 · 復元再生', 'astra-emp-v1/versions/v1.3/index.html', 'astra-emp-v1/versions/v1.3/emp.mjs', '品質不合格・本編未採用', '原本欠落のため復元した再生版。共鳴の識別とアルファ縁に品質上の問題があります。', 'effect-H64'),
      version('emp-astra-v1.2', 'Astra v1.2 · 復元再生', 'astra-emp-v1/versions/v1.2/index.html', 'astra-emp-v1/versions/v1.2/emp.mjs', '品質不合格・本編未採用', '原本欠落のため復元した再生版。薄いリング形状と共鳴表現が品質不合格です。', 'effect-H64'),
      version('emp-astra-zero-v1', 'Astra zero v1', 'webgpu-emp-astra-zero-preview.html', 'webgpu-emp-astra-zero-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPUでチャージ、放電、共鳴、キャンセル、保管ロックを再生済み。')
    ]) }),
    Object.freeze({ id: 'status-cleanse-astra', title: '状態異常回復 · Astra履歴', versions: Object.freeze([
      version('status-cleanse-astra-r09', 'Astra r0.9', 'astra-status-cleanse-v1/versions/r09/index.html?embed=1&h=64', 'astra-status-cleanse-v1/versions/r09/cleanse.mjs', '品質不合格・本編未採用', 'H64原寸で付着の剥離と受け手の変化が読み取れず、品質不合格。', 'actor-H64'),
      version('status-cleanse-astra-r08', 'Astra r0.8', 'astra-status-cleanse-v1/versions/r08/index.html?embed=1&h=64', 'astra-status-cleanse-v1/versions/r08/cleanse.mjs', '品質不合格・本編未採用', '剥離片が突然現れる布切れに見え、元の被覆との連続性が弱い。清浄側は局所的すぎてH64でほぼ読めない。', 'actor-H64'),
      version('status-cleanse-astra-r07', 'Astra r0.7', 'astra-status-cleanse-v1/versions/r07/index.html?embed=1&h=64', 'astra-status-cleanse-v1/versions/r07/cleanse.mjs', '品質不合格・本編未採用', 'H64では紫から緑への衣装色替えに見え、付着が剥がれる形や動きがほぼ見えない。', 'actor-H64'),
      version('status-cleanse-astra-r06', 'Astra r0.6', 'astra-status-cleanse-v1/versions/r06/index.html?embed=1&h=64', 'astra-status-cleanse-v1/versions/r06/cleanse.mjs', '品質不合格・本編未採用', '顔の保護は改善したが、背後の形が容器や浴槽に見える。', 'actor-H64'),
      version('status-cleanse-astra-r05', 'Astra r0.5', 'astra-status-cleanse-v1/versions/r05/index.html?embed=1&h=64', 'astra-status-cleanse-v1/versions/r05/cleanse.mjs', '品質不合格・本編未採用', '白い浄化帯が顔を横切り、H64で横棒に見える。', 'actor-H64'),
      version('status-cleanse-astra-r04', 'Astra r0.4', 'astra-status-cleanse-v1/versions/r04/index.html?embed=1&h=64', 'astra-status-cleanse-v1/versions/r04/cleanse.mjs', '品質不合格・本編未採用', '孤立したリボンの品質欠陥が残る。', 'actor-H64'),
      version('status-cleanse-astra-r03', 'Astra r0.3', 'astra-status-cleanse-v1/versions/r03/index.html?embed=1&h=64', 'astra-status-cleanse-v1/versions/r03/cleanse.mjs', '品質不合格・本編未採用', '孤立したリボンでは身体の状態回復が伝わらない。', 'actor-H64'),
      version('status-cleanse-astra-r02', 'Astra r0.2', 'astra-status-cleanse-v1/versions/r02/index.html?embed=1&h=64', 'astra-status-cleanse-v1/versions/r02/cleanse.mjs', '品質不合格・本編未採用', 'aliasは除去されたが、主形が光る花器に見える。', 'actor-H64'),
      version('status-cleanse-astra-r01', 'Astra r0.1', 'astra-status-cleanse-v1/versions/r01/index.html?embed=1&h=64', 'astra-status-cleanse-v1/versions/r01/cleanse.mjs', '品質不合格・本編未採用', '主形が小さな杯に見え、ray-marchに帯状aliasがある。', 'actor-H64')
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
    preview.searchParams.set('galleryRelease', 'astra-history-20260928-v67');
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

