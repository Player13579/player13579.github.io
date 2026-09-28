# DVA — Original E Lab 0.1.0

二本の独立WebGPUプレビュー、独自WGSL、純粋sampler、actor-time処理、SFX合成ソースとWAV、B設計契約、検査資料を含む。**品質状態は prototype / 実GPU・実聴未承認**。本編接続・リポジトリへの書込み・旧Eの流用は行っていない。

## 起動

ZIPを展開し、Python 3がある環境で `START-Windows.bat` または `START-macOS-Linux.command` を起動する。ターミナルでは `python3 tools/serve.py`（Windowsでは `py -3 tools/serve.py`）。ローカルサーバーとブラウザーが開く。

自動で開かない場合は、端末に表示された `http://127.0.0.1:8765/index.html` を開く。file://で直接HTMLを開く方式ではない。ポートが使用中なら `python3 tools/serve.py --port 8766`。停止はCtrl+C。

実行時のnpm installや外部CDNは不要。WebGPUとAudioWorkletを利用できるブラウザー環境が必要。GPUが利用できなければエラーを表示し、Canvas2Dや静止画像で成功を偽装しない。

## ギャラリー

`index.html`には独立した二つのiframeを配置。各プレビューは別のactor時計、台帳、GPU device、音声グラフを持つ。個別ページでも単独実行できる。

音は各ページの「音を有効にする」で開始。初期は無音。明暗背景、actor H64、E全包絡H64、2×観察、actor速度、停止、スクラブ、三原因重複、同原因再送、900 ms遅着、提出前遅延0/180/900/1400 msを切り替えられる。

通常の自動ループは試験イベントの繰返しであって、ゲームの30秒パッシブ判定や4秒準備期限ではない。targetIdの空／非空は造形・SFXを変更しない。

## 内容

| 区分 | 内容 |
|---|---|
| 独立プレビュー | `action-rational-free.html`、`action-ninjutsu-focus.html` |
| 描画 | `shaders/effects.wgsl`、`src/gpu.mjs`。画像texture／Canvas2Dなし |
| 時刻・受信 | `src/contract.mjs`、`src/actor-clock.mjs`、`src/e-player.mjs` |
| 純粋sampler | `src/sampler.mjs`。target位置・権威判定に依存しない |
| SFX | `src/sfx-synth.mjs`、`src/sfx-worklet.mjs`、`src/audio.mjs`、`sfx/*.wav` |
| 設計 | `design/design-contract.md`、二つの`B-Expression-2.json`、規則対応表 |
| 検査 | `tests/`、`evidence/validation-report.json`、CPU参照像・PCM記録 |
| 来歴 | `provenance/source-revision.json`。Bのcommit/blobを固定 |
| 完全性 | `SHA256SUMS`、`manifest.json`、`tools/manifest.py` |

PNGはCPU検査資料だけであり、プレビュー・shaderの入力素材ではない。E用の画像ファイルはロードしない。

## 再検査

Node 18以降で `npm test` または `node --test tests/*.test.mjs`。WAV再生成は `node tools/export-sfx.mjs`。sampler資料は `node tools/export-samples.mjs`。

CPU参照の再生成にはPythonのNumPyとPillowが必要。`python3 tests/cpu_reference.py`。これらはCPU検査用の追加依存で、WebGPUプレビューの実行には不要。

Bローカル構造監査は `python3 tools/validate_local.py`。正本Bの同梱検証器を実行したと偽るものではない。

実GPU検査はローカルサーバー上の `tests/gpu-harness.html` を開き「検査開始」。レポートを書き出せる。GPUで成功しても主観品質・実聴・実ゲーム接続が自動合格になるわけではない。

完全性検査は `python3 tools/manifest.py --verify`。再生成でファイルを変更した場合、元配布manifestとは一致しなくなる。更新版のmanifest作成は同スクリプトの引数なし実行。

## 未実施・限界

実GPUのWGSLコンパイル、実デバイスの画素／提示時刻、実機の長時間動作、スピーカー／ヘッドホンでの実聴、DVA本編のイベントfield・人物maskとの照合は未実施。実GPU試験を開始できなかった理由は `evidence/gpu-attempt.json` に記録。

取得できたDVA本体情報はcommit/treeのメタデータまで。今回の公開入力境界が現行app.jsの内部field名そのままだとは保証しない。正規イベント名、playerId、targetId、座標、actor開始時刻を保持する独立境界として実装した。本編adapterは作成していない。

両Eはゼロからの手続き設計だが、実GPU・実聴未観察のため完成品質・芸術的優越を宣言しない。ギャラリー登録情報 `gallery.json` もこの状態を維持する。
