# Cannon R7：まず本体が帯と楕円から脱したかを見る

判断する一つの創作課題は、R6 actual sourceON/OBS OFF220にも残ったsmooth blue/green band＋white oblique ovalを、R7のquiet密度・active放射・一つの斜めpressure frontが同じ供給材として置き換えられたかである。3D密度の数式、compactC1の名前、色変化やwhite域の縮小だけでは合格にしない。calmを消す全域減光へ退化しても不合格。strongwhite/sourceは許容する。

R6最初のQUALITY-DECISIONはOBS OFF未取得時の記録であり、その後samecause r6-samecause-220-obs-off/sourceON/reducedOFF/age220/endpoint760,270/continuousのON-OFFactualcompleted画像でmain不足が確認された。そのゲート完了はR7 frozenSOURCE-PINSにも保存されている。旧判断文を更新せず、この後続証跡と区別する。

## 初回は220ms二枚、その後必要な二位相だけ

| 順番 | 実入力 | 単独で変える変数 | 決めること |
| --- | --- | --- | --- |
| A | R7 beam220/sourceON/reducedOFF/continuous/OBS OFF | 基準入力 | R6 OFF220と同じfinite hand→endpoint支持で、主材のquiet/active/pressure差が最終画素へ残ったか。 |
| B | Aと同じactual cause/event/hand/endpoint/age/viewでOBS ON | observationだけ | 本体で成立した材を既存OBSが覆わず、同sourceの局所応答として加わるか。 |
| C | sourceON/reducedOFF/continuous/OBS OFF、beam150 | ageだけ（条件が同じreceipt） | source寄りのpressureと、その前後の供給材が同じ主形に属するか。 |
| D | Cと同条件、beam280 | ageだけ | endpoint寄りのpressureでもcalm材/active面/後流が残り、単独のwhite片にならないか。 |

A/BでR6同様の帯/楕円、calm消失、active独立線など明確な不足が見つかれば、先にそのframe/source/表示条件を保存してSolへ返す。多数phaseや新稿を惰性で追加しない。A/Bが改善を示した時にC/Dでphaseごとの材料関係を確かめる。A/Bのみなら220の限定pass、C/Dも通れば観察した150/220/280の限定材料passとする。正常運動や全420のpassにはしない。

OBS対は同じ実cause/eventを保持してtoggleだけ行う。phase holdが同じreceiptで可能ならC/Dも同causeとする。runtimeが別URL/新eventでheldphaseを作る場合は各実causeを記録し、同hand/endpoint/variantの独立phase比較と明記する。cause文字列を再利用しただけで同じlive eventや正常time seriesと呼ばない。未知のwindow APIを発明せず、Luna提供のleased verify route/実制御を確認して用いる。

R7のexact420completed expiryがruntime側でまだ無ければ、一枚だけ420を追加する（beam0/active0/expired1、fixture72、実画像にbeam無し）。既存R6 expiryをR7へ付け替えない。sourceOFF/900activation/全controlsは今回の材料判断に必要な新規一律項目にせず、source残像/停止異常やinput回帰が見えた場合の限定診断へ回す。

## 画像と実sourceを同じframeへ結ぶ

R7 VERSION alchemy-cannon-new-e-sol61-r7/runtime alchemy-cannon-sol61-r7。actual fetched effect SHA8c20b6c16e89318f9c415871dfb3fc0d62de2079508cd0a655fb65fc15aee130、actual imported SHADER46eac0a0311dcda64b227850d092cb0fb40f9c76c5464a57337227dacb53ae9e、audio683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170aをbind。実entry/dependency/version/expected hashesが同R7であることを記録し、compilecontextやR6captureをR7描画に使わない。

各png/raw imageとJSONにrequested/sample age、current cause/event/frameId、submittedSample/Draw、submitSequence/対象queue完了、sourceEnabled/observation/reduced/variant/endpoint、canvas CSS rect/backing/DPR、View16の実sizeと世界→screen変換を残す。ON300beam+fixture72=372、OFF294+72=366が期待値（既存fixture72の場合）。同settingsの提出後frameを撮り、旧firstFrame completedやvisibleSources eligibilityだけで現pixelsの証拠にしない。

R6 comparison originalsは両1280×720 imageで、canvas CSS/実viewport情報がsavedJSONに無い。R7でも同fixture/layout/hand160,270→endpoint760,270と表示サイズを維持できるなら、その範囲で相対支持を比較する。matchできなければqualitative形の比較に留め、全page pixel差率・絶対輝度差を品質指標にしない。新R7の正しいCSS/backing情報を必ず保存し、必要になった場合だけR6を同viewで再captureする。本番actor原画H64をfixtureやfooter宣言だけから認定しない。

URLはverify付き/audioMuted。normal音をここでunlockしない。owned tab/serverのみ終了後に閉じる。元producer testsは証拠を書き換えるため実行しない。既存mock/CPU/compileの反復やshader/runtime改稿はこのレビュー契約に含まない。

## 創作上の限定pass/fail

quiet材がsourceから供給された連続主形として残り、active側との違いが色だけでなく断面/折り返し/広い面の占有として読めること。pressureはその同じmassを横切る一つの有限斜め面として読め、単に白ovalを細くしたspotや独立decorative lineへ退化しないこと。main-onlyでこれが成立し、ONでもsource/bodyの因果を保つこと。sourceの短い強whiteとfinite endpointは維持する。frameの二つの非零色域やpixel輝度差があるだけで材質成立を認定しない。

C→Dは既存travel=smooth((age-28)/302)に対応するphase位置でpressureがsource側→endpoint側へ移る状態を確認するが、heldの位置差をnormal速度/滑らかさの証明にしない。wakeは同材の後方状態として残ること。最終像がcalmだけ暗くなった同じ帯/whiteellipseなら不足継続。白が強いことや選択していないlensghost不在は不合格理由ではない。CannonへExcaliburの刃先/ridge/切断テーマを要求しない。

いずれも凍結R7actual描画の限定判定で、R8designを先に作らない。fullnormal1×420/activation900、reduced/GBO2-10cause/小CSS/実actor登録/bright支持、実GPUfloat/frame/stutter、normalSFX/device、parentpublic/game/adoptionは別gate。static1exp/16depthやCPU収束を性能/最終品質へ代えない。現時点はR7未描画・品質pending。rootがactualcaptureと最終判断を担当する。

モデル分担: GPT-6.1-Sol100% — 本最小レビュー/創作合否契約。R6実capture/旧判断/R7創作/Luna runtimeは元の作者と証跡を保持する。
