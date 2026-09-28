# 試聴用参考WAV
`node tools/render-audio.mjs` が `src/synthesis.js` と `src/sampler.js` の同じDSPから生成した48kHz/16bit/stereo PCMです。既存音源の引用/加工ではありません。

通常/2倍actor×900/1500 actor-ms、独立二件180 actor-ms差、650 actor-msで取消の6本を収録。音源の起音・受納・終端を実聴するための参考です。現在の実聴状態はnot_run。数値解析結果は `verification/audio-analysis.json`。WAVの波形健全性を聴覚上の品質合格とみなしません。

ライブ実装はWAVを毎frame再生せず、一つのAudioWorklet内でeventごとに持続voiceを合成します。
