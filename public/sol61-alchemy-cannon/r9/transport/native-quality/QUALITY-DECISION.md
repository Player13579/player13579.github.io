# 粒子砲R9・220ms限定材質判断

評価者GPT-6.1-Sol。R9の正確なON/OFF220とexpiry420画像をそれぞれ個別に開いた。評価所有はこのフォルダのみで、R9 creative/runtimeやfreezeを変更していない。

**成立した改善**：R8の薄い青緑帯と孤立した白葉に対して、R9は手から有限終点までつながる太い白い主材になった。OFFでも同じ幅の主材と複数の大きな外周の起伏が見える。白い強さ自体は欠陥ではない。この改善を取り消したり、未採用/未達を理由に公開不可とする判断はしない。

**狭い未達criterion**：R9設計の「前後の返り材／重なるロールの折り込みが、main-onlyでも読める」は、この断面では成立を確認できない。OFFは外周がうねる一枚の充填された帯として見え、内側の折り込み、手前/奥の入替り、ロールの交差を識別できる内部支持や遮蔽境界がない。三ロールのCPU不変条件やconnected alpha支持は、これを相殺しない。強い白や白飛び自体をfailとせず、求めた構成の識別手掛かりが実画素にない点を未達として扱う。

source原因は仮説：三つの充填ロールの密度・materialを毎depthで加算して、一つの消光/発光積分へ統合する構成は、重なった投影域を一つの充填支持へ併合する。ロール個々の面・返り・開口の所有がなく、輪郭の起伏以外の幾何情報が最終像に残らない。未観測のHDR/performance/GPUfloat不一致を原因と断定しない。輝度capや全体減光による修理は要求しない。

これを理由に、別R10で体積unionを投影された折り込みsheetと前後の遮蔽へ変更する試作は妥当。強い白を保ち、支持自体の抜け・広い表裏面・重なりの入替りで折り込みを示す。三本の平行bars、装飾的な反復lattice、孤立した白い塊へ退化した場合はR10も未達。旧版はそのまま保存し、R10をR9の受入に読み替えない。

## 証拠と条件

effect ed8d2c2f8a926dd660c56c96b12bf8c9916f461680ce55b01d9b24d71f055bdd、shader851ae4cf391b90b2b3a6f05fccc06a91cfa0327dfb06896a10bea8a36d4b8eb3、audio683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a。

root native evidence `finish-cannon-r9-runtime-luna-r1/native-root`：ON220 image SHA f0f26006b8ea58ae352180521a30104eb0b6709457257470e946550253c576d1、OFF220 4520cd80c2beb4898232956a786a8e839e0a37a62c1ca540c2d58b3b572eaf5e、expiry420 0a0d04619cd2f6957822b7c2f6021018a024a83a3764b236e3079381bfbf82c5。

JSON result.valueはstringのため内部JSONを別parseする必要がある。sourcePinsは上記に一致。同cause r9-native-220、eventalchemy-cannon-review:r9-native-220、SOURCE ON/reduced OFF/continuous/verify hardmute。ON/OFFのage220、framefixture1-1、submitSequence1/2、completed/errornull/shaderMessages[]。View16とbacking/CSSはいずれも960×540、DPR2、手(180,270)、endpoint(760,270)。人物fixtureは同じ。これは一時相の空間/材質判断であり、動く輸送を見た証拠ではない。

expiry420は同cause、framefixture1-2、submitSequence3、activeEvent0、beamVertex0、expiredEvent1、completed/errornull。個別に開いた実画像でもEは消え、人物だけが残る。この同時点の終了は成立。継続motion、0〜420全寿命、ordinary SFX、実性能、Safari/iPad、本編/game、gallery/public、ユーザー採用は本判断でpassにしていない。

モデル分担：GPT-6.1-Sol 100% — R9限定材質/終了画素判断。runtimeとroot撮影の帰属は元記録を保持。
