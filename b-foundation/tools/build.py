#!/usr/bin/env python3
"""Build the single, undated, user-facing B production gallery page."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "gallery.json"
INDEX = ROOT / "index.html"
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,79}$")
IMAGE_PATH_RE = re.compile(r"^assets/[A-Za-z0-9][A-Za-z0-9._/-]*$")
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
GALLERY_FIELDS = {"title", "intro", "items"}
ITEM_FIELDS = {"id", "title", "summary", "principle", "evidence", "essential"}
OPTIONAL_ITEM_FIELDS = {
    "benefit", "how_to_use", "source_url", "image", "image_alt", "example", "references", "examples", "show_heading", "tool"
}
EXAMPLE_FIELDS = {"title", "image", "image_alt", "caption"}
GITHUB_COMMIT_RE = re.compile(
    r"^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/commit/[0-9a-fA-F]{7,64}/?$"
)


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def require_text(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label}: expected a non-empty string")
    return value


def validate_https_url(value: object, label: str) -> str:
    url = require_text(value, label)
    try:
        parsed = urlsplit(url)
        _ = parsed.port
    except ValueError as exc:
        raise ValueError(f"{label}: malformed HTTPS URL") from exc
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or "\\" in url
    ):
        raise ValueError(f"{label}: expected a safe HTTPS URL")
    if any(char.isspace() for char in url):
        raise ValueError(f"{label}: URL must not contain whitespace")
    return url


def icon_links() -> str:
    return (
        '<link rel="icon" href="icons/favicon.ico" sizes="16x16 32x32 48x48" type="image/x-icon">'
        '<link rel="icon" href="icons/favicon.svg" type="image/svg+xml" sizes="any">'
        '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png" sizes="180x180">'
    )


def validate_image(value: object, label: str) -> str:
    path_text = require_text(value, label)
    if "\\" in path_text or not IMAGE_PATH_RE.fullmatch(path_text):
        raise ValueError(f"{label}: expected a safe local path under assets/")
    path = PurePosixPath(path_text)
    if path.is_absolute() or path.parts[0] != "assets" or any(part in {".", ".."} for part in path.parts):
        raise ValueError(f"{label}: path must remain under assets/")
    if path.suffix.lower() not in IMAGE_SUFFIXES:
        raise ValueError(f"{label}: unsupported image type")
    target = ROOT.joinpath(*path.parts)
    assets_root = (ROOT / "assets").resolve()
    try:
        target.resolve().relative_to(assets_root)
    except ValueError as exc:
        raise ValueError(f"{label}: path must remain under assets/") from exc
    if not target.is_file():
        raise ValueError(f"{label}: file does not exist: {path_text}")
    return path.as_posix()


def read_gallery() -> dict:
    data = json.loads(SOURCE.read_text(encoding="utf-8-sig"))
    if not isinstance(data, dict) or set(data) != GALLERY_FIELDS:
        raise ValueError("gallery.json: expected only title, intro, and items")
    require_text(data["title"], "gallery.json.title")
    require_text(data["intro"], "gallery.json.intro")
    if not isinstance(data["items"], list):
        raise ValueError("gallery.json.items: expected an array")
    seen: set[str] = set()
    for index, item in enumerate(data["items"], 1):
        label = f"gallery.json.items[{index}]"
        if not isinstance(item, dict):
            raise ValueError(f"{label}: expected an object")
        keys = set(item)
        if not ITEM_FIELDS.issubset(keys) or keys - ITEM_FIELDS - OPTIONAL_ITEM_FIELDS:
            raise ValueError(f"{label}: contains missing or unknown fields")
        ident = item["id"]
        if not isinstance(ident, str) or not ID_RE.fullmatch(ident) or ident in seen:
            raise ValueError(f"{label}.id: invalid or duplicate id")
        seen.add(ident)
        for field in ("title", "summary", "principle", "evidence"):
            require_text(item[field], f"{label}.{field}")
        if not isinstance(item["essential"], bool):
            raise ValueError(f"{label}.essential: expected a boolean")
        if "show_heading" in item and not isinstance(item["show_heading"], bool):
            raise ValueError(f"{label}.show_heading: expected a boolean")
        has_benefit = "benefit" in item
        has_how_to_use = "how_to_use" in item
        if has_benefit != has_how_to_use:
            raise ValueError(f"{label}: benefit and how_to_use must be supplied together")
        if item["essential"] and not has_benefit:
            raise ValueError(f"{label}: essential items require benefit and how_to_use")
        if has_benefit:
            require_text(item["benefit"], f"{label}.benefit")
            require_text(item["how_to_use"], f"{label}.how_to_use")
        if "example" in item:
            require_text(item["example"], f"{label}.example")
        if "tool" in item:
            item["tool"] = validate_tool(item["tool"], f"{label}.tool")
        if "source_url" in item:
            source_url = validate_https_url(item["source_url"], f"{label}.source_url")
            if not GITHUB_COMMIT_RE.fullmatch(source_url):
                raise ValueError(f"{label}.source_url: expected a GitHub commit URL")
        if "references" in item:
            references = item["references"]
            if not isinstance(references, list):
                raise ValueError(f"{label}.references: expected an array of HTTPS URLs")
            item["references"] = [
                validate_https_url(url, f"{label}.references[{i}]")
                for i, url in enumerate(references)
            ]
        has_image = "image" in item
        has_alt = "image_alt" in item
        if has_image != has_alt:
            raise ValueError(f"{label}: image and image_alt must be supplied together")
        if has_image:
            item["image"] = validate_image(item["image"], f"{label}.image")
            require_text(item["image_alt"], f"{label}.image_alt")
        if "examples" in item:
            examples = item["examples"]
            if not isinstance(examples, list) or not examples:
                raise ValueError(f"{label}.examples: expected a non-empty array")
            validated_examples = []
            for example_index, example in enumerate(examples, 1):
                example_label = f"{label}.examples[{example_index}]"
                if not isinstance(example, dict) or set(example) != EXAMPLE_FIELDS:
                    raise ValueError(f"{example_label}: expected only title, image, image_alt, and caption")
                validated = dict(example)
                for field in ("title", "image_alt", "caption"):
                    require_text(validated[field], f"{example_label}.{field}")
                validated["image"] = validate_image(validated["image"], f"{example_label}.image")
                validated_examples.append(validated)
            item["examples"] = validated_examples
    return data


def validate_tool(value: object, label: str) -> dict:
    if not isinstance(value, dict) or set(value) != {"href", "label"}:
        raise ValueError(f"{label}: expected only href and label")
    href = require_text(value["href"], f"{label}.href")
    title = require_text(value["label"], f"{label}.label")
    if not re.fullmatch(r"labs/[A-Za-z0-9][A-Za-z0-9-]*\.html", href):
        raise ValueError(f"{label}.href: expected a local HTML tool under labs/")
    target = ROOT / href
    try:
        target.resolve().relative_to((ROOT / "labs").resolve())
    except ValueError as exc:
        raise ValueError(f"{label}.href: tool must remain under labs/") from exc
    if not target.is_file():
        raise ValueError(f"{label}.href: tool does not exist")
    return {"href": href, "label": title}


def render_item(item: dict) -> str:
    figure = ""
    if "image" in item:
        figure = (
            f'<figure class="item-image"><img src="{esc(item["image"])}" '
            f'alt="{esc(item["image_alt"])}" loading="lazy"></figure>'
        )
    examples = ""
    if "examples" in item:
        cards = "".join(
            f'''<figure class="example-figure">
      <h3>{esc(example["title"])}</h3>
      <a class="example-image-link" href="{esc(example["image"])}" aria-label="{esc(example["title"])}の画像を原寸で開く">
        <img src="{esc(example["image"])}" alt="{esc(example["image_alt"])}" loading="lazy">
      </a>
      <figcaption>{esc(example["caption"])}</figcaption>
    </figure>'''
            for example in item["examples"]
        )
        examples = f'<section class="item-examples" aria-label="{esc(item["title"])}の画像例">{cards}</section>'
    essential_details = ""
    if "benefit" in item:
        essential_details = f'''<div class="essential-details" data-essential-details>
    <section><h3>できること</h3><p>{esc(item["benefit"])}</p></section>
    <section><h3>使い方</h3><p>{esc(item["how_to_use"])}</p></section>
  </div>'''
    example = ""
    if "example" in item:
        example = f'<section><h3>具体例</h3><p>{esc(item["example"])}</p></section>'
    source = ""
    if "source_url" in item:
        source = f'<p class="item-source"><a href="{esc(item["source_url"])}">GitHubの変更</a></p>'
    references = ""
    if item.get("references"):
        links = "".join(
            f'<li><a href="{esc(url)}">{esc(url)}</a></li>' for url in item["references"]
        )
        references = f'<section class="item-references"><h3>参考資料</h3><ul>{links}</ul></section>'
    show_heading = item.get("show_heading", False)
    tool = ""
    if "tool" in item:
        tool = f'\n  <p class="item-tool"><a href="{esc(item["tool"]["href"])}">{esc(item["tool"]["label"])}</a></p>'
    hidden = "" if item["essential"] or show_heading else " hidden"
    content_hidden = " hidden" if show_heading and not item["essential"] else ""
    heading = esc(item["title"])
    if show_heading:
        heading = f'<a href="?view=all#{esc(item["id"])}">{heading}</a>'
    return f'''<article class="gallery-item" id="{esc(item["id"])}" data-essential="{str(item["essential"]).lower()}" data-show-heading="{str(show_heading).lower()}"{hidden}>
  <h2>{heading}</h2>
  <div data-report-content{content_hidden}>
  <p class="item-summary">{esc(item["summary"])}</p>{tool}
  {examples}
  {essential_details}
  <details class="report-details">
    <summary>しくみ・具体例・確認範囲を見る</summary>
    {figure}
    <div class="item-details">
      <section><h3>しくみ</h3><p>{esc(item["principle"])}</p></section>
      {example}
      <section><h3>確認範囲</h3><p>{esc(item["evidence"])}</p></section>
      {references}
    </div>
    {source}
  </details>
  </div>
</article>'''


def render_page(data: dict) -> str:
    items = "\n".join(render_item(item) for item in data["items"])
    essential_count = sum(1 for item in data["items"] if item["essential"])
    heading_count = sum(1 for item in data["items"] if not item["essential"] and item.get("show_heading", False))
    heading_note = f' 見出しのみ{heading_count}件。' if heading_count else ''
    empty_hidden = " hidden" if essential_count else ""
    items += f'<p class="empty-gallery" data-empty-state{empty_hidden}>現在、制作でぜひ知っておくべき掲載内容はありません。これまでの改善は「すべての報告」で読めます。</p>'
    return f'''<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{esc(data["intro"])}">
  <title>{esc(data["title"])}</title>
  {icon_links()}
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="site-header"><a class="brand" href="#main">{esc(data["title"])}</a></header>
  <main id="main" class="home-main">
    <section class="hero" aria-labelledby="page-heading">
      <h1 id="page-heading">制作に必要な変化だけを。</h1>
      <p class="hero-copy">{esc(data["intro"])}</p>
    </section>
    <section class="view-controls" aria-labelledby="view-heading">
      <div><h2 id="view-heading">表示する内容</h2>
        <p id="view-description">「制作に必要な内容」は、作品づくりに直接役立つ掲載内容に絞ります。「すべての報告」では、このチャットが実施した改善を、内部仕様や検証も含めて表示します。</p>
      </div>
      <div class="mode-buttons" role="group" aria-label="表示モード">
        <button type="button" data-mode-switch="essential" aria-pressed="true" aria-controls="gallery-list" disabled>制作に必要な内容</button>
        <button type="button" data-mode-switch="all" aria-pressed="false" aria-controls="gallery-list" disabled>すべての報告</button>
      </div>
      <p class="view-count" data-view-count aria-live="polite" aria-atomic="true">制作に必要な内容を表示中。{essential_count}件。{heading_note}</p>
      <noscript><p>表示モードの切替にはJavaScriptが必要です。</p></noscript>
    </section>
    <section id="gallery-list" class="gallery-items" aria-label="報告一覧" aria-describedby="view-description">
      {items}
    </section>
  </main>
  <script src="gallery-modes.js" defer></script>
</body>
</html>
'''


def main() -> None:
    page = "\n".join(line.rstrip() for line in render_page(read_gallery()).splitlines()) + "\n"
    INDEX.write_text(page, encoding="utf-8", newline="\n")
    print("Generated index.html.")


if __name__ == "__main__":
    main()
