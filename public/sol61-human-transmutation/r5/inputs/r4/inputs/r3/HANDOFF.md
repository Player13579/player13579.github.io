# 人体生成 R3 actual material revision

正本sourceはこのfolder。版ID`human-transmutation-sol61-r3`、同loop3/5・残2、R4自動開始なし。R2原本・pixelNorm/H geometry技術派生は不変。実nativeの薄い翼状衣装材質を、元身体に隣接する連続した凝集へ修正する創作版であり、品質未受入・未採用。

実WORLD変更はrow transportだけ。`(1-approach)^2*.34H`から`(1-approach)*H*110/(1.5*700)`へ変更し、画面の縦1CSSpxに対する横shearを最大1CSSpx（reduced0.4）に拘束する。smoothstep到着、24ms固定、相補RGBA、原画、音、front/crown発光、selected局所bloom、linear HDR→表示変換とencodeを保持。係数の縮小だけでなく、平方の輸送curveをsmoothstepそのものへ改め、横の最大速度を上昇前線速度へ接続する。一般の全E制限ではなく、このsource bandの局所凝集に必要な幾何契約。

入口はこのfolderの`index.html?verify&phase=452&height=64`。Rootの既存human observer APIは保持：`await __human.hold(ms)`、`await __human.controls({height:48,observer:false,source:true,reduced:false})`、`await __human.inspectEmission()`。`getState()`はR3 version/cause/private scopeを返す。normal音はverifyなし「合成音」gesture、検証はverify固定無音。owned tabとtest serverだけを終了する。

全材料固定814ms、source終端1200ms、次cause1380ms。終了時は元人物が残るのでcanvas全空白を要求せず、strict emission RGB zero/finite、source OFFと一致する元人物残存を確認する。source OFFとtarget hidden、selected OBS OFFは別入力。Hは原alpha支持225pxから登録quadへ変換する先行技術baseを保持。

Native次工程はR2と同条件、同cause H64の45/220/430/440/452/464/710/790/814/840/865/1050/1199/1200と452ms H48/H128、OBS OFF/ON、source OFF/ON、hidden、通常速度初回/次loop。452とその前後でclothの面が原寸で読め、arrival前に消えず、元位置へ固定後もalpha dipや再発生がないかを観察する。静止image列だけで連続動作を合格にしない。強発光は保持し、材質欠陥を減光で判定・修理しない。

Native/gallery/publicはRootまたは次工程所有。本編への復活targetId因果、ordinary SFX、Safari/iPadは独立未受入。技術再生可能となれば実gallery parentの初回/次loopと版固有labelを確認し、公開配信bytesを固定sourceへ照合する。code/CPUだけで全品質PASSや採用へ昇格しない。

今回の創作：GPT-6.1-Sol。継承されたLuna技術baseの寄与は出典に保持。独立focused検査：GPT-6-Luna receipt `/workspace/dva-cloud/NEWreceipts/human-r3-motion-focused-luna-r1`。この引継ぎの実追加作業配分はSol85%（native scoped判断と実創作/納品）、Luna15%（独立限定位相・shear/alpha/source検査）、計100%。CPU結果と入力pinはそのreceiptと同folderのCPU-RESULTSを読む。
