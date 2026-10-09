---
name: b-foundation-loader
description: Apply the current B Foundation rules to B-spec image, video, prompt, generation-code, and content-changing image-edit tasks. Use for B/Foundation and named B extension terms; generate only when requested, except for the standing game-code exception.
---

# B Foundation Loader

Use this skill for B-spec work, including B, foundation, extension, FX, VFX, PostEffects, digital_effect, phantasy_effect, v1-v4, f0-f3, o1-o9, PH, WindCapsule, MagicArchitecture, and BeautifulPoseCapsule. Apply it to new images and edits that change depicted content; skip technical-only work, a turn that explicitly excludes B, and the optional-B cases below.

## エフェクトなしの簡単な画像

画像素材の制作では、2026-09-22の指示により、**B Foundationを省略してよいのはキャラモーションと、既存制作物を基にした差分だけ**。以前の「エフェクトを含まない簡単な画像」という表現を、他の新規素材へ広げない。キャラモーション原画はBもコードも省略して直接生成できる。DVAで新規に作る画像テクスチャはキャラモーション・マップ・マーカーに限り、新規マップ・マーカー画像にはBを使う。DVAのE（エフェクト）は専用画像を新たに作らずWebGPUで描画する。直接生成とBコード先行の画像制作手順は[素材生成](../asset-generation/SKILL.md)へ従う。個別にBを指定された制作では、その対象と最新のDVA画像制限を確認する。

同日の補足により、**マップテクスチャには高度な表現を求めるため、引き続きB Foundationを使用する**。エフェクトを含まないマップであっても、上記の簡単な画像の例外に入れない。マップの差分制作・修正には、後続のあらゆる差分の例外を適用する。

実生成依頼と画像の対応、原本の人物・衣装・ポーズ条件、生成物の品質確認、採用・統合の判断は維持する。コードを実際に作った場合は対応コードも保存し、画像生成まで進める。既存のBコード・原画・証跡はそのまま保持し、例外の適用だけを理由に作り直さない。

## あらゆる差分

ユーザーの指示「あらゆる差分はbfoundaction使わなくていい」（2026-09-14）により、**あらゆる差分制作・差分修正で、B Foundationを使用しなくてよい**。対象は画像に限らず、動画、モーション、VFX、マップ、プロンプト、設計・生成コードなど、既存の制作物を基にした派生・変更を含む。DVAの旧TE画像の履歴も含むが、今後のE差分を画像生成へ送る根拠にはしない。元がB製かどうか、変更量、難度、エフェクトの有無でこの例外を外さない。差分ごとのB正本取得、PH/八領域の再記述、B専用ラッパー・構造検証を必須にせず、対象に適した通常の制作・編集へ進める。

2026-09-22の追加指示により、画像制作が許される差分・修正はコードも作らず直接生成してよい。元の制作物、変更する部分、維持する条件と実入力を記録し、変更箇所と保持箇所、各用途の品質を確認する。差分の新しい表現や大きな修正を理由にB・コードを必須へ戻さない。DVAの新規画像素材はマップ・マーカーにBを適用し、EにはB画像生成コードを要求しない。その他の用途では、キャラモーション以外の新規制作にBを適用し、個別にBの使用を明示指定された場合はその指示を優先する。

## Current B rules

### B Foundation仕様変更のGitHub反映必須

2026-09-23のユーザー指示により、B Foundationの`基底.md`・`拡張.md`およびその変更に必要な検証器・契約・テスト・関連文書を更新した場合は、**GitHubの`player13579/B`、`Codex-honoo`ブランチへの反映までを必須の完了条件とする**。ローカル保存だけで完了とせず、ユーザーから改めて「GitHubへ反映」と言われるのを待たない。この範囲のcommit・pushは継続的に許可されており、毎回の確認は不要。

適切な仕様検査・回帰テストを終え、リモートの最新状態と無関係な変更の混入がないことを確認してcommit・pushする。反映後はリモートブランチのcommit SHAが反映対象と一致することを確認し、コミットへのリンクを報告する。認証・競合・ブランチ保護等で反映できない場合は、変更を保持し、GitHub反映が未完了であることと具体的な阻害要因を明示する。権限制限の迂回や強制pushで解消しない。後から明示された「ローカルのみ」「pushしない」等の指示は優先する。

この必須条件はB Foundation正本の保守に適用する。仕様を読むだけの作業、個別の画像・設計コードの制作、無関係なリポジトリへの公開を意味しない。

