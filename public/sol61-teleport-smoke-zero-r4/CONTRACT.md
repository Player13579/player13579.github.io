# 白煙・高度テレポート ZERO

これは旧 pixel 版の改修ではなく、新規の創作ソースである。キャラの既存原画・pose・UV・alpha は保持する。初期制作の作者は GPT-6.1-Sol。旧版から継承するものは検証済みの技術インターフェースだけで、形状、時間曲線、色、煙、音、shader は新規に作った。

## 確定した動作

上昇下降は手早く演出する。離脱は 0–140 E-ms で地上高度 0 から 0.58 H へ上昇し、白い煙で隠れて消える。到着は 180–320 E-ms で 0.58 H から 0 へ下降し、白い煙から現れて接地する。H は準備済みの実キャラ pose の表示高を world unit に戻した値。H64 では最大高度約37px、通常1×では各140msの明確な一筆の動きとなる。長い浮遊相は置かない。0–140 と180–320の高さ軌道は smoothstep の単調曲線で、端で速度を0へ収束させる。停止中の姿勢を上昇中の立位支持と偽らず、既存 actor の pose を身体全体として運ぶ。

煙の散逸は別応答で、離脱の白煙は500 E-ms、到着の白煙は800 E-msまでに有限消散する。全体800 E-msは**芸術上の寿命**であり、ゲームの位置更新、行動、移動速度、遅延、能力 cooldown、server event 寿命を増やす値ではない。receipt を既に受けた時点の E clock を起点にする。800の実年齢へ wall-time や前回 frame age を代入しない。旧640msや旧departure/arrivalの創作ゲートを使わない。

煙は両端とも中立の白い散乱材で、albedo=(1,1,1)、**煙材そのものの emission=0**。明度の陰影・厚み・透過差で読みやすくし、cyan/green/blackに着色しない。白い不透明の一枚面で覆わず、離脱の立上がり48ms、到着28ms、段階の異なる膨張・上方輸送・密度低下で、複数の丸い量塊と間の薄い抜けを作る。7個の体積 lobe は数の品質目標ではなく、腰・胸・頭の高さと前後の遮蔽を成立させる確定形状である。光輪、glitter、文字、raster は作らない。

## 放射源と白煙の区別・全E発光規則

asset-generation/references/dva.md:63の「すべてのEに…発光源…近傍へ届く光」、quality-completion.md:51の「全Eに発光を実装する」を保持する。BのVFXは非発光材を許すが、白い煙/反射highlightを自己放射と呼び替えてDVA条件の合格にしない。primaryは最新版白煙指示が全E発光を撤回しないと決定し、2026-10-02に**transported silhouette内部の短い中立白sourceとその近傍光**を承認した。今回非発光例外を設定しない。

新しいsourceは同じactorの元alpha内の広い内部maskに束縛し、同じ高さで上下する白いteleport放射である。`sourceAt` の140E-ms内pulse、元sourcealpha/bodyCoverage、mask積分が放射を決める。ピーク設計値4.5 scene-linearはH64の短い白sourceを判読するための初稿で、普遍的な発光上限/白飛び制限ではない。sourceを離れた台座・円・別粒子で置換しない。通常poseの原色を下層に保ち、薄い煙境界/身体の上方移動が白いピークの前後から読める。全白の一枚面に潰れたり短いstrokeが消えるならnative創作failとしてこのsource envelope/密度関係を改稿する。

`ACTOR_WGSL`の元UV/alpha内白放射と同じmask/strength/coverageを、`SOURCE_FLUX_WGSL`の9点quadratureで同frame GPU上で積分する。flux storageはCPU readbackなしにsmoke/nearby shaderへ束縛する。compute→scene/receiver→emission-only→observerを同encoderで記録しqueue順を守る。煙の `localIncident` はその白fluxを距離減衰した入射として散乱し、環境由来の白scatter/highlightとsourceemissionを別量に保つ。近傍の `NEARBY_WGSL` は実receiverのpoint/normal/material/validから距離・面入射・材質応答を計算し、白い照明をscene-linearへ足す。receiverの不存在/未準備を固定平面patchで捏造しない。

