# 量子錬成 E / GPT-6.1-Sol r1

所有出力は本ディレクトリのみ。共有ゲーム、ギャラリー、台帳、公開Gitは主担当／実装担当の所有。承認境界は新Eの創作ソースと接続契約の納品であり、ユーザー採用・ゲーム受入・公開済みを意味しない。2026-10-01実行境界は danger-full-access / never、config.toml の対象2キーも一致。

## 確定した実仕様と設計選択

権威producerは量子オペの成功操作で鉛または水銀を1個とスタミナを消費し、100クレジットを加算して quantum-transmutation を出す。発生源はオペの丸めた x/y、radius=150、durationMs=3600、variant=lead|mercury。本編受信後の localEffect は startedAt と duration=3600 を持つ。gain-credits は廃止済みマーカーとして省略される。量子錬成Eは資源取得・アイテム取得Eへ転用しない。

ゼロ制作。旧Canvas原画、旧量子錬成コード、他Eの創作造形・音は入力にしていない。既存shared-deviceモジュールの API とalpha設定だけ技術契約として調査した。正本Bは認証済みgit fetch後の player13579/B / Codex-honoo、commit `37eb4bdfe59f0dc075f9b4333b7d6af76b784a88`、base blob `8a908495ae1f9b7175e00384ab88c50e5c78bd43`、extension blob `0eda016558e426ff4142d850d26200b40fafd834`。保存mdは読み取り用UTF-8出力でありGit blobの原バイトと同一とは主張しない。

入力塊→開いた分節錬成場→金色の結果場という三段階を、同じ源の局所域で描く。鉛は大きい角形、水銀は縦長の丸い入力塊とする。消費済み素材を説明する演出上の再現であり、所持アイテムを再出現させない。変換は六つの幅ある対向セルと太い入力経路で表す。結果は開口を持つ金色の厚い場がその源から広がり、その場で収束する。金貨、インベントリへの輸送、数値加算、架空の受領枠を描かない。数字の100をshaderで再確定しない。

デジタル性は、入力を分節した場へ読み取り、その対向セルが入力側から閉じて結果側の占有域へ再構成される因果で成立させる。画面全体の格子や走査線を後載せしない。混同候補はバリア、瞬間移動、物品の受領。身体を包む閉じた膜、移動前後の身体像、UI着地点がなく、入力素材の消費と同一域の変換があることで識別する。単一静止画だけで能力名を一意に言い当てられるとは主張しない。

## 層・形・光・時間

PH1 input は源の左27 world unitsにある22×30の鉛塊または22×30程度の水銀形。薄い反射方向差を持つが、実在の鉛・水銀物性値や熱・核反応速度は断定しない。0–0.85sで形を保持し、0.85–1.65sで場へ吸収される。

PH2 carrier は y=-14,0,+14 の三段、左右各セル14×10.4、左右間隔40→18 world unitsの開いた錬成域。セル内面が発光し、幅9の太い供給域が入力から内面へ届く。0–0.16s onset、0.32–0.64s供給、0.72–1.65s収束、1.50s±0.22sで局所最大発光、2.25–2.9sで結果場へ役割を渡す。主運動は単調で、ランダムの揺れ・細ノイズ・無意味な周期脈動なし。

PH3 result は 1.35–1.80sに成立し、1.38–2.05sで幅28→46、高さ38の金色面へ開く。10×20の開口と右上の段差が負空域を保つ。奥面の4unit偏位と局所減衰、手前の幅ある主面・縁で厚みを区別する。3.02–3.60sに同じ主形を保ったまま閉じる。終盤を汎用粒子だけで埋めない。結果場の大きさは表示上の選択で、100クレジットの物理量ではない。

H64の源座標は足元相当の登録点、錬成域中心は(0,-32) world units。手位置は供給されていないため掌発生を偽らない。描画支持域は x[-64,+64], y[-96,+32]、最大距離約115.4でradius150内。主面46×38、開口10×20、セル14×10.4がH64でそのままpx寸法となる想定。主面の投影式と合成後の可視作用面積は別ゲート。固定源なので、オペ移動で場を追尾させない。同じframeのworld→camera→screen変換を用い、DPRはviewport/zoomの同じ単位へ一回だけ反映する。

material coverage、emission、OBSは別項。PH2青色の内面＋PH3金色の本体＋源の白色局所放射。局所ピークは6のscene-linear radianceで、場全体一様発光ではない。初期の供給、変換ピーク、結果の保持、終端に同期したLDM。強発光は「閃光／複数の光芒。輪郭から光が溢れる。」を源とOBSで具体化する。背景から減光係数を取らず、白飛び回避を品質目標にしない。

OBS1 は変換域の近傍glowと結果場の弱い局所PSF、OBS2 は変換源に依存する35度の交差flare。発生源の位置・discharge強度・時相・visibilityに従い、源OFF/hidden/expiryで消える。world/glow/flare の診断切替を独立に持つ。観測者はゲームの直交投影を表示で見る人の光学応答という設計上の近似。PSFとflareを実カメラレンズの厳密な測定モデルとは呼ばない。レンズゴーストは非採用：このEにカメラの複数屈折面・レンズ中心等の実契約はなく、短い局所変換へ離れた第二像を足すと結果場との因果が散る。強い源の光芒は採用し、単に語の未指定を非採用理由にしていない。