The canonical rules are `基底.md` and `拡張.md` in `player13579/B`, branch `Codex-honoo`. Read both completely before B-spec output. Current DVA asset work uses the current catalog-selected Codex Sol and the current authenticated Git specification, recording commit and blob SHAs; it does not use the former pinned ChatGPT branch. For Adobe Stock's pinned-source ChatGPT workflow, the explicitly selected source conversation supplies the inherited specification version; read both pasted specifications and record their source messages and hashes without silently replacing them. Otherwise prefer an authenticated shallow Git checkout so private credentials work. A raw or REST 404 is not conclusive: try authenticated Git first, then an authenticated GitHub connector if available. If loading still fails, report the attempted source, path, and error; do not reconstruct B rules from memory.

`基底.md` always applies. Decide extensions only from the current `拡張.md`; activated extensions add to, and never weaken, the baseline. Record the decision in the audit.

### 規則から実行コードへの具体化

E制作における「基底・拡張をコードへ変換する」は、適用規則を実行可能なモデルへ翻訳することを意味する。金貨に限定せず、描画する物体全般と現象に適用し、各対象の材質・形状・表面状態・運動と、光源・媒質・観測者の関係から必要な応答を決める。正本全文や説明文をコードへ貼るだけでは変換にならず、全物体へ同じ材質や光学機能を付ける意味でもない。一般的な遵守判定と実装対応は以下に従い、DVA固有の判断はリンク先の品質正本に置く。

基底・拡張の遵守を要求された設計では、正本の読了・引用・構造検査だけで遵守済みと判定しない。題材に適用される規則から、材質・運動・光源・媒質・観測条件を具体化し、実行コードのどの関数・式・パラメータ・passがその条件を実現するかを記録する。記述のない条件は、正本が認める属性具体化の範囲で整合的に決め、宣言済みの事実と設計上の近似を分ける。

実装前に「適用規則→選択した物理／視覚モデル→実装箇所→出力で確認する結果」の対応を作り、未実装・確認不能な項目を明示する。題材に必要な光学条件を「考慮する」という自然言語、未使用の設定値、固定の装飾で代用しない。材質・照明・視線が変化するなら、その変化へ実描画が応答する実装と比較条件を持たせる。すべての題材へ同じ光学機能を強制せず、必要性と不採用理由を適用規則から判断する。

受入時は実際の実行経路と出力を照合する。未使用のコード、CPU近似、schema passだけでは表現成立の証拠にしない。元の規則を満たす意図、実装済み、実出力確認済みを別に記録し、欠落を発見したらコードを修正して再確認する。DVA EではWebGPU shader/runtimeへ対応付け、B画像schemaや新規テクスチャ制作へ置き換えない。金貨等のDVA固有の材質・受入条件は[DVA E品質正本](../dva-ate-maintainer/references/e-design-quality.md)に従う。

B設計の説明、promptの自然言語指示、理由、監査記述は日本語で作る。ユーザーが別言語を明示した場合は従う。schema識別子、enum、単位、固有名詞、完全一致が必要な引用と展開文は現行正本の表記を保持し、それ以外の説明文を英語だけにしない。

For the 2026-09-10 science-integration revision and later, preserve the canonical PhysicalModel, ScaleRegime, cue discrimination, dynamic response, causal-assessment evidence/status, SamplingContract, and comparative-evaluation fields. Read their definitions in the loaded specification rather than duplicating them here. Apply reaction/phase profiles only when relevant; keep all eight domains and the complete PH structure. A schema pass is not evidence of scientific validity, causal identification, or improved rendered quality. For edits to the repository's specification, run its `scripts/check_spec.py` and representative semantic checks; image generation remains a separate authorization.

For each explicitly requested extension keyword, audit the exact canonical expansion text, its implementation location in the code, and the concrete visible shape/count/orientation expected in the image. A keyword in a filename or an otherwise passing baseline validator does not establish extension compliance. Check for contradictory disabling statements before sending. In the 2026-09-09 failure, a requested cross-streak sparkle expansion was omitted while the code disabled PostEffects; generic slanting sunlight was incorrectly treated as a substitute. Resolve the actual current definition from the canonical file, then inspect that specific effect in generated pixels before acceptance. Pass the canonical text through `--required-expansion` for keyword-expansion validation. The validator supports nested canonical JSON inside the Python prompt string; this structural check is not a substitute for source-based semantic review or rendered-pixel inspection.

## B design code