選択したOBSは強い実sourceだけの局所光学拡散。`ACTOR_WGSL.emission` が元alpha/maskから切り出す別rgba16floatのsource radianceを唯一の入力にし、`OBS_WGSL`がscene-white=1に対して1.5を越えたsourceだけ、2 logical pxの局所応答に写す。強sourceでない時/源OFF/期限外では0。係数.055は本稿の観測条件で、全Eの上限ではない。全scene明部や煙の白色coverageを源と誤検出しない。main smokeの輪郭/厚みをこのOBSで作らず、光学経路がないlensghostや色差は追加しない。実nativeで局所拡散が不要/過剰/不足ならSolがsource条件とともに見直す;今回その画素成功はnot_run。

## 地面と高度・投影

`from`、`to`、単一可視endpointの ground XY は receipt の immutable 座標。actor gameplay stateへ書き戻す経路を設けない。`projectHeight()` は {ground,height,contactScreen,bodyScreen} を別々に返す。ground→camera→screen の現在の engine 変換を保存し、body の投影だけに `(0,-height*zoom)` を追加する。通常 body の ground-Y を減らす実装、移動ベクトルを北/南へ変える実装、camera移動は不適合。既存 pose に lift/sway がある場合は、最終準備済み transform に新高度を一度だけ足し、cropや原画の骨格を変えない。

local smoke coordinates は `(x,d,z)` = 左右/地上奥行き/高度。局所 orthographic ray は `(x,d,-screenLocalY+0.35*d)`。body は d=0の既存alpha billboard、camera は d<0側。front volume は d∈[-0.9,0]、backは[0,0.9]。床より下のz<0は密度0。これはsourceに束縛した限られた白煙の2.5D体積近似で、ゲーム全体カメラを変更しない。実カメラがこの局所近似と違う場合は ray のbasisを同じ投影へ変更する技術アダプタのみ認め、h曲線/白煙の形は保持する。

順序は既存 environment → source-owned grounded shadow/煙の床応答 → back smoke → 元alphaの上昇/下降actor → front smoke → 既存 observation/encode。線形色、premultiplied alpha、source-over。GPU blend は color/alphaとも srcFactor=one、dstFactor=one-minus-src-alpha。volume transmittanceをalphaとして一度だけ使う。煙を加算合成しない。元atlasは技術 cache の premultiplied texture を同じ samplerで読む。shader `life.x` はRGB/alphaを一度だけ掛ける。最終clipRectは元pose localRect/crop/transformをcurrentviewportへ投影し、heightだけを加える。

ACTOR shaderの `affine0/affine1` は元commandの回転・shearを含む6要素transformをclipへ変換したもの。axis-aligned rectangleへの置換はしない。`life.y` は実resourceの色契約で決める: sRGB-encoded premultiplied rgba8unormなら1として一度unpremultiply→decode→premultiply、既にlinearなら0。format/encodingを準備済みdescriptorとcacheから固定し、不明値を通さない。元alphaを切り抜き直さない。`phaseAt.drawLiftedBody` がtrueの区間だけE actorをdrawし、arrival320以後は通常actorへhandoffする; bodyAlpha=1という連続接地状態の値だけを根拠にE actorを追加drawしない。

`createWebGPUKernels(actualDevice,format)` は新shaderのcompilation messagesをscalar保存し、errorではrejectし、rgba16floatの線形source-over pipelineを作る。ここまでが今回のrunnable創作kernel。bounded hostは実storage/uniformbind、render target、元sampler、exactframe pin/fence、床adapterを接続する。front/back/複数endpointのuniformはframe中immutableな別sliceで確保し、同一bufferへqueue.writeを重ねて全drawが最後の値になる誤りを避ける。

