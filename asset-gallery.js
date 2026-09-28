(() => {
  'use strict';
  const PRESENTATION = Object.freeze({ width: 980, height: 620, anchorHeight: 64 });
  const EFFECT_VIEW = Object.freeze({
    'heal-astra-prototype': { magnification: 4, focusX: 490, focusY: 310 },
    'sunbeam-astra-clean-v3': { magnification: 1.18, focusX: 490, focusY: 310 },
    'luck-astra-clean-v4': { magnification: 3.5, focusX: 490, focusY: 195 },
    // These H64 replay packages occupy a small part of their 980x620 source
    // canvas. Enlarge the gallery view only; each preview still renders H64.
    'mana-astra': { magnification: 4.25, focusX: 245, focusY: 310 },
    'stamina-astra': { magnification: 4.25, focusX: 518, focusY: 343 },
    'status-cleanse-astra': { magnification: 4.25, focusX: 490, focusY: 310 },
    'cooldown-astra': { magnification: 1.0, focusX: 490, focusY: 310 },
    'barrier-pro-r07': { magnification: 1.0, focusX: 490, focusY: 310 }
  });
  const version = (id, title, page, source, status, detail, anchor = 'actor-H64', zoom = 1) =>
    Object.freeze({ id, title, page, source, status, detail, anchor, zoom, replayable: true });
  // List technically replayable Astra versions, including trials that did not pass quality review.
  const entries = Object.freeze([
    Object.freeze({ id: 'heal-astra', title: 'ヒール', defaultVersionId: 'heal-astra-sparkle-r1', versions: Object.freeze([
      version('heal-astra-sparkle-r1', 'Astra sparkle r1', 'public/astra-heal-sparkle-r1/index.html', 'public/astra-heal-sparkle-r1/heal-sparkle.js', 'ユーザー採用済み・ゲームコード接続済み・公開起動確認済み', '作者: GPT-6-Astra。ユーザー指定でHeal sparkle r1を採用。既存の視覚審査候補記録は維持し、明背景の一部でコントラスト低下あり。聴感未実施、公開Play→準備画面のWebGPU起動確認済み。実発動・全寿命・SFX聴感は未確認。', 'actor-H64'),
      version('heal-astra-sparkle-r3', 'Astra sparkle r3', 'public/astra-heal-sparkle-r3/index.html', 'public/astra-heal-sparkle-r3/heal-sparkle.js', '視覚品質候補・ユーザー未採用・本編未接続', '作者: GPT-6-Astra。光条角度は全点・全位相で統一（主光条−64°、交差光条+26°）。品質理由: 全点/全位相でHeal基準角−64°。H64暗明で読める十字光条、元主形/発光保持、OFF元版一致。明背景の主光流に重なる一部点は局所差が弱い。音実聴未実施、本編未接続、ユーザー未採用。', 'actor-H64'),
      version('heal-astra-sparkle-r2', 'Astra sparkle r2', 'public/astra-heal-sparkle-r2/index.html', 'public/astra-heal-sparkle-r2/heal-sparkle.js', '比較用旧稿・角度統一条件未対応・未採用・本編未接続', '作者: GPT-6-Astra。回復リボン接線に合わせて光条ごとに角度を変える旧稿で、現在の統一角度条件には未対応。元記録のH64視覚品質候補: H64暗明で題材に沿う交差光条・元主形・発光保持を確認。34 A/B画像で減光チャンネル0。明背景の白い主光流と重なる点は局所差が小さい。実聴未実施、本編未接続、ユーザー未採用。', 'actor-H64'),
      version('heal-astra-sparkle-draft-b', 'Astra sparkle draft B', 'public/astra-heal-sparkle-r1/draft-b/index.html', 'public/astra-heal-sparkle-r1/draft-b/heal-sparkle.js', '品質不合格・旧試作・未採用', '作者: GPT-6-Astra。履歴品質理由: Receiver moved into torso; maintenance sparkle still too small. 後続r1に置換。', 'actor-H64'),
      version('heal-astra-sparkle-draft-a', 'Astra sparkle draft A', 'public/astra-heal-sparkle-r1/draft-a/index.html', 'public/astra-heal-sparkle-r1/draft-a/heal-sparkle.js', '品質不合格・旧試作・未採用', '作者: GPT-6-Astra。履歴品質理由: Maintenance sparkle too weak; one receiver anchor near face. 後続r1に置換。', 'actor-H64'),
      version('heal-astra-prototype', 'Astra旧採用原版', 'heal-astra-preview.html', 'webgpu-heal-astra-prototype.js', '旧採用版・r1へ更新', '以前の採用原版として来歴を保持。現行採用版はユーザー指定のsparkle r1。原版の採用履歴は変えず、現在の版選択とは区別しています。', 'actor-H64', 0.7937)
    ]) }),
    Object.freeze({ id: 'sunbeam-astra', title: 'サンビーム', versions: Object.freeze([
      version('sunbeam-lens-ghost-r5', 'Astra lens-ghost r5', 'public/astra-sunbeam-lens-ghost-v1/versions/r5/index.html?embed=1&height=64', 'public/astra-sunbeam-lens-ghost-v1/versions/r5/sunbeam.js', '品質不合格・ユーザー未採用・本編未接続', '作者: GPT-6-Astra。凍結sourceで実WebGPU再生pass。品質理由: ghostはぼけた丸い粒子列に見え、主beamも細い白線＋橙縁に留まる。光学像と光束の厚みが未達で改稿。連続再生は外れ値を含み、完全な滑らかさは未受入。SFX聴感未実施、ユーザー未採用、本編未接続。', 'effect-H64'),
      version('sunbeam-lens-ghost-r4', 'Astra lens-ghost r4', 'public/astra-sunbeam-lens-ghost-v1/versions/r4/index.html?embed=1&height=64', 'public/astra-sunbeam-lens-ghost-v1/versions/r4/sunbeam.js', '品質不合格・ユーザー未採用・本編未接続', '作者: GPT-6-Astra。凍結sourceで実WebGPU再生pass。品質理由: 虹色Cが光源/beamから孤立した記号に見え、横長veilも第二の光束に読める。時間構造には改善があったが全体品質未達。連続再生は外れ値を含み、完全な滑らかさは未受入。SFX聴感未実施、ユーザー未採用、本編未接続。', 'effect-H64'),
      version('sunbeam-lens-ghost-r3', 'Astra lens-ghost r3', 'public/astra-sunbeam-lens-ghost-v1/versions/r3/index.html?embed=1&height=64', 'public/astra-sunbeam-lens-ghost-v1/versions/r3/sunbeam.js', '品質不合格・ユーザー未採用・本編未接続', '作者: GPT-6-Astra。凍結sourceで実WebGPU再生pass。品質理由: 時点を変えても主形がほぼ同じで、時間状態が読み分けにくい。虹Cと焦点外円が孤立し、source peakと同期したveilも不足。SFX聴感未実施、ユーザー未採用、本編未接続。', 'effect-H64'),
      version('sunbeam-lens-ghost-r2', 'Astra lens-ghost r2', 'public/astra-sunbeam-lens-ghost-v1/versions/r2/index.html?embed=1&height=64', 'public/astra-sunbeam-lens-ghost-v1/versions/r2/sunbeam.js', '品質不合格・ユーザー未採用・本編未接続', '作者: GPT-6-Astra。凍結sourceで実WebGPU再生pass。品質理由: 虹色円弧が独立した括弧の列に見え、主beamは細線状で体積と作用の厚みが弱い。連続再生は外れ値を含み、SFX聴感未実施、ユーザー未採用、本編未接続。', 'effect-H64'),
      version('sunbeam-lens-ghost-r1', 'Astra lens-ghost r1', 'public/astra-sunbeam-lens-ghost-v1/versions/r1/index.html?embed=1&height=64', 'public/astra-sunbeam-lens-ghost-v1/versions/r1/sunbeam.js', '品質不合格・ユーザー未採用・本編未接続', '作者: GPT-6-Astra。凍結sourceで実WebGPU再生pass。品質理由: 六つの類似輪郭が独立した図形の羅列に見え、結像系全体の応答が成立していない。連続再生の最大gapは暗108.2ms/明124.6msで原因未確定。SFX聴感未実施、ユーザー未採用、本編未接続。', 'effect-H64'),
      version('sunbeam-astra-clean-v3', 'Astra v3', 'sunbeam-astra-clean-v3-preview.html', 'webgpu-sunbeam-astra-clean-v3.js', '品質保留・再改修中・ユーザー採用保留・本編未採用', '以前の視覚採用判断は保留され、品質改修中です。再審査が終わるまでユーザー採用と本編接続は承認されていません。', 'effect-H64'),
      version('sunbeam-astra-clean-v2', 'Astra v2', 'sunbeam-astra-clean-v2-preview.html', 'webgpu-sunbeam-astra-clean-v2.js', '試作・品質未受入・本編未採用', '履歴上WebGPU再生可能。品質受入前の試作です。', 'effect-H64'),
      version('sunbeam-astra-clean-v1', 'Astra v1', 'sunbeam-astra-clean-v1-preview.html', 'webgpu-sunbeam-astra-clean-v1.js', '試作・品質未受入・本編未採用', '履歴上WebGPU再生可能。品質受入前の試作です。', 'effect-H64')
    ]) }),
    Object.freeze({ id: 'luck-astra', title: '幸運', defaultVersionId: 'luck-astra-zero-r03', versions: Object.freeze([
      version('luck-astra-zero-r09', 'Astra ゼロ設計 r09', 'public/astra-luck-zero-v1/versions/r09/index.html?embed=1&height=64', 'public/astra-luck-zero-v1/versions/r09/luck-zero-r09.js', '品質不合格・未採用・本編未接続', '作者: GPT-6-Astra（設計・実装）。GPT-6-Lunaは採用済み受益者spriteの読み取りを監査。実WebGPU standalone再生pass、H64・3 cycle。品質理由: Star-OFFでも明るい金色のpod/banana状の物体に見え、接触後は主に衣装が金色へ変わる。体積と伝達がH64/H160で読めず、Star-ONも改善しない。記録理由: “H64 stars OFF main form reads as a luminous golden pod/banana object, not a favorable optical phenomenon.” “One closed volume removes the three persistent ribbons and is visibly consumed during contact, but the recipient response reads predominantly as broad golden garment recoloring.” 性能は記録runで連続性pass（RAF P95 18.2ms、最大18.5ms）。SFX聴感未実施、非採用、本編未接続。', 'actor-H64'),
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
    Object.freeze({ id: 'mana-astra', title: 'マナ', versions: Object.freeze([
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
      version('mana-astra-v5-pilot', 'Astra v5 pilot', 'webgpu-mana-astra-v5-pilot.html', 'webgpu-mana-astra-v5-pilot.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-clean-v4-pilot', 'Astra clean v4 pilot', 'mana-astra-clean-v4-pilot.html', 'webgpu-mana-astra-clean-v4-pilot.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-clean-v3', 'Astra clean v3', 'mana-astra-clean-v3-preview.html', 'webgpu-mana-astra-clean-v3.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-clean-v2', 'Astra clean v2', 'mana-astra-clean-v2-preview.html', 'webgpu-mana-astra-clean-v2.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-clean-v1', 'Astra clean v1', 'mana-astra-clean-v1-preview.html', 'webgpu-mana-astra-clean-v1.js', '品質未審査・本編未採用', '技術プレビュー。品質判定記録なし。'),
      version('mana-astra-zero-v1', 'Astra zero v1', 'webgpu-mana-astra-zero-preview.html', 'webgpu-mana-astra-zero-preview.js', '試作・品質未達・本編未採用', '履歴上WebGPU自動ループ再生済み。形状、滑らかさ、SFXが品質未達。')
    ]) }),
    Object.freeze({ id: 'stamina-astra', title: 'スタミナ', versions: Object.freeze([      version('stamina-astra-clean-v3', 'Astra clean v3', 'stamina-astra-clean-v3-preview.html', 'webgpu-stamina-astra-clean-v3.js', '品質不採用・本編未採用', 'H64で扇形の光片から胸腹の発光ベストへ変わるが、スタミナ補給として読めず品質不採用。'),
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
    Object.freeze({ id: 'status-cleanse-astra', title: '状態異常回復', defaultVersionId: 'status-cleanse-astra-r29', versions: Object.freeze([
      version('status-cleanse-astra-r37', 'Astra r0.37', 'public/astra-status-cleanse-v1/versions/r37/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r37/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: H64 Star-OFFで核が腕横の小さな光る石/ダイヤ装飾に見え、縮小しながら身体が光る。面の作用と回復伝達が読めず、pickup/equipment誤読条件に該当。WebGPU技術再生pass・3 loop・754 GPU submissions。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r36', 'Astra r0.36', 'public/astra-status-cleanse-v1/versions/r36/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r36/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: 始点・下降・受け渡しは改善し外部重心移動45.72pxを計測したが、主形はぼけた横発光帯から小さな光る台へ変わり、正の回復媒体として識別できない。WebGPU技術再生pass・3 loop・761 GPU submissions。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r35', 'Astra r0.35', 'public/astra-status-cleanse-v1/versions/r35/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r35/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: Star-OFFで胸からの放射は広がるが、中盤は汎用的な全身白光と太い輪郭haloとなり、終盤ピークも開始/進行/完了の差を作れない。Star-ONも救済せず。WebGPU技術再生pass・3 loop・2186 GPU submissions。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r34', 'Astra r0.34', 'public/astra-status-cleanse-v1/versions/r34/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r34/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: 遅い全身ピークは明確になったが、初期受領が弱く、中盤は左右/足の順次glintが中心で身体へ広く回復が作用する形にならない。WebGPU技術再生pass・3 loop・448 GPU submissions。連続再生は外れ値懸念あり。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r33', 'Astra r0.33', 'public/astra-status-cleanse-v1/versions/r33/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r33/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: 主光学場がspriteと重なって隠れ、H64で弱い短い外部光線だけが残る。中盤以降は似た全身radianceと小glintで、開始・伝播・完了の構造が読めない。WebGPU技術再生pass・3 loop・456 GPU submissions。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r32', 'Astra r0.32', 'public/astra-status-cleanse-v1/versions/r32/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r32/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: 外部volumeがH64で肩横の小さな丸い光へ縮み、接触しても形が身体へ移らない。続く表面反応は白い衣服照明とglintに見え、回復の伝播が成立しない。WebGPU技術再生pass・3 loop・435 GPU submissions。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r31', 'Astra r0.31', 'public/astra-status-cleanse-v1/versions/r31/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r31/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: H64の外向きfieldは小さな手/足jetや推進に見え、受け手の胴体も同様の明るいpatchに留まるため、正の回復反応を示せない。全sparkleはE-wide 22.5/112.5°。WebGPU技術再生pass・3 loop・466 GPU submissions。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r30', 'Astra r0.30', 'public/astra-status-cleanse-v1/versions/r30/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r30/cleanse.mjs', '品質不合格・本編未採用', '作者: GPT-6-Astra。凍結記録: 光路がactorのalpha/白い衣服に隠れて小さな肩U/リボンと細い飾りだけが残り、H64で回復方向が読めない。WebGPU技術再生pass・3 loop・408 GPU submissions。SFX聴感未実施・性能未計測・ユーザー未採用・本編未接続。', 'actor-H64'),
      version('status-cleanse-astra-r29', 'Astra r0.29', 'public/astra-status-cleanse-v1/versions/r29/index.html?embed=1&h=64', 'public/astra-status-cleanse-v1/versions/r29/cleanse.mjs', 'ユーザー採用済み・本編採用待ち', '作者: GPT-6-Astra。品質保留: Primary H64 review: stronger visible action than r28, but phases .32-.77 remain similar white luminous blobs on the body front; different recovery regions are insufficiently distinct. Requires new entry/direction/completion design. 後続のユーザー指示でr0.29を採用し、この旧品質判断は履歴として保持します。追加の創作改稿は求められていません。本編接続・発動検証は未完了です。', 'actor-H64'),
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
    Object.freeze({ id: 'cooldown-astra', title: '待機時間短縮 · Astra履歴', versions: Object.freeze([
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
  let currentCategory = 'effect';
  let currentAdoptionFilter = 'unadopted';
  const selections = new Map();
  const adoptedVersionIds = new Set(['heal-astra-sparkle-r1','luck-astra-zero-r03','emp-astra-v1.8','status-cleanse-astra-r29','barrier-pro-r07']);
  const categoryTabs = [...document.querySelectorAll('[data-category]')];
  const layout = document.getElementById('gallery-layout');
  const emptyCategory = document.getElementById('empty-category');
  let previewStatusPoll = null;
  const defaultVersionIndex = entry => Math.max(0, entry.versions.findIndex(item => item.id === entry.defaultVersionId));
  let buttons = [];
  function adoptionState(item) {
    if (item.adoption) return item.adoption;
    if (adoptedVersionIds.has(item.id)) return 'adopted';
    if (/未採用|却下|撤回/.test(item.status || '')) return 'not-adopted';
    return 'unknown';
  }
  function visibleVersionIndices(group) {
    return group.versions.map((item, i) => ({item, i})).filter(({item}) => currentAdoptionFilter === 'adopted' ? adoptionState(item) === 'adopted' : adoptionState(item) !== 'adopted').map(x => x.i);
  }
  function setHeadline() {
    document.getElementById('list-heading').textContent = `${currentAdoptionFilter === 'adopted' ? '採用済み' : '未採用'}の${currentCategory === 'effect' ? 'エフェクト' : currentCategory === 'motion' ? 'モーション' : 'マップ'}一覧`;
  }
  function makePreview(item) {
    const preview = new URL(item.page, location.href);
    preview.searchParams.set('galleryRelease', 'astra-history-20260929-v85');
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
    selectedIndex = (index + entries.length) % entries.length;
    const group = entries[selectedIndex];
    selectedVersionIndex = Math.min(versionIndex, group.versions.length - 1);
    const item = group.versions[selectedVersionIndex];
    document.getElementById('selected-title').textContent = `${group.title} · ${item.title}`;
    document.getElementById('selected-description').textContent = item.detail;
    document.getElementById('selected-status').textContent = item.status;
    document.getElementById('selected-source').textContent = `WebGPU: ${item.source}`;
    const shownVersions = visibleVersionIndices(group);
    versionSelect.replaceChildren(...shownVersions.map((originalIndex, i) => {
      const v = group.versions[originalIndex]; const option = document.createElement('option'); option.value = String(i);
      const state = adoptionState(v);
      option.textContent = `${v.title} — ${state === 'unknown' ? '採用状態不明' : state === 'adopted' ? '採用済み' : '未採用'}`; return option;
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
  const exposedEntries = entries.map(group => Object.freeze({ id: group.id,
      title: group.title,
      category: 'effect',
      latest: group.versions[0].id, defaultVersionId: group.defaultVersionId || group.versions[0].id,
      versions: Object.freeze(group.versions.map(item => Object.freeze({ ...item,
        category: 'effect',
        creatorModelId: item.id === 'barrier-pro-r07' ? 'chatgpt-pro' : 'gpt-6-astra',
        creatorDisplayName: item.id === 'barrier-pro-r07' ? 'GPT Pro' : 'GPT-6-Astra',
        qualityStatus: /不合格|不達|未達/.test(item.status) ? 'fail' : /保留|未受入/.test(item.status) ? 'pending' : 'candidate',
        userAdoptionStatus: adoptionState(item),
        gameIntegrationStatus: /本編接続済み/.test(item.status) ? 'verified' : /本編未接続|本編未採用/.test(item.status) ? 'not-integrated' : 'unverified',
        previewKind: 'webgpu', technicalReplayStatus: item.replayable ? 'listed-existing-replay-contract' : 'unavailable'
      }))) }));
  window.__webgpuEGallery = Object.freeze({ presentation: PRESENTATION, categories: Object.freeze(['motion','map','effect']),
    entries: Object.freeze(exposedEntries) });
  const imageGroups = [
    { id:'sophia-taser-reload', category:'motion', title:'Sophia · Taser reload', quality:'pending', adoption:'unknown', integration:'unverified', reason:'v860候補名。scoped source/runtime acceptanceはあるがreal-screen verificationはsuspended。ユーザー採用は不明。', versions:[
      {id:'sophia-taser-reload-v860-candidate-front',title:'v860 candidate · front',src:'assets/sophia-taser-reload-front-v860-candidate.png',hash:'3f095e192acc77d1344af09cbdb6903f03537cef44f2aa93c2fe7d14c1daec8b'},
      {id:'sophia-taser-reload-v860-candidate-back',title:'v860 candidate · back',src:'assets/sophia-taser-reload-back-v860-candidate.png',hash:'19cc211b7387c08b57aa1dbb39706f41c24f06941d9a2342a8af610bf092583e'},
      {id:'sophia-taser-reload-v860-candidate-left',title:'v860 candidate · left',src:'assets/sophia-taser-reload-left-v860-candidate.png',hash:'3cc0b133e66aa7aa64676420599ed9abcf4d05607da79612d33cbc596d256ad9'},
      {id:'sophia-taser-reload-v860-candidate-right',title:'v860 candidate · right',src:'assets/sophia-taser-reload-right-v860-candidate.png',hash:'2d020aed7edbbc19f6c6af699c43c8af6971645ef3e6a08cd60ce819e63863e2'}]},
    { id:'sophia-side-dash-astra', category:'motion', title:'Sophia · Side dash · GPT-6-Astra', quality:'version-specific', adoption:'not_adopted', integration:'not_integrated', reason:'Astra原画。ゲームサイズ表示・サイクル再生・登録位置は未検証。各版の品質判定と採用状態を版ごとに表示します。', versions:[
      {id:'sophia-side-dash-astra-right-r01',title:'right-r01',src:'assets/sophia-side-dash-right-r01-original.png',hash:'a0bd516867b6c19608e46efd2e9f35f31943edce50a23038d8d697f53fbcda0a',qualityStatus:'rejected',adoption:'not_adopted',note:'後ろ側の青いオーバースカートの白い段が複数見える。最初の3コマは腕の振りが不十分に交互化。'},
      {id:'sophia-side-dash-astra-right-r02-contact',title:'right-r02-contact',src:'assets/sophia-side-dash-right-r02-contact-original.png',hash:'526192cc3e8732d4e2dc91494dfa60b957b64e1dc6fcc92d3a00e6446ca67c25',qualityStatus:'candidate_pending_acceptance',adoption:'not_adopted',note:'左右の接地方向と足2本、腕のシルエットは確認済み。接地途中の半歩のみで、完全サイクルや描画移動は未受入。'},
      {id:'sophia-side-dash-astra-left-r01-contact',title:'left-r01-contact',src:'assets/sophia-side-dash-left-r01-contact-original.png',hash:'e0a9ba2a036cd693cc5a5ee1a09e184a9bdca2cb361d9cf581f625441a9e65e0',qualityStatus:'candidate_pending_acceptance',adoption:'not_adopted',note:'左向き・足2本・腕のシルエットは確認済み。接地途中の半歩のみで、完全サイクルや描画移動は未受入。'},
      {id:'sophia-side-dash-astra-right-r02-passing',title:'right-r02-passing',src:'assets/sophia-side-dash-right-r02-passing-original.png',hash:'9e58be87334f27e9f0fcb2d266b67aece351e14283ca8e31bcec3ed07895f35b',qualityStatus:'rejected',adoption:'not_adopted',note:'足の間隔が広く、依頼されたコンパクトな通過姿勢が成立していない。プレビューで見えた背景光はalpha=0のRGB値が原因の可能性があり、合成QA未了。'}]},
    { id:'cafeteria-astra', category:'map', title:'Cafeteria · Astra prototype', quality:'revision_required / prototype_unaccepted', adoption:'not-adopted', integration:'not-integrated', reason:'r2で遠近と椅子間隔は改善。椅子とテーブルの間隔は基準64px未満。原本は1305×1206 RGBで930×860 RGBAとは異なる。', versions:[
      {id:'cafeteria-astra-r2',title:'Astra r2 · prototype',src:'assets/cafeteria-astra-r2.original.png',hash:'748256cd57d5861ad781b52a05f6a66ce81e04e7d391457f45f11901d6cf3a9d'},
      {id:'cafeteria-astra-r1',title:'Astra r1 · prototype',src:'assets/cafeteria-astra-r1.original.png',hash:'e67db7bc568c750ac1bb5d6700d12444f203d10acb708c4b222cb22240663640'}]}
  ];
  function selectImage(group, versionIndex) {
    const item=group.versions[versionIndex];
    stage.querySelector('iframe')?.remove(); stage.querySelector('img')?.remove();
    if (previewStatusPoll !== null) window.clearInterval(previewStatusPoll); previewStatusPoll=null;
    notice.hidden=true; const img=document.createElement('img'); img.alt=group.title+' '+item.title; img.src=item.src; img.dataset.sha256=item.hash;
    img.addEventListener('error',()=>{notice.textContent='画像原本を読み込めませんでした';notice.hidden=false;}); stage.append(img);
    document.getElementById('selected-title').textContent=group.title+' · '+item.title;
    const quality=item.qualityStatus||group.quality;
    const adoption=item.adoption==='unknown'?'unknown':item.adoption==='not_adopted'?'not_adopted':item.adoption==='adopted'?'adopted':group.adoption;
    document.getElementById('selected-description').textContent='作者: GPT-6-Astra。版: '+item.id+'。品質状態: '+quality+'。採用状態: '+(adoption==='unknown'?'unknown':adoption)+'。本編接続: '+group.integration+'。'+(item.note||group.reason)+' 原本SHA-256: '+item.hash;
    document.getElementById('selected-status').textContent=quality+' · '+(adoption==='unknown'?'採用状態不明':adoption==='not_adopted'?'未採用':'採用済み')+' · '+group.integration;
    document.getElementById('selected-source').textContent='保存原本画像 · '+item.src;
    const link=document.getElementById('selected-link');link.href=item.src;link.textContent='原本画像を見る ↗';
    const visible=group.versions.map((v,i)=>({v,i})).filter(({v})=>currentAdoptionFilter==='adopted'?v.adoption==='adopted':v.adoption!=='adopted');
    versionSelect.replaceChildren(...visible.map(({v,i},n)=>{const o=document.createElement('option');o.value=String(n);o.textContent=v.title+' — '+(v.adoption==='unknown'?'採用状態不明':v.adoption==='adopted'?'採用済み':'未採用')+(v.qualityStatus?' · '+v.qualityStatus:'');o.dataset.versionId=v.id;return o;}));
    versionSelect.value=String(Math.max(0,visible.findIndex(x=>x.i===versionIndex)));versionSelect.disabled=visible.length<2;
    versionSelect.onchange=()=>selectImage(group,visible[Number(versionSelect.value)].i);
    buttons.forEach(b=>b.setAttribute('aria-current',b.dataset.id===group.id?'true':'false'));
    document.getElementById('entry-counter').textContent=imageGroups.filter(g=>g.category===group.category).length+' 群 · '+visible.length+' 版';
    selections.set(`${currentCategory}:${currentAdoptionFilter}`,{groupId:group.id,versionId:item.id});
  }
  function renderSelection() {
    setHeadline();
    categoryTabs.forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.category===currentCategory)));
    adoptionTabs.forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.filter===currentAdoptionFilter)));
    layout.hidden=false;emptyCategory.hidden=true;catalog.replaceChildren();buttons=[];
    const groups=currentCategory==='effect'?entries:imageGroups.filter(g=>g.category===currentCategory);
    const matching=groups.map(group=>({group,indices:visibleVersionIndices(group)})).filter(row=>row.indices.length);
    if(!matching.length){layout.hidden=true;emptyCategory.hidden=false;emptyCategory.textContent=`${document.getElementById('list-heading').textContent}はありません。`;document.getElementById('entry-counter').textContent='0 件';return;}
    for(const {group,indices} of matching){
      const b=document.createElement('button');b.type='button';b.className='item';b.dataset.id=group.id;
      const remembered=selections.get(`${currentCategory}:${currentAdoptionFilter}`);
      const preferred=remembered?.groupId===group.id?indices.find(i=>group.versions[i].id===remembered.versionId):undefined;
      const first=preferred??indices.find(i=>group.versions[i].id===group.defaultVersionId)??indices[0];
      const item=group.versions[first];const title=document.createElement('strong');title.textContent=group.title+' · '+item.title;
      const status=document.createElement('span');status.textContent=currentCategory==='effect'?`${adoptionState(item)==='unknown'?'採用状態不明':adoptionState(item)==='adopted'?'採用済み':'未採用'} · ${item.status}`:`${item.adoption==='unknown'?'採用状態不明':item.adoption==='adopted'?'採用済み':'未採用'} · ${item.qualityStatus||group.quality}`;
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
  categoryTabs.forEach(tab=>tab.addEventListener('click',()=>{currentCategory=tab.dataset.category;renderSelection();}));
  for(const group of imageGroups)for(const version of group.versions)version.adoption=group.adoption;
  renderSelection();})();
