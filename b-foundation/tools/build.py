#!/usr/bin/env python3
"""Build the single, undated, user-facing B production gallery page."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "gallery.json"
INDEX = ROOT / "index.html"
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,79}$")
IMAGE_PATH_RE = re.compile(r"^assets/[A-Za-z0-9][A-Za-z0-9._/-]*$")
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
GALLERY_FIELDS = {"title", "intro", "items"}
ITEM_FIELDS = {"id", "title", "benefit", "how_to_use", "principle", "evidence"}
OPTIONAL_IMAGE_FIELDS = {"image", "image_alt"}


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def require_text(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label}: expected a non-empty string")
    return value


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
        if not ITEM_FIELDS.issubset(keys) or keys - ITEM_FIELDS - OPTIONAL_IMAGE_FIELDS:
            raise ValueError(f"{label}: use the required user-facing fields and optional image/image_alt")
        ident = item["id"]
        if not isinstance(ident, str) or not ID_RE.fullmatch(ident) or ident in seen:
            raise ValueError(f"{label}.id: invalid or duplicate id")
        seen.add(ident)
        for field in ("title", "benefit", "how_to_use", "principle", "evidence"):
            require_text(item[field], f"{label}.{field}")
        has_image = "image" in item
        has_alt = "image_alt" in item
        if has_image != has_alt:
            raise ValueError(f"{label}: image and image_alt must be supplied together")
        if has_image:
            item["image"] = validate_image(item["image"], f"{label}.image")
            require_text(item["image_alt"], f"{label}.image_alt")
    return data


def render_item(item: dict) -> str:
    figure = ""
    if "image" in item:
        figure = (
            f'<figure class="item-image"><img src="{esc(item["image"])}" '
            f'alt="{esc(item["image_alt"])}" loading="lazy"></figure>'
        )
    return f'''<article class="gallery-item" id="{esc(item["id"])}">
  <h2>{esc(item["title"])}</h2>
  <p class="item-benefit">{esc(item["benefit"])}</p>
  {figure}
  <div class="item-details">
    <section><h3>使い方</h3><p>{esc(item["how_to_use"])}</p></section>
    <section><h3>しくみ</h3><p>{esc(item["principle"])}</p></section>
    <section><h3>確認できること</h3><p>{esc(item["evidence"])}</p></section>
  </div>
</article>'''


def render_page(data: dict) -> str:
    items = "\n".join(render_item(item) for item in data["items"])
    if not items:
        items = '<p class="empty-gallery">現在、掲載中の内容はありません。</p>'
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
    <section class="gallery-items" aria-label="制作に役立つ内容">
      {items}
    </section>
  </main>
</body>
</html>
'''


def main() -> None:
    INDEX.write_text(render_page(read_gallery()), encoding="utf-8", newline="\n")
    print("Generated index.html.")


if __name__ == "__main__":
    main()
