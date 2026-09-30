# 食堂一室のE試作 — 制作前入力台帳

所有: `outputs/request-20260930/room-e-trial/` のみ。共有app・ギャラリー・Git・原画・旧試作を変更しない。実行環境は danger-full-access / approval never。創作担当は GPT-6.1-Sol high。採用原画上への新しい環境Eの付加であり、原画や新マップのゼロ生成ではない。

## 入力と来歴

- ユーザー指示: 一つの部屋に多様なWebGPU Eを追加して公開ギャラリーで提示する。画像を新規生成しない。公開統合はroot担当。
- 現行skill: asset-generation/SKILL.md・references/dva.md、dva-ate-maintainer/SKILL.md・references/e-design-quality.md、b-foundation-loader/SKILL.md、codex-full-access/SKILL.md。現在の規則でE創作はSol、画像制作とは別。
- 原画: `outputs/request-20260923/modern-station-map-design/one-room-prototype/attempt-04/room-cafeteria-original.png`。1305×1206、SHA256 `c1c1ea6ecb84b643b721760cece01914560093b1e67d5f222e720082af776a65`。原画はGPT Pro、旧manifestのimage-request観測UIは6 Pro、画像バックエンド版は未確認。新Eの作者へ原画作者を付け替えない。
- 公開正本: `https://player13579.github.io/webgpu-e-gallery.html` とその `asset-gallery.js`。web readerは取得不能だったが、CPU HTTP取得した原文を `inputs/public-asset-gallery.js` に保存し、443–444行のgroup/version/作者/採否と照合。公開bitmapもCPU HTTPで `inputs/public-cafeteria-attempt04.png` へ保存し、ローカル原本と同一SHAを確認した。ブラウザやGPUは未起動。
- 正規version `cafeteria-room-attempt-04` は2026-09-30ユーザー採用済み、quality `user-adopted-geometry-unresolved`、本編未接続。今回E版の品質・採否・本編接続を原画の採用から引き継がない。
- 原画manifestとSCALE-REVIEW.mdをread-onlyで確認。930×860の旧world縮尺、開口・設備配置の旧不合格を保持。今回の源は実画素上の設備にアンカーし、旧registered occupancyへ勝手に合わせない。衝突・開口修理・新マップ採用は本scope外。
- `view_image`で原画全体を目視。北/西開口、周壁の暖色灯、温菜ビュッフェ、右側飲料設備、南西ソファ、中央床模様を確認。熱状態・給湯動作は後述する試作上の選択で、実ゲームイベントや原画生成時の確定事実ではない。
- B正本: `player13579/B` `Codex-honoo`、commit `37eb4bdfe59f0dc075f9b4333b7d6af76b784a88`。authenticated ls-remote一致。base blob `8a908495ae1f9b7175e00384ab88c50e5c78bd43`、extension blob `0eda016558e426ff4142d850d26200b40fafd834`。同系列の前作時に全文読了した現行両文書を保持し、今回PH/OBS/PhysicalModel/全8領域/投影/LDM/Sampling/Keyword/レンズ条件を再照合した。B原本の創作例や他E表現を流用しない。
- 既読露出: この担当は過去Barrier・Mana・Clock等の自作設計/実装/失敗画像に接している。その履歴を「旧Eを一切知らない」と偽らない。今回、旧Eのshader/配色/時間表/SFXを制作入力として再読・複写せず、現行Bとこの食堂の実画素・新設計だけから環境Eを作る。汎用WebGPU/音声API知識は描画接続で使用可能。

## 決定済み条件と受入

bitmap byte不変。WebGPUのみ。source→局所媒体/床→観測応答を分離。原画上の灯・食品/給湯器に束縛し、床の既存描画を保持する。新Eは有限な試作episodeと明示した設備状態で再生し、実ゲーム状態を偽らない。VFX/SFX同時計、verify URLはgain0/context0。room本寸930×860/半寸465×430、設備close-upでも同じshaderを使う。主現象各単独/合成、全寿命、境界、source-off、OBS-off、bitmap-only差分、CPU有限値/支持領域、実GPUcompile/submitを分けて検証。技術passを視覚/聴感/採用へ読み替えない。

## Solに残る判断

同じ食堂内で反射・湯気・給湯の機構と形が異なって読めること。原画の豊かな光を覆わず、源・空間・物体境界を成立させること。有限な音の材質・同期を新設計すること。契約確定後のruntime接続・focused testsはLunaへ渡す。
