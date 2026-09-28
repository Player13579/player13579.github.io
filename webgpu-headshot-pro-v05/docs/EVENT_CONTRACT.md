# 正規イベント・時間・権限

## 入場

`verifyCanonical(packet,{roomId,epoch})`が認証済み配送・部屋所属・受信者への配送許可を確認し、`{event,roomId,epoch}`を返す。packet内の`trusted:true`などは証拠にしない。ローカル乱数でheadshot抽選を再現しない。

正規化後のeventは `type,id,playerId,targetId,x,y,radius,variant,atMs` のみ。typeは`action-gunner-headshot`、radiusは150、variantはhip/aimとhandgun/smg/assault/sniper/taserの10通り。ただし10通りは**同じEへの入力検証**であって10種類の制作条件ではない。位置は凍結して既存targetへ追従しない。`atMs`はホストが同一の非加速ms時計へ明示変換するキー名であり、未確認のサーバー時刻キーを推測しない。

## 可視性と世代

受理時と毎frameに`getPermission`を呼び、`targetVisible/contactVisible/targetPresent`が全て厳密なtrue、targetGenerationが有効な文字列である必要がある。不可視/別世代/対象消失ではVFXとSFXを終了する。正規だが不許可のIDも消費し、後で可視になっても同じIDを再生しない。

さらに各frameの`makeVisibilityMask`を全world/OBSパスへ渡す。Rは可視性、Gは既存面の拡散応答、Bは既存光路、Aは保護域。未提供のsurfaceへ光を足さない。PSFは現在の源・宛先・途中も検査する。maskは128²の有限解像度なので、極細い遮蔽はホスト側で保守的に拡張する必要がある。E単体で完全なシーン遮蔽を再構築したとは主張しない。

## 時計・期限・重複

イベント発生時刻とsourceNowは同じ非加速時計。RateClockは0〜4倍の履歴を積分してageを得る。到着遅延420ms、未来許容8ms、絶対寿命上限2000ms、音の開始許容85msは継承した技術値。8ms以内の未来でも発生前は出力せず、遅着は既に経過した時相から始める。必要な時計履歴が無い場合や巻戻りはfail closed。

部屋epochは再入室を含め単調増加。検証promiseが部屋変更後に戻っても拒否する。描画16件、音8voice、検証pending64件、ID台帳4096件が上限。容量超過を待ちキューにして後で噴出させない。

このパッケージの専用プレビューは、遅いframeで全寿命を飛ばさない提出追従時計を使う。これは本編時計ではなく検査条件。現実時間を引き伸ばした場合のAV同期・性能は別途検査する。

## 音

`audioAttempted`をplayより前に立て、unlock前・失敗・遅延・容量超過でも同じIDを再試行しない。再生中の速度変更は同じBufferSourceのplaybackRateへ反映し、0倍時は固定PCMのDCを出さない。不可視/世代/部屋変更は直ちにgain0とstop。観測canvasやSFXのテスト数を増やしても同じゲームeventを多重発音しない。

## 他イベント・生死

`action-shoot`とは別IDであり、近接時刻で1対1対応や共有causeを捏造しない。既存銃声busを呼ばない。弱化弾/ショック弾にこのheadshot eventが出ないのはサーバー側契約であり、Eがローカルで補うことはない。taserはショック弾modifierと同義ではない。ペネトレイトの別着弾を消費・結合・抑制しない。

本Eはキル確定前の接触。死亡/破壊/出血/スタッガー/反撃停止を描画せず、HPや姿勢を更新しない。射手死亡後に届いた正規接触を生死hintだけで捨てず、対象が同一世代として可視に存在する間は既存接触が有限寿命を持ち得る。対象消失/不可視/別世代なら終了する。

## 統合境界

ゲーム本編・ギャラリーへ未接続。verifyCanonical/getPermission/世界単位・投影/surface maskはホストが所有する。独立fixtureのWeakMapは配送故障を検査する台帳であり、暗号署名や本番認証の代用品ではない。
