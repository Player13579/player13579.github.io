# 人体生成 Sol R3 — 身体の隣で連続する材質収束

同じ人体生成 loop の3/5、残り2。R2原本と忠実な技術派生は変更しない。最新のE制作・品質改善指示と、RootおよびSolが実native画像で確認した材質欠陥に対する限定改稿。無条件のR4開始は許可されていない。

実欠陥はH48/H64/H128の452msにおける、白い衣装材質の長く薄い両翼状のせん断。OBS OFFでも残り、完成下部と接続して凝集する材質より、横へ張った別の形に見える。静止列から通常速度の全連続性まで合格とはしない。レビュー原画像・hashは`/workspace/dva-cloud/receipts/human-r2-visual-quality-sol61-r1/REVIEW.json`。

## 創作判断と実コード

主形は復活対象の元人物が下から上へ成立する結果。移送材質は同じ人物の同じrowの原RGBAであり、衣装を翼・流線・粒子に置き換えない。macroは完成身体に隣接する組立、mesoは原材質の幅と抜けが残る約10px高の連続凝集域（H64）、microは元spriteの境界補間のみ。世界内の材質運動と観測bloomは別の所有者を維持する。

行ごとのsmoothstep到着と24ms固定は保持し、横移送の幾何を再設計した。R2の`(1-approach)^2 * .34H`から、`(1-approach) * H * extentRatio`へ変更する。`extentRatio = maxRowShear * travelMs / (1.5 * bodySweepMs)`。smoothstepの最大微分が1.5なので、原画支持のCSS縦1px当たりの横せん断をnormalで最大1px、reducedで最大0.4pxに束縛する。法線・3D衣装を捏造せず、登録済み2D材質の表示輸送という近似を明示する。

横移送はH64で最大6.705px（R2は21.76px）、H48で5.029px、H128で13.410px。active row windowは110ms、縦支持は`H*110/700`でH64約10.057pxのまま。横の離隔をactive域の高さより小さくし、行間の急な折れ曲がりを拘束することで、横に薄く伸びる原材質を身体に近い連続した面へ戻す。色替え・増光・縮尺変更・filter追加で翼を隠さない。

実WORLD shaderは`handoff-state.mjs`と共有したratioを使う。各rowが原位置へ到着するとshiftは厳密に0、その後だけ24ms fixationが進む。半分の原materialを左右で相補分割し、fixed + transportのpremultiplied和を保持する。位置写像はx方向のrow平行移動のみで、source UVのyやx scaleを変えない。材質を薄める密度係数も追加しない。行shearの2D写像Jacobianの面積行列式は1であり、これは医学・3D体積・現実の質量保存の主張ではない。

## 保持する因果と独立受入

成功した`alchemy-human-transmutation`の正確なtargetId、同frame bodyScreen、crop、alpha支持、cause時間・scope世代だけを使う。caster/画面中心fallbackは許さない。復活判定・HP・死体・損傷は変更しない。foot arrival90ms、head arrival790ms、全固定814ms、寿命1200ms、次cause1380msは保持する。

原画`philia-front-nine-v752.png`はSHA256 `4f1901dfd275bfec01b6f4fd7da66f190e0b2396320de2fb36cc20a5e36490a3`、idle crop256×256、alpha支持[57,16,141,225]、origin[128,240]。原人物の肌・髪・顔・衣装と半透明境界は同じsampleを使う。source OFFは完成元人物、寿命後も元人物が残る。

SFX信号と24ms固定・closure時刻は保持する。verifyでは音量0かつ音声allocation0。普通音で動作・同期・聴感を別確認する。今回の形の変化に旧聴感合格を自動流用しない。

有色前線、white core、crown closure、selected source-bound local bloom、その全係数と時間包絡は変更しない。強発光を欠陥とは扱わない。PHは元材質の到着・固定と、その源の放射。OBSはemissionだけの局所Gaussian応答。lens flare/ghostは選択しない。架空のcamera coatingや新しい光源を追加しない。source/OBSのOFFと最終画素を別に再確認する。

技術baseは`/workspace/dva-cloud/integration/human-r2-pixelnorm-repair-luna-r1/route`。先行H geometry修理とpixelNorm宣言を忠実に継承し、それらをR3の創作改善へ再帰属させない。原R2/技術baseのpinsはWORKに保持する。Bは現remote確認済みcommit `22d3fcfd617f42b1a967de767906204c0221ec64`、base blob `8f1286e12402fe7b19650ad44bcddb38ad227a08`、extension blob `f35b61661d0209c0329d4a501a760d35b451d52e`を継承する。共有品質本文の旧blob metadata不整合は既存readbackに分離されている。全B形式適合は今回の限定差分から認定しない。

H48/64/128、同cause 45/220/430/440/452/464/710/790/814/840/865/1050/1199/1200、OBS OFF、source OFF、hiddenを実GPUで追う。材質の凝集が原寸で読めるか、arrival前に消えないか、固定時のalpha dipや別位置の再出現がないかを通常速度・初回/次loopでも審査する。CPUのrow shear/alpha証明、GPU実compile/submit、全寿命品質、普通SFX、gallery/public、本編、採用を別gateにする。CPUだけではR3改善済み・品質PASSにしない。
