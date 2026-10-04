# Donation R4 standalone操作待ちとstartup期限の分離

判定：**実startup制御不具合**。創作材質/SFX品質のFAILではない。作者GPT-6.1-Sol、read-only診断と修理契約のみ。この新規フォルダー以外は変更しない。R17draft、frozenDonationR4、public/catalog/他作業を保持。

## 実証拠と機序

Root所有tab473の保存原証拠 `finish-donation-r4-full-motion-native-luna-r1/root-idle-startup-failure/` を読んだ。`page.jpg`も原寸で確認（画面下部statusはこの画像では見切れ、エラー文はpage.txt/snapshotに保存）。actual snapshot：standalone verifyURL、token空、stage first-frame/error、code STARTUP_TIMEOUT_OVERALL、elapsed90010.5ms、message Preview startup exceeded 90 seconds。runtime time−1/runningfalse/loops0、両rendererはWGSL world/present-observer診断pass、submit1/2ともms−1 cleartrue、audio/context/node0。保存時readyfalseはcleanup後の状態であり、初期化が最初から失敗した証拠ではない。

実source5点を読んだ：`donation-r4-quality-review-sol61-r1/source/package/{preview.mjs,startup-first-frame.mjs,startup-bootstrap.js,runtime.mjs,index.html}`。exactSHAはINPUT-PINS.json。

- runtime.initはadapter/device/modules/pipelinesの完了とvalidationを経てreadytrue、resize、render(−1,idle)clear提出。
- previewはstandaloneで2rendererを作り、fixtureを登録し、**embedに関係なくfirst-frame/pendingへ進む**。実際の再生はstandaloneではユーザーPlay/hold等まで開始しない。embedだけrepeatがautoplayする。
- confirmDonationFirstFrameはnonclearのactualactivecause/two-passrecordを要求し、queue.onSubmittedWorkDone後に状態/診断/canvasを検査してplaying/readyを出す。clear提出では成功しない。この境界は正しい。
- bootstrapはページ開始から90秒でterminalfail、cleanupを呼びdisposeする。standaloneの合法な操作待ちも同じ90秒startupとして測るため、未Playのまま破棄される。

全timeout削除、clearをfirst-frameへ格上げ、未操作autoplayで隠す修理は不可。GPU資源準備、activeframe確認、表現品質を別状態として記録する。

## 最小の状態契約

| 状態 | 期限 | 証拠／遷移 |
|---|---|---|
| initializing | 現行90秒のページ起点overall期限を維持 | adapter/device/assets/pipelines/initialclear準備。失敗/未完了はerror/unsupported、cleanup |
| standalone awaiting-input | 初期化完了後はユーザー待ちを期限に算入しない | all2rendererのGPU準備確認を保存、firstFrame未確認、terminalfalse。Play可能、readyは資源意味だけ |
| first-frame pending | standalone最初の有効active要求から90秒。重複要求/RAFで延長しない | actualacceptedreceive、activehold、SourceONでのactive再描画が対象。clear/停止/expiryのみでは始めない |
| playing ready | actualcompletedactive二passの既存確認からのみ | firstFrame recorded/submitted/completedとcause/submitを保持。以後startup期限なし |
| error/unsupported/cancelled | terminal、late完了で復活不可 | cleanup一回、lateinitの所有rendererも破棄、pagehide/retire維持 |

**Embedは今のautoplayとページ起点90秒overall期限を維持**。standalone待ちへ入れない。galleryToken付きchildをmanualとして扱わない。eligibilityは `parent===window && embed!=='1' && token===''` のtop-level manual文書だけ。queryのembed=0だけを根拠にgalleryattempt期限を外してはならない。

## Luna実装契約

新renderer/publicAPIは不要。既存startup.advanceを使い、localbootstrapに **standalone専用stage `awaiting-input`、status `pending`、resourcesReady証拠** を追加すれば足りる。schema v1/galleryfirst-frameprotocolは変更しない。このstageはtoken付きiframeへ送られず、親galleryのplaying/ready条件を緩めない。

