# DVA 施設使用E — 独立2設計 / native WebGPU

**納品物は実行用ソースです。画像生成、ゲーム・公開サイト・ギャラリーへの変更は行っていません。**

A/BそれぞれのWGSL、時間関数、合成SFXを新規に作成しました。共有しているのはreceipt照合、原因台帳、投影、GPU提出、表示変換、音声の排他基盤です。既存E・前回施設Eの形状、色、音、時間関数、コードは取得・参照していません。

## 検証の現在地

`verification/static-report.json` はPro納品時の静的・数値検査記録です。JavaScript構文、公開型宣言、B構造/依存、receipt条件、時間/座標、PCM数値を検査しています。納品時点では**WGSLコンパイル、実GPUの画素・時間、H64の実可読性、聴感、実ゲームイベントとの接続は `not_run`** でした。

2026-09-28のCodex後続検査で、Windows Chrome WebGPUの両WGSLコンパイルと可視フレームは成立しました。しかし暗明H64原寸ではAが小さな弧・棒・山形輪郭、Bが三本線・三段矩形に留まり、各施設の起点から受け手への作用が読めず、**両版の視覚品質は不合格**です。支配原因は未確定。聴感と実ゲーム接続は未実施です。公開コピーのadapterと原本の区別は `PUBLIC-ADAPTER.md` を参照してください。

この作業環境のChromiumはlocalhostへの遷移を `ERR_BLOCKED_BY_ADMINISTRATOR` で拒否しました。ブラウザ起動/遷移の失敗をGPUや画質の失敗原因とは断定しません。実機用の検査ハーネスと観察記録フォームを同梱していますが、未観察の品質を合格にしていません。

B設計の最終状態は `specification_status: Warning`、`render_status: NotRun` です。静的検査が通っても、H64で起点・作用・結果が読めないもの、他施設の単なる色替えに見えるもの、glowや粒子で主形不足を隠すものは、実機評価で棄却する契約です。

## 対象

| 項目 | A | B |
|---|---|---|
| objectId | `v302-reactor-reactorGauge-1` | `v302-fabrication-recyclingUnit-2` |
| type / effectKind | `reactorGauge` / `luckBoost` | `recyclingUnit` / `credits` |
| 固定world origin | `(3699,388)` | `(4315,2102)` |
| ユーザー指定の利益 | `+0.15`、20秒 | `+3`、即時 |
| cooldown | 38秒 | 34秒 |
| Eの視覚寿命 | 2200ms | 2200ms |
| 一回のSFX長 | 1720ms | 1620ms |

利益/cooldownは識別用metadataのみです。クライアント側の加算、確率抽選、利益推定、buff失効、cooldownの再設定はありません。表示の受領相が後で成立しても、Bの即時加算を後ろへ移すものではありません。

## 起動

ビルド、npm install、CDN、外部素材は不要です。Node.js 20以上でZIPを展開したディレクトリから `node scripts/serve.mjs` を実行し、表示されたlocalhostの検査URLを開きます。既定URLは `http://127.0.0.1:8094/preview/index.html?verify=1` です。

`verify=1` はAudioContextも音声nodeも生成しません。通常の音を実機で確認する場合のみ `?verify=0` で開き、音声バスの有効化を押し、通常muteを解除して新しい合成receiptを投入します。すでに消費したreceiptはmute解除で再発音しません。

WebGPUのハードウェアadapterが得られない場合は停止します。Canvas 2D、WebGL、SwiftShader等への代替描画を実装していません。`file://` 直開きではshaderのfetchが動かない環境があるため、同梱のlocalhostサーバーを使います。

`npm run hashes` で開封時の全payloadを照合できます。`npm run verify` は無音で静的・ロジック・PCM数値検査を再実行します。再実行すると検証ログ/日時が更新されるため、その後のハッシュ差分は変更した検証ファイルにも発生します。元ZIPのハッシュ確認は再検査より先に行ってください。

## H64検査

ハーネスは704×320 backing pixel、CSS等倍です。H64はEの基準高とactor検査枠を64 backing pixelに固定する条件です。端末のDPR、ブラウザの拡大率、物理表示寸法は別の量です。ブラウザ100%表示と端末条件を観察記録に残してください。

暗/明背景、通常/2倍actor速度、通常/重複/1300ms遅延/2300ms遅延/画面外/受け手欠落の48条件を用意しました。位相スライダーは無音の検査専用であり、サーバーイベント経路へreceiptを再投入しません。`source-bound応答`を外すと、glowを使わない主形の確認ができます。

検査用の矩形は人体・既存施設のデザインを模写したものではありません。身体や装備を新たに描かず、worldの起点とH64の受け手境界を示すproxyです。実ゲームの背景/actorとの重なりは別途実機評価が必要です。

## 主要ファイル

- `src/effects/reactor/`、`src/effects/recycling/`: 各Eの独立したWGSL・時間関数・PCM合成。
- `src/runtime/`: receipt照合、原子的原因台帳、clock、投影、専用SFX。
- `src/gpu/`: native WebGPU提出、linear HDRと最終表示変換。
- `design/A.B-Expression-2.json`、`design/B.B-Expression-2.json`: 個別の完全PH構造、8領域、OBS、VFX層、共通時間、E実装参照。
- `docs/B-rule-mapping.json`、`.md`: 全123規則の条件・実装・期待帰結・検証限界。適用83規則。
- `docs/INTEGRATION.md`: ホスト接続の信頼境界、排他置換、単位/時間、終了処理。
- `verification/`: 実行ログ、PCM数値、48条件、未実施記録。
- `provenance/`: B正本commit/blobと取得範囲。`MANIFEST.json`、`SHA256SUMS`: 全payloadハッシュ。

## 本番接続の前提

実DVAのwire receipt schema、認証ハンドラー、既存generic SFXのsubscriberは取得していません。未知の引数名/transport証明を捏造せず、正規化済みreceiptの境界を公開APIにしました。実行可能なルーターと置換インターフェースはありますが、**実ゲームへ接続済み、既存SFXを本番で置換済みとは主張しません。**

本番側は認証済み成功receipt、同期時計、既存actor位置、通常mute/volumeのSFX入力バス、表示subscriberを原子的に一つに交換する関数を渡します。すでに別経路で発音したgeneric音を後から消すことはできません。接続詳細は `docs/INTEGRATION.md` を参照してください。
