# 技術根拠・出自 / r0.4

制作入力はこの会話のB Foundation基底2026-09-11、拡張2026-09-23、マナ獲得Eのゲーム契約、およびユーザーが記述したr0.2／r0.3の失敗事実です。旧版ZIP・画像・音・shaderを開いたり、新規コードへimportしたりしていません。他Eの主形・既存リポジトリも参照していません。

## 一次技術資料（2026-09-28確認）

| 資料 | この制作で確認した内容 |
|---|---|
| W3C, WebGPU Shading Language — https://www.w3.org/TR/WGSL/ | WGSLの文法・token・予約語、`select`、型付きvector／構造体、shader入口、微分・sampling |
| W3C, WebGPU — https://www.w3.org/TR/webgpu/ | shader module / compilation info / render pipeline、bind group、textureとsampler、queue／validation |
| W3C Web Audio API — https://webaudio.github.io/web-audio-api/ | AudioWorkletの処理契約、AudioContext時刻・状態、Web Audio出力経路 |
| wgpu-py guide — https://wgpu-py.readthedocs.io/en/stable/guide.html | native WebGPU QA経路の可用性確認用。今回モジュール不在のため実行なし |

仕様を読んだことは、その仕様のコンパイラーを実行したことではありません。WGSLのネイティブcompilationは原本に対するブラウザー検査で確認する設計ですが、本環境ではnavigationがpolicyに拒否されnot_runです。

## 数値の出自

1500／900 actor-ms、R82、H64、受益者／actor所有、正の確定gain、終了条件、一原因一声はユーザー契約です。帯の幅・方向、0.62／0.38の配分、時相窓、色・放射係数、bloom係数と表示knee、正規化量からの充填面積は今回選択した設計値です。物理量の実測や普遍的な美の定数として引用していません。

CPU資料は同梱の新規sampler頂点から生成し、CPUと明記しています。音は同梱synthによる新規PCM。フォントファイル、外部画像テクスチャ、外部音源、ライブラリバンドルは配布していません。実ゲームへの接続・音量・性能の認証は行っていません。
