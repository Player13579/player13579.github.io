# 医療室 VFX画像 r4 + 独立WebGPU環境E r1

担当出力はこのr1と正本public/sol61-medical-vfx-r4-environment/r1のみ。旧r3+r2・原画・旧shader・gallery・台帳・公開は変更しない。創作実行モデルgpt-6.1-sol、catalog GPT-6.1-Sol。実行権限never / danger-full-access確認済み。

## 原本と二段階契約

画像生成コードはoutputs/request-20261001/map-zero-reset/medical-vfx-r4/B-design-code-medical-VFX.py。その定数promptをASTとして読取、実行しない。画像は同folder/original/medical-room-vfx-r4.png、1164×1351、SHA9f3fe2fb6772daa8104dcf97abe1bf87e5254a17af4c629dd0d3b5d7088ffa7e。無変更コピー。生成履歴はWORKFLOW.jsonとINPUT-ROUTE-FAILURE.md等を参照。画像内VFXの創作作者・実生成経路は親の来歴を維持し、新WebGPUコード作者へ付け替えない。

画像側のVFXとruntime Eは別成果。原画内の反射が存在することをruntime実装証拠に使わない。source/effect.mjsがWebGPU fragmentで計算する各材質の応答とOBS6が独立E。原画は同じtexture samplingで常時保持。source OFF、world OFF、effect OFFで追加計算をゼロにし同じ版原画へ戻る。OBS OFFは追加のworld material radianceを保持する。map SFXはユーザー現行例外により無音。Canvas 2D・imagegen・GPU-to-2Dなし。

## 創作判断

r4 codeのPH6は4600K相当の上方拡散照明、静止Image t_ref=0、点滅・掃引・任意micro-variationなし。新たな扉光・器具・水・粒子・濡れ・casterを追加しない。runtimeも定常。時間入力に依存しない。動画演出の多さでE品質を判断せず、原画と追加材質応答の対照で、金属と非金属の光の幅／radianceが読めることをGPU確認する。

原画には強い焼き込み反射が既にあるため、同じピークを無制限加算しない。元linear RGB bからremaining_headroom=max(0,.97-b)を取り、局所材質応答factorを掛けた量だけ追加する。元の白いハイライトはほぼ不変、周辺の暗い金属肩にはより大きい可視差が出る。放射とalphaを分離し、形やcoverageは変更しない。これは芸術的な2D投影responseモデルであり、元画像から照度・3D法線を実測した再照明ではない。BRDF・3D光輸送・物理的総radiance保存は未実装／未検証。焼き込みピークへの追加を抑制する式であり、反射成分を分離して完全置換する意味の二重加算ゼロは主張しない。3D反射正確性・本編geometry/collisionは未受入。

## 新規r4座標登録

座標は原画左上native px。旧r3 maskを拡縮移植しない。画像全体を直接視認し、r4境界へ登録。寝台左右rail=336..349 / 568..579、y439..993前後、上rail367..551×410..423、下rail355..566×1005..1026。露出する下側脚の上部は350..363×1020..1038と560..573×1020..1038、境界soft2px。黒い接地脚先・影と寝台に隠れる脚は追加反射しない。ビニル上357..562×430..550、下358..562×571..989。蛇口中心893,125と軸886..901×140..190。陶器794..977×190..285、排水口885,235半径25×23を保護。収納露出面205..479×117..253からトレー・布・瓶面を除外。床182..974×358..1251から寝台／接地323..603×394..1100を除外。壁145..169×350..1247と上156..977×59..99。実GPUの位置ずれ検査はroot担当。

PH1床のfactor .045、PH2壁 .05、PH3金属 .12〜.32／ビニル .04〜.11、PH4収納露出 .14、PH5陶器 .04〜.10／蛇口は金属。PH6はすべてのfactorに共通のsource乗数。色はほぼ中性4600K照明に対応する暖白と、元ビニルを保つ弱い青側response。IntensityBudgetはheadroom連動で元ピークを重複加算しない。主読解は既存metal反射肩、次がビニル・収納、床と壁は背景。均一screen tintではない。

OBS6はr4指定のsoft抽出Y_work .8〜.9、weight .06、sigma .75／有限radius2.25 at288pxをそのままnative1164へ換算。世界内反射と別の観測再配分。I_out=I_in-.06*B+.06*(K*B)。PH3金属とPH5陶器の同一部材maskだけ。端では同部材の重みを正規化し、部材外への追加光を抑制する。全画面総radianceの厳密保存は未検証であり、達成済みとしない。金属・陶器mask unionの上限面積をCPU集計し2.5%未満確認。実threshold源面積はこれ以下。レンズghost／光条／追加彩色／globalbloomなし。OBS6は微小補助であり、可視E品質をOBS6だけに依存させない。

## B正本適用と対応

