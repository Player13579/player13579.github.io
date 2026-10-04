# Cannon R16：広い荷電体と偏った高温経路の投影分離

**UNSEALED executable draft**。作者GPT-6.1-Sol。所有はこの新規フォルダーのみ。actualGPU/shadercompile/native material/full-life/normalSFX/device/game/adoptionはnot_run。実物の温度・SI物性が分かったという意味で「高温」を用いない：ここでは強いhotpath放射のゲーム上の呼称。

## 決定と再利用境界

R15のactual thinwhite/upperblueborder FAILを保存したまま、先にpack/quad/光路/blendを診断した。詳細はMECHANISM-DIAGNOSIS.md。geometry縮小・alpha二重乗算の証拠はない。二重cloud重みとrear/coreの投影重なり、white入力に比べ不足する可視遮蔽が選んだvolume cueを消した。今回は **投影関係と放射/消光の契約** を変える。

R15の3つのsoftblob、24z標本、OBS analyticspread技術を派生入力として使う。過去設計への露出とこの創作再利用を明示し、完全ゼロ稿と呼ばない。一方、hotpath/body位置、光路量と積分、近bodyの横断は今回のSol判断。旧shell/rim/casingを復活させない。

validateEvent/sampleEvent、900/420ms、source/cause/player/frame/endpoint、View16/32B、quad±27/OBS±31、tags−1/−2、encodedreduced、activation/throat、音声bytesはそのまま。build-draft.cjsがR15effectをversion/comment以外保持して新materialへ結ぶ。E全体の創作が新規ではない。強いwhite入力ベクトルは数値不変だが、旧source-functionに混在した解釈を新j光路源へ定義し直すため、物理的なabsoluteintensity同一と偽らない。

## 正本と拡張

完全読了済みのowned canonical B checkout `../finish-cannon-r14-creative-sol61-r1/b-source`を使用。この回に認証remote/headを再確認、PH可視因果/MaterialResponse/PhysicalModel、ECodeImplementation、OBS共有強度とsampling、PostEffectsを再読。remote/HEAD22d3fcfd617f42b1a967de767906204c0221ec64、基底blob8f1286e12402fe7b19650ad44bcddb38ad227a08、拡張blobf35b61661d0209c0329d4a501a760d35b451d52e。正本は変更しない。現行E品質section5も再読し、source数値とactualexpressionを区別する。

ECodeImplementation.ExecutableECodeBranchRuleを明示runtimeE依頼で起動。WebGPU sourceのみ、画像prompt/generationは無し。VFXはPH1、contextual bloomだけがOBS1としてPostEffectsのexact_selected_operations/localに起動。LDMは明示VFXと既存power時間へ接続。world_VFX_gradientはbody/core/nearの放射差。v1〜v6/f0〜f3/o1〜o9/ghost/flare/magic/粒子/輪/texture/noise/globalveilは採用しない。規則名やlayer数を遵守の証明にしない。

## PH1と共有条件

PH1はdeclared_fantasy、手から有限endpointへ供給されたcharge body。Coreは偏った強放射経路、Structureは広い奥bodyと局所的に横断する近charge、Surfaceは密度の有限soft境界（独立固体面無し）、Boundaryはhand/endpoint/sourceOFF/expiry、Mediumは局所宣言場。追加衝突・着弾・火・受光・receiverは入力無しで作らない。

PhysicalModelは相対j（放射源/光路）とsigma（消光/光路）の前後積分。ScaleRegimeは既存body64、CSS960×540で1worldunit=1CSSpx、zは補助視線深度で実meter/K/kg/Cでない。入力が現実plasmaの電磁/温度solverだと主張しない。可視cuesはbroadcoloredchargebodyの内部勾配、hotpathの偏位と遮蔽、同cause源→有限front。識別限界は静止で速度や全寿命を同定できず、RGB nonzeroは読める厚みではないこと。

StateDynamics：同age/sourceがdriver、front210msまで進行。一つのpulseが源から先へ進み、nearbodyのweightを変え、hotpathとの可視重なりを移す。330〜420msに既存powerで収束。反復pulse、履歴、noise、instabilityは追加しない。CausalAssessmentはdeclaredmodel、actualevidence not_run。Evidenceはnativebody/core/nearの投影差、ordinary輸送とfiniteboundary、sourceOFF/reduced/expiry。receiver無しなので多チャネルhubを数のために作らない。

Optics primary（独立j/sigma・transmittance・premul）、Materials primary（広いchargeのdensity差とnearocclusion）、Fluid supporting（宣言場の一度の輸送だけ、実流体solver無し）。Thermo非適用（色/呼称から実温度無し）、Electromagnetics非適用（電荷fieldsolver無し）、Rheology非適用（実粘弾性無し）、WaveOptics非適用（干渉縞無し）、SurfaceScience非適用（濡れ/接着/残留無し）。非適用領域はlatent拘束。反射/MicrofacetField無し。各領域の欠落を偽の装飾で埋めない。

LocalX hand→endpoint、LocalYその直交(screen下向き既存座標への明示適応)、z<0near/z>0rear。Viewは同actorとendpointを投影。既存gravity/bodyfloorposeはactor所有、追加姿勢・床力・SI条件を捏造しない。WindCapsuleは既存静穏媒体、gust/shear/turbulence無し。供給境界が担体方向を拘束する。PEM focusnone、PH1は自己境界で成立、gazeA源→body→front、B広いbody→偏ったhotpath→near横断の差。単独peakを源と時間へ結ぶ。

