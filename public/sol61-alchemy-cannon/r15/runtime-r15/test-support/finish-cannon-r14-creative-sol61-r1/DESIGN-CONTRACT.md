# Cannon R14：開いた掃引断面による供給された厚い荷電体

状態：**UNSEALED executable draft**。所有はこの新規フォルダーだけ。作者 GPT-6.1-Sol。実GPUコンパイル・実寸の材質・全寿命・実音の受入は `not_run`。R13 の既知失敗を保存し、合格・採用・公開へ変更しない。

## 入力境界と今回の独立判断

R12 の細い白帯＋丸い青い膨らみ、R13 の白帯＋橙色の平面矢印と細い後縁、および OBS の長方形を、実画素で観察した棄却理由として受け取った。旧作の創作情報に一切触れていないとは主張しない。過去の自分のレビュー／設計への露出も履歴として残る。

今回ゼロから選ぶ範囲は **beam の材質・空間構造・観測応答の構築法**。R13 のポリゴン、頭部間隔包絡、橙色 cap、縁色の重ね描き、旧丸い膨らみやその shader を、新しい材質構築へコピーしない。新しい `material.mjs` は開いた楕円断面の前後寄与・消光・内部放射を実行する。これは既存ポリゴンの色・大きさ・輪郭の微調整ではない。

明示的に保持する既存輸送契約は `validateEvent` と `sampleEvent`、View16/vertex32B、900/420ms、hand/event/player/frame binding、endpoint、source gating、reduced の encoded age、強い白の放射値、音声である。`build-draft.cjs` はこの関数部分と vertex 入出力だけを正確に抽出する。sampler 内の **activation の既存描画・手元 throat も継承される**ため、E全体の完全ゼロ設計とは呼ばない。新 beam material の判断へ activation の既存造形を参考入力として使わない。旧創作 helper と fragment shader は抽出しない。

## 正本と適用

新規の所有フォルダー `b-source/` に認証済み Git で `player13579/B` の `Codex-honoo` を取得した。読み込み時 remote と clone HEAD は `22d3fcfd617f42b1a967de767906204c0221ec64`、基底 blob `8f1286e12402fe7b19650ad44bcddb38ad227a08`、拡張 blob `f35b61661d0209c0329d4a501a760d35b451d52e`。基底・拡張全文を分割して読み、画像生成スキーマへ置き換えず `ECodeImplementation.ExecutableECodeBranchRule` を適用する。基底のPH/OBS、境界・応答、八領域、sampling、可視手掛かりを下記と実装へ結ぶ。

VFX/ECodeImplementation は実行時 E の明示依頼で起動。PostEffects は明示された contextual bloom の対象に限定して起動し、global 操作を加えない。LDM は明示VFXの空間包絡と既存420msの時間変化へ接続する。色域の変化は世界内の後方・手前・内部という寄与へ固定する `world_VFX_gradient`。v1〜v6、f0〜f3、o1〜o9、魔法 preset、リング、粒子、画面ノイズは今回要求されていないため新規追加しない。特定のレンズ系を宣言していないので ghost/flare は採用せず、源に結び付く有限な表示のにじみを選ぶ。白飛びは棄却条件にしない。背景による減光・色補正・切替は一切ない。

## 世界内 PH と共有条件

PH1：手元の同一 event から finite endpoint まで供給される荷電体。`declared_fantasy`、世界内の担体であり、実在する液体・金属・プラズマの実証とは呼ばない。手と endpoint は入力境界で、衝突情報のない着弾・破片・発火は追加しない。外部人物は登録済み hand を提供する既存接続対象であり、この draft は人物造形やポーズを再生成しない。