現在のDVA画像素材では現行Solがコードを作り、必要な形式・意味検査後に完成コードを無変更でCodex imagegenへ渡す。キャラモーション・差分の直接生成にコードを要求しない。Adobe StockのChatGPTコード→画像経路だけは[素材生成の共通手順](../asset-generation/references/chatgpt-code-to-image.md)に従い、返却コードを無変更で同じ会話へ送る例外を維持する。DVAとAdobeの経路を混同せず、入力・原本・実画像の受入と未検証`not_run`を記録する。

Produce a complete Japanese Python design program unless the user requests another format or language. An explicit user format override takes precedence. Preserve required syntax, canonical identifiers, units, and proper nouns. A request for code does not authorize image generation. Do not leave placeholders, alternatives, or compressed B structures.

Save formal code as a `.py` file. Validate it with `scripts/validate_design.py`, including `--character` when a character is present and every applicable extension flag. Continue only after exit code 0 and `STRUCTURAL_PASS`, then perform the source-based semantic audit. The design must retain the complete PH structure and all eight OctaDomain domains for every registered PH. Write a sibling audit JSON with source SHAs, extension decisions, validation command/result, the expected-image contract, and actual audit outcomes. Structural success is not rendered-quality acceptance.

For `B-Expression-2`, follow the loaded canonical OutputContract, ExpressionIntent, PartitionPolicy, VisualProjection, typed links, and outcome/status definitions. Do not invent the user's subject or emotional purpose; use the canonical unspecified values when absent. Partition by actual states and boundaries, preserve declared attributes, and use the eight disciplines inside each PH. Apply count adjustments only with their defined intent/applicability basis. Preserve exact requested keyword expansions, including explicitly intended clipping or other departures within the shared IntensityBudget.

Resolve character and body ownership using the canonical per-character mapping and singleton compatibility rules. Total character count does not establish the human count: `--character` records that a human exists, while human-policy coverage is checked against the subject in SemanticReconciliation. Apply conditional contact-shadow, exposure, and modulation rules from the canonical specifications. See the repository's `docs/recursive-improvement.md` for `B-Expression-1` migration; do not silently relabel old designs or revise explicitly pinned originals.

For existing human characters, apply the canonical InferenceExpansionPolicy provision for resolving unspecified sex (user instruction, 2026-09-11). This is specification of an existing character's attribute, not addition or completion of an undeclared element; do not subject it to the undeclared-element permission gate or ask another question. Preserve explicit character specifications.

Apply `InferenceExpansionPolicy.AttributeAndActionResolutionRule` to distinguish independent additions of meaning from coherent realization of existing content. Use its aesthetic selection and joint resolution of unspecified conditions for 「あるものごとが発生すると当然起きるべきもの」, including observational manifestations; do not route attribute resolution through the undeclared-element permission gate or require its conditions to be entailed by the user's wording (user clarification, 2026-09-13). Preserve declared constraints and intended ambiguity, and keep design choices distinct from declarations and established facts. Resolve any required extension through the canonical activation table. When maintaining B rules, express this distinction through general principles from which individual decisions can be derived. Treat a reported example as evidence for finding the principle, not as a request for subject-specific prescriptions or accumulating case lists (user clarification, 2026-09-11).

`scripts/validate_design.py` and its required `scripts/design_contract.json` are deployed from the repository-owned validator; `scripts/validator-source.json` records their source and hashes. Rebuild the contract with the repository script after canonical template changes, run its tests, and deploy both files together. Current inputs are JSON or Python with one constant `prompt` string containing JSON. Use local SharedConditions references only in intermediate JSON, run `--resolve`, and embed the expanded JSON in the final Python prompt. The validator parses AST without executing the submitted Python source. The compatibility entrypoint `validate_b_code.py` delegates to the same implementation; legacy YAML/free-text and removed extension flags return an explicit unsupported result. Preserve supplied legacy originals and migrate only within the user's request; never alter content to make obsolete checks pass. Historical `validate_science.py` is a limited compatibility utility, not a current full-schema gate. Adobe Stock's ChatGPT unchanged-resend exception remains governed above; DVA uses the current Sol/imagegen.

`一括コードブロック` overrides normal response formatting: respond with exactly one unlabeled fenced block containing the complete validated Python program and no other final text. Operational files and checks still occur, but are not included in that response.

## Explicit generation and execution code

For allowed DVA raster assets and Adobe Stock assets, [asset-generation](../asset-generation/SKILL.md) owns route selection and image receipt. DVA routes creative work to the current Sol and raster generation to Codex imagegen; Adobe Stock retains its separate ChatGPT workflow. DVA allows new authored image textures only for character motion, maps, and markers; new effects are E rendered with WebGPU. B-required DVA raster work uses the current authenticated Foundation/Extension; character-motion originals and permitted image derivatives may be generated directly without code or B. This does not authorize changing a historical pinned parent or publishing the result.

