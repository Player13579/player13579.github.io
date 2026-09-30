# バイブコーディング r1 — 分岐コードの生成と実行

## 実producerと表現の境界

server useAlchemyはrecipe.applyの後、取得receipt等の別経路を処理してaction-vibe-codingを一つ発生させる。recipe集合はカタログ36種とハッカー拡張10種。削除や増殖も含むため、本Eが表すのは**生成／書換を記述して実行した行為**であり、アイテムを手に入れた、クレジットが増えた、対象を倒したと再断定しない。guarded HP削除がfalseでも現在producerはactionを出す。この事実を変えず、対象への命中を創作しない。

設計はゼロ。既存Eの原画・shader・音・位相表を読取／コピーしない。過去別業務での読取曝露を無かったことにしない。今回入力はB正本・現行品質契約・実producer・E clock・経済カタログの技術情報のみ。

## 一つの主シルエット

三つの**開いた分岐プリズム**を、足元sourceを基準にbodyの周囲へ三方向に張り出す一つの接合構造として作る。各片は太い背骨と二つの枝を持ち、開口を残す。普通の四角いUI画面、ゲージ、完成物の模型ではない。物理アイテムや衝突物を増やさないdeclared-fantasyコード場である。

H64で主構造中心はsourceから(.20H,-.50H)、三方向の片は中心から.27H、厚み.12H、背骨幅.10H、枝幅.10H、片の長さ.52H。投影はx'=x+.35z、y'=y-.24z。主部の支持は概ねx[-.52,.94]H、y[-1.18,.16]H、最大94×86px程度。太い支持範囲そのものを可読性合格にしない。人物前後で必要な開口・接合が残ることを実GPUで確認する。

PH1は元actor表面と実姿勢の受光、PH2は三片が一つの連結構造へ変わるコード場。内部の実行前線はPH2の状態であり、別世界物体へ水増ししない。world層は主立体／接点実行芯／局所受光の三機能。OBSは近光と、選択した観測レンズのsource-bound回折を別に扱う。主形に不要なノイズカーペットを加えない。

## 位相と光

1200 Ems。0..80記述開始、三片の出現開始は0/160/320、各160msで確立。480..900では連結構造を保ち、実行前線が各接合域を0/140/280ms遅れで通る。900..1180で書込み構造が根元側から解除され、1180..1200は完全OFF。既存ゲーム結果の継続を本Eの永久構造で表さない。後半を粒子だけの空白へ呼び替えない。

本体の有色透過、発光芯、sourceSignal、opacityは別量。ray積分のextinctionは1.8/H、本体alphaは独立、source白芯は[14,14,12]linear、母体は深さによるcyan→blueの限定gradient。光量包絡は記述成立と実行・解除から導く。意味のない一定周期脈動／microちらつきなし。白ピーク、背景別gain切替、clip回避の減光は行わない。

キラキラは接合／実行の三つの実source接点に限り、同一E内すべて**垂直上から時計回り37°**と直交軸。H64で各光条half6px/4px、腕幅.65px、60..170ms程度の有限応答。主形に埋没したら位置と因果配置を再設計し、元光を弱めない。v1〜v6などの登録キーワードはユーザー入力に無く、明示と偽らない。通常の交差光条を属性具体化として選ぶ。

## 観測者

nearは発光像の局所PSF、有限half10px相当。lens flareは「2本の直交回折線を持つ仮想ゲーム観測レンズ」を選び、実行接点の実射影sourceとcamera centreを入力する。camera couplingは中心からのsource偏位でflare軸長が変わるモデル。光条自体の基準角は37°を保つ。源の可視coverageはactual alpha遮蔽から測り、RGBの明るさから推定しない。

ghostは別に評価し、r1では**非採用**。三つの短命sourceへ別の像を置くより、接合順と実行前線を主役にする。実寸でghost無しでも光学回折が見えるかnative介入で判定する。ghost一般不要という規則にはしない。near・flare・sparkleは別OFFを持ち、source移動／camera centre移動／opaque source遮蔽／expiryの実画像で非自明な依存を示す。sourceOFFだけをlens合格としない。

## 合成・所在

eventの丸めx/yをcamera変換したsourceを固定。元actorの新動作を作らない。hostの実actor surface coverageとsource観測coverageが不可欠。裏側の主形は元bodyより前に描かず、前側はbody alphaを再乗算して消さない。source-current/room/owner/timeは同一submitted frameへ結ぶ。partialは実coverageとviewport scissorで処理、完全offscreen/source invisibleはE/SFXなし。未提供のsource／coverage対応はstrict unsupported。

HDR worldはpremultiplied material、radiance、sourceSignalの3MRT。OBSは入力HDR radianceとsourceSignalを使う別pass。baseをtone-mapせず、E-only linear加算と一度のoutput encodeをhostの色空間へ合わせる。OFFは元worldそのもの。shared device/host frameのpassへrecordするだけで、自前device/context/queue.submit/RAFを作らない。

## SFX

新規finite1200Emsモノラル48kHz。0/160/320に短い非周期的なガラス質の記述衝撃（部分音比1:1.47:2.31＋帯域noise）。480..900に接合を読む三つの共鳴経路が上行し、960..1180に短い消散。最終sample0、loopなし。単なるピッチ変更の既存音は入力にしない。

同じroom+effect-idをsession seenで一度だけ所有。最初の成功GPU submission後、actual visible source、gesture、verify false、rate>0のみ開始。基準波形のbufferOffsetはageE/1000、playbackRate=rate。wall経過と残時間はそれぞれageE/(1000*rate)、(1200-ageE)/(1000*rate)。bufferOffsetをwall経過に置き換えて二重倍率にしない。rate変更／visibility／取消／expiryは古いvoiceを有限停止し、同じIDを再発音しない。verifyではaudioContext/voice/gain0。不在sourceや不明clockは発音しない。通常聴感とnative同期は後続検証。
