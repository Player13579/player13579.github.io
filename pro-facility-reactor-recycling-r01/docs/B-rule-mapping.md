# B規則対応表

全123規則、適用83規則。静的対応確認と画素/聴感の品質判断は分離します。

正本は会話で受領した基底・拡張です。JSON版はrule_id、条件、正本参照、コード、期待帰結、検証方法、実観察状態を保持します。
非起動は適用範囲によるもので、知らないゲーム全体の人体・重力・物性を断定したものではありません。

## InferenceExpansionPolicy

### `InferenceExpansionPolicy.InferenceExpansionPolicy`

状態: **applicable**。源/受け手/利益/寿命を固定し、粒子・追加物体・背景・人体・presetを追加しない。源/伝達/受領の形は既存Eの具体化として登録する。

実装: `src/runtime/contracts.mjs:21` (validateReceipt / TARGETS / fingerprint) / `src/runtime/controller.mjs:1` (FacilityController.receive / sampleFrame) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: tests/receipt.test.mjs と構造検査。対象7項目の棄却とoriginの理由を照合。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `InferenceExpansionPolicy.AttributeAndActionResolutionRule`

状態: **applicable**。独立した対象追加と形状/位相の具体化を分ける。metadataは表示用で、クライアント利益APIが存在しない。

実装: `src/runtime/contracts.mjs:21` (validateReceipt / TARGETS / fingerprint) / `src/runtime/controller.mjs:1` (FacilityController.receive / sampleFrame) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: receipt invariants / forbidden API scan。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `InferenceExpansionPolicy.DeclaredIntentRule`

状態: **applicable**。独立した対象追加と形状/位相の具体化を分ける。metadataは表示用で、クライアント利益APIが存在しない。

実装: `src/runtime/contracts.mjs:21` (validateReceipt / TARGETS / fingerprint) / `src/runtime/controller.mjs:1` (FacilityController.receive / sampleFrame) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: receipt invariants / forbidden API scan。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `InferenceExpansionPolicy.ExpressionIntentRule`

状態: **applicable**。H64の原因→媒体→受け手→結果、A/B独立、正確な原因単位の一回性を目的として保持する。画素未観察を成功と言わない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: ExpressionIntentと検査棄却条件の対応を照合。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

## FoundationOperationTemplate

### `FoundationOperationTemplate.FoundationOperationRule`

状態: **applicable**。B設計JSONはB-Expression-2/Video/design_only。Eソースは別成果物。PH/OBSの機構と限界、参照、3層検査を日本語で記録する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: JSON必須構造、全参照、rule_id一意性、Eコードの非画像生成を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `FoundationOperationTemplate.RuleContractRule`

状態: **applicable**。B設計JSONはB-Expression-2/Video/design_only。Eソースは別成果物。PH/OBSの機構と限界、参照、3層検査を日本語で記録する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: JSON必須構造、全参照、rule_id一意性、Eコードの非画像生成を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `FoundationOperationTemplate.PriorityRule`

状態: **applicable**。B設計JSONはB-Expression-2/Video/design_only。Eソースは別成果物。PH/OBSの機構と限界、参照、3層検査を日本語で記録する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: JSON必須構造、全参照、rule_id一意性、Eコードの非画像生成を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `FoundationOperationTemplate.ConflictResolutionRule`

状態: **applicable**。B設計JSONはB-Expression-2/Video/design_only。Eソースは別成果物。PH/OBSの機構と限界、参照、3層検査を日本語で記録する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: JSON必須構造、全参照、rule_id一意性、Eコードの非画像生成を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `FoundationOperationTemplate.UniversalNoLabelOnlyRule`

状態: **applicable**。B設計JSONはB-Expression-2/Video/design_only。Eソースは別成果物。PH/OBSの機構と限界、参照、3層検査を日本語で記録する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: JSON必須構造、全参照、rule_id一意性、Eコードの非画像生成を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `FoundationOperationTemplate.OutputAndReferenceResolutionRule`

状態: **applicable**。B設計JSONはB-Expression-2/Video/design_only。Eソースは別成果物。PH/OBSの機構と限界、参照、3層検査を日本語で記録する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: JSON必須構造、全参照、rule_id一意性、Eコードの非画像生成を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

## PlatonicGoodTemplate

### `PlatonicGoodTemplate.PlatonicGoodFoundation`

状態: **applicable**。Goodは意図保持、Truthは同一座標/原因時計、Beautyは境界と時間差。各PHは対比/時間相の2軸にそれぞれ2つの既存証拠を持つ。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: GTBと2軸×2証拠の構造検査。実芸術評価は未実施。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PlatonicGoodTemplate.BeautyStructuringRule`

状態: **applicable**。Goodは意図保持、Truthは同一座標/原因時計、Beautyは境界と時間差。各PHは対比/時間相の2軸にそれぞれ2つの既存証拠を持つ。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: GTBと2軸×2証拠の構造検査。実芸術評価は未実施。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PlatonicGoodTemplate.NoSingleBeautyStructureDominance`

