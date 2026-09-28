# Heal Astra sparkle r1 handoff

品質候補・未採用。元版の主要光流と遮蔽を完全コピーで保持し、回復輸送に同期する十字光条と受領時の短い結晶音を追加した独立改修版。ゲーム・ギャラリー・採用メタデータ・Mana・元版は変更していない。

- entry: `index.html` (自動12秒loop、実sprite H64、音はブラウザーgesture後)
- 検証: `index.html?verify=1`。verify中は音を解除不能。
- 元版A/B: `index.html?verify=1&baseline=1`
- 固定位相: `index.html?verify=1&phase=0.74&background=light`
- H192: `index.html?verify=1&zoom=2.745602745602745`
- snapshot: `window.__healAstraSnapshot()`。back/actor/front、WGSL結果、audioのverify状態。
- 途中稿: `draft-a/index.html` と `draft-b/index.html`。未受入理由は各quality.json。元版入口はbaseline query。

`replay-manifest.json`が品質・作者・来歴、`package-files.json`が必要ファイルallowlistとSHA。`evidence/heal-astra-sparkle-r1-replay.zip`はこのallowlistのみを含む。B source・nested .git・検証ブラウザー・サーバー・大きな録画は公開packageへ含めない。

実GPU証拠: `evidence/contact-dark.png` / `contact-light.png`（各phase上=改修、下=元版）。`continuous-dark.webm` / `continuous-light.webm`は暗明それぞれ12秒全寿命A/B。`h192-peak.png`は補助。個々のH64画像も保存。

17位相×暗明×A/B=68枚、H192補助1枚、連続再生dark596/light566frames、WebGPU/page errors0。消失時12秒のPNGは元版とbyte一致。元版8ファイルSHA256不変。

性能: 主担当調整による他担当GPU試験停止枠で、H64/480×320/DPR1/headless Chrome、録画なし。改修frame median 18.00ms / p95 18.30ms、submit→queue completion median 5.90ms / p95 7.20ms。baseline側spikeがあるので高速化の根拠にはしない。無関係なOS/他アプリGPU負荷は排除していない。詳細はvalidation.jsonとevidence/performance.json。

音: 12秒48kHz stereo、合成peak 0.188495、RMS 0.030067。実OfflineAudioContextで開始/重複拒否/遅延/無効位相/破棄を確認。`evidence/heal-sparkle-r1.wav`を保存。実聴はnot_runなのでVFX/SFX完成受入を宣言しない。

残る限界: 明背景で星が元の白い主光条と重なる瞬間に局所差が弱まる。本編のsession権威・gameplay・多人数負荷は未接続/未試験。元版採用はこの改修版の採用を意味しない。

元版SHA:
- prototype: 8b233385b52d50d074d22b9ea5c7790b3bafde1ef62050b46d5e63a60c6606d6
- SFX: 3bd9c9b8d120488060bc1126bc2127a0d0f0a543578a29a63e38d84a55037808
- 4つの原本preview/renderer依存のSHAはevidence/contract-results.jsonおよびreplay-manifest.json。

モデル分担
- GPT-6-Astra 95% — 創作、WebGPU/SFX実装、H64判定、実検証、凍結。
- GPT-6-Luna 5% — 採用済み原本の独立した読取契約・依存・SHA監査。