Core は連続供給される明るい内部、Structure は上側が開いた掃引断面とその前後の遮蔽、Surface は有限厚みの放射／消光層。世界内の状態は u、y、z、age、断面半径、中心、圧縮量、密度、内部放射。source を除去すると sampler が担体を提出しなくなる。質量・運動量・電荷の SI 収支は非適用：ゲームが宣言した charge に実粒子数・kg・C を割り当てない。energy は既存供給入力の有限放射と光路上の消光として扱い、入力外の増殖や消えた後の源なし残光を認めない。

画面へ投影済みの既存 world unit/下向きY を sampler から局所軸へ変換する。local X は手→endpoint、local Y はその垂直方向。z は断面内部の視線深度パラメータで、実世界mへ未測定換算しない。直交投影は既存 View16 を使い、960×540で1world unit=1CSS px、body64高。重力・静穏な既存空気は人物の既存条件に属し、宣言担体の支持・方向は手→endpoint入力で拘束される。新しい風・抗力・髪揺れ・床接触は追加しない。WindCapsule は静穏、追加gust/shear/turbulence無し。この beam は周辺空気の実圧力を計算せず、供給方向の拘束を可視化する。

八領域：Optics は primary（有限放射、前後の消光、放射と不透明度の分離）、Materials は primary（断面の境界幅と前後寄与差、手前下側の遮蔽）。Fluid は supporting（宣言場の輸送／圧縮の移動だけで実液体の流体定数や乱流を断定しない）。Thermo は非適用（色から温度・燃焼を推定しない）、Electromagnetics は非適用（実電場・電荷のsolverではない）、Rheology は非適用（実粘弾性物性でない）、WaveOptics は非適用（干渉縞を足さない）、SurfaceScience は非適用（濡れ・付着・残留を作らない）。各非適用は latent の拘束として保持する。反射は採用せず、表面差は入射光の金属反射ではなく担体自身の放射・消光で生じるため、MicrofacetField を捏造しない。

## 新しい構築法：開いた厚い断面

u∈(0,front)、front=.08+.92*smooth(age/210) は保持する。reduced の形状ageは210ms固定、寿命と power は既存 age のまま。source側と finite front は滑らかに断面半径を0へ収束し、endpoint の先へ担体を出さない。

圧縮の中心は 1.5*shapeAge/420−.25。幅.15の一つの滑らかな圧縮が供給側から前方へ進む。圧縮が局所中心を−3→2world、半径を21→17worldへ変える。これは繰り返す周期格子や複数の光団でなく、一度の局所的な供給状態の通過である。成熟時の断面幅は大きく残り、内外・後側・手前返りが数pxの縁だけへ縮まないことを狙う。

各断面は y半径R、z半径15の楕円。半径座標.84の周囲に幅.18の有限 density 層を置く。**手前z<0、上側yn<.18の広い領域を開き**、.18→.48で手前層が滑らかに戻る。この開口を通して奥側の広い青／青緑の担体が見え、下側の手前返りは内部を遮蔽する。開口は全長に接続され、頭へ橙色の平面を貼らない。front側は同じ断面が有限に閉じるので、別の矢印物体・輪・球を先端へ足さない。

内部白放射は中心−3、幅6.5y／5zに支持を持ち、[35.308,21.372,6.656]を保持する。外層の密度と白放射を一つの変動量へ結び付けない。手前層はdensity1.1、後層.52、core.32という別役割を持つ。24のz断面を前→後へ透過率で積分し、emissionを遮蔽された寄与として合成する。cpu helper は診断用の同式でありGPU画像の代用でない。彩色は後層の青〜青緑、低放射の手前返り、強い白の内部へアンカーし、全域のminimum emissionで材質差を埋めない。

macro は一つの供給された厚い体、meso は開いた断面／後面／近い返り／内部経路、micro は境界featherだけ。noise、粒子、filigree、反復線は無し。前後差が成立しない場合、色を足して済ませず断面の開口と寄与を再検討する。

## OBS1 と合成

