# r1忠実実装契約

この原本を変更せず、別のruntime/attemptで忠実WebGPU移植・focused tests・ギャラリー技術再生を担当する。対象正本checkoutの絶対パスは親担当が確定する。本編へのユーザー採用はまだない。全参照はこのr1をsourceとし、旧Pro prototypeの造形/音/時計を混ぜない。

1. `artist.mjs`をそのままimportする。`world.wgsl`と`post.wgsl`をそのままfetch/compileし、192-byte uniformと6頂点triangle-listで描く。main/receive/stars/postをONにした既定を毎回独立初期化する。新規画像、Canvas2D、GPU→2D readbackでゲームを描く経路は禁止。
2. world bind group: binding0 uniform、binding1実actor atlas texture、binding2 filtering sampler。actorRectHは元sprite quadのleft/top/right/bottomを足原点H単位で与え、atlasUvは実cell crop。余白込みquadHを実alphaHと混同せず、原画の可視身体高がH64か測る。atlasのアスペクトを歪ませない。actorTex未提供時の独立ギャラリーは白1px alpha0 textureをGPUで生成してreceiveEnabled=0とし、身体があったと主張しない。身体成立は後で実本編actor登録で検査する。
3. 同一camera→screenのanchorPxとactual projected actorHeightPxを与える。event x/y/owner/cause/receipt identity/serverAtは保存。event.radius=145はmetadata、Hは145へ拡大しない。固定1200msをreceive localizerのstartedAtへ結び、既にlocalizedなら二回receiveNowを付け直さない。actor倍率/timekeeperでtを掛けない。
4. world back pass=0→既存actor→world front pass=1→post の順。バック面は実actor alphaで隠れ、前面は原本のface maskを持つ。linear working RGBA16floatが望ましい。world blend color srcFactor=one,dstFactor=one-minus-src-alpha,operation=add、alpha one/one-minus-src-alpha。RGBは放射をcoverageと分離したpremultiplied radianceであり、更にalphaを掛けない。post blend color=one/one add、alpha zero/one（RGB add,alpha不変）。最後のsRGB/tone/display変換は既存パイプラインを記録し、白芯を勝手に減光しない。r1はHDR数値を持つので低精度targetのclippingも観測し、全体輝度を下げて解決した扱いにしない。
5. scene遮蔽/画面外/actor消失/寿命外は適切なreason付きのclaim省略。場とsourceの実可視性を別に扱う。sourceVisibility=0ならsource芯と源glowを0、主面は独立に可視性判定する。原本は壁のdepth maskを自前で持たないので、本編providerが既存scene遮蔽に従って全体passを省略・clipできる必要がある。未提供で完全遮蔽対応を宣言しない。
6. receiptKeyは本編の安定したevent/session identityを使う。idが欠けている場合、authoritative queueが保証した一回のidentityを使う。snapshot序数/今時刻/座標だけをkeyにしない。receipt store墓標はsession全体で保持し、再接続再送で再発音しない。別receiptは同時でも残す。ゲームのRational判定/30秒判定/spendManaをrenderer内に複製しない。gain-manaを捏造しない。
7. SFXは同じreceipt cause。artist.mjsのAudioBuffer源または同梱WAVのbyte-identical再生を使う。1200msで止まり、タブ破棄/版切替でstop。verifyは音声0を強制し、通常URLの最初のユーザー操作でAudioContext解錠。ギャラリーは次の新しいループreceiptから同期開始し、解錠前receiptを遅れて鳴らさない。版固有音を汎用beepへ置換しない。
8. 独立fixtureのdark/light H64、main-only、receive OFF、stars OFF、post OFF、back/front単独、sourceVisibility=0、H48/H96、通常連続RAF、0→終端後、normal/actor-speed-change時のpresentation不変、複数receipt、null-claim理由あり/なしを検査。各条件を独立初期化する。6頂点/instance/セルの実出力を記録。美的見え方とWGSL技術修理は別判定。源・面・受領・後半・有限音すべてを観察した資料をSolへ渡す。
9. 実再生可能になるまでギャラリー一覧へ出さない。表示名は「有理化による能力消費免除」、正規event `action-rational-free`、version `sol61-rational-free-r1`、author `GPT-6.1-Sol`、quality `未検証`、adoption `未採用`、gameConnected=false。受入資料が増えたら技術再生/品質/採用を独立更新する。原本SHAとadapter差分を保持。

## 残る判断と返却

限定runtime担当は技術実装/検査を進めてよい。主形の翼/防護/回復誤読、顔干渉、主面が隠れて小光になる問題、星の原寸消失、聴感、実間引きによる動き欠落は観察証拠を返し、Solが品質判断する。公開/本編接続/台帳/最終受入は親担当が統合する。採用前の本編置換を行わない。

## 発光・合成の近似

r1は解析的2.5D開面。source-bound postは理想化されたdisplay spreadであり、GPUの閾値抽出blurや実カメラレンズシミュレーションではない。人物応答はsprite alpha内の局所表示光であり、実表面法線からの照射・microfacet reflectionではない。後段はこの近似の強み/限界を保って検査し、実物理完了と宣言しない。
