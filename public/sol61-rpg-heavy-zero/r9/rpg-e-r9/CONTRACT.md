# Rocket R9 — true observer PostEffects derivative

作者GPT-6.1-Sol。新candidate sol-rpg-heavy-quality-r9-observer、unadopted/qualityunaccepted/nativecompilepending。所有本フォルダのみ、R8とfaithfulhostは読取専用。root/Lunaが新host/gallery/publicを統合する。source PH親r8/rpg-e.mjsはf4604c3ff5ecf254a9f8050f3c350068ccd5932e86f3f632bba79d71f68385b1 exact。

## 今回指定 / mandatory / overrides

今回指定はR8に欠ける実OBS PostEffects。LIGHT_POST_WGSLはLambert physicalreceiverでOBSではない。保持必須はjets/impact/sourcepositions/PHradiance/SFX/receipt/privacy/currentness/actualbody・有限時間・実寸。Eの題材指定はmandatory発光・受光・actualWebGPU PostEffectsを免除しない。明示上書きなし。PHの白い強光を抑える/scene露光を下げる方法で解決しない。

光学選択は強い短時間の発光をsource-boundな局所散乱へ投影するtwo-scale bloom。フレア/ghost/chroma splitを全種類追加しない。任意のscreen位置のglare、surface lightや白い衣装をsourceにするbloom、休止時haloなし。

## PH exact / source extraction / OBS exact

r8/rpg-e.mjsは全byte同一、PH geometry/radiance/volume/jet/physical Lambert/plan/PCMと正規提出guardを保持。SOURCE_WGSLは同VFX_WGSLをそのまま使用しfragment entryだけhelper名r8Fieldへ変更し、sourceFSを付加。kind0/1 jetとkind2fireだけ資格があり、kind3 smokeは即0。hot-qualified observer input=max(actualpremultHDR RGB−.9,0)へ同fieldのactualvisibility/transmissionを掛ける。灰色exhaustの低radianceも閾値以下。sourceをlightPositionsから推測・描画せず、actualsamefield equationsの源を描く。

.9はセンサ側の散乱response onsetでありPHsource減光ではない。PHscene outputは無変更。qualifiedemission→OBSのpositiveadditiveのみ、観測応答を消す診断でもPHsourceはそのまま。alpha/coverageとradianceを混同しない。親fire自身の620/700ms終了・jet360/400ms終了・smokeのみ後半ではactualinput0なのでOBS0。最大event1200の後にもhistory残留なし。

OBS_WGSLはactualqualifiedemission9taps×2radii、displaypixel半径1.4/6.5、weights center.36/axis.115/diagonal.045（各kernel和1）。local/far gain.14/.055、defaultintensity1、許容0..2。same-source色を保つ。sceneRGB+scatter×observerOn×observerSourceOn×intensity、元scenealphaを保持。tone mappingは既存hostの後段の一回だけ、OBSでPHsceneをclamp/露光低下しない。source-onlybufferにsurface/base/UIは入らない。

## source occlusion / exact frame lease

transmissionはrgba16float texture_2d_array、pixelxy/fieldindexごとのactual0..1 source visibility。filter前にsourceFSで適用し、hidden源がobserverへ漏れない。body/wallの後ろのsourceが透過率0ならinput0、halftransmissionならlinearhalf response。maskはactualPHのpresented draw/depth/occlusionからhostが提供、物理位置だけで勝手に遮蔽・全1を捏造しない。

凍結R8hostはPHfieldsをbody/sceneの上へunmaskedで描く。忠実hostでは、その全front描画という既存事実を明記したfullvisible layerを提供することはpresented-source parityとして可能。ただしこれをworlddepth/actualbodyocclusionの合格にしない。正規depthmasked PHを実装した場合はsamefieldのmaskをOBSへ同時に渡す。observerだけがPHにない遮蔽を推定して一致を偽らない。親のworldocclusion不足は別gateとして保持。

