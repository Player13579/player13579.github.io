# 公開コピーの検証差分

ChatGPT Pro納品ZIP `dva-mana-receive-independent-r0.2.zip` のSHA-256は `6303d395180de9504b0efde0ed4e6791722c2e4742e1708c272cf0b26558b0ff`。原本は `outputs/request-20260928/mana-independent-r02/mana-receive-r0.2/` に保存し、この公開コピーとは分ける。

- `preview/main.mjs`: `embed=1` の時だけ検査用の正の獲得を自動投入して全寿命をループする。通常の検査ページは手動操作のまま。E本体とSFXの造形は変更しない。
- `index.html` と `README.md`: 2026-09-28の後続検証結果を追記する。実WebGPUの技術・画素代理検査はpass、暗明H64の視覚品質はfail、聴感と実ゲーム統合はnot_run。
- `manifest.json` と `SHA256SUMS`: この公開コピーの内容に対して再生成する。納品ZIP自体のhashは上記の原本値であり、公開コピーのhashと混同しない。

観測・原因の確度・次版棄却条件は `outputs/request-20260928/failure-abstraction-live.md` に記録し、ChatGPT Proへr0.3を依頼済み。本編への接続は版別のユーザー承認を要する。