Generation is opt-in for the current turn. A request for code, prompts, B, FX/VFX/PostEffects, attachments, previous requests, or available tools does not authorize a render. Only generate when the user currently asks to generate, render, create, or edit an image. A request for generation code is code-only.

The complete B design remains the source of truth. In the Adobe Stock ChatGPT route its validation status may be not_run under the exception above. In DVA, the current Sol keeps the validated source and passes it unchanged to Codex imagegen, subject to the tool's actual input size; any separately mapped execution input is recorded. Code-only and workflow-edit requests do not authorize rendering.

For the built-in image-generation route, check the request against the tool's observed input limit before sending a large B program. The 2026-09-14 DVA request was rejected before generation at 39,452 characters because the limit was 32,000. Preserve the readable original; when needed, create a separate executable Python request version by removing JSON whitespace, prove parsed design-object equality, and validate that version again. Retain every PH/OBS/domain/extension field and the complete design; do not truncate the design or replace it with a summary. Adobe Stock's pinned ChatGPT resend route is separate. Recheck the limit when the tool changes instead of treating this observed value as permanent.

Where the loaded B specification permits design-to-execution translation, the built-in route may instead use concrete executable construction code and a matching reference raster. Keep the complete validated formal design unchanged, save the actual execution input separately, and audit its mapping of the declared subject, geometry, optics, extensions, observation and output contract. A shorter execution input is not a replacement B specification or evidence that every condition appeared in the pixels. The design-object equality rule above applies to whitespace-only versions, not to this explicit execution translation. If an alpha reference is displayed as opaque RGB, inspect its actual alpha and use a correctly composited radiance guide before changing the depicted material. Adobe Stock's pinned ChatGPT route remains separate.

For each generated asset, inspect pixels against the expected-image contract: subject, count, action, environment, composition, viewpoint, lighting, palette, age constraints, visible effects, text/logo policy, and prohibited substitutions. Record accepted and rejected attempts. Continue corrective generation within the authorized scope until the required quality is accepted; do not substitute an unrelated image. The user removed the correction-count limit on 2026-09-13. This applies to B assets and simple effect-free images: do not stop or ask again merely because three or another fixed number of attempts has been reached. Resume prior count-limit holds within the active task; preserve other user pauses, scope limits and unresolved design questions. When repeated attempts do not improve the defect, revise the reference or construction approach instead of repeating an unchanged request.

When deriving a new design from an accepted source, re-evaluate inherited meaning throughout the complete design, including contact/support, limb and object ownership, material response, phase transitions, perceptual evidence, and causal predictions. Updating the main-action text alone is insufficient. An accepted source image or structural pass does not validate inherited statements for a different pose or phenomenon; remove contradictory prior-state claims before generating.

Allowed game image assets have a standing exception: after image-generation design code is complete, generate immediately; a later code-only instruction overrides that exception. DVA E shader code is game implementation, not image-generation design code, so completing it does not trigger an image render. When the user asks to apply the B base to DVA E, use its applicable visual and physical design principles to guide procedural WebGPU shape, motion, light, and timing; do not require B image-schema output or new effect textures.

## Batch and delivery

Keep one mapping per asset among design code, execution code, audit, attempts, and accepted image. Process assets independently. A code-only batch requires validated code and semantic audits; an explicit-generation batch also requires every accepted image to pass the semantic gate.

For ChatGPT Remote, perform generation in the root/main thread and expose accepted images there as first-class results. Do not delegate the render: a worker render, `view_image`, local path, or contact sheet is inspection material, not Remote/mobile delivery. Do not claim mobile visibility when the client collapses the result. Keep originals and copy rather than move them.

Do not automatically copy to iCloud Photos, iCloud Shared folders, OneDrive, another cloud destination, or the workspace. Copy/upload only when the user requests that delivery in the current task or an in-scope project artifact consumes the image; never delete, move, or rename existing external files without an exact request. Use sRGB PNG or JPEG for an explicitly requested workspace/distribution copy. For saved large-batch review artifacts, a contact sheet is appropriate but is not evidence of Remote delivery. Do not duplicate a generation solely to work around mobile delivery. Check current official Apple/Microsoft documentation before giving step-by-step iPad Files or Shortcuts guidance.

## Compatibility utilities

`references/semantic-projection.md`, `validate_execution_prompt.py`, and `validate_semantic_projection.py` predate the execution-code rule. Keep them for compatibility until known callers are migrated, but do not treat their old no-artifact model as current B workflow requirements.
