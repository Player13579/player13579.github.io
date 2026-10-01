# action-teleport ゼロ設計 r1

所有はこのディレクトリのみ。創作/契約作者は **GPT-6.1-Sol**。ゲームソース、gallery、公開サイト、採用台帳を変更していない。新しい画像・sprite・texture を生成していない。成果は WebGPU shader source、純粋 artist 関数、SFX score/PCM、B 実装契約、CPU 検査と後段の受入仕様である。GPU shader compile、native、聴感、実イベント接続、品質採用は **not_run**。

着手時の決定は `action-teleport` だけの新規創作、既存転移 E の形・色・コード・README・SFX を創作入力にしない、H64 actualsprite、WebGPU VFX/SFX、全寿命を実装可能な数値で渡すこと。独立した判断は receipt/clock/privacy と actualbody/HDR renderer の境界で、primary が前者を採否、後者は別の core/runtime 担当が実装する。B 正本を先に全読し、E code branch に適用した。

## 形と意味

対向する二枚の浅い直角ゲートを使う。一枚は縦の spine と上下の内向き cap を持つ。暗い青の面には実幅があり、cyan の縁はその面に従う。spine 内の大きな三つの key は接続構造で、粒子や文字ではない。出発は二枚が中央へ閉じて短い seam を結び、到着は中央から開く。新しい輪、紋章、煙、破片、粒子、遠距離の転移経路はない。

幾何と放射の数値は身体基準 H の比で固定する。reference H=64 のとき spine 幅3.52px、cap 厚4.224px、主要 key 幅4.48px、gate 高71.68px。上部は body の後方、下部の接地側は body の手前に分け、同じ geometry/source を分配する。二つの異なる面を「同じ輪郭の色違い重ね」で作らない。中央の開口は実際の負形であり、bloom で作らない。

H は actualbody の登録基準 H64 と host の同じ camera scale から得る。各 animated crop の透明 bbox 高で gate を伸縮させない。sprite の crop/UV/pivot/affine/姿勢を artist が変更せず、実 command の身体を一回だけ描く。物理身長の meter 値は不明であり、H64 と混同しない。

server は転移処理後にイベントを発行する。出発地点に移動対象の身体が残っていなくても正常であり、古い身体の copy/snapshot を表示しない。到着は現在の actualbody と固定 field の交差部分だけに光が届く。身体が歩き去れば field は元位置に残り、身体の受光は交差範囲から消える。E が移動を再実行したり teleport に待機時間を追加することはない。

## 確定した source/clock/privacy

primary 採否済み契約を artist に実装した。

| 項目 | 出発 | 到着 |
|---|---|---|
| type/variant | `action-teleport` / 空文字 | `action-teleport` / `arrival` |
| raw `playerId` | 術者 attribution を保持 | 移動対象 |
| clock/visibility owner | `targetId` の移動対象 | `playerId` の移動対象 |
| field anchor | producer `event.x/y` を固定 | producer `event.x/y` を固定 |
| additional conceal gate | raw caster identity が現在存在し、非self concealed でない | なし |
| actualbody | 起点に現在 body がなければ描かない | 現在 body の actual draw に有限受光を結合 |

両方を receipt ごとに独立して受理し、初回受理時の moving-owner `eVisualTime` を固定する。`ageEms=currentOwnerEClock-startOwnerEClock`。canonical visual lifetime は **760 E-ms**。`targetX/Y` は描画契約へコピーしない。相方 receipt、transaction、遠隔 endpoint を推測・cache しない。`action-heart-teleport` は受理しない。

`receiptSpec` と `ReceiptLedger` は clock を計算せず、host から canonical owner clock を受け取る。既存 app の generic receipt は `playerId` に時計を束縛するので、出発ではその generic caster clock を再利用してはいけない。`eEffectNow` の wall fallback も使用しない。current clock が非有限・逆行・別 session なら取消する。停止 rate=0 は age を停止し、明示 actorTimeScale>12 の VFX は元の速度を維持する。

