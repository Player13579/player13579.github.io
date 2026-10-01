# future map image creator へ渡す支持・動的契約

これは新画像生成依頼ではない。現行 r7 は同 dry original を編集せず使う。将来 imagegen code は別の ChatGPT Pro map route、runtime E創作は GPT-6.1-Sol、忠実 adapter は settled contract に従う worker として区別する。

現象から支持設計を決める。医療室の洗浄設備は、常設 nozzle が下を向き、空中fall pathが開き、凹んだ受け皿の内部に接触点/排水口があり、rim が水を遮る構造を持つ。静止画に設計するのはこの形、材質、dry chrome/white ceramicの反射、凹み/contact shadow、排水口。水のrunning stateは runtimeに渡す。原画に作動中jet/drop/splash/wet rippleを描くとOFF時にも残るため、動的部分の焼込を禁止する。

全室の現象を先に比較する。現在r7は metal cart と sink脇の既存薄い白い折り布を室内airへ応答させる。常設支持台/clothrestshape/folds/contactは静止原画、flutter/elastic settlingはruntime。currentrect[254,156,312,229]/[791,136,834,166]は現在の同画専用。将来画像ではclothの材質/厚み/支持点/可動部分/背面と下地も静的に定義し、runtimeの法線/接触/変形域を独立登録する。布を空中に固定したり、flutterの途中poseをtextureへ焼いてOFF時残すことはない。air causeとcloth dynamic stateはwater producerと別stateにする。bed/metaltray/frameはcurrentr7で静止支持、material光のみ。全設備の採否理由はDESIGN表。

現原画の登録は dimensions1164×1351、nozzle887,188/contact885,234、sink broad bounds777..1004/109..357、bowl ellipse888,233/r63,37、bowl interior811..967/190..273、fixed field original px。r7物理 basisはXY533.3333/320pxm、Z152pxm、46px fallである。これらは現在の画を読んだartist登録値で、将来の別原画へ自動コピーしない。新原画の creator は equipment占有/出口/受け皿/排水/occlusion geometryを自身の設計から数値保存し、原画で再測定し、newhash/newbasis generationとして runtimeへ渡す。

静的／動的の伝達構造は `{image:{src,sha256,width,height,staticState:'dry'},equipment:{id,kind:'sink',nozzleOriginalPx,receivingBowlMask,contactOriginalPx,drainOriginalPx,opaqueRimMask,registrationGeneration},environmentSource:{stateAuthority,sourceClock,sourceOnOff,flowEnvelope},dynamic:{jet,fallingDrops,contactSplash,wetFilm,ripple,draining,dryCutoff},lifecycle:{normalOff,finiteResidual,cancel,cleanup}}`。source authority 未接続なら gallery-demo と明示し、gameplay receiptを捏造しない。newimageで nozzle/受け皿/rim支持が不足した時は geometry source契約を直し、水の大きさや位置をruntimeで勝手に調整しない。

将来静止画像VFXを選ぶなら、設備/材質を示す恒常的な支持表現に限定し、その具体的 target/location/expectedpixelsを明示する。一時現象の存在と同義になる水、浮遊物、葉、煙等を常設 textureへ入れない。部屋ごとに用途と物理因果を選び、この洗面器の水を全室に反復しない。

最終確認は sourceON、sourceOFF直後、残滴、余韻終了、部屋/画像変更後の全phaseで一時現象が消えること。画像VFXの設計/生成、runtime E、実画面品質、geometry/game接続、掲載、採用はそれぞれ別statusとする。今回map SFXは明示依頼がないためnone。