状態: **applicable**。比率の万能則を使わず、各PHをGood/Truth/Beautyへ接続する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent)

検査: 各PHのGTB接続とH64の相対寸法を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PlatonicGoodTemplate.GTBImplementationMapping`

状態: **applicable**。比率の万能則を使わず、各PHをGood/Truth/Beautyへ接続する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent)

検査: 各PHのGTB接続とH64の相対寸法を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

## PhenomenonSystemTemplate

### `PhenomenonSystemTemplate.UniversalPhenomenonRule`

状態: **applicable**。源応答・輸送・受領をPH1/2/3へ分け、全PHに完全構造と8領域を保持する。静止画のbefore/afterだけでなく実時間で異なる包絡を評価する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: structure.test + motion.test全寿命サンプル。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.StateTransformerRule`

状態: **applicable**。源応答・輸送・受領をPH1/2/3へ分け、全PHに完全構造と8領域を保持する。静止画のbefore/afterだけでなく実時間で異なる包絡を評価する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: structure.test + motion.test全寿命サンプル。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.VisualCausalityRule`

状態: **applicable**。源応答・輸送・受領をPH1/2/3へ分け、全PHに完全構造と8領域を保持する。静止画のbefore/afterだけでなく実時間で異なる包絡を評価する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: structure.test + motion.test全寿命サンプル。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.PIA`

状態: **applicable**。PH登録の根拠は境界と応答。源/内部/外縁の2つ以上の直接手掛かりを設計し、候補カタログを出さない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: registryとidentity一致、完全構造、Evidenceを検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.VisibilityDefinition`

状態: **applicable**。PH登録の根拠は境界と応答。源/内部/外縁の2つ以上の直接手掛かりを設計し、候補カタログを出さない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: registryとidentity一致、完全構造、Evidenceを検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.DeepStructureRule`

状態: **applicable**。PH登録の根拠は境界と応答。源/内部/外縁の2つ以上の直接手掛かりを設計し、候補カタログを出さない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: registryとidentity一致、完全構造、Evidenceを検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.LinkTypeRule`

状態: **applicable**。PHの提示因果、OBSの入力依存、視線経路を別配列にする。観測依存は入力を先に評価するDAG。層とPHを一対一に強制しない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent)

検査: 全リンク端点とOBS依存の非循環検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.PartitionAndSharedConditionsRule`

状態: **applicable**。PHの提示因果、OBSの入力依存、視線経路を別配列にする。観測依存は入力を先に評価するDAG。層とPHを一対一に強制しない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent)

検査: 全リンク端点とOBS依存の非循環検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.UniversalMaterialResponseRule`

状態: **applicable**。同じ源でも境界・内部・受領位置による差を持つ。存在しない受け手/風/熱変形を3チャネルのために追加しない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: 局所パラメータと受け手欠落の試験。hubは既存PH1→PH2→PH3に限定。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.HubPhenomenonRule`

状態: **applicable**。同じ源でも境界・内部・受領位置による差を持つ。存在しない受け手/風/熱変形を3チャネルのために追加しない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: 局所パラメータと受け手欠落の試験。hubは既存PH1→PH2→PH3に限定。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.PhysicalModelClosureRule`

状態: **applicable**。提示fieldの非物質性を明示し、質量/運動量/電荷の非該当理由と有限な表示供給を分ける。H、距離/H、age/2200を使い、実測mや物性値を捏造しない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent)

検査: 全PHの収支4項目・ScaleRegime・H64投影を検査。物理実証ではない。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.ScaleAndSimilarityRule`

状態: **applicable**。提示fieldの非物質性を明示し、質量/運動量/電荷の非該当理由と有限な表示供給を分ける。H、距離/H、age/2200を使い、実測mや物性値を捏造しない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent)

検査: 全PHの収支4項目・ScaleRegime・H64投影を検査。物理実証ではない。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.DynamicResponseAndStabilityRule`

状態: **applicable**。Aの5次窓とBのcosine/区画時差を分離する。単調時計と補間の有限範囲で位相を閉じる。

実装: `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: motion.testの全寿命/逆行時計/遅延/終端。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.PerceptualEvidenceDiscriminationRule`

状態: **applicable**。装飾/攻撃/利益処理の誤認と識別限界を示す。共起やコードの存在を因果やH64可読性の証明としない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: hypothesis_onlyと証拠空欄、RenderObservation not_runを検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.CausalAssessmentAndUncertaintyRule`

