# 観測者の選択とレンズ候補

この試作は**display observer**を選ぶ。真上の部屋画像を等方containして設備運転を読む表示であり、撮像レンズを通した室内映像を意図する版ではない。カメラ光学をユーザーが未指定だから禁止する、という判断ではない。Bの属性具体化でレンズを選ぶ余地はある。

## 実レンズの候補を別に評価

候補は二回のlens-element internal reflectionが作る二つのghost。最も中央寄りの北灯source=(619,38)、観測中心=(652.5,603)とすると、paraxial縮小反転magnification −0.18/−0.43の候補位置は (658.53,704.70)/(666.905,845.95)。形は二つの楕円aperture image、半径(10,18)/(14,24)原画px、coating残留のごく弱いgreen/amber偏り、source放射の0.012/0.006、源矩形の通過量とentry/exitへ従属させる。世界内床PHには登録しない。これは近傍blur/crossではなく**lens内部反射候補**である。

現在の980×620等方投影ではghost中心が約(493.1,362.4)/(497.4,435.0)へ来て、中央床のinlay域と、その南側の空床に独立した小楕円が置かれる。shapeとしては床材のwarm elongated reflections(PH2)と違う中心系の二spotになる。半径を小さくすれば縮尺で消失し、読める大きさでは実機から離れた床上の装飾・新設備indicatorと混同するリスクがある。source周りの近光/実床応答を読みたいこの部屋では、撮像cameraの表現を加える理由より、この局所作用の識別を守る方を採用する。これはCPU投影に基づく**未レンダーの比較予測**で、ghost ON/OFF画素を見たquality failという主張ではない。

## 現在の選択

- near glow: 採用。final bright MRTから有限25tapのdisplay PSF、native半径6px×max(DPR,fitScale)、gain0.18。world source/水面response自体を作る代わりにはしない。
- physical lens flare: 非選択。display observer/部屋設備の局所可読性を意図し、撮像レンズ内部反射を本版へ付加しない。上記camera candidateを検討済み。unknown lensだけを不採用理由にしない。
- physical ghost: 非選択。上記投影/形の混同予測を理由とする。全Eで一律非選択にする規則ではない。
- cross PSF: 採用。給湯tray高輝度の表示応答だけ、角−12°統一、有限8×3原画px。物理lens streakと偽らない。
- veil/global contrast: 非選択。源に関係ない全室露出変化では運転を読ませない。

## 実検証で残るもの

源original_px→fitRoom→world draw→final bright MRT（alpha遮蔽を含む）→OBS1/OBS2→sRGBencodeをruntimeへ忠実接続する。same-phase near/cross個別OFF、sourceOFF、expiry、viewport/offset移動で支持/強度が追従することを確認する。選んでいないlensについてmoved-observation-centerのpassを記録しない。GL/Vulkan/WebGPUcompile成功だけでも光学qualityは未了。Root/Solの実表示で局所作用が弱い又はfloor/machineと混同したら設計を再判定する。
