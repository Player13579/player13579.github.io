"""要件参照→実装アンカー→観測対象→検査記録を対応付ける。GPU合格を生成しない。"""
import json
from pathlib import Path
R=Path(__file__).resolve().parent.parent
rows=[]
B='design/mana-r03.B-Expression-2.json'
F='shaders/field-body.wgsl'
S='src/field.mjs'
P='src/shape-data.mjs'
# rule_idを元本文のまま保持。requirementは正本本文の参照であり、新しい規則の複製ではない。
def row(owner,name,path,needle,observable,test,scope='visual'):
    text=(R/path).read_text(encoding='utf-8')
    line=next((i+1 for i,s in enumerate(text.splitlines())if needle in s),None)
    if line is None:raise ValueError(f'anchor missing: {path} / {needle}')
    rows.append({'rule_id':owner+'.'+name,'requirement_ref':owner+'.'+name,'implementation':[{'path':path,'anchor':needle,'line':line}],
      'observable_consequence':observable,'verification':{'method':test,'static_evidence':'evidence/design-structure.json','execution_evidence':'evidence/node-tests.tap'if scope=='contract'else 'evidence/cpu-field.json','gpu_observation':'not_run','listening':'not_run'if scope=='audio'else 'not_applicable','quality_observation':'not_run'},
      'limits':'静的参照・CPU式・mockは実GPUの可視性や無説明読解の代用ではない。'})
# 選択・出力・不確実性
for n,anchor,obs in [
 ('InferenceExpansionPolicy','"inferred_support_elements"','新規の人物・物体・記号を足さず、E内の面と時間を具体化する。'),
 ('AttributeAndActionResolutionRule','"origin": "attribute_resolved"','既存Mana Eという内容の同一性を保ち、内部を新設計する。'),
 ('DeclaredIntentRule','"DeclaredIntent"','人数0の試験表示、現在受け手、イベント除外、文字なしを保持する。'),
 ('ExpressionIntentRule','"ExpressionIntent"','源・連続搬送・受領変化の無説明読解を品質目的として残す。')]:row('InferenceExpansionPolicy',n,B,anchor,obs,'B構造・DeclaredIntent照合。docs/ACCEPTANCE.mdで人手検査。')
for n,anchor,obs in [
 ('FoundationOperationRule','"FoundationOperationTemplate"','日本語B設計を別成果物にし、runtime codeと分ける。'),
 ('RuleContractRule','"RuleContract"','正本rule_idから実在する関数・設計fieldを辿れる。'),
 ('PriorityRule','"same_priority_resolution"','主動作や人数を低位の美的既定へ置換しない。'),
 ('ConflictResolutionRule','"SemanticReconciliation"','未検証の身体位置・光輸送近似を黙って実証済みにしない。'),
 ('UniversalNoLabelOnlyRule','"PhysicalModel"','形・入力・時間・帰結・失敗像をfieldに記す。'),
 ('OutputAndReferenceResolutionRule','"operation": "design_only"','B-Expression-2 Video設計と実行Eを区別。画像生成権限なし。')]:row('FoundationOperationTemplate',n,B,anchor,obs,'tools/check-design.mjsのブロック/参照検査。')
