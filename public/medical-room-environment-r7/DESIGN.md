# 医療室 r7 — 設備の水、接触、止水と排水

主現象は既存設備に沿う水の移送/接触/排水と、二位置の既存薄い白い折り素材に対する室内空気流の支持付きたわみである。原画全体の設備・材質から採否を比較した結果を下表に示す。光だけの r6 は履歴と支持要素として残す。r5 の ready/effect flags 成功は可視品質の成功を意味しなかった。光と蛇口一本だけの追加で完成にしない。

| 原画の設備/材質 | 形・用途からの現象候補 | r7採否と理由 |
|---|---|---|
| 右上faucet/bowl/drain | 自由水流、接触、薄膜、排水、残滴 | 採用。源と受け皿が同画にあり有限on/offを自然に接続できる。valve状態はdemo推定 |
| metal cart上の白い折り素材 | 薄布/ガーゼの支持付きたわみ、空気drag、fold移動 | 採用。薄い折り面の形からflexiblematerialを選択推論。台や皿は固定。正確な布種別は不明 |
| sink脇の白い折り素材 | 異なるsupport/自然周期の弱い布たわみ | 採用。同air入力でもサイズ/支持/responseを別にし、位置だけ違う複製motionにしない |
| 同台の青い整ったstack/金属containers | 素材反射、荷崩れ、蓋/容器内の液体motion | 反射のみr6支持。整った重いstackや容器を無原因に動かさず、内部液体/加熱steamは根拠不足 |
| ベッド青灰vinyl/枠/車輪 | 材質sheen、軟面settling、機械移動 | sheenをr6支持として採用。無荷重の連続sag、無operatorのbed自走は現象原因不自然なので採らない |
| metal cart frame/handle/chrome faucet | 曲面反射とincominglightの変化 | r6支持を採用。設備は固定、電気発光器に置換しない |
| 壁/床/家具接触 | 照度/遮蔽、床の塵の移送、濡れ跡 | 照度/実家具maskをr6支持採用。動的塵は主読解を助けず室用途に不要。床への水spillは受け皿接触設計と矛盾 |
| 右側glazed opening/室内空気 | 入射変化、室内弱い循環、ガラスの機械開閉 | 入射r6＋有限ambientair forceを採用。具体的窓/door/open状態/風源装置は未断定。機械開閉は追加しない |
| bottle/pumpの見える備品 | 内容物/操作中の押し下げ | 静的に保つ。操作者/正規状態なしで勝手に作動させるより設備が支持する上記原因を優先 |

採らない候補は『未指定だから禁止』ではなく、用途・支持・原因・接触の自然さと読解で判断した。弱い室内空気流は選択推論として確定し、originalのglazed openingが開いて通風している事実にはしない。新fan/plant/leafやairlineを追加しない。

PH07 cart布rect[254,156,312,229]、PH08 sink布rect[791,136,834,166]はsameimmutabletextureの実折り面を使う。nominal airρ1.2、speed≤.65m/s、pressure=.5ρu²、arealMass.028はartist選択。各mode `q''+2ζωq'+ω²q=ω²qEq(P)`、cart1.35Hz/ζ.32/equilibriumpeak6originalpx、sink1.8Hz/ζ.38/peak2.8px。1.8sまでair0、1.8..3s立上げ、3..6s broadgust、6..7.3s release、以後自由減衰、10..12s still。RK4/240Hz表を一度作る。水とは別causeで同clockだけを共有。

布のouter silhouette/supportは固定し、既存fold内部をsinπu sin²πvで可逆UV transportし、sameqからnormal勾配を導く。裏面と隠れた支持画素を新規補完しないため、剥がれて浮くfree-edgeや別布を重ねる実装は採らない。局所Lambert比は2.5D材質proxy、motionはUV移送にも実装するため単なる光pulseではない。元材質がhardboxに見える/動きが読めない場合はnativeでrejectしprimary/Solへ戻す。originalcropをclothposeとして焼き込まない。

nativeはcart/sink両patchのclothOFF同時刻比較とforceON→release→settleを連続で確認する。原画高420では最大equilibrium移動はcart約1.87logicalpx/sink.87px。小変形でqualityを自動passにしない。UVに依存するfoldmotionが actualfitで読めず、明滅だけに見える場合は不合格。original/source hash、whole-roomfitと補助crop、各位置/clock/OBSoff比較を証拠にする。

原画は同 SHA-256 `9f3fe2fb6772daa8104dcf97abe1bf87e5254a17af4c629dd0d3b5d7088ffa7e`、1164×1351 の dry 原本を不変にする。view_image で確認した設備は右上の白い洗面器、曲がった chrome 蛇口、円い drain。nozzle(887,188)→contact/drain(885,234) は原画を見た登録推定。形は存在するが、valve/水温/通水状態は静止画像から不明。通水は primary 承認の有限 gallery demo という選択推論で、実 game event の事実ではない。plant/leaf はこの部屋の現象として追加しない。

先に物理現象を決め、支持画像と runtime を分ける。常設の設備形、口の開いた nozzle、受け皿の凹み、排水口、固い rim、乾いた材質/接触影は画像の役割。空中の水、飛沫、滴、濡れ面の波と反射変化、通水/止水は runtime の役割。現在の画像を編集しない。future map image creator の契約は IMAGE-E-HANDOFF.md にまとめる。別室へこの水をテンプレート展開する方針ではない。

