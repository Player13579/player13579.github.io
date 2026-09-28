#!/usr/bin/env python3
import json,pathlib
R=pathlib.Path(__file__).resolve().parents[1]
rows=[]
def group(owner,names,file,symbol,design,meaning,test='tools/audit.py',source='基底.md',active=True,reason='このEの対象・媒体・時間・表示条件に適用'):
 for name in names.split():
  rid=owner+'.'+name
  rows.append({'rule_id':rid,'owner':owner,'priority':'canonical_rule_priority','applies_when':reason,'requirement':source+' / '+rid,'exception_to':[],'validation_id':rid+'.acceptance','active':active,'selection_reason':reason,'requirement_to_code':{'file':file,'symbol':symbol,'design_pointer':design},'observable_consequence':meaning,'verification':{'method':test,'structural_result':'pending_local_audit' if active else 'not_applicable','execution_evidence':[],'actual_pixels':'not_run' if active else 'not_applicable','limits':'構造・関数の存在は実GPU画素合格を意味しない。'}})
group('InferenceExpansionPolicy','InferenceExpansionPolicy AttributeAndActionResolutionRule DeclaredIntentRule ExpressionIntentRule','src/contract.mjs','validateReceipt','/InferenceExpansionPolicy','対象情報をallowlist外に置き、E内部以外の追加を避ける。','tests/contracts.test.mjs')
group('FoundationOperationTemplate','FoundationOperationRule RuleContractRule PriorityRule ConflictResolutionRule UniversalNoLabelOnlyRule OutputAndReferenceResolutionRule','tools/build_design.py','B-Expression-2','/FoundationOperationTemplate','B設計は日本語JSON、Eは別成果物、image/video生成を呼ばない。')
group('PlatonicGoodTemplate','PlatonicGoodFoundation BeautyStructuringRule NoSingleBeautyStructureDominance GTBImplementationMapping','shaders/heart.wgsl','chamberBoundary','/PlatonicGoodTemplate','二葉・内縁・心尖の境界と異なる時相を使い、単一比率や光量だけで主形状を作らない。','tests/browser.mjs')
group('PhenomenonSystemTemplate','UniversalPhenomenonRule PIA VisibilityDefinition LinkTypeRule DeepStructureRule StateTransformerRule VisualCausalityRule UniversalMaterialResponseRule PhysicalModelClosureRule ScaleAndSimilarityRule DynamicResponseAndStabilityRule PerceptualEvidenceDiscriminationRule CausalAssessmentAndUncertaintyRule CommonPHFailurePatterns PartitionAndSharedConditionsRule VisualProjectionRule','shaders/heart.wgsl','worldField','/PhenomenonSystemTemplate','PH1膜とPH2供給を独立に保ち、境界・放射・終端差を表示する。8領域の非該当は理由を残す。','tools/audit.py + tests/browser.mjs')
group('PhenomenonSystemTemplate','HubPhenomenonRule','shaders/heart.wgsl','valveCurve','/PhenomenonSystemTemplate','PH1の境界・内縁・遮蔽をハブとする。受け手数のためにBODY等を増やさない。')
group('PEMTemplate','PhenomenonEqualityMode AttentionRuleWithCCM','shaders/heart.wgsl','worldField','/PEMTemplate','上端→芯、心尖→膜の二つの読み順。局所ピークを孤立したglowにしない。','tests/browser.mjs')
group('CoordinateGravityWindTemplate','CoordinateSystemDefinition RelationPriorityRule GlobalVectorFieldRule StateTransitionRule GravityConditionDefinition WindCapsuleOperationRule NaturalVarianceRule VisibleTranslationRule','src/runtime.mjs','projectCaster','/CoordinateGravityWindTemplate','caster投影だけを使用し、H64・局所方向・無流境界を保持。target方位に反応しない。','tests/contracts.test.mjs + tools/audit.py')
group('CoordinateGravityWindTemplate','BodyFloorCameraConsistency ProjectionSafetyRule FloorHubRule','tools/build_design.py','BODY','/CoordinateGravityWindTemplate','床/BODY・俯瞰の新規支持影を作らない。',active=False,reason='このEに身体・床・接触・高低角投影はない。')
group('OctaDomainTemplate','OctaDomainDefinition','tools/build_design.py','domain_reasons','/PhenomenonSystemTemplate/PhenomenonBlock','各PHに8領域を完全展開。Optics以外を名前だけで有効化しない。')
group('AnimeStudiesTemplate','AnimeLayoutRule SilhouetteDesignRule SakugaDensityRule AnimeCompositeRule ImageOriented12PrinciplesSubset','shaders/heart.wgsl','chamberBoundary','/AnimeStudiesTemplate','小寸法のシルエットと内縁を保持し、速度線・smear・BODY演技を追加しない。','tests/browser.mjs')
group('AnimeStudiesTemplate','ImageOrientedAnimeStudiesLayer KeyframeSnapshotRule PoseActingRule SecondaryResponseRule AnticipationAftermathRule LimitedAnimationStillnessRule','tools/build_design.py','AnimeStudiesTemplate','/AnimeStudiesTemplate','動画的Eの検査標本を互換記録するだけ。人体演技を複写しない。',active=False,reason='Image生成・人体演技・外部二次要素を今回の成果物に含めない。')
group('ObservationIntegrationTemplate','ObservationRegistrySeparationRule OperationClasses PostEffectsCommonRule ObservationIntensityBudgetRule CompositeValidationRule SamplingAndReconstructionRule StrictTermDefinitions','shaders/heart.wgsl','fs','/ObservationIntegrationTemplate','OBS1はsource-bound小幅PSF、OBS2は露光肩、OBS3はprivate音。世界内形状をOBSで置換しない。','tools/audit.py + tests/browser.mjs + reports/audio-browser-results.json')
group('ObservationIntegrationTemplate','LensFlareDomainDefinition LensFlareSourceBindingRule LensFlareCauseModel LensFlareEnergyIntensityLaw LensFlareSpectralColorLaw LensFlareObservationCoordinates','tools/build_design.py','LensFlareField','/ObservationIntegrationTemplate/LensFlareField','lens ghostやstreakを追加しない。PSFを実カメラlens flareと呼ばない。',active=False,reason='物理lensflareは選択していない。')
group('ExtremumDesignColorTemplate','PEVRule AESRule DesignScienceRule CCMScope AESEvaluationAxes ColorScienceInAES ArtisticBeautyDefinitions','shaders/heart.wgsl','coreRadiance','/ExtremumDesignColorTemplate','葡萄色膜・珊瑚弁・白金芯を異なる役割へ固定し、形・余白・位相を選ぶ。','tests/browser.mjs')
group('ExtremumDesignColorTemplate','FDSCompatibilityDefinition','tools/build_design.py','FDS','/TermsTemplate','旧FDSは独立モジュールでなくDesignScience+AESの用語に解決する。')
group('ReflectionClosureTemplate','ReflectionVsLensFlareSeparation','tools/build_design.py','ReflectionClosureTemplate','/ReflectionClosureTemplate','放射と観測PSFだけを選び、鏡面反射とlensflareを混同しない。')
group('ReflectionClosureTemplate','ReflectionClosureRule MicrofacetFieldMinimumSet MaterialReflectionMinimums ReflectionLinkRule','tools/build_design.py','ReflectionClosureBlock','/ReflectionClosureTemplate','未選択の肌・金属・濡れ反射を足さない。',active=False,reason='反射・濡れ・肌・布sheenではなく非物質場の放射を選択。')
group('PhenomenonProfileTemplate','PhenomenonProfileRule ProfileDetails ReactionAndPhaseKineticsRule ProfileApplicabilityGuideRule','tools/build_design.py','PhenomenonProfileTemplate','/PhenomenonProfileTemplate','燃焼・反応・水・布・BODYの既存presetを要求せず、空selectionを理由付きで保つ。',active=False,reason='該当物質profileなし。非物質の宣言場を実在化学にしない。')
group('TermsTemplate','Terms','tools/build_design.py','TermsTemplate','/TermsTemplate','PH・OBS・PIA・LDMと要求値/検査結果を区別する。')
group('GlobalAcceptanceTemplate','GlobalAcceptanceCriteria ComparativeEvaluationRule PassWarningFailEvaluation IntentAndArtisticOutcomeRule','tools/audit.py','RenderObservation','/GlobalAcceptanceTemplate','コード検査・実画素・芸術評価・実聴・本編接続を別欄に記録し、未実施をPassへ転記しない。','reports/RESULTS.json')
group('ExtensionActivationTable','ExtensionActivationRule ExpressionIntegrationRule','tools/build_design.py','ExtensionActivationTable','/ExtensionActivationTable','明示VFX/E/PostEffectsと必要なLDM/gradient/timelineだけを起動する。',source='拡張.md')
group('VFX','VFXActivationRule MultilayerArchitectureRule SpatialMorphologyRule MaterialOpticalResponseRule TransportTemporalRule EnvironmentCompositionRule CompositingReadabilityRule','shaders/heart.wgsl','worldField','/VFX','閉膜・弁・脈芯・PSF・肩の機能と順序を分離する。受け手・粒子・端点の追加なし。','tests/browser.mjs',source='拡張.md')
group('VFX','ScreenSignalSurfaceRule','tools/build_design.py','VFX','/VFX','走査線・グリッチ等を追加しない。',source='拡張.md',active=False,reason='screen-signal表現は選択していない。')
group('ECodeImplementation','ExecutableECodeBranchRule','src/runtime.mjs','mountHeartTeleport','/ECodeImplementation','receipt受信だけで実行し、Eソースと画像生成を区別。adapter境界と未検証項目を明記する。','reports/RESULTS.json',source='拡張.md')
group('PostEffects','PostEffectsAutonomousActivationRule SPCARule GlobalLocalRule','shaders/heart.wgsl','rimPSF','/PostEffects','選択操作だけをcaster局所maskに適用、世界内PHを増やさず共有予算を使う。','tests/browser.mjs',source='拡張.md')
group('LuminanceDynamicsModule','LDMActivationRule LDMModeRule','shaders/heart.wgsl','presence','/LuminanceDynamicsModule','膜と芯の異なる連続envelope、reduced motion固定形、全画面明度持ち上げなし。','tests/browser.mjs',source='拡張.md')
group('GradientAnchorPolicy','GradientAnchorRule','shaders/heart.wgsl','ivory','/GradientAnchorPolicy','膜・弁・芯の役割に三色を束縛し、均等虹色帯を作らない。','tests/browser.mjs',source='拡張.md')
group('VideoGenerationPolicy','VideoDurationRule CommonTimelineRule','src/core.mjs','firstReceivedAt','/VideoGenerationPolicy','全層と音が同じ1.8sのwall-clockを使い、receipt後の表示相と先行UIを分ける。','tests/contracts.test.mjs',source='拡張.md')
group('VideoGenerationPolicy','DialogueRule','tools/build_design.py','dialogue','/VideoGenerationPolicy','セリフ・BGMを追加しない。',source='拡張.md',active=False,reason='セリフ未指定。')
for owner,names,reason in [('KeywordExpansion','KeywordExpansionRule F2ScreenMaskRule O9ObservationRule','制作要求に登録キーワードの明示選択なし。'),('CharacterPolicy','CharacterPolicyGeneralRule PresetSelectionRule LNSAINTROle','人体を描画しない。BODYは別所有。'),('BeautifulPoseCapsule','BeautifulPoseCapsuleRule PoseTypeRequirements','姿勢造形をEへ含めない。'),('MagicArchitecture','MagicArchitectureActivationRule MagicGlowRule PresetCatalogSeparationRule AntiFlickerNearDistanceRule','magic IDはwire識別の説明であり魔法/Magic/MagicArchitectureの表現preset指定ではない。')]:
 group(owner,names,'design/00-contract-lock.json',owner,'/ExtensionActivationTable','この拡張を起動せず新しいpresetや形状を自動追加しない。',source='拡張.md',active=False,reason=reason)
