# B基底・拡張 改善ギャラリー

公開先: https://player13579.github.io/b-foundation/

Bの実装で「何ができるようになったか・原理・具体例・確認範囲」を日本時間の日付ごとに記録する。設計方法・検証器の動作・生成画像で観察した効果は分ける。説明図の描画や構造検査だけで、美的効果を確認済みにしない。

## 同日の報告を更新する

1. `reports/YYYY-MM-DD.json` に同日の実装を追記する。同じ日の別報告を増やさず、過去の日付の記録を保持する。
2. `updated_at` を日本時間のISO日時（`+09:00`）で更新する。各項目に、できること・原理・具体例・確認できたこと・未確認事項を具体的に記す。
3. 掲載する説明図を `assets/` に置き、`figure` を `assets/name.svg` とする。B正本全文、完全な参考設計コード、個人情報、認証情報を公開しない。
4. `python b-foundation/tools/build.py` を実行する。日付一覧と各日のHTMLはJSONから再生成されるので、生成HTMLを直接編集しない。
5. 内容・図版・リンクと検索の挙動を確認し、このディレクトリの必要ファイルだけをcommit・pushする。`__pycache__` は含めない。
6. GitHub Pagesで該当commitの公開成功と、公開ページ・図版の内容を確認する。未実施の画面検証はそのまま未確認と記録する。

既存トップのゲームや別ギャラリーはこの更新の対象にしない。公開元は `Player13579/player13579.github.io` の `Codex-honoo` ブランチ直下。

## JSONの構成

トップレベルは `date`、`title`、`intro`、`updated_at`、`entries`。`date` はファイル名と一致させる。`entries` の各項目は次を持つ。

- `id`: その日のページ内で一意の英数字・ハイフン識別子。
- `title`: 「素材ごとの反射・陰影・透け方を描き分ける方法が増えた」のように、できるようになったことを平易に示す見出し。
- `category`: `method`（設計方法）・`validator`（検証器）・`reference`（参考設計）。
- `capability` / `principle` / `example` / `verified` / `limitations`: 空でない日本語の本文、または本文の配列。`principle` を原理名の列挙だけで済ませない。
- `commit`: 確認済みの40桁の変更commit、または `null`。変更元B仕様は非公開のため閲覧権限が必要。
- `figure`: `assets/name.svg`、または `null`。
- `sources`: 実際に確認した参考資料のHTTPS URL配列（省略可）。要旨だけを読んだ場合は本文を読了したとしない。

検索・種類別の絞り込みは静的に生成した本文へ適用する。JavaScriptを使わなくても全項目を読める。
