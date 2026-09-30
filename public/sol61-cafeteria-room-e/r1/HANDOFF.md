# Luna faithful runtime の限定実装契約

制作先 `outputs/request-20260930/room-e-trial/`。GPT Pro採用原画を変更せず、Solによる新しい部屋環境Eを付加する。公開では**別の未採用MAP group**に置き、原画の採用済みgroupを変えない。rootが公開/共有app/Gitを担当する。

## runtime所有

Lunaは `runtime.mjs`, `index.html`, `embed-test.html`, `sfx.mjs`, `runtime-port-test.mjs`, `gpu-check.mjs`, `freeze-runtime.mjs` と `runtime-evidence/**` だけを新規作成する。`design-manifest.json` のartist closureを一切変更せず、runtime statusをartist JSONへ追記/再serializeしない。仕様/画像アンカー/光学shaderの矛盾があればSol/rootへ返す。あなたは単独作業ではない。他者編集を戻さない。

## 接続

render-contract.jsonとscene/draw-plan/world/post/projection/sfx-scoreの実コードを使用する。shader文字列書換えをしない。原画textureは `inputs/public-cafeteria-attempt04.png`。scene+bright rgba16floatの二MRTをclearしてbitmap→局所Eの順にdraw、postでcanvasへ提出する。各drawは96byteuniform専有、256byteoffset alignmentを守る。world quadはsource矩形/receiver矩形/steam support/機内purgeだけ。postは一回のfull-screen final encodeで、PSFsampleはsource付近のみ。glow/白ピークを減らして性能や品質を作らない。

CSS980×620ならnativeDPR1でroom670.8955×620、左右letterbox154.5522px。DPR2はnative1960×1240、scale/offsetを倍にしoptics.w=2。465×430も全室contain。原画をcropping/actor倍率で大きく見せない。元bitmap/source登録の1305×1206と同じfit変換を全Eへ使う。

## 画面・音声・verification

embedでVFXを自動12秒loop。通常はUIで源/湯気/水/反射/near/cross/bitmapOnly/phaseを同時計条件で診断できる。verify URLは不変音0でAudioContext0、gesturehookでも解除しない。通常音は__gallerySfx.activateFromGestureでunlockして同cycleへ同期、vent/steam/purge WAVをCUESの時刻へ一度ずつ鳴らす。loopで旧voice/dedupeを清掃。disposeでRAF/voices/context/device/textures/listenersを清掃。有限voice/cause-id/hidden/取消を実装する。

## focused acceptance

Node sourcehash/fullcontain/uniform/multiple-draw ownership/dedupe/finiteSFX/verify0を集中検査する。GPUはroot許可・他clean cadenceと調整後のみ。コンパイルinfoを先に確認し、actual980×620/465×430、各時刻の全合成、灯/床/湯気/給湯/near/cross個別OFF、bitmapOnly/activeOFF/expiryをnative画面で捕捉。12s clean cadenceはscreenshots/readback/queryと分ける。技術compile/submitとSolの視覚品質判定/聴感/game/public/adoptionを別欄に保持。版が技術再生可能ならfreeze-runtimeにartistSHA依存を持たせ、rootへ再生entryとclosureを渡す。失敗attemptも保全。verify無音を聴感passにしない。

## Solに戻す判定

源が実食品/ノズル/壁灯から滑る、steamが煙やblob、purgeがlaser/icon、floorが新物体marker、原画が覆われる、幅/寿命の意味が実寸で消える、局所PSFが物理lensとして偽られる場合。単に未知normal/CPU finite/RGB nonzeroを理由に品質passにしない。

モデル分担: GPT-6.1-Sol 100% — この時点の新規部屋E創作shader/PH/投影/有限SFXとCPU契約。GPT Pro原画の歴史的作者、後続Luna runtime作者は別に保持し、最終prototype報告で実寄与へ統合する。