セッション単位の `seen` tombstone は visual 終了/取消後も保持する。初回 join/history、hidden/sensory/phase 中の歴史的 receipt は tombstone にして後から replay しない。raw wire の list から消えても受理済み visual は760 E-msまで保持できるが、authoritative gameplay/state/duration を延長しない。room/session 終了で ledger 全体を退役する。`live` の上限が必要なら oldest current receipt を tombstone のまま取消し、seen を切って replay を起こさない。seen のメモリは session event 数に比例し、長時間 room の予算は host が計測する。

現在 moving actor は phase playing / alive / not ejected / not inVent / 有限 current x/y が必要。非self invisible は取消、self invisible は許可。departure raw caster は current identity が不明なら failclosed、非self concealed も取消するが、clock を caster へ戻さない。sensory blocked、document hidden、screen closed、room変更、device loss、所有 effect supersession、現在 visibility 不適合で live source を取消し、GPU pending proof/音声も同時に無効化する。privacy 解除後も同じ id を復活させない。

ソース事実: `pushMagicEffect` は unique `magic_` id、丸めた source.x/y、raw identities、variant、`at:now()` を保存する。今回の emit は `durationMs` を指定しないため wire は0。room は直近48件を保持し、この関数には760やwireTTLの期限値はない。batch dedup は departure の target/coords を key に含めず、arrival は targetを含む。従って pair identity の推測はできない。viewer filter は departure の raw caster conceal と moving target conceal の双方でイベントを落とす。current serialized concealed nonself body は x/y/move/aim を削除する。caster/moving の privacy を一緒にしない。

既存 `eVisualTime` は一 frame に一回、frameDeltaを0..100へ制限して displayETimeScale を積分する。explicit actorTimeScale は0以上で上限なし、ACC固定の E override は2。artist が wall delta で別時計を作ることはない。

## 全寿命と輝度

`pulse(a,b,c,d,t)=smooth(a,b,t)*(1-smooth(c,d,t))`、`t=ageEms/760`。すべて canonical E 時間。未来と age≥760 は scene/source/受光/OBS/音を厳密に0とする。

| 機能 | 立上り | 保持/ピーク域 | 終端 | 数値 |
|---|---|---|---|---|
| gate opacity | 0..53.2ms | 53.2..478.8ms | 478.8..760ms | 最大 .72、radiance と別 |
| 開口運動 | 60.8..349.6ms | 到着外へ / 出発内へ | 一回、振動なし | half opening .035..355H |
| rim/key source | 38..121.6ms | 121.6..296.4ms | 296.4..501.6ms | linear core最大5.6 |
| seam source | 228..304ms | 304..334.4ms | 334.4..456ms | linear seam最大8.4、閉口範囲だけ |
| 到着 body 入射 | 106.4..190ms | 190..334.4ms | 334.4..539.6ms | 最大1.65×cyan、交差限定 |
| 足側/床入射 | 83.6..159.6ms | 159.6..364.8ms | 364.8..600.4ms | source最大2.1、floor gain係数 .20 |
| source chroma edge | 167.2..235.6ms | 235.6..357.2ms | 357.2..494ms | source像のみ最大 .55px×.11 |

gate 暗面は linear `[.022,.075,.17]`、主source `[.08,.56,.95]`、seam/key accent `[.55,.95,1]`。放射、面の opacity、密度を別に扱う。field は宣言された非物質機構で、流体密度/熱温度/電荷を捏造しない。白い局所ピークが final display で clip しても、その理由だけで source gain を下げたり background で palette を変えない。過密さは new particle/noise を追加しない設計で避ける。白塊になって primary が読めない場合は native に失敗を記録し、作者/primary が geometry と光学を再評価する。

## actual scene/alpha/color

全働作色は **linear-sRGB / premultiplied / rgba16float**。world shader は premult 面 `darkRGB*a` と独立 radiance を出し、alpha は coverage。sourceSignal は visible radiance RGB / alpha0。source の add は scene alpha を増やさない。body/map の既存 coverage に対する decode と premult conversion は renderer 共通契約で一度だけ行い、この artist で再 decode/encode しない。

