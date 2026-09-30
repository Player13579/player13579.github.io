# 有理化による能力消費免除 E — GPT-6.1-Sol r1

## 担当と開始時契約

所有出力はこのr1だけ。要求は新規のWebGPU VFXと有限SFX、Bの現行規則、H64で読める主形、実在する発動者への因果、源に束縛した発光・観測応答。ゲーム判定、共有public、Git公開、ブラウザー、採用判定は担当外。消費免除の意味と受信時計は確定入力であり、主形・材質・時相・音・空間の創作が未決だったためGPT-6.1-Solが担当した。

入力は現行B正本、DVA maintainer/E品質規則、`rational-free-port-inventory/FACTS.md`と`FACTS.json`、親担当の要求だけ。旧Pro候補の実コード・設計書・画像・音は開いていない。FACTSに含まれる旧候補の状態・時計の記述は来歴と互換境界の証拠で、造形の入力には使っていない。人物画像も未読。新規画像を作っていない。

Full Access実行環境はdanger-full-access、approval never。個人configの対象2キーも一致。BloaderはEコード分岐のため、画像用Python設計schema/画像生成を要求しない。下記は実行Eへの設計契約であり、B-Expression-2画像生成物と偽装しない。

## 意味と形

Rationalが一つの能力をマナ消費なしに成立させた受領。増量・補給・回復を表さず、能力そのものの種類・命中先・強さも捏造しない。認識の源から能力へ向かう「折りが開いて通れるようになる」一つの連続した光の面を選んだ。文字、チェックマーク、時計、容器、貯蔵メーター、浮遊アイテム、紋章、閉じた防護殻は使わない。

足元を原点、投影済み人物高H、screen +x右/+y下。源は(.13H,-.79H)、主面はy=-.84H〜-.14H、xはおよそ.10H〜.55H。源は右こめかみ横、開口は右肩外側、終点は同じ身体の腕・手側へ続く。主形は色よりも、広い曲面・開いた内側の空域・源から身体への連続性・一回の展開と収束で区別する。面を横切る折りの稜は内部構造であり、独立した三本棒等を並べない。人物を新たに作らず、既存人物の全身/顔を変形・移動させない。

投影の基本式はp=(pixel-anchorPx)/actorHeightPx。u=clamp((p.y+.82)/.66)、a=sin(pi*u)。cx=.13+.29*a*(.34+.66*opening)-.025*u、半幅=.035+.115*a*(.25+.75*opening)。H64の展開時は最大半幅9.6px、縦44.8px、主面全体の横占有約29px。ぼけ支持域をこの主面寸法に含めない。可視面積は人物遮蔽後に別途測る。外縁約1.1px、内部稜約3pxが下限の設計仮定であり、実GPU未観察。

誤読候補はマナ回復、装甲、翼、運動速度、単なる肩光、ルーン。外から体内へ貯めない/全周に閉じない/人物を移動しない/面の切り替わりと空域がある、という複数の手掛かりを持つが、名称なしで意味が読めるかは未検査。形が翼・小曲線等に見えた場合、SFX/glowだけで補って合格にしない。

## PH登録・完全構造

PH数は2。PH1は宣言された消費免除の有限発光場、PH2は実在する受領者と、その局所光学応答。描画層数とは一対一にしない。源・曲面・稜は同じ場の状態を共有し、別PHへ水増ししない。

### PH1 許可通路の発光場