現行authenticated B checkout outputs/request-20261001/b-observer-variety/repo、remote player13579/B、Codex-honoo。commit87d5b90ee72f85bb4ffb36bd7199ca5cbd44f01b、base blob8f1286e12402fe7b19650ad44bcddb38ad227a08、extension blobc9406dd38952f38ffda1ef5dbf8f770c19bf295a。基底の入力／状態／geometry／材質／観測分離と、拡張VFX、PostEffects、LDM、ECodeImplementationを適用。未指定v1〜v6、MagicArchitecture等は起動しない。runtime Eの出力を画像B-Expression-2 promptの新modeと偽らない。画像用schema STRUCTURAL_PASSの実施／合格を主張しない。

PH1〜PH6は供給image codeの登録／完全構造・八領域を継承参照し、runtimeで変更した箇所は投影座標と実装方式のみ。各PHのDeepStructureは同じsource→既存receiver→有限境界、PerceptualReadabilityは狭い金属／広い非金属の分離、GeometryConstraintは上記マスク、StateDynamicsは定常、CouplingsはPH6.Optics→各receiver.Optics、CausalityLinksは一方向physical_influence、Evidenceは材質別勾配／遮蔽／source除去、SurroundingChangesは既存receiverのradiance、AcceptanceCriteriaは表示実寸で判読、FailurePatternsはピーク二重加算／全面overlay／微小画素差だけで合格、BeautyStructureApplicationはmaterial_response(幅と色)とcontrast(狭い明部と広い弱い肩)。ScaleRegimeはnative px／288幅fitでscene meter復元なし。PhysicalModelは経験的投影response、科学的因果同定はnot_run。

PH別八領域のapplicability/roleは供給image codeのPhenomenonBlockを正本として保持する。一律のnot_applicableに置換しない。ThermoはPH3/PH5/PH6でapplicable/latent(吸収光の等温近似による支持部・周囲への熱流)。Fluidは3者not_applicable/latent。Opticsは3者applicable/primary。MaterialsはPH3/PH5 applicable/primary、PH6 not_applicable/latent。ElectromagneticsはPH3/PH5 applicable/latent、PH6 applicable/supporting。RheologyはPH3 applicable/supporting(ビニルの静的条件)、PH5/PH6 not_applicable/latent。WaveOpticsは3者not_applicable/latent。SurfaceScienceはPH3 applicable/supporting、PH5 applicable/primary、PH6 not_applicable/latent。PH1/PH2/PH4の八領域も元codeの個別登録を保持する。潜在熱・支持・電磁・表皮条件を可視変形なしに維持することと、runtimeで数値solveすることは別。これらのsolver実装を主張しない。新PHやsupport elementを捏造しない。

|正本規則|コード|観測結果|受入検査|
|---|---|---|---|
|ECodeImplementation.ExecutableECodeBranchRule|runtime WebGPU module/pipeline/submit|画像焼き込みとは別runtime計算|JS pass、実shader/GPU root待ち|
|InferenceExpansionPolicy.AttributeAndActionResolutionRule|既存材質masks/worldAt|元設備の属性具体化、新しい機器なし|原画視認、mask CPU、位置GPU待ち|
|VFX.MultilayerArchitectureRule|narrow/bowl/vinyl/architecture|金属と陶器／ビニルと背景の幅を分離|CPU支持確認、GPU実寸待ち|
|VFX.MaterialOpticalResponseRule|headroom*factor|追加ピークの二重加算抑制、alpha保持|静的式、GPU飽和確認待ち|
|LuminanceDynamicsModule.LDMModeRule|time未使用/PERIOD0|stationary source契約を保つ|CPU/static pass|
|PostEffects.GlobalLocalRule|same-member redistribution|PH3/PH5内の有限局所拡散のみ|CPU source union、GPU OBS対照待ち|
|ObservationIntegrationTemplate.ObservationRegistrySeparationRule|worldAt / extraction / OBS6|worldOFF・OBS OFFを別介入|静的分離、実GPU待ち|
|ObservationIntegrationTemplate.SamplingAndReconstructionRule|native UV / finite PSF / aspectfit|原画geometryと288幅に登録|source native dims pass、GPU待ち|

色はsRGB texture→明示linear decode→material／OBS合成→encode、opaque canvas、原画alpha保持。複数同時発生なし、永続静止loop。reduced motionも同じ定常像。verify音声ゼロ、通常もmap例外ゼロ。__medicalR3のstate/evidence/setEffect/setLayer/setTime/resume/stop API。index?embed=1&verify、effect=off/source=off/world=off/obs=off対照。

CPUとJS構文はGPUコンパイル・画素・品質・公開・本編統合を証明しない。quality=candidate、adoption=unknown/unadopted、ゲーム統合not_run。rootが実WebGPU replayと可視品質を判定してgallery登録／公開を行う。r3+r2の来歴と版を変更しない。
