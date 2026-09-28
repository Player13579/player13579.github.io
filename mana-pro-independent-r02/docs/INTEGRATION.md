# r0.2 ホスト側統合契約 — 実ゲームへの接続は未実施

この文書の入力型は、この独立候補のための**正規化されたアダプター境界**です。実ゲームの既存wire formatや関数名を調査して合わせたものではありません。ホストは実際の確定処理から読み取り専用で通知を作り、元の状態へ書き戻してはいけません。

## 確定通知

必須fieldは `id`, `playerId`, `roomId`, `sessionId`, `type`, `effectKind`, `committed`, `gainClass`, `source`, `variant`, `manaBefore`, `manaAfter`, `committedAtMs`, `expiresAtMs` です。

| field | 契約 |
|---|---|
| `id` | ルーム/セッション内で一意かつ再送でも同じ文字列。表示側でランダムに再生成しない |
| `playerId` | 実際に正の増分を得た受け手。時計の所有者もこの受け手。任意の `ownerPlayerId` があれば一致必須 |
| `roomId`, `sessionId` | 現在のコンテキストと完全一致 |
| `type`, `effectKind` | それぞれ `gain-mana`, `mana` |
| `committed`, `gainClass` | `true`, `discrete`。予定・予約・自然回復を確定通知と偽らない |
| `source`, `variant` | `map-object` + `normal`、または `mystery` + `mana-surge` |
| `manaBefore`, `manaAfter` | 実際の確定前後の有限数。before≥0かつafter>before。表示用推定量ではない |
| `committedAtMs`, `expiresAtMs` | 同じホスト単調時計のms。committed≤now<expires、expires>committed |

`source=mystery` は「Mystery」の正規化名です。`natural-regeneration` 等はallowlist外です。variant `desire-recovery`, `renki`, `renki-tenfold` は明示除外です。上限で変化しなかった場合はafter==beforeとして拒否されます。増分を計算した結果だけで上限を越えていたかは判定せず、ホストが実確定前後を供給します。表示側はcommitの暗号学的検証やサーバー認証を実装していません。

## 現在の受け手

`resolveActor(playerId)` は最新のスナップショット、または見つからなければnullを返します。

```js
{
  playerId, roomId, sessionId,
  worldX, worldY, // 現在の足元中心
  alive: true, present: true, vented: false, invisible: false,
  opacity: 1, onScreen: true, renderVisible: true,
  motion: {moving: false, acc2State: 'off', acc2Effective: false}
}
```

未定義を可視と推測しません。dead/departed/vent/invisible/opacity≤0/offscreen/renderVisible=false/別context/座標不正は拒否・停止です。`renderVisible` はゲームの遮蔽、本人に見せてよいか、別画面や非表示レイヤーに属するか等をホストが集約する契約です。r0.2はviewport/overflowで一部が切れたcanvasも安全側で非表示扱いにします。CanvasのDOM可視検査だけでは、他DOM要素による被覆やゲームの深度を完全には分かりません。

**重要:** 死亡・退場・ベント・透明・画面外等が変わる処理と同じタイミングで `controller.invalidatePlayer(playerId, reason)` を呼びます。状態snapshotを更新するだけでは次の描画処理まで検出されません。`setVisible(false)`、`setContext()` も遅延させず通知します。API通知がなかった現実の状態変化を本候補が独自に知ることはできません。

## 一体制御の利用例

この例は仮の呼び出し面を示すもので、実ゲーム導入済みコードではありません。

```js
import {ManaEffectController, ManaOneShotAudio} from './src/index.mjs';

const controller = await ManaEffectController.create({
  canvas,
  context: {roomId, sessionId},
  resolveActor: id => readCurrentRecipientSnapshot(id),
  views: () => [{
    rect: [0, 0, canvas.width, canvas.height],
    background: [0, 0, 0, 0], // linear RGBA、透明統合
    project: (worldX, worldY) => cameraWorldToPhysicalPixels(worldX, worldY),
    scale: physicalPixelsPerWorldUnit
  }],
  verify: false,
  reducedMotion: false
});
controller.start();

// 実際の確定通知から一度だけ正規化。重複再送でもidを変えない。
controller.admit(normalizedCommittedGain);

// ACC2の実効切替エッジを同じ単調時計で直ちに通知する。
controller.setOwnerMotion(playerId, {
  moving: isActuallyMoving,
  acc2State: 'active', // off / waiting / reserved / active
  acc2Effective: isMovementACC2ActuallyEffective
}, performance.now());

// 実際のユーザー操作ハンドラー内でのみ行う。
const audioContext = new AudioContext();
await audioContext.resume();
controller.attachAudio(new ManaOneShotAudio(audioContext));
controller.setMuted(false);

// 退出・ルーム切替・破棄。
controller.invalidatePlayer(playerId, 'departed');
controller.setContext({roomId: nextRoomId, sessionId: nextSessionId});
// controller.dispose();
```