1. `startup-bootstrap.js`にmodeを初期記録する（standalone-manual / existing-autoplay）。awaiting-inputは上記eligibility＋資源証拠が揃った場合だけ受理し、initialoveralltimerをclear。status readyを出さない。firstFrameを書かない。UI文は「GPU準備完了・再生操作待ち（active E初回描画は未確認）」程度。snapshotもmode/resourcesReady/awaitingInputを区別する。
2. `preview.mjs`にprivate資源確認helperを置く。全期待rendererのinitreturn、ready&&!disposed、failed/device-lost/device/pipeline-validation診断無し、canvas接続/正CSS/backing寸法、actualinitialclearが記録/提出済みであることを確認し、それぞれqueue.onSubmittedWorkDoneを待つ。**元の90秒期限はこのawait中も残す**。await後にattemptIsActive/rendererready/診断/canvasを再確認。clearcompletionはresources proofへ保存し、firstFrame proofにしない。既存公開renderer追加APIは不要、device/queue/frames/ready/canvasはすでに利用できる。
3. Controls/globaldonationCard/wrappersの準備後、manualだけこのproofでawaiting-inputへ進める。embedはfirst-frame pending→repeatを維持し、idle待ちへ移らない。初期化中の80秒経過を手動初回要求の期限へ引き継がない。
4. manualで最初の有効active要求時に既存advance(first-frame,pending)を呼び、新しい90秒deadlineを一回だけarmする。acceptedreceiveはreceiveのboolean成功後（RAF前に同期でarm可能）、activehold/SourceONのactive再描画はrender前にarmする。receipt拒否、clearms−1、ms>=DURATION、SourceOFF診断のみはfirstFrame成功を作らない。既存公開receive/holdとUIPlay/phase/time/source経路を同じprivate開始helperへまとめ、関係ないcontrol変更で時計をrearmしない。もしfirstframeが既に成功済みなら再armしない。
5. 正常activeframeからのconfirmDonationFirstFrameは維持。wrapper/helperがframe.source===true、nonclear、acceptedcause、0<=ms<DURATION、passes2を満たすことを確認する。現helperはsourceOFFのnonclearrowも条件上通り得るため、sourceOFF/expiry/clearをactive描画成功へ格上げしないガードを入れる。firstFrame checkStartedもqualifyingframeだけで立てる。OBS OFFはsourceONのPH描画を消さないのでfirstframe条件としてONを強制しない。ここでGPUpixelatomicreadbackや視覚品質passを追加要求しない。
6. Timerをclearするreadyはplaying/readyの有効firstFrameだけ。assets/pipelinesのready等の準備表示でfirstframe期限を解除しない。initialtimeoutはSTARTUP_TIMEOUT_OVERALL、manualfirstframe期限はSTARTUP_TIMEOUT_FIRST_FRAMEなど区別する。startedAtMsをページ開始のまま保持し、first-frame deadline/stageStartedAtMsを別記録。duplicatependingでdeadline延長しない。
7. 無期限操作待ちが真のGPUfaultを隠さないよう、previewで既存renderer.deviceのlost/uncapturederrorをstartup.failへ橋渡しする。新rendererAPIは要らない。attemptactive&&!disposedのときだけ、既存診断とcodeを保持。初期clearcompletion中/操作待ち/firstframe中/成功後のfaultを明示error+cleanupにする。pagehide/retirecancel、idempotentdispose、latequeue/lateinitの非復活を保持。

Cleanup待ち中にstateをreadyへ復活させない。既存bootstrapのcleanupはfire-and-forgetでよいが、実検証ではdonationCard.disposeのawait/drain証拠を別保存する。statusresourcesreadyとruntime.readyは技術可用性だけ、表現pass/SFXpassではない。

## 最小回帰の正負ケース

以下は**未実行の要求**。fakeclock/factory/queueを使うboundedtestsで判定し、必要なactualstandalone/embedはrootがverify所有tabで確認する。現在の読み取りを修理動作passと報告しない。

| Case | 必須結果 |
|---|---|
| healthy standalone、Play無し、clock90s/180s経過 | resourcesReady/awaiting-input、runtime/両rendererready、dispose0、firstFrame無し、audio0、actualE成功無し |
| 同状態から90s後にPlay accepted、actual2pass+queue完了 | deadlineは要求起点、firstFrameが実active記録から成功。sourceON/OBS ONを保存、空clearを証拠にしない |
| 資源確認queue未完了、device/pipeline/adapter/initがstall | 元overall90s timeoutとcleanup、awaiting-input無し。latequeue/initでreadyへ復活しない |
| standalone有効receive、RAF/render/firstactivecompletionが来ない | manualfirst-frame90s timeout、cleanup。追加pending/control/RAF試行で延長しない |
| clearのみ、stop、expiry2800、sourceOFF、invalid/repeatedreceipt | activefirstFrame成功無し。無効receiveだけで新deadlineを作らない。sourceONへの有効active再描画は後で確認可能 |
| embedautoplay healthy | 従来通り起動中90s内のactualfirstactivecompletion→playing/ready。awaiting-input無し |
| embed/token付きiframeでawaiting-inputを誤送信、autoplay未描画 | manual待ちに入らずdeadline保持、error/unsupported/cancelledを正しく終端 |
| 操作待ちでdevice lost/uncaptured failure | resources待ちを継続せずerror+cleanup。faultをfirstframepassへ変換しない |
| pagehide/retireがqueue確認前／待機中／firstframe直前 | cleanup一回、latecompletionfalse、timer無し、playingready復活無し |
| incomplete/retiredframe、wrongcause、passes不足、zero/disconnectedcanvas、faileddiagnostics | existingfirstframe拒否を維持。resourcesreadyはこれらのfirstframeguardをskipしない |

actualverificationの最低証拠：unchangedcreative/runtimepins、新adapter/bootstrap/helperpins、route/mode、資源待ちの両rendererready＋firstFrame無し、90秒超待機後のstate、最初のacceptedPlayとactualcompletedactiveproof、embed正常/timeoutnegative、console、所有resourcecleanup。visualnative/SFX聴感、device/game/adoptionはこの修理と別。通常URLの音を聴いたとはverifyで主張しない。

## Scopeと未決

本フォルダーは診断/決定済み修理contractのみ。実修理はLunaが新ownedcopyで実装し、frozen/publicの反映はprimaryの版境界判断で行う。新effect創作や期限全撤廃は不要。public/galleryauthoritative変更はこのcontractから実施しない。既存sound.activateFromGestureのawaitが正常URLで長く止まる問題はこの未Play90s原因とは別、ここで実障害と仮定しない。

検証：source5点・保存receipt/DOM/imageを読取り、initialization→manualwait→watchdogcleanupをsourceで追跡。新修理のbehavioraltests/live/browser/hostは未実行、resource作成無し。INPUT-PINS.jsonにexactsource/evidencehashを保存。

モデル分担：GPT-6.1-Sol 100% — 相反するstartup/firstframe契約の限定診断とLuna修理仕様。旧創作・実装・captureの帰属は保持。モデル表示はlocalcatalogsnapshot fetched2026-10-04T10:14:07.701532700Z。
