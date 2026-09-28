# 品質記録 / r0.3

## 結論

**現行ステータス：保留 / Warning。品質合格ではありません。本編接続は未承認です。**

この版では、Node ベースの自動テストとローカル静的検査を実行しました。一方で、この制作環境では **実GPU実行 / 実聴を行っていません**。そのため `not_run` は `not_run` のまま保持し、CPU 参照や wav 生成を品質合格へ読み替えていません。

## r0.2 の実 GPU 失敗事実（入力として採用）

ユーザー側の Chrome 実 WebGPU（intel gen-12lp）観察で、r0.2 には次の未達がありました。

1. 約 400 actor-ms で、緑青 / 琥珀の**単純な楕円が身体左から接近**して見えた
2. 約 1009ms で、**小さな楕円が胴内に残り**、流入・変換・蓄積よりも「物体を差し込む」印象が強かった
3. 約 1380ms で、**ほぼ灰色の平板楕円**へ減衰し、明背景では終盤がさらに読みにくかった
4. 発光の抑揚と多層現象が弱かった

r0.3 は、この失敗事実のみを改稿入力として使用しています。旧 Sol / Astra 案や他Eの既存造形・コードは参照していません。

## r0.3 の改稿点

- detached oval をやめ、**身体に接続した intake shroud** に変更
- 外側主形が縮退するほど、**身体内 reservoir** が増える因果へ変更
- 定着相に **settlement bands** を追加し、吸収後の状態変化を読む
- 終盤を **compact terminal seed** へ変更し、灰色の平板終端を避ける
- 明暗背景で同一の effect を使い、背景ごとの別設計はしていない

## 実施した検査

| 対象 | 状態 | 証拠 |
|---|---|---|
| 状態 / sampler / SFX / renderer mock テスト | pass | `qa/node-tests.txt` |
| B設計ローカル静的検査 | pass（局所） | `qa/design-validation.json` |
| WAV / PCM 数値書き出し | pass（数値） | `qa/audio-metrics.json` |
| CPU 参照 still | generated | `evidence/phase-sheet-CPU.png`, `evidence/h64-matrix-CPU.png` |
| CPU 参照動画 | generated または未生成のまま | `evidence/CPU-*.mp4`（生成できた場合のみ） |
| 実GPU WGSL コンパイル | not_run | `qa/acceptance.json` |
| H64 暗 / 明背景の実GPU全寿命確認 | not_run | `qa/acceptance.json` |
| 実聴 | not_run | `qa/acceptance.json` |
| 実DVA統合 | not_run | `qa/acceptance.json` |

## 受入条件（未採否）

以下は r0.3 の受入条件であり、この ZIP 単体で pass と断定した項目ではありません。

1. H64 実寸で、主形が楕円物体の接近ではなく、**身体がマナを受容する現象**として読めること
2. 発生 → 変換 → 吸収 → 定着 → 余韻が連続し、**外側減少 / 内側増加**の因果が読めること
3. 暗背景 / 明背景の両方で終盤の定着核が読め、白点・灰板・平面 badge に見えないこと
4. 近接3原因でも各原因が潰れず、継続バッジや不透明塊に誤読しないこと
5. actor 1× / 2× で VFX と SFX が同期し、一原因一声を維持すること
6. 死亡 / 退室 / ベント / 透明化 / セッション切替で残留なく消えること
7. 実聴で、起音・変換・収束が確認できること

## 限界

- CPU 参照は WebGPU 実行ではありません
- offline wav はスピーカー / ヘッドホンでの実聴結果ではありません
- この ZIP は本編接続の承認ではありません
- `not_run` を pass に変換する推論は行っていません