for name,file,symbol,meaning,test in [
 ('PrivateReceipt','server/issue-receipt.mjs','sendPrivate','成立確認後、caster.id宛だけに固定type/radius/variant/対象fieldを持つ単一IDを送る。','tests/contracts.test.mjs'),
 ('TargetDataNoninterference','src/contract.mjs','projection','対象情報を描画・定位・音像・画面外判定へ渡さない。','tests/contracts.test.mjs'),
 ('CanonicalAuthorityOnly','src/core.mjs','verifyEnvelope','UI flag・姿勢だけでは起動しない。実transport検証を必須にする。','tests/contracts.test.mjs'),
 ('ScopeOwnership','src/contract.mjs','sameScope','viewer/self/owner/room/sessionを受信時と全寿命で確認。','tests/contracts.test.mjs'),
 ('WallClockLifetime','src/core.mjs','deadline','正確に1800ms、再送・pause・認証待ちで延長しない。','tests/contracts.test.mjs'),
 ('NoReplay','src/contract.mjs','ReceiptLedger','同一IDを再描画・再発音しない。容量満了はfail-closed。','tests/contracts.test.mjs'),
 ('Visibility','src/runtime.mjs','getVisibility','caster不可視・画面外・遮蔽・hiddenでは表示と音を終端。','tests/contracts.test.mjs'),
 ('ReducedMotion','shaders/heart.wgsl','reduced','reduced motionでは拡縮と弁上移動を固定し、輝度相だけを残す。','tests/browser.mjs'),
 ('OneShotSFX','src/sfx.mjs','playOnce','一つの原因IDにつき一つのmono sourceだけ。定位情報なし。','tests/audio.test.mjs'),
 ('VerifyMute','src/sfx.mjs','unlockFromGesture','verifyではAudioContextとsourceを作らない。','reports/audio-browser-results.json'),
 ('GestureAudio','src/sfx.mjs','unlockFromGesture','trusted入力+user activation後の新IDだけを鳴らす。過去IDを鳴らさない。','reports/audio-browser-results.json'),
 ('SeparateBodyAndResult','server/issue-receipt.mjs','receipt','target移動・BODY変更・kill/death音を所有しない。','tests/contracts.test.mjs'),
 ('ResourceRelease','src/runtime.mjs','dispose','購読・rAF・GPU buffer/context/device・audio node/contextを解放。ledgerはホスト所有で保持。','tests/audio.test.mjs + tests/gpu-api.test.mjs'),
 ('EvidenceAndManifest','tools/manifest.py','sha256','実施/未実施と全ファイルのSHA256をZIPへ格納する。','tools/audit.py')]:
 group('UserContract',name,file,symbol,'/ECodeImplementation',meaning,test,source='ユーザーの今回の固定権威契約')
