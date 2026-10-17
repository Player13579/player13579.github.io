import { constructPlanarProjection, VIEW_BOX } from './planar-projection.mjs';

// Complete B-3 display-graphic design. No template fetch, hidden runtime data,
// alternate execution prompt, image generation, or world-material inference.
const TEMPLATE = {
  "FoundationOperationTemplate": {
    "OutputContract": {
      "schema_version": "B-Expression-3",
      "mode": "Image",
      "operation": "design_only"
    },
    "TemplateConsolidation": {
      "per_chapter_template_count": 1,
      "template_position": "chapter_end",
      "inter_template_duplication_forbidden": true,
      "cross_chapter_reference_preferred": true
    },
    "RuleContract": {
      "fields": [
        "rule_id",
        "rule_kind",
        "owner",
        "priority",
        "applies_when",
        "requirement",
        "exception_to",
        "validation_id"
      ],
      "same_priority_resolution": "explicit_exception_or_compatible_union_or_spec_conflict",
      "unresolved_conflict_result": "spec_conflict",
      "rule_kinds": [
        "requirement",
        "prohibition",
        "permission",
        "default",
        "preference"
      ],
      "mixed_clause_policy": "explicit_kind_and_scope",
      "permission_does_not_cancel_prohibition": true,
      "resolution_order": "applicability_then_hard_constraints_permissions_defaults_feasible_preferences"
    },
    "GlobalInterpretation": {
      "world_registry": "PhenomenonSystemTemplate.PhenomenonRegistry",
      "observation_registry": "ObservationIntegrationTemplate.ObservationRegistry",
      "full_PH_structure_required_for_all_visibilities": true,
      "WindCapsule_required": true
    },
    "UniversalNoLabelOnly": {
      "label_only_declaration_forbidden": true,
      "indirect_evidence_for_implicit_latent": true,
      "purpose_required_evidence_only": true
    },
    "Acceptance": {
      "each_chapter_has_exactly_one_template": true,
      "independent_template_groups_absent": true,
      "unique_rule_ids_and_resolvable_references": true,
      "same_priority_conflicts_resolved_explicitly": true
    },
    "GenerationContract": {
      "backend": "未選択。平面図案の設計保存だけを行い、画像生成先の対応付け・送信は行っていない。",
      "code_artifact": "planar-motif-b-design.json",
      "required_requirements": [
        "InferenceExpansionPolicy.InferenceExpansionPolicy",
        "InferenceExpansionPolicy.AttributeAndActionResolutionRule",
        "InferenceExpansionPolicy.DeclaredIntentRule",
        "InferenceExpansionPolicy.ExpressionIntentRule",
        "FoundationOperationTemplate.FoundationOperationRule",
        "FoundationOperationTemplate.RuleContractRule",
        "FoundationOperationTemplate.UniversalNoLabelOnlyRule",
        "FoundationOperationTemplate.OutputAndReferenceResolutionRule",
        "PlatonicGoodTemplate.PlatonicGoodFoundation",
        "PlatonicGoodTemplate.BeautyStructuringRule",
        "PlatonicGoodTemplate.NoSingleBeautyStructureDominance",
        "PEMTemplate.PhenomenonEqualityMode",
        "PEMTemplate.AttentionRuleWithCCM",
        "CoordinateGravityWindTemplate.ProjectionSetRule",
        "CoordinateGravityWindTemplate.RelationPriorityRule",
        "CoordinateGravityWindTemplate.WindCapsuleOperationRule",
        "AnimeStudiesTemplate.KeyframeSnapshotRule",
        "ObservationIntegrationTemplate.ObservationRegistrySeparationRule",
        "ObservationIntegrationTemplate.OperationClasses",
        "ObservationIntegrationTemplate.SamplingAndReconstructionRule",
        "ObservationIntegrationTemplate.StrictTermDefinitions",
        "ExtremumDesignColorTemplate.PEVRule",
        "ExtremumDesignColorTemplate.AESRule",
        "ExtremumDesignColorTemplate.DesignScienceRule",
        "ExtremumDesignColorTemplate.FormGrammarRule",
        "ExtremumDesignColorTemplate.ScreenAllocationRule",
        "ExtremumDesignColorTemplate.DepictionContractRule",
        "ExtremumDesignColorTemplate.CCMScope",
        "ExtremumDesignColorTemplate.ColorScienceInAES",
        "TermsTemplate.Terms",
        "GlobalAcceptanceTemplate.GlobalAcceptanceCriteria",
        "GlobalAcceptanceTemplate.ComparativeEvaluationRule",
        "GlobalAcceptanceTemplate.PassWarningFailEvaluation",
        "GlobalAcceptanceTemplate.IntentAndArtisticOutcomeRule",
        "PhenomenonSystemTemplate.KnowledgeProvenanceRule",
        "AnimeStudiesTemplate.SilhouetteDesignRule",
        "ObservationIntegrationTemplate.PostEffectsCommonRule",
        "ObservationIntegrationTemplate.ObservationIntensityBudgetRule",
        "ExtremumDesignColorTemplate.AESEvaluationAxes",
        "ExtremumDesignColorTemplate.ArtisticBeautyDefinitions",
        "ExtensionActivationTable.ExtensionActivationRule",
        "FoundationOperationTemplate.GenerationCodeDeliveryRule",
        "FoundationOperationTemplate.OutputCodePurityRule",
        "CoordinateGravityWindTemplate.VisibleTranslationRule",
        "AnimeStudiesTemplate.AnimeLayoutRule",
        "AnimeStudiesTemplate.LimitedAnimationStillnessRule"
      ],
      "entries": [],
      "coverage_status": "not_run",
      "unresolved": []
    },
    "RevisionContract": {
      "target": "not_applicable",
      "editable": [],
      "protected": [],
      "dependencies": [],
      "recheck": []
    }
  },
  "InferenceExpansionPolicy": {
    "DeclaredIntent": {
      "character_count": 0,
      "character_attributes": {},
      "main_action": "選択中の紋様を、平面の表示図案として保存する。",
      "main_objects": [
        "OBS1の紋様図案。物理物体・魔法現象・支持板ではない。"
      ],
      "background": "紋様以外は透明。平面の補助枠・格子・比較用の別案は含めない。",
      "style": "sRGB #147d78 の不透明な単色塗り。独立した線・陰影・材質・発光なし。",
      "text_logo_policy": "文字・ロゴ・人物・小道具を追加しない。"
    },
    "ExpressionIntent": {
      "source": "user_declared",
      "purpose": "画面で選択した紋様と投影の幾何を、一つの自己完結したB-3設計へ保持する。意味や感情、美的評価は追加しない。",
      "must_communicate": [
        "採用した全多角形の境界・順序・配置を保持する。",
        "透視投影または正射影を計算済みの画面図案として扱う。",
        "1024×1024の透明背景で、採用紋様だけを単色表示する。"
      ],
      "preserve_ambiguity": [
        "紋様に宗教・魔法・文字等の意味を断定しない。"
      ],
      "allowed_omission": [
        "比較案・操作用の補助線・ラベルを作品へ含めない。",
        "物理物体・材質・照明・時間変化は設計しない。"
      ],
      "allowed_exaggeration": [],
      "protected_relations": [
        "採用した幾何、同じ写像、塗り規則と透明背景を保持する。重なった同色領域を勝手に離さず、構成数と見える独立形状数を混同しない。"
      ]
    },
    "SelectionLifecycle": {
      "stages": [
        "candidate",
        "accepted",
        "registered_world",
        "registered_observation"
      ],
      "candidate_catalog_in_final_code": false,
      "world_registry": "PhenomenonSystemTemplate.PhenomenonRegistry",
      "observation_registry": "ObservationIntegrationTemplate.ObservationRegistry",
      "adoption_checks": [
        "DeclaredIntent_consistency",
        "contribution",
        "readability",
        "activation_condition"
      ]
    },
    "inferred_support_elements": {
      "default_permission": "denied",
      "explicit_user_permission_required": true,
      "allowed_domains": [],
      "allowed_scope": "user_explicitly_authorized_targets_and_domains_only",
      "support_declared_elements_without_overriding_them": true,
      "latent_visualization_object_not_required": true
    },
    "Acceptance": {
      "declared_intent_preserved": true,
      "inference_without_explicit_user_permission_absent": true,
      "candidate_accepted_registered_distinguished": true,
      "unselected_candidates_absent_from_final": true
    }
  },
  "PlatonicGoodTemplate": {
    "Good": {
      "evidence": "選択した設定と、同じ投影器で再構成した多角形座標が設計根拠。生成画像の観察は未実施。"
    },
    "Truth": {
      "coordinate_continuity": "各頂点を記載順の直線で結び閉じる。元の曲線は有限多角形近似。",
      "physical_causality": "表示専用OBS1であり、仮想の投影計算を物理板・光源・PHへ読み替えない。",
      "state_transition_readability": "静止Imageのみ。前後の時刻や運動を作らない。"
    },
    "Beauty": {
      "boundary_readability": "指定された輪郭を一様塗りで示す。小さな隙間や先端の実画像での可読性は未確認。",
      "gaze_circulation": "視線経路・注視・情動を推測しない。採用した紋様をそのまま構成とする。",
      "structural_separation": "紋様の塗りと透明な背景を分け、操作用の補助枠を描かない。"
    },
    "BeautyStructuring": {
      "axes": [
        "ratio_proportion",
        "balance_symmetry",
        "contrast",
        "rhythm_repetition",
        "whitespace_density",
        "hierarchy_gaze_flow",
        "material_response",
        "temporal_phase"
      ],
      "standard_minimum_axes_per_PH": 2,
      "standard_minimum_evidence_per_applied_axis": 2,
      "intent_adjustment_ref": "InferenceExpansionPolicy.ExpressionIntent",
      "selection_policy": "今回選択された比率・反復・輪郭・余白を保持する。自動最適化や美的優劣の測定は行わない。",
      "axis_or_evidence_count_quota": "固定個数の軸や証拠数を課さず、明示した目的と制約に必要な項目だけを採る。"
    },
    "Acceptance": {
      "each_PH_connected_to_at_least_two_GTB_layers": true,
      "single_formula_does_not_dominate_beauty": true,
      "purpose_relevant_GTB_connections_explained": true
    }
  },
  "CoordinateGravityWindTemplate": {
    "Units": {
      "length": "画面座標は正規化単位、出力は1024×1024 px。仮想投影のローカル単位は物理的実寸ではない。",
      "time": "s",
      "temperature": "K_or_declared",
      "pressure": "Pa_or_declared",
      "angle": "紋様の局所構成と仮想投影の角度をdegreeで記録する。世界内の物理角を追加しない。"
    },
    "WorldCoordinates": {
      "handedness": "right_handed",
      "X": "right_positive",
      "Y": "up_positive",
      "Z": "backward_positive",
      "camera_forward": "negative_Z",
      "origin": "物理世界座標を設けない。"
    },
    "CameraCoordinates": {
      "X": "right_positive",
      "Y": "up_positive",
      "forward": "negative_Z",
      "projection": "OBS1の計算済み座標を直接表示する。仮想面の投影は図案の生成手順であり、世界内カメラ・Entity・PHの登録ではない。",
      "FOV_or_scale": "画面正規化座標から連続ピクセル境界座標へ1024倍。座標1は外周境界1024で、画素indexではない。"
    },
    "ScreenCoordinates": {
      "domain": "[0,1]x[0,1]",
      "x": "0_left_to_1_right",
      "y": "0_top_to_1_bottom"
    },
    "TransformChain": {
      "order": [
        "world",
        "camera",
        "screen"
      ],
      "world_to_camera": "PH0につき未適用。世界座標からの変換は行わない。",
      "camera_to_screen": "OBS1の正規化座標を1024×1024の透明表示面へ直接配置する。"
    },
    "ContactCoordinates": {
      "contact_patch": "物理接触パッチなし。",
      "contact_normal": "物理法線なし。",
      "support_relation": "物理支持面・穴・接触なし。紋様の画面上の重なりは物理接触ではない。",
      "no_penetration": true
    },
    "VectorField": {
      "dominant_vector": {
        "direction": "画面図案のみのため物理ベクトル場は適用しない。",
        "magnitude": "画面図案のみのため物理ベクトル場は適用しない。",
        "falloff": "画面図案のみのため物理ベクトル場は適用しない。",
        "fluctuation": "画面図案のみのため物理ベクトル場は適用しない。"
      },
      "secondary_vector": {
        "direction": "画面図案のみのため物理ベクトル場は適用しない。",
        "magnitude": "画面図案のみのため物理ベクトル場は適用しない。",
        "falloff": "画面図案のみのため物理ベクトル場は適用しない。",
        "fluctuation": "画面図案のみのため物理ベクトル場は適用しない。"
      }
    },
    "Gravity": {
      "condition": "not_applicable_display_only",
      "vector": "not_applicable: PH0に世界内重力なし",
      "strength": "not_applicable: PH0に世界内重力なし",
      "affected_responses": "not_applicable: 物理応答なし",
      "evidence": "not_applicable: PH0の画面図案"
    },
    "WindCapsule": {
      "required": true,
      "medium_state": "not_applicable_display_only",
      "medium_properties": {
        "density": "not_applicable: OBS1のみの平面図案に世界内の媒質を置かない。",
        "viscosity": "not_applicable: OBS1のみの平面図案に世界内の媒質を置かない。"
      },
      "Field": {
        "direction": "not_applicable: OBS1の画面色と図形に世界内の風場を適用しない。",
        "speed": "not_applicable: OBS1の画面色と図形に世界内の風場を適用しない。",
        "gust": "not_applicable: OBS1の画面色と図形に世界内の風場を適用しない。",
        "shear": "not_applicable: OBS1の画面色と図形に世界内の風場を適用しない。",
        "turbulence": "not_applicable: OBS1の画面色と図形に世界内の風場を適用しない。"
      },
      "ApplicableResponses": {
        "body": "not_applicable: 人物・衣服・髪・物理環境を含めず、対象となるPHは0。",
        "cloth": "not_applicable: 人物・衣服・髪・物理環境を含めず、対象となるPHは0。",
        "hair": "not_applicable: 人物・衣服・髪・物理環境を含めず、対象となるPHは0。",
        "loose_elements": "not_applicable: 人物・衣服・髪・物理環境を含めず、対象となるPHは0。",
        "environment": "not_applicable: 人物・衣服・髪・物理環境を含めず、対象となるPHは0。"
      },
      "non_applicable_responses_explicit": true
    },
    "WorldApplicability": {
      "status": "not_applicable_display_only",
      "reason": "登録対象は直接表示されるOBS1の画面図案のみ。PH・Entity・世界内光源・接触を宣言せず、物理運動・重力・風を割り当てない。"
    },
    "Acceptance": {
      "world_camera_screen_transform_defined": true,
      "screen_axis_convention_defined": true,
      "Gravity_present": true,
      "WindCapsule_present": true,
      "medium_state_present": true,
      "no_inapplicable_wind_evidence_required": true,
      "world_camera_screen_transform_or_explicit_ProjectionSet_defined": true
    },
    "ProjectionSet": {
      "explicit_selection": "user_declared",
      "projections": [
        {
          "projection_id": "P1",
          "projection_model": "explicit_mapping",
          "entity_refs": [],
          "screen_region": "1024×1024のOBS1表示面 [0,1]×[0,1]",
          "transform_or_mapping": "pixel_boundary_x=1024*x、pixel_boundary_y=1024*y。図案の投影計算からの変換はSharedConditions.PlanarMotifのscreen_from_projectedに全て明記し、同じ写像を全頂点へ適用する。 SVGへ描く場合は、埋込みprojected_polygonsの元の投影座標を使い、yを反転してprojected_svg_view_boxへ配置できる。正規化座標の逆変換による余分な丸めを避けるための等価な表現で、個別要素の別投影ではない。"
        }
      ],
      "entity_contact_invariants": "Entityなし。支持・接触不変条件は適用しない。",
      "seam_policy": "単一の連続画面写像。継ぎ目なし。",
      "selection_basis": "投影方式・傾き・回転・透視距離のコントロールに表示した現在の設定を、平面図案として保存する選択で採用する。保存ボタンはその採用結果を書き出し、物理カメラや世界内の面を宣言しない。初期値も表示される採用候補であり、ユーザーが個々の値を変更したという操作履歴は主張しない。"
    }
  },
  "OctaDomainTemplate": {
    "Acceptance": {
      "all_8_domains_present": true,
      "role_classification_present": true,
      "latent_does_not_require_direct_visualization": true,
      "non_applicable_domains_retained_with_reason_and_latent_role": true,
      "domain_state_reason_and_reactivation_present": true,
      "modeled_detail_present_other_detail_optional": true,
      "all_eight_assessments_retained_without_forcing_mechanisms": true
    },
    "DetailPolicy": {
      "detail_required_when": "PHを追加する場合は、当該PHに八領域のstate・理由・再評価条件を記し、modeledなど正本が詳細を要求する状態を具体化する。",
      "detail_omitted_when": "本設計のPH登録は0件のため、個別PHの八領域点検インスタンスも0件。共通点検規約は保持し、空の物理機構やlatent PHを捏造しない。",
      "all_eight_state_assessments_required": true
    }
  },
  "AnimeStudiesTemplate": {
    "KeyframeSnapshot": {
      "phase": "静止Image一枚。前後状態・時間相・動作は宣言されていない。",
      "state_t_minus_1_evidence": "時間系列なし。前状態は要求されない。",
      "state_t_evidence": "現在の状態はOBS1に登録する採用紋様の全多角形と指定色。",
      "state_t_plus_1_evidence": "時間系列なし。後状態は要求されない。"
    },
    "Layout": {
      "staging": "R_motifの全多角形を正規化画面へ配置し、残りのR_backgroundを透明に保つ。",
      "projection_consistency_ref": "CoordinateGravityWindTemplate",
      "whitespace_role": "全塗り領域の補集合は透明な表示背景。内部の隙間も物理的な穴ではない。"
    },
    "PoseActing_or_SceneActing": {
      "character_ref": "人物なし。",
      "object_balance": "物理物体なし。保存対象の採用紋様のみを配置し、比較案を含めない。",
      "contact_logic": "物理接触なし。多角形の投影上の重なりを保持し、交差を自動修正しない。"
    },
    "MotionReadability": {
      "motion_blur_smear_speed_line_policy": "explicit_user_request_only",
      "primary_causality_replacement_by_motion_effects": false
    },
    "CompositeIntegration": {
      "observation_ref": "ObservationIntegrationTemplate",
      "contact_shadow_used_for_integration": "接触する物体がないため影による統合は行わない。"
    },
    "Acceptance": {
      "previous_and_next_time_or_explicit_ambiguity_accounted_for": true,
      "projection_consistent": true,
      "posteffects_do_not_replace_primary_causality": true
    }
  },
  "ExtremumDesignColorTemplate": {
    "PEV": {
      "candidate_state_set": [],
      "selected_physics_extremum": "not_applicable_display_only",
      "reason": "世界内PH候補は0。現在選択された図案の実現可能性は、有限座標、表示範囲、共通写像で扱う。物理的極値を捏造しない。"
    },
    "AES": {
      "visual_circulation": "選択された紋様の構成だけを保持し、視線の経路や美的効果は未観測とする。",
      "asymmetric_balance": "画面内の選択済み配置を保持する。対称化・中央補正は追加しない。",
      "tension_release": "輪郭と余白を選択結果のまま保持する。心理的効果は断定しない。",
      "body_environment_consonance": "人体・物理環境を置かない。図案と透明背景の関係だけを扱う。",
      "selected_aesthetic_extremum": "画面で採用した紋様と投影。自動で最良案を選んだ結果ではない。",
      "selection_method": "joint_feasibility_constrained_exploration"
    },
    "DesignScience": {
      "VisualHierarchy": "採用紋様を唯一の図案として表示し、操作補助・比較案・文字を除く。",
      "DensityPlan": "各構成要素の座標と数を保持する。重なりの和集合面積や知覚群の数は計測せず、面積を捏造しない。",
      "ShapeOrder": "SharedConditions.PlanarMotif.projected_polygonsを描画の正本とし、index順、y反転とprojected_svg_view_boxで閉じた単色多角形を一度ずつ描く。screen_polygonsは同じ幾何の正規化画面表現として領域を説明し、二重に描かない。",
      "OrnamentFunction": "選択された紋様そのものが対象。意味をもつ装飾物を追加しない。",
      "PrincipleApplication": {
        "status": "applied",
        "applicability_reason": "平面意匠の全要素へ共通の投影と画面変換を適用し、選択済みの輪郭・余白・構成数を保持する。",
        "applications": [
          {
            "application_id": "A1",
            "principle": "射影幾何学の平面ホモグラフィと同次座標、ユークリッド幾何学の均一拡縮・直交基底、線形代数の画面座標へのアフィン変換。",
            "region_refs": [
              "R_motif",
              "R_background"
            ],
            "construction": "元の紋様の設定から形状を再構成し、外接枠の中心移動と正の均一拡縮、直交基底による面の回転、選択した透視または正射影を適用する。投影座標p=(x,y)をs=((x+2.3)/4.6,(2.3-y)/4.6)へ移し、全頂点を同じ変換で画面化する。採用座標を全てこの一つの設計に埋め込み、外部ファイル読込みや別の短いpromptに委ねない。",
            "expected_effect": "選択画面で採用した輪郭と配置を、B設計へ手で書き直すことなく保持する。画像生成先による再現精度や美的改善は保証しない。",
            "preserved_relations": "多角形の頂点数・順序・共通画面写像、選択色#147d78、不透明度1、透明背景。投影前の角度・面積・長さ・回転対称性が画像内でも保たれるとは主張しない。",
            "verification": "設定から構成した投影、保存座標、実際に保存したSVGとの座標対応を外部試験で確認する。生成画像の境界・透明背景・細部・美的効果は未観察でnot_run。"
          }
        ]
      }
    },
    "CCM": {
      "Palette": {
        "base": "R_motifの表示色 sRGB #147d78、不透明度1。",
        "secondary": "none: 別の塗り色を追加しない。",
        "accent": "none: 別のアクセント色を追加しない。",
        "neutral": "R_backgroundはalpha=0。透明域のRGB値は指定しない。"
      },
      "ColorDynamics": {
        "temp": "色温度や温冷印象を測定せず、表示RGBを直接指定する。",
        "value_range": "塗り内部はsRGB #147d78。境界のアンチエイリアスと色管理後の画素値は未観測。",
        "saturation": "彩度調整・グラデーションなし。"
      },
      "Lighting": {
        "key_K": "物理照明なし。",
        "fill_tint": "照明色・フィルライトなし。"
      },
      "BackgroundBinding": {
        "bg_dominant": "透明背景alpha=0。プレビューのページ背景色を含めない。",
        "bg_accent": "背景アクセントなし。"
      },
      "PerceptualControl": {
        "attention_focus": "採用紋様全体。実際の視線や注視は未測定。",
        "figure_ground_stability": "図案の塗りと透明域を分ける。合成先背景による読取りは未確認。",
        "arousal_level": "情動強度は指定・予測しない。",
        "perceptual_noise_tolerance": "細部の出力可読性は未観測。追加ノイズ・ぼけ・模様を付加しない。"
      },
      "IntrinsicColor": "物理的な固有色ではなく、OBS1の表示色。",
      "Illumination": "物理照明・反射・影なし。",
      "Depiction": "不透明な単色多角形を透明キャンバスへ直接配置する。",
      "Display": "sRGB、1024×1024 px、背景alpha=0、塗りalpha=1。実生成画像の色管理・alpha・端部は未確認。"
    },
    "Acceptance": {
      "PEV_applied_before_AES_when_world_candidates_exist": true,
      "AES_does_not_override_world_validity": true,
      "legacy_FDS_resolved_to_DesignScience": true,
      "CCM_fields_fixed": true,
      "PEV_AES_joint_exploration_preserves_feasibility": true
    },
    "JointExploration": {
      "variables": "紋様生成器で選んだ設定と投影ページの面傾き・回転・投影方式・距離。現在の採用案だけを出力する。",
      "hard_constraints": [
        "元の設定、構成数、頂点順と選択された投影を保持する。",
        "1024×1024の透明画面。塗りは#147d78、alpha=1、別の線・陰影・発光なし。",
        "比較用に残した案や補助面枠を描かない。",
        "表示図案を世界内の物体・現象へ読み替えない。"
      ],
      "feasibility_basis": "受理された設定から既存投影器で再構成し、全頂点を同じ画面写像へ移す。素材・照明を計算したことにはしない。",
      "comparison_basis": "画面では比較用の案を保持できるが、その案は設計へ含めない。自動の比較評価・美的順位付けはしていない。",
      "selected_realization": "現在選択中の紋様と投影だけを採用する。",
      "unresolved": []
    },
    "ScreenAllocation": {
      "regions": [
        {
          "region_id": "R_motif",
          "screen_region": "SharedConditions.PlanarMotif.screen_polygonsに全て埋め込んだ多角形の塗りの和集合。",
          "target_refs": [
            "OBS1"
          ],
          "edge_policy": "各輪郭を直線で閉じ、nonzero規則で塗る。独立ストロークを付けない。",
          "detail_density": "採用頂点数と配置をそのまま保持。重なりを自動で解消しない。",
          "color_area": "sRGB #147d78、alpha=1。和集合面積・実画素数は未計測。",
          "negative_space": "多角形の塗りの補集合は透明。隙間を物理穴や追加形状としない。",
          "priority_relations": "全要素を同じ色・不透明度でindex順に塗る。構成数と見える独立部分数は別。"
        },
        {
          "region_id": "R_background",
          "screen_region": "正規化画面[0,1]²におけるR_motifの塗りの補集合。",
          "target_refs": [
            "OBS1"
          ],
          "edge_policy": "追加輪郭なし。",
          "detail_density": "透明な残余。格子・枠・文字・質感を加えない。",
          "color_area": "alpha=0。透明域のRGB値は意味を持たず指定しない。",
          "negative_space": "外部余白と内部の未塗り部分を含む透明背景。",
          "priority_relations": "ページのプレビュー背景を作品背景へ混入させない。"
        }
      ]
    },
    "DepictionContract": {
      "style_basis": "透明な1024×1024画面の単色平面紋様。",
      "line_policy": "独立したストロークなし。採用多角形を閉じた塗りとして描く。",
      "shading_policy": "陰影・照明勾配・接触影なし。",
      "reflection_policy": "反射・鏡面・発光なし。",
      "material_cue_policy": "物理材質・厚み・支持板は描かない。",
      "preserved_relations": [
        "全頂点と順序、nonzeroの塗り、採用色、不透明度、共通写像、透明背景を保持する。",
        "未選択の別案・補助図形・装飾を加えない。"
      ]
    }
  },
  "ReflectionClosureTemplate": {
    "Applicability": {
      "applies_when": [
        "reflection",
        "highlight",
        "sheen",
        "gloss",
        "wetness",
        "metallic_response",
        "skin_highlight",
        "cloth_sheen"
      ],
      "otherwise": "not_applicable_display_only: 反射するEntity・PHを置かず、OBS1の単色面を直接表示する。"
    },
    "ReflectionClosureBlock": {},
    "Acceptance": {
      "reflection_integrated_into_PH_mesh": true,
      "lensflare_registered_as_OBS_not_reflection": true
    },
    "ModelPolicy": {
      "MicrofacetField_required_only_when": "今回OBS1は一様な画面色の直接表示であり、反射・鏡面・材質応答を含まないため微細面モデルは適用しない。"
    }
  },
  "TermsTemplate": {
    "Acceptance": {
      "undefined_legacy_terms_absent": true
    }
  },
  "PhenomenonSystemTemplate": {
    "PartitionPolicy": {
      "criterion": "今回PH0のため領域分割対象なし。将来PHを置く場合は独立した実在境界で判定する。",
      "shared_condition_policy": "世界内の物理共有条件なし。SharedConditions.PlanarMotifはOBS1の図案幾何を一つの箇所に記録する制作条件。",
      "no_discipline_based_split": true
    },
    "SharedConditions": {},
    "PhenomenonRegistry": {},
    "PhenomenonBlock": {},
    "Acceptance": {
      "all_PH_have_required_full_structure": true,
      "visible_implicit_latent_have_same_field_set": true,
      "OBS_not_in_PH_registry": true,
      "PIA_resolved_as_identification_lifecycle": true,
      "Entity_PH_OBS_responsibilities_separated": true
    },
    "EntityRegistry": {},
    "KnowledgeProvenance": {
      "claims": [
        {
          "target_ref": "OBS1",
          "basis_kind": "adopted_assumption",
          "source": "選択された紋様と投影の設定、および既存の平面投影構成器。射影幾何の資料: https://visionbook.mit.edu/homography.html ; https://visionbook.mit.edu/imaging_geometry.html",
          "statement": "同じ仮想面の投影を全要素へ適用して得た平面図案を、正規化画面へ一様拡縮・y反転して保持する。",
          "evidence_refs": [],
          "limits": "資料は投影の幾何を支える。色・操作範囲・1024寸法・採用案は設計選択。画像生成・知覚・美的評価の実績ではない。"
        }
      ]
    }
  },
  "ObservationIntegrationTemplate": {
    "ObservationRegistry": {
      "OBS1": {
        "operation_type": "display_artifact",
        "input_references": [],
        "target_mask": "1024×1024の透明表示面。R_motifと補集合R_backgroundのみ。",
        "stage": "display",
        "composite_method": "描画の正本はprojected_polygons。各頂点(x,y)をSVG座標(x,-y)へ写し、projected_svg_view_boxの透明画面へindex順、nonzero、#147d78、alpha=1で閉じた多角形を一度ずつ塗る。screen_polygonsは同じ写像の正規化画面表現で、領域・配置の説明に使い、二重に描かない。独立ストロークなし。",
        "intensity": "直接表示の不透明度は全領域1。glow等の追加エフェクトは採用せず、強度は各IntensityBudgetの理由付きnoneに従う。",
        "protected_regions": [
          "R_motif: 採用輪郭と順序、#147d78、alpha=1。",
          "R_background: alpha=0、補助格子・枠・文字なし。"
        ],
        "output_consequence": "描画はPhenomenonSystemTemplate.SharedConditions.PlanarMotif.projected_polygonsの全頂点を順に結び閉じ、y反転とprojected_svg_view_boxを用いる。screen_polygonsは同じ輪郭の左上(0,0)・右下(1,1)への写像であり、追加の形ではない。余白は透明。比較案・補助線・枠・文字は描かない。元の投影座標を正本にすることで、正規化座標の逆変換による余分な丸めを避ける。",
        "dependencies": [],
        "sampling_consequence": "1024×1024、sRGB、透明背景。アンチエイリアスと再サンプリング、実出力のalphaは未観測。"
      }
    },
    "SamplingContract": {
      "output_resolution": "1024×1024 px。設計指定であり画像生成は未実施。",
      "intended_display_scale": "1024×1024の正方形画面。縮小時の可読性は別に確認する。",
      "spatial_detail_policy": "採用した全頂点の単色塗り。細部の消失・隙間の結合・端部のalphaを実出力で確認する。",
      "temporal_sampling": "not applicable for Image",
      "filter_and_resample_policy": "フィルタ・再サンプリングは未選択・未実行。実生成先の条件は対応付け時に具体化する。"
    },
    "ImageIntegration": {
      "ToneColor": "紋様はsRGB #147d78、alpha=1。その他はalpha=0。",
      "LightIntegration": "物理照明なし。",
      "ShadowDensity": "影なし。",
      "DepthAir": "世界内奥行き・空気遠近なし。図案の遠近形状は埋め込み座標に含める。",
      "EdgeLine": "独立線なし。各多角形の塗り境界だけ。",
      "TextureOutput": "質感・粒状感なし。"
    },
    "IntensityBudget": {
      "intentional_departures": [],
      "global_observation_budget": "採用紋様の幾何と単色塗りのみ。後処理効果を追加しない。",
      "para": "none: 透明背景への単色紋様の直接表示だけで、この加工を採用しない。",
      "flare_gradient": "none: 透明背景への単色紋様の直接表示だけで、この加工を採用しない。",
      "glow": "none: 透明背景への単色紋様の直接表示だけで、この加工を採用しない。",
      "diffusion": "none: 透明背景への単色紋様の直接表示だけで、この加工を採用しない。",
      "grain": "none: 透明背景への単色紋様の直接表示だけで、この加工を採用しない。",
      "chromatic_aberration": "none: 透明背景への単色紋様の直接表示だけで、この加工を採用しない。",
      "protected_region_priority": "highest"
    },
    "CompositeValidation": {
      "contour_preserved": "not_tested",
      "highlight_clipping": "not_tested",
      "shadow_crushing": "not_tested",
      "chroma_displacement": "not_tested",
      "fine_detail_retention": "not_tested",
      "protected_background_preserved": "not_tested"
    },
    "Acceptance": {
      "OBS_separate_from_PH": true,
      "physical_lensflare_source_binding_preserved": true,
      "display_artifact_does_not_fake_physical_source": true,
      "intensity_budget_is_single_source_of_truth": true,
      "sampling_conditions_and_actual_execution_distinguished": true,
      "compilation_mapping_does_not_claim_unexecuted_processing": true
    }
  },
  "PEMTemplate": {
    "Mode": {
      "phenomenon_equality": true,
      "focus_phenomenon": "none"
    },
    "CausalMesh": {
      "gaze_path_A": "not_applicable: 視線経路は選択していない。採用紋様の位置関係だけを図案として保持する。",
      "gaze_path_B": "not_applicable: 視線経路を選択しておらず、第二経路も作らない。",
      "gaze_target_policy": "not_applicable_display_only",
      "adjustment_reason": "世界内PH・物理因果網・視線経路がない表示専用図案。Acceptanceの真偽欄は適用対象があるときに守る整合条件であり、存在しない経路や網の接続を観察した結果ではない。今回の実行検査・画像評価はGlobalAcceptanceTemplateのnot_runに従う。",
      "physical_mesh_required": false,
      "selection_reason": "図案の座標と塗りを保持する設計。物理的因果網や視線の実測と区別する。",
      "relevant_local_extrema_or_rest_related_to_purpose": true
    },
    "AttentionControl": {
      "attention_focus": "hierarchical",
      "single_requires_explicit_request": true,
      "gaze_count_quota": "視線数のノルマなし。"
    },
    "Acceptance": {
      "no_unexplained_isolation": true,
      "gaze_paths_match_selected_policy_and_explicit_intent": true,
      "local_peak_consistent_with_world_conditions_and_selected_gaze": true
    }
  },
  "PhenomenonProfileTemplate": {
    "Profiles": {},
    "ApplicabilityGuide": {
      "selections": []
    },
    "Acceptance": {
      "profile_does_not_replace_PH_schema": true,
      "reactive_profile_only_when_applicable": true
    },
    "ProfilePolicy": {
      "secondary_boost_only": true,
      "full_PH_structure_still_required": true,
      "only_selected_profiles_in_design": true
    }
  },
  "GlobalAcceptanceTemplate": {
    "Requirements": {
      "PhenomenonRegistry_required": true,
      "full_PH_structure_required": true,
      "all_8_domains_required": true,
      "ObservationRegistry_required_when_OBS_exist": true,
      "WindCapsule_required": true,
      "Gravity_required": true,
      "world_camera_screen_transform_required": true
    },
    "ValidationResults": {
      "StructuralInspection": {
        "status": "not_run",
        "checks": {
          "required_blocks": "not_run: この保存結果そのものについて外部の構造検査・対象別意味レビューを実施する。ブラウザー内で検査済みと自己認証しない。",
          "rule_contracts": "not_run: この保存結果そのものについて外部の構造検査・対象別意味レビューを実施する。ブラウザー内で検査済みと自己認証しない。",
          "PH_OBS_separation": "not_run: この保存結果そのものについて外部の構造検査・対象別意味レビューを実施する。ブラウザー内で検査済みと自己認証しない。",
          "OctaDomain": "not_run: この保存結果そのものについて外部の構造検査・対象別意味レビューを実施する。ブラウザー内で検査済みと自己認証しない。",
          "scientific_fields": "not_run: この保存結果そのものについて外部の構造検査・対象別意味レビューを実施する。ブラウザー内で検査済みと自己認証しない。",
          "coordinate_gravity_wind": "not_run: この保存結果そのものについて外部の構造検査・対象別意味レビューを実施する。ブラウザー内で検査済みと自己認証しない。",
          "template_consolidation": "not_run: この保存結果そのものについて外部の構造検査・対象別意味レビューを実施する。ブラウザー内で検査済みと自己認証しない。"
        }
      },
      "SemanticReconciliation": {
        "status": "not_run",
        "checks": {
          "DeclaredIntent_preserved": "not_run: この保存結果そのものについて外部の構造検査・対象別意味レビューを実施する。ブラウザー内で検査済みと自己認証しない。",
          "trigger_resolution": "not_run: この保存結果そのものについて外部の構造検査・対象別意味レビューを実施する。ブラウザー内で検査済みと自己認証しない。",
          "exception_resolution": "not_run: この保存結果そのものについて外部の構造検査・対象別意味レビューを実施する。ブラウザー内で検査済みと自己認証しない。",
          "source_binding": "not_run: この保存結果そのものについて外部の構造検査・対象別意味レビューを実施する。ブラウザー内で検査済みと自己認証しない。",
          "scope_and_dependencies": "not_run: この保存結果そのものについて外部の構造検査・対象別意味レビューを実施する。ブラウザー内で検査済みと自己認証しない。",
          "scientific_consistency": "not_run: この保存結果そのものについて外部の構造検査・対象別意味レビューを実施する。ブラウザー内で検査済みと自己認証しない。",
          "aesthetic_principle_application": "not_run: この保存結果そのものについて外部の構造検査・対象別意味レビューを実施する。ブラウザー内で検査済みと自己認証しない。"
        }
      },
      "RenderObservation": {
        "status": "not_run",
        "evidence_source": "none",
        "checks": {
          "visual_causality": "not_run",
          "contour_preservation": "not_run",
          "clipping_crushing": "not_run",
          "chroma_detail": "not_run",
          "contact_projection": "not_run",
          "temporal_continuity": "not_run",
          "cue_discrimination_and_sampling": "not_run",
          "aesthetic_principle_application": "not_run"
        }
      }
    },
    "FinalStatus": {
      "render_status": "NotRun",
      "specification_status": "Warning",
      "failure_reasons": [
        "Warning: 画像生成先は未選択で、生成先への対応付け・送信・出力観察は未実施。保存結果に対する構造検査と対象別意味レビューを別途行う。"
      ]
    },
    "ComparativeEvaluation": {
      "status": "not_run",
      "question": "選択した紋様と投影が保存設計からの出力で保持されるか。",
      "changed_factor": "現在の採用案のみを保存し、候補一覧を含めない。",
      "controlled_conditions": "比較時は同じ解像度・色・alpha・描画方法とし、比較要因以外を保持する。",
      "scene_set": "未生成。この設計に埋め込んだ採用図案のみ。",
      "repetitions_and_order": "比較実験は未実施。",
      "criteria": "採用輪郭、構成数・順序、共通写像、色、透明背景、欠落・追加を出力で照合する。",
      "evidence": "none",
      "result_and_limitations": "自動比較・画像生成・知覚と美的評価は未実施。"
    },
    "OutcomeEvaluation": {
      "intent_alignment": {
        "status": "not_run",
        "evidence_refs": [],
        "rationale": "not_run: 設計文書だけを作成し、出力画像を照合していない。"
      },
      "artistic_effect": {
        "status": "not_run",
        "evidence_refs": [],
        "evaluator_basis": "not_run: 画像なし。",
        "strengths": "未評価。選択された図案の幾何と描画条件を保持する。",
        "limitations": "画像生成と実画像での境界・細部・透明背景の確認、美的効果の評価は未実施。"
      }
    },
    "EvaluatorCalibration": {
      "status": "not_run",
      "pairs": [],
      "evaluator": "未実施。",
      "judgment_purpose": "未実施。",
      "limitations": "画像比較も評価者間較正も実施していない。"
    }
  }
};

