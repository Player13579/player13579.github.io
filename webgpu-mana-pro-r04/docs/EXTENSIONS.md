# B拡張の選択 / r0.4

基底はユーザー提示のB Foundation統合版2026-09-11、拡張は多層VFX改訂2026-09-23。起動判定はExtensionActivationTableを正本とします。機械用インスタンスは `B-Expression-2.json`。正式な設計JSONは完全展開し、PH／OBSのrequired等を実IDとして登録していません。

| 選択した拡張 | 根拠 | 今回の責務 |
|---|---|---|
| VFX | マナの供給・吸収という世界内現象の明示依頼 | 外側の供給、境界、身体内の状態を結ぶ。各層はworldまたはobservationの一方のみ |
| PostEffects | 必要な観測PostEffectsを使うという明示依頼 | OBS2の局所bloomとOBS3の固定表示変換だけ。無関係なgrain、光条、flareは追加しない |
| LuminanceDynamicsModule | 明示VFX／PostEffectsと低明度余韻の要求 | 強い源と暗い溝、接点、定着後の放射減衰。既定の低強度で源を消さない |
| BeautifulPoseCapsule | 受益者身体と前後・支持関係を扱う | 診断fixtureのstandingを記述。実ホストに立位や固定身体比率を強制しない |
| GradientAnchorPolicy | 有色供給と受領面の状態差を属性具体化 | PHの発光分布／面応答にアンカー。背景だけに無根拠な虹色を作らない |
| VideoGenerationPolicy | 全寿命の連続再生、actor時相、SFX同期の要求 | 一本の1.5 actor秒timeline。900msは同じ相の最小寿命写像。プレビュー周期をEの別時計にしない |

KeywordExpansionは不起動です。仕様説明中の短縮キーワードを依頼の選択として検出しません。CharacterPolicyもこの診断インスタンスでは不起動です。新しい人格・年齢・性別を設定せず、既存身体の無人格な検査proxyを使います。実ホストの人間キャラクター設定が渡される場合はそのIDと明示属性を保持した適用が必要です。

反射の可読性に基づくMicrofacetFieldは、今回の直接発光とmatte proxyの簡略表示には選択しません。ReflectionClosureには不適用理由を残します。Thermo／Fluid／Electromagneticsなどの非該当領域もPHから削除せず、存在しない熱源・風・電荷を作らない理由と共通媒体条件を保持します。

PostEffectsの予算とSamplingContractは基底OBS側の一つを参照します。LDMに別の全体予算は置きません。世界の主形をOBSで生成せず、OBSの依存関係も非循環です。自動テスト・構造検査・実GPU・芸術的採否の結果は分離します。
