# r0.2 規則 → 実装 → 観測 → 検査

本表は正本本文への参照と実装上の対応をまとめる。**要約は正本規則の代替ではない。** 記載した「観測対象」は意図した結果であり、観測済み結果ではない。実GPU・聴感・H64意味読解は `not_run`。CPU解析場は別実装の検査であり、shaderコンパイルや実デバイス画質の証明ではない。

実装行番号は配布時の参照補助。`design/rule-implementation-map.json` のpath/symbolで該当箇所を参照する。

## InferenceExpansionPolicy.InferenceExpansionPolicy

**要件要約:** 未宣言要素の補完には明示許可。属性具体化と区別。  
**正本:** `基底.md#InferenceExpansionPolicy.InferenceExpansionPolicy`  
**適用条件:** `always` / `ABSOLUTE_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:44` (`InferenceExpansionPolicy`)、`src/contract.mjs:35` (`classifyEvent`)

**観測対象:** 新しい人形、粒子、紋章、別sourceを追加しない。

**検査:** `tests/contract.test.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## InferenceExpansionPolicy.AttributeAndActionResolutionRule

**要件要約:** 既存内容の同一性を保って形態・状態・観測条件を具体化。  
**正本:** `基底.md#InferenceExpansionPolicy.AttributeAndActionResolutionRule`  
**適用条件:** `resolving_existing_elements_attributes_or_actions` / `FOUNDATION_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:44` (`InferenceExpansionPolicy`)、`src/contract.mjs:35` (`classifyEvent`)

**観測対象:** 源/輸送/受領の内部設計だけを選び、事件や主題を増やさない。

**検査:** `tests/contract.test.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## InferenceExpansionPolicy.DeclaredIntentRule

**要件要約:** 人数、属性、主動作、主要物、背景、画風、文字方針を保持。  
**正本:** `基底.md#InferenceExpansionPolicy.DeclaredIntentRule`  
**適用条件:** `always` / `FOUNDATION_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:44` (`InferenceExpansionPolicy`)、`src/contract.mjs:35` (`classifyEvent`)

**観測対象:** H64/暗明/一つの源/受領の契約を設計に固定。

**検査:** `tests/contract.test.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## InferenceExpansionPolicy.ExpressionIntentRule

**要件要約:** 伝えるべき関係と保護する関係をユーザー指定へ接続。  
**正本:** `基底.md#InferenceExpansionPolicy.ExpressionIntentRule`  
**適用条件:** `expression_design_and_acceptance` / `PLATONIC_GOOD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:44` (`InferenceExpansionPolicy`)、`src/contract.mjs:35` (`classifyEvent`)

**観測対象:** 到着と蓄積を必須、単なる中央小六角体だけが主に見える状態を不合格条件にする。

**検査:** `tests/contract.test.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## FoundationOperationTemplate.FoundationOperationRule

**要件要約:** 基底の規則と日本語説明、PH/OBSの責務を保持。  
**正本:** `基底.md#FoundationOperationTemplate.FoundationOperationRule`  
**適用条件:** `image_or_video_or_structured_code` / `FOUNDATION_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:2` (`FoundationOperationTemplate`)、`tools/check-design.mjs:3` (`check`)

**観測対象:** 説明と監査は日本語、識別子は正規形。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## FoundationOperationTemplate.RuleContractRule

**要件要約:** rule_id/owner/priority/applies_when/requirement/exception/validationを追跡。  
**正本:** `基底.md#FoundationOperationTemplate.RuleContractRule`  
**適用条件:** `specification_validation` / `FOUNDATION_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:2` (`FoundationOperationTemplate`)、`tools/check-design.mjs:3` (`check`)

**観測対象:** この対応表で正本→実装→観測→検証状態を追跡。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## FoundationOperationTemplate.PriorityRule

**要件要約:** 上位LOCKと明示意図を優先する。  
**正本:** `基底.md#FoundationOperationTemplate.PriorityRule`  
**適用条件:** `conflict_resolution` / `FOUNDATION_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:2` (`FoundationOperationTemplate`)、`tools/check-design.mjs:3` (`check`)

**観測対象:** 低位presetや例示の固定値で題材を変更しない。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## FoundationOperationTemplate.UniversalNoLabelOnlyRule

**要件要約:** ラベルだけで記述を終えない。  
**正本:** `基底.md#FoundationOperationTemplate.UniversalNoLabelOnlyRule`  
**適用条件:** `all_structured_descriptions` / `FOUNDATION_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:2` (`FoundationOperationTemplate`)、`tools/check-design.mjs:3` (`check`)

**観測対象:** PHの形、範囲、応答、失敗像を具体的に記述。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## FoundationOperationTemplate.OutputAndReferenceResolutionRule

**要件要約:** design_onlyと生成実行を区別しJSONを用いる。  
**正本:** `基底.md#FoundationOperationTemplate.OutputAndReferenceResolutionRule`  
**適用条件:** `design_serialization_or_formal_code_output` / `FOUNDATION_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:2` (`FoundationOperationTemplate`)、`tools/check-design.mjs:3` (`check`)

**観測対象:** B-Expression-2の静的設計と実行用Eソースを分け、画像生成を行わない。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PlatonicGoodTemplate.PlatonicGoodFoundation

**要件要約:** 明示意図、因果、知覚秩序を矛盾なく保つ。  
**正本:** `基底.md#PlatonicGoodTemplate.PlatonicGoodFoundation`  
**適用条件:** `always` / `PLATONIC_GOOD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:112` (`PlatonicGoodTemplate`)、`shaders/mana.wgsl:103` (`receiveField`)

