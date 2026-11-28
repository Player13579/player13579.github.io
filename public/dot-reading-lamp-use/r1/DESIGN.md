# 閲覧灯の利用成立 R1「傘の内面を渡る反射」私有候補
正規 v920 Main 8e156eb0107265628491d621ae25d03de415e7fb / Worker ada6d9021d9814e01bfb4b5fdb548b70f82d5639、使用処理の直接 object-readingLamp 通知だけを表現。指定閲覧灯 v302-archive-readingLamp-3、effectKind=mana、radius=100、duration=0、空variant、対象なし、本人 owner、同じ灯IDを含む map-object:...:object_use_... のcauseのみ。wire自体を送信時に本人限定と主張せず、ギャラリーホストで本人の再現を限定。別gain-manaには非反応。同じcauseのwire再交付を同じIDへ正規化。絵・音は位置、MP、量、客体の場所、押し方、点灯状態を表さない。
固定した傘断面の内面のみに、短い曲がった半透明の反射帯を一度滑らせる。傘本体と背景の明度は前後不変。内外の境界は独立メッシュ域と滑らかな縁マスクで保護し、外部発光・滲み・照明・粒子・文字を出さない。640px用の描画拡大を前提にせずH64スケールを検証。760msでメッシュゼロ、動き軽減では幅と位置を固定して包絡のみ。付随する短い確認SFXはgallery許可時の同一causeだけ。
DVA開発 §4、B基底同期版4660b1b（描画・比較検証）、拡張e0fe7a0（適用選択/LDM/WebGPU実行時E）。WebGPU実行、CPU、見え、音を分離して記録。本編未接続、採否・公開・聴感・本人実機は未検証。