observerLease: scope='actual-source-observer-inputs', exactdevice, sameframeToken identity, actualplan identity, causeId/sourceEffectId, width/height, fieldLayers=plan.fields.length, sceneRadiance/view, transmission/arrayview, sceneTexture/transmissionTexture/outputTexture identities, isCurrent()。全resource非alias、scene/transmissionはoutputと別。同submitの正規frame ownership/currentnessを持つ。欠落/別device/別cause/別plan/別frame/別layers/alias/staleはthrow、fallbackglareや汎用maskなし。

## ordinary combined API / SFX / queue lifetime

rpg-e-r9.mjsを新host entryにする。CANDIDATE_VERSION/instance.versionはR9、PH VERSIONはR8のまま、sourceparent/receipt/audioABIの歴史を偽らない。createPass({device,format:'rgba16float'})はPH+OBSを作成、prepare(actualR8plan,{viewport,camera,sourceCurrent,frameToken})。

prepared.record(sameEncoder,newObserverOutputView,{lightingLease,observerLease,observerSourceOn:true,observerOn:true,intensity:1})はphysical Lambert→R8VFXをlease.sceneRadianceへ、次にqualifiedsource別target→OBSをoutputへ記録。defaultordinaryはlease必須、OBSを任意に省略しない。observerOFFもpassは記録しgain0。basePH最終HDRとobserveroutputは別texture、続いて既存tone map→canvas。親hostのtarget hdrViewをそのままread/writeへaliasしない。

combined.submit(physicalrecording)はscene/source/observer currentnessを再確認して親の一回のsubmitを呼ぶ。actualbrandedR8submissionをobserverPrepared.bindSubmissionへ結ぶ。返すreceiptはversionR8を保持してcandidateVersion/observerVersion/observerRecordedを加える。combined.isSubmittedはそのnewreceiptをbrand検証、createAudioOwner({isSubmitted:combined.isSubmitted})の既存R8closure/PCMと整合。PHreceiptを勝手にR9versionへ書替えてSFXguardを壊さない。

prepared.release()はPHactualqueuecompletionとOBSbind済actualcompletionに従ってbuffers/targetを解放。hostはrecord→submit→releaseを同所有経路で行い、failedrecordはencoderを捨てrelease、releaseしたencoderを後からsubmitしない。destroyはownedresourcesのみ。foreign/synthesizedsubmission/bind二回/one-shot再提出を拒絶。新SFX音源/タイミング/音量なし。strictverify hardzero/gesture/mute/音声所有は親のまま。

UIは物理receiverLight(sourceLight旧制御)、physicalreceiverPass、observerSourceFeed、observerResponseを明確に別名で提供する。observerSourceFeedOFFはphysicalsourceを消す制御ではなくOBSの供給比較。PHsourceOFFは親のunmodifiedsource/receiver仕様を別diagnosticsとして扱い、炎が残るのに『全sourceOFF』と表示しない。

## cost and gates

追加2pipelines/2passes、一preparedにつき3buffers+1rgba16floatsourceHDRtarget、history0、19posttexturefetch。sourcehotfieldを再描くため火volume20×2評価が再実行され、cheap/freeと主張しない。visibilityarrayはhost所有、130fieldlayersまで、4096²dimensionguardは仕様上限で性能合格でない。masklayout/4同時/normalframeGPU時間・memoryをroot測定し、重ければcreative維持したboundedhost batchingを別判断。新Etextureなし。

verify.mjsはCPUsourceON/OFF/transmission/intensity/1200bound、actualGPUcallmock、別frame/alias/currentness/one-shot/queuecompletionとcombinedproduction提出を検査。GPUmockは本WGSLcompile/nativeではない。root同actualsource60/100/180/300/450/600/900/1200、sourcefeed/OBS/receiver独立ONOFF、occluded/unoccluded証拠、continuous1×、actualH64/dark/light、SFX/Safariをnative受入。OBSがmain重圧形を隠すwhiteflood/任意glare/ghost/0input残留/受光をOBSと誤表示はfail。技術再生だけでqualitypassにしない。

モデル分担：GPT-6.1-Sol 100% — OBS創作・source境界/queue契約・実行code・focusedtests。
