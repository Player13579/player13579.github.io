# 転移ピクセル r1 — ゼロ設計

担当成果物はこのフォルダのみ。既存テレポートの創作コード・色・輪・粒子配置は入力にしていない。既存キャラ原画・モーションの作者とハッシュは保持する。実行コード作者は GPT-6.1-Sol。アプリ、本編接続、ギャラリー、公開、既存リリースは変更しない。

## 意図と主形

同一の転移実行で実際に運ばれた一人の身体を、発動位置で矩形の画素片へ分解し、実際の到着位置で同じ画素片から再構成する。本人転移では運ばれる人物＝術者、対象転移では運ばれる人物≠術者になり得る。術者の近くに別の光を置く設計ではない。頭・衣服・足の輪郭と元の色分布が画素の由来を示す。

画素群の最初の状態は元のキャラ像そのもの。0–90msで画素内の標本位置を各セル中心へ集め、元の輪郭が読める粗いピクセル像へ変える。セルは局所横幅28 logical px、上方向10–22pxの範囲でずれ、280msまでに消える。到着側は160msから現れ、同じセル番地と対応UVを逆向きに整列させる。足と縦の体軸から頭部へ読む列・行の順序を維持し、480msの到着区間後半ではセル内の原画解像度を戻す。640msに通常身体へ連続して受け渡す。途中に別キャラ・別衣装・汎用光塊は作らない。

4 logical pxを目安とする画素幅。縮小・reduced motionでは6pxへ整理し、変位は1/4に抑える。格子は最大32×40、各エンドポイント一回のインスタンス描画。透明セルは元のalphaを保持する。元の原画色が主で、加算色・発光縁・輪・光条・走査線・無関係な粒子を重ねない。背景・HUD・他の身体へ画素化を漏らさない。

## 事実と所有権

現行 producer は departure と arrival の異なる magic ID を発行し、共有 causal ID を持たない。departure の playerId は術者、targetId は運ばれた actor、座標はその actor の移動前位置。arrival の playerId は運ばれた actor。この版は安全なペアを現行データから推測しない。別工程の producer/adapter で正しい一回の cause を接続するまで本編未接続。

確定 producer/adapter 契約は [TELEPORT-PRODUCER-CONTRACT.md](TELEPORT-PRODUCER-CONTRACT.md)。Gravity の地点／対象転移と、別 family のスクロール権利行使による実身体移動を対象とし、心臓転移・権利取得・失敗／反射を含めない。サーバーの一件の成功移動から castId と raw from/to、transportedActor、relocation revision、姿勢 identity を保存する。既存 source の丸め座標や MP／移動意味は変えない。

新規 receipt は server room incarnation と client session generation、castId、endpoint role と実 source ID、公開許可された actor/caster/座標、local startedAtMs、timeBasis=wall-receipt、presentation duration640msを持つ。両端点が既存 privacy により公開されるときだけ両 sourceProof と saved from/to を結ぶ。到着のみ公開される場合は endpoint-only 再構成とし、隠れた術者・出発点・非公開 source ID を arrival metadata から漏らさない。prototype の現状は full-pair 専用であり、この projection 対応は未実装。近接、同時刻、現在位置、空の receipt、術者の見た目から同一 cause を作らない。event at の server epoch と local wall clock を引き算しない。

pose は運ばれた actor の exact authored command から得る。原画 assetPath/SHA、crop/sourceSize、身体 localRect、identity/direction/frame の選択根拠、room/session/causalId、実 GPU texture/device、uploadVersion と ownerLease を保存する。アトラスの別キャラ領域を読むことは禁止。departure と arrival に同じ crop の局所セル番地を使い、world anchor だけを from/to へ移す。傾き・上昇・特殊姿勢の transform を通常立位と取り違えない。この prototype の localRect は軸に沿う立位専用であり、非ゼロ lean/rotation/ascension の command は adapter 側で拒否する。後続版で必要なら同一姿勢の厳密な affine を追加する。

現在の dirty sprite cache が提供する ownerLease.pin(uploadVersion) / pin.release({submitted,completion}) を利用する。公開 HEAD の cache にこの API が無い場合は別途 bounded adapter が必要であり、代わりに Canvas・readback・新画像へ回避しない。デバイス、uploadVersion、ready/currentを検査し、submitした resources は GPU completion まで解放しない。destroy・cancel・例外でも pin と uniform buffer を一度だけ回収する。

転移中の通常身体には actorId+causalId の排他的 bodyLease が必要。到着身体を通常 sprite と二重描画せず、画素の再構成が身体を担当する。正しい prepared pixel commands が無ければ suppress しない。source と arrival の privacy は独立に検査し、非公開端点から位置を復元しない。actor が動く、死ぬ、排出・ventへ入る、session が変わる場合は E を cancelし、現在の正しい身体へ所有権を返す。ゲーム移動や時計は止めない。cancel を「転移E完了」と記録しない。動いた身体を saved arrival へ戻して描かない。

## B 基底の適用

正本は認証 Git fetch の player13579/B、Codex-honoo、commit `22d3fcfd617f42b1a967de767906204c0221ec64`。base blob `8f1286e12402fe7b19650ad44bcddb38ad227a08`、extension blob `f35b61661d0209c0329d4a501a760d35b451d52e`。両全文を読んだ。inputs に読んだ本文を保存。ECodeImplementation 分岐による実行コードであり、画像生成schemaを新modeへ変更せず、画像生成・Video生成を命令しない。

