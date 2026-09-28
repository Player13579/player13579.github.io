# ホスト接続契約

## 境界と責任

`src/index.mjs` が公開エントリー、`src/index.d.ts` が型契約です。実行に外部JavaScriptライブラリは不要です。ホストを変更するコードやネットワークへの利益付与要求は含みません。

`FacilityController.receive(raw)` の最初に、ホストが所有する `authenticateAndNormalize` を呼びます。この関数は、実際の認証済みサーバー成功経路で受信したものだけを正規化して返し、認証不能ならnull/例外を返します。`raw.authenticated=true` や `status=success` という自己申告だけを信用する実装にはしないでください。本ソースに未提供のサーバー署名方式を創作していません。

正規化結果は `status, objectId, type, effectKind, playerId, objectCausalId, capturedTime, worldOrigin:{x,y}` です。`capturedTime` は安全な整数の**サーバーミリ秒**です。秒/ミリ秒/文字列を桁数から推測しません。wireに効果量等の追加フィールドが存在する場合はホスト側でその整合も確認し、本コードの表示metadataを利益の事実確認に代用しないでください。

ターゲットA/BではobjectIdに対応するtype、effectKind、world originを厳密一致で確認します。playerIdはホストの既存プレイヤー台帳に存在することを求めます。同じ原因のfingerprintには7項目とoriginの両成分を含みます。

## 原因単位の排他

原因キーはJSON配列 `[serverEpoch, objectCausalId]` です。objectId/playerId/capturedTimeを変えて別原因に見せることはできません。同じ原因キーでfingerprintが変われば `causal_conflict` として棄却します。`serverEpoch` はサーバーが管理する安定した世界/セッション識別子で、クライアントのreloadやカメラ移動ごとに作り直してはいけません。

本番台帳は `IndexedDBCauseLedger.open()` です。readwrite transaction内の主キー `add` とcommitが一回性の線形化点です。transactionがcommitするまでVFX/音を発火しません。容量不足/台帳利用不能ではfail-closedにし、揮発メモリ台帳へ自動降格しません。`MemoryCauseLedger` は明示的な `allowMemoryLedger:true` を要する隔離テスト専用です。

期限切れreceiptも原因を消費して無表示/無音にします。再描画・polling・カメラ移動・音声resumeは `receive` を呼ぶ契機にしません。台帳をローカルcooldownの終了で削除しません。永続台帳の保管削除が必要な場合は、サーバーが古い原因を再送しないことを保証する別の保管境界が必要です。本納品はその境界を推測せず自動削除しません。

これは正常系の一回提示と、障害時の**at-most-once**契約です。永続claimの直後にページ/プロセスが停止した場合、音と画素の物理的出力まで原子的に保証することはできません。そのケースは再生欠落を許して再発火を防ぎます。あらゆるcrashでのexactly-once物理出力を実証したとは記録しません。

## generic facility SFXの置換

`installFacilityPresentation(host, controller)` は `host.replaceFacilityPresentation(handler)` を一度呼びます。このホスト関数は、**既存の表示/VFX/SFX用facility-success subscriberを原子的に解除・交換**し、復元/解除関数を返す契約です。サーバー経済状態の受信/適用ハンドラーは交換しません。

交換後の唯一のルーターは、A/Bの正常原因を専用SFXへ送り、A/Bをgenericへ渡しません。重複、失敗、期限切れ、専用SFXがmute/停止状態のケースも、genericへフォールバックしません。非対象の正常原因だけ `dispatchGeneric` を一度呼びます。`suppressGeneric:true` は呼出し元へ二重fallbackを禁止する結果です。

別の旧subscriberが残っている状態で、このAPIの返値だけを「排他的置換の証明」にしてはいけません。実DVAのsubscriber構造は未確認であり、本番の排他接続評価は `not_run` です。接続時には専用と旧genericの実発音カウンター/聴感を同じ原因IDで確認してください。

## 時計と遅延

ホストは単調な `monotonicMs()`、capturedTimeと同じepochの `serverNowMs()`、同期誤差上限 `uncertaintyMs()` を供給します。上限50msを超える/測定不能な時計はfail-closedです。50msは今回の表示契約の設計値であり、DVAの実測遅延ではありません。

