# Cannon R15：閉じた外殻を持たない、前後に重なる荷電体積

状態 **UNSEALED executable draft**。作者 GPT-6.1-Sol。所有はこの新規フォルダーのみ。GPUコンパイル、実寸画素、普通速度の全寿命、実音、device/game/adoption は `not_run`。CPU成功を材質合格へ読み替えない。

## 受け取った失敗と今回の創作境界

R13 は白帯と橙色平面矢印、細い後縁、OBS長方形で失敗。R14の実寸OFF220は橙色矢印を除き、青い支持域を広げたが、白い中心帯を上下の平行な青帯で囲う casing/pipe に見えた。設計した後方支持・手前返りの遮蔽が投影像で読めなかった。R14レビューSHA `c76e7d60fe61150bad48647e73b24ba59120745afd8da1454ecf13d2f7711283`、OFF220原画像 `e6a3f1356acce07a0fcd5ae0dff6f64ae56d7e2a7234b1e8671da338012c8eb6`。これは今回の反証となる実画素であり、新方式の成功証明ではない。

今回は **beam密度場の構成と投影関係** を創作変更する。R14の開いた楕円殻、一定の内外半径、rim・殻の断面、色帯の配置を継承しない。`material.mjs` は新しい有限体積の重なりを実装する。反復するnoise・粒子・線・輪・色替えではない。積分の24標本とpremultiplied合成の枠組みは技術として継承するため、「E全体／技術まで完全にゼロから」とは呼ばない。過去作とレビューへの創作露出を隠さない。

既存 `validateEvent` / `sampleEvent`、activation造形、手元throat、900/420ms、source/cause/player/frame、endpoint、View16/vertex32B、negative-emission tuple、reducedのage符号、ordinary straight-RGBA branch、音声bytesは保持する。`build-draft.cjs` はR14 effectをversion/comment以外そのまま保持し、新しいmaterial importへ結ぶ。旧beam材質はコピーしない。activation/throatは旧創作の明示的継承であり、今回の創作変更対象外。

## 現行正本と起動

認証済み既存owned checkout `../finish-cannon-r14-creative-sol61-r1/b-source/` の完全読了済み `基底.md` / `拡張.md` を使用する。この回にremote `Codex-honoo`、HEAD、blobを再照合し、PH/PEM、座標/動態、OBS/sampling/共有強度、ECodeImplementation、PostEffects/LDMを再読した。remote/HEADとも `22d3fcfd617f42b1a967de767906204c0221ec64`、基底blob `8f1286e12402fe7b19650ad44bcddb38ad227a08`、拡張blob `f35b61661d0209c0329d4a501a760d35b451d52e`。正本・旧checkoutを変更しない。

ECodeImplementation.ExecutableECodeBranchRule を明示実行時E依頼で起動。WebGPU sourceであり画像prompt/schemaやraster生成を代用しない。VFXはPH1。PostEffectsは明示されたcontextual bloomをOBS1へ限定し `selection.mode=exact_selected_operations`、scope local。LDMは明示VFXから起動し、既存power寿命と各体積の有限包絡へ従属する。world_VFX_gradientは前後の放射差だけ。v1〜v6、f0〜f3、o1〜o9、magic preset、ghost、flare、リング、粒子、texture、画面noise、global veilは採用しない。根拠のないtemperature・衝突・着弾を補完しない。

## PH1 の構造と共有条件

ID PH1、state `declared_fantasy`、category 世界内の有限な supplied charge。実在プラズマのsolverと偽らず、light/plasmaらしい体積・放射のゲーム表現である。Core：供給された強い内部放射。Structure：開いた上側から見える広い奥の体積と、内部を横切る近い体積の重なり。Surface：独立した固体表面を作らず、有限密度が0へ収束する領域。Boundary：登録済みhand、有限endpoint、sourceOFFとexpiry。Medium：宣言荷電体の局所経路だけで、既存空気への物理影響は作らない。