PH04 jet、PH05 接触/film/drain、PH06 residual droplets は実境界と状態で分ける。PH01..03 は許可された frozen r6 入射/金属/ビニル光の支持。OBS01 blur/OBS02 ghost は source/material の観測応答として維持。水そのものは selfemission ではなく、元の白/灰環境を反射・屈折する透明物質。水の dark refraction/film coverage を発光 source にしない。

局所投影は XY=(533.3333,320)px/m、Z=152px/m、height46/152=.30263158m。実 map の world scale へ流用せず artist の登録 basis として記録。nozzle 半径.0075m は画で直径8px、Qpeak=.00006m3/s=3.6L/min、v0=Q/(πr²)、g9.81。valve が effective orifice 面積を変え、出口の nominal speed は維持する近似。age τ の `z=h−v0τ−gτ²/2`、`r=rNozzle sqrt(valve(t−τ)*v0/(v0+gτ))` で同 source emission の質量流束を保存する。jet は口から下へ細くなり、少数の broad surface normal が流れと共に移流する。色つき beam や static 水柱にはしない。

gallery の水は 12s。0..0.35s valve open、.35..5.4s running、5.4..5.85s closing、以後 sourceQ0。既に出た jet は自由落下時間だけ続く。6.15/6.65/7.25s に三つだけ retained droplets を放出し、それぞれ v0.01、半径.0016m、同 g で落下して同 drain に到達。受け皿で四個の低い crown packet が radial .095/vertical .13m/s で短く動き、再接触する。これは既に受けた水の解像不可小体積の表面形態近似で、新しい質量 source を加えない。無限 particle 上昇や静止微光を主現象にしない。

薄膜は `dV/dt=Qimpact−V/.60`、`R=min(.09,sqrt(V/(π*.0014)))`。波 A は入力へ応答し τ.8s で減衰、peak.00060m、λ.045m。CPU 240Hz の exact exponential drain＋timed retained-drop impulses を一度構成し frame は補間だけ。深さに応じた位相は `ω²=(gk+σk³/ρ)tanh(kh)`。この式は浅い水面の重力・毛管波の近似であり、viscosity/full basin geometry は解かない。[MIT Physics III problem set 7](https://ocw.mit.edu/courses/8-03sc-physics-iii-vibrations-and-waves-fall-2016/1605be1a840cd0071e94050a80469f4c_MIT8_03SCF16_ProblemSet7.pdf) の有限深さ分散関係を用いる。σ=.07274N/m は nominal20°C の参照値で、実医療室の水温測定ではない。[IAPWS surface tension release](https://iapws.org/documents/release/Surf-H2O.download) を参照した。排水/波 damping 値は artist の有限近似である。

film radius ≤48×28.8 originalpx は既存 bowl ellipse 内に収まる。rim clipping、jet の nozzle 上/接触下 clipping、少数低い crown の bowl clipping を描画で行う。空中水を家具/床に広げない。central drain shear は既存 drain に束縛し、波の normal が同 original の反射/屈折を変える。新しい発光輪郭を置かない。F0.02/roughness.18、original の環境probe995,290を normalで参照、local refraction(2.3,1.4)px は明示した2.5D光学 proxy。絶対 radiometry/実材質測定/全水理の正しさを主張しない。

10..12s は visual dry。指数減衰で数学上残る微量は CPU diagnostic に残し、解像限界以下で一時 coverage を終了する。次 loop の初期状態も dry。通常 valve off は transport/residual/drain を見せるが、部屋離脱/非current/画像basis変更/device lease取消/原画比較は即座に全動的 coverage/OBS を取り消す。old target を表示しない。停止後の水を original に焼いて残すことはない。減光 r6 の22s周期は水と別因果、同じ environment clock を参照するだけ。音は無音。

受入は実 gallery の全画像 fit で行う。画像高420/620/900 logicalpx、DPR1/2で、jet 高14.3/21.1/30.6logicalpxの現実を記録する。fit420では droplet は subpixel補助であり、三滴が小さいことだけを主品質証拠にしない。2.0/4.7s running、5.7s closing、6.4/7.6s residual/contact、9.0s draining、10.5s dry を連続で見せ、同clock waterOFF/OBSoff/ALLON の fresh GPU frame を比較する。

主 acceptance 条件は、actual-size motionで source→落下→contact が人に読めること、止水後も永続水柱がないこと、濡れ面の反射が既存 bowl 内で動き戻ること、照明を止めた比較でも液体の暗明移送/接触を認識できること。native readback は PH-only runningのwaterOFF差分で `|Δencoded luma|≥.025` の jet/contact近傍を記録し、原画fit420で wet/contact域の動く差分 bbox幅≥14logicalpx・高≥8logicalpxを計測候補にする。これは採用閾値ではなく低差分の棄却診断。時系列を実画面で読めない場合は数値面積があっても reject。10.5s waterONとwaterOFFはwater部分の差分zero、室外/rim/nozzle上のwater差分zeroを確認。

ready/effect=true/errors0、shadercompile、CPU mass ledgerだけでは quality pass にしない。GPU 全寿命と上記 fit で不十分なら primaryへ actual evidence を返して Sol source改稿を行う。adapter が水を巨大化、移設、新設備追加、独立発光で補償してはならない。r6再利用の main performance、r7 の shader compile/flow可読性/continuous performance/native/public/gallery/adoption/main tap-state/geometry は未検証。原画に既に焼かれた光は baselineとして残り runtime light の成功証拠にしない。
