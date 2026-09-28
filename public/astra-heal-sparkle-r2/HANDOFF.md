# Heal Astra sparkle r2

**品質候補・未採用。** Healの輸送リボン接線と胸の受領方向から、各光条の角度・長短を決めた独立版。全点固定の水平垂直を廃止。元採用Healの主形/SFX、r1の受領音、r1原本は不変。

- 再生: `index.html`。検証は必ず `?verify=1`、原本A/Bはさらに `&baseline=1`。H64既定、12秒loop、verifyは解除不能の無音。
- 設計: `design.md`。各点の数値原因: `evidence/anchor-angle-mapping.json`。
- 暗明のH64比較: `evidence/contact-dark.png`, `contact-light.png`。各セル上r2/下採用原本。
- 全寿命: `evidence/continuous-dark.webm`, `continuous-light.webm`。12.26秒、660/673フレーム。
- 原本保存: `evidence/immutable-input-sha256.json` と `contract-results.json`。r1のソース群および採用原本8ファイルSHAを確認。
- 69枚の実GPU画像、WGSL/ページ/GPUエラー0。34暗明A/Bの全RGBチャンネルで減光0。12秒終端はA/B byte一致。
- 音: `evidence/heal-sparkle-r2.wav`。12秒48kHz stereo、合成peak .188495、実OfflineAudioContext volume .9 peak .169646。開始/重複/途中開始/無効位相/破棄PASS。**実聴not_run**。
- 凍結: `package-files.json`（再生allowlist/SHA256）、`evidence/heal-astra-sparkle-r2-replay.zip`。各検証ソースもr2内に保存。

残る限界: 明背景の白い主光流と重なる光点は局所差が弱まる。元発光を下げず、外側の交差光条で方向が読めるためH64視覚候補とした。実聴、本編接続、多人数負荷、ユーザー採用は未完了。ギャラリー/ゲーム/スキル未変更。品質候補を採用済みに読み替えない。

検証route: 親担当の排他GPU枠、headless Chrome実WebGPU。すべてのURLにverify。所有browser/serverはfinallyで終了、両プロセスexit 0。所有一時資源なし。

モデル分担
- GPT-6-Astra 100% — r2題材別角度設計、WebGPU差分、数値/H64検証、凍結。旧版の歴史的作者帰属はmanifestに別記。
