# 数式とパイプラインの対応

## 一つのsampler
`smoother(x)=6x^5−15x^4+10x^3`、xは[0,1]に制限。導関数は内部で30x²(x−1)²、外部0。event位相p=(actor.nowMs−startedAt)/duration。

各経路iの正規化進度 t_i=(p−begin_i)/(end_i−begin_i)。移動進度はsmoother(t_i)。到達率q_i=smoother(2(t_i−.5))。重みw=(.34,.38,.28)、身体側Q=Σw_i q_i、外部残量=1−Q、到達流束=Σw_i dq_i/dp。数値微分との照合をテストする。

見た目のQは実SP台帳ではなく、確定済みgainの到達表現。ゲームSPはこの演出の完了を待たない。sourceToken/原因物によって形・色・時間・音を変えない。

外部塊の断面は残量の三乗根で縮める。細長いtrailへの切替はなく、残量が小さくなる時点では受納部に重なる。室のfillはQの区間を分担し、既存の丸い断面の半径/密度を具体化する。p=.74以後は圧縮係数が厳密に1で形態停止。Q=1は表示終端後も減らさず、visibilityだけ0にする。

## world pass
体積/身体構造は各4×vec4f=64byte、align16。uniformも64byte。CPU側が作るのは解析形状のパラメータで、CPU画像ではない。WGSLが視線ごとの交差と光輸送を描画する。

楕円体内のq²=(x/rx)²+(y/ry)²+(z/rz)²から、視線と体積の前後交差を解析的に解く。身体の最前面深度で奥の体積を遮る。各sampleの非負extinction σ、長さΔzからalpha=1−exp(−σΔz)。前から後へ C+=T·alpha·source、T*=1−alpha。背景/身体は最後にTを掛ける。複数層を単純addだけで描くものではない。

同じ局所法線で表面の明暗を変え、半透明な内部と暗い吸収縁、青白い芯を分ける。LDMの包絡はworld放射へ入力し、同一のトーン変換を通る。終盤も同じgeometryで保持する。

40sampleの解析体積積分は設計上の実装値であり、全GPU・全重なりで誤差やちらつきが無いという保証ではない。実機レビューで透過/境界/フレームcadenceを確認する。

## OBS pass
scene.wgsl: scene HDR + visible-emission seedの2 attachment。
blur.wgsl: [0.06,0.24,0.40,0.24,0.06] の水平/垂直2pass。GPU linear/clamp sampler使用。
composite.wgsl: scene＋局所bloom(.65)、頭/前腕mask除外、.72からのsoft shoulder、linear→sRGB。画像テクスチャ、LensFlare、grain、色ずれはない。

静的検査は予約語（metaを含む）、コメントの扱い、区切り、entrypoint、binding種別、buffer stride、MRT location、formatとsampleCountの対応を調べる。**完全なWGSL型検査・実コンパイルではない**。ブラウザでgetCompilationInfo/createRenderPipelineAsyncを待ってから描画し、そのログを別記する。

## SFX
同じQ・流束からonset/flow/reserve包絡を得る。voice内のoscillator位相と帯域雑音フィルタは持続。基音は到達につれて190→172Hz程度へ落ち着き、2倍actorでもDACの周波数を倍にしない。AudioWorklet128frameの包絡補間、8ms開始/取消fade、85msの予測上限を使う。数値波形検査は実聴ではない。