for n,a,o in [('PlatonicGoodFoundation','"GTBConnections"','全体の意図/座標/知覚を同じ現象へ接続。'),('BeautyStructuringRule','"BeautyStructureApplication"','既存の面・対比・空き/充填を複数軸の証拠にする。'),('NoSingleBeautyStructureDominance','"ShapeOrder"','特定の比率を万能な美として採点しない。'),('GTBImplementationMapping','"GTBConnections"','各PHのGood/Truth/Beautyを具体的に保持。')]:row('PlatonicGoodTemplate',n,B,a,o,'構造/選択根拠を照合。美的成功は実画像が必要。')
for n,a,o in [
 ('UniversalPhenomenonRule','"PhenomenonRegistry"','供給・輸送・積分・背景応答を4つの独立状態として登録。'),
 ('PIA','"SelectionLifecycle"','属性具体化と採用補完、PH登録を混同しない。'),
 ('VisibilityDefinition','"direct_evidence"','各可視PHに境界と状態変化など複数の手掛かりを記す。'),
 ('LinkTypeRule','"CausalityLinks"','worldの作用とOBS依存、視線上の関係を区別する。'),
 ('DeepStructureRule','"DeepStructure"','源の芯/構造/外縁、搬送断面、受領の容量境界を分ける。'),
 ('StateTransformerRule','"StateDynamics"','前後だけでなく輸送遅れ・積分・満量・終了を記す。'),
 ('VisualCausalityRule','"retained_cues"','減る源、進む前端、増える面積を可視帰結の候補にする。'),
 ('UniversalMaterialResponseRule','"constitutive_response"','同じ入力でも供給・搬送・受領・背景で応答を変える。'),
 ('HubPhenomenonRule','"SurroundingChanges"','既存の輸送/受領/背景へだけ作用させ、架空の受け手を足さない。'),
 ('PhysicalModelClosureRule','"balance_conditions"','表示用の量収支と宣言場の限界、背景光の入力を区別する。'),
 ('ScaleAndSimilarityRule','"ScaleRegime"','world unitsとH64画素を区別し、太い断面を主証拠にする。'),
 ('DynamicResponseAndStabilityRule','"response_timescale"','0.18phaseの輸送遅れに対し受光は即時応答。'),
 ('PerceptualEvidenceDiscriminationRule','"confusable_alternative"','器/支柱/単独アイコンという別解釈と未観察の限界を明記。'),
 ('CausalAssessmentAndUncertaintyRule','"check_status": "hypothesis_only"','旧版の見えをパラメータ原因へ断定せず、新式も実物理実証としない。'),
 ('CommonPHFailurePatterns','"FailurePatterns"','孤立図形・全面glow・技術結果の品質転記を失敗として残す。'),
 ('PartitionAndSharedConditionsRule','"partition_reason"','PH分割は層の個数ではなく独立状態/境界に対応させる。'),
 ('VisualProjectionRule','"VisualProjection"','世界状態と描画の選択を分け、未許可の省略/誇張scopeは空。')]:row('PhenomenonSystemTemplate',n,B,a,o,'tools/check-design.mjs、tests/field.test.mjs、無説明全寿命は手動。')
for n,a,o in [('PhenomenonEqualityMode','"focus_phenomenon": "none"','主効果を消さず、源・搬送・受領を一つの関係にする。'),('AttentionRuleWithCCM','"gaze_path_A"','源から受領への順と空き/充填から源へ戻る確認の順を区別。')]:row('PEMTemplate',n,B,a,o,'設計の視線記述。実視線の計測は未実施。')
for n,a,o in [('CoordinateSystemDefinition','"WorldCoordinates"','B右手系とgameのy下向きを明示して変換。'),('RelationPriorityRule','"spatial_relation"','足元が下、受領が上、搬送が間という関係を保つ。'),('GlobalVectorFieldRule','"VectorField"','上向きの前端と周辺光の方向/減衰を分ける。'),('StateTransitionRule','"phase_relation"','共通時計に局所遅れ/収束を接続。'),('GravityConditionDefinition','"Gravity"','静穏媒体と重力の拘束を保持し、空気流/落下粒子を追加しない。'),('WindCapsuleOperationRule','"WindCapsule"','媒体と0m/sを明示し、不要な風演出を作らない。'),('VisibleTranslationRule','"evidence"','位置と時間の数値を幅・前端・受領面積に翻訳する。')]:row('CoordinateGravityWindTemplate',n,B,a,o,'座標/媒体の静的検査、原寸投影はGPU未検証。')
row('OctaDomainTemplate','OctaDomainDefinition',B,'"Domains"','全PHに8領域を保持。不適用領域は理由付きlatentとし、架空の物理を足さない。','8領域/applicability/role/itemsをローカル検査。')
# 非アニメ映像の形態可読性にも互換適用する規則
for n,a,o in [('AnimeLayoutRule','"VisualHierarchy"','余白と上下関係をH64で一つのレイアウトにする。'),('SilhouetteDesignRule','"silhouette_logic"','粒子やglowからではなく幅を持つ主形を描く。'),('AnticipationAftermathRule','"state_t_minus_1_evidence"','Eの前後を既存場の状態差で示す。人物接地を捏造しない。'),('LimitedAnimationStillnessRule','"equilibrium_recovery"','満量保持の区間も同じ支持形と色境界を維持する。'),('AnimeCompositeRule','"CompositeIntegration"','発光と背景受光と観測拡散を分け、合成で本体を保持する。'),('ImageOriented12PrinciplesSubset','"Layout"','Staging/Follow-through/Timingを平面の場の変化に限定して使う。')]:row('AnimeStudiesTemplate',n,B,a,o,'B互換レイアウト。動画生成ツールを実行した主張ではない。')
for n,p,a,o in [
 ('ObservationRegistrySeparationRule',B,'"ObservationRegistry"','本体/背景をPH、局所拡散と表示変換をOBSとして分離。'),
 ('OperationClasses',B,'"ImageIntegration"','Tone/Light/Edge等の責務を分け、未選択加工を省略。'),
 ('PostEffectsCommonRule',F,'var color=bg*','背景への局所散乱項の後に有色本体を再合成し、輪郭を観測加工で作らない。'),
 ('ObservationIntensityBudgetRule',F,'min(bloom,vec3f(.075))','複数IDの観測散乱も同じ全体上限で合成。'),
 ('CompositeValidationRule','tests/gpu-tests.mjs','maxReferenceError','画素の差/境界/元背景を検査するが知覚判定は分離する。'),
 ('SamplingAndReconstructionRule','src/renderer.mjs','this.image=d.createTexture','固定H64バッファと同解像度textureLoad。DPR/OS条件は別途記録。'),
 ('StrictTermDefinitions',B,'"LensFlareField"','OBS1を物理レンズゴースト/粒子と呼ばず、使用しないフレアはnone。')]:row('ObservationIntegrationTemplate',n,p,a,o,'GPU検査ページとdocs/ACCEPTANCE.md。作成環境のGPUはnot_run。')