影の中心はground contactから動かさない。高度上昇時は影が薄く広がり、下降時は狭く濃くなる。接触の存在しない空中に硬い接地影を付けない。shadowAlpha/radiusは `phaseAt` の値を既存床の受光/影APIへ接続し、床が未提供なら装飾影を捏造せず影をnot_applicableとして可視高度の別証拠を要レビュー。煙の床に接する厚みはsource volumeそのもので、発光する台座や輪にしない。近傍の白い照明は上記silhouette sourceのfluxから導き、煙の自己放射として加えない。

bounded patchは各endpointの groundScreen を基準として `x∈[-0.95H,+0.95H]`, `y∈[-1.95H,+0.40H]`。時間和はコードの全lobe楕円体の投影和で計算して検証する。viewport/zoom/中間texture寸法が変わったら uniform をそのrender targetのpixel単位で作り直す。logical CSSとDPRbackingを混ぜない。世界からの固有の遮蔽mask/scene depthがある時はそこへ従い、壁を透かす表示にしない。提供が無いpreviewで壁collisionを証明したことにしない。

## 新版の技術 adapter / currentness

R6 `e-clock.mjs` の `validateOwningClock` と raw receipt projection validatorだけを互換根拠とする。新しい `teleport-smoke-height-e-zero` leaseは `durationEms=800, profileVersion=teleport-white-smoke-height-zero`。同一の immutable actor/source clock、room incarnation、session generation、cast ID、transported actor ID、relocation revision、endpoint source IDs、actor identity、pose identity、device/upload version と準備済み GPU owner を保持する。旧 `endpointOnlyEPlan()` は寿命/phase/geometryを含むため呼ばない。`createCausalPairReceipt` をraw validationとして内部time origin0で呼んだ後、wall clockや旧duration/phase値を捨て、正当な owning clock の `atEms` と新profileを付ける。raw validator本体は別入力に複製/変更しない。入力 source whitelist を広げない。

可視片端しか与えられないならその端だけを描く。隠れた対側位置、direction、source ID、private targetを推定・新規fetchしない。paired planはprivacy-approvedの実pairだけから両端を作る。departure snapshotは正当なsource/pose ownerのpinを保持し、authoritative relocation後のground位置へsourceを引きずらない。到着はactorのcurrent arrival一致、alive/非vent/非ejected、currentrevisionを毎recordで確認する。room/session/identity/revision/device loss/source policy変化は取消。通常の同内容snapshot pollはidentityを変えない。

body ownershipはE clockと独立した契約。paired fully-prepared planが元actorの可視bodyを代行するには、current body-replacement ticket + 同じframeの元pose/current atlaspin + 正常recordが必須。`pairedBodyPhaseAt` は権限ではなく要求相のみ。正当なpaired ticket時の通常body抑制は `[0,320)`、その中の140–180はdepartureの正の白煙に属する完全concealed相として両bodyを描かない。到着のordinarybodyをこの40 E-ms間だけ漏らして即再隠蔽しない。arrival接地完了320で同位置・同元poseへ戻す。shadowAlphaは既存shadow alphaへの倍率、shadowRadiusScaleは既存shadow半径への倍率で、接地端ではともに1に戻し連続handoffする。320以後の白煙の散逸は通常bodyを抑制しない。endpoint-only departureはゲームbody抑制権を持たない; previewでdeparture代行が必要なら明示previewactorの局所ticketを別発行する。現行ゲーム側にticketが無ければ本編adoption未完、二重body/強制非表示で成功扱いしない。