状態: **applicable**。装飾/攻撃/利益処理の誤認と識別限界を示す。共起やコードの存在を因果やH64可読性の証明としない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: hypothesis_onlyと証拠空欄、RenderObservation not_runを検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.CommonPHFailurePatterns`

状態: **applicable**。label-only、主形のglow依存、後付けの受け手、before/afterのみ、観測と世界の混同を棄却条件に置く。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: 禁止API/必須構造/棄却条件を静的検査し、画素合格を作らない。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PhenomenonSystemTemplate.VisualProjectionRule`

状態: **applicable**。世界の提示状態と画面手掛かりを区別。省略/誇張の許可scopeは空、読み取り限界は隠さない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: VisualProjectionの全fieldと明示意図参照を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

## PEMTemplate

### `PEMTemplate.PhenomenonEqualityMode`

状態: **applicable**。focus_phenomenon=none、主役を消さず源と受け手の関係を残す。架空の物理feedbackを作らない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame)

検査: 因果linksとfocus値の検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PEMTemplate.AttentionRuleWithCCM`

状態: **applicable**。進行端の追跡と、外側輪郭/余白・区画の読みの二つを設計する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: PEMとCCMのhierarchicalを照合。実視線観察はnot_run。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

## CoordinateGravityWindTemplate

### `CoordinateGravityWindTemplate.CoordinateSystemDefinition`

状態: **applicable**。2D gameのx右/y下をcanonicalのx右/y上へ明示写像し、投影では単位変換係数を相殺する。源固定と実actor相対位置を優先。

実装: `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: projectEventのH64/画面外/再入場テスト。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `CoordinateGravityWindTemplate.RelationPriorityRule`

状態: **applicable**。2D gameのx右/y下をcanonicalのx右/y上へ明示写像し、投影では単位変換係数を相殺する。源固定と実actor相対位置を優先。

実装: `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: projectEventのH64/画面外/再入場テスト。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `CoordinateGravityWindTemplate.GlobalVectorFieldRule`

状態: **applicable**。2D gameのx右/y下をcanonicalのx右/y上へ明示写像し、投影では単位変換係数を相殺する。源固定と実actor相対位置を優先。

実装: `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: projectEventのH64/画面外/再入場テスト。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `CoordinateGravityWindTemplate.StateTransitionRule`

状態: **applicable**。数値境界を針/開口、帯の前後端、3区画の着座へ翻訳。描画から経済状態を変えない。

実装: `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: 補間有限性、位相順、寿命のテスト。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `CoordinateGravityWindTemplate.VisibleTranslationRule`

状態: **applicable**。数値境界を針/開口、帯の前後端、3区画の着座へ翻訳。描画から経済状態を変えない。

実装: `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: 補間有限性、位相順、寿命のテスト。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `CoordinateGravityWindTemplate.GravityConditionDefinition`

状態: **applicable**。既存世界の重力を測定したとせず、質量を持たないfieldに落下や風の証拠を強制しない。自然物のランダム揺れを追加しない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: Gravity/medium非該当理由とnoise/乱数なしを検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `CoordinateGravityWindTemplate.NaturalVarianceRule`

状態: **applicable**。既存世界の重力を測定したとせず、質量を持たないfieldに落下や風の証拠を強制しない。自然物のランダム揺れを追加しない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: Gravity/medium非該当理由とnoise/乱数なしを検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `CoordinateGravityWindTemplate.WindCapsuleOperationRule`

状態: **applicable**。媒体条件のブロックを必ず保持。other=非物質game fieldとし空気・真空をゲーム世界の事実として捏造しない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: WindCapsule/Gravityの存在と非該当理由を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `CoordinateGravityWindTemplate.BodyFloorCameraConsistency`

状態: **not_applicable**。人体・支持床・俯瞰/煽りを追加していない。Eは既存actorの位置へ束縛されるだけ。

### `CoordinateGravityWindTemplate.ProjectionSafetyRule`

状態: **not_applicable**。人体・支持床・俯瞰/煽りを追加していない。Eは既存actorの位置へ束縛されるだけ。

### `CoordinateGravityWindTemplate.FloorHubRule`

状態: **not_applicable**。人体・支持床・俯瞰/煽りを追加していない。Eは既存actorの位置へ束縛されるだけ。

## OctaDomainTemplate

### `OctaDomainTemplate.OctaDomainDefinition`

状態: **applicable**。各PHの8領域を保持し、非該当はrole=latentと理由を記載。学問名の存在だけを科学的成立としない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: 8領域、role、非該当理由を機械検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

## AnimeStudiesTemplate

### `AnimeStudiesTemplate.ImageOrientedAnimeStudiesLayer`