- identity: PH1、origin=attribute_resolved、anchor=body、visibility=visible。局所状態差は閉じ気味の細い始動域→開いた面→能力側へ連続する面→有限収束。partition_reasonはPH2と異なる独立した場の境界・時相。
- DeepStructure: Coreはこめかみ側の発生極値。Structureは上記cx(u),width(u)を持つ一枚の曲面と稜、奥面/前面の連続分配。Surfaceは外縁の細い減衰、内側の広い空域、身体側の接触域。glowが主輪郭を作らない。
- PhysicalModel: model_kind=declared_fantasy。system_boundaryは源から身体の能力側まで、半径145はイベントmetadataであって面の半径ではない。state_variablesは位相t、開口opening、場のdensity、coverage、emission。inputは既に成功したauthoritative receiptのみ。mass/momentum/chargeはnot_applicable（抽象的な宣言場で物質・力・電荷移送を追加しない）。energyはapplicableとして宣言された有限放射の供給→表示・受領者への応答→終了、実ジュール値は不明。constitutive_responseはreceipt位相に従う面展開と稜の局所輝度。initial_conditionは無表示、boundary_conditionsは実owner/足原点/同一時計、終端で全出力ゼロ。approximation_scopeは2.5D解析曲面、実3D物質・物理光輸送の測定ではない。
- ScaleRegime: 長さは人物H基準で約.70Hの主高さ、世界のm値へ捏造換算しない。時間は1200 presentation ms。支配条件は曲面展開と有限放射の時相、重力/流体輸送は支配しない。dimensionless reasoningはage/1200とp/H。detail_cutoffは原寸約1px外縁と3px稜、サブピクセルノイズは使わない。
- OctaDomain: Thermo not_applicable/latent（非燃焼場、温度不明）、Fluid not_applicable/latent（空気を運ぶ場ではない）、Optics applicable/primary（有色面・白芯の放射、奥前遮蔽、局所減衰）、Materials not_applicable/latent（固体・装甲の物性を宣言しない）、Electromagnetics not_applicable/latent（デジタルという名称から電流を創作しない）、Rheology not_applicable/latent（開く時相は粘弾性ではない）、WaveOptics not_applicable/latent（世界内干渉・回折を使わない）、SurfaceScience not_applicable/latent（濡れ・付着・残留なし）。非適用も保持し、光学以外の学問数を満たす架空機構を追加しない。
- PerceptualReadability: direct evidenceは広い曲面と開口、源→面→受領部の時相差。indirect evidenceはPH2の局所応答。figure_ground separationは設計上medium/未観察。edge legibilityは外縁/稜で異なる幅。cue_rolesは面が通路成立、時相差が同じ受領を支持し、共通位相なので統計的独立とは主張しない。confusable alternativesは翼/回復/防護。disambiguating evidenceは非閉鎖/非補充/非移動と身体上の源。viewing conditionsはH64基準H48/H96、暗明fixture両方、背景別の設計変更なし。
- GeometryConstraint: curveに沿う面方向、稜と半幅から近似法線の一貫性、曲率はuに連続、シルエットは広がる開面。源は人物近傍、面は右肩外、前後分配はworld.wgsl、実alphaによる奥面遮蔽。face保護は登録済み顔領域近似であり顔を新生成しない。
- StateDynamics: state spaceは有限無表示→source→opening→permitted-path→closure→無表示。transition_path_character=monotonic、local_stability_type=stable（有限包絡）、convergenceは終端ゼロ、dampingは収束終盤のsmoothstep、oscillation_pattern=none、equilibrium_recoveryは元の人物表示。driving_input=receipt、response_timescale=1200ms、phase_relationはPH2が.27t後に応答、stability_conditionは有限入力・単調時計・一回受領。failure riskは後半に粒子だけ残ること/寿命再始動。
- Couplings: Dominant=PH1.Optics→PH2.Optics（接近源と通路が身体光学応答へ）。Secondaryは存在しないため[]。CausalAssessmentは介入main OFF/response OFF/OBS OFF/星OFFを独立初期化し、他条件保持で源・形・応答の分離を予測。competing explanationは人物衣装色や観測光。uncertaintyはalpha・投影・画素の可読性と2.5D近似。check_status=hypothesis_only、evidence_refs=[]（CPU数値確認は美的因果識別の代用でない）。
- CausalityLinks: physical_influence PH1→PH2は宣言された放射に同期する局所応答。observation_dependency OBS1→PH1、OBS2→PH1。gaze_path PH1→PH2は発生源から身体への視認順序、物理因果とは別。
- Evidence: direct=[silhouette,boundary,phase_difference,convergence]、indirect=[PH2 reception]。SurroundingChangesはPH2の源に近い肩/腕応答だけ、床/煙/破片なし。latent_reference_target=none。
- VisualProjection: role=essential、world_state_ref=PH1.StateDynamics/DeepStructure、retained_cues=開面/稜/源/終点/時相。simplificationは解析面と一稜、micro noiseなし。omission_scope/exaggeration_scope/ambiguity_scope=[]、intent_refは消費免除の意味を保持。
- BeautyStructureApplication: standard、hierarchy_gaze_flow=[源から開面への移行、面から受領部への移行]、whitespace_density=[身体内側の空域、開面の外側の静穏域]、temporal_phase=[源先行、収束終端]。Goodは受領意味の保持、Truthは同一時計と位置、Beautyは空域/稜/広面の分離。
- AcceptanceCriteria: 上記完全構造と8領域、実寸主形/開口/源/受領/終端をすべて検査する。FailurePatterns: 粒子だけ、肩の小光のみ、翼・装甲、単一平面記号、補給の誤読、源を失った観測光、重複受領。

