# 医療室VFX原画r4 + WebGPU環境E r2

所有はoutputs/request-20261001/medical-vfx-r4-environment/r2と公開正本public/sol61-medical-vfx-r4-environment/r2のみ。r1と原画・履歴・採用・gallery・本編runtimeは変更しない。初期candidateの公開／GPU品質はrootの担当。

創作担当はprimaryが現行Solとして割り当てた担当。要求identity gpt-6.1-sol、localcatalog表示名GPT-6.1-Sol。worker自身のruntimeはmodel/list・model環境変数・list_agentsにmodel identityを露出しないので、task名から実モデルを推定しない。primaryがspawn設定と照合する。catalog provenance: C:/Users/user/.codex/model-routing-state.json、updated2026-10-01T00:36:01.2797734Z。実行境界never/danger-full-access、config一致は同タスク開始時確認済み。

## 原本・最新契約

画像r4は1164×1351、SHA-256 9f3fe2fb6772daa8104dcf97abe1bf87e5254a17af4c629dd0d3b5d7088ffa7e。無変更コピー。画像生成コードB-design-code-medical-VFX.py SHA8cf8d6fe6c3359625512d994451016623311e417522b836228d609c70da26232、WORKFLOW.json等は元folderに保持。画像側のVFXは焼き込み第1段階で、ここで別途描画するEの存在・品質を証明しない。r2は画像編集／生成でなくruntime WebGPUコード第2段階。

現在B正本: authenticated Git outputs/request-20261001/b-observer-variety/repo、player13579/B / Codex-honoo、commit22d3fcfd617f42b1a967de767906204c0221ec64、base blob8f1286e12402fe7b19650ad44bcddb38ad227a08、extension blobf35b61661d0209c0329d4a501a760d35b451d52e。ECodeImplementation分岐を適用。単なるcode存在・微小差は可視品質合格にならない。画像生成用modeやSTRUCTURAL_PASSでEを偽装しない。

ユーザーは未指定位置も部屋に合うEを許可し、白飛び回避を撤回した。r4 image-onlyのt_ref0／OBS6 tiny kernel／.97 ceilingはその原画設計の記録として保全するが、新E全版のEquality ceilingへ輸入しない。新r2は独立したsource／receiver／OBS予算を設計。全体に同じ色を薄く加える補正ではなく、実際の狭い反射源とそこからの局所応答を明確にする。

## 原因と読ませる現象

入力源PH6は原画の既存上方拡散4600K相当照明。画面外源のvisible fixtureは追加しない。PH3寝台の曲がった銀色rail／下枠、PH5蛇口がこの光を反射する受動面。新しい器具、扉光、水、湿り、粒子、caster、機能は追加しない。

主読解は寝台右railの短い強い反射と近傍への光。第二は下railの横方向反射、第三は小さな蛇口の反射と陶器の広い肩。同じ色・同じ形の重ねではなく、細い反射中心、広い近傍受光、source-bound observerPSFに役割を分ける。金属を電気照明に変えるのではなく、反射放射の局所ピークとして描く。

PH3右rail中心(574,580)、core幅3.6×55native px、peak6linear RGB。下rail中心(468,1016)、core44×3.2、peak4。PH5蛇口中心(893,138)、core6×12、peak3。追加radianceはheadroom(.97-b)に拘束しない。既存textureを常に保持した上に、各材質reflectionの有限増分とnearby lightを加える。物理的に画像反射成分を抽出して完全置換したものではない。元sourceの白ピークだけを重ねる失敗を避けるため、近傍とobserverの別経路を見せる。SDR canvas変換で局所白飛びは起こりうるし、それだけを失敗にしない。部屋全部やmain形が白い塊になる場合は別品質欠陥としてレビューする。

PH1床の受光は右railから右床中心(636,590)、sigma72×113、peak.24と、下railから下床中心(468,1108)、sigma93×76、peak.18。receiverはbed/contact除外mask外の乾いた床だけ。曲面／縁のreflectionが既存近傍面へ届くという2D経験的モデル。照度・BRDF・反射角・globalenergyを数値solveした主張はしない。PH5陶器は(945,235)の広い37×32native shoulder、peak.38、排水口は保護。ビニルの弱い青灰response、左rail、露出脚上部、収納、壁の弱い受光は主読解の背景として留める。

時間／camera:定常照明と静止receiverなので今回はstationaryを選択した。Image t_ref0をあらゆるEの停止規則と扱った結果ではない。動的source/cameraが未宣言の状態で、点滅・走査・粒子を足してEの存在を偽装しない。params.timeは未使用、PERIOD0。reduced-motionでも同じ像。もし実camera角やsource強度を連動させる後続設計を作るなら、その原因入力とgeometry／observer条件を別に明示する。

## PHとOBSの分離・光学判断

world fieldはreflectedCore／ceramic／vinyl／architecture／nearbyを別計算。OBS1は同じ登録reflection sourcesへ束縛したanalytic Gaussian PSF。source peak6×weight.05=PSFpeak.30、下rail4×.0575=.23、蛇口3×.066666667=.20。PSF sigma右rail27×74、下rail62×25、蛇口24×26native px。at288幅の右rail横sigma6.68pxで、r1の.75pxより明確な局所肩を設計した。lightの存在をnoiseや全画面washで隠さない。

