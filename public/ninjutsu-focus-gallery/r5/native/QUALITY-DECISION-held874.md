# 忍殺 R5：874.7ms の限定実描画判断

**限定成立**：同 event24／874.7ms の実 OBS ON/OFF を個別に見た。中空の赤白の源から相対焦点へ、一つの連続した赤い三角形の収束面がつながる。OFF にしてもその面は残り、円と点を数本の hairline だけで結ぶ R4 の弱い接続とは異なる。強い白い四 crescent と空洞、有限の小焦点も保たれる。この一時相では、R5 の「主接続面を一つの収束場へ置換する」狭い創作意図が実画素に現れている。

ただし円形の源が占有と強度では依然として主に見える。接続面は細い三角形で、源から焦点への集中方向は読めるが、場の全寿命の階層が成立したとは言えない。源 glyph の維持は契約事項であり、円が強いこと自体を新たな禁止条件にしない。874.7ms は release864–1200 の始まりで、移動 front が終わった120–576の主作用区間ではない。今の観察だけで主作用中も reticle が支配している、あるいは front の動きが失敗したとは判定できない。

R4 の source-bound 662.4ms OFF では数本の細線が接続を担っていた。R5 は今回は別 cause／別 phase の874.7ms。これは構成とコード意図に対する限定比較であり、同時相・同 cause の前後 A/B や速度の定量比較ではない。R4 の旧限定成立／未達2324057eと、作者・撮影・runtime の帰属は保持する。

## 実画素とコードの対応

三枚は個別に開き、元 JPEG bytes を PNG名のまま保存した。いずれも1049×712の画面画像。canvas の backing980×620、CSS rect951×622／client949×620／DPR2。canvas 全体は画面下で切れるが、今回の源・接続面・焦点はすべて見えている。黒背景の隔離fixtureであり、人物原画・手・対象への実登録は観察していない。H64宣言だけから実人物サイズを認定しない。

源の中心は黒い空洞を保つ。白い crescent の外側は赤く、右上の相対焦点へ先細りの赤い面と明るい中心供給が続く。小焦点は有限の赤い輪／白い点で、実対象の死亡・忍殺成功・命中結果ではない。強い白と意図した平面の focus field は許可される。偽の3D厚み、粒子や装飾の不足を未達理由にしない。

最終 creative module353dd263a31a311e85b2c8b694cfceb89fa6a2e4fd451eee34ad483386799577、FIELD36f5194a9d8c04e2275a03656d1a29aa0d834e47cf98bade9592df80a6bf80ca、POST28f444c75e42ae11702d3749fcdac7f817acb6f4487380a4d45768003a10c1aaに対応。creative、runtime inputs、stage 配信 module の bytes が一致し、runtime route manifest も同じ353dd pinを持つ。原封印34entriesのhash一致を読み取り専用で確認した。これは producer test の再実行ではない。JSONには各 screenshot の module hash が直接埋め込まれないため、root実撮影の版指定＋runtime/source/routeの結合として扱う。PUBLIC HTTPやgame接続の新監査はしていない。

FIELD_WGSL は source ring の内側を除外し、外側から focus 前方の有限端へ収束する単一支持を描く。赤い横断 profile、白い中心供給、同じ支持内の compact front を使う。874.7ms の fieldGeometry は alpha0.9970、progress0.7289167、eligible=true、frontTravel/frontAt=1。コード上の移動 front 振幅は travel1で0なので、この画像の白い接続を「移動している front」の証拠と呼ばない。4 crescent／焦点／cardinal marks と sourcecontour POST は保持された。同じ64byte field uniform／別PH・mask buffers／boundedquad契約は既存freezeに記録済みで、このレビューは ABI検査やGPU性能検査を繰り返していない。

## OBS と完了情報

ON は source周辺と収束面に局所的な赤い近傍応答を加え、OFF ではその応答が弱まる。OFF の実画素でも連続面・空洞・焦点が残るため、今回の接続改善は OBS だけによるものではない。ON の応答が空洞全体を塗り潰したとは見えない。sourcecontour glow を lensflare と新たに指定しておらず、ghost追加は今回の要求ではない。

同 cause `ninjutsu-gallery|24|ninjutsu-gallery-24`、event24、age874.7ms、reduced=false、playbackRate0。ON initial hold receipt は completed1416／commandCount10、screenshotはその後の同じ heldage のUI frame2008。OFF matching JSON は completed3093／commandCount5、画面HUDは3089。receiptと各screenがexact同一frameのペアだとは書かない。rootの同event・同heldage撮影と現在の完了情報を使う限定phase比較であり、startup submit2だけを現在の証拠へ流用しない。音はverify-muted、voices0、audio allocationfalseで通常SFXは聴いていない。

expiry画像は実1213.1msで黒いcanvas、state expired／drawnfalse／openFrames0。**これは blankな実画素とCPU状態の限定観察**。lastCompletedFrameは同eventの1194.3ms／frame5063で古い。1213.1ms／frame5064の現在状態に対応した完了clear receiptではない。したがって正確な1200ms終了、current GPU queue-completed retirement、expire後の残留なしを完全合格にはしない。

## 残りと次の最小観察

新sourceは作らない。今回の一時相では連続面を導入する狭い authored criterion が成立し、reticle が強いことだけでは新稿の根拠が足りない。全品質は引き続き未受入。

次の有用な観察は、同じ最終353dd sourceの実主作用300–420msを一度 holdして同cause OBS OFF→ON。移動frontが支持に属し、円だけではなく接続面と焦点への集中が主作用中に読めるか、ピークのOBSがそれを消さないかを判断する。さらに必要なら650–700msのOFF一枚でfront終了後の接続面を確認する。874.7msは後半持続の証拠として再利用し、同じphaseの再撮影やpackage監査は不要。二つのstillをnormal-motion証明にしない。

終了の技術的受入が必要なときは、expire後の実clear/compose submissionが完了したことを、current phase/source/causeに結び付けて記録する。古い E lastCompletedFrame をコピーして埋めない。normal1×0→1200のfront移動・lock引継ぎ・releaseの連続観察、reduced、実GPU frame cost、通常SFX、actor/device/public/game/adoptionは別途未確認。

現B22d3fcfd617f42b1a967de767906204c0221ec64のEquality/default Beauty/PEM、現Eのsubject/source/observer/actual-sizeを適用。差分schema省略は明示、全B構造passなし。rootが最終受入を決める。

モデル分担：GPT-6.1-Sol 100% — 今回の限定実画素解釈と品質判断。旧source／runtime／撮影の帰属は元記録を保持。