**観測対象:** 確定通知→一つの可視Eと同じSFXのみ。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PlatonicGoodTemplate.BeautyStructuringRule

**要件要約:** 各PHに複数軸の既存証拠を持たせる。  
**正本:** `基底.md#PlatonicGoodTemplate.BeautyStructuringRule`  
**適用条件:** `composition_or_PH_evaluation` / `PLATONIC_GOOD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:112` (`PlatonicGoodTemplate`)、`shaders/mana.wgsl:103` (`receiveField`)

**観測対象:** 形の外縁/内部差と時間位相の証拠を記述。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PlatonicGoodTemplate.NoSingleBeautyStructureDominance

**要件要約:** 単一の数理比率を美の絶対条件にしない。  
**正本:** `基底.md#PlatonicGoodTemplate.NoSingleBeautyStructureDominance`  
**適用条件:** `beauty_structure_selection` / `ABSOLUTE_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:112` (`PlatonicGoodTemplate`)、`shaders/mana.wgsl:103` (`receiveField`)

**観測対象:** H64と主動作を優先し黄金比等を強制しない。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PlatonicGoodTemplate.GTBImplementationMapping

**要件要約:** PHをGood/Truth/Beautyの最低二層へ接続。  
**正本:** `基底.md#PlatonicGoodTemplate.GTBImplementationMapping`  
**適用条件:** `each_PH` / `ABSOLUTE_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:112` (`PlatonicGoodTemplate`)、`shaders/mana.wgsl:103` (`receiveField`)

**観測対象:** GTBConnectionsで位置/量/輪郭を対応付ける。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.UniversalPhenomenonRule

**要件要約:** 世界内PHは独立状態/境界/応答で分割し完全構造を保つ。  
**正本:** `基底.md#PhenomenonSystemTemplate.UniversalPhenomenonRule`  
**適用条件:** `world_internal_elements` / `ABSOLUTE_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 源・輸送量・受領量の3 PH。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.PIA

**要件要約:** 候補→採用→分割→登録→リンクを区別。  
**正本:** `基底.md#PhenomenonSystemTemplate.PIA`  
**適用条件:** `PH_candidate_selection_and_registration` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 採用した内部実現だけを属性具体化として登録。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.VisibilityDefinition

**要件要約:** visibilityに応じた証拠と完全構造を持つ。  
**正本:** `基底.md#PhenomenonSystemTemplate.VisibilityDefinition`  
**適用条件:** `each_PH` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 各可視PHの面/核/時間差を複数記述。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.LinkTypeRule

**要件要約:** physical/observation/gazeを分離しOBS依存をDAGにする。  
**正本:** `基底.md#PhenomenonSystemTemplate.LinkTypeRule`  
**適用条件:** `any_link` / `FOUNDATION_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** PH1→PH2→PH3とOBS1/OBS2を別リンクにする。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.DeepStructureRule

**要件要約:** Core/Structure/Surfaceを局所条件に結ぶ。  
**正本:** `基底.md#PhenomenonSystemTemplate.DeepStructureRule`  
**適用条件:** `each_PH` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 偏心核・連続体積・外縁を異なる関数応答で作る。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.StateTransformerRule

**要件要約:** before/afterだけでなく遷移と維持を持つ。  
**正本:** `基底.md#PhenomenonSystemTemplate.StateTransformerRule`  
**適用条件:** `each_PH` / `ABSOLUTE_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 源の面と量の減少→接続した輸送面の前端進行→受領面の上方充填→後端回収→保持→同じ受領中心へ収束。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.VisualCausalityRule

**要件要約:** 世界の因果を読める境界/差分/遷移にする。  
**正本:** `基底.md#PhenomenonSystemTemplate.VisualCausalityRule`  
**適用条件:** `visible_or_implicit_PH` / `ABSOLUTE_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 供給面の減少、源から切れない太い輸送面、到着後に上昇する受領上端を同じuへ結ぶ。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.UniversalMaterialResponseRule

**要件要約:** 同一入力でも局所差を持つResponderとする。  
**正本:** `基底.md#PhenomenonSystemTemplate.UniversalMaterialResponseRule`  
**適用条件:** `world_internal_elements` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 密度に応じるopacityと独立した有色面・核を計算する。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.HubPhenomenonRule

**要件要約:** 実在する複数応答だけをハブにする。  
**正本:** `基底.md#PhenomenonSystemTemplate.HubPhenomenonRule`  
**適用条件:** `recurrent_or_high_frequency_PH` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 受領済み量が面積・核・周辺光を変えるが受け手を追加しない。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.PhysicalModelClosureRule

**要件要約:** 境界/入力/収支/構成応答/近似を閉じる。  
**正本:** `基底.md#PhenomenonSystemTemplate.PhysicalModelClosureRule`  
**適用条件:** `each_PH` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 有限carrierのS+T+Rを保ち、実物理やmana付与と偽らない。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.ScaleAndSimilarityRule

**要件要約:** 長さ/時間/画素を区別する。  
**正本:** `基底.md#PhenomenonSystemTemplate.ScaleAndSimilarityRule`  
**適用条件:** `each_PH` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** worldのBOUNDSとH64 CSS px、owner秒を分離。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.DynamicResponseAndStabilityRule

