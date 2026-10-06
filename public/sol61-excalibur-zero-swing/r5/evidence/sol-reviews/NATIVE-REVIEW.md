# Excalibur R5 — current-parent native 追加評価

結論: **native の版別再生と gallery 技術掲載を支持する。総合品質は pending のまま、採用は unknown、創作上限 R5/5 で停止。** Source review の READY/SEAL は変更しない。本 addendum は root の新しい実画面から得られた限定評価であり、公開操作を実行していない。

root が current public 68bb parent から exact `excalibur-zero-swing-sol61-r5` を読み込み、API ready、2 pass の first-frame submitted/completed（age 14.9 ms）、first cycle 完了を記録した。その後、全体の見える状態へ scroll し、9 age 断面、8 独立 mask、repeat の 2 枚を保存。本担当は **19 枚の原 PNG を全て表示して評価**した。先行 `age-*` の 9 枚は主形が viewport 外に切れており、品質判定には使用しない。

## 証拠の相関

全体の見える age 123/180/240/350.5/390/420/500/610/650 は同じ `excalibur-zero-r5-cycle-1`、source clock 一致、撮影前後の同じ completed frame 21..29。viewport は backing 1960x1240、CSS 980x620、DPR2、device/target generation はともに1。H64 は tip–grip 64 CSS px、人物の描画や実ゲーム actor の高さの測定ではない。

420 ms の normal/OBS OFF/near OFF/flare OFF/ghost OFF/reflection OFF/Main OFF/source OFF は同 cause、frame30..37 completed。各 mask は default から独立に指定されたことを receipt の options と plan に照合した。これは live render の同 phase 比較を支持するが、GPU 完了 callback と screenshot の atomic readback を主張しない。供給0、取消、resize/DPR変更、mirror/aim の native 結果ではない。

root の API play は異なる `cycle-2` を作り、live observation に初期 gathering が写り、その後 age650 ms、frame53/completed53、inactive/clear と空白画像を保存した。これは二度目の再生・消去の限定証拠。単一 live screenshot は全650msの連続動画の代わりにはならない。

## 本物の表示が支持した品質

|断面|実画像と source 因果の照合|限界|
|---|---|---|
|123|金の motes が小さな2列状に blade へ近づく。広い charged blade の発光はまだ見えない。plan charge0/arrival0 と整合。|個々の motes の出発から到達までの軌跡はこの一枚では証明しない。|
|180|remaining motes と明るい blade が同時に見え、plan stored .4789 / arrived8 と整合。|個別20ms deposit の局所発光を連続観測したわけではない。|
|240|blade に強い明るい蓄積があり、plan stored約1/arrived14。受領後の発光は実在する。|白い芯そのものを欠陥にしない。小表示では細かな材質区別や局所rim/spineの分離は難しい。|
|350.5|sword が upright に回り、蓄積が残る。release energy0 の立ち上がりと整合。|放出開始を飛ばしたのではなく exact transfer開始のゼロ状態。|
|390/420|動く剣の右方に独立した金色 front が現れる。曲がった bright leading ridge と上/下の金ローブ、中央の暗い開口が見える。主作用は粒子だけに置換されていない。|剣の現在姿勢と packet の frozen exact-peak 姿勢は別の所有。held間隔だけで no-jump を合格にしない。|
|500|明瞭な gold body の2ローブと曲がった先端を保って右へ進み、剣は後ろに残る。尾の release particles は疎である。|源の小さな粒群が視覚的な補助であることは確認できるが出生時刻の連続性は別。|
|610|弱まった前段と同じ packet がまだ viewport内にある。後半が画面外に消えているという誤評価はしない。|640 ms の native画像はなく、最後の減衰勾配すべてを実測していない。|
|650|表示領域は空白、plan inactive/clear。cycle2の650でも空白。|音は verify mute のため消音寿命の聴覚受入ではない。|

この native 証拠により、source-only review の「bowed ridge / gold lobes / finite expiry 未確認」は、指定 phase の実表示に限り確認済みへ進む。gold はオレンジ主体ではなく黄色〜金色の body と pale-white peak を持つ。白 peak は current E rule に従って許容し、body/中央開口の保持を評価した。背景色を調整する指示や新しい texture 制作へつなげない。

## PH / OBS / 材質の独立比較

OBS全体OFFでも curved packet、二つの gold body、中心の抜け、剣と放出粒子は残る。従って OBS が無から主作用を代行する形ではない。near OFF は glow の広がりを大きく減らして edge を細くするため、実出力で near応答が寄与することを確認できる。flare OFF は横/縦の弱い cross streak を減らす。ghost OFF は左上の小さな淡い spot を消す。source-bound world→observer の区分は、ソースの命名だけでなく、今回の画像差としても支持される。光学エネルギー保存・測定 lens model の合格という意味ではない。

reflection OFF は主 E body と強い剣発光を残し、剣の暗い部分の小さな反射差が中心。今回の強発光/64px/単一姿勢では steel と gold hilt の材質・roughness・入射方向応答を十分明瞭に比較できない。hilt の conductor 反射を golden E emission の色から合格にしてはいけない。材質 branch が独立して切れるという source と receipt はあるが、美しい/実物的な材質の実像受入は保留。

Main OFF と source OFF は発光 packet/particles/OBS を消し、非発光の暗い sword が残る。source/main off を「全canvas透明」と取り違えず、実際の非発光 sword と、消えた E/observerを区別する。両方で淡い ghost や streak の残留は見えない。通常モードの音との current-frame 所有チェックにはならない。

## 残る理由と境界

source review が測った late birth group の frozen-peak origin と、その birth時点の current sword point の不一致は残る。371.5 ms で group3最大16.544 CSS px（first member5.076 px）。これは CPU の版固定幾何差であり、今回350.5/390 msの画像だけで「飛んだ」「連続した」のどちらかを断定できない。packetが exact peak から離れて慣性で進むこと自体は妥当な宣言だが、遅れて birthする粒子の因果をそのことだけで正当化しない。birth直前/直後または通常連続再生の証拠が必要。これは R6許可ではない。

フル寿命の通常速度・birth無跳躍・material key/roughness方向応答・reducedMotion forwarding gap・native別aim/mirror/resize/cancel/supply0、正常音声の現実的剣/pressure/material response、Safari/iPad、実 actor/grip 履歴との接続は独立 pending。B の approximation と PH/OBS structure の既存 source gaps は本addendumで書き換えない。650clear と mask は部分的に解消したが、その結果を総合 qualityPass=true に広げない。

**掲載受入と総合品質は分離する。** 今回の current-parent 再生・実像・repeat clear は技術的に再生可能な R5 を gallery に届ける根拠となる。visible quality は pending、adoption unknown、R5/5上限停止という正確な状態を保つ。品質未達を理由に eligible version を隠さず、追加創作や採用を勝手に行わない。公開/統合の最終判断と source lineage 確定は root が保持する。

モデル分担: GPT-6.1-Sol 100%（本addendumの因果/実画像品質判断）。画像取得はroot、既存R5創作・Luna faithful adapterの歴史的貢献を再帰属しない。displayName provenance は親 source review の model-routing-state.json pin。
