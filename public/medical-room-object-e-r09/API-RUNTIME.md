# r7 frozen runtime API

この版は dry 原画と、既存蛇口の有限通水デモを組み合わせる候補。r6 runtime/API を r7 の代用にしない。SFX は無音。`manifest.json` の全 source hash を確認してから実装する。artist/shader の数値を adapter で変更しない。

`artist.mjs` は `ID, ORIGINAL, DESIGN, FALL, RESIDUAL_FALL, VELOCITY, DROP_VOLUME, valve, impactFlow, jetAtAge, waveOmega, makeTable, fluidState, phaseSeconds, acceptedFrameInput, uniforms, CLOTH, clothState, gust, clothTable` を export する。必要な module は `artist.mjs`、`cloth.mjs` と `support-light/artist.mjs`。生成済 `world.wgsl` をロードし、runtime で再生成しない。`build-shader.mjs` と B/CPU の Node module は制作側のみ。

`acceptedFrameInput({visible:true,current:true,roomId:'medical',sourceMode:'gallery-demo',basisHash:ORIGINAL.sha256,environmentTimeMs})` は input を返す。不可視/他室/非current は null。時計不在・basis 不一致・actual tap mode 未接続は reject。このデモに game receipt を付けない。

`uniforms({viewportPx:[backingW,backingH],imageRectPx:[left,top,width,height],environmentTimeMs,sourceVisibility:1,effect:true,fluid:true,cloth:true,obs:true,cancelled:false,reducedMotion:false})` → `{light:Float32Array(24),water:Float32Array(32),cloth:Float32Array(16),state,clothState}`。fit は等方、同じ原画の fit/DPR を world/blur/post 全体に一度適用。rect と viewport は backing px、water/cloth anchors は original px、物理値は m/s。actor clock は使わない。room hidden中ローカルclockをpause、cancelして次可視leaseで同phase再開。reducedMotion は water/cloth を OFF、light は r6 固定高相。paused water/曲がった布を残さない。

water の八 vec4 / 128 bytes は順に次の通り。

| vec4 | x | y | z | w |
|---|---|---|---|---|
| time | t12 seconds | fluid enabled | visual V m3 | visual A m |
| anchors | nozzle x887 | nozzle y188 | contact x885 | contact y234 |
| gravity | height46/152 m | g9.81 | v0=Q/(πr²) | main FALL s |
| projection | nozzle radius.0075m | px/m X533.3333 | px/m Y320 | px/m Z152 |
| film | radius≤.09m | integrated wave phase | k2π/.045 | roughness.18 |
| optics | F0.02 | refract X2.3px | refract Y1.4px | wave peak.00060m |
| residual | emit6.15s | emit6.65s | emit7.25s | drop radius.0016m |
| splash | residual FALL s | residual v0.01 | radial v.095 | vertical v.13 |

light の六 vec4/96 bytes は凍結 r6 と同じ。`view=[backingW,H,tSeconds,effect]`, `rect=[left,top,w,h]`, `state=[transmission,sourceVisibility,obs,0]`, `image=[1164,1351,1004,774]`, `obs=[582,675,.22,.025]`, `kernel=[14,31,72,.72]`。runtime で source ゲインの再補正をしない。`cancelled` は water の即取消。全 E 取消/原画比較は `effect:false` で light/OBS も新 frame で消す。

cloth の四 vec4/64bytes は `state=[cartQoriginalPx,sinkQoriginalPx,airSpeed,enabled]`, `cart=[254,156,312,229]`, `sink=[791,136,834,166]`, `material=[6,2.8,.28,.18]`（last.18 reserved）。group2 binding0 uniform。`cloth:false` は同時間clothなし比較、`fluid:false` は水なし比較、`sourceVisibility:0` はr6動的光のみなし比較（original baked illuminationとambient反射はbaseline）。布はair因果1.8..7.3s→modal settling→10s静止。水sourceと独立、光sourceとして扱わない。

GPU resources は original `rgba8unorm-srgb`（hardware decode once）、scene/sourceSignal `rgba16float`、blur ping/pong `rgba16float` half backing size、light UBO96bytes、water UBO128bytes、cloth UBO64bytes、blur UBO16bytes 各方向。buffer usage `UNIFORM|COPY_DST`。original copy usage `COPY_DST|RENDER_ATTACHMENT|TEXTURE_BINDING`、`premultipliedAlpha:false`、colorSpace sRGB、flipY:false。元 RGB opaque。canvas webgpu のみ、Canvas2D/画像Eテクスチャなし。

1. world `vertex/fragment`: explicit group0 `{0:light UBO,1:original,2:linear clamp sampler}`、group1 `{0:water UBO}`、group2 `{0:cloth UBO}`。MRT scene/sourceSignal clear、replace write、no blend、draw(3,1)。標準 `rgba16float`/filtering、追加 float16 feature 要求なし。original scene 一 draw、fold/refraction samplingは追加drawではない。r6の二group setupだけではr7を動かせない。
2. `blur.wgsl` `vertex/gaussianBlur`: group0 `{0:blur UBO,1:input,2:sampler}`。最初 sourceSignal→ping horizontal、次 ping→pong vertical。r6 と同じ九 taps。`sigmaHalf=14*backingImageFit*.5`, `tapStep=sigmaHalf/2`、uniform `[axisX*tapStep,axisY*tapStep,1/halfW,1/halfH]`。全 OFF frame でも fresh write。古い ping/pong を表示しない。
3. `post.wgsl` `vertex/finalEncoded`: group0 `{0:light UBO,1:scene,2:pong,3:sampler}`。canvas preferred ordinary unorm presentation に one encode、no second encode/no tone map。future shared HDR host だけ `linearComposite` で linear target へ出し最終 encode を host に一元化。standalone は frozen r6 post のまま。

fragment 下で film→jet→retained drop→sparse low crown の maximum coverage を選び、same original/lighting を透過と環境反射に使う。bowl film/crown を receiving mask 内に clip、nozzle より上と drain より下へ jet を伸ばさない。水は既存光を反射し、自発光しない。dark refraction を bloom に入れない。

playback は `requestAnimationFrame` で record/submit して次 frame に進む。bounded 最大 3 frames の version/room/basis/device/target lease proof を持つ。GPU scope/completion proof を render loop で frame ごと await しない。submit 後の error/completion に currentness を再評価し accepted receipt のみ成立。resize は新 target generation と新 fit、clock は保持。old frame receipt は取消、old targets は GPU completion 後 destroy。device loss/roomchange/unload は clockとRAFを止め、proofを無効化し自分の resources を解放。共有 device の global resources は destroy しない。

デモは 12s の running→closing→residual→draining→dry を自動で見せる。r6 lighting は 22s の別外光因果。phase を一緒にループさせて水が光源になったようにしない。status 表示は `state.stage` を使ってよい。原画比較は同 src/hash のみで effect を停止、再開時は同版。全 source packages と runtime files の hash は別 manifest に記録する。

native の受入は DESIGN.md の条件。CPU probe/ready/effect flag だけでは可視品質を合格にしない。水の小ささを crop/full-size双方で記録、実 fit が不合格なら source 改稿を primary/Sol に戻す。runtime が source を巨大化/移設/別水模様へ変えて補償しない。actual map の tap state/投影/occlusion/player order は未接続で別契約。