`resolvePairedBodyPhase()` を唯一のpaired普通body抑制selectorとする。hostの `provePreparedPairTicket` は同frameのopaque brand、同pair source/privacy、pose/geometry/device/upload pin、current ownership、fresh E age、両端prepared draw可能性を実検証して、凍結された `{kind:'current-prepared-pair-body-proof', ticket, frameId, pairIdentity, validatedEAge}` を返す。booleantrueやready/currentflagは受け付けない。invalid/revoked/別frame/別pair/年齢違い、endpoint-onlyではordinarybodyを残しE bodyを描かない。内部検証exceptionは握り潰さず伝播する。140–180の両body不可視は**この同frame proofが有効なときだけ**。source/nearby/OBS switchやshader enqueueだけが証明を発行する経路は作らない。owner workerはactual host ticket brandとの接続を別acceptanceで検査する;今回の8番目の集中検査はselectorの実関数へのfocused proof mocksであり、native ticketの合格ではない。

async prepareは source/clock/pose/ownerをcaptureし、await後にcurrentnessと fresh owning E ageを再検査する。expired/not-startedは省略、revokedは次pumpへ返す。invalid source/format/currentness破壊はtyped refusal/visible failure、握り潰さない。recordされたreceiptはenqueueだけでvisual-successにならない。実提出のvalidation/submit proofとcurrent sourceでackする。device loss/disposalで新規record/voiceを止め、既存pinsは実frame完了fenceで解放、unsubmitted pinsは即解放する。

## source / nearby / OBS と音

独立 diagnostic は `source=off`, `nearby=off`, `observer=off`, `holdEAge` を明示fixtureだけに許す。`lightingStateAt`を唯一のlighting switch正本とする。source offはsilhouetteの白放射を0、fluxを0、源由来のnearby/OBSを0にするが、teleport因果receipt・短い上下body・環境照明を散乱する白煙の密度/遮蔽・接地影は保持する。source on/nearby offは白source/body/smoke/OBSを保持し、receiverへの白照明だけを0。observer offはsource/smoke/nearbyを保ち局所光学拡散だけを0。source offでbody-ticketを自動失効させない。全E比較を切る `effect=off` は別の全演出取消で、smoke/上下body/ticket/音を停止しordinarybodyを残す。source-only targetを各frameでclearし、OFF後に前frameのradiance/fluxを残さない。holdはE ageを固定してhostがrecordする診断であり、自然再生の質保証ではない。

SFX sourceは `sfxPCM()` の finite mono air-pressure burst。departure170ms、arrival210ms。原因ID+endpoint-role+room/sessionで一度だけ。actor E時刻0/180を共有schedulerでAudioContext時間へ正当に変換し、ACC等でE rateが変わればPCMのplaybackRateと停止時刻もその写像に従う。E停止ではvoiceを停止/保持し新規音を出さない。時刻飛越しで通過したcueを遅れて再生しない。source revoked/死亡/privacy取消/compare/verify/disposeでは新規音0、既存voiceを短いfadeで停止。verifyはhard0で解除不可。再生済みrawbufferはfinite、delay/reverb無限tailなし。音圧値は試聴前の設計値で、聴感合格はnot_run。

## bounded実装分割・受入

primary承認後の新規別stageに、Lunaは (1) 新versioned adapter/owner ticketとprepare-record-currentness、(2) WebGPU actor/smoke/flux/nearby/observer shader、実floor adapter/12-sample volume、(3)新finiteaudio scheduler/診断fixture/単一clock playback、(4)全依存pin/closure/native entry を実装する。creative.mjsのprofile/式/WGSL/音源は無変更で取り込む。raw validation/pose cacheを入力として保護し、旧pixelcreative・shaderimportを依存に入れない。ゲームapp/registry/sceneの採用接続はこのpreview実装と別にprimary承認する。