状態: **not_applicable**。本Eの正式設計はVideo。単一Image snapshotの追加生成はしない。

### `AnimeStudiesTemplate.KeyframeSnapshotRule`

状態: **not_applicable**。本Eの正式設計はVideo。単一Image snapshotの追加生成はしない。

### `AnimeStudiesTemplate.PoseActingRule`

状態: **not_applicable**。人体・髪・衣服・床・物体の姿勢を本Eで作画しない。未指定の二次動作を足さない。

### `AnimeStudiesTemplate.SecondaryResponseRule`

状態: **not_applicable**。人体・髪・衣服・床・物体の姿勢を本Eで作画しない。未指定の二次動作を足さない。

### `AnimeStudiesTemplate.AnticipationAftermathRule`

状態: **not_applicable**。人体・髪・衣服・床・物体の姿勢を本Eで作画しない。未指定の二次動作を足さない。

### `AnimeStudiesTemplate.LimitedAnimationStillnessRule`

状態: **not_applicable**。人体・髪・衣服・床・物体の姿勢を本Eで作画しない。未指定の二次動作を足さない。

### `AnimeStudiesTemplate.AnimeLayoutRule`

状態: **applicable**。局所Eのstaging、連続シルエット、密度/余白、全寿命を互換適用。速度線/残像/Cartoon変形を加えない。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: world境界とOBS順序の静的検査。H64実像はnot_run。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `AnimeStudiesTemplate.SilhouetteDesignRule`

状態: **applicable**。局所Eのstaging、連続シルエット、密度/余白、全寿命を互換適用。速度線/残像/Cartoon変形を加えない。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: world境界とOBS順序の静的検査。H64実像はnot_run。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `AnimeStudiesTemplate.SakugaDensityRule`

状態: **applicable**。局所Eのstaging、連続シルエット、密度/余白、全寿命を互換適用。速度線/残像/Cartoon変形を加えない。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: world境界とOBS順序の静的検査。H64実像はnot_run。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `AnimeStudiesTemplate.AnimeCompositeRule`

状態: **applicable**。局所Eのstaging、連続シルエット、密度/余白、全寿命を互換適用。速度線/残像/Cartoon変形を加えない。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: world境界とOBS順序の静的検査。H64実像はnot_run。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `AnimeStudiesTemplate.ImageOriented12PrinciplesSubset`

状態: **applicable**。局所Eのstaging、連続シルエット、密度/余白、全寿命を互換適用。速度線/残像/Cartoon変形を加えない。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: world境界とOBS順序の静的検査。H64実像はnot_run。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

## ObservationIntegrationTemplate

### `ObservationIntegrationTemplate.ObservationRegistrySeparationRule`

状態: **applicable**。OBS1有限PSF、OBS2輪郭、OBS3表示、OBS4音をPHと分離する。画像観測の予算は一つ、音の混合予算はSFXバスへ分ける。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/composite.wgsl:10` (fs / encodeSRGB) / `src/runtime/audio.mjs:1` (FacilityAudio.playOnce / normalizePolyphony) / `src/effects/reactor/sound.mjs:2` (synthesizeReactor) / `src/effects/recycling/sound.mjs:2` (synthesizeRecycling)

検査: registry、input/dependencies、共有budget参照を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ObservationIntegrationTemplate.ObservationIntensityBudgetRule`

状態: **applicable**。OBS1有限PSF、OBS2輪郭、OBS3表示、OBS4音をPHと分離する。画像観測の予算は一つ、音の混合予算はSFXバスへ分ける。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/composite.wgsl:10` (fs / encodeSRGB) / `src/runtime/audio.mjs:1` (FacilityAudio.playOnce / normalizePolyphony) / `src/effects/reactor/sound.mjs:2` (synthesizeReactor) / `src/effects/recycling/sound.mjs:2` (synthesizeRecycling)

検査: registry、input/dependencies、共有budget参照を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ObservationIntegrationTemplate.OperationClasses`

状態: **applicable**。native HDR内のfieldと観測を分けて合成。最終sRGB、H64の境界幅、変動cadenceの限界を明示。技術提出と画素検査を区別。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/composite.wgsl:10` (fs / encodeSRGB) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: renderer source scan / JSON sampling / not_run状態を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ObservationIntegrationTemplate.CompositeValidationRule`

状態: **applicable**。native HDR内のfieldと観測を分けて合成。最終sRGB、H64の境界幅、変動cadenceの限界を明示。技術提出と画素検査を区別。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/composite.wgsl:10` (fs / encodeSRGB) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: renderer source scan / JSON sampling / not_run状態を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ObservationIntegrationTemplate.SamplingAndReconstructionRule`