`startMono = sampledMonotonic + capturedTime - sampledServerNow` を一度だけ保存します。認証・永続化にかかった時間も、実際に提示を始める時点のageへ反映されます。以後の同期補正やframe clock逆行で活動中のEを巻き戻しません。少量の未来時刻は最大50msまで待機し、それを超えるreceiptは棄却します。

1300ms遅延のEは1300ms相から参加し、残り900msで終わります。2300ms遅延は起動しません。SFXも同じageのPCM offsetから一度だけ再生し、音の残り時間がなければ無音で消費します。suspended AudioContextは自動resume/後日再生しません。

## 座標・受け手

DVAの受領座標はx右/y下として公開契約に固定しました。異なるwire軸/単位ならホストが明示変換してください。canonicalのmへの実換算は未確認なので、B設計では正の換算係数を記号で保持し、実装はHと投影比で相殺します。実actorの身長を2m等と仮定していません。

`getActorAnchor(playerId, now)` は同じplayerIdの実在位置、ホストの `heightWorld`、サンプル時刻を返します。250msを超えて離れたサンプル、ID違い、NaN/Infinityを棄却します。速度を推測せず、ホストが提供したサンプルへ追従します。欠落時は源だけを表示し、carrier/receiverを無効にします。欠落を「受け手に作用した」と読み替えません。後から座標が届いても寿命/音は再開しません。

画面外判定は源、受け手、曲線最大張出し、OBS減衰域を含む保守的な境界です。両者とも画面外ならGPUイベントbufferへ入れず、CPU側の期限は進めます。源が画面外でも受け手や経路が画面内なら表示対象です。画面外のイベント数によって可視GPU slotが奪われる固定枠は設けていません。実GPUのフレーム時間は未計測です。

## native WebGPUの接続

`NativeFacilityRenderer.create(canvas, options)` はハードウェアadapterを要求し、ソフトウェアadapter判定時は停止します。既存ホストからGPUDeviceを渡す場合、そのデバイスのハードウェア由来はホストの責任で記録します。

`render(frames, view, {beforeEffects})` は隔離canvas用で、同じWebGPU passにシーン→E→最終表示を描きます。`encodeToPass(pass, frames, view, options)` は既存ホストの同一GPUDevice・linear `rgba16float`・sampleCount=1のpassへEだけを描きます。後者を使うときはホストの最終tone transformを一回だけ使い、本Eのcompositorを二重適用しません。viewport/viewのwidth/heightを出力backing寸法に一致させてください。

合成はcoverageのpremultiplied alphaと放射の加算成分を分け、最後にsRGBへ符号化します。内部HDR textureは同じWebGPU内の作業attachmentで、外部のラスター素材ではありません。CPU readback、Canvas2D、WebGL、代替レンダラ、画像/WAV素材は不要です。背景を後からキャプチャしてEへ渡す経路もありません。

同時A/Bはそれぞれの専用pipelineへ分類し、A→Bの安定した提出順です。異なる原因を統合して一件にしたり、画面外Eを理由に可視Eを破棄したりしません。大規模な同時発生性能と複合画素の良否は実機検査が必要です。

## 音声と終了処理

`FacilityAudio` へは、通常mute/volumeの既存SFXフェーダーに入る `outputBus` を渡します。接続先は同じAudioContextに属する必要があります。`getMixState` はmute/ゼロ音量時の遅延再生を避けるための読取で、通常音量をここで二重乗算しません。

一つの原因に一つのAudioBufferSource、一回のstartだけを使います。A/Bの複合的な音色変化は、その一つの有限PCM内の構造です。同時N声は専用バス内で保守的に1/N混合します。同位相でも単音の数値上限を超えないようにし、声や原因を間引きません。この混合の聴感や音量感は未評価です。

解除時はsubscriberの解除関数を呼び、controllerをdisposeし、rendererをdestroyします。音声の専用バスを再利用しない場合はaudioのdisposeも呼び、台帳接続をcloseします。台帳データを削除しなければ、新しいcontrollerでも古い原因の再発火を防げます。device lossによってreceiveを再実行しないでください。
