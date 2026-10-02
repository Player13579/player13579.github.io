# Rocket Launcher E r4 改善契約

作者 GPT-6.1-Sol。派生元は現行 r1 creative SHA-256 `6c32c0414f095b883c37c17f8f923278fb4bcd9b3169c74331dc9c0e20071baf`。旧版、旧freeze、原画、技術hostの作者帰属を保持。旧版のゼロ設計を本版へ付け替えない。今回は既存版の改善であり、B loaderの差分例外を適用。新しい画像テクスチャなし。

## 決定した表現

実登録された tube mouth と rear aperture を根にする連続した前後の圧力噴流。局所幅の変化、三つの広い圧力セル、高温内部と低温燃焼面、有限の排気への変化で、単色の円錐から改善する。rearはmouth/顔へ移さない。発射寿命360/400 E-msは継承。圧力セルは視覚投影であり実圧力や追加damageの証明ではない。

仮想物理命中は保存済みの実fixture endpointへ瞬時に発生し、照準endpoint/移動弾へ置換しない。二つの独立fieldで、20段のfront-to-back emission/absorption積分により、歪んで拡がる燃焼前線・熱い内部cavitiesと、三つの非対称な支持volumeを使う煙を描く。火は620/700、煙は1040/1100 E-msで閉じる。既存receipt1200 E-msを延長しない。煙の立ち上がりは220–500msに分け、earlyの火をgray面で覆わない。煙の対流と広いfoldの移流、nearest-lobe normalとfold gradientに基づく陰影、内部暖色の減衰、冷たいdense core/広いlit folds/有限edge scatteringを実装する。流体・燃焼の数値解ではなく、有限のstylized volume projection。

局所optical spreadは同じjet geometry/露光/時計に結び付き、全画面gradeではない。既存の本物のsurface normal/albedo/positionから計算するLambert/range受光passを保持し、optical spreadを実受光の代替にしない。source3D位置はfixtureの仮定のまま、本編の高さや遮蔽を捏造しない。

SFXは短いignition、高圧の下降chirp、band-limited exhaust tailを異なる有限役割に分けたPCM。launch360ms/impact520ms/peak0.085を継承。real聴取は別の検証。

## 維持した因果・所有

`preview-rpg-use-r1` schema/hypothetical-preview-only、正規variant/radius/duration0、固定session/room/clock/source/approved pose hashes、64 attempt上限、privacy、同一source snapshot検査を保持。成功仮想impactだけ描く。防御/拒否/非可視は命中を描かない。本編receiptを拒否する。260ms body actionは煙で延長しない。別のgame launch/actual hit/damage adapterは未実装。

実submitのopaque receipt、同一source-current、one encoder、完了までbuffer保持、submit後のみone-shot SFX、verify/mute/hidden/unlock/消費済IDの無音を継承。mock passを実WGSL compileと表記しない。

## 受入境界

41 inherited contract checks、host ownership、371 focused checksを実行。実GPU compile/全寿命/原寸暗明/normal-enhance/reduced/4-8同時/性能/通常聴取はprimary-owned確認。未確認はnot_run、採用unknown、本編not_connected。登録はnative technical replay成功後。採用・品質合格へ自動昇格しない。旧native結果はprovenance/r1に残し、本版の証拠へ流用しない。
