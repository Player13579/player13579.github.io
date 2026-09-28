# Heal Astra sparkle r3

**品質候補・未採用・本編未接続。** Healの回復リボンと胸元への受領という題材に、単一の斜め基準角 **−64°**（直交光条+26°）を選択。全キラキラ・全位相で統一。位置・大小・強度・発生時刻・depthのみ局所因果を保持。r1/r2/採用原本は不変。

- Entry: `index.html`。H64既定、12秒loop。検証には `?verify=1` 必須、解除不能の無音。原本OFFは `&baseline=1`。
- 設計: `design.md`。`evidence/anchor-angle-mapping.json`で全活動点の同一角を確認。
- 暗明H64画像: `evidence/contact-dark.png`, `evidence/contact-light.png`（上r3/下元版）。
- 全寿命: `evidence/continuous-dark.webm`, `continuous-light.webm`。12.26/12.25秒、688/687frames。
- 角度: 全1200時刻、reducedMotion、zoom .2/1/4で単一角の自動検査PASS。
- GPU: 69画像、WGSL/GPU/page errors0。暗明34 A/B全RGBで減光0、OFF元版34PNG byte一致、12秒終端一致。
- 不変: 採用原本8ファイルSHA一致、r1/r2全224ファイルSHA不変。
- 音: `evidence/heal-sparkle-r3.wav`。元の原音/受領音ソース保持。12秒48k stereo peak .188495、OfflineAudioContext volume .9 peak .169646。開始/重複拒否/途中開始/無効位相/破棄PASS。**実聴not_run**。
- 凍結: `package-files.json`、`evidence/exact-source-freeze.json`、`evidence/heal-astra-sparkle-r3-replay.zip`。

主担当の暗明全寿命目視でも視覚品質候補として受入済み。ユーザー採用・本編接続とは別。

自己判定: H64の暗明で統一した斜め十字光条が読み取れ、顔と主形を保持する品質候補。明背景の白い主光流と重なる一部点は局所差が弱いが、減光して差を出す処理は行わない。実聴、本編接続、多人数負荷、ユーザー採用は未検証/未実施。

検証routeは親担当のGPU排他枠のheadless Chrome。所有browser/serverはfinally終了とexit0確認。Status担当へGPU枠を引渡済み。ギャラリー/ゲーム/スキル未変更。

モデル分担
- GPT-6-Astra 100% — r3の題材別固定角設計・実装・検証・凍結。過去版の作者帰属はmanifestに別記保持。
