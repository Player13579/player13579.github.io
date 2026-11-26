# EMP producer 契約の限定修理候補

## 原因
公開オフライン producer は EMP 共振・相殺の sourceHalfSpan を出力しない。
描画 planner は事前の charge 履歴がない場合 null を返すため、途中参加や描画開始前に発生した共振を処理できない。

## 変更
移行正本 Player13579/windows-dva-migration の dva/server.js
blob 0543c22a46095a227ea13ab59e6c17e794249d34 にある端点距離/2の計算と serializer 転記だけを
公開ベース 1d07400a0a9e16e1a82e45f725b4e9787839b743 の4 bundleへ限定移植。
古い正本全体から再生成せず、無関係なゲーム変更を保持。
scripts/backport-offline-emp-contract.py は既知アンカーを厳密検査し全ファイル確認後に適用。再実行は変更なし。

## 検証
- 修正前: 新規9件中8失敗、1成功。
- 修正後: 新規9件成功、既存EMP関連3件成功、計12件成功。
- 正値5、明示zero、axis、resolved IDs、durationMs0、4bundle同一性、charge履歴なしplanner成功を確認。
- git diff --check 成功。
- Windows/本人PC不使用。GPU実画面未検証。性能未測定。

## 未完了・公開禁止条件
- 本番未変更。ローカル検証候補であり公開済みと扱わない。
- release token/キャッシュ切替は未実施。配信するなら新しいtokenとcache、index/runtime、main/workerの一致を検証する。
- 明示zeroのplanner拒否は別問題として残る。欠落をzeroに捏造しない。
- killAssets供給欠落とdriver通知寿命管理は別不具合。本修正では解決しない。
- 今回のWindows初期化例外そのものと一致したことは未確認。

## CPU native WebGPU 追加検証
Deno 2.9.8 + SwiftShaderで現行EMP moduleを無改変実行。
shader SHA256 e6eb0479556f11c8244814560aab0201c2781958a60414a4859f66225ba2236c。
WGSL diagnostics0、validation/uncaptured error0、draw1。
256x256読戻し非黒28484px、破棄後所有buffer0。
再現: VK_ICD_FILENAMES=/usr/lib/chromium/vk_swiftshader_icd.json deno run --unstable-webgpu --allow-read tests/emp-native-webgpu-probe.mjs
ICDパスはこのdotクラウド環境のもの。実ブラウザ/DOM/ゲーム全体/実機性能の合格ではない。
