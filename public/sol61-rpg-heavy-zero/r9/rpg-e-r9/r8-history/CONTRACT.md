# Rocket R8 — impactだけの限定改稿 / faithful Luna契約

作者GPT-6.1-Sol。凍結親R7 rpg-e.mjs SHA686ab41dc8c5c45a48cdd6d386a24c6fe1a96aa346b879c1479ff748468f746e。R6native五相で三本の細い炎/煙に見える品質未達を根拠にする。元版/原画/歴史的作者を保持し、source派生は新候補として別保存。採用/公開/本編接続を推定しない。

## 今回指定・保持必須・明示上書き

今回指定: 小火片とupright tonguesから、contact-rootedな広いpressure unfoldと、その生成物が厚く巻き上がる煙へ改善。R7が修正した前方leading spineと後方diverging ventは完全保持する。背中側を第二shot/hitとして扱わない。
保持必須: 実発光源、近傍registered受光、条件に適したsource-bound observer、材質/形/時間因果/輝度抑揚、実寸全life、同Eclock、正規receipt/source-current/visibility/privacy/actual body/pose/aperture、有限SFX。題材変更は必須規則の免除ではない。白いhot sourceを弱める/clipping回避だけをquality目標にしない。
明示上書き: なし。verify hardzeroは保持。Rocketにmap-SFX0例外を使わない。hypothetical preview-onlyという親mechanics境界を保持、新damage/projectile/benefit/impact receiptはなし。

## 実行・port境界

rpg-e.mjsは全実行module、VERSION=sol-rpg-heavy-quality-r8。WGSL/plan/GPU/receiver/observer/audioをself-containedで含む。volume.wgslはmoduleへ展開したexact原本、volume-cpu.mjsは同じ式のsource/有限性検査用でruntimeへimportしない。Lunaはmodule bytesをそのまま新host identityへ接続し、係数・表示responseを変更しない。

変更はvolume関数とVERSION/header commentだけ。全他export/function、plan、R7jet fragment、kind2/3 dispatch、bindings/vertex/field数/geometry/light/OBS/PCM/receipt/pose hash/driver/encoder/lifetimeは親と同一。fire sx105/sy76、smoke122/92、R7 front80×1.18/rear58×1.20のgeometryを維持。追加import/uniform/pipeline/texture/target/particleなし。旧版sourceへ上書きしない。

## 正確な定量設計

volume.wgslが係数正本。入力local p∈[-1,1]²、depth z∈[-1,1]、validated t0..1200Ems、en/reduced0or1、smoke bool。

共通pressure unfold=smoothstep(8,120,t)、transport=smoothstep(170,980,t)、motion=1−.67reduced。以前20..280のゆっくりした縦成長から、初期の横へ短く展開するshared fieldへ変える。追加force/damage/gravity solveではなく、有限artist圧力/輸送の可視モデル。

|量|fire|smoke|
|---|---|---|
|life|pow(max(0,1−t/(620+80en)),1.1)×birth0..15|smooth220..500×pow(max(0,1−t/(1040+60en)),.66)×birth|
|half width rx|.32+.22unfold−.06transport|.40+.12unfold+.10transport|
|half height ry|.20+.12unfold+.08transport|.23+.13unfold+.14transport|
|depth thickness|.22+.07unfold|.29+.10transport|
|integrated opacity coefficient|.38|.34|
|depth evaluations|20×2厚い近/遠媒体|同じ20×2|

二媒体はside=[−1,+1]、phase=[0,1.6]、cx=side(.12unfold+.08transport)motion、cy=.03+.085unfold+.28transport motionを共有する。各mediumのu=(px−cx)/rx、bend=.12 sin(2.4u+phase−.005t)(.3+.7unfold)motion、v=(py−cy−bend)/ry。envelope=exp(−u⁴−v⁴)にfield boundary fadeを掛ける。境界abs(px).88..1/abs(py).90..1で0とし外へgeometryを増やさない。

fold=.70+.30cos²(2.4u+2.7v−.005t+phase)、layerDepth=[.32,−.34]+.11sin(2.2u+1.8v−.003t+phase)motion。同じoriginから展開した広い折返しとdepth厚であり、別の二発や二つの物体ではない。中心を別々の尖ったtipに置かない。

