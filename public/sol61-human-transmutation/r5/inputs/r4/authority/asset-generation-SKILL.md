---
name: asset-generation
description: Route DVA effects to Codex Sol, motion to Codex Sol, markers to Codex Sol, and DVA maps and Adobe Stock assets through their ChatGPT workflows. Use direct image generation for motion and allowed derivatives, and B code-first generation where required. Also audit game visual-asset needs and handle explicitly requested Stock uploads.
---

# 素材生成

**DVAマップの現行制作先**：新たにコード設計するマップ2のテクスチャを制作する。旧研究施設候補の破棄とコード・画像の受渡し条件は[DVA分岐](references/dva.md)を正本とする。

**マップ制作の工程（2026-10-01訂正）**：部屋・廊下のテクスチャ候補ができたら、採用を待たず環境E制作へ進める。コード指定のVFX/PostEffectsを対応する場所へ必ず実装し、未指定箇所への追加も状況に応じて選ぶ。原画＋技術再生可能な環境Eセットだけをギャラリーに掲載し、マップSFXはユーザー明示指定時だけ発生させる。現行採否・原本保全・個別制作経路・遮蔽物は[DVA分岐](references/dva.md)へ従う。

**DVA素材の制作担当（2026-09-30最新版）**：Eの創作設計・品質判断は、2026-09-30にCodexカタログで提供を確認したGPT-6.1-Solが担当する。忠実な実装・テスト・公開は最安の対応可能モデルへ分担できる。キャラモーションの創作設計と改稿はGPT-6.1-Sol、マーカーはGPT-6.1-Solが担当し、画像の実生成はCodex imagegenを使う。**マップの創作設計・Bコード・画像生成はChatGPT Proへ委任する。** Eは画像なしのWebGPU VFX/SFXとして制作する。過去の原本・作者・採否は制作経路の変更後も履歴として保持する。GPT側のモデル選択と受渡しは[マップ手順](references/dva.md)を参照する。

**DVA素材ギャラリー**：マップ・エフェクトを切り替え、採用済み/未採用を切り替える。固定のエフェクト初期表示は撤廃し、カテゴリの復元規則は[DVA分岐](references/dva.md)に従う。未採用素材の最新版を先頭にし、採用済み素材では現行採用版を先頭にする。Eは再生可能な歴史的Astra版と新しいSol版を作者・採否・品質・本編接続の別状態で保持する。Astraバリアとモーションは掲載しない。マップの掲載経路と個別例外は[DVA分岐](references/dva.md)に従い、除外された旧版も原本・来歴を保全する。再生不能版は掲載前に修理する。採用版を一つでも持つEはグループ全体を採用済み一覧へ置き、旧版はその版選択から表示する。採否未確認を不採用と断定しない。

**版ごとの採否と用途**：[DVA分岐](references/dva.md)とリポジトリの現行要件台帳・実際の公開ギャラリー定義を照合する。後続指示による採用撤回・用途変更を旧採用一覧で上書きしない。2026-09-30のバリアPro r0.7採用撤回、Sunbeam lens r05採用、旧Status Recovery r0.29の回復用途への再割当ては同分岐が所有する。ギャラリー掲載は品質採用や本編接続完了を意味しない。

DVAの掲載対象素材を生成・改稿したら、制作完了と同じ作業でギャラリー更新・公開まで進める。納品と公開の完了条件、未掲載理由の扱いは[DVA開発正本の素材制作とギャラリー更新](../dva-ate-maintainer/SKILL.md)に従う。

制作先を決め、対応する参照だけ読む。DVAとAdobe Stockの画像制作手順はここへ統合する（2026-09-21ユーザー指定）。ゲームへの採用・公開と、Stockへのアップロード・審査提出は別の操作である。

