"""規則の正本参照、実装箇所、期待帰結、検査の限界を一行ずつ対応付ける。"""
import json, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
rows=[]
def add(owner,names,doc,logic,implementation,tests,condition='Eの設計/実装で適用',active=True,priority='HARD_LOCK'):
 for name in names.split():
  rid=f'{owner}.{name}'
  rows.append({'rule_id':rid,'owner':owner,'priority':priority,'applies_when':condition,'requirement':f'{doc}の{rid}本文を正本とする。','exception_to':[],
   'validation_id':rid+'.acceptance','application':'applicable' if active else 'not_applicable','design_logic_or_nonapplicability':logic,
   'implementation':[{'path':p,'symbol_or_section':s} for p,s in implementation] if active else [],
   'observable_consequence':logic if active else '非起動。規則数を満たすための要素を生成しない。',
   'verification_method':tests if active else 'B設計の起動表と描画範囲を静的照合する。',
   'static_status':'coverage_checked' if active else 'not_applicable','runtime_visual_status':'not_run','runtime_audio_status':'not_run',
   'evidence_refs':['verification/static-report.json','verification/node-tests.tap'] if active else ['design/A.B-Expression-2.json','design/B.B-Expression-2.json'],
   'limitation':'対応箇所と静的/数値テストは実GPU画素・聴感・実ゲーム因果の合格を意味しない。'})