`teleportBodyIrradiance`/`receiverIrradiance` は入射 gainを返す。arrival current actualbody pass は `basePremultLinearRGB * (1 + sum(active intersecting teleport irradiance))` を一回描き、body alpha をそのまま保持する。sourceSignal に diffuse body を直接加える契約ではない。Dodge/Heal/Barrier の actualbody も同じ受け手 pass を共有し、teleport 用の body duplicate を作らない。actual body uniforms/UV/geometry が無い場合、仮の人形や fixtureで代替して accepted にしない。

近傍床も host が actual map diffuse/color domain を確定した場合に `basePremultLinearRGB*(1+sum(surfaceIrradiance))` を actual draw 内へ結合する。範囲は event foot近傍に有限、床模様は残す。新しい background render、旧 fixture world/background、全画面 aura overlay で代替しない。map の material domain不明なら runtime受入の未解決 gate とする。

world `solidCoverage` は単なる actor alpha texture ではない。各 layer/sourceより手前にある実 solid の painter-order transmittance を提供する。rear には actualbodyなど前方の solid、front にはさらに前方の solid を含め、source radiance へ **光学より前** に可視性を掛ける。後から body hole を空けるだけで遠方 ghost を残さない。透明 solid は `1-transmittance` を同じ order で合成する。どの actorが誰より手前かは actualscene の順序で host が解決する。光源が覆われれば owner の bloom/ghost/fringe も減る。

world fragment は MRT scene/sourceSignal。scene への blend は premult alpha-over (`src one, dst one-minus-src-alpha`)、sourceSignal は radiance add / alpha保持。sourceSignal は per owner receipt で0clearして出発/到着とも独立。rear後に actualbody一回、front後に optical passes。地面受光は actualmap draw内へ事前に関数を結合する。`scene` の光学 finish は読み取り scene Aと書込み scene Bを分離し、同texture read/write をしない。最終 renderer だけが一回 sRGB encodeする。tone mapping、再toneMap、per-ownerclipping、gain補償なし。

world source: bindings0 U(96bytes)、1 solidCoverage。post: bindings0 U(64bytes)、1 perowner signal、2 blurred signal、3 linear scene、4 sampler。full-screen triangle を共有。各MRT targetformatはrgba16float、solid coverageはhostcontractのscalar coverage。blur1はsignal→blurA、blur2はblurA→blurB（postbinding1を切替）、finishはsceneA/sourceSignal/blurB→sceneB。sceneA/Bとshadowcoverageのleaseはrenderer owns、source/blurA/blurBはreceipt-domain owns。各shader entry は `vs`/`fs`、post `vs`/`blurFS`/`finishFS`。

## 観測補完の選択

OBS1 は perowner の遮蔽済み sourceに2axis kernel を適用する有限 bloom。kernel重み和1、出力gain .16。primary幾何を作らず、body/map/HUD を blur input にしない。

OBS2 は左spine中央keyの現在可視radianceを source foci とする一個の弱い直角開口 ghost。source→image center の軸へ `.23` 移し、power4のぼけた開口像、係数 `.027`、coatingbias `[.65,.80,1]`。screen/lens OBS で world物体ではない。fociもowner固有。visibility済み sourceが0ならghostも0。source未確認の遠隔 ghost、別ownerの光で代用しない。

OBS3 は digital 接続の source像だけを横に最大.55pxずらし、差分の11%を加える。身体と背景のRGB/alphaを色ずらししない。source境界の表示操作として登録し、世界内WaveOpticsや電磁物理を偽らない。

veil、広いstreak、grain、scanline、glitch noise、pixel dissolve、複数虹色ghostを候補として検討したが、この primaryは直角面と開口の時間構造で成立するため採らない。弱く多種類を均等に塗るより、source geometry/光学経路/実H64に対応する三つを選んだ。選択数を品質点数へ変換しない。

## SFX score と再生境界

`sfx-score.mjs` が新規波形を生成する。mono 48kHz、760ms、departure 920→270Hz、arrival 270→920Hz の解析指数 chirp、1.71倍の薄い非整数 overtone。departure 300 Ems / arrival 152 Ems に34msの電気的 latch。連続音の gain .15、latch .075、24ms onset、terminal0。noise/既存音源/音楽/セリフなし。CPU生成 WAV は確認用で、聴感 PASS ではない。

