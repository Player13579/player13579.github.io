# 仕様の出典と実装上の参照

## 創作／ゲーム契約

制作入力はこの会話で提示されたB Foundation「基底.md」2026-09-11統合版、「拡張.md」2026-09-23多層VFX版と、ユーザーのマナ獲得Eの契約・改稿条件です。旧r0.1 ZIP内のSTATE-CONTRACT/API文書はイベント・所有・時間・破棄の契約確認に限定しました。旧Sol/Astraの造形・色・層・時相・音・実装を創作資料として参照していません。旧530 actor-msの観測範囲はユーザー報告に帰属し、今回再現した観測とは区別しています。

## Webプラットフォーム一次資料（2026-09-27確認）

- WebGPU specification: https://www.w3.org/TR/webgpu/ — GPUDevice、shader module/pipeline、render target、texture view formatとsRGB変換、GPU sampler descriptor、error scope/device lossのAPI仕様を参照。画像textureを読み込まず、手続き型に描いたrgba16floatを線形フィルタで読む実装選択は本制作のものです。
- WebGPU Shading Language: https://www.w3.org/TR/WGSL/ — storage/uniformの型と配置、vertex/fragment、fwidth、textureSampleLevelなどの言語仕様を参照。5 vec4のInstanceに対する80-byteのJS packingは局所テストで照合しています。WGSLコンパイルの実行証拠は今回ありません。
- Web Audio API 1.1: https://www.w3.org/TR/webaudio-1.1/ — AudioContext、AudioWorklet、音声処理ノードのライフサイクルと時刻基準を参照。本実装の原因ledger、合成音、actor-time参照・PCM補間は新規設計です。
- Chrome for Developers, GPU/headless test environment: https://developer.chrome.com/blog/supercharge-web-ai-testing — 実行環境とGPU設定の確認方法の参考。ソフトウェア実装と実GPUを区別するために参照。管理ポリシーを変更する根拠には使用していません。

一次資料を読んだことは、対象端末のGPU互換性や実聴を検証したことを意味しません。特に未指定のGPU機能・ランタイムを利用可能と仮定して合格にせず、実行時にエラーを報告します。これらの外部サイトから画像、音源、フォントファイル、旧Eコードを同梱・転載していません。
