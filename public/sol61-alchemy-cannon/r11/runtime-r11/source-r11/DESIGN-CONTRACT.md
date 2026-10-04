# Cannon R11：連続charge sleeveと移流する返り面 — UNSEALED DRAFT

作者・品質判断担当は GPT-6.1-Sol。所有はこの新規フォルダのみ。root に許可された R10/R9 派生改稿で、zero-input ではない。R9/R10原本、共有catalog、adoption、本編、公開物は変更しない。現在 runtime は danger-full-access / approval never（先の同task startupで確認済み）。B loader の差分例外を継続適用し、full-B/schema合格は主張しない。今回の未決部分は実投影に残る材質構造であり、通常の忠実移植より創作判断が必要なためSolの担当を継続。native移植・検査はprimary/別runtime担当へ渡す。

## 実画像と原版の値から決めた改稿

R9 native ON/OFF220 と R10 native ON/OFF220/expiry420 を各原画像で確認した。R9は広い白い共通本体を作れたが、内部の材質・前後は外周の起伏から分離していなかった。R10は開口を作れたが、白/シアンの規則的な交差リボン格子になった。root の R10 `ROOT-LIMITED-QUALITY.md` とも一致する。強い白そのものを欠陥にしていない。

R10原版は三foldのphiを0/2.094/4.189、thetaを6q+phi+.42sin(3q)とし、center/depth/widthが連動して交差する。各faceのalpha=.94、white=(.08+13.5,.72+7.5,.46+2.1)×2.6、back=(.10,.82,.97)×2.6。三枚の等位相交差が実画素では織格子として残った。少数の周期をノイズや本数で崩す改稿にはしない。

R10 native source pin は effect `a532bbefe31fa73c04c3f8bb66ce1d8dc83e21a61423c4d7b5bc33c56b1cc3b4` / shader `bbbcf682cbd43de7b221ff164973ccf81606ac8fb6bd4634c15754a6c3edac20`。ON/OFF220は同cause、completed・error null・shaderMessages[]、main effect300 vertices。expiryは再navigation後の別fixture generationでeffect0、fixture72なので、一続きの終了証明として入力にしていない。

## 元構造→R11の構造

三本の独立sheet、その対称な交差、depth-sortによる繰り返す編み目を撤去する。R11は一つの有限厚みのcharge sleeveを、(1)奥の青緑側壁、(2)連続する強白主面、(3)こちらへ折り返された広い有色面、の投影面として描く。三面は三本の攻撃ではなく同じ本体の役割分担。体積を全域で白くunionするR9にも戻さない。現実の流体・完全な3Dray solverではなく、題材に合わせた投影材質モデルである。

main faceはsourceから有限endpointまで接続し、折り返しは片側から主面へ深く入り込んで奥の白を遮蔽する。反対側の白い供給経路は切らない。返り面の幅、色勾配、遮蔽、厚い側壁が前後・曲面の手掛かりを担当する。macroは一つの太い方向支持、mesoは不等間隔の広い返りと冷色側壁。micro noise・細粒子・追加sparkles・画像textureは使わない。

### 有限支持と非周期の移流

共通parcel座標 q=u−1.22×age/420 を維持する。reducedではage項だけ0。axialはR10と同じ smooth(u/.06)×[1−smooth((u−.86)/.14)]。有限compact pulseは `smooth(1−abs((q−at)/width))`、外側は厳密0。

parcelの中心/半幅は (-.72,.18), (-.23,.12), (.18,.21)。等間隔でも同形でもなく、位相をずらした周期sinの三本束ではない。b0/b1/b2の支持は重ならない。radius=(12+6b0+4b1+5b2)×axial、center=(3b0−2.5b1+1.6b2)×axial、fold=b0+.82b1+.64b2。一つの本体が有限の圧縮部で膨らみ、片側へ寄って返る。

faceLow=center+radius×(−.62+.09b1−.06b2)、faceHigh=center+radius×(.42−.12b0+.04b2)、返りのcrease=center+radius×(.58−.86fold)。crease→upperが広い返り面。q一定の同じ圧縮/crease/断面は正uへ進む。初期に既に区間内にあるparcelも同じ共有beam立上がりで現れる設計で、粒子一個ずつがage0にsourceから出たという事実や未提供のimpactを創作しない。

