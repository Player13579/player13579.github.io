# 外部統合API / r0.3

`src/index.js` が唯一の公開入口です。プレビューの人物・背景・ループ・モック原因は `preview/` に隔離され、公開入口からimportしません。r0.1の契約文書から意味を確認し、実装は新規に書きました。旧造形・音・shader・JS実装は転用していません。

## createManaAcquireEffect(options)

非同期でEファサードを返します。必須は `device: GPUDevice`, `format: GPUTextureFormat`, `sessionId`, `getActorClock`, `getBeneficiary`。任意は `audio`（本E専用adapter）、`workingColorSpace`（`linear`既定／`display`）、`depthStencil`、`maxActive=64`、`maxSessionEvents=32768`、`onDiagnostic`。

| メソッド | 使用タイミングと責務 |
|---|---|
| onManaCommitted(event) | 権威資源更新後に一度。accepted/duplicate/suppressed/rejectedを返す |
| prepare(view) | 毎フレーム。権威時計と身体を読み、消去し、背面・前面の手続き型ターゲットを更新 |
| drawBehindCharacters(pass) | 背景の後、既存身体の前 |
| drawAboveCharacters(pass) | 既存身体の後、前景遮蔽物の前 |
| invalidateBeneficiary(id,reason) | 当該身体の全Eを除去し、古い合成ターゲットの使用も止める |
| invalidateActor(id,reason) | 当該時計所有者に依存する全Eを除去 |
| setSession(id) | 新セッションなら状態・音・台帳を破棄。同じIDでは無変更 |
| snapshot() | コピーされた活動状態。ゲームのマナストアではない |
| stats | 受理、抑止、重複、期限切れ、取消し、発音開始・skip等 |
| dispose() | 本Eのバッファ、ターゲット、台帳を解放。ホストのGPUDeviceは破壊しない |

ファサードは隠れたRAFや自動イベントを作りません。低レベルの `ManaAcquireSystem`, `ManaRenderer`, `ManaAudio` も公開しています。プレビューではsystemを一個にし、六viewportへ同じsnapshotを渡します。六画面を描いたことを六原因・六音と数えません。

## event

必須は非空256文字以内の `sessionId`, `eventId`, `beneficiaryPlayerId`, `actorPlayerId` と、有限の正の `manaDelta`, `committed:true`。任意は `startedAtActorMs`（省略時は既存原因の開始時刻、なければ受信時actor時刻）、`durationMs`（既定1500、正値を900以上に制限）、`radiusPx`（既定82、有限正値）、`route`（DESIRE私有経路の拒否以外は形・色に影響しないメタデータ）。未来・負・非有限の開始時刻は拒否します。

## host snapshot

`getActorClock(actorPlayerId)` は `{timeMs,rate}` を返します。timeMsは同一セッション内で単調・非負のactor-ms、rateは0～8。目視・音声の検査対象は1×と2×で、それを超える時相の画質・音響は未確認です。rateを掛けたtimeMsをホストが渡すので、本Eはageへ再乗算しません。

`getBeneficiary(beneficiaryPlayerId)` は `{x,y,heightPx,alive,present,inVent,invisible}`。x右・y下のgame px、rootは足元、heightPxは有限正値。四つの可視状態はbooleanを明示します。任意の `manaAnchor:{x,y}` はrootからの局所位置（既定0, -0.49×heightPx）、`contactScale:{x,y}` は有限正値の接触域倍率（既定1,1）。身体を追加・動かすのは本Eの仕事ではありません。

外側R82はgame pxとして維持し、全効果を勝手に身長倍率で拡大しません。身体内の容積・受容面だけheightPx/64とcontactScaleを用います。接触マスクは楕円形の近似です。スキンに対する正確な切り抜きはホストのstencil/描画順に合わせて検証する必要があり、任意の身体形状で検証済みとはしていません。

## view / 色 / sampler

viewは `{width,height,scale,dpr,cameraX,cameraY,originX,originY}`。width/heightはCSS px、scaleはCSS px/game px、dprは実バッファ倍率（既定1）。cameraはgame px、originはCSS px。1×H64は64 CSS px、3×は192 CSS pxです。

外部画像・スプライトシートは使いません。SDFを `rgba16float` の前面／背面ターゲットへ描画し、そのGPU生成coverageを明示的なGPUSamplerで合成します。samplerはlinear min/mag、nearest mip、clamp-to-edge、LOD 0、異方性1。mip生成・色収差・画像素材・背景別のshader変更はありません。`src/sampler.js` は時間・形のサンプラーで、GPUSamplerとは別物です。名称が似ていても役割を混同しません。

すべてpremultiplied alphaで、blendは `one / one-minus-src-alpha`。標準のlinear設定では指定sRGBパレットをshader内で線形化し、半精度線形ターゲットに保持します。プレビューはcanvasのsRGB viewを使用して最終エンコードします。ホストの描画先が表示値のunormで統一されているときのみ `workingColorSpace:'display'` を明示してください。異なる作業色空間を黙って混合しません。主形生成用bloomや白加算はありません。

`prepare` は内部パスをqueueへsubmitします。その後のホストpassを同じdevice queueへsubmitしてください。準備から描画まで同じrendererを別viewで上書きしないでください。複数viewportには複数rendererを使います。中間ターゲットはresizeで破棄し、disposeでも解放します。GPUDevice喪失時は新deviceで再初期化が必要です。3D深度・多重サンプルへの自動移植は行いません。

## SFX adapter

`ManaAudio.unlock()` は明示的なユーザー操作から呼びます。`begin({id,ageMs,durationMs,rate})` が開始できたときだけtrue、`sync({id,ageMs,durationMs,rate})` は同じ声の時相更新、`cancel(id,reason)`、`reset()` が停止契約です。音未解錠時の原因を解錠後にまとめて鳴らしません。`setVolume(0..1)`, `setMuted(boolean)`, `dispose()` を提供します。既存AudioContextを渡せますが、本E用adapterは他Eと共用しないでください。

波形は `src/synth.js`、サンプル時計・声数・取消しは `src/audio-core.js` が正本です。AudioWorkletとオフライン検査は同じmixerを使います。2×は波形の進行を2×にする方式なので、ピッチも上がります。ピッチ保持の時間伸縮を実装したとはしていません。取消しreleaseは4ms、小さい権威時刻差は8ms補正、大きい差は権威位置へ再同期し4msで戻します。音響機器の遅延や聴感品質は別途実機で確認してください。

## 最終配線

Codex側が実資源更新後のイベント名、原因ID、clock、body、ライフサイクル通知、描画順を接続します。本ZIPは実DVAリポジトリを読まず、架空のイベント名を本編へ登録していません。このAPIを提出したことは本編接続の承認ではありません。
