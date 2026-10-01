# RPG E r1 native WebGPU check — 2026-10-02

**Result: technical replay failed; do not register as replayable from this run.** The owned Chrome tab and local server were closed after the host began repeatedly allocating invalid preview surfaces. No source, creative module, fixture, freeze file, or validation host was modified.

The exact allowlisted server was started by this task on `127.0.0.1:4183`; it reported 43 pinned file routes. The owned tab was `1065418409`; the other pre-existing `chrome://newtab/` tab was left untouched. The tab was closed and the server process was stopped.

## Evidence

- At `http://127.0.0.1:4183/gunner-heavy-zero-r1/rpg-e-r1/runtime-preview/?verify=1&reviewAgeMs=180`, the visible page reported `VERIFY · AUDIO HARD ZERO`; AX state reported `Submitted E clock 180 ms · physical-surface light recorded · hypothetical preview only`. The expanded lease panel reported one WebGPU device, `rgba16float 1520×761`, distinct `baseRadiance`, `albedo`, `worldNormal`, and `worldPosition` inputs plus a valid-surface mask, and the intended surface-light → authored-E → tone-map → canvas sequence. The captured screenshot showed a black canvas with no distinguishable scene/effect pixels, so the status text alone is not accepted as visible replay proof.
- At the requested 650 ms held route, DOM state reported `E clock 650 ms · authored field ended; preview surfaces remain`. A read-only DOM query then showed `innerWidth=1368`, `devicePixelRatio=2`, but the canvas had expanded to `25,165,824 × 25,165,823` and its bounding rectangle to `16,777,216 × 16,777,215` CSS pixels. The stage became about 16.7 million pixels high.
- Chrome console contained repeated `RangeError: Preview surface dimensions are invalid or too large` from `makeSurfacePixels` → `ResizeObserver.resizeTargets` in `preview-host.mjs` (source SHA-256 below). This repeated during inspection, so I stopped without probing additional ages or normal playback.

The requested 1000 ms held state and normal 0–1200 ms loop remain untested. Verification used `verify=1`, so audio was hard-zero; normal gesture/SFX was not tested. There is no quality, SFX, adoption, or game-integration determination.

## Frozen inputs at test time

- `rpg-e.mjs`: `6c32c0414f095b883c37c17f8f923278fb4bcd9b3169c74331dc9c0e20071baf`
- `preview-fixture.mjs`: `eca9b0eb50975eb002ae4a7cf6034f4a4bb3d9f6332b121482cf2d18e5fd2410`
- `runtime-preview/preview-host.mjs`: `97e14825e038223c33cdb30e6008b2e5be66097e8576018a14bedd87cd9d2097`
- `runtime-preview/preview-freeze.json`: `87aa4fae82041373c3abe7bfd1d4b2ac9c9ab4f0825e31394bf0d79ccded033c`
- allowlisted `preview-validation-host/server.cjs`: `0d841bdabe363308c1487d91a5c9a7e5dafeeb9030f40a58b155f064d6336443`

**Handoff:** preview-host owner should investigate the canvas/stage sizing feedback caused during `ResizeObserver.resizeTargets`, then rerun the required held phases and normal full-lifetime loop. This report does not propose or apply a creative/shader change.

## Follow-up diagnosis after host repair work

The exact validation host returned HTTP 415 for `preview.css`: the allowlisted server's MIME table had no `.css` entry. The earlier 180 ms screenshot and 650 ms CSS layout measurements were therefore taken without the intended stylesheet. That missing stylesheet is a major confound and the observed sizing feedback should not be attributed solely to the CSS rules; this run does not establish that the effect kernel itself rendered black. The CSS-serving route is now fixed, but the required post-fix native screenshot remains pending because this worker's CUA exposes Chrome only and `createBrowserTab("iab", ...)` returns “Browser is not available: iab.”