**要件要約:** 応答時刻と安定条件を同じ時点へ接続。  
**正本:** `基底.md#PhenomenonSystemTemplate.DynamicResponseAndStabilityRule`  
**適用条件:** `each_PH` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 全層同時ピークにせず、源と受領で異なる時間相。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.PerceptualEvidenceDiscriminationRule

**要件要約:** 誤読と証拠の重複・視認条件を記述。  
**正本:** `基底.md#PhenomenonSystemTemplate.PerceptualEvidenceDiscriminationRule`  
**適用条件:** `each_PH` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 中央小六角体だけが主に見える状態/線/浮遊アイコンとの違いを実寸評価項目にする。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.CausalAssessmentAndUncertaintyRule

**要件要約:** 因果仮説と測定/比較結果を混同しない。  
**正本:** `基底.md#PhenomenonSystemTemplate.CausalAssessmentAndUncertaintyRule`  
**適用条件:** `each_PH` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** r0.1の原因はunknown。新形態は設計仮説。CPUの接続・面積テストをGPUの意味読解や旧版の因果診断に置換しない。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.CommonPHFailurePatterns

**要件要約:** 構造のみ/均一応答/観測混同を避ける。  
**正本:** `基底.md#PhenomenonSystemTemplate.CommonPHFailurePatterns`  
**適用条件:** `PH_validation` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** world-only検査と全寿命検査を同梱。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.PartitionAndSharedConditionsRule

**要件要約:** 状態/境界で分割し共有化で局所差を潰さない。  
**正本:** `基底.md#PhenomenonSystemTemplate.PartitionAndSharedConditionsRule`  
**適用条件:** `PH_partition_or_shared_condition_resolution` / `FOUNDATION_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 3 PHを完全展開し同じphaseだけ共有。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PhenomenonSystemTemplate.VisualProjectionRule

**要件要約:** 世界状態と描画に残す手掛かりを分離。  
**正本:** `基底.md#PhenomenonSystemTemplate.VisualProjectionRule`  
**適用条件:** `mapping_world_PH_to_depicted_evidence` / `PLATONIC_GOOD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:28` (`PhenomenonSystemTemplate`)、`src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 有色面と厚さを保持し、未許可の誇張/省略scopeを足さない。

**検査:** `tools/check-design.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PEMTemplate.PhenomenonEqualityMode

**要件要約:** 主役を消すのでなく説明できない孤立を避ける。  
**正本:** `基底.md#PEMTemplate.PhenomenonEqualityMode`  
**適用条件:** `all_scene_compositions` / `ABSOLUTE_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1058` (`PEMTemplate`)

**観測対象:** 源→輸送→受領を接続し独立した装飾効果を足さない。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PEMTemplate.AttentionRuleWithCCM

**要件要約:** 視線方針と経路を意図へ合わせる。  
**正本:** `基底.md#PEMTemplate.AttentionRuleWithCCM`  
**適用条件:** `attention_control` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1058` (`PEMTemplate`)

**観測対象:** 有色主形と外縁/近傍光の別経路を定義。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## CoordinateGravityWindTemplate.CoordinateSystemDefinition

**要件要約:** world→camera→screenを定める。  
**正本:** `基底.md#CoordinateGravityWindTemplate.CoordinateSystemDefinition`  
**適用条件:** `all_world_geometry` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1081` (`CoordinateGravityWindTemplate`)、`src/renderer.mjs:5` (`render`)、`src/contract.mjs:5` (`BOUNDS`)

**観測対象:** game y下をB y上へ明示変換し現在位置へ投影。

**検査:** `tests/engine.test.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## CoordinateGravityWindTemplate.RelationPriorityRule

**要件要約:** 絶対値より空間関係を保つ。  
**正本:** `基底.md#CoordinateGravityWindTemplate.RelationPriorityRule`  
**適用条件:** `spatial_constraints` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1081` (`CoordinateGravityWindTemplate`)、`src/renderer.mjs:5` (`render`)、`src/contract.mjs:5` (`BOUNDS`)

**観測対象:** 源が下、受領が腹部である関係を固定。

**検査:** `tests/engine.test.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## CoordinateGravityWindTemplate.GlobalVectorFieldRule

**要件要約:** direction/magnitude/falloff/fluctuationを具体化。  
**正本:** `基底.md#CoordinateGravityWindTemplate.GlobalVectorFieldRule`  
**適用条件:** `motion_force_flow_orientation` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1081` (`CoordinateGravityWindTemplate`)、`src/renderer.mjs:5` (`render`)、`src/contract.mjs:5` (`BOUNDS`)

**観測対象:** 一本の上向き輸送と有限偏位。

**検査:** `tests/engine.test.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## CoordinateGravityWindTemplate.StateTransitionRule

**要件要約:** driver/path/convergence/historyを持つ。  
**正本:** `基底.md#CoordinateGravityWindTemplate.StateTransitionRule`  
**適用条件:** `each_PH_or_global_field` / `ABSOLUTE_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1081` (`CoordinateGravityWindTemplate`)、`src/renderer.mjs:5` (`render`)、`src/contract.mjs:5` (`BOUNDS`)

**観測対象:** eventとowner phaseから履歴が一義的に定まる。

**検査:** `tests/engine.test.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## CoordinateGravityWindTemplate.GravityConditionDefinition

**要件要約:** 重力を共通条件として保持する。  
**正本:** `基底.md#CoordinateGravityWindTemplate.GravityConditionDefinition`  
**適用条件:** `all_world_PH` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1081` (`CoordinateGravityWindTemplate`)、`src/renderer.mjs:5` (`render`)、`src/contract.mjs:5` (`BOUNDS`)

**観測対象:** 質量のない宣言場へ架空の床反力を足さない。

**検査:** `tests/engine.test.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## CoordinateGravityWindTemplate.WindCapsuleOperationRule

