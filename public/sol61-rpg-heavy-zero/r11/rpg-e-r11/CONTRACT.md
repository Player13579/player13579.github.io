# Rocket R11 — 輸送される燃焼・煙体積

作者 GPT-6.1-Sol。候補 `sol-rpg-heavy-quality-r11-observer`、PH `sol-rpg-heavy-quality-r11`。R10未採用を保持。これはR10の限定創作派生であり「旧Eの創作入力なし」のゼロ制作ではない。R10の実画像100/650、棄却分析、shader/契約を読んだ上で、impactの形・材質構成を新設した。旧版の作者、画像、ソースと他者編集は変更しない。

## 指示と必須条件の対応

今回指定：R10の平滑なU字管／巻いた帯を、広い圧力の展開、前後の燃焼層、厚みを持って運ばれる煙へ改善する。白色や明るさそれ自体は棄却理由ではない。画像のぼかし・一律減光・細密noise追加を解決にしない。
保持必須：実姿勢アンカー、有限の前噴射＋短い後方vent、成功attemptだけのimpact、PH発光／実入力受光／source-qualified実WebGPU OBS、発光の時間変化、有限PCM/SFXの一回所有、privacy/currentness/device/target/frameToken/completion境界。題材指定で必須規則を免除しない。
明示上書き：なし。impact密度構成だけを改稿する。gameルール・damage・新projectile・後方hit・world/body遮蔽を創作しない。

## 実行の正本

`volume.wgsl`を`physical/rpg-e.mjs`のVFX_WGSLへそのまま埋込み。`volume-cpu.mjs`は同式のCPU鏡でありGPU/品質証明ではない。`rpg-e-r11.mjs`が通常経路のPH→source抽出→実OBSを束ねる。`observer.mjs`はR10のimport/comment以外同一、historical observer VERSIONはR9を保持する。shader文字列 `VFX.wgsl/source.wgsl/observer.wgsl/LIGHT_POST.wgsl` は実moduleから抽出する。

R10の連続superellipse skin、extrusion、全奥行き共通cleftを全て取り除く。四つの大きな有限密度packetを20深度rayで積分する。各packetは違うcenter/radii/angle/depthを持ち、体積内のshearと密度谷がpacketに付随する。同一のU字切断面や鋭い端面は数式にない。穴の上に遠方密度が存在してよい：これは固体の切れ目ではなく、異なる奥行きの気体である。

u=smoothstep(8,140,t)、v=smoothstep(150,980,t)、m=1−.67 reduced。座標は従来のimpact field局所座標で、y正は登録axis(-1,0)のside(0,-1)側。実際の地面normalを推測したものではない。

|packet|center(x,y,z)|radii(x,y,z)|回転/重み|
|---|---|---|---|
|基部圧力0|(-.08vm,.025+.09vm,.30)|(.46+.12u,.23,.30)|.15 / 1−.78 smooth(200,650,t)|
|遠方輸送1|(-(.08+.30u+.05vm),.10+.16u+.16vm,-.34)|(.25+.08v,.23+.11v,.28)|−(.37+.20vm) / .88 smooth(20,100,t)|
|近方輸送2|(.08+.30u+.05vm,.10+.08u+.25vm,.12)|同上|+(.37+.20vm) / 同上|
|上方輸送3|(.06−.12vm,.08+.36u+.16vm,-.18)|(.30,.24+.08v,.26)|−.28m / .76 smooth(50,160,t)|

煙ではradiiに(.055,.055,.045)、center.yに.075vmを加える。各packet内でz-dependent shear .10 sin(4qz+1.7k−.004t)m、縦偏移 .055 sin(3qz+k−.002t)m。回転してradiiで除したlocalのr²から有限kernel max(0,1−r²)^2（火）／^1.25（煙）を得る。密度谷はchannel=local.x+.32local.y+.43local.z−.22sin(.003t+1.9k)、factor=1−.78exp(−(channel/.26)²)。広い密度偏りは.72+.28sin(2.1local.y−2.4local.z+1.6k−.004t)。細密noiseやtextureはない。

外側abs(p).94..1のsmooth境界と局所kernelのr²≥1は厳密ゼロ。rayのz=1−(i+.5).1、i=0..19。opacity=1−exp(−density×(.48火/.47煙)×life)、前後積分を維持。一律opacityを下げてU字を隠したものではない。密度再配置により積分後ピーク／alphaはR10と異なり、旧最大値と同一だとは主張しない。CPU18×18の100ms最大HDR6.991、650ms煙最大alpha .421は粗いサンプル値で品質証明ではない。

火のsource RGB [16,10.4,4]/[13,4.4,.60]、orange [2.8,.13,.008]、燃焼crease [7,2.3,.08]を保持。local hot幅(.65,.55,.70)、80+12k msのpulse、65ms幅、heat exp(−t/460)で奥行きとpacketごとの明度抑揚を持つ。全期間bright whiteにしない。煙は法線依存 [.025,.032,.043]→[.67,.69,.71]、内部densityと170ms残熱で冷却する。これは温度・圧力のSI計測解ではない。

fireLife normal620/enhance700、smokeLife normal1040/enhance1100、event1200、立上り15ms、煙生成220..500msは同一。0..140展開、150..980輸送、基部200..650分散、最後のsource／material消失が有限。四packetは別イベント/別hitではない。

## 維持した契約

前98×34 world、後58×42、後normal160/enhance190、前360/400、impact火105×76・煙122×92。実mouth/rearアンカー、ready/recoil画像hash、body所有260ms、plan/receipt/source/privacy/unsupported/defended除外はR10と完全同一。source位置はreceipt.lightPositionsの実供給位置だけを利用。receiverは実world normal/position/albedo、hypothetical fixtureはworld/body適合証明にならない。

OBS：同じ新VFXをsource抽出で再評価し、kind3煙を除外、max(RGB−.9,0)×実field transmissionを入力。near1.4px/outer6.5px、gain .14/.055、intensity1 defaultON。actual同device/plan/field順序/frameToken/scene/target/queue-completionを要求、nonalias2pass＋rgba16float source target、19fetch、historyなし。normal650の煙だけの位相はsource入力0なのでOBS OFF差なしは正常で、肯定的OBS受入証明にはしない。100/300の発光位相を同条件比較する。camera-like表示scatterを採用し、lens ghost/独立screen streakは供給lens/光軸がないため追加しない。既存finite source-bound scatterは維持、全種類強制の解釈はしない。

PCM launch360ms/impact520ms、44.1/48kHz、peak .085、audio owner一回、gesture/mute/hidden/verify hardzeroを全てbyte/function同一保持。正常聴取は未確認。新audio/textures/geometry/sprite追加なし。

## コスト・検証・未解決

impact20×4=80 carrier evaluations/volume pixel（R10の二倍）。重なる火＋煙PHと火source抽出は最悪240 evaluations/pixel。既存130fields/64attempts/4096²などは安全上限であり性能合格値ではない。追加uniform/targets/particlesなしだがGPU負荷は未測定。

CPU40,247、旧production境界41、OBS production-call-mock954、JS syntaxを実行。全PH moduleをimpact式/header/versionだけ逆変換するとR10SHA 0b1591…329aに一致。jets、PCM、source/receiver/observer所有と通常submitは保持。CPU体積有限／厳密support/expiry、合法mode、異なる深度密度、上方重心輸送を確認した。WGSL実compile、H64でblastの重さ/煙厚/全動きは未確認。単なるローブ球や小火炎として見えないか実画面で判定する。自己qualitypass/採用なし。

モデル分担：GPT-6.1-Sol 100% — 限定創作、実行式、忠実契約と焦点検査。
