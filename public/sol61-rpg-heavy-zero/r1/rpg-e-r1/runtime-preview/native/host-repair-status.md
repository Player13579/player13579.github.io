# RPG E r1 preview-host resize repair status — 2026-10-02

The preview host's CSS/backing-size feedback has been repaired without changing the creative RPG module or shader. The `.stage` now owns the stable responsive 16:9 layout and size containment; the WebGPU canvas is absolutely contained within it so backing-store width/height cannot size the CSS presentation. `ResizeObserver` now observes the parent stage, bounded backing dimensions derive from that CSS box (DPR at most 1.5; 2.5 million-pixel cap), and unchanged dimensions do not recreate textures/pipelines. A stage resize regenerates GPU targets only after the measured size changes.

The previous native run's CSS diagnosis was incomplete: the pinned preview server rejected `preview.css` with HTTP 415 because `.css` was missing from its MIME allowlist. This missing stylesheet confounds the earlier black screenshot and CSS-dimension feedback; the resize issue should not be assigned solely to the CSS rules. The allowlist now serves `.css` as `text/css; charset=utf-8`, and its route test covers the exact RPG stylesheet path.

## Validation

- `node --check` passed for `preview-host.mjs`, `host-ownership.test.mjs`, `server.cjs`, and `server.test.cjs`.
- `host-ownership.test.mjs` passed with the new bounded-dimension and fixed-stage observer assertions.
- `rpg-e-r1/contract.test.mjs` passed: 41 checks; mock GPU API only.
- `preview-validation-host/server.test.cjs` passed: 43 exact hashed routes, now including stylesheet retrieval.
- On owned port 4183, HEAD returned `200 text/css; charset=utf-8` for `preview.css`; index, host module, and preview-freeze also returned 200.
- Refreshed `preview-freeze.json` SHA-256: `86a00b751efa16b6e51992d111c156e52f80ccc70af85bc7a7bac298273d8bd4`. Validation host's RPG preview-freeze pin matches this exact hash.

## Native status

No post-fix native pixel proof is claimed. The attempted owned IAB launch failed because this agent's CUA reports `Browser is not available: iab`; Chrome was not used for this follow-up. The temporary server and any task-owned browser resources were closed. Primary can perform native post-fix review in its available IAB at held ages 180, 650, and 1000 ms, followed by one normal 0–1200 ms loop. Verify URLs must keep `verify` present. Review quality, SFX listening, adoption, and game integration remain separate.

Changed technical files only: `runtime-preview/preview.css`, `runtime-preview/preview-host.mjs`, `runtime-preview/host-ownership.test.mjs`, `runtime-preview/preview-freeze.json`, validation-host `server.cjs` (`.css` MIME and RPG preview-freeze hash pin), and validation-host `server.test.cjs` (stylesheet route assertion). Creative `rpg-e.mjs`, `preview-fixture.mjs`, and package `source-freeze.json` were not modified.
