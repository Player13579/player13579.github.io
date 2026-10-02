# 転移ピクセル r2 — 原画同一性、発光、所有E時計

r1の原本を変更しない差分版。作者はGPT-6.1-Sol、推論High。この担当へVibe Coding限定のFast指定を拡張していない。画像生成は行わず、既存原画のSHA、人物、crop、姿勢、原画作者の未解決状態を保持する。他Eの創作コード・色・音を入力にしていない。

担当出力はこの独立package、差分設計、時計契約、CPU検査、ハッシュ閉包。ギャラリー公開、本編producer、通常身体の統合所有、Safari、通常聴感、GPU画素の品質受入は主担当の独立工程。

## 主形と発光

同じ人物の身体が出発点でセルへ分かれ、同じUV番地のセルから到着点で再構成される。r1の対応UV、最大32×40セル、有限変位、reduced motionの変位1/4とセル6px、透明alphaを保持する。セル間の小さい空隙は離れる／結合する途中だけ開き、通常身体へ戻る両端では閉じる。

r1設計の「追加glow0」はDVAの全E発光条件と不一致のため、このr2では継承しない。原画のpremultiplied legacy-encoded色をalphaで戻してsRGBから線形へ変換し、同じ色のセルを発光源にする。無関係なネオン色、輪、光条、別キャラ、画面全体の増光を加えない。発光はprogress .025–.20で立ち上がり、.70–.99で収束する。有限の分解／再構成がその包絡を所有し、未指定の周期的点滅は入れない。640 E-ms直前は元の色とalphaに戻る。

PH1は宣言転移と同一身体セルの位置、被覆、色を持つ。熱・物理エネルギー変換を実証したと主張しない。OBS1はr1のセル内UV量子化。OBS2は画素源の線形radianceを有限の5タップ×2方向で広げる表示／視覚系のにじみ。カメラレンズのゴーストや床の実反射とは偽らない。主形はworld shaderにあり、OBSが人物やセルを新規生成しない。

IntensityBudgetは本体、源、OBSが共有する。源強度2.4、OBS合成係数.34、標本幅2.2 CSS px、最大4標本間隔の支持範囲。強い白ピークを禁止・減光理由にしない。原画色と有限セルの意味を実寸で照合し、源のみ／OBSのみの介入を比較する。`source=off`は発光を消して同じdiffuseセル主形を保持、`obs=off`は源を保持して観測spreadだけ消す。背景条件でEを変更しない。

KeywordExpansionの未指定v/f/o語を追加起動しない。原画色が源の色を所有し、新しい虹色gradientを既定にしない。Gradient不採用は身体の色分布と同一性を主形にするため。新たな風、材質、別ポーズを加えない。Bはr1の基底・拡張出典とECodeImplementationの対応を継承する差分であり、B画像schemaや新しい画像を要求しない。新しい全B構造検査や現行Git照合の実行済みを主張しない。

## 時計と公開範囲

r1は640 wall-receipt msを使った履歴版であり、actor E-msとして再ラベルしない。r2は新しい`actor-e-clock`契約。callerはimmutable clock snapshotにactorId、causalId、roomId、generation、relocationRevision、公開sourceIds、current=true、有限非負atEmsを渡す。receiptはstartedAtEmsとdurationEms=640を持つ。寿命省略より先に所有者、source、世代、revision、currentness、有限値、時計巻戻りを検査する。Date.now／epoch／wall時計へのfallbackはない。

phaseは0–280 E-msがdeparture、160–640 E-msがarrival。clock停止中は同じ年齢と形を保持する。fixtureはperformanceの単調差分×明示rateで所有E時計を進め、各loopで新しいcast/source IDを作る。raw sourceの`at`だけはserver epochを模したfixture値として保持し、E年齢と引き算しない。r1 projection validatorを内部の0起点に対して再利用する箇所は、producer/privacy検査と純粋な年齢phase演算だけ。wall時計の代用品を作らない。

arrival-onlyはその公開source IDだけをclockへ渡し、隠れたdeparture/caster/fromを作らない。人物移動、revision、死亡、退出、vent、privacy、pose/device/upload leaseの不一致はブロック／取消。入力を近接・時刻・現在位置からペア推測しない。現在の本編producerとactor clockへの接続は未実装。

## SFXと検査範囲

r1の有限PCMとphase別source identityを維持し、r2でarrival-onlyのsource ID照合を修正する。E速度が正ならPCM playbackRateも同じ速度へ合わせ、pause時に音声sourceを止める。verifyはAudioContext/node生成0で解除不可。静止レビューにも音を付けない。通常聴感は未検査。

CPU検査はcausal/pose/privacy/lifecycle、E時計停止、12種の壊れた／stale時計が寿命省略前に拒否されること、endpoint-onlyの非公開情報禁止、有限PCM、pinとuniform回収、描画数上限を確認する。これをWGSL native compile、実GPU描画、画質、Safari、本編受入の代わりにしない。