状態: **applicable**。native HDR内のfieldと観測を分けて合成。最終sRGB、H64の境界幅、変動cadenceの限界を明示。技術提出と画素検査を区別。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/composite.wgsl:10` (fs / encodeSRGB) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: renderer source scan / JSON sampling / not_run状態を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ObservationIntegrationTemplate.StrictTermDefinitions`

状態: **applicable**。native HDR内のfieldと観測を分けて合成。最終sRGB、H64の境界幅、変動cadenceの限界を明示。技術提出と画素検査を区別。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/composite.wgsl:10` (fs / encodeSRGB) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: renderer source scan / JSON sampling / not_run状態を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ObservationIntegrationTemplate.PostEffectsCommonRule`

状態: **applicable**。glowは既存源の距離/包絡/色へ従属し、主形はglowを無効化してもshader内に存在する。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/composite.wgsl:10` (fs / encodeSRGB) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: glow toggleの経路と源への依存を静的検査。実際の可読性は未観察。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ObservationIntegrationTemplate.LensFlareDomainDefinition`

状態: **not_applicable**。物理レンズの面/開口経路が宣言されていない。PSFのにじみをghost/flareと呼ばない。

### `ObservationIntegrationTemplate.LensFlareCauseModel`

状態: **not_applicable**。物理レンズの面/開口経路が宣言されていない。PSFのにじみをghost/flareと呼ばない。

### `ObservationIntegrationTemplate.LensFlareSpectralColorLaw`

状態: **not_applicable**。物理レンズの面/開口経路が宣言されていない。PSFのにじみをghost/flareと呼ばない。

### `ObservationIntegrationTemplate.LensFlareObservationCoordinates`

状態: **not_applicable**。物理レンズの面/開口経路が宣言されていない。PSFのにじみをghost/flareと呼ばない。

### `ObservationIntegrationTemplate.LensFlareSourceBindingRule`

状態: **not_applicable**。ghost/veil/streakの物理レンズ応答を起動しない。sourceなしflareを新設しない。

### `ObservationIntegrationTemplate.LensFlareEnergyIntensityLaw`

状態: **not_applicable**。ghost/veil/streakの物理レンズ応答を起動しない。sourceなしflareを新設しない。

## ExtremumDesignColorTemplate

### `ExtremumDesignColorTemplate.PEVRule`

状態: **applicable**。採用済みの源/輸送/受領状態列を先に定め、Aは開いた曲線、Bは圧縮と矩形の3区画を選択する。色は機能境界へ束縛する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame)

検査: PEVの採用済みstate、CCM、独立ソースと位相構造を検査。万能な美の得点は作らない。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ExtremumDesignColorTemplate.AESRule`

状態: **applicable**。採用済みの源/輸送/受領状態列を先に定め、Aは開いた曲線、Bは圧縮と矩形の3区画を選択する。色は機能境界へ束縛する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame)

検査: PEVの採用済みstate、CCM、独立ソースと位相構造を検査。万能な美の得点は作らない。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ExtremumDesignColorTemplate.DesignScienceRule`

状態: **applicable**。採用済みの源/輸送/受領状態列を先に定め、Aは開いた曲線、Bは圧縮と矩形の3区画を選択する。色は機能境界へ束縛する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame)

検査: PEVの採用済みstate、CCM、独立ソースと位相構造を検査。万能な美の得点は作らない。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ExtremumDesignColorTemplate.CCMScope`

状態: **applicable**。採用済みの源/輸送/受領状態列を先に定め、Aは開いた曲線、Bは圧縮と矩形の3区画を選択する。色は機能境界へ束縛する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame)

検査: PEVの採用済みstate、CCM、独立ソースと位相構造を検査。万能な美の得点は作らない。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ExtremumDesignColorTemplate.AESEvaluationAxes`

状態: **applicable**。採用済みの源/輸送/受領状態列を先に定め、Aは開いた曲線、Bは圧縮と矩形の3区画を選択する。色は機能境界へ束縛する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame)

検査: PEVの採用済みstate、CCM、独立ソースと位相構造を検査。万能な美の得点は作らない。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ExtremumDesignColorTemplate.ColorScienceInAES`

状態: **applicable**。採用済みの源/輸送/受領状態列を先に定め、Aは開いた曲線、Bは圧縮と矩形の3区画を選択する。色は機能境界へ束縛する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame)

検査: PEVの採用済みstate、CCM、独立ソースと位相構造を検査。万能な美の得点は作らない。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ExtremumDesignColorTemplate.ArtisticBeautyDefinitions`

状態: **applicable**。採用済みの源/輸送/受領状態列を先に定め、Aは開いた曲線、Bは圧縮と矩形の3区画を選択する。色は機能境界へ束縛する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame)

