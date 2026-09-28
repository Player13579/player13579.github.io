# ホスト契約 / ゲーム導入は別作業

このZIPはローカルで動くギャラリー候補です。ゲームファイルや公開サイトを書き換えません。`src/index.mjs` からManaRuntime、ManaRenderer、ManaAudio等を読み出せます。実ゲームのイベントバス、描画パス、受け手sprite、サーバー時間には接続していません。

## 正規化済み入力

`ManaRuntime` はroomId/sessionId、`resolveRecipient(playerId)`、monotonicな`now()`、任意のaudio、rendererを隠す`onInvalidate(reason)`を受け取ります。fixtureは `tests/fixtures.mjs`、実際に動く結線例は `preview/main.mjs` です。これらはデモのadapterであり本番ゲームから抽出した接続ではありません。

イベントの必須fieldは `id, playerId, roomId, sessionId, type, effectKind, committed, gainClass, manaBefore, manaAfter, committedAtMs, expiresAtMs, source, variant` です。`type='gain-mana'`, `effectKind='mana'`, `committed=true`, `gainClass='discrete'`、実際の増分が正であることを要します。source/variantは `map-object/normal` または `mystery/mana-surge`。`ownerPlayerId` を渡す場合はplayerIdと一致しなければ拒否します。

これらはこの候補の入力adapter契約です。実ゲームのfield名や欠けた情報を勝手に推定しません。ホストで権威ある確定情報から正規化してください。`manaAfter>manaBefore` だけでは確定を証明できないので `committed` と許可された原因も検査します。マナを付与・更新するAPIはありません。

`resolveRecipient` は `playerId, roomId, sessionId, alive, present, vented, invisible, opacity, onScreen, renderVisible, worldX, worldY, motion` を読み取り専用で返します。明示的なtrue/falseや有限座標が欠ければfail-closedです。`worldX/worldY` は**現在**の足元中心、gameのy下向き。rendererには同じgame座標のcameraオフセットを渡します。腹部はEの設計オフセットであり実体の接触点を測定していません。

## 1件の生命周期

`admit(event)` は検証し、room/session/idをJSON配列でキーにして重複を防ぎます。playerIdをキーに混ぜて同じevent idを別受け手で再利用することは許しません。受け手が隠れていたIDも消費し、後から可視になることで遅延発火しません。

各frameで `prepare(now)` を呼び、その結果を `renderer.draw(frame, options)` に渡します。`current: () => runtime.current(frame)` を必ず渡し、ホストの表示判断を `visibility` に接続します。返されたreceiptだけを `runtime.commit(receipt, now)` へ渡します。見せる予定のイベント一覧だけでcommitしたり、mock receiptを本番で作ったりしないでください。CPUのalpha>0だけで音を開始しません。

初回の有色本体の寄与がGPUで確認され、可視canvasへのpresentとqueue完了、epoch/可視性の再検査を通った時刻を所有者時計の開始にします。readback待ち時間を勝手にEの先行進行へ数えません。以後は実時刻を積分し、1.6所有者秒で終了します。イベントのTTLは別の安全上限で、TTL終了は音とEを破棄します。期限によって総尺を伸ばしません。

「成功した可視フレーム」の実装上の範囲は、WebGPU検証エラーなし、主形寄与のwitness、ブラウザー内のcanvas可視性、present成功、同じrealm/受け手の再確認までです。OSが実際に画面走査を完了した時刻、他アプリのウィンドウ被覆、スピーカー出力時刻まで証明するAPIではありません。

## 所有者のACC2

`setOwnerMotion(playerId, motion, at)` は**実際の状態変更が起きた同じmonotonic時計の時刻**で呼びます。`motion={moving, acc2State, acc2Effective}`。3条件が true / 'active' / true のときだけ2倍です。移動停止、予約、待機、OFFは1倍です。ホストは予約フラグを実効activeとして渡さないでください。

時刻`at`まで旧rateで積分してから新rateを設定します。音は同じBufferSourceのplaybackRateを変更し、offsetや位相を再初期化しません。AudioContextのcurrentTimeへは呼出し時に反映します。過去の切替時刻を遅れて通知して音だけを遡って修正する機構はありません。遅延配送、OS音声バッファ、GPU待ちの実音画同期は実デバイスで検証が必要です。

## 即時抑制と一回限りSFX

死亡・退場・ベント・透明・画面外の変更時は、受け手スナップショット更新と同じ処理で `invalidatePlayer(playerId, reason)` を呼びます。タブ/ギャラリー非表示は `setEnvironment({visible:false})`、ミュート/verifyは対応fieldを更新します。ルーム/セッション切替は `setContext(context)`。GPU失敗時は `failGPU()` を呼びます。

`onInvalidate` をrenderer.invalidateへ接続すると、古いキャンバスをその処理で隠します。`current()` は非同期GPU処理中の古いepoch/受け手の再表示を防ぎます。ホストが可視性を知らせない限り、E側がゲームのベント/透明状態を推測することはできません。

最初の可視receiptで音の可否を一度決定します。ミュート、verify、非表示、AudioContext未稼働ならそのIDは無音のままです。許可されたIDは `AudioBufferSourceNode.start` を1回だけ実行し、ループしません。非表示/切替/失効でgainを0にしてstop/disconnectします。既にOSへ渡った音声サンプルを取り消したとまでは主張しません。

## 上限・重なり・実景

active上限64、セッションID台帳100000。上限時は明示した拒否理由でfail-closedとし、遅れて再発火しません。無限件数の処理を保証しません。同一受け手の新規IDは初回描画を1件ずつ確認し、すべて同じ形で隠れたフレームから一括発音しないようにします。完全に重なったIDが終始視覚的に判別できることは未検証です。

rendererは試験背景を含むopaqueプレビュー出力です。本番への透過合成・キャラクター前後の分割・実景法線と照明は未実装のadapter責務です。GPU内部のRGBA8 framebufferは使いますが、画像テクスチャ素材に依存しません。実際のゲーム背景をこの試験背景で置き換えて導入済みにしないでください。
