# スタミナ回復E r0.3 — CORELOAD
## 収束・充填・蓄勢 / 独立WebGPU素材

**品質採用・本編接続は未承認です。実GPU画質・全寿命目視・実聴は not_run。**

r0.2のユーザー報告（WGSL `meta`、H64の細い赤いリボン／終盤の平板）だけを失敗事実として使い、主形、放射吸収、充填連動、音声を新規制作しました。旧Sol/Astra、既存E、r0.1/r0.2 ZIP内部は参照していません。

### 開く
Windowsは `start.cmd`、macOS/Linuxは `sh start.sh`。ブラウザで **http://localhost:8080** を開きます。Node.js 20以上またはPython 3。`npm install`不要、CDN/外部画像/画像テクスチャ資産なし。file://直開きは使いません。音声はボタンで解錠し、その後の新しいgainから開始します。

### 改稿の設計
太い三つの補給塊が身体の前後から受納部へ入り、届いた量だけ胸腹から腰へ連なる丸い三室を満たします。一度の締まりの後、同じ立体的な主形を静止保持し、最後だけ消灯します。Qと外部残量は共通samplerで結び、SFXも同じQ/到達流束から包絡を得ます。実SPを演出の途中で増減させません。

青白い芯・青い内部・深い吸収縁は体積厚みと法線で変わります。背景別の露出上げはありません。粒子、細い軌跡、平板、速度線、頭上アイコン、自然回復の反復を足していません。これらは**設計と実装の内容**であり、実機で読めると認定した結果ではありません。

### プレビュー
H64暗明×通常/2倍actorの4パネルが無操作でループします。画面上の音声は選択時計一本だけ。人物メッシュの非表示と、ゲーム不可視によるE終了は別操作です。前腕遮蔽、900/1500ms、同じeventの毎frame再送、180 actor-ms差の独立二件、二人近接、0/負gain、natural-tick、死亡/退出/不可視/逆行/cancelを検査できます。

手動pは無音の解析用です。「検査点を順送り」は観察を助けるもので全寿命合格の代替ではありません。「GPU検査点行列」はqueueの完了を記録しますが目視合格を付けません。H160は補助であり原寸評価に代用しません。

### 技術検査と未実施の区別
`node --test tests/*.test.mjs` は数式、イベント、DSP、WGSL字句・構造、host/bind-group契約を検査します。`node tools/validate.mjs` はBインスタンスと実装の静的整合を読み取り専用で検査します。これは完全なWGSL型検査器やGPUコンパイラではありません。

制作環境のChrome試行は `net::ERR_BLOCKED_BY_ADMINISTRATOR` によりローカルページ遷移前で停止しました。`verification/browser-attempt.json` に生のエラーを保存しています。**WGSL実コンパイル、createRenderPipelineAsyncの実成功、実GPU描画、全寿命画質、実聴は not_run**。CPU代理画像は生成していません。

ブラウザでは全WGSLの `getCompilationInfo()` と `createRenderPipelineAsync()`、validation error scopeを検査してから描画します。失敗は表示・JSONへ記録し、CPU代替に落ちません。成功しても「品質採用」と表示しません。

### 内容
- `design/DESIGN_CONTRACT.md` — 実装前の設計、拡張選択理由、拒否条件R01–R13
- `design/B-Expression-2.design.json` — PH4件・OBS4件、完全PH/8領域、LDM、多層、共通timeline、未観察状態
- `src/sampler.js` — 時相・有限残量・身体充填・形態・音声包絡の正本
- `shaders/` / `src/renderer.js` — 解析体積・身体深度・局所拡散・表示合成
- `src/events.js` / `src/public-api.js` — ゲーム契約境界と公開API
- `src/synthesis.js` / `src/audio-worklet.js` — 状態保持DSP、因果的音声包絡
- `assets/audio/` — 同じDSPから生成した参考WAV。試聴用で実聴評価済みではない
- `tests/` / `tools/` / `verification/` — テスト、再検査、事実の記録

### ハッシュ
`node tools/hash.mjs --check` で元ファイルのSHA-256を検査できます。`HASHES.sha256` は自分自身以外の全収録ファイルを含みます。ZIP全体のSHA-256は配布メッセージに記載します。開発ツールでWAV/検証記録等を書き換える前に、元ZIPを保持してください。

### 制約
レイトレーシングの解析体は独立プレビュー用です。実ゲームの骨格、カメラ、深度、遮蔽、音声バスとの統合は行っていません。視線積分40step・最大8 eventの性能は実GPU未計測です。権威性はゲーム側の確定トランザクションから渡す契約であり、renderer内のbooleanだけで不正イベントを認証するものではありません。詳しくは `docs/INTEGRATION.md` と `docs/REVIEW.md`。