PhysicalModel：有限の軟らかい密度blobを視線深度方向に積分するdeclared model。量は相対density/emission/transmittanceであり、kg/C/K、実粒子数・実電場へ換算しない。ScaleRegime：ゲームの既存投影unit、body64、960×540で1unit=1CSS px。zは前後寄与を定める補助視線深度で、測定済みworld meterでない。可視手掛かりは広い奥支持、手前の遮蔽、内部の放射、源からfrontまでの連続と有限終端。識別限界：静止一枚では移流速度やwhole-lifeを同定できない。CPUのdensity>0は可視深さを保証しない。

StateDynamics：driverは同causeのageとsource供給。frontは210msまで進む。一つの供給状態が源側から先へ移動し、近い体積が局所的に内部へ重なる。330〜420msは既存power収束で終わる。歴史効果・残留・周期格子なし。Instability/recoveryは非適用、追加oscillationを作らない。Evidenceは実GPUの前後重なり、横断面、連続transport/releaseと源OFF/expiry、causal assessmentは未観測 `not_run`。

Optics primary：放射、消光、透過、front-to-back合成。Materials primary：広い密度分布と異なる前後寄与。Fluid supporting：宣言場の一度の供給状態移動、Navier–Stokesや乱流実証なし。Thermo non-applicable（色から温度・燃焼を推定しない）。Electromagnetics non-applicable（実電荷solver無し）。Rheology non-applicable（液体／固体粘弾性無し）。WaveOptics non-applicable（干渉縞無し）。SurfaceScience non-applicable（濡れ・接着・残留無し）。非適用領域はlatent拘束として保持し、架空の見える部品を追加しない。反射・MicrofacetFieldは採用しない。

手とendpointは既存投影座標を同じViewへ変換する。local Xはhand→endpoint、local Yはその垂直方向（既存screen下向きYへの明示適応）、z<0が近側、z>0が奥。actor支持・重力・姿勢は既存actorの所有。新しいbody/poseを生成せず、実床接触/風/重力値を捏造しない。WindCapsuleは静穏な既存媒体、追加gust/shear/turbulenceなし。担体方向は登録済み供給境界で維持される。PEM focus none、PH1は自己境界で成立、PH数のノルマ無し。gaze Aはhand→供給→front、Bは広い奥支持→近い横断体積→見える内部。強い局所白はこの供給と経路へ結ぶ。

## 材質の新しい構成

`section` は front=.08+.92*smooth(shapeAge/210)、movingCenter=1.5*shapeAge/420−.25、幅.19の単一pulseを定める。source0.045u、front0.055uで全体積を滑らかに収束させる。shell・annulus・外側の線を作らない。上下一対の境界線を材質手掛かりにしない。

**奥の広い体積**：z中心+7／半径11、y中心(−6+3*pulse)*envelope、y半径(14+3*sin(pi*u/front))*envelope。中心から境界へ滑らかに密度を下げる楕円体断面で、輪状shellでない。青〜青緑の放射を持ち、上下同じ平行帯で内部を囲わない。

**内部**：z中心0／半径5、y中心(−2+4*pulse)*envelope、y半径(6.5+2*pulse)*envelope。放射値 [35.308,21.372,6.656] は受け入れた強い白入力のまま保持する。内部の太さと経路は供給状態に応答し、常に細い同じ直線に固定しない。

**近い体積**：z中心−8／半径6、y中心(7−9*pulse)*envelope、y半径(7+2*pulse)*envelope。weight .12+.88*pulse なので近い体積は全長の均一な下側casingでなく、一度の供給状態とともに上へ入り、白内部の一部を遮蔽する。上側の近い密度は0になり、奥の広いbodyを露出する。低い青緑放射・高い消光により近さを表すが、不透明な金属板として描かない。

各densityは `smooth(1−qy²−qz²)` の有限支持で0へ滑らかに収束する。rear .38、core .30、near 1.75のdensityを分け、放射も別量で持つ。既存24z標本（−24〜24、2unit刻み）で近→奥へtransmittanceを積分し、opacity=1−exp(−density*.48)。この技術継承は新しい体積の見えを自動合格にしない。近い体積の消光が局所的に白の見えを減らすのは空間遮蔽であり、白入力を一律減光する対策ではない。背景別の補正は無い。

