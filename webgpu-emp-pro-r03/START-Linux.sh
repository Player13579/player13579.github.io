#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then echo 'Node.js 18+ required. See README.md.'; exit 1; fi
printf 'Open http://localhost:8080 in a WebGPU-capable browser.\n'
exec node tools/serve.mjs