各receipt causeにvoice authorityは一つ。初回描画record/submitは非同期GPU proofを待たず次frameへ進める。版別SFX/accepted証明だけ、error scopeとsubmitted completion成功後に現在visibility/session/device/generation/receipt有効性を再評価する。完了時の canonical age を音のoffsetに使い、遅延した旧frameのage0へ戻さない。first valid proofが届く前に source cancelled/expiredなら無音。pending proofはrenderer契約の上限に従いboundedで、old currentness失敗はaccepted/SFXなし。

0<rate≤12は canonical PCM offset秒と正確な playbackRate で再生。rate=0はvoiceを停止/休止し、復帰時は現在Eoffsetから同cause authorityを継続する。rate>12は**無音**とするがVFXclockを12にclampしない。対応外でwalltime再生やevent延期をしない。mute/verify/hidden/sensory/dead/conceal/cancelは無音、verifyは解除しない。初回受理がmute/履歴で無音だったcauseを後から最初から鳴らさない。rate変化時のphase合わせはruntimeがcanonical ownerclockとAudioContextの差を確認し、再開始しても同causeの現在offsetのみ。全voiceのAudioContextを勝手に止めない。

## 同時発生、reduced motion、寿命/リソース

二人/同一対象の異なるreceiptでもsourceSignal/foci/uniformは独立。lighting は actualbody/map一回内でactivefield入射を加算、scene合成はactual painter order、各owner opticsが自身のvisible sourceだけを読む。combined HDR energyをowner別にclampしない。独立光源の物理的cross-field吸収など未宣言相互作用を追加しない。

reducedMotionでは出発opening=.035H / 到着opening=.29H、skew=.075H固定でgateの移動を止め、source chroma shift0。variantごとの入射/閉口seam eligibilityとdistinct pulse/terminalは保持する。bodymotion自体のreducedmodeは既存body ownerが決める。SFXはユーザーaudio/mute policyに従う。reducedmodeもvisibility/canonical ageを同じ契約で扱う。

resizeは同deviceの新 viewport-generation leaseで再packし、eventworldanchor/clock/causeは維持する。旧frameproofをそのまま新版acceptedへ流用しない。旧targetは参照中GPU submission completion後に一度だけdestroy。device lossは所有receipt/proofs/audioを取消、renderer deviceをartist/receiptがdestroyしない。room/session/hide/privacy取消は再生不能tombstoneを残し、借用map/body/renderer-owned targetをdestroyしない。WebGPU uniform値を二つのownerへ途中でoverwriteしない。性能/iPadは未測定で、MRT+perowner2blurの費用を実nativeで評価する。未計測で性能合格を主張しない。

## B 正本とコード対応

canonical `player13579/B` / `Codex-honoo` を authenticated Git で取得。commit `22d3fcfd617f42b1a967de767906204c0221ec64`、base blob `8f1286e12402fe7b19650ad44bcddb38ad227a08`、extension blob `f35b61661d0209c0329d4a501a760d35b451d52e`。基底1889行/拡張1061行を全読し適用。source-b は正本証拠であり creative image/code inputではない。正式なImage/Videoシリアライズを生成していないため `B-Expression-2` modeや `render_requested` を偽装しない。E branch の executable後段成果。

`b-code-contract.json` は3完全PH/8domain各、OBS3、typedlinks、WindCapsule/Gravity/座標、PEM/PEV/AES/CCM/Reflection適用性、VFX層、LDM、Post、E-code、検証層を記録する。PH1=gatefield、PH2=actualbody、PH3=既存近傍床受光。domain名やPH数で質を水増ししない。不適用Thermo/Fluid/charge等はlatent理由付きで残す。BeautifulPoseCapsule/CharacterPolicyは existing movingActor を引数とする拘束であり、runtime時に実PoseType/支持・姿勢を解決する gate を残す。未知human属性や未確認standing poseを固定しない。この未解決host入力とnative未観察のため総合specはWarning、renderはNotRun。