側壁は断面法線の sqrt(1−n²) で冷色materialの向きを分け、有限edge1worldで閉じる。主白faceの境界は.9world、返りのcrease境界は.85world。返り面が十分現れた場所ではcoverage=1の実遮蔽とする。奥の強白を小さく漏らす透明層の加算でcyan面を再び白unionにしないための面構造であり、白係数の減光・RGB cap・背景依存補正ではない。

白主面はR10と同じ (13.58,8.22,2.56)×2.6 の強発光。側壁・返りは別向きの有色材質：側壁は(.025+.055L,.14+.68L,.23+.57L)、L=.2+.8sqrt(1−n²)、返りは(.025+.085[1−curl],.20+.62[1−curl],.38+.51[1−curl])、ともに×2.6。返りが白faceの手前、whiteが側壁の手前という一貫したcoverage合成で、三枚を交差させるsortは不要。

body main supportは最大21world、OBSは同じradiusに4axialを広げて最大25world。既存main±27/OBS±31quad内。OBSは同じsource/q/powerに結ぶ一つの近傍glow（alpha .075、teal×2.2）であり、主面の材質不足を埋める独立した格子・camera lens layerではない。今回lensflare/ghostは指定・採用しない。新binding/texture/postpassはない。

## 維持するイベント・音・API

`validateEvent`、`sampleEvent`、ordinary shader pathはR10 source byte一致。32-byte vertex tuple、View16、negative emission tags、encodedAge/reduced、frame-bound hand/捕捉endpoint、variant、900ms activation/420ms beam、0..28立上がり/28..330主作用/330..420退出を維持。未提供のdamage/kill/impactは描かない。activation造形も変更していない。

GPU binding/draw APIは変更なし。CPU `sampleTransportGeometry/Material` を新版材質へ更新し、`sampleChargeSurfaces`を追加。旧diagnostic export `sampleChargeSheets` も保持するが、返すものはrole-owned surfaces（spread4では単一OBS envelope）であり、三独立sheetの意味を残したとは主張しない。stepsは1..512を検証して受理するだけで、深度積分・収束検査とは呼ばない。

音はR10/R9/R8の `683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a` と完全一致。activation一度の音とbeam無追加、verify/gesture/cancel/visibilityのruntime契約を維持。byte一致は新しい通常聴感passではない。

## 棄却できるnative審査

最初は手(180,270)→endpoint(760,270)、View/CSS960×540、確認されたH64 fixture、continuous1×、age220、source ON/reduced OFF/main-onlyでR9/R10と比較する。白主面の接続を残して、広い有色側壁と返りが主面の手前へ入ることが実画素で読める必要がある。再び白い一様塊、平行二色帯、色分けした平板・棒、交差格子、独立白lumps、薄いrimだけになれば未達。白の強さを不採用理由にしない。

次は100/150/220/280/330msと普通1×の全生命で、同じ返り/膨らみが下流へ動き、点滅した孤立片や固定装飾へ変わらず、330..420退出して420で消えるかを確認する。OBS ONが構造を埋めないこと、reducedで材質が残って移流だけ止まること、short/斜め/二cause overlapは別条件として見る。静止220の成立は連続生命のpassではない。

## 実行した支持チェックと未確認

`node checks.mjs`：sampler832完全一致、支持1616、material24240、独立literal WGSL式とのCPU比較96960、移流不変20、reduced100、返り面の不透明遮蔽＋残る強白10条件を通過。最大supportはmain20.9983/OBS24.9983world、full axial区間の残る白接続幅は最小6.1225world。これらは数学支持とCPU契約の確認。CPU literal式はFloat64であり、WGSL compile/GPU driver/native pixel parityではない。

**UNSEALED。** effect `73054d8a0c87963e7664528344c226171f048e2e3515f22a34120d732c39689a`、shader `c8e4242b2aba9aea85e2518ef5e6d0556e2a4bfeb170f65e44eedb4e50a4c17d`。native compile/画素/continuous life/性能/普通SFX/Safari/iPad/game/public/fullqualityは未確認。rootの実native判断まではfreeze最終入力と呼ばない。

モデル分担：GPT-6.1-Sol 100% — R11創作構成・実source・CPU契約。名称はローカルcatalog `C:/Users/user/.codex/model-routing-state.json`（fetched2026-10-04T08:27:54.651331Z）による。旧稿とruntime/撮影の歴史的帰属は保持。