**PH1：運ばれる同一身体と有限ピクセル分解／再構成**。宣言済みの非現実転移を `declared_fantasy` として扱う。境界は保存された from/to、入力は一件の sourceProof、状態量は元の姿勢・セル番地・UV・coverage・phase・有限変位。質量、運動量、エネルギー、電荷の実物理的変換はこのゲームの表示から測れず、実証や保存則ソルバーを主張しない。身体同一性・セル同一性は実装上保存し、出現と消失の有限 presentation 範囲を閉じる。空気へ実際の熱・電荷・衝撃を与えたと偽らない。

DeepStructure の Core は身体の連続シルエットから有限セルへ切り替わる境界、Structure は列・行と元のセルUV対応、Surface は原画alpha境界とphase別coverage。ScaleRegime はゲーム身体の約96×112 logical px、4pxセル、640ms表示、変位28px以内。メートル換算は実ゲームで未定義なので物理長さを捏造しない。標準BのY上向きとゲームY下向きを区別し、ゲーム world→camera→logical viewport→WebGPU clip の連続変換で位置を保持する。重力で落下する実破片とは扱わず、セルを運ぶ宣言転移へ拘束する。WindCapsule は既存静穏室内、追加風なし。既存衣服・髪・ポーズを変更しない。

OctaDomain は8領域を保持する。Thermo：not_applicable/latent、熱転換を宣言しない。Fluid：not_applicable/latent、空気の流れ・抗力を模した揺れはない。Optics：applicable/primary、元の色分布・透明輪郭・可視端点により同じ身体を識別する。Materials：applicable/supporting、既存衣服と身体の色面・形を保持し材質を別物へ変えない。Electromagnetics：not_applicable/latent、青色や矩形だけから電荷・放電を主張しない。Rheology：not_applicable/latent、身体は溶融・粘弾性変形しない。WaveOptics：not_applicable/latent、干渉・回折・波長の表示を追加しない。SurfaceScience：applicable/supporting、既存alphaの被覆境界を参照、濡れ・残渣・付着を追加しない。

StateDynamics は departure の単調な breakup と arrival の単調な convergence。セルの lane/row 順で時間差を与えるが高周波点滅しない。減衰はdeparturecoverage、回復はarrival UVの原画解像度への復帰。安定条件は immutable source/pose/device/privacy/session。不一致は blocked、移動/lifecycle変化は cancelled。時間外は明示 omitted。再構成前後の別人格や衣装へ接続しない。

PerceptualReadability は(1)元の輪郭が格子へ変わる履歴、(2)同じ色セルが同じ身体輪郭へ戻る対応、(3)正しい足位置という異なる手掛かりを使う。同時に見えるセル群を独立した二人として誤認するリスクを、departure減衰とarrival復帰の時間相で検査する。表示寸法・背景対比・遮蔽は実GPUで未観察。Beauty の軸は rhythm_repetition（列/行、セル番地対応）と temporal_phase（breakup、reconstitution）、whitespace_density（限定変位、背景透過）、material_response（原画色とalpha保持）。PH数や粒子数を評価点にしない。

Couplings は PH1.Materials→PH1.Optics の既存色面→可視セル、phase→coverage/UVという宣言内部関係。新床・熱・反射・物理feedbackを捏造しない。CausalAssessment は from/to または pose identity を変更したとき出現位置/身体が対応して変わる予測、他条件を保持した malformed receipt テストで照合する。別解釈は単なる光の粒子；元のUVと輪郭が残ることで区別する。CPU契約はtested、画素の認識性はhypothesis_only。

**OBS1：セル内原画の画素標本化**。入力は PH1 の exact atlas crop、マスクはそのalpha、stageはworld_render_observation、合成はpremultiplied source-over。セル内のUVをセル中心へ集め、再構成終盤に元のUVへ戻す。実在する撮像・伝送機構だと断言しない。背景・他actor・HUDはprotected regions。これをVFXのobservation layerへ登録し、worldのセル変位と二重の物理現象にしない。

IntensityBudget は原画色の上乗せ0、opacity≤原画coverage、追加glow0。SamplingContract は実 viewport とzoom、cell4/6 logical px、最大32×40、近傍 texel load、有限phase。完全に透明なセルを白い矩形にしない。VFX world layer（分解セルの位置とcoverage）と observation layer（UV量子化）は別機能。CharacterPolicy は既存actorの属性を保持、BeautifulPoseCapsule は exact authored standing pose の関節・足支持を保持して追加ポーズを作らない。MagicArchitecture は語として明示指定されていないため不起動。LDMはVFXの有限coverage、原画色の明度を維持する。Gradientは未選択。ReactivePhaseChangeは熱的溶解でないので非適用。

## SFXと受入

発音は submitted frame が実際に描いた causalId+phase の一回 receipt だけ。departure 220ms、arrival340ms、音量上限0.085の有限PCM。元の情報が刻まれて離れ、段階的にロックして戻る二つの輪郭を短い階段状位相と包絡で示す。無限oscillator、繰り返しsnapshotの再発音、hidden endpointの位置SFXは不可。verifyは常時silent。本編発音adapterは未実装。

`contract.test.mjs` は source/pose/privacy/lifetime、wrong actor/coordinate/room/generation、有限PCM、描画数上限、GPU lease破棄を確認した。WGSLに元のtextureLoad・source alpha保持・instance cell番地が存在することを静的確認。これはshaderコンパイルではない。GPU shader compilation、実デバイスsubmit、ゲーム身体のexclusive ownership、実寸可読性、4/8同時発生、normal/reduced motion、通常聴感は `not_run`。ギャラリー再生adapterと本編producer接続は別途。現時点の全体判定は設計・CPU prototype、描画品質未受入。
