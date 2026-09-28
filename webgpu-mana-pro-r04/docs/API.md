# 外部統合 API / r0.4

公開入口は `src/index.js` です。この入口は `preview/` をimportせず、自動ループ、資源加算、イベント購読、人物生成を行いません。実際の配線はホスト側で行います。旧版のAPI名と完全なバイナリ互換を約束せず、以下をr0.4の契約とします。

## 1. ManaGainLedger

生成時の必須値は `sessionId`, `getActorClock(actorPlayerId)`, `getBeneficiary(beneficiaryPlayerId)`。任意値は `audio`, `onDiagnostic`, `maxInstances=128`, `maxCauses=65536` です。

| メソッド／値 | 責務 |
|---|---|
| `commit(event)` | 権威による資源確定後の通知を受理。accepted / duplicate / suppressed / rejectedを返す |
| `update()` | 現在の身体・actor時計を読み、年齢更新と終了判定。コピー済みsnapshotを返す |
| `snapshot()` | 現在のVFX表示インスタンスのコピー。ゲーム資源ストアではない |
| `cancelBeneficiary(id,reason)` | 当該身体に属する全Eを削除。消費済み原因は保持 |
| `cancelActor(id,reason)` | 当該actor時計に依存する全Eを削除 |
| `resetSession(id)` | IDが変わるとE・音・原因台帳を破棄。同じIDなら無変更 |
| `dispose()` | Eと音を消し、新規通知を拒否 |
| `stats` | 受理／重複／拒否／抑止／期限切れ／取消し、音の要求・dispatch・skipの累計 |

`clear()` は内部の全台帳消去です。死亡や透明化に使わず、上記cancel系を使用してください。ホストは資源値を本Eから逆算したり、定着相で二度目の加算を行ったりしません。

### event

必須：`sessionId`, `eventId`, `beneficiaryPlayerId`, `actorPlayerId`（いずれも非空・最大256文字の文字列）、`committed:true`, 有限の `manaDelta>0`。

任意：`startedAtActorMs`, `durationMs`, `radiusPx`, `route`。寿命は既定1500 actor-ms、正値の900未満は900へ切り上げます。0・負・非有限値は拒否します。開始時刻は省略時に同原因の既存開始時刻、なければ現在actor時刻。負値・非有限値・未来は拒否します。半径は既定82 game px、有限正値だけを受け付けます。

`route='desire-refinement'` はこの共通獲得Eの対象外です。それ以外の経路で形・色を分岐しません。`committed` を信頼できるかはホストの権威層の責務であり、文字列やbooleanに認証能力があるとは主張しません。

### host clock

`getActorClock(actorPlayerId)` は `{timeMs,rate}`。timeMsは同一セッション内で単調・非負のactor-ms、rateは有限0～8。検査対象は0／1／2です。年齢は `timeMs-startActorMs` だけで求め、rateを再乗算しません。

音は次の時計通知までrateを使って進行します。ホストが一時停止する場合は、時間を固定するだけでなく **rate=0** を通知し、`update()` を呼んでください。

### host beneficiary

`getBeneficiary(id)` は `{x,y,heightPx,torsoPolygon,alive,present,inVent,invisible,angleRad?}`。

- x右・y下のgame px。rootはホストが決める共通局所原点。診断ボディは足元です。
- `torsoPolygon` は **その身体の受容領域を表す、局所game pxの凸多角形**。3～32個の `[x,y]`、周回順、重複頂点なし、非ゼロ面積が必要です。時計／反時計回りを許容します。
- ポリゴンは既に実寸です。heightPxで二重拡大しません。`angleRad` は局所座標の回転で、省略時0。受容領域を現在poseへ合わせる責務はホストにあります。
- 四つの可視状態はbooleanを明示します。形状欠落時に楕円マスクへ代替しません。無効なら通知は抑止されます。

複雑な非凸スキンや透過穴を一つの凸ポリゴンで正確に表現したとはしません。ホストが実際に可視な受容領域を提供し、必要な遮蔽を描画順／ホストマスクで検証します。後半の短い輪郭光は渡されたポリゴンの最初の辺を使います。診断fixtureでは上辺ですが、任意のホストではその辺が意味のある可視境界になるよう順序も確認してください。

## 2. ManaGainRenderer

