# WebGPU / sampler / alpha contract

## 実装順序

src/events.js の権威binding → src/sampler.js のactor時刻・終端 → src/information-state.js のチャネル状態 → src/geometry.js の主形・内部・境界 → src/renderer.js と2つのWGSL、の順です。情報状態は世界内VFXの形を変更し、shader内の装飾ノイズではありません。全枝はuniformなscale/opacity一つだけでは表現されません。

Camera uniformは32bytes。viewport vec2f、center vec2f、scale f32、actorTime f32、reserved vec2f。vertex strideは64bytesでposition@0、normal@12、color@24、material(alpha,emission,pattern)@36、uv@48。残り8bytesはpaddingです。patternとuvは将来互換fieldとして保持していますが、現在のWGSLは格子・走査線・texture samplingのために使用しません。

mesh.wgsl は仮想情報interfaceの法線方向で面応答を変え、宣言radianceを足します。これはmetal BRDFやMaxwell計算ではありません。HDR colorはpremultiplied alpha。blend color/alphaはいずれも src=one、dst=one-minus-src-alpha、operation=add。

不透明host maskがdepth24plusへ先に書きます。VFX triangleはz平均で後ろから前へソートし、depthWriteなし/less-equalで描きます。透明面を任意形状で完全に解くOITではありません。交差面の順序や輪郭ハローは実GPUで検査してください。

## MSAA・texture・sampler

HighはsampleCount4のrgba16float render targetとdepth24plus、LowはsampleCount1。Highはsingle-sampled rgba16floatへresolveしてからpost passへ渡します。multisampled textureをfiltering samplerへ直接bindしません。

post bind groupは binding0: texture sampleType=float / viewDimension2d / multisampled=false、binding1: filtering sampler、binding2: uniform48bytes。samplerはminFilter=linear、magFilter=linear、mipmapFilter=nearest、addressModeU/V=clamp-to-edge、lodMinClamp=lodMaxClamp=0。WGSLは texture_2d<f32> + sampler + textureSampleLevel(...,0.0)。全て同じ契約です。画像textureのロードはありません。

Settings uniformは48bytes：resolution vec2f、bloom f32、exposure f32、background vec4f、control vec4f。control.xはDPR。8タップの近傍距離はCSS基準で、既存HDR稜のthreshold1.15超だけを重み.085で加えます。exposure1.04、shoulder、出力gamma後にcoverageを再乗算します。主形の発生位置や輪郭をpost passが新造する設計ではありません。

外部canvasはalphaMode=premultiplied、標準preferredCanvasFormat。背景透明ならRGB≤alphaの出力を意図し、透明空間を明るくしません。暗/明背景は入力場を変えず表示時に合成します。UIは別canvasでHDR/bloomに混ぜません。

## 検査の境界

型・byte offset・bind構造はローカル静的テストで照合しますが、WGSLコンパイラが実際に受理したと主張しません。初期化時はgetCompilationInfo、createRenderPipelineAsync、validation error scopeを使用します。フレーム検査はframeCheck()でqueue完了とvalidation errorを収集します。device lossは通知し、WebGL/Canvas/CPU画像へ無言でフォールバックしません。

今回の実ブラウザ遷移は管理ポリシーで拒否されたため、shader compile / texture sampling / GPU frame / GPU性能はnot_runです。診断マスクや既存r0.1の一枚の画像をこの確認に代用していません。

仕様参照（技術契約の参照であり美術入力ではない）：W3C WebGPU https://www.w3.org/TR/webgpu/ 、WGSL https://www.w3.org/TR/WGSL/ 、Chrome Audio Worklet https://developer.chrome.com/blog/audio-worklet/ 、autoplay https://developer.chrome.com/blog/autoplay/ 。確認日2026-09-27。URL長/取得制限でWebGPU全文取得は完了しておらず、実装の全面適合を保証しません。