**要件要約:** 正式出力にWindCapsuleと媒体状態を持つ。  
**正本:** `基底.md#CoordinateGravityWindTemplate.WindCapsuleOperationRule`  
**適用条件:** `all_formal_outputs` / `FOUNDATION_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1081` (`CoordinateGravityWindTemplate`)、`src/renderer.mjs:5` (`render`)、`src/contract.mjs:5` (`BOUNDS`)

**観測対象:** calm air、風/粒子/髪/布は追加しない。

**検査:** `tests/engine.test.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## CoordinateGravityWindTemplate.NaturalVarianceRule

**要件要約:** 拘束された主構造にだけ有界変動を許す。  
**正本:** `基底.md#CoordinateGravityWindTemplate.NaturalVarianceRule`  
**適用条件:** `natural_motion_or_field` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1081` (`CoordinateGravityWindTemplate`)、`src/renderer.mjs:5` (`render`)、`src/contract.mjs:5` (`BOUNDS`)

**観測対象:** event seedはわずかな内部放射振幅だけを変える。幾何・源/受領位置・輸送経路は動かさず、reducedMotionでも因果を保持。

**検査:** `tests/engine.test.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## CoordinateGravityWindTemplate.VisibleTranslationRule

**要件要約:** 数値拘束を可視/間接証拠へ翻訳する。  
**正本:** `基底.md#CoordinateGravityWindTemplate.VisibleTranslationRule`  
**適用条件:** `numeric_or_vector_constraint_exists` / `ABSOLUTE_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1081` (`CoordinateGravityWindTemplate`)、`src/renderer.mjs:5` (`render`)、`src/contract.mjs:5` (`BOUNDS`)

**観測対象:** 位置・幅・時間をsource/受領面と到着順序に結ぶ。

**検査:** `tests/engine.test.mjs`、`tests/gpu-tests.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## OctaDomainTemplate.OctaDomainDefinition

**要件要約:** 全PHで8領域を保持し不適用は理由付きlatent。  
**正本:** `基底.md#OctaDomainTemplate.OctaDomainDefinition`  
**適用条件:** `each_PH` / `ABSOLUTE_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:228` (`OctaDomainTemplate`)

**観測対象:** 実燃焼、実電荷、濡れ、レンズ光学を誤って作らない。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## AnimeStudiesTemplate.ImageOrientedAnimeStudiesLayer

