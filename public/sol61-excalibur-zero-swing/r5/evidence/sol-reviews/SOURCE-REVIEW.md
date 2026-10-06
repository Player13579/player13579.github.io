# Excalibur R5 版固有の source 監査

結論: R5は有限の収束→剣表面受領→swing peak→gold放出→clearを実行するWebGPUコードを持ち、faithful adapterの6創作moduleは凍結bytesと一致する。これを実出力の品質合格にはしない。native画像・通常聴感は未提供。R5上限を保持し、採用unknown、ゲーム接続not_connected。

## 規則から実行コードへの対応

| 適用規則 | 実関数・式・pass | 読めるべき帰結と限界 |
| --- | --- | --- |
| PhysicalModelClosure / VisualCausality / VFX.TransportTemporal | planCreativeFrameの14source/7対、current mapImagePoint、124..220到着、20ms deposited、90ms transfer | 受領以前のrimゼロ、剣上の受渡し。normalized field ledgerは架空場の演出量であり質量/ジュール/光速を実証しない。 |
| VFX.SpatialMorphology / DeepStructure | packetFieldの曲がったleading ridge、二つの不均等lobe、cavity、有限envelope | 2D/2.5D radiance sheetとしての主形。厚みの数値ソルバー・3D体積散乱ではない。実出力の立体感は別観察。 |
| VFX.MaterialOpticalResponse / ReflectionClosure | fsのmaterialMask、source-affine transverse facet、bevel roughness、conductorReflection GGX/Smith/Schlick、studioRadiance、handle diffuse*(1-F) | steel/gold導体とhandle誘電体の応答を区別。固定orthographic view、author studio RGB近似であり、測定gold光学定数/本編IBL/実3D形状ではない。 |
| KeywordExpansion リムライト / LDM | received field→edge*68、spine*16、gold shoulders*5; transfer/finite dissipation | 実剣のsource maskに受領後の光。既存画像tintをruntime emissionと呼ばない。v1..v6や全E共通星を追加する必要はない。 |
| ObservationRegistrySeparation / SourceBinding / IntensityBudget | world/emission別rgba16float MRT→OBS sampleLight→near weighted PSF→actual-emission flux/moment→crossPSF+ghost→presentation | 反射radianceはemissionに入れない。sourceゼロでfluxゼロ。有限sampleとRGB camera appearance近似で、完全な光線追跡/エネルギー保存lensではない。 |
| CompositingReadability / Sampling | 1280byte uniform、2pass、HDR density/coverage/radiance別、displayMap共通ratio、premultiplied target | double-alphaを避ける経路が存在。native alpha境界、実寸、各OFFの寄与は未観察。白ピークを欠陥として減光しない。 |
| ECodeImplementation / DQ06 / DQ08 | exact same cause/source/epoch/350.5 peak、missing peakならreleaseなし、caller encoder submit、650 null→clear | shared synthetic drawable fixtureの所有が明確。本編の実actor hand/grip historyとは別。ゲーム判定や衝突を捏造しない。 |
| DQ09 / 現実動作SFX | ExcaliburSfxAdapterのcue一度crossing、45ms超past cue skip、cancel/dispose、verify mute、fresh PCM | 一回cueの接続と信号生成。剣の材質/運動に聞こえるかは通常聴感not_run。実録ではなく合成。 |

## 独立して確認した制約・懸念

1. **過去peakの放出birth**（sourceで実証、画素影響not_run）。28粒子はgroup別birth350.5+7*groupだが、origin/omegaはすべてpeak350.5。birth以前はdt0で止まり、birth後から古い剣位置で運動する。これは「peak時に放出済みで7ms後に可視化」なら、その間の輸送/遅れを実装していない。H64stationary fixtureのgroup3(371.5ms)で、最初のmember originとその時刻のdrawn blade位置は5.076px離れる。最大member差はPROBE-RESULT.jsonへ実測CPU値を記録。過去peakのfront方向を保持すること自体は正当だが、遅延birthを現在剣からの放出として合格にしない。no-jump/current sourceという説明との残る解釈差をnative350.5..390で確認する。R6/無断改稿を行わない。

2. **reduced motionのgallery経路**（adapterで実証）。plannerにはspread倍率 .35 の既定設計があるが、ExcaliburGalleryHost.renderはreducedMotionを受理/転送せずappにも設定経路がない。plannerのCPUテストを実gallery reduced-motion passへ転記しない。技術derivativeで既存optionを忠実に接続するか、未確認を保持する。新しい造形案ではない。

3. **adoptionのsource metadata**（adapterで実証）。元faithful gallery行612とpackage-sealはnot-adopted/unadoptedだが、現在の指定では採用はunknown、app snapshotもunknown。元凍結bytesを保存する。current-parent rebase担当はunknown label/group copy修理を連絡済み。この監査はその後続derivativeの実bytes/DOMをまだ観察していないので、修理済みとは報告しない。

4. **SFXの現実動作読解**（懸念、聴感not_run）。gatherは480→1420Hzのsin/非整数partial pitch sweep、receiveは972/1471Hzの固定partialと16ms envelope。swingはhighpass/lowpass noise、releaseは1180/1703Hz減衰ring+92/184Hz pressure+noise。架空場の音を選べるが、剣の空気切り/材質振動・有限減衰に聞こえるかを新しい現実動作SFX規則へ照合する。sweepがあるだけで無条件failにせず、電子beepで機構を代用していないかを普通の音で聴く。外部録音取得を追加義務にしない。

5. **全B coverage主張はpartial**（文書の実証、可視品質のfailとは区別）。B-E-AUDITはE後段対応表であって正式画像生成schemaではない。そのためImage/Videoの偽modeを要求しない。一方、「full PH structure retained」を総合合格とする証拠は不足する。registryのorigin/anchor/visibility/local_state_difference/partition_reason、各identityのlocal_state_difference/partition_reason、BeautyStructureApplicationのtarget_policy/axes/intent adjustment明細、完全なOBS registry fieldsとVFX layer/linkごとの具体化等が対応表では欠けるか別文書参照だけ。OctaDomainは8域を保持し不適用も理由付きだが、欄数/ラベルを科学的・美的成立の証拠にしない。DESIGN/実コードの実体を照合している本監査の規則表も、未実施の正式schema validatorやnative結果をglobal passへ変換しない。

6. **E-source surface reflectionは限定近似**。reflectedのinwardIrradianceはdeposited fieldとlateralから決めたsurface responseで、実source→面の距離/入射角積分ではない。直接key reflectionとOBSの別MRTは実装されている。world反射を発光/フレアと混同せず、この近似を精密radiometric reflectionとして主張しない。

## 検査と残り

凍結source 24file/6module及び元adapter 15overlay/10package/import closureのreadonly verifierはpass。これは前担当mock 9checksの再実行ではなく入力pin再照合。新しいprobeはactual planner関数を実行し、frozen peak birthとfinite packetの位置/尺度/減衰を数値化する。mock GPU・native・audioを実行しない。

source-only設計/接続の肯定範囲を超えて、創作品質受入、公開可能、user採用を宣言しない。native受入の具体条件はNATIVE-CHECKPOINTS.md。過去R1–R4の画像/判定をR5 passへ移さず、native連続像・source/observer介入・現在device/frame proof・通常聴感・実ゲーム姿勢・Safari/iPadを別に保持する。

モデル分担: GPT-6.1-Sol 100%（この版固有source/規則監査と判断）。既存R5創作、GPT-6-Luna adapter、root native作者の貢献は各元packageの履歴を保持する。