検査: PEVの採用済みstate、CCM、独立ソースと位相構造を検査。万能な美の得点は作らない。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ExtremumDesignColorTemplate.FDSCompatibilityDefinition`

状態: **not_applicable**。旧FDS呼出しはない。互換用Termsだけ保持する。

## ReflectionClosureTemplate

### `ReflectionClosureTemplate.ReflectionVsLensFlareSeparation`

状態: **not_applicable**。明るい縁は反射ではなくfield放射。元施設の金属/濡れ/光沢を推測しない。空のClosureと理由を保持する。

### `ReflectionClosureTemplate.ReflectionClosureRule`

状態: **not_applicable**。明るい縁は反射ではなくfield放射。元施設の金属/濡れ/光沢を推測しない。空のClosureと理由を保持する。

### `ReflectionClosureTemplate.MicrofacetFieldMinimumSet`

状態: **not_applicable**。物理的反射・fresnel・表面状態変化を選択していない。数を満たすために架空反射や帰還を足さない。

### `ReflectionClosureTemplate.MaterialReflectionMinimums`

状態: **not_applicable**。物理的反射・fresnel・表面状態変化を選択していない。数を満たすために架空反射や帰還を足さない。

### `ReflectionClosureTemplate.ReflectionLinkRule`

状態: **not_applicable**。物理的反射・fresnel・表面状態変化を選択していない。数を満たすために架空反射や帰還を足さない。

## PhenomenonProfileTemplate

### `PhenomenonProfileTemplate.PhenomenonProfileRule`

状態: **not_applicable**。Water/Fire/Cloth/Metal/反応などの実物質profileは選択していない。recyclingUnitという名称だけから破片/煙/反応を作らない。

### `PhenomenonProfileTemplate.ProfileDetails`

状態: **not_applicable**。Water/Fire/Cloth/Metal/反応などの実物質profileは選択していない。recyclingUnitという名称だけから破片/煙/反応を作らない。

### `PhenomenonProfileTemplate.ReactionAndPhaseKineticsRule`

状態: **not_applicable**。Water/Fire/Cloth/Metal/反応などの実物質profileは選択していない。recyclingUnitという名称だけから破片/煙/反応を作らない。

### `PhenomenonProfileTemplate.ProfileApplicabilityGuideRule`

状態: **not_applicable**。Water/Fire/Cloth/Metal/反応などの実物質profileは選択していない。recyclingUnitという名称だけから破片/煙/反応を作らない。

## TermsTemplate

### `TermsTemplate.Terms`

状態: **applicable**。PH、OBS、PEV、AES、E実装とValidationResultsの意味を区別する。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: terms blockと用語参照の確認。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

## GlobalAcceptanceTemplate

### `GlobalAcceptanceTemplate.GlobalAcceptanceCriteria`

状態: **applicable**。StructuralInspection、SemanticReconciliation、RenderObservationを分離し、画像未観察はnot_run。

実装: `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: project-specific static checkerと実行記録を出力。正本同梱検証器を実行したとは主張しない。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `GlobalAcceptanceTemplate.ComparativeEvaluationRule`

状態: **applicable**。48条件の比較は計画、数値ロジックテストは画素比較ではない。H64・音・芸術的成果は未観察として残す。

実装: `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: OutcomeEvaluation not_run / render_status NotRun / 実証拠なしのPass禁止を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `GlobalAcceptanceTemplate.PassWarningFailEvaluation`

状態: **applicable**。48条件の比較は計画、数値ロジックテストは画素比較ではない。H64・音・芸術的成果は未観察として残す。

実装: `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: OutcomeEvaluation not_run / render_status NotRun / 実証拠なしのPass禁止を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `GlobalAcceptanceTemplate.IntentAndArtisticOutcomeRule`

状態: **applicable**。48条件の比較は計画、数値ロジックテストは画素比較ではない。H64・音・芸術的成果は未観察として残す。

