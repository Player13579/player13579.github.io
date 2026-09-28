# Gallery integration notes — Mana Gain E Pro r01

The standalone technical replay is `gallery.html` in this folder. It loads `gallery-replay.mjs`, which imports the exact copied candidate source under `src/`, WGSL from `shaders/mana.wgsl`, and the generated source audio implementation in `src/synth.js`. Serve over HTTP on a WebGPU-enabled browser; do not use a `file:` URL. Append `?verify=1` for silent verification mode. The canvas is fixed at 100×86 raster pixels and CSS pixels; the replay uses the strict envelope H64 scale `64/140 px per world unit`.

The loop emits one new, synthetic gallery event after the previous one ends. The host candidate event represents a confirmed positive discrete `gain-mana` from `map-object`; it changes no game state. The sound button uses an explicit user gesture and only unlocks sound for later visible events. Initial audio is muted; `?verify` cannot be unmuted.

To use the replay in a gallery shell, load `gallery.html` in an iframe or reproduce its single canvas plus status node and load `gallery-replay.mjs` as a module. The module expects the authored candidate source tree to remain at the relative paths in this directory. Do not interpret the source-level WebGPU implementation or Node tests as proof of successful browser GPU rendering, H64 visual acceptance, listening acceptance, or game integration. Those remain not run.