for n,a,o in [('PEVRule','"PEV"','採用した連続支持・時間遅れ・受領積分の成立範囲を決める。'),('AESRule','"AES"','その状態の中で面積/密度/色を選ぶ。物理や意図を別の装飾に置き換えない。'),('DesignScienceRule','"DesignScience"','視認順序・余白・形状を記述。ラベルだけで終えない。'),('CCMScope','"CCM"','供給青/搬送シアン/受領紫の各色域を入力と状態に束縛。'),('AESEvaluationAxes','"selected_aesthetic_extremum"','単一の美的スコアではなく連続輪郭と面積変化で検討する。'),('ColorScienceInAES','"Palette"','色は均等虹色ではなく部位・内面状態の役割差に従う。'),('ArtisticBeautyDefinitions','"Beauty"','構造・素材・知覚・色の複数側面を記す。品質点数は作らない。')]:row('ExtremumDesignColorTemplate',n,B,a,o,'採用設計と実装色の静的照合。GPU芸術評価未実施。')
for n,a,o in [('ReflectionVsLensFlareSeparation','"ReflectionClosureTemplate"','自己放射/背景拡散とレンズ由来のOBSを混同しない。'),('ReflectionClosureRule','"non_applicable_reason"','可読な鏡面lobeを選ばない。マイクロファセット検証を偽装しない。')]:row('ReflectionClosureTemplate',n,B,a,o,'適用理由を記録。厳密な放射輸送計測ではない。')
row('TermsTemplate','Terms',B,'"TermsTemplate"','PH/OBSと要求true/検査結果を区別する。','用語・参照を静的照合。')
# 拡張
for n,a,o in [('ExtensionActivationRule','"ExtensionActivationTable"','属性具体化で必要なVFX/OBS/LDMだけを起動する。'),('ExpressionIntegrationRule','"expression_intent_ref"','未指定の魔法preset/人物/キーワード効果を一括追加しない。')]:row('ExtensionActivationTable',n,B,a,o,'design/activation-resolution.jsonと非起動ブロックを照合。')
for n,p,a,o in [
 ('VFXActivationRule',B,'"VFX"','既存効果の内部形態をworldとobservationで区別。'),
 ('MultilayerArchitectureRule',B,'"layers"','供給/搬送/容量/内部/受光/観測の異なる機能。6層を6物体と同一視しない。'),
 ('SpatialMorphologyRule',P,'export const SHAPE','106wu供給面、26〜36wu断面、94wu受領形を新定義し、重なりを保持。'),
 ('MaterialOpticalResponseRule',F,'f.rgb=layer.rgb','色・coverage・表示量・局所受光・散乱を別変数で合成。'),
 ('TransportTemporalRule',F,'let localTime=','位置に比例した到着遅れを使い、前端と受領開始を同じ時計に束縛。'),
 ('EnvironmentCompositionRule',F,'let ls=','既存背景へ源/搬送/受領に応じる別の局所光を届ける。'),
 ('CompositingReadabilityRule',F,'fn over(','straight RGBとcoverageを明示、全層addにせず、有色本体の量感を保つ。')]:row('VFX',n,p,a,o,'tests/field.test.mjs、tools/check-field.mjs、実GPU/無説明全寿命はnot_run。')