| 正本要件 | ソース | 実行時帰結 | 現在の検査 |
|---|---|---|---|
| declared因果/主形/境界 | `sampleArtist`, world `gate/fs` | 開口とspine/capがglowなしで存在 | CPU motion/終端PASS、GPU not_run |
| fullPH/8domains、PH/OBS分離 | `make-b-contract.mjs` | field/body/floorと光学の別責務 | 構造PASS、material/pose binding Warning |
| scope/alpha/color | world `fs`, `teleportBodyIrradiance`, post `finishFS` | body1draw、radianceとcoverage別、最後encode1回 | CPU sourceguardPASS、actual scene not_run |
| OBS source/遮蔽 | world `solidCoverage`, post `boundedSample(signal,foci)` | covered sourceのremoteghostも消える | source構造確認、native not_run |
| distinctLDM/全寿命 | `sampleArtist` | core/seam/body/floorの異なる時相 | 0.5Ems sweepPASS |
| sourceid/time/音1cause | receipt helpers / `audioPlan` / score | movingowner clock、760Ems、rate0/>12fallbackなし | CPU privacy/phase/PCM PASS、game/聴感 not_run |
| Sampling/reduced/overlap | uniform pack / post blur | actualH64、owner独立、reduced位相保持 | CPU packPASS、縮尺native not_run |

## 次runtime担当の具体的受入

供給するmoduleは artist/world-shader/post-shader/sfx-score。`cpu-check.mjs`、`make-b-contract.mjs` はNode実行検査/契約生成。WAVはscore再現物。DESIGN と b-code-contract は造形改稿の代用品ではない。後段担当はこの sourceを忠実に実行し、不能なactualbody/HDR/coverageを作者へ報告する。fixtureのbody/bgをmainへ重ねたり再toneMapしてartist lookを変えない。

1. Same-device WebGPU compile全entry、MRT format/attachment/alpha blend、borrowed actualbody/map domain、ownedlease/generationの検査。JS syntaxだけでGPU compile PASSにしない。
2. 明暗・有彩 actualmap、actual H64 sprite、通常姿勢と実Dodge、arrival歩行away、departure body不在。各layer単独と全部合成、寿命0/40/120/200/300/350/500/650/759/760Emsでprimary/光量/終端を観察。fixture人形での成功はactual受入に数えない。
3. 二人/異なるoffset/互いに重なるfield、同対象異なるreceipt、rear/body/front交差、opaque/transparent foreground、imagecenter/corner/edgeでfociと遮蔽済みsourceを追跡。隠れたsourceのghost/blur残留なし、bodycount1、owneruniform混線なし。
4. H32/48/64/96、DPR1/2、30/60fps、rate0/.15/1/2/12/>12、ACC固定2、midratechange、reduced。高rateで見逃すphaseは標本化限界を記録し、visualclock速度を黙って変更しない。
5. unique receipt/departure+arrival各、batchdedup、wire0duration/listから早期消失、duplicate/joinsnapshot、session再入室、caster/moving concealとself例外、phase/dead/ejected/vent/sensory/hidden、missingcaster、lateGPUproof、resize/device lostを検証。取消で音/accepted/framecacheが復活しない。
6. actualbody receiving: body premult/UV/crop/affineが同一draw、fieldはevent位置固定、bodyが出れば受光だけ消える。actualmap diffuseは元pixel/geometryと同draw、farfield不変。material/domain不明を推測でPASSにしない。
7. SFX音を実聴し、arrival上昇/出発下降、latch時相、PCM終端、同cause音1authority、重複音なし、rate変化/0/>12/音mute/verify/late proofで再生offsetを確認。CPUwav生成だけで聴感合格にしない。
8. native/API証拠を版hash/device/route(`verify`必須)/H/clock/scene状態と保存。ownedtab/testserverをcleanup。quality adoption/main integration/public acceptanceを別欄で記録する。

現状は純CPUの9契約PASS、B構造PASS。native/GPU/audio/main/gallery/publicの accepted は一つも付けていない。source snapshots/hashは `manifest.json` と `SOURCE-EVIDENCE.md`。作品のcurrent authorship/adoption表示は後段primary責任。

モデル分担: GPT-6.1-Sol 100% — この新規E創作・source契約・shader/SFX・CPU検査・設計文書。source-b正本の作者を本E作者へ再割当しない。