C=[('src/runtime/contracts.mjs','validateReceipt / TARGETS / fingerprint'),('src/runtime/controller.mjs','FacilityController.receive / sampleFrame')]
G=[('src/gpu/renderer.mjs','prepare / encodeToPass / render'),('src/runtime/projection.mjs','project / projectEvent')]
D=[('design/A.B-Expression-2.json','PhenomenonSystemTemplate.PhenomenonBlock'),('design/B.B-Expression-2.json','PhenomenonSystemTemplate.PhenomenonBlock')]
S=[('src/effects/reactor/reactor.wgsl','fs / path / quintic'),('src/effects/recycling/recycling.wgsl','fs / boxSDF / easeCos')]
T=[('src/effects/reactor/state.mjs','reactorState'),('src/effects/recycling/state.mjs','recyclingState'),('src/runtime/controller.mjs','startMono / sampleFrame')]
O=S+[('src/gpu/composite.wgsl','fs / encodeSRGB')]
AU=[('src/runtime/audio.mjs','FacilityAudio.playOnce / normalizePolyphony'),('src/effects/reactor/sound.mjs','synthesizeReactor'),('src/effects/recycling/sound.mjs','synthesizeRecycling')]
V=[('scripts/verify.mjs','runVerification'),('tests/structure.test.mjs','PH/OBS / domains / links / activation'),('verification/browser-check.json','実行制限とnot_run')]
add('InferenceExpansionPolicy','InferenceExpansionPolicy','基底.md','源/受け手/利益/寿命を固定し、粒子・追加物体・背景・人体・presetを追加しない。源/伝達/受領の形は既存Eの具体化として登録する。',C+D,'tests/receipt.test.mjs と構造検査。対象7項目の棄却とoriginの理由を照合。',priority='ABSOLUTE_LOCK')
add('InferenceExpansionPolicy','AttributeAndActionResolutionRule DeclaredIntentRule','基底.md','独立した対象追加と形状/位相の具体化を分ける。metadataは表示用で、クライアント利益APIが存在しない。',C+D,'receipt invariants / forbidden API scan。',priority='FOUNDATION_LOCK')
add('InferenceExpansionPolicy','ExpressionIntentRule','基底.md','H64の原因→媒体→受け手→結果、A/B独立、正確な原因単位の一回性を目的として保持する。画素未観察を成功と言わない。',D+V,'ExpressionIntentと検査棄却条件の対応を照合。',priority='PLATONIC_GOOD_LOCK')
add('FoundationOperationTemplate','FoundationOperationRule RuleContractRule PriorityRule ConflictResolutionRule UniversalNoLabelOnlyRule OutputAndReferenceResolutionRule','基底.md','B設計JSONはB-Expression-2/Video/design_only。Eソースは別成果物。PH/OBSの機構と限界、参照、3層検査を日本語で記録する。',D+V,'JSON必須構造、全参照、rule_id一意性、Eコードの非画像生成を検査。',priority='FOUNDATION_LOCK')
add('PlatonicGoodTemplate','PlatonicGoodFoundation BeautyStructuringRule','基底.md','Goodは意図保持、Truthは同一座標/原因時計、Beautyは境界と時間差。各PHは対比/時間相の2軸にそれぞれ2つの既存証拠を持つ。',D+S,'GTBと2軸×2証拠の構造検査。実芸術評価は未実施。',priority='PLATONIC_GOOD_LOCK')
add('PlatonicGoodTemplate','NoSingleBeautyStructureDominance GTBImplementationMapping','基底.md','比率の万能則を使わず、各PHをGood/Truth/Beautyへ接続する。',D+G,'各PHのGTB接続とH64の相対寸法を検査。',priority='ABSOLUTE_LOCK')
add('PhenomenonSystemTemplate','UniversalPhenomenonRule StateTransformerRule VisualCausalityRule','基底.md','源応答・輸送・受領をPH1/2/3へ分け、全PHに完全構造と8領域を保持する。静止画のbefore/afterだけでなく実時間で異なる包絡を評価する。',D+T+S,'structure.test + motion.test全寿命サンプル。',priority='ABSOLUTE_LOCK')
add('PhenomenonSystemTemplate','PIA VisibilityDefinition DeepStructureRule','基底.md','PH登録の根拠は境界と応答。源/内部/外縁の2つ以上の直接手掛かりを設計し、候補カタログを出さない。',D+S,'registryとidentity一致、完全構造、Evidenceを検査。')
add('PhenomenonSystemTemplate','LinkTypeRule PartitionAndSharedConditionsRule','基底.md','PHの提示因果、OBSの入力依存、視線経路を別配列にする。観測依存は入力を先に評価するDAG。層とPHを一対一に強制しない。',D+G,'全リンク端点とOBS依存の非循環検査。',priority='FOUNDATION_LOCK')
add('PhenomenonSystemTemplate','UniversalMaterialResponseRule HubPhenomenonRule','基底.md','同じ源でも境界・内部・受領位置による差を持つ。存在しない受け手/風/熱変形を3チャネルのために追加しない。',D+S,'局所パラメータと受け手欠落の試験。hubは既存PH1→PH2→PH3に限定。')
add('PhenomenonSystemTemplate','PhysicalModelClosureRule ScaleAndSimilarityRule','基底.md','提示fieldの非物質性を明示し、質量/運動量/電荷の非該当理由と有限な表示供給を分ける。H、距離/H、age/2200を使い、実測mや物性値を捏造しない。',D+G,'全PHの収支4項目・ScaleRegime・H64投影を検査。物理実証ではない。')
add('PhenomenonSystemTemplate','DynamicResponseAndStabilityRule','基底.md','Aの5次窓とBのcosine/区画時差を分離する。単調時計と補間の有限範囲で位相を閉じる。',T+S,'motion.testの全寿命/逆行時計/遅延/終端。')
add('PhenomenonSystemTemplate','PerceptualEvidenceDiscriminationRule CausalAssessmentAndUncertaintyRule','基底.md','装飾/攻撃/利益処理の誤認と識別限界を示す。共起やコードの存在を因果やH64可読性の証明としない。',D+V,'hypothesis_onlyと証拠空欄、RenderObservation not_runを検査。')
add('PhenomenonSystemTemplate','CommonPHFailurePatterns','基底.md','label-only、主形のglow依存、後付けの受け手、before/afterのみ、観測と世界の混同を棄却条件に置く。',D+V,'禁止API/必須構造/棄却条件を静的検査し、画素合格を作らない。')
add('PhenomenonSystemTemplate','VisualProjectionRule','基底.md','世界の提示状態と画面手掛かりを区別。省略/誇張の許可scopeは空、読み取り限界は隠さない。',D+S,'VisualProjectionの全fieldと明示意図参照を検査。',priority='PLATONIC_GOOD_LOCK')
add('PEMTemplate','PhenomenonEqualityMode','基底.md','focus_phenomenon=none、主役を消さず源と受け手の関係を残す。架空の物理feedbackを作らない。',D+T,'因果linksとfocus値の検査。',priority='ABSOLUTE_LOCK')
add('PEMTemplate','AttentionRuleWithCCM','基底.md','進行端の追跡と、外側輪郭/余白・区画の読みの二つを設計する。',D+S,'PEMとCCMのhierarchicalを照合。実視線観察はnot_run。')
add('CoordinateGravityWindTemplate','CoordinateSystemDefinition RelationPriorityRule GlobalVectorFieldRule','基底.md','2D gameのx右/y下をcanonicalのx右/y上へ明示写像し、投影では単位変換係数を相殺する。源固定と実actor相対位置を優先。',G+D,'projectEventのH64/画面外/再入場テスト。')
add('CoordinateGravityWindTemplate','StateTransitionRule VisibleTranslationRule','基底.md','数値境界を針/開口、帯の前後端、3区画の着座へ翻訳。描画から経済状態を変えない。',T+S,'補間有限性、位相順、寿命のテスト。',priority='ABSOLUTE_LOCK')
add('CoordinateGravityWindTemplate','GravityConditionDefinition NaturalVarianceRule','基底.md','既存世界の重力を測定したとせず、質量を持たないfieldに落下や風の証拠を強制しない。自然物のランダム揺れを追加しない。',D+S,'Gravity/medium非該当理由とnoise/乱数なしを検査。')
add('CoordinateGravityWindTemplate','WindCapsuleOperationRule','基底.md','媒体条件のブロックを必ず保持。other=非物質game fieldとし空気・真空をゲーム世界の事実として捏造しない。',D,'WindCapsule/Gravityの存在と非該当理由を検査。',priority='FOUNDATION_LOCK')
add('CoordinateGravityWindTemplate','BodyFloorCameraConsistency ProjectionSafetyRule FloorHubRule','基底.md','人体・支持床・俯瞰/煽りを追加していない。Eは既存actorの位置へ束縛されるだけ。',[], '',condition='身体/床/該当カメラの幾何を本Eで作画するとき',active=False)
add('OctaDomainTemplate','OctaDomainDefinition','基底.md','各PHの8領域を保持し、非該当はrole=latentと理由を記載。学問名の存在だけを科学的成立としない。',D,'8領域、role、非該当理由を機械検査。',priority='ABSOLUTE_LOCK')
add('AnimeStudiesTemplate','ImageOrientedAnimeStudiesLayer KeyframeSnapshotRule','基底.md','本Eの正式設計はVideo。単一Image snapshotの追加生成はしない。',[], '',condition='mode=Imageの設計',active=False,priority='ABSOLUTE_LOCK')
add('AnimeStudiesTemplate','PoseActingRule SecondaryResponseRule AnticipationAftermathRule LimitedAnimationStillnessRule','基底.md','人体・髪・衣服・床・物体の姿勢を本Eで作画しない。未指定の二次動作を足さない。',[], '',condition='対応する人物/二次要素の作画が存在する場合',active=False)
add('AnimeStudiesTemplate','AnimeLayoutRule SilhouetteDesignRule SakugaDensityRule AnimeCompositeRule ImageOriented12PrinciplesSubset','基底.md','局所Eのstaging、連続シルエット、密度/余白、全寿命を互換適用。速度線/残像/Cartoon変形を加えない。',S+G+D,'world境界とOBS順序の静的検査。H64実像はnot_run。')
add('ObservationIntegrationTemplate','ObservationRegistrySeparationRule ObservationIntensityBudgetRule','基底.md','OBS1有限PSF、OBS2輪郭、OBS3表示、OBS4音をPHと分離する。画像観測の予算は一つ、音の混合予算はSFXバスへ分ける。',D+O+AU,'registry、input/dependencies、共有budget参照を検査。',priority='FOUNDATION_LOCK')
add('ObservationIntegrationTemplate','OperationClasses CompositeValidationRule SamplingAndReconstructionRule StrictTermDefinitions','基底.md','native HDR内のfieldと観測を分けて合成。最終sRGB、H64の境界幅、変動cadenceの限界を明示。技術提出と画素検査を区別。',O+G+V,'renderer source scan / JSON sampling / not_run状態を検査。')
add('ObservationIntegrationTemplate','PostEffectsCommonRule','基底.md','glowは既存源の距離/包絡/色へ従属し、主形はglowを無効化してもshader内に存在する。',O+D,'glow toggleの経路と源への依存を静的検査。実際の可読性は未観察。',priority='ABSOLUTE_LOCK')
add('ObservationIntegrationTemplate','LensFlareDomainDefinition LensFlareCauseModel LensFlareSpectralColorLaw LensFlareObservationCoordinates','基底.md','物理レンズの面/開口経路が宣言されていない。PSFのにじみをghost/flareと呼ばない。',[], '',condition='物理的lens flareを選んだ場合',active=False)
add('ObservationIntegrationTemplate','LensFlareSourceBindingRule LensFlareEnergyIntensityLaw','基底.md','ghost/veil/streakの物理レンズ応答を起動しない。sourceなしflareを新設しない。',[], '',condition='物理的lens flareが可視の場合',active=False,priority='ABSOLUTE_LOCK')
add('ExtremumDesignColorTemplate','PEVRule AESRule DesignScienceRule CCMScope AESEvaluationAxes ColorScienceInAES ArtisticBeautyDefinitions','基底.md','採用済みの源/輸送/受領状態列を先に定め、Aは開いた曲線、Bは圧縮と矩形の3区画を選択する。色は機能境界へ束縛する。',D+S+T,'PEVの採用済みstate、CCM、独立ソースと位相構造を検査。万能な美の得点は作らない。')
add('ExtremumDesignColorTemplate','FDSCompatibilityDefinition','基底.md','旧FDS呼出しはない。互換用Termsだけ保持する。',[], '',condition='旧FDS参照が入力された場合',active=False)
add('ReflectionClosureTemplate','ReflectionVsLensFlareSeparation ReflectionClosureRule','基底.md','明るい縁は反射ではなくfield放射。元施設の金属/濡れ/光沢を推測しない。空のClosureと理由を保持する。',[], '',condition='可読な物理反射/材質光沢を描く場合',active=False,priority='ABSOLUTE_LOCK')
add('ReflectionClosureTemplate','MicrofacetFieldMinimumSet MaterialReflectionMinimums ReflectionLinkRule','基底.md','物理的反射・fresnel・表面状態変化を選択していない。数を満たすために架空反射や帰還を足さない。',[], '',condition='ReflectionClosure適用の場合',active=False)
add('PhenomenonProfileTemplate','PhenomenonProfileRule ProfileDetails ReactionAndPhaseKineticsRule ProfileApplicabilityGuideRule','基底.md','Water/Fire/Cloth/Metal/反応などの実物質profileは選択していない。recyclingUnitという名称だけから破片/煙/反応を作らない。',[], '',condition='一致する既存物理機構/profileを使用するとき',active=False)
add('TermsTemplate','Terms','基底.md','PH、OBS、PEV、AES、E実装とValidationResultsの意味を区別する。',D,'terms blockと用語参照の確認。')
add('GlobalAcceptanceTemplate','GlobalAcceptanceCriteria','基底.md','StructuralInspection、SemanticReconciliation、RenderObservationを分離し、画像未観察はnot_run。',V+D,'project-specific static checkerと実行記録を出力。正本同梱検証器を実行したとは主張しない。',priority='ABSOLUTE_LOCK')
add('GlobalAcceptanceTemplate','ComparativeEvaluationRule PassWarningFailEvaluation IntentAndArtisticOutcomeRule','基底.md','48条件の比較は計画、数値ロジックテストは画素比較ではない。H64・音・芸術的成果は未観察として残す。',V+D,'OutcomeEvaluation not_run / render_status NotRun / 実証拠なしのPass禁止を検査。')
add('KeywordExpansion','KeywordExpansionRule','拡張.md','登録キーワードは今回明示されていない。仕様本文中の例を実行指示にしない。',[], '',condition='登録キーワードの制作指示としての明示',active=False,priority='FOUNDATION_LOCK')
add('KeywordExpansion','F2ScreenMaskRule','拡張.md','f2未指定なので上下maskを追加しない。',[], '',condition='f2明示',active=False,priority='ABSOLUTE_LOCK')
add('KeywordExpansion','O9ObservationRule','拡張.md','プリズム加工未指定。源の色域を画面プリズムで増やさない。',[], '',condition='o9明示',active=False)
add('ExtensionActivationTable','ExtensionActivationRule ExpressionIntegrationRule','拡張.md','VFX/E/PostEffects属性具体化/LDM/Video設計だけを起動。Eは画像生成命令ではない。',D+V,'拡張表の有効block集合と実ソースを照合。',priority='FOUNDATION_LOCK')
add('CharacterPolicy','CharacterPolicyGeneralRule PresetSelectionRule LNSAINTROle','拡張.md','既存playerIdは人間という断定ではない。Eは身体を作画しないため人物presetを起動しない。',[], '',condition='本Eで人間を作画する場合/明示preset',active=False,priority='ABSOLUTE_LOCK')
add('BeautifulPoseCapsule','BeautifulPoseCapsuleRule','拡張.md','Eの生成範囲に身体なし。ホストの人体姿勢を変更せず、位置サンプルだけ参照する。',[], '',condition='本Eでキャラクター身体の作画を設計する場合',active=False,priority='ABSOLUTE_LOCK')
add('BeautifulPoseCapsule','PoseTypeRequirements','拡張.md','人体/支持/推進機構を仮定しない。previewのH64矩形は人体ではなく検査proxy。',[], '',condition='BeautifulPoseCapsule起動',active=False)
add('VFX','VFXActivationRule SpatialMorphologyRule TransportTemporalRule EnvironmentCompositionRule CompositingReadabilityRule','拡張.md','A/Bとも源・輸送・受領の異なる役割/境界/時間を個別に実装。画面外では可視GPU枠を消費せず、actor位置を推測しない。',S+T+G,'motion matrix / missing anchor / offscreen / source scan。実画素評価はnot_run。')
add('VFX','MultilayerArchitectureRule','拡張.md','world層L1/2/3はPHだけ、観測層L4はOBSだけ。依存は観測層→入力層、物理提示因果は源→受け手で方向を分ける。',D+S,'layersのdomain/registry制約、interlayer端点と対応リンクを検査。',priority='FOUNDATION_LOCK')
add('VFX','MaterialOpticalResponseRule','拡張.md','coverage・不透明度・密度・HDR放射を分離する。素材名やglowで主形を代替しない。源のピークを機械的に弱めず表示の肩へ渡す。',S+O,'shader入力と別変数/合成順の静的確認、glow offの手動検査計画。',priority='ABSOLUTE_LOCK')
add('VFX','ScreenSignalSurfaceRule','拡張.md','scanline/画素化/符号化ノイズを選択していない。3区画は伝送ノイズではなく既存credits+3の受領表現。',[], '',condition='screen/sensor/encoding appearanceを選択したとき',active=False)
add('ECodeImplementation','ExecutableECodeBranchRule','拡張.md','完全なESM/WGSL/PCM合成・receipt gate・native harnessを独立成果物として同梱。B commit/blobを固定し、旧E内容は参照せずサイトを変更しない。',C+S+AU+G+V,'syntax / declarations / static B mapping / SHA256。shader compile、実GPU、画素、聴感、実ゲームは未実行を明示。')
add('PostEffects','PostEffectsAutonomousActivationRule SPCARule','拡張.md','ordinary_posteffects=false、選択した源応答/輪郭/表示だけをOBSへ登録。source条件と時間を結び、双方向feedbackを捏造しない。',D+O,'exact_selected_operationsとOBS参照、source-bound条件を検査。',priority='ABSOLUTE_LOCK')
add('PostEffects','GlobalLocalRule','拡張.md','局所の源応答/輪郭と、隔離canvasまたはホストの承認済みHDR表示を分ける。同一作用をPHとOBSに重複登録しない。',D+O+G,'OBS scope/dependencyとencodeToPass/renderの契約を確認。')
add('LuminanceDynamicsModule','LDMActivationRule','拡張.md','VFX明示により起動。grain等を起動理由にしない。',D+S,'trigger explicit_VFXとLDM blockの存在を検査。',priority='ABSOLUTE_LOCK')
add('LuminanceDynamicsModule','LDMModeRule','拡張.md','Videoの源/輸送/受領に別の輝度包絡を持つ。ランダム点滅/黒背景指定/露光積分は追加せず、H64/実cadenceの限界を記録。',T+S+D,'時間関数の数値検査、α無効、サンプリング参照を確認。')
add('MagicArchitecture','MagicArchitectureActivationRule MagicGlowRule','拡張.md','魔法/Magic/MagicArchitectureは今回の制作題材として明示されていない。ゲームfieldを魔法presetへ置換しない。',[], '',condition='MagicArchitectureの明示起動',active=False,priority='ABSOLUTE_LOCK')
add('MagicArchitecture','PresetCatalogSeparationRule','拡張.md','魔法カタログを出力せず、紋章・輪・粒子を足さない。',[], '',condition='MagicArchitecture起動',active=False,priority='FOUNDATION_LOCK')
add('MagicArchitecture','AntiFlickerNearDistanceRule','拡張.md','MagicArchitectureのSCALE/DISTANCE条件を推測しない。',[], '',condition='MagicArchitectureかつLarge/Near',active=False)
add('GradientAnchorPolicy','GradientAnchorRule','拡張.md','色域は源/内部/受領の異なる機能に離散的に割り当てる。独立した色相補間/プリズム/虹色の勾配は選ばない。',[], '',condition='独立したhue_gradient設計を採用したとき',active=False,priority='ABSOLUTE_LOCK')
add('VideoGenerationPolicy','VideoDurationRule','拡張.md','Video設計のDuration正本は2.2秒。利益20秒/cooldownは別metadata。実映像生成を実行しない。',D+T,'2.2s一致とbenefit/cooldown独立性の検査。',priority='ABSOLUTE_LOCK')
add('VideoGenerationPolicy','CommonTimelineRule','拡張.md','PH/OBS/camera/audioを一つのcapturedTime由来時計へ関連付ける。遅延では途中参加、SFXはoffsetで一回。',C+T+AU,'delayed / future / expired / audio offsetテスト。',priority='FOUNDATION_LOCK')
add('VideoGenerationPolicy','DialogueRule','拡張.md','セリフ/BGMなし。音声内容・演出音響を仕様文から自動追加しない。',[], '',condition='セリフが明示された場合',active=False)
# 実装箇所を存在するソース行へ解決。コメントだけを対応の根拠にしない。
for row in rows:
 for imp in row['implementation']:
  p=ROOT/imp['path'];text=p.read_text() if p.exists() else ''
  symbol=imp['symbol_or_section'].split(' / ')[0]
  hits=[i+1 for i,line in enumerate(text.splitlines()) if symbol in line]
  imp['line_hint']=hits[0] if hits else 1
  imp['file_present_at_mapping']=p.exists()
