# Public gunner original/repaired previews

Two immutable standalone routes use public production source from `Player13579/player13579.github.io` at commit `56d0da8f810b52e3750a37d9c52ed72790860aa2`:

- `gunner-original/index.html`: exact original public module, including its reduced-motion fade defect
- `gunner-repaired/index.html`: public module with the minimal two-line elapsed-progress repair

The host uses the real production `create`, `plan`, and `record` APIs with a direct-effect fixture. It owns a 980 × 620 WebGPU canvas, device, ordered command encoder, and render pass. The neutral H64 marker is a fixture, not a game actor. No game entrypoint is loaded or changed.

## Verification

Native GPU replay has **not run**. The container's native browser startup is blocked by socket permissions. CPU and mocked-browser test results appear in `evidence/cpu-tests.tap`. They do not prove shader compilation or rendered pixels. Visual quality, game integration, device compatibility, and listening are unverified.

`MANIFEST.json` identifies the exact public source inputs with SHA256 and Git blob IDs. `PACKAGE-CLOSURE.json` pins every package file other than itself.

## Controls

Default state is a held 450 ms frame. `?autoplay=1` enables looping; `?t=600` holds 600 ms and overrides autoplay. `?reduced=1` selects reduced motion, and `?variant=handgun|smg|assault|sniper|taser` selects a weapon. `?verify` marks verification mode. All modes remain hard-muted and construct no audio context. No Canvas2D or network fallback exists.

Hidden pages pause. Leaving the page disposes all GPU resources. GPU compilation, pipeline, device, or submission failure leaves an explicit error state rather than a success label.

For programmatic inspection, await `window.__webgpuEPreview.ready`, then check the returned `ready`, `status`, and `errors`. The API also provides `snapshot()`, `seek(milliseconds)`, `setReducedMotion(boolean)`, `play()`, `pause()`, and `dispose()`. Completed submission counts describe the current runtime session only and are not visual acceptance.

Run CPU checks with `node --test --test-reporter=tap tests/public-gunner.test.cjs` from this folder.