| 用途 | 読む参照 |
| --- | --- |
| DVAのキャラモーション・マーカー画像、その差分 | [DVA](references/dva.md) と [B Foundation loader](../b-foundation-loader/SKILL.md)。モーションの創作担当はGPT-6.1-Sol、マーカーはGPT-6.1-Sol、実画像はCodex imagegen |
| DVAのマップ画像、その差分 | [DVA](references/dva.md) と [B Foundation loader](../b-foundation-loader/SKILL.md)。創作・生成はChatGPT Pro、Codexは仕様受渡し・検証・統合 |
| DVAのE（エフェクト）の新規制作・修正 | [DVA](references/dva.md) と [DVA開発正本](../dva-ate-maintainer/SKILL.md)。創作設計・品質判断はGPT-6.1-Solへ委任する。ChatGPTへEを依頼しない。未採用のChatGPT依頼Eは破棄・ギャラリー除外する。画像生成工程へ送らない |
| Adobe Stock向け新規制作・内容修正 | [Adobe Stock](references/adobe-stock.md) と [ChatGPT共通制作手順](references/chatgpt-code-to-image.md) |
| 既存原本のAdobe Stockアップロード | [Adobe Stock](references/adobe-stock.md)。再生成しない |
| ゲームの新要素・視覚的意味変更の素材判断 | [ゲーム素材の判断と統合](references/game-visual-integration.md)。DVA以外の生成経路は当該プロジェクトに従う |

Adobe Stock の行は DVA 制作経路外の任意分岐である。実行する場合は、[Adobe 外部依存の解決契約](references/adobe-external-binding.md)で利用環境の正規参照先と内容を確認してから進む。正規参照が解決できない場合はその分岐を実行せず、DVA 用の B/素材手順へ代替しない。

## 共通の制作契約

画像制作が許される範囲では、2026-09-22の指示により、**Bとコードを省略して直接生成できるのは、キャラモーションと既存画像素材の差分だけ**。一般の「簡単な原画」へ免除を広げない。参照・変更点・保持条件・出力条件を自然言語で伝える。DVAで新たに制作する画像テクスチャはキャラモーション・マップ・マーカーに限り、新しいE（エフェクト）やその修正は画像生成へ送らない。DVA以外は各用途の規則に従う。明示されたコード納品やB指定を優先する。

DVAの新規マーカー画像では現行Solが現行B基底・拡張を読んで完全なB設計コードを作り、その完成コードをCodex imagegenへの実生成入力に含める。新規マップはChatGPT ProがBコードから画像まで制作する。キャラモーションと既存画像差分はB・コードなしで直接生成できる。Bの適用範囲は [B Foundation loader](../b-foundation-loader/SKILL.md#エフェクトなしの簡単な画像) を正本とする。Adobe StockなどDVA以外のChatGPT制作は[共通制作手順](references/chatgpt-code-to-image.md)が所有する。

コードのみ・スキル編集のみの依頼では画像を生成しない。許可されたゲーム画像素材の制作依頼では選んだ経路で画像生成まで続ける。DVAのE制作依頼は画像生成ではなく実装と実表示の受入へ進める。進行中の許可された画像のコード経路を、この例外追加だけで中断・再生成しない。生成結果と品質受入、ゲームへの統合、外部配布の完了を分け、実入力・原本・不採用試行と、作成した場合のコードを保持する。修正回数の独自上限を設けない。

**マップ掲載の最新条件（2026-10-01）**：一覧・版選択には再生できる環境Eとのセットだけを掲載する。選択中のセットは比較用に同じ原画のみへ表示を切り替えてよい。比較モードは独立した素材版や採用状態として扱わない。原本保全と着手順は[DVA正本](references/dva.md)に従う。

**マップの指定Eと音声（2026-10-01）**：コードで指定したVFX/PostEffectsを対象箇所へ必ず実装し、未指定箇所にも状況に応じ追加できる。採用済みマップの改善にも適用。マップSFXはユーザー明示指定時のみ。詳細は[DVA正本](references/dva.md)。