# priorityは本来の正本値を参照し、この補助表で新たな優先順位を発明しない。
for row in rows:
 owner=row['owner']; name=row['rule_id'].split('.',1)[1]; tier='HARD_LOCK'
 if owner in ['FoundationOperationTemplate','ExtensionActivationTable','UserContract']:tier='FOUNDATION_LOCK'
 absolute={'InferenceExpansionPolicy','NoSingleBeautyStructureDominance','GTBImplementationMapping','UniversalPhenomenonRule','StateTransformerRule','VisualCausalityRule','PhenomenonEqualityMode','StateTransitionRule','VisibleTranslationRule','OctaDomainDefinition','ImageOrientedAnimeStudiesLayer','KeyframeSnapshotRule','PostEffectsCommonRule','LensFlareSourceBindingRule','LensFlareEnergyIntensityLaw','ReflectionVsLensFlareSeparation','ReflectionClosureRule','GlobalAcceptanceCriteria','MaterialOpticalResponseRule','PostEffectsAutonomousActivationRule','SPCARule','LDMActivationRule','GradientAnchorRule','VideoDurationRule','F2ScreenMaskRule','CharacterPolicyGeneralRule','PresetSelectionRule','LNSAINTROle','BeautifulPoseCapsuleRule','MagicArchitectureActivationRule','MagicGlowRule'}
 foundation={'AttributeAndActionResolutionRule','DeclaredIntentRule','LinkTypeRule','PartitionAndSharedConditionsRule','WindCapsuleOperationRule','ObservationRegistrySeparationRule','ObservationIntensityBudgetRule','MultilayerArchitectureRule','CommonTimelineRule','KeywordExpansionRule','PresetCatalogSeparationRule'}
 platonic={'ExpressionIntentRule','PlatonicGoodFoundation','BeautyStructuringRule','VisualProjectionRule'}
 if name in absolute:tier='ABSOLUTE_LOCK'
 if name in foundation:tier='FOUNDATION_LOCK'
 if name in platonic:tier='PLATONIC_GOOD_LOCK'
 row['priority']=tier
 row['source_kind']='user_contract' if owner=='UserContract' else 'inherited_B_rule'

(R/'design/rule-traceability.json').write_text(json.dumps({'source_revision':json.loads((R/'design/00-contract-lock.json').read_text())['source_revision'],'scope':'canonical規則を参照する実装対応表。正本テキストの代替でも実GPU観察結果でもない。','rules':rows},ensure_ascii=False,indent=2)+'\n')
print('rule rows',len(rows),'active',sum(r['active'] for r in rows))