macroは一つの有限供給体、mesoは広い奥体積と近い横断/内部の重なり、microは有限境界featherのみ。反復雲・detachedlumps・surface grid・光るrimなし。frontは同じ体積が先細りになり、別矢印capを貼らない。青のhousingへ見える場合は初期ゲートfail、数式上のnear/rearを理由に押し通さない。

## OBS1、alpha、sampling、音

OBS1 operation_type posteffect、input PH1、target mask同じrear/core/nearの有限支持+4unit、stage既存layer0、premultiplied alpha_blend、局所analytic diffuse spread。レンズconvolutionやghostの物理実証ではない。3体積の位置・半径とnearWeight、sourcepowerへ従属し、rectangular quad allocationを塗らない。rear .025/core .065/near .02、world材質のlayer2より先、throatlayer3。global IntensityBudgetはこの局所予算だけを共有し、別の背景veil無し。保護域は担体外と既存actor、主形/前後関係。境界差と局所極値は保持し、OBSで失敗材質を補わない。

Tuple branchはlinear radiance、premultiplied RGB/coverage alpha、powerを最後に一度だけ掛ける。ordinary straight-RGBA branchのalpha扱いは継承。shader binding、drawcount/stride、Viewは変更しない。世界体積は既存±27quad、OBSは±31quadへ有限に収まる。reduced shapeAge=210固定、power/expiryは実ageのまま。

SamplingContract：native CSS960×540/body64、DPR/backingはactualで記録、拡大図を受入にしない。細いnoise/microを導入せず数px以上の広い構造を選ぶ。実際の24z標本のbanding/ちらつきはGPUで観測する。temporal samplingは普通速度、録画/画像受信間隔をGPU/PRESENT FPSへ変換しない。露光motionblurや後処理AA実行を捏造しない。全寿命は900msactivation、420msbeamの別cause/phaseを分ける。音声は同じ既存event/cause/once契約・exact bytes、通常聴感未実施。verifyは音声0。

## 正本→source→反証の対応

| 正本要件 | source実行箇所 | 実寸で必要な帰結／棄却 |
|---|---|---|
| PHの内外・前後、可視識別手掛かり | section / chargeCloud / chargeSample | 広い奥体積が見える、近い体積が内部を遮る。白帯を上下青帯で挟むhousingならfail |
| density/emission分離、有限前後消光 | opticalSample / chargeRadiance | 強い白と有色volumeが共存。白が強いだけでfailにしない。全部rim/glowのみならfail |
| driver/path/終端、登録済み境界 | exact sampleEvent / section envelope | 同cause手→front、先細り有限、sourceOFF/420expiry。detached装飾・overshootならfail |
| OBS input/mask/共有budget | chargeSpread / tag−1 branch | 有限なsource-localにじみ、矩形境界無し。OBSだけが体積を作るならfail |
| sampling/時間全域 | reducedshape / retained ordinary clock | Nativeでbanding無し、ordinary onset/transport/release。heldだけで全寿命passにしない |
| SFX同原因 | unchanged audio.mjs / inheritedruntime API | 実音/同期はnot_run。PCM/checkだけで聴感passにしない |

最初の反証はcompleted actual OFF220/ON220 body64。広いrearとnear遮蔽をactualpixelsから判断し、casing/flatbands/blobsに見える場合はfailを保存する。通ればOFF28/100/150/280/330/390/420、ordinary onecausefull-life、sourceOFF/reduced/orientation/shortendpointへ進む。現時点は構文と104sampler parity、240有限支持、少数density witnessだけを検査。GPU WGSL/nativewholelife/SFXはnot_run。新稿を公開/採用/合格へ変更しない。

モデル分担：GPT-6.1-Sol 100% — R15新material構成と実行可能UNSEALED契約。旧作者とLuna faithful runtimeの帰属は保持。
