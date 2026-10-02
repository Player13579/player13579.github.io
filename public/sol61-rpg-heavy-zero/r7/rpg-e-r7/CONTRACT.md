# Rocket R7 direction clarity — faithful Luna契約

GPT-6.1-Sol創作派生。exact R6 module SHA `1d09443ac2f19bbc271c52eb4c79007d034ed6581ec6e1ed1c890de2a20df47d`、20ray impact volumeと歴史的原画/姿勢/作者を保持。今回の出力は私有componentで、採用・本編・公開・native品質を推定しない。PARENT-PINSに全親入力。primaryが統合・実画面・公開、Lunaは下記の正確なcodeを忠実移植する。

## 今回指定・保持必須・明示上書き

今回指定: ユーザーが背中側にも噴射するのは正常かと質問したことを踏まえ、意図したbackblastを残し、前方leading pressureと後方diverging ventの役割を読ませる。後方削除・第二射撃・後方hit・弾体を追加しない。

保持必須: 現行DVA/Bの実発光・登録nearby受光・source-boundobserver・材質/shape/時間因果・輝度抑揚・原寸quality・同一Eclock・正規receipt/privacy/currentness・actual姿勢/aperture・有限SFX。題材/役割変更をこれらの免除にしない。白飛び回避/増減光だけで方向品質を置換しない。

明示上書き: なし。launch/backblastは一回の同じreceipt/音声/本編意味のまま。新しいgame damage/安全範囲/後方attack/mechanicsはなし。R6impactの改稿を維持。verify hardzeroと通常のaudio ownerを維持。Rocketへmap-SFX0例外を適用しない。

## 実行コードと変更境界

`rpg-e.mjs`が全実行moduleで、新VERSION=`sol-rpg-heavy-quality-r7`。jet.wgslはfsのexact jet body原本で既にmodule内へ展開済み。Lunaはmodule bytesをそのまま新componentへコピーし、R6の同一host/APIへ接続する。追加import/uniform/bindings/target/texture/particle/pipelineなし。CPUファイル/testsはbrowserへimportしない。

変更はjet body、planのdecorative rear field sx `90×enhance1.35`→`58×enhance1.20`、VERSION/headerのみ。front field sx80×enhance1.18/sy43は維持。rear sy42、actual poseRearExhaustとkind1、共通axis/vertex/場面cameraを維持。receipt/admission/pose/currentness/timing/semantic endpoints/lightsのplan codeは唯一のrear bounds literalを除きsource-identical。R6volume及びvolume helper、kind2/3 dispatch、LIGHT_POST_WGSL、全他export/functionは同一。新後方impact/endpoint/audioIDを作らない。

元sourceのhypothetical-only規約、正規left男性pose hashes、body260ms、MAX_ATTEMPTS64、defended/rejected/private/hidden/gate省略、opaque submit receipt/queue完了までのbuffer所有を維持。本編のactual damage adapterを追加しない。

## Exact shape/flow/time

コードjet.wgsl/jet-cpu.mjsが係数の正本。qはforward=(p.x,p.y)、rear=(−p.x,p.y)。同じ正規apertureを根にし、同じworld方向/sideを維持する。

|役割|前方leading pressure spine|後方diverging vent|
|---|---|---|
|field half-axis bound|80 normal/94.4 enhance|58 normal/69.6 enhance|
|extent/tip|.93×smooth0..65ms、tip width.12|.94×smooth0..35ms、tip width.22|
|成熟axial support|74.4 normal/87.792 enhance原座標px|54.52 normal/65.424 enhance原座標px|
|横幅|.055+.085axis+.012axis sin²(14axis−.034t)|.13+.40axis×(.80+.20smooth25..125ms)|
|曲がり|.012axis sin(9axis−.024t)|.060axis sin(6axis−.011t)|
|core伝播/分布|18axis−.038tの連続pressure spine、距離decay1.1|5.5axis−.012tの広いvent fold、距離decay4.4で熱芯はaperture近く|
|熱いsource/core RGB|[9,6.8,3.2]|[6.8,3.2,.45]|
|shell RGB|[2.5,.25,.02]|[3.4,.75,.08]|
|熱い位相decay|exp(−t/340)|exp(−t/145)|
|排気へ遷移|85..210ms、gain.38|50..180ms、gain.55|

後方の発光を消すためのdimではなく、広がる短い排気とroot-local hot core、早いrelease/cooling、前方を先導する細いspineを分けるartist material配分。前方pressure cellsは連続したtube-origin pressureの見えであり弾体/別hitではない。現実の温度/pressure/ballisticsの校正モデルではない。

共通birth0..12ms/360normal400enhance expiry envelopeを保持。reducedはbendを1−.70reduced倍にするだけで時計/source/期限/正規意味を変えない。shell/core/rim/源に束縛されたoptical spread/exhaustが同一q/inside/lifeで混成し、field縁はabs(q.y).72→.98で0になる。uniform finite p∈[−1,1]²、kind0/1、age0..1200、en/reduced0or1。rearはextentが短くても同一launch life内の排気へ解消する。

新layerの光を独立画面haloへ置換せず、HDR/premultiplied source-overとsame-frame light/post経路を維持。親のactual3D lightPositions・normal/albedo/geometryを変えない。親light proxyは既存event-bound照射であり、この描画配分のcalibrated flux保存を証明するものではない。実source/nearby/observerが新形・phaseと因果を伴って見えるかnativeで確認する。

SFXは同じlaunch360ms/impact520ms/peak.085、同一event/audio owner、submit後one-shot、unlock/hidden/mute/verify/rate/consumedIDを保持。新backblast音やforwardとrearの二重発火を足さない。

## 検査・native gate・移植

`node build.cjs` hash-gated再現、`node verify.mjs`とinherited二test。CPU128,799checksはfinite/source0/期限、forwardが長い・rearが広い、両源の発光、aperture/receipt/lights/impact保持を検査する。41/371継承checksとPCMhash維持。enhance fixtureのradius360を正しく与える必要があり、誤ったfixtureを通すgate変更はしない。CPU/source検査はreal WGSL compile/実GPU見え/qualityの合格ではない。

Lunaはnewmodule identity/reference/metadataだけをhostへ移植し、sourceCURRENT/reduced/clock/SFX/pose/snapshot/geometryを同じinterfaceで使う。planのrear field boundsを古いadapterの90へ上書きしない。volume fileは監査用のexactR6 copyであり二度描画しない。旧R6は保持。

Primary nativeは同じactualviewport/H64/pose/exposure/normalのR6/R7で20/40/100/180/280/360/400ms＋連続1×を比較。forwardはapertureから狙い側へ先導する細いspine、rearは後端から短く広がる排気として読めること。逆向きの二つの同型弾/後方のほうが主射線/背中から別hitが出る見えは失敗。rearが消えてしまうことも失敗。静止画のwidth/length比だけではqualitypassにしない。

sourceOFF/receiverOFF/observerOFF/raw emitted source、実pose/body遮蔽、impact100/300/450/600/900のR6一致、normal-enhance/reduced/4-8同時/全life/性能/通常聴取/Safari/本編は別gate。quality pending、採用変更なし、GPU未確認。凍結係数のcreative変更はSolへ戻し、技術的port修理を新creative版へ混ぜない。

モデル分担: GPT-6.1-Sol100% — 前後役割の限定創作、完全code/忠実移植契約/CPU検査。