### PH2 既存受領者と局所光学応答

- identity: PH2、origin=declared、anchor=body、visibility=visible。局所差は既存人物の実alphaに束縛した右肩→腕側の応答。partition_reasonはPH1から入力を受ける既存受け手で、身体状態・遮蔽が独立している。
- DeepStructure: Coreは実actor alpha/投影登録。Structureは元の全身・衣装・姿勢を保持し、receive Gaussianが右側の近接面でだけ応答。Surfaceは実alphaとatlas crop、外側に偽の体を増やさない。
- PhysicalModel: model_kind=derived_world_response。system_boundaryは既存actor quad。state_variables=元sprite/alpha、response emission、顔保護mask。input=PH1放射と同一receipt owner。mass/momentum/chargeはnot_applicable（このEは既存身体の力学を変更しない）、energy applicableは入射に同期する表示上の有限応答、実表面積/反射率不明。constitutive_responseはalphaと距離/部位maskの積。initial_conditionは元sprite、boundary conditionは元のactor transform/cropとPH1時計。approximation_scopeは既存2D素材への局所加算応答で、実測照射・微細法線反射ではない。これを物理照明完了と宣言しない。
- ScaleRegime: 投影H、応答域.34H×.48H。時間は.27〜1.00t、.49tで定着。dominant balanceは入射位相とマスク、無次元p/H、detail cutoffは顔保護と約10pxの局所応答。ミクロ肌・布を作り足さない。
- OctaDomain: Thermo not_applicable/latent（加熱なし）、Fluid not_applicable/latent（人物を押さない）、Optics applicable/primary（実alpha遮蔽、局所有限光学応答）、Materials applicable/supporting（既存衣装/身体の色とalphaを保持、法線・反射率未提供による近似を明示）、Electromagnetics not_applicable/latent（身体の帯電なし）、Rheology not_applicable/latent（身体/服を変形しない）、WaveOptics not_applicable/latent（皮膚干渉を捏造しない）、SurfaceScience not_applicable/latent（濡れ・汚れ・残留なし）。
- PerceptualReadability: direct evidence=人物の原姿勢/局所応答と曲面終点の連続、indirect=PH1源の位置。figure_ground separation medium/未観察。cue_rolesはalpha接点と位相が受領者を指し、同じマスクなので独立証拠ではない。confusable alternativesは衣装変更/全身回復、disambiguating evidenceは局所・有限・同一ownerの応答と人物原姿勢保持。viewing conditionsは原画registerで実H64、アスペクト比を保つ、暗明の背面が実際に各明度であるfixture。
- GeometryConstraint: 元actorの姿勢/関節/足原点/支持関係を保持。surface_orientationとnormal_fieldは素材から未提供で反射推定しない。curvatureは元輪郭、silhouette logicは実alpha、contact/spatial relationはPH1の近接部位。ポーズを創作しない。
- StateDynamics: state_space_extentは元sprite→局所応答→元sprite。transition_path_character=monotonic、local_stability_type=stable、convergence/dampingは受領包絡、oscillation=none、equilibrium recoveryは元姿勢・色。driving_input=PH1、response_timescale=.27〜1t、phase_relation=.27t遅れ、stability_conditionはatlas登録不変。failure riskは偽全身発光/顔隠蔽/原画歪み。
- Couplings: Dominant=PH1.Optics→PH2.Optics、Secondary=PH2.Materials→PH2.Optics（元alphaによる局所応答の制限）。CausalAssessmentはreceive OFFをmain ONで比較し、面の意味は残り接触応答だけ消える予測、competing explanationは衣装固有色。uncertaintyは投影と局所mask。check_status=hypothesis_only、evidence_refs=[]。
- CausalityLinks: physical_influenceはPH1→PH2を上と同じ意味で参照、observation_dependency=[]、gaze_path PH2→PH1は受領部から源へ戻る位置確認、feedbackを捏造しない。
- Evidence direct=[occlusion,contact_trace,phase_difference]、indirect=[PH1 finite source]。SurroundingChangesはPH1の奥面が実alphaで隠れる。latent_reference_target=none。
- VisualProjection role=supporting、world_state_ref=PH2.StateDynamics/DeepStructure、retained_cues=[元人物輪郭,部位,接触,有限回復]、simplificationは既存2D素材を保持し局所応答だけ、各scope=[]。BeautyStructureApplication standard、material_response=[元色/alpha保持,局所応答との差]、temporal_phase=[PH1より後の定着,同時終端]。Goodは実受領者保持、Truthは位置と遮蔽、Beautyは主形と人物の分離。
- AcceptanceCriteria: 実atlas H64/支持・crop/顔・主面の前後所有/response OFFを確認。FailurePatterns: alphaなしの矩形、歪んだ人物、原画外の身体、顔を横切る主形、根拠なし物理反射完了主張。

