# ガンナー照準ロック R3 — 面と発光縁の分離

現行 B `22d3fcfd617f42b1a967de767906204c0221ec64` の基底・拡張を全読し、ECodeImplementation 分岐で実装した。画像生成用 B-Expression の render_requested ではない。B の原本・blob と CRLF 作業コピーの hash は B-PINS.json に区別して保存した。

入力は既存 gunner-passive-aim の cause / playerId / targetId / variant / startedAt と 900ms の有効期間。照準対象の取得と確定を表示する。射撃、命中、Headshot、世界内レーザー、物体、粒子、ゲーム能力を追加しない。未採用 R2 の同一 shader の実ピーク画像では、四つの青い面がほぼ白い塊になっていた。拡大撮影なので実寸 H64 の品質合否は確定していないが、同一入力のコードで面と発光縁の占有を分ける改稿根拠にはなる。

## 構造と因果

世界内の新しい状態・媒質・物体はない。PhenomenonRegistry と PhenomenonBlock は空であり、PartitionPolicy の根拠は照準の display_condition のみで成立すること。物理的な光の移動や機械部品の移動と呼ばない。WorldCoordinates、CameraCoordinates、Gravity、WindCapsule、接触、質量・運動量・熱・電荷・粘性・表面張力・世界内反射は不適用。表示状態に架空の力や材質を付けない。fixture は診断用 silhouette で、ゲームキャラクターの物理受入ではない。world-to-screen の入力投影は本編所有者の別受入であり、この単体は論理 640×320px、x右・y下、vertexで y を一度反転する。

OBS1 acquisition-display：display_condition=同一有効 aim cause。四つの斜め台形面が半径68pxから42.426407pxへ 0–300ms に smoothstep 収束し、200–300ms に四つの L 面へ連続変形する。四象限の中心は (±30,±30)px、外側矩形は32×32px、内側角16×16pxを除き、腕幅16px・中央開口14pxを保持する。主形は面の収束→開口の確定で照準取得を読む。格子、文字、マイクロ粒子に意味を依存しない。中の標的を隠さず、四象限の数と対称性を保護する。

OBS1 face / lip / front は同じ source pass 内の異なる表示機能。面はコバルトブルーに確定し、境界から内部への depth により最大20%の面勾配を持つ。発光唇は境界内0.9pxを中心とする1.1px Gaussian支持、HDR色 (3.8,4.5,4.8)、315ms中心82ms幅の確認ピーク。同じ発光を面全体へ足さず、幅のある青面と明るい縁を空間的に分離する。確認前線は既存面だけに mask され、230–430msに折り返しなく radial coordinate76→24px を一度横断、215–260msに立ち上がり430–490msに終端する。前線は別の光源・空中光条ではない。明るい縁はピークの白を許可するが、青い面全域の白塊化を品質問題として審査する。

OBS2 display-scatter：OBS1 の HDR texture を入力にする、連続7×7 Gaussian PSF。±3sample、1.1×scale px間隔、exp(-dot(q,q)/5.2)の正規化、加算係数0.58。camera lens ghost・世界内照明ではなく既存表示光に対する局所にじみ。observer-off で direct source は残り、source-off・失効で source と scatter はゼロ。独立の丸・輪・複像を作らず、同一発光予算を使う。既存 observer shader は byte exact 保持。

OBS3 display-output：暗いfixture基底＋OBS1＋OBS2を linear RGB で合成し、既存 sRGB encode、opaque最終出力。source texture は HDR、coverageは境界 mask、発光量とcoverageは別の量。source pass は既存実装の straight RGB radiance、mask乗算一回。直接光に blanket limiter、背景別減光、tone clippingによる設計変更は加えない。表示 target の飽和は既存経路に残るため、強光に対する実表示の白領域・青面・にじみを Root が審査する。

観測依存は OBS2→OBS1、OBS3→OBS1/OBS2 で非循環。source condition が OBS1 の入力で、処理順は source→scatter→output。world VFX は存在しないので VFX 章の world層を捏造しない。拡張 PostEffects は ordinary_posteffects=false、attribute_resolved、local display-scatter 一操作のみ。SPCA は世界内PHピークがないため不適用。Magic、Keyword f/v/o、BeautifulPose、ReflectionClosure は新たに起動しない。青面の勾配は OBS1 の表示状態アンカーであり物体温度ではない。

## 時間・光量・音

同一単調時計を使う既存 runtime の 900ms cause。0–85ms立ち上がり、315ms確認ピーク、430–670ms保持、670–900ms解除、900msから非発光。LDM はこの宣言した envelope のみで、micro_variation、点滅、露光積分、残像はなし。reduced motion の新規対応は本候補では実装していない。単体 API は一causeを置換し、旧音声を止める。複数同時発動の本編 acceptance は未実施。

SFX は同じ照準確定に結びつく短い電子 latch/tone（既存145ms PCM、210–355msの確定cue）。R1185 の同cause・generation・GPU完了・最新audio時計による offset と残音長・一回発音・hold/sourceoff/expiry/replacement/hidden/dispose/retire停止を byte exact 保持する。音を機械部品や世界内衝撃と呼ばない。本稿で新SFX創作は行っていない。verify は常時無音。通常音の聴感・端末自動再生は未確認。

SamplingContract：H64 ではscale1、H128では2。外形と16px面は主要cue、境界1.1pxは発光唇であり唯一の証拠にしない。描画 cadence は RAFの実時刻、自然動画は開始から900ms失効まで同cause/queue/device/target/submission receiptとPTSを結び、marker読みやすさを実際のtop-level撮影で確認する。暗明背景の actual support・本編投影・端末性能は未受入。

## 正本要件 → 実装 → 帰結 → 検証

| 要件 | 実装 | 観測すべき帰結 | 結果 |
|---|---|---|---|
|表示条件とPH/OBS分離|source.wgsl apertureShape / fs|世界内光・命中を作らず対象を囲む四面|コード読取、実画面はnot_run|
|主形・内部・境界差|source.wgsl acquire / confirmed / face / boundary|確認ピークでも青い面と白縁が分離|CPU式で改善、実GPU品質not_run|
|時間構造|source.wgsl scan / peak / release、runtime.mjs|収束・一回確認・保持・失効|CPU境界と既存時計保持、自然動画not_run|
|source-bound OBS|observer.wgsl|元光に連続にじみ、sourceoffゼロ・observeroff直接光保持|CPU PSF比較、実GPUnot_run|
|単一光量予算|source.wgsl + unchangedobserver|発光唇を残して広い青面、減光による代用なし|315ms CPU RGB flux1.75倍、実表示not_run|
|同causeSFX|audio.mjs + runtime.mjs|完了済み確定cueのみ一回・取消終了停止|既存production-handler CPU再実行、聴感not_run|
|版・依存・ギャラリー境界|META、startupversion、package-manifest、registrationpacket|R3を独立選択しR2履歴保持|構文/closure検査、親実起動/public未実施|

GlobalAcceptance：RenderObservation / nativeGPU / naturalFullLife / H64quality / H128quality / normalHearing / gameIntegration / galleryPublication は not_run。CPU結果は hypothesisの設計検査から先へ拡張しない。品質未採用・採用unknown。構造が整合しても美しさ・全寿命品質合格とは扱わない。