**要件要約:** Image設計の原画的瞬間と前後時間を読む。  
**正本:** `基底.md#AnimeStudiesTemplate.ImageOrientedAnimeStudiesLayer`  
**適用条件:** `mode_Image_and_style_is_anime_or_anime_studies_requested` / `ABSOLUTE_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1227` (`AnimeStudiesTemplate`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** u=0.47の受領途中と前後の保持/収束を定義。

**検査:** `tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## AnimeStudiesTemplate.AnimeLayoutRule

**要件要約:** 既存要素の配置・余白・視線を統合。  
**正本:** `基底.md#AnimeStudiesTemplate.AnimeLayoutRule`  
**適用条件:** `image_layout` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1227` (`AnimeStudiesTemplate`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 足元から腹部へ向かう主軸を空間に確保。

**検査:** `tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## AnimeStudiesTemplate.KeyframeSnapshotRule

**要件要約:** 前後状態が読めるsnapshotを選ぶ。  
**正本:** `基底.md#AnimeStudiesTemplate.KeyframeSnapshotRule`  
**適用条件:** `Mode=Image` / `ABSOLUTE_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1227` (`AnimeStudiesTemplate`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** follow_through時点に輸送残量と受領面を併存。

**検査:** `tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## AnimeStudiesTemplate.SilhouetteDesignRule

**要件要約:** 動作と重要関係をシルエットで読ませる。  
**正本:** `基底.md#AnimeStudiesTemplate.SilhouetteDesignRule`  
**適用条件:** `silhouette_present` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1227` (`AnimeStudiesTemplate`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 体積を細線にせず源/輸送/受領の形態を区別。

**検査:** `tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## AnimeStudiesTemplate.AnticipationAftermathRule

**要件要約:** 既存要素の時間関係でタメ/余韻を表す。  
**正本:** `基底.md#AnimeStudiesTemplate.AnticipationAftermathRule`  
**適用条件:** `action_has_before_or_after_phase` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1227` (`AnimeStudiesTemplate`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 0.76〜0.84に受領済み量を保持。

**検査:** `tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## AnimeStudiesTemplate.LimitedAnimationStillnessRule

**要件要約:** 静止を状態保持として扱う。  
**正本:** `基底.md#AnimeStudiesTemplate.LimitedAnimationStillnessRule`  
**適用条件:** `still_or_partially_still_scene` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1227` (`AnimeStudiesTemplate`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 保持相の受領核を別の発射へ変化させない。

**検査:** `tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## AnimeStudiesTemplate.SakugaDensityRule

**要件要約:** 密度を線数でなく因果・形態で制御。  
**正本:** `基底.md#AnimeStudiesTemplate.SakugaDensityRule`  
**適用条件:** `anime_density_design` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1227` (`AnimeStudiesTemplate`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 粒子数やノイズで密度を偽装しない。

**検査:** `tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## AnimeStudiesTemplate.AnimeCompositeRule

**要件要約:** 光/色/境界を統合しOBSで主形を置換しない。  
**正本:** `基底.md#AnimeStudiesTemplate.AnimeCompositeRule`  
**適用条件:** `anime_composite` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1227` (`AnimeStudiesTemplate`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** world-onlyでも有色体積が残る設計。

**検査:** `tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## AnimeStudiesTemplate.ImageOriented12PrinciplesSubset

**要件要約:** staging/solid drawing/timing等を対象へ適用。  
**正本:** `基底.md#AnimeStudiesTemplate.ImageOriented12PrinciplesSubset`  
**適用条件:** `anime_motion_or_pose_design` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1227` (`AnimeStudiesTemplate`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 局所面・方向・保持時相を使いcartoon変形を足さない。

**検査:** `tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ObservationIntegrationTemplate.ObservationRegistrySeparationRule

**要件要約:** 観測操作はOBSとして入力/マスク/順序/保護を登録。  
**正本:** `基底.md#ObservationIntegrationTemplate.ObservationRegistrySeparationRule`  
**適用条件:** `observation_or_display_operation_exists` / `FOUNDATION_LOCK`

**実装:** `shaders/mana.wgsl:131` (`observe`)、`src/renderer.mjs:5` (`render`)、`design/mana-receive.B-Expression-2.json:29` (`ObservationIntegrationTemplate`)

**観測対象:** source-bound拡散と表示変換だけを登録。

**検査:** `tests/gpu-tests.mjs`、`tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ObservationIntegrationTemplate.OperationClasses

**要件要約:** 存在する撮影/表示操作だけを扱う。  
**正本:** `基底.md#ObservationIntegrationTemplate.OperationClasses`  
**適用条件:** `image_integration` / `HARD_LOCK`

**実装:** `shaders/mana.wgsl:131` (`observe`)、`src/renderer.mjs:5` (`render`)、`design/mana-receive.B-Expression-2.json:29` (`ObservationIntegrationTemplate`)

**観測対象:** ToneColor/LightIntegrationを使用し不要なgrain等を足さない。

**検査:** `tests/gpu-tests.mjs`、`tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ObservationIntegrationTemplate.PostEffectsCommonRule

**要件要約:** OBSはprimary geometryやsourceを作らない。  
**正本:** `基底.md#ObservationIntegrationTemplate.PostEffectsCommonRule`  
**適用条件:** `PostEffects_or_display_transform` / `ABSOLUTE_LOCK`

**実装:** `shaders/mana.wgsl:131` (`observe`)、`src/renderer.mjs:5` (`render`)、`design/mana-receive.B-Expression-2.json:29` (`ObservationIntegrationTemplate`)

**観測対象:** receiveField/sourceFieldが主形を作りobserveは外側に従属。

**検査:** `tests/gpu-tests.mjs`、`tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ObservationIntegrationTemplate.ObservationIntensityBudgetRule

**要件要約:** 合成強度の正本を一つにする。  
**正本:** `基底.md#ObservationIntegrationTemplate.ObservationIntensityBudgetRule`  
**適用条件:** `any_OBS_composite` / `FOUNDATION_LOCK`

**実装:** `shaders/mana.wgsl:131` (`observe`)、`src/renderer.mjs:5` (`render`)、`design/mana-receive.B-Expression-2.json:29` (`ObservationIntegrationTemplate`)

**観測対象:** 局所glow最大alpha0.10、有色本体と輪郭を保護。

**検査:** `tests/gpu-tests.mjs`、`tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ObservationIntegrationTemplate.CompositeValidationRule

**要件要約:** 合成後の輪郭/白飛び/色/細部/背景を検査。  
**正本:** `基底.md#ObservationIntegrationTemplate.CompositeValidationRule`  
**適用条件:** `after_observation_composite` / `HARD_LOCK`

**実装:** `shaders/mana.wgsl:131` (`observe`)、`src/renderer.mjs:5` (`render`)、`design/mana-receive.B-Expression-2.json:29` (`ObservationIntegrationTemplate`)

**観測対象:** GPU検査コードを同梱し未実施をnot_runと記録。

**検査:** `tests/gpu-tests.mjs`、`tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ObservationIntegrationTemplate.SamplingAndReconstructionRule

**要件要約:** 解像度/表示倍率/時間/実行条件を分ける。  
**正本:** `基底.md#ObservationIntegrationTemplate.SamplingAndReconstructionRule`  
**適用条件:** `image_or_video_output` / `HARD_LOCK`

**実装:** `shaders/mana.wgsl:131` (`observe`)、`src/renderer.mjs:5` (`render`)、`design/mana-receive.B-Expression-2.json:29` (`ObservationIntegrationTemplate`)

**観測対象:** H64とDPRを分離し、同一解像度textureLoadで転送。

**検査:** `tests/gpu-tests.mjs`、`tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ObservationIntegrationTemplate.StrictTermDefinitions

**要件要約:** 光学flareとdisplay変換等を混同しない。  
**正本:** `基底.md#ObservationIntegrationTemplate.StrictTermDefinitions`  
**適用条件:** `observation_terms_used` / `HARD_LOCK`

**実装:** `shaders/mana.wgsl:131` (`observe`)、`src/renderer.mjs:5` (`render`)、`design/mana-receive.B-Expression-2.json:29` (`ObservationIntegrationTemplate`)

**観測対象:** 局所拡散をレンズゴーストと呼ばない。

**検査:** `tests/gpu-tests.mjs`、`tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ExtremumDesignColorTemplate.PEVRule

**要件要約:** 成立する状態から必要な関係が読める状態を選ぶ。  
**正本:** `基底.md#ExtremumDesignColorTemplate.PEVRule`  
**適用条件:** `candidate_world_states_exist` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1401` (`ExtremumDesignColorTemplate`)、`shaders/mana.wgsl:76` (`transportField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 受領途中u=0.47を設計snapshotにする。

**検査:** `tools/check-design.mjs`、`tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ExtremumDesignColorTemplate.AESRule

**要件要約:** 成立する状態集合内で形/密度/余白/色を選ぶ。  
**正本:** `基底.md#ExtremumDesignColorTemplate.AESRule`  
**適用条件:** `PEV_candidates_selected` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1401` (`ExtremumDesignColorTemplate`)、`shaders/mana.wgsl:76` (`transportField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** H64の厚い本体と段階的な受領を選ぶ。

**検査:** `tools/check-design.mjs`、`tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ExtremumDesignColorTemplate.DesignScienceRule

**要件要約:** 階層/密度/余白/形状秩序を具体化。  
**正本:** `基底.md#ExtremumDesignColorTemplate.DesignScienceRule`  
**適用条件:** `all_outputs` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1401` (`ExtremumDesignColorTemplate`)、`shaders/mana.wgsl:76` (`transportField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 有色面→核→局所外側光の順序。

**検査:** `tools/check-design.mjs`、`tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ExtremumDesignColorTemplate.CCMScope

**要件要約:** palette/lighting/background/perceptionを拘束。  
**正本:** `基底.md#ExtremumDesignColorTemplate.CCMScope`  
**適用条件:** `color_lighting_background_binding` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1401` (`ExtremumDesignColorTemplate`)、`shaders/mana.wgsl:76` (`transportField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 琥珀源、青緑輸送、緑の受領と暗/明背景。

**検査:** `tools/check-design.mjs`、`tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ExtremumDesignColorTemplate.AESEvaluationAxes

**要件要約:** 意図に適用される軸だけを選ぶ。  
**正本:** `基底.md#ExtremumDesignColorTemplate.AESEvaluationAxes`  
**適用条件:** `AES_evaluation` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1401` (`ExtremumDesignColorTemplate`)、`shaders/mana.wgsl:76` (`transportField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 体積の区別・遷移の読解・外縁の可読性で評価。

**検査:** `tools/check-design.mjs`、`tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ExtremumDesignColorTemplate.ColorScienceInAES

**要件要約:** 色を状態/遮蔽/観測マスクに結ぶ。  
**正本:** `基底.md#ExtremumDesignColorTemplate.ColorScienceInAES`  
**適用条件:** `AES_color_evaluation` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1401` (`ExtremumDesignColorTemplate`)、`shaders/mana.wgsl:76` (`transportField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 虹色均等帯ではなく核/本体/外縁の役割に対応。

**検査:** `tools/check-design.mjs`、`tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ExtremumDesignColorTemplate.ArtisticBeautyDefinitions

**要件要約:** 芸術・知覚・素材の成立を別に評価。  
**正本:** `基底.md#ExtremumDesignColorTemplate.ArtisticBeautyDefinitions`  
**適用条件:** `aesthetic_evaluation` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1401` (`ExtremumDesignColorTemplate`)、`shaders/mana.wgsl:76` (`transportField`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 数値テストを芸術性の点数に変換しない。

**検査:** `tools/check-design.mjs`、`tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## TermsTemplate.Terms

**要件要約:** 用語の責務と旧互換を解決する。  
**正本:** `基底.md#TermsTemplate.Terms`  
**適用条件:** `terminology_resolution` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1494` (`TermsTemplate`)

**観測対象:** PHとOBS、設計と実行、実検査と要求を区別。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## GlobalAcceptanceTemplate.GlobalAcceptanceCriteria

**要件要約:** 構造/意味/実生成観察を分ける。  
**正本:** `基底.md#GlobalAcceptanceTemplate.GlobalAcceptanceCriteria`  
**適用条件:** `final_validation` / `ABSOLUTE_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1919` (`GlobalAcceptanceTemplate`)、`docs/ACCEPTANCE.md:39` (`not_run`)

**観測対象:** Node合格からGPU/聴感合格を主張しない。

**検査:** `tools/check-design.mjs`、`tests/gpu_probe.py`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## GlobalAcceptanceTemplate.ComparativeEvaluationRule

**要件要約:** 比較条件/保持条件/証拠/限界を残す。  
**正本:** `基底.md#GlobalAcceptanceTemplate.ComparativeEvaluationRule`  
**適用条件:** `specification_or_render_quality_comparison_planned_or_performed` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1919` (`GlobalAcceptanceTemplate`)、`docs/ACCEPTANCE.md:39` (`not_run`)

**観測対象:** CPUのdark/light・OBS off数値検査と、未実施のGPU/H64全寿命比較を分離。旧版比較の因果的な優越は未証明。

**検査:** `tools/check-design.mjs`、`tests/gpu_probe.py`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## GlobalAcceptanceTemplate.PassWarningFailEvaluation

**要件要約:** 未実施の実観察をPassにしない。  
**正本:** `基底.md#GlobalAcceptanceTemplate.PassWarningFailEvaluation`  
**適用条件:** `validation_results_available` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1919` (`GlobalAcceptanceTemplate`)、`docs/ACCEPTANCE.md:39` (`not_run`)

**観測対象:** 仕様Warning、Render NotRunを保持。

**検査:** `tools/check-design.mjs`、`tests/gpu_probe.py`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## GlobalAcceptanceTemplate.IntentAndArtisticOutcomeRule

**要件要約:** 構造/意図/芸術的成果を別評価。  
**正本:** `基底.md#GlobalAcceptanceTemplate.IntentAndArtisticOutcomeRule`  
**適用条件:** `final_design_or_render_assessment` / `HARD_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1919` (`GlobalAcceptanceTemplate`)、`docs/ACCEPTANCE.md:39` (`not_run`)

**観測対象:** 実身体への到着や芸術的品質を観察済みと偽らない。

**検査:** `tools/check-design.mjs`、`tests/gpu_probe.py`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ExtensionActivationTable.ExtensionActivationRule

**要件要約:** 条件を満たした拡張だけ起動。  
**正本:** `拡張.md#ExtensionActivationTable.ExtensionActivationRule`  
**適用条件:** `extension_resolution` / `FOUNDATION_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1509` (`ExtensionActivationTable`)

**観測対象:** E/VFX/必要なPostEffects/LDM/gradientを選ぶ。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ExtensionActivationTable.ExpressionIntegrationRule

**要件要約:** 拡張は明示意図・PH/OBS・IntensityBudgetを保持。  
**正本:** `拡張.md#ExtensionActivationTable.ExpressionIntegrationRule`  
**適用条件:** `any_extension_active` / `FOUNDATION_LOCK`

**実装:** `design/mana-receive.B-Expression-2.json:1509` (`ExtensionActivationTable`)

**観測対象:** preset一式やMagicArchitectureを自動展開しない。

**検査:** `tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## VFX.VFXActivationRule

**要件要約:** 世界内現象はPH、観測はOBS。自然/非現実の機構を区別。  
**正本:** `拡張.md#VFX.VFXActivationRule`  
**適用条件:** `VFX_explicit_or_attribute_resolved_or_inferred_support_VFX_accepted` / `HARD_LOCK`

**実装:** `shaders/mana.wgsl:47` (`sourceField`)、`shaders/mana.wgsl:76` (`transportField`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/renderer.mjs:5` (`render`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 非質量carrierをdeclared_fantasyとして内部実現。

**検査:** `tests/gpu-tests.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## VFX.MultilayerArchitectureRule

**要件要約:** 層の機能/空間/形態/応答を分ける。  
**正本:** `拡張.md#VFX.MultilayerArchitectureRule`  
**適用条件:** `VFX_active` / `FOUNDATION_LOCK`

**実装:** `shaders/mana.wgsl:47` (`sourceField`)、`shaders/mana.wgsl:76` (`transportField`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/renderer.mjs:5` (`render`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 同色違いの同形重ねではなく源・輸送・受領・観測を分担。

**検査:** `tests/gpu-tests.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## VFX.SpatialMorphologyRule

**要件要約:** macro/meso/microと境界/奥行きを具体化。  
**正本:** `拡張.md#VFX.SpatialMorphologyRule`  
**適用条件:** `VFX_active` / `HARD_LOCK`

**実装:** `shaders/mana.wgsl:47` (`sourceField`)、`shaders/mana.wgsl:76` (`transportField`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/renderer.mjs:5` (`render`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 最大86×26wuの供給面、幅23〜28wuの連続輸送面、腹部で約68×44wuまで満ちる受領面。細線・粒子の反復ではない。

**検査:** `tests/gpu-tests.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## VFX.MaterialOpticalResponseRule

**要件要約:** 不透明度/放射/密度を分離。  
**正本:** `拡張.md#VFX.MaterialOpticalResponseRule`  
**適用条件:** `VFX_active` / `ABSOLUTE_LOCK`

**実装:** `shaders/mana.wgsl:47` (`sourceField`)、`shaders/mana.wgsl:76` (`transportField`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/renderer.mjs:5` (`render`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** densityからopacityを非線形計算し、核の放射と有色面は別値。

**検査:** `tests/gpu-tests.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## VFX.TransportTemporalRule

**要件要約:** 供給/経路/維持/消散を同じ時計へ結ぶ。  
**正本:** `拡張.md#VFX.TransportTemporalRule`  
**適用条件:** `VFX_active` / `HARD_LOCK`

**実装:** `shaders/mana.wgsl:47` (`sourceField`)、`shaders/mana.wgsl:76` (`transportField`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/renderer.mjs:5` (`render`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** S/T/Rは同じowner uの有限表示量。源が空になるu=.62で後端回収を開始し、u=.76の受領完了で輸送を閉じる。

**検査:** `tests/gpu-tests.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## VFX.EnvironmentCompositionRule

**要件要約:** 既存受け手・境界へ作用を結ぶ。  
**正本:** `拡張.md#VFX.EnvironmentCompositionRule`  
**適用条件:** `VFX_active` / `HARD_LOCK`

**実装:** `shaders/mana.wgsl:47` (`sourceField`)、`shaders/mana.wgsl:76` (`transportField`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/renderer.mjs:5` (`render`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 現在足元/腹部アンカーとsource-bound入射光を計算。

**検査:** `tests/gpu-tests.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## VFX.CompositingReadabilityRule

**要件要約:** world前後関係と画像処理順序を分離して検証。  
**正本:** `拡張.md#VFX.CompositingReadabilityRule`  
**適用条件:** `VFX_active` / `HARD_LOCK`

**実装:** `shaders/mana.wgsl:47` (`sourceField`)、`shaders/mana.wgsl:76` (`transportField`)、`shaders/mana.wgsl:103` (`receiveField`)、`src/renderer.mjs:5` (`render`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** linear over→OBS→sRGB→実canvas提出。

**検査:** `tests/gpu-tests.mjs`、`tests/clock-and-signal.test.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## ECodeImplementation.ExecutableECodeBranchRule

**要件要約:** B設計を実行可能Eへ翻訳し正本revision/関数/観測/検証を対応付ける。  
**正本:** `拡張.md#ECodeImplementation.ExecutableECodeBranchRule`  
**適用条件:** `executable_runtime_E_code_explicit` / `HARD_LOCK`

**実装:** `src/controller.mjs:4` (`ManaEffectController`)、`src/engine.mjs:90` (`commitFrame`)、`src/audio.mjs:4` (`ManaOneShotAudio`)、`design/provenance.json:5` (`source_commit`)

**観測対象:** 画像生成でなくWebGPUソースと一回限りSFX。未実行のGPU/聴感/ゲーム統合はnot_run。

**検査:** `tests/engine.test.mjs`、`tests/audio.test.mjs`、`tests/gpu_probe.py`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PostEffects.PostEffectsAutonomousActivationRule

**要件要約:** 属性具体化起動では選択した操作だけをOBS登録。  
**正本:** `拡張.md#PostEffects.PostEffectsAutonomousActivationRule`  
**適用条件:** `PostEffects_explicit_or_attribute_resolved_or_accepted_inferred_PostEffects` / `ABSOLUTE_LOCK`

**実装:** `shaders/mana.wgsl:131` (`observe`)、`design/mana-receive.B-Expression-2.json:1533` (`PostEffects`)

**観測対象:** ordinary_posteffects=false、source-bound local diffusionのみ。

**検査:** `tests/gpu-tests.mjs`、`tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PostEffects.SPCARule

**要件要約:** 既存PHピークを選ぶ場合も8領域と読める差分を保持。  
**正本:** `拡張.md#PostEffects.SPCARule`  
**適用条件:** `world_internal_PH_local_peak_selected` / `ABSOLUTE_LOCK`

**実装:** `shaders/mana.wgsl:131` (`observe`)、`design/mana-receive.B-Expression-2.json:1533` (`PostEffects`)

**観測対象:** 核/外縁/減衰の違いを使い新しいPHを追加しない。

**検査:** `tests/gpu-tests.mjs`、`tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## PostEffects.GlobalLocalRule

**要件要約:** 対象がある操作はlocalとし重複を避ける。  
**正本:** `拡張.md#PostEffects.GlobalLocalRule`  
**適用条件:** `PostEffects_active` / `HARD_LOCK`

**実装:** `shaders/mana.wgsl:131` (`observe`)、`design/mana-receive.B-Expression-2.json:1533` (`PostEffects`)

**観測対象:** 全画面glowや未指定の信号ノイズなし。

**検査:** `tests/gpu-tests.mjs`、`tools/check-design.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## LuminanceDynamicsModule.LDMActivationRule

**要件要約:** 非明示のVFX/PostEffectsは輝度ダイナミクスが必要な場合だけ起動。  
**正本:** `拡張.md#LuminanceDynamicsModule.LDMActivationRule`  
**適用条件:** `explicit_VFX_or_explicit_PostEffects_or_nonexplicit_target_requires_luminance_dynamics_true` / `ABSOLUTE_LOCK`

**実装:** `src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`design/mana-receive.B-Expression-2.json:1550` (`LuminanceDynamicsModule`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 源/受領量に従属した輝度変化のために起動。

**検査:** `tests/clock-and-signal.test.mjs`、`tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## LuminanceDynamicsModule.LDMModeRule

**要件要約:** 空間/時間包絡を対象と既存budgetへ従属させる。  
**正本:** `拡張.md#LuminanceDynamicsModule.LDMModeRule`  
**適用条件:** `LDM_active` / `HARD_LOCK`

**実装:** `src/phase.mjs:13` (`evaluatePhase`)、`shaders/mana.wgsl:34` (`phaseState`)、`design/mana-receive.B-Expression-2.json:1550` (`LuminanceDynamicsModule`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 源/輸送/受領の局所輝度を量に結ぶ。末尾の光半径・強度は受領面の縮小へ追従し、広いglowだけを残さない。

**検査:** `tests/clock-and-signal.test.mjs`、`tests/gpu-tests.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

## GradientAnchorPolicy.GradientAnchorRule

**要件要約:** world表面/worldVFX/OBSの色変化を区別し各アンカーを説明。  
**正本:** `拡張.md#GradientAnchorPolicy.GradientAnchorRule`  
**適用条件:** `hue_gradient_declared_or_attribute_resolved_or_accepted_inferred` / `ABSOLUTE_LOCK`

**実装:** `shaders/mana.wgsl:47` (`sourceField`)、`shaders/mana.wgsl:103` (`receiveField`)、`design/mana-receive.B-Expression-2.json:1554` (`GradientAnchorPolicy`)、`src/phase.mjs:13` (`evaluatePhase`)、`src/geometry.mjs:80` (`sampleFields`)

**観測対象:** 源/本体/核の役割に沿った3色以上の状態アンカー。

**検査:** `tests/gpu-tests.mjs`、`tools/check-design.mjs`、`tests/geometry.test.mjs`、`tools/check-causal-field.mjs`
実施結果は `evidence/validation-summary.json` と各証拠ファイルを参照。実GPU・聴感の観察結果は `not_run`。