空気cleftは両mediumで同一world-local式: airX=.08sin((py−cy)3−.004t)motion、airY=.12+.22transport motion、cleft=exp(−((px−airX−.24(py−cy))/width)²−((py−airY)/.31)²)、width=.11fire/.14smoke。density=envelope×fold×(1−.94cleft unfold)×exp(−dz²)。depth全体で切れ目を共有し、far layerが空気を再充填する旧失敗を避ける。colorだけの暗い描線ではない。20ray後のcleft光/alphaをCPU検査するがnative可読性は別。

fire: heat=exp(−t/460)、hot=exp(−(.85u)²−(v+.15)²)、pulse=1+.8exp(−((t−80)/65)²)。近/遠hot RGB=[16,10.4,4]/[13,4.4,.60]、低温RGB=[2.8,.13,.008]、hot-fold RGB=[7,2.3,.08]を同じmediumのcreaseで混成する。初期bright sourceと広い発生域を保持し、単なるdim/wholelife白いfloodへ置換しない。数値はartist radianceで実temperature/fuel/Jouleではない。

smoke: safe normalからkey方向[−.45,.70,.60]のcosine応答を作り、cool密度材RGB[.025,.030,.038]→lit[.50,.52,.55]、warm residual[.90,.25,.02] exp(−t/170) exp(−(v+.30)²)を同じ生成物へ与える。新background wind/化学反応/関係ない微細noiseはなし。色だけをgreyへ変える三tipを主形にせず、広いdensity/cleft/曲がったdepth厚と輸送を対応させる。

積分は各rayでdensity和/color密度加重、opacity=1−exp(−density×coefficient×life)、radiance+=trans×opacity×color、trans*=1−opacity。返すRGBにclamp/tonemapなし。per volume pixel40carrier評価、重なったfire+smokeで80（R6は120）。MAX_ATTEMPTS64/field geometry既存上限を保持。実GPU時間の上限・高速化は未測定。

## retained source/receiver/OBS/SFX

actual3D source positions、Lambert receiver normal/albedo/position、source-only observer、E限定display responseは親source-identical。新volumeの強度分布と既存event-bound light proxyはcalibrated flux保存を証明しない。native同相sourceOFF/receiverOFF/observerOFF/raw emittedで因果と光量の適切性を検査する。受光code存在だけで観察済みにしない。

receipt1200Ems/body260、jets360/400、fire620/700、smoke1040/1100、source/hidden/defended/rejected/private/cancel/queue所有、approved pose/actual mouth/rear、same encoder/submit one-shotを保持。SFX launch360/impact520、PCMpeak.085とexactPCM hashes不変。通常gesture/mute/unlock/audio owner、verify hardzeroを保持。SFXを聴いた合格とはしない。

## 検査・native条件

hash-gated build、verify.mjs、継承41/371checks、module構文。source検査でR7全非volume関数/jet/ABI保持、CPUでdomain/finite/期限/HDR source/広い初期分布/近遠厚/20ray cleft/煙centroid輸送/field boundary0/コスト40を確認する。これは実WGSL compile・native画素・pressureらしさ・美しさ・性能の合格ではない。

primaryは同じactual viewport/normal/露出でR6/R7/R8の0/30/70/100/140/180/300/450/600/900/1100/1200＋連続1×。初期に接地点から広い短いburst、300で共通pressureの前後厚い燃焼面、450..900で厚い巻込み/air cleft/輸送を読む。小bonfire/独立二翼/三tip/color替え/閉じたgoldcap/whiteflood/field端の不自然な切断なら失敗。時間動作は静止画/数値から推定しない。

R7前後方向は実寸で保持すること、source/receiver/observerの独立native差分、body/world遮蔽、enhance/reduced、4/8同時・通常聴取・Safari/iPad・本編は別gate。quality pending、採用不変、元版のtechnical掲載を止めない。追加creative変更はSolへ戻し、Lunaが勝手に係数/露出/層数を替えない。

モデル分担：GPT-6.1-Sol 100% — 限定impact創作・完全code・忠実契約・CPU検査。
