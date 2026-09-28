# StaminaE r0.4 CONFLUENCE

独立素材制作のスタミナ回復E。正の権威ある gain-stamina 一件だけを対象とする、非テクスチャ・手続き型の WebGPU VFX / SFX 実装。

## 収録内容
- `index.html` / `src/*` : 実行可能なプレビューと公開API
- `shaders/*.wgsl` : WebGPUシェーダ
- `design/DESIGN_CONTRACT.md` : 設計契約と拒否条件
- `tests/*.test.mjs` : 数式・イベント・音声・静的GPU契約の検査
- `verification/*` : 制作環境での検証記録（`not_run` を含む）
- `HASHES.sha256` : ファイルマニフェスト

## 起動
- Node.js 20+ または Python 3 が必要です。
- Windows: `start.cmd`
- macOS / Linux: `sh start.sh`
- ブラウザで `http://localhost:8080` を開いてください。

## 重要
- CPU 代理描画はありません。
- 制作環境における実GPU描画・実聴は `not_run` 記録です。
- 品質採用 / 本編接続は未承認です。
