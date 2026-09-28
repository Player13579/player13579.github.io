# 正本と技術参照

## B Foundationの拘束

本会話で継承した「基底.md（2026-09-11）」と「拡張.md（多層VFX/魔法2026-09-23、Eコード2026-09-24）」の全文を設計拘束として使用した。

r0.1で取得・固定したGitHubメタデータを継承（今回の再取得ではない）:

- repository: `player13579/B`
- branch: `Codex-honoo`
- commit: `8ad8e9b07ab8dc8737dd9b4022a775bce61d16e1`
- `基底.md` Git blob SHA-1: `4e10a53310be5b9d0aa3a6c881cf4f39d6590bd4`
- `拡張.md` Git blob SHA-1: `0eda016558e426ff4142d850d26200b40fafd834`
- commit URL: https://github.com/player13579/B/commit/8ad8e9b07ab8dc8737dd9b4022a775bce61d16e1

r0.1作成時にtreeと各ファイルのヘッダーを確認した記録を継承した。今回GitHub・ゲーム・公開サイトを読み書きしていない。Git blob全文と会話本文のバイト一致は未検査である。Git blob SHA-1は出所の識別子であり、本パッケージの完全性に使用するSHA-256とは別である。正本全文を本ZIPへ転載・再構成したものではない。正式設計は `design/mana-receive.B-Expression-2.json`、実装対応は `design/rule-implementation-map.json`。

r0.2の入力資料はr0.1候補ZIP、会話のB仕様、およびユーザーのH64観測報告。実ゲーム側の実装やMana Eは設計資料にしていない。確定イベントの意味、除外対象、空間範囲、H64、ACC2、発音条件は今回のユーザー指定を入力契約にした。

## 実装APIの一次資料

- W3C WGSL: https://www.w3.org/TR/WGSL/ — 型、演算子、構造体、頂点/フラグメント、storage/uniform等。
- W3C WebGPU: https://www.w3.org/TR/webgpu/ — shader module、render pipeline、error scope、queue、canvas、texture/buffer。
- W3C WebGPU Working Draft 2023-03-02: https://www.w3.org/TR/2023/WD-webgpu-20230302/ — `onSubmittedWorkDone`、`mapAsync` 等のAPI契約確認で参照。現行ブラウザーの実装確認ではない。
- W3C Web Audio API: https://www.w3.org/TR/webaudio/ — AudioBufferSourceNodeのstart、一回限りのソース、playbackRate、AudioContextの状態。

これらはAPI設計の参照であり、このWGSLが対象GPUでコンパイル済みであることや、音が実際に聴取されたことの証拠ではない。環境が変わった場合は同梱の実行検査を使用する。

追加の一次参照: Web Audio API Editor’s Draft (2026-09-09), https://webaudio.github.io/web-audio-api/ 。API契約の参照であり、聴感・同期・実デバイス試験ではない。
