# Packaging provenance / diff

Source authority: `outputs/request-20261001/gunner-heavy-zero-r1/rpg-e-r1/` and sibling `motion-male-left/`. Before adding the embed controller, the complete standalone package tree was snapshotted under `provenance/standalone-r1/`; its original closure is included there. The frozen RPG E source module, approved pose fixture and source images remain byte-identical. Upstream `source-freeze.json` is unchanged.

Package-local host deltas only:

- `index.html` adds an early `embed=1` class toggle and `#error[role=alert]` diagnostic bridge.
- `preview.css` hides standalone-only chrome in embed mode and sizes the presentation stage to the iframe; the visible error overlay remains.
- `preview-host.mjs` adds a 1200 ms local-fixture event plus 300 ms pause loop for `embed=1`, with fresh cause/source/attempt/sound IDs and E-clock start per cycle. It exposes submitted cycle/cause telemetry, invokes the existing authored audio owner only with the exact module submission receipt, and exports `window.__gallerySfx.activateFromGesture(item)` for the parent gallery's gesture bridge. Default standalone playback remains one-shot with controls. Verify remains hard-zero.
- `host-ownership.test.mjs` covers loop boundaries, fresh identities, one event's actual local E-age/plan, one-shot finite audio per unique causal cycle, embed presentation/error bridge, and teardown.

The loop is a local preview clock built from `performance.now()` at 1×, not an authoritative game/server clock or receipt. The module's strict hypothetical preview protocol supports this local fixture; no production clock conversion is added. `preview-freeze.json`, package manifest and package closure are refreshed to describe these exact package bytes. Native pixels/WGSL compilation remain pending. No creative design/shader, source fixture image, shared gallery registry, public files, server, or browser tab was changed.
