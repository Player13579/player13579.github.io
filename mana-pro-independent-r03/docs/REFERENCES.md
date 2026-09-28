# 参照したAPI仕様と設計資料

外部のMana Eの見た目・コード・素材は参照資料にしていません。Bの要件は会話内の基底・拡張本文、ゲームの確定条件はユーザー提示の契約です。

実装上のAPI参照（一次資料）は以下です。これらの仕様への参照は、配布shaderが実GPUでコンパイル済みという意味ではありません。

- W3C WebGPU: https://www.w3.org/TR/webgpu/ — GPUBufferのmapAsync、error scopes、shader compilation info、compute/render submission、GPUCanvasContext。
- W3C WGSL: https://www.w3.org/TR/WGSL/ — storage buffer/texture、atomic、compute entry point、配列と構造体。
- W3C Web Audio: https://www.w3.org/TR/webaudio/ — AudioBufferSourceNodeの一回限りstart、playbackRate、AudioContext状態、Gain/接続の停止。

`requestAnimationFrame`・DOM可視性とGPU queue完了はブラウザー内の状態であり、OSの実scanoutや実スピーカー出力時刻の計測として扱いません。技術制限は `docs/INTEGRATION.md`、実際の試行状態は `evidence/validation-summary.json` を参照してください。