buffer ABI: smoke Params48B `(rect, optics, source)`。rect=(targetpixel groundX/Y,actorScreenH,depthSide±1); optics=(envelope guard,ambient=.45,sideLight=.35,elapsedSeconds); source=(lightSourceEnabled,sourceCenterHeightH,sourceCenterXH,sourceCenterDH)。Lobe32B×7 `(centerXYZ,density,radiusXYZ,0)`。flux storage4Bはendpoint/frameごとに別確保。Actor96B `(affine0,affine1,localRect,uvRect,life,sourceMask)`。life=(bodyCoverage,sourceTextureEncodingFlag,sourceAt.strength,sourceEnabled)。sourceMask=(.5,.52,.38,.35) はcrop正規化された広い内部領域で、実alphaで必ず切り落とす;解剖学の測定点とは呼ばない。FluxParams48B `(uvRect,mask,sourceLifeArea)`、sourceLifeArea=(strength,bodyCoverage,sourceEnabled,localRectWorldArea/H²×maskSigmaX×maskSigmaY)。ReceiverParams32B `(sourcePositionRadius,enabled)` は既存engine ground/hへ対応した3Dsource centerと.18H radius、enabled.x=nearbyEnabled。receiver vertex shaderは実geometry ownerが `ReceiverIn`へworldpoint/H・normal・linear material・valid maskを渡す。これ以外の白planeをreceiverにして済ませない。ObserverParams32B `(targetSize,enabled)`、targetSize=(実textureW,H,2logicalPxをtargetへ変換したradiusX,radiusY)、enabled.x=observerEnabled。源target/fluxの用途/寿命をsameframe同ownerへ束縛し、source無効時はflux0を書いてtargetをclearする。

source centerは `sourceAt.sourceCenterInCrop=(.5,.52)` を元crop localRect→元pose affine→height追加→同一world/camera投影へ通して導く。単純な `height+.48H` を既存groundOrigin/pose leanと無関係に固定しない。smoke/nearbyのsourcePositionはこの同じ3Dcenterとsource半径から作る。射影による足元と透明paddingを混同しない。geometryがcamera-facing billboardのlocal depthしか持たない場合、d=0の明示近似とし実bodydepth測定と偽らない。smoke uniformのsource.yはこのcenterのz/Hであり、sourceAt.heightHとは別量である。

nearbyは本稿固有の有限領域: sourceから1H以内は距離/入射通り、1–1.6Hでsmoothに0へ戻す。これは全Eの万能上限ではなく、この短いbody内sourceの演出で遠方を照らさないsource-bound近似。光の物理総量の測定と偽らない。表示fitの全時間和は煙の上記patchだけでなく、実actor pose affineのrise/descent和、元alpha内source和+OBS2px、実receiverとこの1.6H領域の交差和も含めて求める。今回のtestsのellipsoid projection boundを全compositionのfit証明と取り違えない。

数値受入は tests.mjs と ACCEPTANCE.json。nativeは固定source H64で同endpoint/camera/背景/ageの0,35,70,105,139,140,179,180,215,250,285,319,320,450,650,799,800をrecordして源/影/前後関係を観察し、通常1×を最低3寿命連続で録画する。quickstrokeを遅いholdだけで判定しない。左右/前後/pose違い、実縮尺、白い床・暗い床上も同source光学条件で比較する。実height値とgroundXYを同frameのPNGへbindし、煙で全bodyが白塊に消えるだけ/地上北へ移動/到着で影が追う/空中長時間停止なら創作fail。nativepipeline/エラー/validation proof、通常SFX聴感、Safari/iPad、ゲームprivacy/遮蔽/所有接続は今回not_run。

reduced motionでもユーザーが要求した実高度の140 E-msの方向とground不動は残す。煙のsecondary drift/foldを弱める技術uniformを別profileへ勝手に変えず、まず本稿の連続broad輸送が実寸で過剰かを評価する。owner workerは同時receiptごとに有限source/flux/target/pin枠を管理し、実採用のschedulerの上限/退役に従う。frameGPU待機を追加して描画を直列化しない。現稿のray-field workはdepthhalfあたり12samples×7lobes×3density評価で、finitepatchに限定してexpiry/source無しではパスを記録しない。技術profileで実測して重い場合は同式のdensity勾配共有などbounded最適化を別承認で行い、lifetime/geometry/visibilityを弱めて隠さない。
