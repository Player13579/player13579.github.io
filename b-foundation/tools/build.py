#!/usr/bin/env python3
"""Build the static B Foundation daily report gallery from JSON source files."""

from __future__ import annotations

import html
import json
import re
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports"
OUTPUT_REPORTS = REPORTS
INDEX = ROOT / "index.html"
CATEGORIES = {"method": "設計方法", "validator": "検証器", "reference": "参考設計"}
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,79}$")
SHA_RE = re.compile(r"^[0-9a-fA-F]{40}$")
FIGURE_RE = re.compile(r"^assets/[A-Za-z0-9][A-Za-z0-9._-]*\.svg$")


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def lines(value: str | list[str], *, css: str = "copy") -> str:
    values = [value] if isinstance(value, str) else value
    return "\n".join(f'<p class="{css}">{esc(item)}</p>' for item in values)


def validate_url(value: object, label: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{label}: URL must be a string")
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError(f"{label}: only absolute https URLs are allowed")
    return value


def require_text(value: object, label: str, *, allow_array: bool = False) -> None:
    valid = isinstance(value, str) and bool(value.strip())
    if allow_array:
        valid = valid or (isinstance(value, list) and bool(value) and all(isinstance(x, str) and x.strip() for x in value))
    if not valid:
        raise ValueError(f"{label}: expected a non-empty string" + (" or string array" if allow_array else ""))


def read_reports() -> list[dict]:
    REPORTS.mkdir(parents=True, exist_ok=True)
    docs: list[dict] = []
    seen_dates: set[str] = set()
    for path in sorted(REPORTS.glob("????-??-??.json")):
        try:
            day = date.fromisoformat(path.stem)
        except ValueError as exc:
            raise ValueError(f"Invalid report filename date: {path.name}") from exc
        if day.isoformat() != path.stem:
            raise ValueError(f"Invalid report filename date: {path.name}")
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError(f"{path.name}: top-level value must be an object")
        if data.get("date") != path.stem or path.stem in seen_dates:
            raise ValueError(f"{path.name}: date must match filename and be unique")
        seen_dates.add(path.stem)
        require_text(data.get("title"), f"{path.name}.title")
        require_text(data.get("intro"), f"{path.name}.intro", allow_array=True)
        updated = data.get("updated_at")
        if not isinstance(updated, str):
            raise ValueError(f"{path.name}.updated_at: expected ISO datetime with JST offset")
        try:
            stamp = datetime.fromisoformat(updated.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError(f"{path.name}.updated_at: invalid ISO datetime") from exc
        if stamp.utcoffset() is None or stamp.utcoffset().total_seconds() != 9 * 3600:
            raise ValueError(f"{path.name}.updated_at: timestamp must include JST +09:00 offset")
        entries = data.get("entries")
        if not isinstance(entries, list):
            raise ValueError(f"{path.name}.entries: expected an array")
        seen_ids: set[str] = set()
        for index, entry in enumerate(entries, 1):
            label = f"{path.name}.entries[{index}]"
            if not isinstance(entry, dict):
                raise ValueError(f"{label}: expected an object")
            ident = entry.get("id")
            if not isinstance(ident, str) or not ID_RE.fullmatch(ident) or ident in seen_ids:
                raise ValueError(f"{label}.id: invalid or duplicate id")
            seen_ids.add(ident)
            require_text(entry.get("title"), f"{label}.title")
            if entry.get("category") not in CATEGORIES:
                raise ValueError(f"{label}.category: use method, validator, or reference")
            for field in ("capability", "principle", "example", "verified", "limitations"):
                require_text(entry.get(field), f"{label}.{field}", allow_array=True)
            commit = entry.get("commit")
            if commit is not None and (not isinstance(commit, str) or not SHA_RE.fullmatch(commit)):
                raise ValueError(f"{label}.commit: expected a 40-character SHA or null")
            figure = entry.get("figure")
            if figure is not None and (not isinstance(figure, str) or not FIGURE_RE.fullmatch(figure)):
                raise ValueError(f"{label}.figure: expected assets/name.svg or null")
            if figure is not None and not (ROOT / figure).is_file():
                raise ValueError(f"{label}.figure: file does not exist: {figure}")
            sources = entry.get("sources", [])
            if not isinstance(sources, list):
                raise ValueError(f"{label}.sources: expected an array")
            for source in sources:
                validate_url(source, f"{label}.sources")
        docs.append(data)
    return sorted(docs, key=lambda item: (item["date"], item["updated_at"]), reverse=True)


def render_entry(entry: dict, *, report_page: bool) -> str:
    category = entry["category"]
    figure = entry.get("figure")
    figure_html = ""
    if figure:
        prefix = "../" if report_page else ""
        figure_url = f"{prefix}{esc(figure)}"
        figure_html = (f'<figure class="report-figure"><a class="figure-image-link" href="{figure_url}">'
                       f'<img src="{figure_url}" alt="{esc(entry["title"])}の説明図" loading="lazy"></a>'
                       f'<figcaption><a class="figure-link" href="{figure_url}">説明図を拡大して見る</a></figcaption></figure>')
    source_html = ""
    if entry.get("sources"):
        links = "".join(f'<li><a href="{esc(url)}" rel="noopener noreferrer">{esc(url)}</a></li>' for url in entry["sources"])
        source_html = f'<details class="sources"><summary>参考資料</summary><ul>{links}</ul></details>'
    commit_html = ""
    if entry.get("commit"):
        commit_html = f'<p class="commit-note">仕様の変更記録（閲覧権限が必要） · <code>{esc(entry["commit"])}</code></p>'
    return f'''<article class="entry-card" id="{esc(entry["id"])}" data-category="{category}">
  <header class="entry-heading"><span class="category-tag category-{category}">{CATEGORIES[category]}</span><h3>{esc(entry["title"])}</h3></header>
  <div class="entry-facts">
    <section><h4>できるようになったこと</h4>{lines(entry["capability"])}</section>
    <section><h4>原理</h4>{lines(entry["principle"])}</section>
    <section><h4>具体例</h4>{lines(entry["example"])}</section>
{figure_html}
    <section><h4>確認できたこと</h4>{lines(entry["verified"])}</section>
    <section><h4>未確認・限界</h4>{lines(entry["limitations"])}</section>
  </div>
  {commit_html}{source_html}
</article>'''


def write_report(report: dict) -> None:
    entries = "\n".join(render_entry(entry, report_page=True) for entry in report["entries"])
    toc = "\n".join(f'<li data-toc-entry="{esc(e["id"])}"><a href="#{esc(e["id"])}">{esc(e["title"])}</a></li>' for e in report["entries"])
    html_doc = f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="B基底・拡張の設計方法と検証器の変更記録。"><title>{esc(report["title"])} · B基底・拡張 改善ギャラリー</title><link rel="stylesheet" href="../styles.css"><script src="../gallery.js" defer></script></head>
<body><a class="skip-link" href="#main">本文へ移動</a><header class="site-header"><a class="brand" href="../index.html">B基底・拡張 <span>改善ギャラリー</span></a><a class="back-link" href="../index.html">日別一覧へ</a></header>
<main id="main" class="report-main"><div class="eyebrow">DAILY CHANGE REPORT</div><time class="report-date" datetime="{esc(report["date"])}">{esc(report["date"])}</time><h1>{esc(report["title"])}</h1><div class="intro">{lines(report["intro"], css="")}</div><p class="updated">更新 <time>{esc(report["updated_at"])}</time></p>
<aside class="editorial-note"><strong>このギャラリーについて</strong><p>設計方法・検証器の変更記録です。説明図と生成結果を区別して掲載します。</p></aside>
<nav class="toc" aria-label="この日の項目"><h2>この日の項目</h2><ol>{toc}</ol></nav>
<div class="report-tools"><label for="entry-search">項目を検索</label><input id="entry-search" type="search" placeholder="原理・具体例・確認内容を検索" autocomplete="off"><label for="category-filter">種類</label><select id="category-filter"><option value="all">全件</option><option value="method">設計方法</option><option value="validator">検証器</option><option value="reference">参考設計</option></select><p class="result-count" data-result-count aria-live="polite">全{len(report["entries"])}件</p><p class="empty-results" data-empty-results hidden>該当する項目はありません。</p></div>
<section class="entries" aria-label="変更項目">{entries}</section>
<footer class="report-footer"><a href="../index.html">← 日別一覧へ戻る</a></footer></main><footer class="site-footer">B基底・拡張 改善ギャラリー</footer></body></html>'''
    target = OUTPUT_REPORTS / f'{report["date"]}.html'
    target.write_text(html_doc, encoding="utf-8", newline="\n")


def write_index(reports: list[dict]) -> None:
    cards = []
    for report in reports:
        count = len(report["entries"])
        figure_entry = next((entry for entry in reversed(report["entries"]) if entry.get("figure")), None)
        report_url = f'reports/{esc(report["date"])}.html'
        thumbnail = (f'<a class="day-thumbnail-link" href="{report_url}" aria-label="{esc(report["title"])}の報告を見る">'
                     f'<img class="day-thumbnail" src="{esc(figure_entry["figure"])}" alt="{esc(figure_entry["title"])}の説明図" loading="lazy"></a>'
                     if figure_entry else "")
        cards.append(f'''<article class="day-card"><time datetime="{esc(report["date"])}">{esc(report["date"])}</time><h2><a href="{report_url}">{esc(report["title"])}</a></h2>{thumbnail}<div class="card-intro">{lines(report["intro"], css="")}</div><p class="card-meta">{count}件の記録</p></article>''')
    latest = reports[0] if reports else None
    summary = (f'<p>{esc(latest["date"])}の報告に{len(latest["entries"])}件の変更を掲載しています。</p>' if latest else '<p>最初の日別報告を準備しています。</p>')
    listing = "\n".join(cards) if cards else '<p class="empty-gallery">まだ報告はありません。</p>'
    doc = f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="B基底・拡張の設計方法と検証器の毎日の変更記録。"><title>B基底・拡張 改善ギャラリー</title><link rel="stylesheet" href="styles.css"><script src="gallery.js" defer></script></head>
<body><a class="skip-link" href="#main">本文へ移動</a><header class="site-header"><a class="brand" href="index.html">B基底・拡張 <span>改善ギャラリー</span></a><span class="header-note">設計と検証の記録</span></header>
<main id="main" class="home-main"><section class="hero"><div class="eyebrow">DESIGN NOTES · DAILY</div><h1>美しさを支える<br><em>設計と検証の記録。</em></h1><p class="hero-copy">Bの基底・拡張に加えた設計方法や検証器の変更を、できること・原理・具体例・確認範囲とともに日付ごとにまとめます。</p><div class="today-summary"><span>最新の報告</span>{summary}</div></section><section class="gallery-section" aria-labelledby="archive-heading"><div class="section-heading"><div><div class="eyebrow">ARCHIVE</div><h2 id="archive-heading">日別レポート</h2></div><span class="archive-count">{len(reports)}日分</span></div><div class="day-grid">{listing}</div></section><aside class="editorial-note"><strong>記録の読み方</strong><p>設計方法・検証器の変更記録です。説明図は考え方を示すもので、画像生成の成果物とは区別しています。実行していない項目は「未確認」と記します。</p></aside></main><footer class="site-footer">B基底・拡張 改善ギャラリー <span>· 日々の設計ログ</span></footer></body></html>'''
    INDEX.write_text(doc, encoding="utf-8", newline="\n")


def main() -> None:
    docs = read_reports()
    for report in docs:
        write_report(report)
    write_index(docs)
    print(f"Generated {INDEX.relative_to(ROOT)} and {len(docs)} daily report(s).")


if __name__ == "__main__":
    main()
