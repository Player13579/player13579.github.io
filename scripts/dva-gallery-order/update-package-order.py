#!/usr/bin/env python3
"""Refresh one gallery group from its exact published package path commit."""

import argparse
import hashlib
import json
import pathlib
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


def request(url):
    req = urllib.request.Request(url, headers={"User-Agent": "DVA-gallery-order-refresh/1.0"})
    with urllib.request.urlopen(req, timeout=25) as response:
        return response.read()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate-dir", help="Optional bundle root using candidate/ plus package-update-order.json")
    parser.add_argument("--js-path", help="Staged asset-gallery.js path; required without --candidate-dir")
    parser.add_argument("--html-path", help="Staged webgpu-e-gallery.html path; required without --candidate-dir")
    parser.add_argument("--order-file", help="Package order JSON path; required without --candidate-dir")
    parser.add_argument("--group-id", required=True)
    parser.add_argument("--version-id", required=True)
    parser.add_argument("--package-path", required=True, help="Exact catalog source path for the listed version")
    parser.add_argument("--category", required=True, choices=("effect", "map"))
    parser.add_argument("--eligible-version-count", required=True, type=int)
    parser.add_argument("--ref", default="Codex-honoo")
    args = parser.parse_args()
    if args.eligible_version_count < 1:
        parser.error("eligible-version-count must be positive")
    path = args.package_path.lstrip("/")
    if ".." in pathlib.PurePosixPath(path).parts or "?" in path or "#" in path:
        parser.error("package-path must be a repository path without traversal or query parameters")

    encoded = urllib.parse.quote(path, safe="/")
    encoded_ref = urllib.parse.quote(args.ref, safe="")
    feed_url = f"https://github.com/Player13579/player13579.github.io/commits/{encoded_ref}/{encoded}.atom"
    feed = ET.fromstring(request(feed_url))
    ns = {"a": "http://www.w3.org/2005/Atom"}
    entry = feed.find("a:entry", ns)
    if entry is None:
        raise SystemExit("No public commit history found for the package path")
    published_at = entry.findtext("a:updated", default="", namespaces=ns)
    commit_ref = entry.findtext("a:id", default="", namespaces=ns)
    match = re.search(r"Grit::Commit/([0-9a-f]{40})$", commit_ref)
    subject = (entry.findtext("a:title", default="", namespaces=ns) or "").strip()
    if not published_at or not match:
        raise SystemExit("GitHub Atom feed omitted its timestamp or commit SHA")
    if re.search(r"\badopt(?:ion|ed)?\b", subject, re.I):
        raise SystemExit("Latest path commit looks adoption-related; inspect the patch and choose the latest package commit manually")

    if args.candidate_dir:
        root = pathlib.Path(args.candidate_dir).resolve()
        js_path = root / "candidate" / "asset-gallery.js"
        html_path = root / "candidate" / "webgpu-e-gallery.html"
        table_path = root / "package-update-order.json"
    else:
        if not (args.js_path and args.html_path and args.order_file):
            parser.error("provide --candidate-dir or all of --js-path, --html-path, and --order-file")
        js_path = pathlib.Path(args.js_path).resolve()
        html_path = pathlib.Path(args.html_path).resolve()
        table_path = pathlib.Path(args.order_file).resolve()
    for required_path in (js_path, html_path, table_path):
        if not required_path.is_file():
            raise SystemExit(f"Required staged file does not exist: {required_path}")
    js = js_path.read_text(encoding="utf-8")
    if args.group_id not in js or args.version_id not in js or path not in js:
        raise SystemExit("Candidate catalog does not yet contain the supplied group, version, and package path")

    rows = json.loads(table_path.read_text(encoding="utf-8"))
    record = {
        "category": args.category,
        "groupId": args.group_id,
        "versionId": args.version_id,
        "publishedAt": published_at,
        "commit": match.group(1),
        "packagePath": path,
        "eligibleVersionCount": args.eligible_version_count,
        "sameTimeVersionIds": [args.version_id],
    }
    matches = [i for i, row in enumerate(rows) if row.get("groupId") == args.group_id]
    if len(matches) > 1:
        raise SystemExit("Duplicate group rows in package-update-order.json")
    if matches:
        rows[matches[0]] = record
    else:
        rows.append(record)

    key = json.dumps(args.group_id, ensure_ascii=False)
    value = json.dumps(
        {"publishedAt": published_at, "packagePath": path, "commit": match.group(1), "versionId": args.version_id},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    start = js.index("const LATEST_LISTED_PACKAGE_UPDATE = new Map([")
    end = js.index("\n  ]);", start)
    block = js[start:end]
    pattern = re.compile(r"\[\s*" + re.escape(key) + r"\s*,\s*\{[^}]*\}\s*\]")
    replacement = "[" + key + ", " + value + "]"
    if len(pattern.findall(block)) > 1:
        raise SystemExit("Duplicate group rows in JavaScript order map")
    if pattern.search(block):
        block = pattern.sub(replacement, block, count=1)
    else:
        block = block.rstrip()
        if block.endswith("]"):
            block += ","
        block += "\n    " + replacement + ","
    js = js[:start] + block + js[end:]

    js_bytes = js.encode("utf-8")
    old_html = html_path.read_bytes()
    pin = re.search(rb"asset-gallery\.js\?gitBlob=([0-9a-f]{40})", old_html)
    if not pin:
        raise SystemExit("Candidate HTML has no asset-gallery.js gitBlob pin")
    blob_sha = hashlib.sha1(b"blob " + str(len(js_bytes)).encode() + b"\0" + js_bytes).hexdigest().encode()
    new_html = old_html[:pin.start(1)] + blob_sha + old_html[pin.end(1):]
    js_path.write_bytes(js_bytes)
    html_path.write_bytes(new_html)
    table_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "groupId": args.group_id,
        "versionId": args.version_id,
        "publishedAtUTC": published_at,
        "commit": match.group(1),
        "packagePath": path,
        "catalogGitBlob": blob_sha.decode(),
        "candidateJS_SHA256": hashlib.sha256(js_bytes).hexdigest(),
        "candidateHTML_SHA256": hashlib.sha256(new_html).hexdigest(),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
