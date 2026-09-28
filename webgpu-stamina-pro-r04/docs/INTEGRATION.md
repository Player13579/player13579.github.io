# 接続契約 — 実ゲームへの接続は未承認・未実施

## authority / event
ゲーム側でSP増分が確定した一回のトランザクションだけを入口にする。natural regenerationのtick、推定gain、見込値、毎frameの現在値は接続しない。rendererはSPを書き換えない。

`StaminaEvents.ingest` は `type='gain-stamina'`, `authoritative=true`, `kind='discrete'`, `gain>0`, `playerId`, `startedAt` を要求する。ゲーム既存eventがauthority/kindを持たない場合、確定トランザクション専用のbridgeでその由来を確認して付与する。未認証イベントへ無条件でtrueを付ける汎用bridgeにしない。

`startedAt` は受益者actorのms時計。同じepochの `ActorState.nowMs` と比較する。`performance.now()` やserver wall timestampをそのまま混ぜない。未指定durationは1500ms、正の短い指定は900msへ制限。radius既定82。radiusは供給の外部占有域であり人物高ではない。

`eventId` は独立gainごとに一意。同一gainの再送は同じIDを保つ。ID無しfallbackはplayerId/startedAt/sourceToken。二つの真に独立した同時刻・同原因gainを、この三項だけで判別することはできないため固有IDを付ける。frameごとにUUIDを作る実装は不可。

## actor / lifetime
最初に `setActor` で受益者を登録し、各更新で確定したnowMs、rate、alive/present/visible、positionを渡す。未指定の既存フラグは保持する。`update()` はclockに沿って開始/終了を処理し、`active()` のevent/actor/laneを `sampleEffect` へ渡す。`lane` は受理時に固定され、他eventが終わっても再採番しない。

pauseはactor rate=0かつnowMsを止める。death/exit/invisibleはそれぞれalive/present/visible=false。位置の検証用メッシュ非表示は `bodyParts` のshowCharacterだけを変え、actor.visibleは変えない。逆行は終了原因であり巻き戻し再生ではない。

最大同時8event、4模式人物、48体積、64身体部品。容量超過は理由付きrejectし、密かに合体/延長しない。seen ledgerは8192件でfail-closed。退出したeventを時間だけで忘れて再送から復活させない。新しいゲームセッション時だけ明示resetSessionする。

## GPU / camera
公開入口は `src/public-api.js`。`createBackend` の同一deviceとpipelinesを各viewで共有し、表示数に応じて音声を複製しない。rendererはpure samplerの解析楕円体群、検証用身体群をworld位置へ投影し、視線上の最前面と放射吸収を解く。

単位は64 canonical px=1.7mという設計正規化。標準右手系は+X右、+Y上、+Zカメラ側、カメラ前方-Z。画面yは下向き。world→camera→screenのbodyとEを一致させる。現段階は正面正射影と解析身体のfixtureであり、実ゲームのスプライト深度/骨格/斜視カメラを自動的に解決するものではない。

実ゲームに採用する場合は将来、実カメラと受益者の骨格/深度を渡す専用実装・遮蔽検証が必要。まだ実施・承認していない。UIの近接fixtureは本編接続を意味しない。

## texture / compositing
画像を読み込まず、RGBA16floatのscene/bloom render targetだけをGPUで生成する。sceneのalphaチャンネルは保護マスクであり、coverageや不透明度とは別。物理的transmittanceはfragment内の独立量。中間結果へ不用意なalpha乗算を追加しない。最終canvasはopaque。実ゲーム合成先を変更する場合はこの契約を再検証する。

## audio
一つの `StaminaAudio` をSFXバスへ置き、イベント管理のonStart/onUpdate/onStopに接続する。開始でだけvoiceを作る。updateはphase/rateの更新だけ。AudioContext解錠前の起音を後から再生しない。voiceごとのDSP位相は保持し、actor rateは包絡を進めるが音程を倍化しない。

ゲーム不可視とブラウザ非表示で終えたeventは同一IDで再開しない。packetが85ms以上途絶えた場合は無限持続せずpause相当で無音化する。stopは8msクリック抑制の後にvoiceを解放する。これはゲーム寿命の延長や新しい余韻eventではない。