`await ManaGainRenderer.create({device,presentationFormat,onDiagnostic})`。ホストGPUDeviceを借用し、disposeでもdeviceは破棄しません。presentationFormatは `bgra8unorm` または `rgba8unorm`。内部・ホストの合成先は **linear `rgba16float`**、最後に一回だけ表示エンコードします。

| 呼び出し | 前提 |
|---|---|
| `prepare(instances,view)` | 1受益者分。同一受益者の複数原因は可。内部形状＋bloomのパスを同じqueueへsubmit |
| `draw(pass,'back')` | 受益者を描く前のlinear HDR passへ有色本体＋放射を合成 |
| `draw(pass,'front')` | 受益者を描いた後、前景遮蔽物より前に合成 |
| `present(encoder,sceneView,outputView)` | 最終linear HDR sceneへ固定のhighlight shoulderとsRGB encodeを一回適用 |
| `invalidate()` | 準備済みの古いターゲットを描画不能にする |
| `dispose()` | 本rendererのtexture/bufferを解放 |

viewは `{width,height,scale=1,dpr=1,cameraX=0,cameraY=0,originX=width/2,originY=height/2,postEffects=true,debugLabels?}`。width/height/originはCSS px、cameraはgame px、scaleはCSS px/game px。物理バッファはwidth×dprです。debugLabelsは検査用の層フィルターで、正規の本番表現の自動省略規則ではありません。

同じrendererを別viewportでprepareしてから古いviewportをdrawしないでください。6画面は6renderer、原因台帳と音は1つです。**複数の受益者には受益者ごとのrenderer slotが必要**で、ホストのz順にback→body→frontを挿入します。遠側キャラのEを最後に全部まとめて前面描画する方式では正しい遮蔽になりません。

この参照実装は各slotにviewport全体の複数HDRターゲットを持ちます。多数人物の本番最適化やGPU所要時間は未検査です。実統合では小さな描画領域への分割、寿命中だけの割当て、ターゲット再利用等をホスト側で設計・検証してください。画面全体の大きなslotを人数分作るとメモリが増える点を省略しません。

中間色と放射はそれぞれ `rgba16float`。材質はpremultiplied source-over、放射はadd、alphaへの放射加算はしません。局所bloomは放射テクスチャだけを9tap×2方向で処理します。GPUSamplerはlinear min/mag、nearest mip、clamp XYZ、LOD 0、maxAnisotropy 1です。`src/sampler.js`（actor時相・geometry）と `GPUSampler`（GPU生成texture標本化）は別の役割です。外部画像テクスチャは使いません。

生涯途中のcancelではledgerのcancelに加えて対応rendererをinvalidateし、次のフレームを通常どおり再描画します。古いcanvasの画素そのものを保持するホスト実装は本Eでは直せません。`examples/host-integration.js` はこの呼び出し順の実行可能な骨格です。

## 3. ManaGainAudio

`new ManaGainAudio({context?,onDiagnostic?})`。独立のAudioContextを作るか、既存contextを借用できます。既存contextをdisposeで閉じません。このadapterとcause台帳は本E専用にしてください。

`unlock()` はユーザー操作から呼ぶ非同期メソッドです。`start({id,ageMs,durationMs,rate})`, `sync(...)`, `stop({id,reason})`, `clear()` がledgerとの契約です。`setGain(0..1)`, `setMuted(boolean)`, `dispose()` もあります。

startがtrueなのはメッセージをWorkletへdispatchしたことを表し、スピーカー出音・音声品質の証明ではありません。実processorの開始数・同時数は `workletStats`。初期解錠前／停止contextへの原因はskipし、後から再送しません。

同じ合成PCMをactor位置で読みます。2倍rateは半分のwall寿命と高いピッチになります。ピッチ保持の時間伸縮ではありません。停止rateは無音・位相保持。取消しはメッセージ時刻から4 audio-msのrelease。小さい同期差は6ms補正、大きい差は権威位置へ再配置して3ms復帰します。250ms以上時計通知が来ない場合の安全無音は、ホストが更新しない状態へのwatchdogであり新しい効果相ではありません。デバイス遅延は別途実機評価が必要です。

## 4. 最終配線

実DVAのイベント名・ID供給・時計・スキン・z順はホスト側で対応させます。r0.4は実ゲームへ接続しておらず、採用・接続の許可も出していません。原本WGSLのハッシュと実行時compilation reportを保持し、技術adapterでソースを変えた場合は別の検査対象として記録してください。
