# 粒子砲R10：荷電sheetの折り込みと実支持の開口（unsealed draft）

作者GPT-6.1-Sol。R9の正確なcreative sourceと個別に読んだnative ON/OFF220を入力にした許可された差分。B差分例外を適用し、full-B/schema passを主張しない。所有はこの新R10フォルダのみ。R9は変更せず保存。イベント/音/本編/公開の所有境界も維持する。実runtime danger-full-access／approval neverは先の同task startupで確認済み。

## R9で成立したもの、残ったもの

R9はR8のthinband＋孤立した白葉を、source→endpointの太い共通材へ改善した。この長所を保持する。一方、OFF220では外周の起伏以外に、返り材・折り込み・重なりの前後を見分ける手掛かりがなかった。白い強さは欠陥ではない。

原因仮説は、充填された三ロールを同じ消光/発光volumeへ加算する構成が、投影では一つのfilled supportへ併合すること。さらにdensity/光量係数を調整して同じ支持を描く修理にしない。R10は現実の流体密度を要求せず、架空の荷電流を「sourceとendpointで接続する広い三つの折り込みsheet」として投影し、内部開口と遮蔽の入替りを直接保持する。これは現実のvolume/流体solverではない。

## 原版→変更後の構成

R9の16depth×3 filled tubesとweighted material unionを外す。R10は3つの有限面をsampleして、depth順にpremultiplied over合成する。各面のcoverage/表裏materialを別所有にするため、隙間は他のtube densityで埋められず、重なりは手前の面が奥の面を遮る。face alphaはcoverage×.94という著者指定の光学条件。全体の輝度やRGBをcapせず、強い白を回避するalpha規則として採用しない。

主作用は手から捕捉終点へ供給される一つの荷電流。軸方向にparallelな三本を固定配置するものではなく、共通parcel座標 `q=u-1.22*age/420` に従って、3枚のcenter/depth/width/表裏が連動する。 q一定の同じ折り込みが正のuへ進む。sourceとendpointでは従来axialが0へ閉じ、手側throatを通して始まり、finite endpointを越えない。3枚は同時に流れる共通束として読めることが必要で、3本の別攻撃や飾りの格子になった場合は不採用。

macroは幅のある束と進行軸、mesoは3つの幅広い面・大きな開口・crossing時の前後/表裏入替り。microのnoise、sparkles、増殖粒子は使わない。新image/texture/bindingはない。

## 具体的なsource値と光学

axialは同じ `smooth(u/.06)*(1-smooth((u-.86)/.14))`、全体centerは `2axial*sin(8q)`。各foldのphiは0/2.0943951/4.1887902、thetaは `6q+phi+.42sin(3q)`。centerは全体centerに `11axial*cos(theta)`を加える。depthは `.9sin(theta)`、halfWidthは `(5.5+2cos(7q+phi+.35sin(3q)))*axial`。大きな折り込みを約一巡で構成し、denseな周期latticeや微細noiseにはしない。1.2worldのcoverage境界で閉じる。main supportは20.5world、OBSは24.5world以内で、既存main27/OBS31 quadに収まる。

frontはR9と同じ白の係数13.5/7.5/2.1に有色肩.08/.72/.46を加え、同じ2.6の放射係数を維持。backは.10/.82/.97の著者指定の返り面。depthで定まるfacingは `smooth((depth+.14)/.28)`。これは「同じ白い光を暗くする」全域補正ではなく、実際に異なる向き/位置を持つ表裏面の分配。三foldのdepthの和は0なので、少なくとも一つのfront向きの面が残る。strong whiteのcap、背景別補正、HDR弱体化はない。

同じfoldのcoverageと放射が結び付き、front/backの入替りもqで輸送される。実画面で広いback/開口が読めない、あるいは白い面だけが独立した棒に見える場合はこの設計も未達。表裏の差を色名だけで合格にしない。

CPU `sampleChargeSheets` は3つのy/halfWidth/depth/coverage/facingを返し、`sampleTransportMaterial`がstable back→front overを行う。SHADERは同じ式とstable bubble orderを使用。同depthでは同じfacing/materialになるため、order交代だけで異色faceが不連続に前へ飛ぶ構成ではない。最終radianceはpremultiplied、life powerを一度掛け、alphaも同powerを一度掛ける。正emissionのordinaryRGBA branchはsource byte一致。

CPU `steps` parameterは既存diagnostic callerの互換性のため検証して受理するが、この新しいprojected surface modelでは使用しない。16/128深度誤差0をaccuracy passとして記録しない。ray積分を保持したと偽らず、3面のcoverage/遮蔽へ構成を変えたことを明示する。runtimeの32Btuple/negative tags/APIには変更がない。

OBSは同じ各sheet coverageを4world広げ、同source/q/powerへ束縛した近傍応答。main-onlyで折り込みを受け入れた後にONの合成を確認する。世界内glowであり、camera lens PostEffectを追加していない。レンズフレア/ghostは今回指定/採用しない。独立した記号を足して材質の不足を隠す必然性がないため。

## 維持する契約

`validateEvent`、`sampleEvent`、ordinary shader prefixはR9とsource byte一致。R9と832組のevent/variant/OBS/reduced/life/short/vertical/diagonal出力が完全一致。frameに束縛したhand/捕捉endpoint、900ms activation、420ms beam、0〜28ms立上がり/28〜330ms主作用/330〜420ms退出、source throat、causalclock、複数causeを維持する。未提供のimpact/damage/killは描かない。reducedはqのtimeを0に固定して折り込みの前進を止め、形と発光は残す。

audioはR9/R8と完全一致の683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a。activation一度の音、beam無追加、gesture/verify/cancel/visibilityは元runtime契約。音byte一致を聴感の新しいpassにしない。

## 棄却可能なnative審査

最初は同じ手(180,270)、endpoint(760,270)、View960×540、H64、1×、220ms、SOURCE ON、reduced OFF、continuousでmain-onlyをR9と比較する。太い共通束の中で、開口と広い面、手前/奥のcrossingと返りが実画素に残ること。並行flat strips、格子状のdecorative lattice、孤立した白いlumps、細い3hairlines、再び起伏の外周しか見えない場合は未達。白の強さを棄却理由にしない。

次に100/150/220/280/330msと普通1×全生命で、同じfold/openingが源→endpointへ進み、独立したbarの点滅にならず、330〜420msまで同じ束が退出し、420で消えること。OBS ONのglowが主形を埋めず、reduced/short/斜め/overlapも別々に確認する。静止の幾何成立は動きの受入ではない。

## CPU証拠と未確認

832 sampler parity、3888面支持、14256 material finite/power/edge、20 advection形不変条件、100 reduced freezeを通過。220msの55断面で支持間の実zero openingがあることを数値確認した。これはnativeの開口可読性や一体感のpassではない。最大main20.2158world、OBS24.2158world。実WGSL compile／画素／continuous life／性能／通常SFX／Safari/iPad／game／gallery/publicはnot_run。

R10はunsealed draft。sourceはa532bbefe31fa73c04c3f8bb66ce1d8dc83e21a61423c4d7b5bc33c56b1cc3b4、shaderbbbcf682cbd43de7b221ff164973ccf81606ac8fb6bd4634c15754a6c3edac20。primaryのnative確認後に訂正またはfreezeを判断する。忠実Luna runtimeへ渡す前の設計は未決であり、これを最終入力と呼ばない。

モデル分担：GPT-6.1-Sol 100% — R10創作構成・実行source・CPU検査。歴史source/runtime/撮影の帰属は元記録を保持。