export function constructPlanarDesign(pose, sourceSettings) {
  const model = constructPlanarProjection(pose, sourceSettings);
  const design = structuredClone(TEMPLATE);
  const [x0, y0, width, height] = VIEW_BOX;
  const screenPolygons = model.instances.map(instance => ({
    index: instance.index,
    vertices: instance.projectedPolygon.map(([x, y]) => [
      (x - x0) / width,
      (-y - y0) / height,
    ]),
  }));
  design.PhenomenonSystemTemplate.SharedConditions.PlanarMotif = {
    kind: 'projected_display_graphic',
    output_pixels: [1024, 1024],
    screen_domain: [0, 0, 1, 1],
    screen_axis: '左上原点、xは右向き、yは下向き。連続する画面境界座標。',
    fill_srgb: '#147d78',
    fill_alpha: 1,
    background_alpha: 0,
    fill_rule: '各多角形をnonzeroで塗る。ストロークなし。',
    paint_order: 'indexの昇順。各多角形を別々に閉じて塗る。',
    source_settings: structuredClone(model.sourceSettings),
    selected_pose: structuredClone(model.pose),
    source_normalization: structuredClone(model.normalization),
    homography: structuredClone(model.homography),
    projected_svg_view_box: [...VIEW_BOX],
    projected_polygons: model.instances.map(instance => ({
      index: instance.index,
      vertices: structuredClone(instance.projectedPolygon),
    })),
    screen_from_projected: [[1 / width, 0, -x0 / width], [0, -1 / height, -y0 / height], [0, 0, 1]],
    construction_instance_count: screenPolygons.length,
    screen_polygons: screenPolygons,
    scope: '採用した画面頂点を全て埋め込んだ表示図案。仮想投影の作図であり、物理物体・材質・照明・美的効果を主張しない。描画に外部資料の読込みは不要。',
  };
  return design;
}