OBS1 は同一 PH1 の白内部・外層に結び付いた有限表示のにじみ。camera lens ghost や実測 convolution bloom と偽らず、shader 内の source-shaped analytic optical spread という近似として実装する。局所 center/R を入力に、外側距離5worldで0へ滑らかに減衰する。内部白の近傍と担体周辺は別の低い重みを持ち、矩形の allocation/envelope を塗らない。源の時間 power だけへ従い、終了後に独立した余韻を残さない。sourceOFF、OBS OFF を別に保持する。

色空間と alpha は既存 ordinary branch を保持し、tuple branch は線形 radiance、premultiplied RGB、coverage alpha。powerは最後に一度だけ掛ける。OBSは世界内担体より先の既存layer0、主材質layer2、手元throatlayer3。新規binding、draw adapter、depth attachment、画像texture、Canvas2DやGPU→2Dは無し。最大主支持は27未満、OBSは31未満の既存quadへ収める。余白を global veil で埋めない。

## 時間・音・samplingと可視判定

420ms beam の導入、210msまでの front前進、供給状態通過、330ms以後の有限releaseを既存samplerへ従属させる。900ms activationと exact audio bytes はそのまま。音を聴いた、同期を受け入れたとは主張しない。形の停止とゲーム継続を混同せず、実効速度と actor clock の新規変換も導入しない。

主手掛かりは広い断面・後方支持・前の返りの遮蔽である。白い線やごく細いrimだけが材質の意味を担ってはいけない。出力は既存CSS960×540/body64、DPR/backingはnativeで記録する。24光路標本とfeatherは有限近似であり、解像度依存・段差・ちらつきは実GPUで確認する。screencast intervalをGPU FPSに読み替えない。加速動画、拡大図、heldだけで通常動作の合格にしない。

PEMはfocus none、孤立したsourceなし装飾なし。手→供給→frontと、後面→近い返り→内部の視認経路を区別する。PH数・層数・コード量を美の得点にしない。geometryとmaterialのcontrast、時間の供給と収束を選択軸とし、境界・遮蔽・方向の具体的手掛かりへ結ぶ。

## 正本要件→実装→次の観察

| 要件 | 実装 | 次の native 棄却条件 |
|---|---|---|
| 主形・内外・奥行き | section/opticalSample/chargeSample の開口と前後消光 | 依然として白帯と平面色帯、丸い光塊、pipe状固体、rearが細いrimだけ |
| 材質と強い放射の分離 | density、emission、chargeRadiance | 全部白／glowだけで構造が消える。白が強いこと自体はfailにしない |
| 源・輸送・有限境界 | exact sampleEvent、front、compression | detached lumps、逆行、endpoint先のovershoot、既存因果の変更 |
| 局所OBSとPHの分離 | emission tagと有限distance spread | 長方形、allocationの直線境界、源なし残り、OBSだけが主形を作る |
| sampling/full-life | 既存quadとordinary source clock | 実寸で不読、途中からmicroだけ、releaseで関係が崩れる、実再生の飛び |

最初に **completed OFF220/ON220の actual body64 native** を取得し、後面・手前返り・白内部の関係と長方形消失を判断する。数式が正しいだけで合格にしない。その後OFF28/100/150/280/330/390/420、普通速度の一つのcause全寿命、必要なreduced/sourceOFF/orientation/short-endpointで前後と終端を確認する。heldはbefore/after同じage/frame/completionを残すがGPU-image atomic保証と区別する。通常SFX/device/game/adoptionは別ゲート。材質が最初の断面でfailなら、その具体的画素を保存して次の設計へ戻す。

構文・104 sampler parity・source/audio hash・finite support・前後開口の少数witnessは CHECKS.json。これはnative shader compile、画素の材質、全寿命、聴感の `pass` ではない。大規模CPUの点数稼ぎや擬似画像を作らない。

モデル分担：GPT-6.1-Sol 100% — 独立した新beam材質構築と適用契約／実行可能draft。旧稿作者とfaithful Luna runtimeの帰属は保持。
