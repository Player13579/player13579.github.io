# Facility E 03 r0.1 — ChatGPT Pro

This standalone gallery adapter replays the three submitted exact object effects on dark and light fields. It preserves the submitted runtime, contract, audio, and renderer modules and WGSL shaders byte-for-byte. Source-only preview fixtures are omitted; the adapter has no controls, no Canvas 2D rendering, and no audio path. All six canvases require WebGPU; there is no fallback renderer.

Open `index.html` from an HTTP server. Add any `verify` query parameter (for example `?embed=1&verify=facility-next3-r01`) for verification mode. The adapter is always silent; `verify` marks the run for Codex verification. The H64 marker is 64 CSS pixels. Each object loops its submitted 2,200 ms effect lifetime, followed by 650 ms of clear time.

Routes:

- `facility-next3-pro-r01/?embed=1` — gallery embed
- `facility-next3-pro-r01/?embed=1&verify=<token>` — silent verification embed

Technical replay, design quality, listening, and game integration are separate states. This adapter does not establish a quality pass or authorize integration.