`readCurrentRecipientSnapshot`、`cameraWorldToPhysicalPixels` 等は例中のホスト責務です。パッケージに実ゲーム関数があるという意味ではありません。画面サイズ・DPR変更時はcanvasのbacking sizeを更新し、view rect/project/scaleも同じ倍率へ揃えます。rectは正の整数physical pixel座標で、canvas内に収めてください。

## 可視フレームと一回限り音

1. admissionで確定前後、source/variant、ID/context、有効期限、受け手可視条件を検査する。
2. IDをセッション内のseen台帳へ登録する。可視条件・容量などにより抑制された正規通知も、再表示時の遅延発火を避けるため消費済みとする。
3. pendingはage=0で待ち、現在の受け手足元へ描く。shaderは可視の本体にだけ整数event tokenを書き込む。
4. rendererはGPU error scope、queue完了、witness readback、現行epoch、受け手、DOM可視性を検査する。実canvas提出が成功し、tokenが2画素以上あったeventのreceiptを発行する。
5. engineはreceiptのepoch/frameId/token/可視性を再検査する。最初の成功時にだけ所有者時計を開始し、許されていれば同じkeyのSFXを一度startする。

receiptは信頼されたrenderer→engine内部の契約であり、不正なJavaScriptが作ったreceiptに対するセキュリティ境界ではありません。GPU提出完了は物理モニターへの走査時刻を保証しません。実音のデバイス遅延も未測定です。厳密な表示/発音の最終遅延・遮蔽条件は実統合環境で計測してください。

ミュート、verify、非表示、AudioContextがrunningでない場合は発音を放棄し、後から補いません。途中ミュート・context停止・セッション変更・GPU失敗は既存音も停止します。呼出側が音を有効化する前に勝手にAudioContextをresumeしません。AudioContextの出力バッファに既に渡った音を物理デバイスから巻き戻す保証はありません。

presentation watchdogは、再生中の音があり成功提出が250ms以上ない場合に全E/音を停止します。これはフレーム停止への保険であり、ホスト側の即時不可視通知を代替するものではありません。失効はadmission/prepare/receiptで再検査します。ホストが厳密な失効時刻で即時非表示にする場合、その期限タイマーから `invalidatePlayer` 等の失効通知を行います。

## 複数獲得とID

keyは `JSON.stringify([roomId,sessionId,id])`。区切り文字を含むIDで衝突しません。異なるIDを一つへまとめず、受け手やSFXへ誤って流用しません。同じ受け手の同時pendingは初回の可視証拠だけ一件ずつ進め、その後の寿命を並行させます。受領源が完全に重なる初回フレームでwitnessを奪い合うことを避けます。

実行上限は同時64件、seen台帳100,000件/セッション、token上限0xFFFFFF未満。上限到達時は明示理由を返してfail-closedとし、無限リソースや必ず全イベントが再生されることを装いません。通常の近接複数獲得に対して重複再生やID統合を行わない契約です。100,000件台帳は同一session中に古いIDを追い出して再受信を許しません。context変更で台帳・音・pending・旧GPU世代を破棄します。

## 現実の身体・材質との合成

この候補は体積Eの透明レイヤーです。実キャラクターの前後に応じた深度、身体mask、既存ゲームの照明パスには接続していません。受領中心は(0,−61)wu、輸送のinletは受領領域内の(−13,−55)wuです。受領位置は毎フレーム足元基準で追従しますが、実スプライトを通じて蓄積が読めるかは別途観察が必要です。

`sampleLightAtWorld(instance,x,y)` は同じS/T/R/位置から得る有限なlinearRGB入射光の設計サンプルです。既存材質があるホストの照明パスでのみ利用できます。無人物ギャラリーでは指定した中性診断背景の受光差を描きます。透明canvasを重ねただけで実キャラ材質が光を受けたと主張してはいけません。サンプルは高精度の放射輸送や実測物性ではありません。

## r0.2の検査専用モジュール

`src/geometry.mjs`、`tools/reference-utils.mjs`、CPU参照PNGは検査用です。ランタイムのWebGPU代替として読み込まないでください。`renderer.render` の `inspectionLayer=1/2/3` はverify専用で、正規eventの発音許可tokenを返しません。通常のrenderer APIとevent正規化契約は維持しています。
