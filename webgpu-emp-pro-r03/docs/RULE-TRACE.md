# B Foundation rule trace / r0.3

適用基準：会話で提供された基底.md 2026-09-11統合版、拡張.md 2026-09-23多層VFX版、および最新の共通Eデジタル主形指定。仕様本文の改変ではなく、B-Expression-2設計インスタンスとして適用します。提供された公式validator実行物はないため、同梱validatorはローカルの構造検査に限定します。

| 規則ID | 実装/設計対応 |
|---|---|
| InferenceExpansionPolicy.AttributeAndActionResolutionRule | 既存5枝の列・経路・接続・欠損をattribute_resolvedで具体化。新人物・粒子・紋章を追加しない。 |
| InferenceExpansionPolicy.DeclaredIntentRule / ExpressionIntentRule | 人数/対象/authority/位相/背景/文字と、デジタル主形・保持・終端を分離記録。 |
| FoundationOperationTemplate.OutputAndReferenceResolutionRule | JSON B-Expression-2、Videoの実時間写像、render_requested、PH/OBS mapping、$refなし。 |
| PhenomenonSystemTemplate.PartitionAndSharedConditionsRule | 5枝、既存ホスト境界、起因SFXを7PHとして独立応答で分割。層数からPH追加なし。 |
| PhenomenonSystemTemplate.PhysicalModelClosureRule | 宣言ゲーム情報場。実EM/熱/物性を捏造せず、入力・境界・時間・不適用収支を理由付きで保持。 |
| PhenomenonSystemTemplate.DynamicResponseAndStabilityRule | readiness≠expiry。stateAgeMs固定＋terminalQ撤去。lock延長は再初期化しない。 |
| PhenomenonSystemTemplate.PerceptualEvidenceDiscriminationRule | 明滅/拡縮との誤認を列占有・前端/後端・消去済空間で識別する計画。実像はnot_run。 |
| CoordinateGravityWindTemplate.WindCapsuleOperationRule | medium=other:宣言情報場、ambient field=0。空気の可視粒子を作らない。 |
| ObservationIntegrationTemplate.ObservationRegistrySeparationRule | 世界場とOBS1ラスタ・OBS2出力・OBS3音・OBS4診断を分離。 |
| ObservationIntegrationTemplate.SamplingAndReconstructionRule | MSAA/resolve/filtering sampler/LOD0/同actor時刻を具体化。実処理と未確認を区別。 |
| VFX.MultilayerArchitectureRule | 各PHの主構造・境界＋OBS補助。world/observation混合層なし、入力依存方向を保持。 |
| VFX.TransportTemporalRule | 有限転送区間・補対列消費・steady holds・権威coda。固定点滅や粒子寿命一式を追加しない。 |
| PostEffects.PostEffectsAutonomousActivationRule | attribute_resolvedのみ、ordinary_posteffects=false、既存稜線局所処理だけ。 |
| LuminanceDynamicsModule.LDMActivationRule / LDMModeRule | 明示VFXから起動。保持・列退役に従うenvelope、micro_variation=none。 |
| VideoGenerationPolicy.CommonTimelineRule | 10秒正準デモの共通actor timeline。APIに別world時計を導入しない。 |
| GlobalAcceptanceTemplate.IntentAndArtisticOutcomeRule | Structural / Semantic / Render / Outcome / actual listeningを分離。実GPU/実聴not_run、品質合格なし。 |

## 選択拡張

VFXは5枝の世界内情報場を設計するため明示起動。PostEffectsは既存白稜の局所HDR統合だけattribute_resolvedで起動。LDMは明示VFXに従い保持/終端の輝度を整合。VideoGenerationPolicyは連続する実行資産の共通actor timelineのため起動します。

KeywordExpansionは登録略号がないため不使用。GradientAnchorPolicyは色相gradientを選択していないため不使用。CharacterPolicy/BeautifulPoseCapsuleは人物の美術/身体動作を作る資産ではないため不使用です。H64形はhost coverageの検査maskとしてOBS4に属し、ゲーム内人物や物理支持を新造しません。実ゲームの身体・姿勢・衣装は接続側で別途適用/検査する必要があります。この限定を実キャラ検証済みと誤読しないでください。