## 共通条件・OBS・拡張

CoordinateGravityWind: world event x/yはDVA座標をそのまま保存し、actor projection後にscreen pixelへ変換。Eローカル座標はscreen+Y下のH基準であり、Bのworld+Y上/mと同一視しない。DVA→camera→screenは本編既存変換、隔離fixtureはorthographicで足原点固定。worldのm換算は未提供。Gravityは既存通常重力を保持するが宣言場の開面を落下物にしない。WindCapsule medium_state=air、calm/zero field、実物性不明、Eは髪/布/人物を新しく動かさない。床を新規作成せず、接地/影は既存人物レンダーの責務。

OBS1は源/面の高輝度に束縛したdisplay_artifactの局所光の広がり。OBS2は同じ源→肩外→腕接点の三つの有限交差光条。物理レンズゴーストではない。OBSの入力はPH1、target_maskはsource/面/接点の局所域、stage=post_composite（OBS2の明芯はworld frontと同じ局所表示パスで合成）、composite_method=add、dependencies=[PH1]、protected_regions=顔/全体画面/人物元輪郭。OBS1強度はpost.wgslの.34/.28による源比の周辺応答、OBS2はevent位相に同期。sourceVisibilityは源の実可視性で、場全体を無関係に停止するフラグではない。面由来周辺光には同じmain有無を使う。実シーン遮蔽が未提供の場合、全遮蔽対応済みとは言わない。

IntensityBudgetはこの一箇所。主emissionは青(.055,.34,.72)から水色(.28,.82,.96)、白い源(3.4,3.65,3.7)、稜の係数1.7、densityとcoverageは別。意図した強い白芯を減光しない。局所glowが主形を作らず、画面全体を持ち上げない。主形の明るさを背景で変更しない。上記の固定係数はr1試作の値で、普遍的な輝度上限ではない。白飛びは棄却理由としない。

SamplingContract: H64原寸基準、H48/H96追加、devicePixelRatioと実canvas変換を記録。出力解像度は実viewport、60fpsは検査目標で測定値ではない。入力素材は既存人物の実atlas、アスペクトとalpha登録を保持。主面外縁約1.1px、稜約3px、交差光条の短幅は.007H（H64で.448px）なのでGPU縮小消失リスクを明記し、実寸が星を識別できなければ別attemptで幅と形を再設計する。時間はcontinuous RAFのpresentation ms、露光残像・motion blur・smearは無し。MSAAは使用環境が対応する場合のみ、現在適用済みとはしない。