このOBSはdisplay/observer transform、world volume hazeや新particleではない。source・座標・強度をPH3/PH5に共有し、光源色1,.965,.89を保持。有限室内maskで外の白背景へ流さない。固定lensghost／虹／光条を無条件追加しない。強い実reflection入力に必要な近傍PSFを採用するのでPostEffectsを選択し、一般的に全Eで同じPostEffectsが必須という扱いはしない。analytic PSFは測定lens／厳密energy conserving convolutionではない。元r4micro再配分のみとは異なる新OBS契約。

sourceOFF／worldOFF／effectOFFは新PHとOBSを全停止して同じtexture sampleをそのまま返す。observerOFFはreflection／nearby physical lightを残しPSFのみ除く。worldとOBSの同じsource原因を診断できる。sourceがない独立glowは描かない。alphaは元画像保持、表示canvas opaque。sRGB texture→linear decode→world/OBS radiance加算→encode、独立.97 capなし。WebGPU preferredformatへのSDR変換はHDR放射の保持・実色管理受入を意味しない。

## 実像の座標登録

原画左上native pxで登録。右rail x569..580,y443..994、下railx355..570,y1006..1026、左railx336..349,y440..994。露出脚上部x350..363／560..573,y1020..1038。蛇口x884..903,y111..191。陶器x795..977,y188..286、排水口(885,235)18×17。ビニル上x357..563,y430..550、下x358..563,y572..990。床x183..974,y358..1252、寝台／接地除外x323..603,y394..1100。収納x206..479,y117..253からトレー等を除外。壁leftx146..169,y350..1247と上x156..977,y59..99。OBS室内x139..1019,y58..1256。新2D maskは原画のgeometry手掛かりから登録した設計値、metric／normal実測ではない。GPU actualmaskとnative位置確認は未実施。

## 完全PH構造と適用領域

PH1床、PH2壁、PH3寝台、PH4収納、PH5手洗い、PH6既存照明を元codeのidentityに対応させる。DeepStructure=source→実材質→finite receiver／open observation、GeometryConstraint=上記maskと接地保護、PhysicalModel=2D投影reflection／receiver近似、ScaleRegime=native pxと288幅fit、StateDynamics=定常input/receiver、PerceptualReadability=源／近傍光／PSFの幅分離、Couplings=PH6.Optics→PH3/PH5.Optics→PH1/PH5.Optics、CausalityLinks=一方向world physical influence、Evidence=localgradient/source除去/observer分離、SurroundingChanges=床／陶器radiance、AcceptanceCriteria=actualgalleryサイズで源と近傍作用が読める、FailurePatterns=screenwash／ただのgrade／微小differenceのみ／false equipment、BeautyStructureApplication=material_response(細い金属と広い陶器)・contrast(源と近傍の段階)、VisualProjection=原画geometry保持/源の放射とPSF増分を分離。

八領域は元PH別宣言を基準に保持し、visible simulationとlatent条件を区別する。PH3/PH5/PH6 Thermo applicable/latent(吸収光等温近似の熱流)、Fluid not_applicable/latent、Optics applicable/primary。Materials PH3/PH5 applicable/primary、PH6 not_applicable/latent。Electromagnetics PH3/PH5 applicable/latent、PH6 applicable/supporting。Rheology PH3 applicable/supporting(静的ビニル条件)、PH5/PH6 not_applicable/latent。WaveOptics3者not_applicable/latent。SurfaceScience PH3 applicable/supporting、PH5 applicable/primary、PH6 not_applicable/latent。PH1/PH2/PH4は元登録を参照し、熱・支持・電磁を数値solveしたと主張しない。

起動拡張VFX／LDM／selected local PostEffects／ECodeImplementation。未指定v1..v6／Magic等を装飾として起動しない。新source emit apparatusなし。VFX.MaterialOpticalResponse→field core/material別幅、VFX.MultilayerArchitecture→world/receiver/OBS分離、ObservationRegistry→bloom別field、LDM→定常source/no blanket白上限、SamplingContract→native同aspectfit/PSF galleryサイズ、ECodeImplementation→WebGPU実コードとCPU/GPU/quality別記録。

## 検査・納品境界

CPU/staticはoriginalbyte／nativePNG寸法、sourcepeak>1、receiver support／contact除外、PSF縮尺、source/world/effect除去、OBSOFFでworld保持、time変調なし、headroomcapなし、WebGPU必須／2D/audio不在、JS構文を検査。これはGPU compilation、実sourcepixel、actual288幅/roomfitの可読性、sourceの自然さ、複合白飛び、品質合格を証明しない。rootがowned verify URLでOFF/ON/OBSOFF/SOURCEOFFのnative比較を行い、適切な表示で追加Eが判読できるかを評価する。未実施はnot_run。candidate/unadopted、geometry/game integration未受入。

map SFXはユーザー最新例外によりnone。AudioContextなし。画像生成なし。browser/server資源をworkerは作っていない。gallery反映・公開はrootの技術replayと品質状態登録を待ち、packageだけでユーザー画面更新完了とはしない。