実装: `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: OutcomeEvaluation not_run / render_status NotRun / 実証拠なしのPass禁止を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

## KeywordExpansion

### `KeywordExpansion.KeywordExpansionRule`

状態: **not_applicable**。登録キーワードは今回明示されていない。仕様本文中の例を実行指示にしない。

### `KeywordExpansion.F2ScreenMaskRule`

状態: **not_applicable**。f2未指定なので上下maskを追加しない。

### `KeywordExpansion.O9ObservationRule`

状態: **not_applicable**。プリズム加工未指定。源の色域を画面プリズムで増やさない。

## ExtensionActivationTable

### `ExtensionActivationTable.ExtensionActivationRule`

状態: **applicable**。VFX/E/PostEffects属性具体化/LDM/Video設計だけを起動。Eは画像生成命令ではない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: 拡張表の有効block集合と実ソースを照合。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `ExtensionActivationTable.ExpressionIntegrationRule`

状態: **applicable**。VFX/E/PostEffects属性具体化/LDM/Video設計だけを起動。Eは画像生成命令ではない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: 拡張表の有効block集合と実ソースを照合。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

## CharacterPolicy

### `CharacterPolicy.CharacterPolicyGeneralRule`

状態: **not_applicable**。既存playerIdは人間という断定ではない。Eは身体を作画しないため人物presetを起動しない。

### `CharacterPolicy.PresetSelectionRule`

状態: **not_applicable**。既存playerIdは人間という断定ではない。Eは身体を作画しないため人物presetを起動しない。

### `CharacterPolicy.LNSAINTROle`

状態: **not_applicable**。既存playerIdは人間という断定ではない。Eは身体を作画しないため人物presetを起動しない。

## BeautifulPoseCapsule

### `BeautifulPoseCapsule.BeautifulPoseCapsuleRule`

状態: **not_applicable**。Eの生成範囲に身体なし。ホストの人体姿勢を変更せず、位置サンプルだけ参照する。

### `BeautifulPoseCapsule.PoseTypeRequirements`

状態: **not_applicable**。人体/支持/推進機構を仮定しない。previewのH64矩形は人体ではなく検査proxy。

## VFX

### `VFX.VFXActivationRule`

状態: **applicable**。A/Bとも源・輸送・受領の異なる役割/境界/時間を個別に実装。画面外では可視GPU枠を消費せず、actor位置を推測しない。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent)

検査: motion matrix / missing anchor / offscreen / source scan。実画素評価はnot_run。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `VFX.SpatialMorphologyRule`

状態: **applicable**。A/Bとも源・輸送・受領の異なる役割/境界/時間を個別に実装。画面外では可視GPU枠を消費せず、actor位置を推測しない。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent)

検査: motion matrix / missing anchor / offscreen / source scan。実画素評価はnot_run。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `VFX.TransportTemporalRule`

状態: **applicable**。A/Bとも源・輸送・受領の異なる役割/境界/時間を個別に実装。画面外では可視GPU枠を消費せず、actor位置を推測しない。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent)

検査: motion matrix / missing anchor / offscreen / source scan。実画素評価はnot_run。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `VFX.EnvironmentCompositionRule`

状態: **applicable**。A/Bとも源・輸送・受領の異なる役割/境界/時間を個別に実装。画面外では可視GPU枠を消費せず、actor位置を推測しない。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent)

検査: motion matrix / missing anchor / offscreen / source scan。実画素評価はnot_run。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `VFX.CompositingReadabilityRule`

状態: **applicable**。A/Bとも源・輸送・受領の異なる役割/境界/時間を個別に実装。画面外では可視GPU枠を消費せず、actor位置を推測しない。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent)

検査: motion matrix / missing anchor / offscreen / source scan。実画素評価はnot_run。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `VFX.MultilayerArchitectureRule`

状態: **applicable**。world層L1/2/3はPHだけ、観測層L4はOBSだけ。依存は観測層→入力層、物理提示因果は源→受け手で方向を分ける。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: layersのdomain/registry制約、interlayer端点と対応リンクを検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `VFX.MaterialOpticalResponseRule`

状態: **applicable**。coverage・不透明度・密度・HDR放射を分離する。素材名やglowで主形を代替しない。源のピークを機械的に弱めず表示の肩へ渡す。

実装: `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/composite.wgsl:10` (fs / encodeSRGB)

検査: shader入力と別変数/合成順の静的確認、glow offの手動検査計画。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `VFX.ScreenSignalSurfaceRule`

状態: **not_applicable**。scanline/画素化/符号化ノイズを選択していない。3区画は伝送ノイズではなく既存credits+3の受領表現。

## ECodeImplementation

### `ECodeImplementation.ExecutableECodeBranchRule`

状態: **applicable**。完全なESM/WGSL/PCM合成・receipt gate・native harnessを独立成果物として同梱。B commit/blobを固定し、旧E内容は参照せずサイトを変更しない。

実装: `src/runtime/contracts.mjs:21` (validateReceipt / TARGETS / fingerprint) / `src/runtime/controller.mjs:1` (FacilityController.receive / sampleFrame) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/runtime/audio.mjs:1` (FacilityAudio.playOnce / normalizePolyphony) / `src/effects/reactor/sound.mjs:2` (synthesizeReactor) / `src/effects/recycling/sound.mjs:2` (synthesizeRecycling) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent) / `scripts/verify.mjs:7` (runVerification) / `tests/structure.test.mjs:1` (PH/OBS / domains / links / activation) / `verification/browser-check.json:1` (実行制限とnot_run)