風／重力で動く素材群ではなく、権威位置固定の declared_fantasy field。媒体条件は場の局所制御域、速度場ゼロ、実際の空気密度・粘性・重力値は不明として場への影響非適用。金色場は実金の生成・核物理の実証ではない。金属の実物性を推測して炎・煙・爆発・残渣を追加しない。

SFXは3.45s有限mono。入力の低い金属倍音群(lead118Hz / mercury170Hz基底)から連続する周波数変化、1.42sの短い収束音、1.50sの結果成立に660/990/1320Hzの減衰和音。attack9–18ms、余韻は指数減衰で3.45sまでに終了。音量で力を作らず、位相の引継ぎで材質変化を示す。初回receiptで一度、同じ原因IDの重複・再送で再発音しない。発音済み履歴はE寿命とは別にsession単位で保持し、snapshot削除で忘れない。

## 本編portの固定契約とLuna受入条件

- captureは最初のquantum専用branchで、type/variant/radius/duration/finite座標/id/playerIdを検査し、source event IDを保つ。未対応variant・欠損ID等はunsupportedのまま。無条件omittedや complete:trueだけの偽glowを入れない。
- 演出時計は現行受信時 startedAt を使用し、age=now-startedAt。3600ms固定、actor time倍率を二重適用しない。反復snapshotでstartedAtを再設定しない。futureは可視化しない、期限同値で終了、再接続の古いreceiptを新規演出として延長しない。
- playerIdはsourceの秘匿判定に用い、viewerが現在知覚できないownerを描かない。hiddenを省略済みと分類するのは実際のvisibility判定が成立した時だけ。死亡・vent等で源非表示ならVFXと生存音を止め、再表示しても新しく音を鳴らさず元clockで描く。
- event x/yは発動源に固定。現在のオペ座標で上書きしない。source owner不在をviewerの足元へ置き換えない。offscreenは支持域との交差で判定し、その場で音を新規開始しない。viewport境界を跨ぐ支持域は可視部分を描く。
- createQuantumPassはrenderer/frameOwnerの既存device/formatを渡す。root.own/releaseにbuffer所有を繋ぐ。recordは同一frameのpassへ描くのみ、独自canvas/context/requestAdapter/queue.submit/RAFなし。record indexはframe内で一意（複数イベントに同じuniformを使わない）。既存frameが提出された後に次frameのslotを再使用可。
- shader compilation のerror messagesを検査してからregistryのsupported readyへ入れる。GPU unsupportedを一般catchで隠さず、起動の必須stageに実portとして登録する。
- mainの専用event typeは quantumTransmutationE を推奨。rendererのrequired-stage readiness、registry module load、event type whitelist、record routingを全部結ぶ。galleryも同じartist/shaderを呼ぶ。造形変更をadapter内でしない。
- SFXのadmissionは成功producer quantum receiptのみ。game verify URLは音量0、mute、audio suspended、hidden、offscreen、expiryはsilent。contextが後でresumeしても古いeventを鳴らさない。初回eligible receiptでsoundBufferを一回生成／schedule、visibility喪失やexpiryはsource.stop。gain-credits音/マーカーを復活しない。遅配時age>150msでは新規sound開始を省略する（既に聞かせたか不明なsnapshotの音を後追いしない）。
- reduced motionは意味の順番と発光を保持し、移動を35%にする。durationは同じ、result/opening/variantの判読を消さない。独立eventは別slot/別原因として描く。多数同時に上限を置く場合、必須イベントをunsupportedからomittedへ偽分類しない。
- 検証ケース: 正規lead/mercuryの実producer成功、初回frame ready、消費/スタミナ/100creditsが一度、重複snapshot同clock、一意slot同時2event、別event再発、hiddenowner/owner不在/vent/death/offscreen/partialscreen、start前/expiry同値、zoom/DPR/resize、reducedmotion、mute/verify/suspended/late receipt、音stopと各resource破棄。

創作側CPU検査は構文、投影、時相、有限PCM、独立uniform、API所有境界を証明する。本編port/実GPUコンパイル/画素/実聴感を代用しない。品質受入はH64初期200ms・供給700ms・変換1500ms・結果2100ms・終盤3300ms・終了3600ms、通常連続再生、world/glow/flare OFF差分、源移動/visibility、重複で主形と因果を観察し、主担当提供の実証拠をSolが判断する。未観察はnot_run。

## 受入状態

ソース設計・port契約: 納品候補。JS構文/CPU挙動: proofs.jsonを参照。実GPU・H64画素・音の聴感・gallery初回次loop・本編実操作: not_run。ユーザー採用: unadopted。本編readyを戻すという技術目的と、最終E品質・本編統合の受入は別。残る独立判断は実GPUの合成画素と専用音の品質、本編visibility/audio lifecycleの実証、公開統合のみ。