assert len({r['rule_id'] for r in rows})==len(rows)
report={'mapping_scope':'この枝で受領したBのrule_id。正本本文を変更するものではない。','evidence_policy':'coverage_checkedは対応箇所を調べた意味。実画素/実聴感のpassではない。','total_rules':len(rows),'applicable_rules':sum(r['application']=='applicable' for r in rows),'rules':rows}
(ROOT/'docs/B-rule-mapping.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
lines=['# B規則対応表','',f"全{len(rows)}規則、適用{report['applicable_rules']}規則。静的対応確認と画素/聴感の品質判断は分離します。",'',
 '正本は会話で受領した基底・拡張です。JSON版はrule_id、条件、正本参照、コード、期待帰結、検証方法、実観察状態を保持します。',
 '非起動は適用範囲によるもので、知らないゲーム全体の人体・重力・物性を断定したものではありません。','']
for owner in dict.fromkeys(r['owner'] for r in rows):
 lines+=['## '+owner,'']
 for r in (x for x in rows if x['owner']==owner):
  loc=' / '.join(f"`{x['path']}:{x['line_hint']}` ({x['symbol_or_section']})" for x in r['implementation'])
  lines += [f"### `{r['rule_id']}`",'',f"状態: **{r['application']}**。{r['design_logic_or_nonapplicability']}",'']
  if loc:lines += ['実装: '+loc,'','検査: '+r['verification_method'],'','画素/聴感: **not_run**。数値/構造検査を実画素の品質合格にしません。','']
(ROOT/'docs/B-rule-mapping.md').write_text('\n'.join(lines)+'\n')
print(f"mapped {len(rows)} rules ({report['applicable_rules']} applicable)")
