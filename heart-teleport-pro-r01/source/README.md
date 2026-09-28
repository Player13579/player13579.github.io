# action-heart-teleport — 内折れ脈室

B Foundationから独立設計した、private receipt専用のWebGPU/WGSL VFXと一回限りのSFXです。画像・テクスチャ・既存音声素材・外部ランタイムライブラリは使いません。Eのソースコードと検査治具の納品であり、画像生成モデル・動画生成モデルは実行していません。

**実GPUでのWGSLコンパイル・画素・視覚品質、実聴、本編接続は未実施です。製品品質を合格扱いしたリリースではありません。** 実施済みの契約検査・構造監査・ミュート下の実Web Audio検査と、未実施項目を `reports/RESULTS.json` に分離しています。

## 起動

ZIPを展開し、このREADMEがあるディレクトリで `python3 tools/serve.py --port 8765` を実行します。Windowsでは環境に応じて `python` を使います。WebGPU対応ブラウザから `http://localhost:8765/` を開きます。ファイルを直接開く方式ではなくlocalhost/HTTPSを使用してください。

標準ページは暗・明の2背景に、**エフェクト枠H64 = 64 CSS px** を実寸表示します。DPRだけを実画素数に反映します。自動ループは「1800msの寿命＋400msの無表示間隔」で、各周回は別の模擬権威IDです。同一IDをループさせる実装ではありません。複数原因では3 IDを140msずつずらして受け取り、別々の寿命を保持します。

`http://localhost:8765/?verify=1` は完全無音です。AudioContextもAudioBufferSourceNodeも作りません。通常モードでは「音を有効化」を実際に操作した後の新しいreceiptだけが鳴ります。既に無音で消費したIDを後から鳴らしません。「同じIDを再送」は再描画・再発音の拒否を確認するための操作です。

`http://localhost:8765/tests/browser.html` には、暗明それぞれ109時刻標本、1.8s端点、reduced motion、8原因、PH層分離、PSF無効、同時刻反復のGPU検査を用意しています。**このページの実GPU実行結果は本ZIPにはありません。** 実行後にJSONを保存できます。数値検査のpassは芸術的評価のpassではありません。

## 表現

外へ飛ぶ転移輪・対象までの線・人物の消失ではなく、発動者の位置に小さな二葉状の脈室を成立させます。左右の輪郭と内側弁を非同形にし、下端に心尖を残します。濃い葡萄色の膜、珊瑚色の内向き充填、白金色の局所脈芯を別の機能へ割り当てます。人体や切断された臓器の描写ではありません。

| 表示相 | 実現 |
| --- | --- |
| 0–460ms・準備 | 二葉膜と切れ込みが先に読める状態へ立ち上がる。**正規receipt受信後の表示相**であり、先行UIやBODYの準備姿勢ではない。 |
| 460–980ms・作用 | 内側の弁が一度だけわずかに閉じ、膜内の充填が中心と心尖へ収束する。対象方位・移動距離は表さない。 |
| 980–1800ms・消失 | 脈芯が先に減衰し、膜が遅れて消える。1800msでは描画をゼロにする。 |

PH1は膜・境界・弁、PH2は内部供給・脈芯です。L1–L3の主形状はglowがなくても存在します。OBS1は既存放射に束縛した小幅の解析的PSF近似、OBS2は露光肩と線形premultiplied合成、OBS3は同じ原因のprivate音声表現です。PSFを物理的lens ghostと呼んだり、世界内粒子として登録したりしていません。

SFXは独立合成したmonoの一つのPCMを、一つのAudioBufferSourceNodeで一度だけ再生します。柔らかい低音の共鳴から短い締まり、細い残響へ遷移します。Panner、対象側の定位、移動whoosh、BODYの心拍、kill/death結果音はありません。同時発生時のgain和は0.40へ制限し、gainの変化は5ms時定数で接続します。これはデジタル振幅の規約であり、実機の音圧や聴感を保証する値ではありません。

## 固定権威契約と情報境界

`server/issue-receipt.mjs` は、サーバがcommit済みの心臓転移を検証した後で、単一の既存magic IDを持つreceiptをcasterだけへ発行する境界です。`type=action-heart-teleport`、`radius=64`、`x/y=caster位置`、`playerId=caster.id`、`viewerId=caster.id`、`variant=target.role`、`targetId/targetX/targetY` を保持します。対象を移動させる関数や、kill/death処理は呼びません。

クライアント側では `src/contract.mjs` で必須fieldを検証した後、**id・playerId・casterX・casterYだけ**を新しい投影objectへコピーします。そこに受信時刻と期限を付加します。対象ID・対象座標・roleは投影object、SFX、画面外判定、乱数へ渡しません。roleはwire契約として保持されますが、今回の描画・音色の分岐には使いません。`radius=64` という権威metadataと、H64というCSS描画枠は別の量です。

viewer/self/ownerは全て認証された自己IDとして照合し、room/sessionも照合します。カメラの注視対象やspectatorの選択を、認証viewer IDの代わりにしてはいけません。不可視・画面外・遮蔽・hidden document、または可視性が不明な場合はfail-closedです。受付時に抑止されたIDは消費済みにし、後から表示しません。表示中の抑止では残寿命を終端し、再開しません。単純な矩形の部分露出はclipRectで制限できます。未知・非矩形の遮蔽はホストがoccluded=trueとして全体抑止してください。

