# 要件と実装の対応 / r0.3

この表は正本rule_idを実装・設計に対応付ける索引です。実GPUや聴感の合格表ではありません。行番号はビルド時スナップショット、anchor文字列が再確認の基準です。

| 規則 | 実装 / anchor | 観測可能な帰結と検査 |
|---|---|---|
| InferenceExpansionPolicy.InferenceExpansionPolicy | `design/mana-r03.B-Expression-2.json:102` / `"inferred_support_elements"` | 新規の人物・物体・記号を足さず、E内の面と時間を具体化する。 検査: B構造・DeclaredIntent照合。docs/ACCEPTANCE.mdで人手検査。 |
| InferenceExpansionPolicy.AttributeAndActionResolutionRule | `design/mana-r03.B-Expression-2.json:162` / `"origin": "attribute_resolved"` | 既存Mana Eという内容の同一性を保ち、内部を新設計する。 検査: B構造・DeclaredIntent照合。docs/ACCEPTANCE.mdで人手検査。 |
| InferenceExpansionPolicy.DeclaredIntentRule | `design/mana-r03.B-Expression-2.json:43` / `"DeclaredIntent"` | 人数0の試験表示、現在受け手、イベント除外、文字なしを保持する。 検査: B構造・DeclaredIntent照合。docs/ACCEPTANCE.mdで人手検査。 |
| InferenceExpansionPolicy.ExpressionIntentRule | `design/mana-r03.B-Expression-2.json:65` / `"ExpressionIntent"` | 源・連続搬送・受領変化の無説明読解を品質目的として残す。 検査: B構造・DeclaredIntent照合。docs/ACCEPTANCE.mdで人手検査。 |
| FoundationOperationTemplate.FoundationOperationRule | `design/mana-r03.B-Expression-2.json:2` / `"FoundationOperationTemplate"` | 日本語B設計を別成果物にし、runtime codeと分ける。 検査: tools/check-design.mjsのブロック/参照検査。 |
| FoundationOperationTemplate.RuleContractRule | `design/mana-r03.B-Expression-2.json:14` / `"RuleContract"` | 正本rule_idから実在する関数・設計fieldを辿れる。 検査: tools/check-design.mjsのブロック/参照検査。 |
| FoundationOperationTemplate.PriorityRule | `design/mana-r03.B-Expression-2.json:24` / `"same_priority_resolution"` | 主動作や人数を低位の美的既定へ置換しない。 検査: tools/check-design.mjsのブロック/参照検査。 |
| FoundationOperationTemplate.ConflictResolutionRule | `design/mana-r03.B-Expression-2.json:2545` / `"SemanticReconciliation"` | 未検証の身体位置・光輸送近似を黙って実証済みにしない。 検査: tools/check-design.mjsのブロック/参照検査。 |
| FoundationOperationTemplate.UniversalNoLabelOnlyRule | `design/mana-r03.B-Expression-2.json:212` / `"PhysicalModel"` | 形・入力・時間・帰結・失敗像をfieldに記す。 検査: tools/check-design.mjsのブロック/参照検査。 |
| FoundationOperationTemplate.OutputAndReferenceResolutionRule | `design/mana-r03.B-Expression-2.json:6` / `"operation": "design_only"` | B-Expression-2 Video設計と実行Eを区別。画像生成権限なし。 検査: tools/check-design.mjsのブロック/参照検査。 |
| PlatonicGoodTemplate.PlatonicGoodFoundation | `design/mana-r03.B-Expression-2.json:471` / `"GTBConnections"` | 全体の意図/座標/知覚を同じ現象へ接続。 検査: 構造/選択根拠を照合。美的成功は実画像が必要。 |
| PlatonicGoodTemplate.BeautyStructuringRule | `design/mana-r03.B-Expression-2.json:456` / `"BeautyStructureApplication"` | 既存の面・対比・空き/充填を複数軸の証拠にする。 検査: 構造/選択根拠を照合。美的成功は実画像が必要。 |
| PlatonicGoodTemplate.NoSingleBeautyStructureDominance | `design/mana-r03.B-Expression-2.json:1722` / `"ShapeOrder"` | 特定の比率を万能な美として採点しない。 検査: 構造/選択根拠を照合。美的成功は実画像が必要。 |
| PlatonicGoodTemplate.GTBImplementationMapping | `design/mana-r03.B-Expression-2.json:471` / `"GTBConnections"` | 各PHのGood/Truth/Beautyを具体的に保持。 検査: 構造/選択根拠を照合。美的成功は実画像が必要。 |
| PhenomenonSystemTemplate.UniversalPhenomenonRule | `design/mana-r03.B-Expression-2.json:158` / `"PhenomenonRegistry"` | 供給・輸送・積分・背景応答を4つの独立状態として登録。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.PIA | `design/mana-r03.B-Expression-2.json:85` / `"SelectionLifecycle"` | 属性具体化と採用補完、PH登録を混同しない。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.VisibilityDefinition | `design/mana-r03.B-Expression-2.json:322` / `"direct_evidence"` | 各可視PHに境界と状態変化など複数の手掛かりを記す。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.LinkTypeRule | `design/mana-r03.B-Expression-2.json:386` / `"CausalityLinks"` | worldの作用とOBS依存、視線上の関係を区別する。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.DeepStructureRule | `design/mana-r03.B-Expression-2.json:207` / `"DeepStructure"` | 源の芯/構造/外縁、搬送断面、受領の容量境界を分ける。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.StateTransformerRule | `design/mana-r03.B-Expression-2.json:356` / `"StateDynamics"` | 前後だけでなく輸送遅れ・積分・満量・終了を記す。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.VisualCausalityRule | `design/mana-r03.B-Expression-2.json:446` / `"retained_cues"` | 減る源、進む前端、増える面積を可視帰結の候補にする。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.UniversalMaterialResponseRule | `design/mana-r03.B-Expression-2.json:237` / `"constitutive_response"` | 同じ入力でも供給・搬送・受領・背景で応答を変える。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.HubPhenomenonRule | `design/mana-r03.B-Expression-2.json:430` / `"SurroundingChanges"` | 既存の輸送/受領/背景へだけ作用させ、架空の受け手を足さない。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.PhysicalModelClosureRule | `design/mana-r03.B-Expression-2.json:219` / `"balance_conditions"` | 表示用の量収支と宣言場の限界、背景光の入力を区別する。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.ScaleAndSimilarityRule | `design/mana-r03.B-Expression-2.json:242` / `"ScaleRegime"` | world unitsとH64画素を区別し、太い断面を主証拠にする。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.DynamicResponseAndStabilityRule | `design/mana-r03.B-Expression-2.json:366` / `"response_timescale"` | 0.18phaseの輸送遅れに対し受光は即時応答。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.PerceptualEvidenceDiscriminationRule | `design/mana-r03.B-Expression-2.json:344` / `"confusable_alternative"` | 器/支柱/単独アイコンという別解釈と未観察の限界を明記。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.CausalAssessmentAndUncertaintyRule | `design/mana-r03.B-Expression-2.json:382` / `"check_status": "hypothesis_only"` | 旧版の見えをパラメータ原因へ断定せず、新式も実物理実証としない。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.CommonPHFailurePatterns | `design/mana-r03.B-Expression-2.json:485` / `"FailurePatterns"` | 孤立図形・全面glow・技術結果の品質転記を失敗として残す。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.PartitionAndSharedConditionsRule | `design/mana-r03.B-Expression-2.json:166` / `"partition_reason"` | PH分割は層の個数ではなく独立状態/境界に対応させる。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PhenomenonSystemTemplate.VisualProjectionRule | `design/mana-r03.B-Expression-2.json:443` / `"VisualProjection"` | 世界状態と描画の選択を分け、未許可の省略/誇張scopeは空。 検査: tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。 |
| PEMTemplate.PhenomenonEqualityMode | `design/mana-r03.B-Expression-2.json:1393` / `"focus_phenomenon": "none"` | 主効果を消さず、源・搬送・受領を一つの関係にする。 検査: 設計の視線記述。実視線の計測は未実施。 |
| PEMTemplate.AttentionRuleWithCCM | `design/mana-r03.B-Expression-2.json:1399` / `"gaze_path_A"` | 源から受領への順と空き/充填から源へ戻る確認の順を区別。 検査: 設計の視線記述。実視線の計測は未実施。 |
| CoordinateGravityWindTemplate.CoordinateSystemDefinition | `design/mana-r03.B-Expression-2.json:1425` / `"WorldCoordinates"` | B右手系とgameのy下向きを明示して変換。 検査: 座標/媒体の静的検査、原寸投影はGPU未検証。 |
| CoordinateGravityWindTemplate.RelationPriorityRule | `design/mana-r03.B-Expression-2.json:354` / `"spatial_relation"` | 足元が下、受領が上、搬送が間という関係を保つ。 検査: 座標/媒体の静的検査、原寸投影はGPU未検証。 |
| CoordinateGravityWindTemplate.GlobalVectorFieldRule | `design/mana-r03.B-Expression-2.json:1460` / `"VectorField"` | 上向きの前端と周辺光の方向/減衰を分ける。 検査: 座標/媒体の静的検査、原寸投影はGPU未検証。 |
| CoordinateGravityWindTemplate.StateTransitionRule | `design/mana-r03.B-Expression-2.json:367` / `"phase_relation"` | 共通時計に局所遅れ/収束を接続。 検査: 座標/媒体の静的検査、原寸投影はGPU未検証。 |
| CoordinateGravityWindTemplate.GravityConditionDefinition | `design/mana-r03.B-Expression-2.json:1474` / `"Gravity"` | 静穏媒体と重力の拘束を保持し、空気流/落下粒子を追加しない。 検査: 座標/媒体の静的検査、原寸投影はGPU未検証。 |
| CoordinateGravityWindTemplate.WindCapsuleOperationRule | `design/mana-r03.B-Expression-2.json:1485` / `"WindCapsule"` | 媒体と0m/sを明示し、不要な風演出を作らない。 検査: 座標/媒体の静的検査、原寸投影はGPU未検証。 |
| CoordinateGravityWindTemplate.VisibleTranslationRule | `design/mana-r03.B-Expression-2.json:119` / `"evidence"` | 位置と時間の数値を幅・前端・受領面積に翻訳する。 検査: 座標/媒体の静的検査、原寸投影はGPU未検証。 |
| OctaDomainTemplate.OctaDomainDefinition | `design/mana-r03.B-Expression-2.json:252` / `"Domains"` | 全PHに8領域を保持。不適用領域は理由付きlatentとし、架空の物理を足さない。 検査: 8領域/applicability/role/itemsをローカル検査。 |
| AnimeStudiesTemplate.AnimeLayoutRule | `design/mana-r03.B-Expression-2.json:1720` / `"VisualHierarchy"` | 余白と上下関係をH64で一つのレイアウトにする。 検査: B互換レイアウト。動画生成ツールを実行した主張ではない。 |
| AnimeStudiesTemplate.SilhouetteDesignRule | `design/mana-r03.B-Expression-2.json:352` / `"silhouette_logic"` | 粒子やglowからではなく幅を持つ主形を描く。 検査: B互換レイアウト。動画生成ツールを実行した主張ではない。 |
| AnimeStudiesTemplate.AnticipationAftermathRule | `design/mana-r03.B-Expression-2.json:1544` / `"state_t_minus_1_evidence"` | Eの前後を既存場の状態差で示す。人物接地を捏造しない。 検査: B互換レイアウト。動画生成ツールを実行した主張ではない。 |
| AnimeStudiesTemplate.LimitedAnimationStillnessRule | `design/mana-r03.B-Expression-2.json:363` / `"equilibrium_recovery"` | 満量保持の区間も同じ支持形と色境界を維持する。 検査: B互換レイアウト。動画生成ツールを実行した主張ではない。 |
| AnimeStudiesTemplate.AnimeCompositeRule | `design/mana-r03.B-Expression-2.json:1562` / `"CompositeIntegration"` | 発光と背景受光と観測拡散を分け、合成で本体を保持する。 検査: B互換レイアウト。動画生成ツールを実行した主張ではない。 |
| AnimeStudiesTemplate.ImageOriented12PrinciplesSubset | `design/mana-r03.B-Expression-2.json:1548` / `"Layout"` | Staging/Follow-through/Timingを平面の場の変化に限定して使う。 検査: B互換レイアウト。動画生成ツールを実行した主張ではない。 |
| ObservationIntegrationTemplate.ObservationRegistrySeparationRule | `design/mana-r03.B-Expression-2.json:1573` / `"ObservationRegistry"` | 本体/背景をPH、局所拡散と表示変換をOBSとして分離。 検査: GPU検査ページとdocs/ACCEPTANCE.md。作成環境のGPUはnot_run。 |
| ObservationIntegrationTemplate.OperationClasses | `design/mana-r03.B-Expression-2.json:1636` / `"ImageIntegration"` | Tone/Light/Edge等の責務を分け、未選択加工を省略。 検査: GPU検査ページとdocs/ACCEPTANCE.md。作成環境のGPUはnot_run。 |
| ObservationIntegrationTemplate.PostEffectsCommonRule | `shaders/field-body.wgsl:108` / `var color=bg*` | 背景への局所散乱項の後に有色本体を再合成し、輪郭を観測加工で作らない。 検査: GPU検査ページとdocs/ACCEPTANCE.md。作成環境のGPUはnot_run。 |
| ObservationIntegrationTemplate.ObservationIntensityBudgetRule | `shaders/field-body.wgsl:108` / `min(bloom,vec3f(.075))` | 複数IDの観測散乱も同じ全体上限で合成。 検査: GPU検査ページとdocs/ACCEPTANCE.md。作成環境のGPUはnot_run。 |
| ObservationIntegrationTemplate.CompositeValidationRule | `tests/gpu-tests.mjs:24` / `maxReferenceError` | 画素の差/境界/元背景を検査するが知覚判定は分離する。 検査: GPU検査ページとdocs/ACCEPTANCE.md。作成環境のGPUはnot_run。 |
| ObservationIntegrationTemplate.SamplingAndReconstructionRule | `src/renderer.mjs:48` / `this.image=d.createTexture` | 固定H64バッファと同解像度textureLoad。DPR/OS条件は別途記録。 検査: GPU検査ページとdocs/ACCEPTANCE.md。作成環境のGPUはnot_run。 |
| ObservationIntegrationTemplate.StrictTermDefinitions | `design/mana-r03.B-Expression-2.json:1644` / `"LensFlareField"` | OBS1を物理レンズゴースト/粒子と呼ばず、使用しないフレアはnone。 検査: GPU検査ページとdocs/ACCEPTANCE.md。作成環境のGPUはnot_run。 |
| ExtremumDesignColorTemplate.PEVRule | `design/mana-r03.B-Expression-2.json:1704` / `"PEV"` | 採用した連続支持・時間遅れ・受領積分の成立範囲を決める。 検査: 採用設計と実装色の静的照合。GPU芸術評価未実施。 |
| ExtremumDesignColorTemplate.AESRule | `design/mana-r03.B-Expression-2.json:1711` / `"AES"` | その状態の中で面積/密度/色を選ぶ。物理や意図を別の装飾に置き換えない。 検査: 採用設計と実装色の静的照合。GPU芸術評価未実施。 |
| ExtremumDesignColorTemplate.DesignScienceRule | `design/mana-r03.B-Expression-2.json:1719` / `"DesignScience"` | 視認順序・余白・形状を記述。ラベルだけで終えない。 検査: 採用設計と実装色の静的照合。GPU芸術評価未実施。 |
| ExtremumDesignColorTemplate.CCMScope | `design/mana-r03.B-Expression-2.json:1725` / `"CCM"` | 供給青/搬送シアン/受領紫の各色域を入力と状態に束縛。 検査: 採用設計と実装色の静的照合。GPU芸術評価未実施。 |
| ExtremumDesignColorTemplate.AESEvaluationAxes | `design/mana-r03.B-Expression-2.json:1717` / `"selected_aesthetic_extremum"` | 単一の美的スコアではなく連続輪郭と面積変化で検討する。 検査: 採用設計と実装色の静的照合。GPU芸術評価未実施。 |
| ExtremumDesignColorTemplate.ColorScienceInAES | `design/mana-r03.B-Expression-2.json:1726` / `"Palette"` | 色は均等虹色ではなく部位・内面状態の役割差に従う。 検査: 採用設計と実装色の静的照合。GPU芸術評価未実施。 |
| ExtremumDesignColorTemplate.ArtisticBeautyDefinitions | `design/mana-r03.B-Expression-2.json:126` / `"Beauty"` | 構造・素材・知覚・色の複数側面を記す。品質点数は作らない。 検査: 採用設計と実装色の静的照合。GPU芸術評価未実施。 |
| ReflectionClosureTemplate.ReflectionVsLensFlareSeparation | `design/mana-r03.B-Expression-2.json:1759` / `"ReflectionClosureTemplate"` | 自己放射/背景拡散とレンズ由来のOBSを混同しない。 検査: 適用理由を記録。厳密な放射輸送計測ではない。 |
| ReflectionClosureTemplate.ReflectionClosureRule | `design/mana-r03.B-Expression-2.json:1770` / `"non_applicable_reason"` | 可読な鏡面lobeを選ばない。マイクロファセット検証を偽装しない。 検査: 適用理由を記録。厳密な放射輸送計測ではない。 |
| TermsTemplate.Terms | `design/mana-r03.B-Expression-2.json:1792` / `"TermsTemplate"` | PH/OBSと要求true/検査結果を区別する。 検査: 用語・参照を静的照合。 |
| ExtensionActivationTable.ExtensionActivationRule | `design/mana-r03.B-Expression-2.json:2445` / `"ExtensionActivationTable"` | 属性具体化で必要なVFX/OBS/LDMだけを起動する。 検査: design/activation-resolution.jsonと非起動ブロックを照合。 |
| ExtensionActivationTable.ExpressionIntegrationRule | `design/mana-r03.B-Expression-2.json:1813` / `"expression_intent_ref"` | 未指定の魔法preset/人物/キーワード効果を一括追加しない。 検査: design/activation-resolution.jsonと非起動ブロックを照合。 |
| VFX.VFXActivationRule | `design/mana-r03.B-Expression-2.json:1807` / `"VFX"` | 既存効果の内部形態をworldとobservationで区別。 検査: tests/field.test.mjs、tools/check-field.mjs、実GPU/無説明全寿命はnot_run。 |
| VFX.MultilayerArchitectureRule | `design/mana-r03.B-Expression-2.json:1817` / `"layers"` | 供給/搬送/容量/内部/受光/観測の異なる機能。6層を6物体と同一視しない。 検査: tests/field.test.mjs、tools/check-field.mjs、実GPU/無説明全寿命はnot_run。 |
| VFX.SpatialMorphologyRule | `src/shape-data.mjs:2` / `export const SHAPE` | 106wu供給面、26〜36wu断面、94wu受領形を新定義し、重なりを保持。 検査: tests/field.test.mjs、tools/check-field.mjs、実GPU/無説明全寿命はnot_run。 |
| VFX.MaterialOpticalResponseRule | `shaders/field-body.wgsl:86` / `f.rgb=layer.rgb` | 色・coverage・表示量・局所受光・散乱を別変数で合成。 検査: tests/field.test.mjs、tools/check-field.mjs、実GPU/無説明全寿命はnot_run。 |
| VFX.TransportTemporalRule | `shaders/field-body.wgsl:50` / `let localTime=` | 位置に比例した到着遅れを使い、前端と受領開始を同じ時計に束縛。 検査: tests/field.test.mjs、tools/check-field.mjs、実GPU/無説明全寿命はnot_run。 |
| VFX.EnvironmentCompositionRule | `shaders/field-body.wgsl:80` / `let ls=` | 既存背景へ源/搬送/受領に応じる別の局所光を届ける。 検査: tests/field.test.mjs、tools/check-field.mjs、実GPU/無説明全寿命はnot_run。 |
| VFX.CompositingReadabilityRule | `shaders/field-body.wgsl:35` / `fn over(` | straight RGBとcoverageを明示、全層addにせず、有色本体の量感を保つ。 検査: tests/field.test.mjs、tools/check-field.mjs、実GPU/無説明全寿命はnot_run。 |
| ECodeImplementation.ExecutableECodeBranchRule | `src/index.mjs:1` / `ManaRuntime` | 実行可能sourceと検証記録を渡す。画像生成やゲーム更新ではない。 検査: npm test / npm run check。実GPU/聴感/ゲーム別検査。 |
| PostEffects.PostEffectsAutonomousActivationRule | `design/mana-r03.B-Expression-2.json:2146` / `"ordinary_posteffects": false` | source-boundな1操作だけ選択し、通常PostEffectsを一括追加しない。 検査: OBS source/mask/stage/budget検査。 |
| PostEffects.SPCARule | `shaders/field-body.wgsl:46` / `let source=1.0-emitted` | 各局所ピークは量/境界/減衰へ接続され、独立glowを形状にしない。 検査: OBS source/mask/stage/budget検査。 |
| PostEffects.GlobalLocalRule | `design/mana-r03.B-Expression-2.json:2177` / `"local_posteffects"` | 局所maskを固定し、全画面加工/二重登録を避ける。 検査: OBS source/mask/stage/budget検査。 |
| LuminanceDynamicsModule.LDMActivationRule | `design/mana-r03.B-Expression-2.json:2213` / `"inferred_requires_luminance_dynamics": true` | 属性具体化の発光場に必要な輝度包絡だけを有効化する。 検査: 共通時刻とIntensityBudgetの参照検査。 |
| LuminanceDynamicsModule.LDMModeRule | `design/mana-r03.B-Expression-2.json:2223` / `"temporal_envelope"` | 所有者phaseと同じ包絡、未指定の点滅や黒背景を追加しない。 検査: 共通時刻とIntensityBudgetの参照検査。 |
| GradientAnchorPolicy.GradientAnchorRule | `src/shape-data.mjs:10` / `export const PALETTE` | 3領域の色と受領内部の新旧層に色相を束縛。表面prism加工とは別。 検査: 設計/生成WGSL/CPU式を照合。 |
| VideoGenerationPolicy.VideoDurationRule | `src/contract.mjs:3` / `export const DURATION` | 総尺1.6所有者秒を視覚と音声で共有。 検査: tests/clock.test.mjs / audio.test.mjs / runtime.test.mjs |
| VideoGenerationPolicy.CommonTimelineRule | `src/owner-clock.mjs:10` / `this.age=Math.min` | 実効ACC2切替で古い速度を積分してから新速度へ移行し、位相をリセットしない。 検査: tests/clock.test.mjs / audio.test.mjs / runtime.test.mjs |
| GlobalAcceptanceTemplate.GlobalAcceptanceCriteria | `design/mana-r03.B-Expression-2.json:1802` / `"ValidationResults"` | 構造・意味・実描画を別々の状態で記録する。 検査: evidence/validation-summary.jsonと検査層を照合。 |
| GlobalAcceptanceTemplate.ComparativeEvaluationRule | `design/mana-r03.B-Expression-2.json:2584` / `"ComparativeEvaluation"` | r0.2ユーザー報告をr0.3の比較実証と扱わない。 検査: evidence/validation-summary.jsonと検査層を照合。 |
| GlobalAcceptanceTemplate.PassWarningFailEvaluation | `design/mana-r03.B-Expression-2.json:2595` / `"FinalStatus"` | 生成/実GPU未観察はNotRun。静的passで描画passへ昇格しない。 検査: evidence/validation-summary.jsonと検査層を照合。 |
| GlobalAcceptanceTemplate.IntentAndArtisticOutcomeRule | `design/mana-r03.B-Expression-2.json:2570` / `"OutcomeEvaluation"` | 無説明読解と芸術評価は未観察のまま残す。 検査: evidence/validation-summary.jsonと検査層を照合。 |
| UserContract.CommittedPositiveOnly | `src/contract.mjs:11` / `export function validateGain` | 正の確定discreteと2系統の原因だけを通す。 検査: tests/contract.test.mjs |
| UserContract.NoRenkiNaturalCapped | `src/contract.mjs:19` / `['desire-recovery'` | 錬気3variant/自然回復/無変化を除外する。 検査: tests/contract.test.mjs |
| UserContract.OncePerEvent | `src/runtime.mjs:25` / `this.seen.add(key)` | 抑制時もIDを消費し、再受信や後からの可視化で再生しない。 検査: tests/runtime.test.mjs |
| UserContract.RecipientCurrentWorld | `src/runtime.mjs:67` / `worldX:a.worldX` | 受け手の現在位置を各フレームで読む。イベントの古い位置に留まらない。 検査: tests/runtime.test.mjs |
| UserContract.NoLeak | `src/contract.mjs:26` / `export function recipientState` | 生存/在席/ベント/透明/画面内/セッションをfail-closedで検査。 検査: tests/runtime.test.mjs |
| UserContract.VisibilityRecheck | `src/renderer.mjs:78` / `gen!==this.generation` | offscreen proof前後とpresent前後のgeneration/visibilityを再確認する。 検査: tests/runtime.test.mjs + GPU手動 |
| UserContract.ACC2OnlyEffective | `src/contract.mjs:10` / `export function activeRate` | movingかつactiveかつeffectiveだけ2倍、待機/予約/OFFは1倍。 検査: tests/clock.test.mjs |
| UserContract.PhaseContinuous | `src/owner-clock.mjs:12` / `motion(m,wall)` | 途中切替でageを保持し、予約状態では加速しない。 検査: tests/clock.test.mjs |
| UserContract.SFXVisibleFrameOnce | `src/runtime.mjs:83` / `commit(receipt` | GPU由来の有色本体witnessと同じtoken/idの初回だけ発音判断。 検査: tests/runtime.test.mjs +実GPU receipt |
| UserContract.SFXSuppressNoReplay | `src/runtime.mjs:90` / `s.audioDecision='suppressed'` | ミュート/verify/非表示/context停止時は鳴らさず、後から追い鳴らししない。 検査: tests/audio.test.mjs / runtime.test.mjs |
| UserContract.SFXContinuousRate | `src/audio.mjs:28` / `v.source.playbackRate.setValueAtTime` | 同じBufferSourceの再生率だけを変え、startを再実行しない。 検査: tests/audio.test.mjs +実聴 |
| UserContract.SessionDispose | `src/runtime.mjs:55` / `setContext(context)` | 旧voice/active/seen/motionを破棄し、別セッションを混同しない。 検査: tests/runtime.test.mjs |
| UserContract.NearSimultaneousIds | `src/runtime.mjs:62` / `const running=[],pending=[]` | 近接した異なる獲得を別state/token/voiceで管理。初回の同一所有者描画は逐次化する。 検査: tests/runtime.test.mjs |
| UserContract.GPUOnly | `src/renderer.mjs:34` / `getContext('webgpu')` | Canvas2D/画像ファイル/非GPU fallbackなし。 検査: tools/check-source.mjs + GPUページ |
| UserContract.NoGameWrites | `src/contract.mjs:1` / `ゲーム側の確定イベント` | 入力を読み、イベントのマナ量を表示側から変更しない。 検査: read-only mockテスト/公開API |
| UserContract.H64QualitySeparate | `tests/gpu-tests.mjs:16` / `quality:{dark:'not_run'` | 技術数値がpassでも暗明の無説明読解は人が別判定する。 検査: docs/ACCEPTANCE.md |
| UserContract.IndependentR03 | `src/shape-data.mjs:1` / `r0.3独立造形` | 旧版のshader/形状/視覚素材を移植せず、新しい輪郭・量場・時間分布を実装。 検査: docs/PROVENANCE.md |

全行のGPU観察・品質観察は未実施です。契約テストはmock、幾何・量場はCPU式で検査しています。正本の公式検証器を実行したという主張はしません。