row('ECodeImplementation','ExecutableECodeBranchRule','src/index.mjs','ManaRuntime','実行可能sourceと検証記録を渡す。画像生成やゲーム更新ではない。','npm test / npm run check。実GPU/聴感/ゲーム別検査。')
for n,p,a,o in [('PostEffectsAutonomousActivationRule',B,'"ordinary_posteffects": false','source-boundな1操作だけ選択し、通常PostEffectsを一括追加しない。'),('SPCARule',F,'let source=1.0-emitted','各局所ピークは量/境界/減衰へ接続され、独立glowを形状にしない。'),('GlobalLocalRule',B,'"local_posteffects"','局所maskを固定し、全画面加工/二重登録を避ける。')]:row('PostEffects',n,p,a,o,'OBS source/mask/stage/budget検査。')
for n,a,o in [('LDMActivationRule','"inferred_requires_luminance_dynamics": true','属性具体化の発光場に必要な輝度包絡だけを有効化する。'),('LDMModeRule','"temporal_envelope"','所有者phaseと同じ包絡、未指定の点滅や黒背景を追加しない。')]:row('LuminanceDynamicsModule',n,B,a,o,'共通時刻とIntensityBudgetの参照検査。')
row('GradientAnchorPolicy','GradientAnchorRule',P,'export const PALETTE','3領域の色と受領内部の新旧層に色相を束縛。表面prism加工とは別。','設計/生成WGSL/CPU式を照合。')
for n,p,a,o in [('VideoDurationRule','src/contract.mjs','export const DURATION','総尺1.6所有者秒を視覚と音声で共有。'),('CommonTimelineRule','src/owner-clock.mjs','this.age=Math.min','実効ACC2切替で古い速度を積分してから新速度へ移行し、位相をリセットしない。')]:row('VideoGenerationPolicy',n,p,a,o,'tests/clock.test.mjs / audio.test.mjs / runtime.test.mjs','contract')
for n,a,o in [('GlobalAcceptanceCriteria','"ValidationResults"','構造・意味・実描画を別々の状態で記録する。'),('ComparativeEvaluationRule','"ComparativeEvaluation"','r0.2ユーザー報告をr0.3の比較実証と扱わない。'),('PassWarningFailEvaluation','"FinalStatus"','生成/実GPU未観察はNotRun。静的passで描画passへ昇格しない。'),('IntentAndArtisticOutcomeRule','"OutcomeEvaluation"','無説明読解と芸術評価は未観察のまま残す。')]:row('GlobalAcceptanceTemplate',n,B,a,o,'evidence/validation-summary.jsonと検査層を照合。')
# ユーザー固有の実装契約。Bの既存rule_idではないことをprefixで区別する。
for n,p,a,o,t,sc in [
 ('CommittedPositiveOnly','src/contract.mjs','export function validateGain','正の確定discreteと2系統の原因だけを通す。','tests/contract.test.mjs','contract'),
 ('NoRenkiNaturalCapped','src/contract.mjs',"['desire-recovery'",'錬気3variant/自然回復/無変化を除外する。','tests/contract.test.mjs','contract'),
 ('OncePerEvent','src/runtime.mjs','this.seen.add(key)','抑制時もIDを消費し、再受信や後からの可視化で再生しない。','tests/runtime.test.mjs','contract'),
 ('RecipientCurrentWorld','src/runtime.mjs','worldX:a.worldX','受け手の現在位置を各フレームで読む。イベントの古い位置に留まらない。','tests/runtime.test.mjs','contract'),
 ('NoLeak','src/contract.mjs','export function recipientState','生存/在席/ベント/透明/画面内/セッションをfail-closedで検査。','tests/runtime.test.mjs','contract'),
 ('VisibilityRecheck','src/renderer.mjs','gen!==this.generation','offscreen proof前後とpresent前後のgeneration/visibilityを再確認する。','tests/runtime.test.mjs + GPU手動','contract'),
 ('ACC2OnlyEffective','src/contract.mjs','export function activeRate','movingかつactiveかつeffectiveだけ2倍、待機/予約/OFFは1倍。','tests/clock.test.mjs','contract'),
 ('PhaseContinuous','src/owner-clock.mjs','motion(m,wall)','途中切替でageを保持し、予約状態では加速しない。','tests/clock.test.mjs','contract'),
 ('SFXVisibleFrameOnce','src/runtime.mjs','commit(receipt','GPU由来の有色本体witnessと同じtoken/idの初回だけ発音判断。','tests/runtime.test.mjs +実GPU receipt','audio'),
 ('SFXSuppressNoReplay','src/runtime.mjs',"s.audioDecision='suppressed'",'ミュート/verify/非表示/context停止時は鳴らさず、後から追い鳴らししない。','tests/audio.test.mjs / runtime.test.mjs','audio'),
 ('SFXContinuousRate','src/audio.mjs','v.source.playbackRate.setValueAtTime','同じBufferSourceの再生率だけを変え、startを再実行しない。','tests/audio.test.mjs +実聴','audio'),
 ('SessionDispose','src/runtime.mjs','setContext(context)','旧voice/active/seen/motionを破棄し、別セッションを混同しない。','tests/runtime.test.mjs','contract'),
 ('NearSimultaneousIds','src/runtime.mjs','const running=[],pending=[]','近接した異なる獲得を別state/token/voiceで管理。初回の同一所有者描画は逐次化する。','tests/runtime.test.mjs','contract'),
 ('GPUOnly','src/renderer.mjs',"getContext('webgpu')",'Canvas2D/画像ファイル/非GPU fallbackなし。','tools/check-source.mjs + GPUページ','contract'),
 ('NoGameWrites','src/contract.mjs','ゲーム側の確定イベント','入力を読み、イベントのマナ量を表示側から変更しない。','read-only mockテスト/公開API','contract'),
 ('H64QualitySeparate','tests/gpu-tests.mjs',"quality:{dark:'not_run'",'技術数値がpassでも暗明の無説明読解は人が別判定する。','docs/ACCEPTANCE.md','visual'),
 ('IndependentR03',P,'r0.3独立造形','旧版のshader/形状/視覚素材を移植せず、新しい輪郭・量場・時間分布を実装。','docs/PROVENANCE.md','visual')]:row('UserContract',n,p,a,o,t,sc)
obj={'version':'0.3.0','source':'会話内のB基底/拡張規則とユーザー契約。要件本文は正本を参照。','entries':rows,'interpretation':'実装箇所の存在は品質成功を意味しない。GPU/聴感/無説明読解はnot_run。'}
(R/'design/rule-implementation-map.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
md=['# 要件と実装の対応 / r0.3','', 'この表は正本rule_idを実装・設計に対応付ける索引です。実GPUや聴感の合格表ではありません。行番号はビルド時スナップショット、anchor文字列が再確認の基準です。', '', '| 規則 | 実装 / anchor | 観測可能な帰結と検査 |','|---|---|---|']
for r in rows:
 a=r['implementation'][0];md.append(f'| {r["rule_id"]} | `{a["path"]}:{a["line"]}` / `{a["anchor"].replace("|","/")}` | {r["observable_consequence"]} 検査: {r["verification"]["method"]} |')
md.extend(['','全行のGPU観察・品質観察は未実施です。契約テストはmock、幾何・量場はCPU式で検査しています。正本の公式検証器を実行したという主張はしません。'])
(R/'docs/RULE_MAP.md').write_text('\n'.join(md)+'\n')
print(f'{len(rows)} requirement mappings written; no GPU/quality pass generated')