ホスト所有の `ReceiptLedger` はモジュールの再mount間でも保持します。自動evictionやclearを行いません。満杯になると新規を拒否します。IDはホストが正規と判定する不透明な文字列または安全な整数で、製品側のprefixを推測していません。再接続・ページ再読み込みを跨ぐ再送の正規性とreplay拒否は、ホストのsession/transportにも責務があります。ページ内のledgerだけでサーバの永続的replay防止が完成するとは主張しません。

## 本編への接続

ブラウザ側の入口は `src/index.mjs` の `mountHeartTeleport` です。型定義は `src/index.d.mts` にあります。WebGPU初期化後にprivate receiptチャネルへ購読します。UIの先行姿勢・クリックを直接emitする入口は公開していません。

ホストは次を供給します。

| サービス | 必須の責務 |
| --- | --- |
| subscribePrivateReceipts | 心臓転移の権威receiptだけを通知する。解除関数を返す。GPU準備前の古い通知を新しい受信として再包装しない。 |
| verifyEnvelope | サーバ署名または同等の権威をpayloadとscopeに束縛して検証する。必須で、trueの既定実装はない。入力はサイズ制限済みのJSONとし、UIのboolean flagを証明に使わない。 |
| isCanonicalId | DVAの正規ID規約で確認する。fixture prefixの流用は禁止。 |
| getContext(causeId?) | 認証self/viewer/owner/room/sessionを返す。ID指定時は**その成功時点のcaster座標履歴**を返す。別IDや現在BODY座標と混同しない。 |
| getVisibility | casterだけの不可視・遮蔽・画面外・document状態を返す。不明を可視とみなさない。 |
| projectCaster | caster座標だけをcanvasローカルのCSS pxへ投影する。対象情報を参照しない。 |
| ledger | 同じ正規IDの再表示を防ぐホスト所有ledger。再mountで使い捨てない。 |

返される `unlockAudio(event)` を実際の操作イベントに接続し、離脱時には `dispose()` をawaitします。音がunlockされていなくても視覚効果は条件に従って動き、過去音の遅延再生はしません。

サーバ側では `createHeartTransferIssuer` に、commit済み転移を確認するサービス、正規ID判定、永続private outboxへの送信、server ledgerを渡します。`sendPrivate` は宛先casterに限定された既存の認証チャネル/outboxである必要があります。通信失敗の再送はoutboxが同じreceipt/IDで行い、新IDの転移を再発行しません。DB transaction、鍵管理、ネットワーク認証、DVA本編への配線は本ZIPで実接続・実証していません。

`demo/fixture.mjs` は検査用の模擬権威です。暗号署名ではなく、製品コードからはimportしません。プレビューの成功を本編の権威成功とみなさないでください。

## 検査・再現

依存ライブラリなしの検査は `npm test`、PCM数値記録は `node tools/analyze_pcm.mjs`、構造監査は `python3 tools/audit.py` です。Node 20以上を対象にし、納品時にはNode 22.16.0で実施しました。構造監査はこの実装専用であり、Bリポジトリ同梱validatorを実行したものではありません。

`tools/check_audio_browser.py` はPlaywrightとChromiumがある環境で、外部URLを開かずメモリ内ページを使って音声graphを検査します。`--chromium` で実行ファイルを指定できます。自動操作のtrusted input後、ミュート下でsource開始・重複抑止・解放を検査するもので、実聴ではありません。

SHA256の照合は **検査ファイルを書き換える前に** `python3 tools/manifest.py` を実行します。検査後に結果を更新した場合は `python3 tools/manifest.py --write` で新しいmanifestを作れます。これは新たなローカル記録であり、納品時のmanifestや署名を継承したことにはなりません。manifestは自己参照を避けるため自身だけを除外します。

## B正本と完成判定

設計の創作正本はこの会話へ継承された基底2026-09-11と拡張2026-09-24です。GitHubで確認したB commitは `8ad8e9b07ab8dc8737dd9b4022a775bce61d16e1`、基底blobは `4e10a53310be5b9d0aa3a6c881cf4f39d6590bd4`、拡張blobは `0eda016558e426ff4142d850d26200b40fafd834` です。これらはGitの識別子で、納品manifestのSHA256とは別です。全文バイト同一性を再照合したとの主張はしていません。

`design/00-contract-lock.json` が先行する設計・権威・拒否・PH/OBS・時間・検査計画です。`design/B-design.json` はB-Expression-2のVideo設計（operation=design_only、1.8秒）として完全PHを展開しています。E実装を新しいImage/Video modeへ偽装していません。137件の規則対応表では100件を適用、37件を非適用として理由を記録しています。

本Eで人体を描画しないためCharacterPolicy・BeautifulPoseCapsuleは起動しません。今回の「magic ID」はwire識別子の説明として扱い、魔法/Magic/MagicArchitectureの表現preset選択へ読み替えていません。VFX、E実装分岐、選択PostEffects、LDM、色相アンカー、設計timelineだけを具体化しています。

既存E、Sol/Astra案、通常転移E、BODY造形・コード・音の内容は創作入力にしていません。DVA候補リポジトリのrootディレクトリmetadataのみを確認し、そこに列挙された既存Eの内容は取得していません。本編ファイルは変更していません。

**未完了の受入**は、実GPUのshader compilation、暗明H64全寿命の画素・動き・可読性、GPU資源解放の実デバイス確認、実スピーカー/ヘッドホンの聴感、本編の認証・private配信・BODY/結果音との共存です。納品内のFinalStatusはSpecification Warning / Render NotRunです。
