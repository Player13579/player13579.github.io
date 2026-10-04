# R15の実寸収縮：材質契約の診断

作者GPT-6.1-Sol。新規R16所有フォルダーだけに保存。R15 source/runtime/原画像/品質FAILは変更しない。診断対象は、既に個別に観察したactual OFF220/ON220にある細い白帯＋青い上縁、浅いcream変形。R15レビューSHA `770d7c638f8a7c33af3a3fb1ad7359ebde42279032c5b9a03476e88eba3d6a51`、OFF220画像 `620b85ea75468610fcb6272955e3caa9df55da5ea5c0f01b9312afd068ce4743`。

## pack→projection→blend

R15 sampleEvent(220)の実tuple quadはworld x160→760、y243→297、color tuple[u,−27→27,220,1]、emission−2、layer2。toWorldはhand軸の直交localYをworldへ変換する。View16[960,540,0,0]とactual CSS/backing960×540/DPR1では **54world→54CSS px**。頂点shaderのcolor interpolationも同じlocalYをfragmentへ渡す。初期native proofの表示scaleと一致する。quadclipやViewの幾何縮小が原因という証拠はない。非零支持54pxを可視主形54pxと読み替えない。

実runtime `preview/cannon-r15/main.mjs` SHA `acee3fcb191b040b738679d9b007eb27951920842f35c64805684a7a44d36c56`：stride32、offset0/8/24、View16、premultiplied context、color/alphaともsrc one、dst one-minus-src-alpha。tuplefragmentは既に積分済みRGBを直接出力し、runtimeで再alpha乗算しない。これは整合している。ordinary branchは一度alphaを掛ける。GPUformatはgetPreferredCanvasFormat()に従い、実format名/transferのreceiptは既存proofに無い。R15には明示のlinear→display変換は無い。従ってCPU RGBを実スクリーン輝度やgamma-correctなpixel値と同定しない。現証拠からgamma/formatが原因だと断定もせず、新しいglobal tone/gamma補正を処方しない。

## 光路上で失われた支持

R15のcloudはsmooth(1−qy²−qz²)、densityもemissionもそのcloudに比例する。積分はtrans*(1−exp(−sigma*ds))*emission。もしemissionを単位光路の放射源jとして解釈すると、これはj/sigmaを用いないため、弱い辺縁でopacity×emissionがcloudを再度重み付けし、辺縁をほぼ二乗的に弱める。一方、emissionをsource functionとして扱えば計算自体は定義可能だが、広い弱密度域に強い可視支持が残るという創作期待を満たさなかった。これは公式の使用ミスと断定するより、**物性量の意味と可視契約が混在した設計欠陥**。R16ではjとsigmaを独立した光路量として明示する。

奥bodyの中心とwhitecoreの中心も投影上で大きく重なる。pulse位置u=.535714のR15 source値：

| localY | 積分RGB | alpha | 近体積を通るcore透過率 |
|---:|---|---:|---:|
| −18 | .00058,.00437,.01252 | .06183 | 1 |
| −12 | .03605,.27036,.77503 | .56424 | 1 |
| −3 | .36733,.58328,.75062 | .99355 | .03289 |
| +3 | 2.47004,1.77910,1.04721 | .97159 | .14509 |
| +9 | .50770,.39415,.36412 | .37051 | 1 |

奥の数学的支持は広くても外側値は小さい。可視寄与が強くなる内側はwhitecoreと重なる。+3では近側消光が実在してもRGB全成分が1を超えるため、限定range表示ではwhite/creamが残り得る。これは白が強いという失敗基準ではなく、近層の遮蔽がその入力に対して知覚可能な差を生む設計になっていなかった説明。R15のnearpulse以外のweightは.12なので全長の安定した近bodyも宣言されていない。横断のdensity witnessを全長の材質へ拡張する契約は不適切だった。

上記は42箇所の小さなsource診断であり、GPU pixel/実輝度を再現する画像ではない。`R15-DIAGNOSIS.json`にexact vertices、rows、nearTau、runtimehash、意味限界を保存。actualimageの個別観察が品質FAILの根拠であり、CPUは機序を説明する補助。

## R16で直す判断

単にradiusを増やすと非零辺縁を広げるだけ、色を増すとbandの色替え、near係数だけを増すと同じ白線を隠す色板になり得る。R16は①hotpathをbody中央から外し、broadchargebodyの可視投影域をwhitepathと分離、②j/sigmaの有限セル積分を実装して放射源と消光の量を分ける、③近いchargeが供給状態でhotpathの一部を横断する光路を設計する。この三つをactual nativeで棄却できる状態にする。

すべてのbeamにrearopeningを要求しない。R16は「厚い放射bodyに偏ったhotpathがあり、供給状態で近側のchargeが経路へ重なる」という題材に適した非対称体積を選ぶ。薄い白帯を新名称で合格へ変えない。白源[35.308,21.372,6.656]を保持し、background/global減光は使わない。

モデル分担：GPT-6.1-Sol 100% — 実画素FAILに結び付く限定機序診断。