検査: syntax / declarations / static B mapping / SHA256。shader compile、実GPU、画素、聴感、実ゲームは未実行を明示。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

## PostEffects

### `PostEffects.PostEffectsAutonomousActivationRule`

状態: **applicable**。ordinary_posteffects=false、選択した源応答/輪郭/表示だけをOBSへ登録。source条件と時間を結び、双方向feedbackを捏造しない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/composite.wgsl:10` (fs / encodeSRGB)

検査: exact_selected_operationsとOBS参照、source-bound条件を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PostEffects.SPCARule`

状態: **applicable**。ordinary_posteffects=false、選択した源応答/輪郭/表示だけをOBSへ登録。source条件と時間を結び、双方向feedbackを捏造しない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/composite.wgsl:10` (fs / encodeSRGB)

検査: exact_selected_operationsとOBS参照、source-bound条件を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `PostEffects.GlobalLocalRule`

状態: **applicable**。局所の源応答/輪郭と、隔離canvasまたはホストの承認済みHDR表示を分ける。同一作用をPHとOBSに重複登録しない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `src/gpu/composite.wgsl:10` (fs / encodeSRGB) / `src/gpu/renderer.mjs:73` (prepare / encodeToPass / render) / `src/runtime/projection.mjs:9` (project / projectEvent)

検査: OBS scope/dependencyとencodeToPass/renderの契約を確認。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

## LuminanceDynamicsModule

### `LuminanceDynamicsModule.LDMActivationRule`

状態: **applicable**。VFX明示により起動。grain等を起動理由にしない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos)

検査: trigger explicit_VFXとLDM blockの存在を検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `LuminanceDynamicsModule.LDMModeRule`

状態: **applicable**。Videoの源/輸送/受領に別の輝度包絡を持つ。ランダム点滅/黒背景指定/露光積分は追加せず、H64/実cadenceの限界を記録。

実装: `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame) / `src/effects/reactor/reactor.wgsl:20` (fs / path / quintic) / `src/effects/recycling/recycling.wgsl:17` (fs / boxSDF / easeCos) / `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock)

検査: 時間関数の数値検査、α無効、サンプリング参照を確認。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

## MagicArchitecture

### `MagicArchitecture.MagicArchitectureActivationRule`

状態: **not_applicable**。魔法/Magic/MagicArchitectureは今回の制作題材として明示されていない。ゲームfieldを魔法presetへ置換しない。

### `MagicArchitecture.MagicGlowRule`

状態: **not_applicable**。魔法/Magic/MagicArchitectureは今回の制作題材として明示されていない。ゲームfieldを魔法presetへ置換しない。

### `MagicArchitecture.PresetCatalogSeparationRule`

状態: **not_applicable**。魔法カタログを出力せず、紋章・輪・粒子を足さない。

### `MagicArchitecture.AntiFlickerNearDistanceRule`

状態: **not_applicable**。MagicArchitectureのSCALE/DISTANCE条件を推測しない。

## GradientAnchorPolicy

### `GradientAnchorPolicy.GradientAnchorRule`

状態: **not_applicable**。色域は源/内部/受領の異なる機能に離散的に割り当てる。独立した色相補間/プリズム/虹色の勾配は選ばない。

## VideoGenerationPolicy

### `VideoGenerationPolicy.VideoDurationRule`

状態: **applicable**。Video設計のDuration正本は2.2秒。利益20秒/cooldownは別metadata。実映像生成を実行しない。

実装: `design/A.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `design/B.B-Expression-2.json:1172` (PhenomenonSystemTemplate.PhenomenonBlock) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame)

検査: 2.2s一致とbenefit/cooldown独立性の検査。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `VideoGenerationPolicy.CommonTimelineRule`

状態: **applicable**。PH/OBS/camera/audioを一つのcapturedTime由来時計へ関連付ける。遅延では途中参加、SFXはoffsetで一回。

実装: `src/runtime/contracts.mjs:21` (validateReceipt / TARGETS / fingerprint) / `src/runtime/controller.mjs:1` (FacilityController.receive / sampleFrame) / `src/effects/reactor/state.mjs:3` (reactorState) / `src/effects/recycling/state.mjs:4` (recyclingState) / `src/runtime/controller.mjs:41` (startMono / sampleFrame) / `src/runtime/audio.mjs:1` (FacilityAudio.playOnce / normalizePolyphony) / `src/effects/reactor/sound.mjs:2` (synthesizeReactor) / `src/effects/recycling/sound.mjs:2` (synthesizeRecycling)

検査: delayed / future / expired / audio offsetテスト。

画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。

### `VideoGenerationPolicy.DialogueRule`

状態: **not_applicable**。セリフ/BGMなし。音声内容・演出音響を仕様文から自動追加しない。