## 新しい投影と光路

sectionはfront=.08+.92*smooth(shapeAge/210)、movingCenter=1.5*shapeAge/420−.25、pulse幅.18。source .04u/front .055uで全体を収束させる。bodyはy中心−7+2pulse、半径14+3sin(pi*u/front)、z中心+9半径9。hotpathはy中心+7+1.5pulse、半径4.5+.5pulse、z中心+1半径4。これらのy位置はenvelopeを掛けて源/frontへ収束し、通常断面では **hotpathを下側へ偏らせ、broadbodyを上方に露出** する。上下対称な白縁付きtubeにしない。

nearbodyはy中心2+2pulse、半径10、z中心−9半径7、weight .12+.88pulse。pulseの位置でhotpathの上側〜中央を横断する。深度supportはcoreとほぼ分離し、近extinction域内にwhiteemitterが大きく入り込まない。近bodyは全長のsolidcasingでなく一度の供給状態の可視応答。opening自体を全beamの物理必須条件とせず、今回のbroadbody+偏位path+近occlusionを投影目標にする。

各blobはsmooth(1−qy²−qz²)。sigma=.14body+.12core+3.8near。j=[.035,.20,.52]body+[35.308,21.372,6.656]core+[.20,1.50,2.50]near。24cells、ds=.48、opacity=1−exp(−sigma*ds)、path=(1−exp(−sigma*ds))/sigma（sigma≈0でds）、RGB+=trans*j*path、trans*=1−opacity。これはemissionにopacityを再度掛ける旧契約と異なり、jと消光を独立にする。white値は減光しない。近bodyの光路で局所的にその内側寄与を遮ることとglobalwhite減光を混同しない。

出力RGBは前後の積分済み寄与、alphaは1−trans、powerは最後に一度だけ。既存premultiplied blend one/one-minus-src-alphaに合わせ、再alpha掛け禁止。作業radianceは相対線形モデルだが実表示のphotometric校正値ではない。既存directcanvas出力/ordinarybranchを維持し、背景別補正・tone/gamma操作を新規追加しない。preferredformat名とalphaMode/blendのactualreceiptを次runtimeに記録して、実display経路を可視判断から消さない。RGB>1は強い放射入力に許され、whiteclippingの回避を創作目標にしない。

macroは一つのbroadcharge、mesoは偏ったhotpath/near前後と有限front、microはsoftboundaryのみ。薄いwhite帯＋bluefeather、均一青plate、housing、detachedblobへ見えるならnativefail。CPUでnear透過率が低いことをactualocclusionpassへ読み替えない。

## OBS1・sampling・時間音

OBS1 posteffectは同body/core/near support+4unitの局所analyticspread、inputPH1、stage既存layer0、premultipliedalpha、保護域は担体外/actor/主shape。body .028/core .065/near .02、envelope/sourcepowerに従属。既存OBSのshape追従技術を継承、globalbudgetはこの局所範囲のみ共有。lensghost/convolutionの物理実証とは言わない。worldlayer2とthroat3。OBSだけで厚みを作らず、rectangularallocationを塗らない。

SamplingContractはCSS960×540/body64、actualDPR/backingを保存、世界支持±27/OBS±31。24光路cellは有限近似でbanding/flickerはnativeで判定。noise/microAA/露光motionblur無し。ordinaryspeedで全寿命とactualgapを観察し、スクリーン受信間隔をpresent/GPUFPSにしない。reducedshapeAge210固定、power/expiryは実age。同原因の音声exactbytes/once契約を保持し、実音/同期はnot_run。verify音声0。

## 正本→実装→反証

| 要件 | 実装 | Native反証 |
|---|---|---|
| 主形/内外/前後/cue | sectionの偏位body/core、chargeCloud | broadbodyがbluefeather/flatplateだけ、hotpathとnear重なりが読めない |
| j/sigma/放射消光 | opticalSample/chargeRadiance | 数式は成立しても薄いwhite帯へ退化、material差無し |
| driver/境界/時間 | exactsampleEvent、pulse/envelope | 源からdetached、有限front超過、releaseで意味を失う |
| OBS input/mask/budget | chargeSpread/tag−1 | 矩形、source外独立光、OBSが失敗bodyを補う |
| 色/alpha/sampling | tuple output、24cells、premul runtime | 二重alpha、banding、実寸不読。actualformat/blendを記録 |
| SFX同原因 | unchangedaudio/adapter | 実音未実施をoffline/verifyでpassにしない |

初期actualgateはcompletedOFF220/ON220、sameframe/cause/requested/sampleage/settings/completionをbefore/afterで記録。薄いband/housing/plateならfailを保存しcreativeへ戻す。支持された場合だけOFF28/100/150/280/330/390/420＋ordinaryonecausefull-life、必要なsourceOFF/reduced/orientation/shortendpointへ。GPU原寸と全寿命/聴感が未実施なので現時点で合格/採用/公開は無し。

作者checksはsyntax/104exactsamplerparity/240bounds/独立bodywitness/nearTauと36小断面のfiniteだけ。大規模CPU画像・非零画素点数でqualityを証明しない。

モデル分担：GPT-6.1-Sol 100% — 機序診断とR16創作光学/投影契約。旧Sol/Luna source/runtime歴史は保存。
