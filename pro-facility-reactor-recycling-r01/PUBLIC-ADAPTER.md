# ギャラリー用公開コピー

ChatGPT Proの原本 `DVA_Facility_E_WebGPU_A_B.zip` のSHA-256は `0687c28aa583daa8ac1209a6de29c20b5606868552dccbf19876d731715bcccc`。展開原本は `outputs/request-20260928/pro-facility-reactor-recycling-r01/dva-facility-e/` に保存し、この公開コピーと区別する。

- `preview/route.mjs` と `preview/main.mjs`: A/B選択をURLの `target` と結び、`embed=1` のときだけ新しい合成receiptを自動ループする。埋込は常に無音。通常の手動検査とE本体のWGSL/SFX造形は変更しない。
- `preview/style.css` と `preview/index.html`: ギャラリー内では手動操作を隠してH64の描画面を保つ。通常検査画面は維持する。
- `README.md`: 納品後の実GPU技術検査と品質審査の結果を記録する。A/Bとも技術再生pass、H64視覚品質fail、聴感と実ゲーム接続not_run。
- `MANIFEST.json` と `SHA256SUMS`: 公開コピーの内容に対して再生成する。原本ZIPのhashとは別。

観測と未確定原因、次版の棄却条件は `outputs/request-20260928/failure-abstraction-live.md` に記録済み。ChatGPT Proへ両案の独立r0.2を依頼した。本編への接続は版別のユーザー承認を要する。
