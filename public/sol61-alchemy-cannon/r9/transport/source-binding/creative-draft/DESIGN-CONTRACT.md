# 粒子砲R9：接続した荷電ロールの輸送（未凍結draft）

作者GPT-6.1-Sol。許可されたR8の創作差分。旧版の正確なコード・音・設計文とrootの同原因220msのOBS ON/OFF画像を個別に読んだ。ゼロ入力作品ではない。B差分例外に従うため、B全文再取得・全schema監査は行っておらず、full-B passを主張しない。

## 根拠と変更仮説

R8の実出力は、青緑の薄い帯と、その後半に載る平たい白い葉形だった。OBSを外しても同じ構成が見える。白の強さ自体は欠陥ではない。回転断面・密度・16深度積分のCPU成立は、表示上の厚みや流れを成立させなかった。

主現象は、手から捕捉終点へ送る一つの太い荷電流。現実の流体密度を再現する必要はないと判断し、架空の荷電媒質を「互いに重なった三つのロールが、折り込みながら共通の流れを作る」構成へ改稿した。R8の単一断面中の二状態と孤立した圧縮前線を廃止する。別のビーム三本や飾りの格子を追加するものではない。

共通のmaterial parcel座標は `q=u-1.22*age/420`。q一定の形は時間と共に正のuへ移る。軸方向半径の折り込み、断面内のロール中心、励起の波面が同じqを使うため、静的な複製線の点滅ではない。各ロールは断面内の半径.34の位置を回り、半径.58〜.70の充填支持を持ち、原点を含めて互いに重なる。別メッシュ・独立フェード・独立した白い頭はない。16深度それぞれで三ロールの密度とmaterialを合成し、共有の消光/発光積分を行う。

大形は幅のある連続した流れと有限の手側・終点側支持。中形は重なりの前後、軸方向の折り込み、輸送される充電部。小形のノイズ・微粒子は使わない。仕組みの違いは、単なる主半径の変更ではなく、全長で重なる材の供給・巻き込み・励起を共通の輸送座標へ束縛した点にある。

## 形、光、合成の実装契約

`sampleTransportGeometry`がCPUの形を返し、`sampleTransportMaterial`が同じ式の16深度参照を返す。GPUはSHADERの負emission branchで同じq、radius、center、roll center/radius、density、charge、facingを計算する。CPUを描画に用いず、追加image/binding/textureはない。

axialはR8と同じ `smooth(u/.06)*(1-smooth((u-.86)/.14))`。radiusは `(18+3cos(15q))*axial`、centerは `2axial*sin(8q)`。analytic main支持は23world以内、OBSは27world以内。既存main27/OBS31のquadに収まる。H64/1world=1CSSpxの同fixtureでは、設計上の主支持は中域で30〜42px程度だが、非零支持と実際に見える厚みは別物として審査する。

ロール内の密度は `0.18*(max(0,1-d))²*edge`。不透明度と発光は別量。励起は `max(0,1-d/.62)²*(.30+.70crest²)`。全長の各ロールに励起があり、葉形一枚だけに集中させない。白い励起係数はR8の13.5/7.5/2.1、積分後係数2.6を維持する。対向する返り材は青(.03,.22,.88)、励起材の有色肩は(.08,.72,.46)とし、断面の前後位置facingで同じ材の中に配分する。密度・輝度全体を下げて白を避ける処理、背景補正、RGB capはない。局所の光量分布は旧画素完全一致ではなく、新しい構成が必要とする分布に変更した。

GPUが返すradianceは消光積分でpremultipliedになっており、生命powerを一度掛ける。alphaは `(1-transmission)*power`。従来の正emission straightRGBA branchは変更せず、premultiplied pipelineを維持する。

OBSの近傍の光は同じradius/center/qとpowerに束縛する。カメラ光学モデルは追加しておらず、これは世界内の近傍応答であってレンズPostEffectではない。レンズフレア・ゴーストはこの差分で指定/採用しない。主作用の材質を改める目的に対して独立のカメラ記号を追加する必然性がないため。OBS OFFでも主形と流れが成立することが必要。

## 維持した意味、時間、音と境界

`validateEvent`と`sampleEvent`はR8から変更していない。handWorldは同event/player/frameへ束縛、beamの軸は実捕捉終点まで。未提供の命中・損傷・爆発・結果音は作らない。900ms activation、420ms beam、既存power開始0〜28msと退場330〜420ms、throat、32B頂点、View16、main-2/layer2とOBS-1/layer0、variant、causal clock、独立causeを保持。frame clockの倍率は上流が所有し、shaderで二重適用しない。

0〜28msは供給立上がり、28〜330msはロールの連続輸送、330〜420msは同じ主材の退場。420msで完全終了し、残存する粒子等で寿命を埋めない。reducedではqの時変成分を0にして折り込み移動を止め、有限support・主材・発光を残す。activationは従来のgather/lock/releaseをそのまま保持する。

audioはSHA256 `683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a`完全一致。二つの関連sine toneと180msのfiltered intakeは一度のactivationだけに属し、pulseごとの音は追加しない。verify/gesture/取消/visibility/重複と実音聴感は既存runtimeの別受入。音byteの一致を新稿の聴感合格とは呼ばない。

## 棄却可能なnative審査

まずR8と同じfixture、手(180,270)、終点(760,270)、H64、1×、通常variant、220ms、SOURCE ON、reduced OFFでOBS OFFとONを別々に確認する。主形単独で、手から続く太い共通材、その中の前後/折り込みが読めること。三本の平たい平行線、飾りの反復格子、独立した白い塊、また薄帯＋白葉に見える場合は未達。白の強さは棄却理由にしない。外側glowだけで厚みを示したことにしない。

続いて100/150/220/280/330ms断面と0〜420ms普通速度の連続再生を確認し、同じ継ぎ目や巻き込みが源→終点へ移ること、全主区間で供給との接続が読めること、330ms以降の退出が主形の短いfadeとして完結すること、420msの終了を調べる。静止frameの見栄え・CPUのq移動だけで連続輸送を合格にしない。短距離、縦/斜め、複数cause、gbo-tenfold、reduced、activation900msはruntimeの忠実性チェックで分ける。

## 現時点の証拠と未完了

`CPU-CHECKS.json`に実byteのpinを保持。R8との832サンプル完全一致、1296支持、14256の16/128深度比較、20のadvective shape不変条件、100のreduced freezeを通過。16/128最大premultiplied誤差.0420990、reference peak9.4109145比.44734%。220msのalpha>.20断面は検査点で21.2〜31.6worldの連続支持。これらは数値/支持の結果であり、厚み・材質・動きの視覚合格ではない。

native WGSL compile、実220ms/連続生命、GPU float一致、実性能、通常音声、gallery埋め込み、Safari/iPad、本編は未確認。primaryが実GPUで見た後に改稿またはfreezeを判断する。これはunsealed draftであり、忠実runtime/公開の凍結入力ではない。