ExtensionActivation: VFX explicit / ECodeImplementation explicit / PostEffects attribute_resolved(source-bound local display spread) / LDM explicit VFX / GradientAnchorPolicy attribute_resolved（PH1の源→通路側の青→水色）。MagicArchitectureは明示キーワードなしで非起動。VideoGenerationPolicyは動画生成でなくruntime Eのため非起動。KeywordExpansionはv/f/o等の明示登録語がないため非起動。交差光条は恩恵の実表示要件に対応する形を個別選択し、v1明示と偽らない。Bの角度規約で112.5°/22.5°の直交軸、実shaderはscreen水平を0°として22.5°回転、全位置/時刻で共通。

LDM: spatial envelopeは源、開面、受領mask。local contrast budgetはこのIntensityBudget。temporal envelopeは下記の有限位相のみ、micro_variation=none、周期点滅・scanline/grainを自動追加しない。対象高64px、距離は本編viewport/倍率で取得、占有率は実canvasから測る（未測定）。reduced motionは形と1200ms契約を保持し、追加ジッターは元からなし。源や面を消して別形へ置換しない。

ReflectionClosure: 実表面法線が未提供のためmicrofacet反射を実装済みとはしない。PH2は局所表示応答の近似。既存spriteに反射・glossを描き足さず、Bの物理反射必須処方の対象ではない。CharacterPolicy/BeautifulPoseCapsuleは既存actor登録を外部参照し、このEから年齢/性別/新ポーズを補完しない。元身体の姿勢、足支持、頭胸骨盤の連鎖を変えない。fixtureに人物を使う実装担当は原画自体を確認し、人間が存在すればその既存身体登録を記録する。人物がない独立ギャラリーではPH2 responseはoff、未提供身体の光を生成しない。

## 時間と音

receiveNowを一度固定し、age=now-receivedAtMs、t=age/1200。server duration=0をVFX寿命0にしない。ネットワーク待ちで位相を前倒しせず、actor/timekeeper倍率は掛けない。1200ms以降はVFX/OBS/SFXすべてゼロ。30秒は判定側の再免除間隔で、このEはカウントダウンを描かない。

0–192msは源から小さい開面が先導、192–504msは広く開く面と通路、504–984msは源から身体側まで連続した主面と局所定着、984–1200msは面そのものが身体側へ収束し全消滅。後半を星やglowだけで埋めない。t=0と終端後は無表示が正常。source onset/opening全て連続包絡、フレームを跨いでもtの再初期化なし。

SFXはartist.mjsの4声。低い認識音→上向きの澄んだ電子倍音→有限の定着→短い収束。ノイズの薄片を量産せず、サイン単音の汎用ビープへ置換しない。音の発生源は同じRational/cause、独立receiptごと一度だけ。音量・聴感は未受入。48kHz stereoのPCMは完全に1200ms、末尾0、oscillator/reverbは残らない。ミュート/verify/gesture不足時も開始権を消費し、解除後に古い成功音をまとめて鳴らさない。イベント同時数の勝手な集約はしない。

## 状態差と検査

成功receiptだけ。初期所持/失敗/新snapshot/再接続で同receiptが再送された場合は再開しない。keyは本編authoritative localized identityを使い、近い時刻や同座標で別受領を混同しない。ownerがいない/座標欠損ならinvalid、actor不在/画面外なら正しい省略理由を返す。TTL経過/全遮蔽/画面外のnull claimは理由付きで許可、理由なしnullは欠落として残す。説明だけで偽gain-manaやゲーム再判定を追加しない。

検査時刻は0/24/96/190/192/194/360/502/504/506/720/982/984/986/1080/1176/1199/1200/1260ms。main-only、star OFF、receive OFF、post OFF、back/front個別を既定から独立初期化。H64暗明の源/開面/接点/原寸visible area/通常速度連続/終端後/SFX同期と通常URLの聴感を別々に残す。verify URLの音声は0。draw(6)と比較fixtureのinstance/座標を実出力で確認。主面の解析寸法と可視差分面積の両方を測り、未観察をpassにしない。

現在の判定: 実行可能なartist/world/post/音生成源は用意した。CPU証明は別ファイル。実WGSLコンパイル、GPU pixels/連続性、聴感、ギャラリー再生、ゲーム接続、ユーザー採用はすべてnot_run/false。主形に対する美的承認は保留。原本や不採用attemptを上書きせず、技術修理は別attemptで差分とSHAを保持する。
