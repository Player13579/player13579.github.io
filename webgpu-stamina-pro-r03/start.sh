#!/bin/sh
set -eu
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then exec node tools/serve.mjs; fi
if command -v python3 >/dev/null 2>&1; then exec python3 -m http.server 8080 --bind 127.0.0.1; fi
printf 'Node.js 20+ または Python 3 が必要です。\n' >&2
exit 1
