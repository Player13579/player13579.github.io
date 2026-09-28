# r0.3 外部API / 接続境界

## エントリと所有権

`src/emp-e.js` の EMPEffects.create({canvas,device?,quality?,onError?}) はPromiseを返します。canvas必須、qualityはhigh/low。device省略時のみ資産がdeviceを作成・所有し、disposeで破棄します。ホスト提供deviceは破棄しません。専用canvasへのrendererであり、既存ゲームのrender passやdepth textureへ自動接続するAPIではありません。自前のRAFは始めません。実サーバー接続承認は含みません。

本書のpacketは描画adapterの契約です。**既存サーバーpacketを書き換える提案ではありません。** ソースサーバーが提供されていないため、そのfield名や全枝との一致は未検証です。ホストは実際のauthoritativeイベントをadapterへ渡し、下記の不透明データを無改変で保持します。

## 共通イベント

5枝とも id:非空string、atMs:共通actor-ms、origin:{x,y}:game px、cause、owner、phase、pair を明示します。cause/owner/phase/pairは有限で循環しないJSON値です。pairなしは明示null。資産側でphaseを+1/-1へ正規化したり、owner配列をソートしたり、pairを新規作成したりしません。source metadataの未知のJSON fieldもbinding内に保持します。

authorityDeadlineMsはホストの期限。chargeはnullで未解決保持を許し、normal/resonance/cancellationはnullなら美術上の有限寿命だけを持ちます。storage lockは必須の有限deadlineを要求し、未指定時に7秒を推測しません。atMsより前の期限、不正JSON、非有限値は例外です。1 eventのbindingはdeep clone + freezeで外部からの書換えを防ぎます。

idはこの資産のepochで一意。完全同一の再通知はaccepted:false/reason:duplicate、同IDで内容が違うとid_conflict。解決・延長のcommandIdも同様に冪等です。権威eventのIDと接続adapterのIDの対応はホストで管理し、ライブラリは自動採番しません。

## 効果別呼出し

| 呼出し | 追加field | 表示上の位置・寿命 |
|---|---|---|
| charge(spec) | authorityDeadlineMs: number またはnull | ownerの追従位置。1200msでready-held、その後権威終了まで保持。 |
| normal(spec) | targets: [{id,position:{x,y}}]、空配列可 | sourceから供給target snapshot。520ms、設計上の可視到達180ms。 |
| resonance(spec) | a、b:供給発動点snapshot | originは**供給された権威中点**。1600ms。 |
| cancellation(spec) | a、b:供給発動点snapshot | originは供給された権威中点。1600ms。 |
| suppression(spec) / storageLock(spec) | authorityDeadlineMs必須、targetId、revision任意 | targetIdの追従位置、権威期限＋280ms cosmetic tail。 |

通常・ペアに対する距離や位相判定ヘルパーは現行外部APIにありません。260/520/110/260という値はCONTRACTで記録されますが描画の判定には使いません。供給targetが260pxを超えていても対象を勝手に削除しません。originと(a+b)/2が一致しないpacketでも黙って修正しません。これは不整合を正当化するものではなく、権威側/adapter側が検査・解決すべき診断事項です。

d=0ではゼロ長転送pathを生成しません。通常の局所受信終端、共鳴の共有接続、相殺の補対列は位置の割算なしで成立させています。見た目から対象を増やしたり、同位置の誰かをキルしたりしません。

## 更新・解決・延長

update({actorMs,rate}) を同じゲーム時計から毎フレーム供給し、render() を呼びます。rateは0〜8、負値や逆行actorMsは拒否。1/2倍の可読性検査を準備しましたが実機未確認です。rateはAudioWorkletにも入り、rate2では再生時間と音高の両方が変わります。音高保持time-stretchではありません。

resolve({commandId,eventId,atMs,...opaqueMetadata}) は既存枝の終端を決めます。cause/owner/phase/pairをcommandに併記した場合は元データと完全一致が必要です。不一致はbinding_conflict。新しいnormal/resonance/cancellationを自動emitせず、HPやlockフラグも変更しません。別枝が権威で確定した場合はホストがその枝を別途emitしてください。

