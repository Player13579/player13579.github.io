# 検証記録と限界

`verification/static-report.json` が機械可読の集約、`verification/node-tests.tap` が最終テストの生ログです。実行した構文/ロジック/PCM検査と、未実行のshader compiler/GPU/画素/聴感を混ぜません。

## 実施したこと

JavaScriptは全.mjsの構文をNodeで検査しました。公開.d.tsはTypeScriptのstrict/declaration検査を行いました。receiptの7項目とoriginの照合、同じ原因の競合、100件同時の重複、異なるcontroller間の同じ台帳モデル、遅延・expired・未来・clock逆行・台帳失敗・受け手欠落・generic排他経路をテストしています。

48条件の全寿命をCPUの状態/投影関数でサンプルしました。これは**代替レンダラを使った画像比較ではありません**。背景パラメータを振ったロジック検査は、その背景上の実画素可読性を検査したことにはなりません。

PCMは8000/44100/48000/96000Hzで合成し、finite、相対振幅上限、RMS、始点/終点を数値確認しました。実際のAudioContext出力やスピーカーを聴いた記録ではありません。音量感、立体感、generic音との差、端末での歪みはnot_runです。

Bのプロジェクト固有チェッカーは、全PHの完全構造、8領域、identity/registry、PH/OBSのリンク、観測DAG、WindCapsule/Gravity、VFX層分離、timeline、未観察状態を確認します。正本リポジトリに同梱された検証器を実行したとは主張しません。各domain名があることを実在物理の実証とも呼びません。

## 未実施・失敗

- Chromiumでのlocalhost遷移は `ERR_BLOCKED_BY_ADMINISTRATOR` でfailed。実行ログは `verification/browser-check.json`。
- WGSLコンパイル、実GPUへの描画提出、GPU画素/実フレーム時間、H64原寸の視覚検査: not_run。
- ブラウザIndexedDBの実transaction/タブ競合テスト: 起動不能によりnot_run。NodeのMemory台帳モデルとは区別。
- verify時AudioContext生成ゼロの実ブラウザ検査: 起動不能によりnot_run。Nodeの禁止アクセスproxyテストは実施。
- 実音出し/聴感、実ゲームの認証receipt/subscriber/SFX置換: not_run。

これらを空欄のPassに置換していません。GPUが動かない原因、shaderが正しいか、画素が美しいかをブラウザ遷移失敗から断定しません。

## 実機用の観察計画

H64・CSS等倍・ブラウザ100%と端末条件を記録し、暗明背景、通常/2倍actor速度、全48条件を検査します。特に開始0–400ms、輸送中、Aの受領立上り、Bの各区画の到達/立上り、最後の300msを見落とさないようにします。

glow on/off、reduced motion、同時A/B、sourceのみ画面外、画面外から途中復帰、mute/音量変更、AudioContext停止/復帰、device lossを追加します。各条件を最低3回、A/Bの順を交替して観察する計画です。実機結果がないので、ばらつきや改善率は計算していません。

画素の取得にGPU readbackやスクリーンショット自動生成を使う機能はありません。ハーネス上の実表示を観察し、評価者・条件・実在する証拠参照・問題を記録します。`framesSubmitted` はqueueへ提出した回数にすぎず、画素合格のスイッチではありません。

## 最初の棄却/修正記録

最初のNode実行は94件中93件pass、1件failでした。Aの受領終端値に `1.0000000000000013` が現れ、厳密な1というテストを満たしませんでした。`verification/node-tests.initial.tap` が証拠です。

Aの5次補間を出力側でも[0,1]に拘束し、JS/WGSLの対応式を修正しました。丸めに関する問題はCPU数値で観察したもので、同じ症状がGPUの画素に出たという記録ではありません。修正後に全テストを再実行しています。前回施設Eの造形や失敗原因をこの記録へ混ぜていません。

## 最終WGSL静的照合

W3C WGSL §16.2の予約語照合で、B shaderのローカル変数 `target` を発見し、`destination` へ改名しました。12個の関連予約語についてコメント外の字句回帰テストを追加しました。これは完全なWGSLパーサー、型検査器、shader compilerの代替ではありません。圧縮発光包絡の二乗も `pow` ではなく明示乗算へ置換し、負の微小丸め値に対する非整数冪関数の定義域へ依存しない式にしました。変更後の実GPU挙動はnot_runです。