解決時点以降の主作用のstateAgeMsを固定します。normalは未到達先への進行を止め、chargeは未完成列を新しく完成させず、pairは未到達の展開ピークを作りません。terminalQだけが進み、charge240、normal160、pair230、lock280ms以内に撤去します。normal/pairの既定可視寿命をtailで越えません。権威が期限を先に持つ場合、resolveとの早い方から表示の終端に入ります。cosmetic tailは権威効果が継続する期間ではありません。

extendLock({commandId,eventId,atMs,authorityDeadlineMs,revision}) は既存lockの期限更新です。revisionは非負整数で既知値より大きい必要があります。元のbinding期限は保持し、updatesへ追加します。既知期限より短い変更はnot_extension、期限外の延長や時刻逆順はoutside_live_interval、解決済みはalready_resolved。期限ぴったりの延長は受理。ゲーム側が終了後に新しいlockを確定する場合は新しいイベントであり、このAPIから勝手に復活させません。

未知eventのcommandはunknown_eventで返します。未到着イベントを推測して作成するqueueはありません。ネットワーク逆順のbuffer/replay、再開時snapshot、複数競合pairの優先は権威adapterの責務です。すべてのaccepted:falseを接続側で扱ってください。

moveAttachment(eventId,position) はcharge/lockだけ。既存binding.originは変えず、描画と既存voiceの位置を更新します。normalとpairの過去snapshotの移動は拒否します。

## SFX

enableAudio() はユーザー操作から呼びます。音声identityは(kind,cause,owner,pair)のstable JSON。異なる枝は別の原因署名、同枝の同cause再送はvoiceを増やしません。event.idだけが違う同causeにも音は1回。resolve/extendはその既存voiceを更新し、voiceを新規作成しません。causeの一意性はホストのイベント契約で担保してください。

音源はcharge/normal=発動者、lock=対象、pair=中点。distanceGain(d,R)は (1−u²)²/(1+6u²)、u=clamp(d/R)。d=0で1、R以上で0。Rはnormal/charge/lock2200、resonance2600、cancellation1800 gamepx。charge/lockの範囲は通常準拠の美術選択。これは実音速・壁越し音響・物理メートル減衰ではありません。

sound:falseなら無音。既定では5枝とも署名あり。enableAudio前に起きた過去イベントは後で再起音しません。AudioContext開始後のrestartが試聴epochを作ります。setListener(position)、setVolume(0..1)で操作できます。停止/120ms以上のclock供給断で出力をgateします。音声のactor時間を勝手に進め続けません。

最大64同時voice。超過時は新規voiceをcapacityDroppedとして拒否し、既存voiceを奪いません。統計はqueued/created/started/finished/duplicates/resolutions/extensionsであり、耳で聞いた音の数ではありません。API snapshotに取得値と未起動状態を記録します。

## 描画・観測

setView({center,pixelsPerGamePixel})、setQuality('high'|'low')、setBackground([r,g,b,a])。API初期背景は透明。scale1でH64=64CSSpx、devicePixelRatioは内部画素数だけに作用しゲーム射程を変えません。明暗backgroundはdisplay transformです。

setOccluders(shapes) は矩形{x,y,w,h,depth,color}または凸polygon:{x,y}[]、depth、color。非凸polygonはこのfan三角形化に適しません。coverage maskは同じprojection/depthで描きますが、ホストdepth textureからの自動取得や衣装alpha mask生成はしません。previewのproxyが遮蔽しても、実キャラ統合を確認したことにはなりません。

sampleEvent/sampleStoreは純粋なactor時刻サンプルを返します。informationは描画用の接続/占有/消去状態でありサーバーstorageの内容ではありません。主形を作るgeometry.jsはこのfieldを参照し、WGSLのノイズや画面加工でデジタル性を後付けしません。

reset(actorMs=0)は明示的なpreview/replay/session境界です。event/voiceの冪等記憶を消去するため、稼働中ゲームの途中で勝手に呼ばないでください。逆行seekはreset後にホスト履歴から再投入します。dispose()は資産のGPU/audioを破棄します。

保持event最大1024、command最大50000。上限に達したらcapacity/command_capacityで受理を拒否し、保持中のcharge/lockを無断で消しません。長期ゲーム接続では安全なepoch境界でのresetまたはホスト側の保持戦略が必要です。容量・一般透明面の交差・backend依存の誤差・sampling jitterは実機検証事項です。
