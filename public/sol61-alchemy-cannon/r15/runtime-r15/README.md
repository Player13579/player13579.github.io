# Cannon R15 faithful runtime

Private native-review runtime only. Creative source inputs were copied byte-for-byte to `source-r15/`; producer files were not modified. The ESM-imported `SHADER` hash is checked after importing the effect, which itself imports mandatory `material.mjs`.

The inherited adapter is the settled R13 cause-preserving review control. R15 changes only gallery/version and source pin identities plus material-module integrity checking. Exact source pins and five-route closure are recorded in `SOURCE-PINS.json` and `ROUTE-PINS.json`. Copied authored checks ran only from `test-support/producer-r15`; they report 104 sampler parity and 240 support-bound checks. Adapter regression checks live in `tests/runtime-r15.test.mjs`.

Root native gate: open the leased URL with `verify=1` (all audio is hard-muted). The page starts idle, and no effect event is created until explicit review. Use the API `window.__alchemyCannonNativeReview.capturePulsePhase({phaseMs:220,causeId:'cannon-r15-root-review'})`; subscribe to the frame proof, await the returned completed proof, and capture OFF/ON with the OBS control at the same cause/phase. Expiry uses the same cause at 420 ms. `window.__alchemyCannonNativeReview.snapshot()` returns the latest proof; `window.__alchemyCannonProof` is the page proof. Keep the phase/event/frame/completion and screenshot association exact.

The host serves only the five pinned files from `preview/cannon-r15` over loopback with an expiring one-time lease. Cleanup after root review with `stop-host.ps1`; it verifies the exact PID/start/executable/command and lease token, then checks the listener is gone.

This preparation makes no native compile or visual-quality claim. Audio listening, ordinary SFX, performance, Safari/device compatibility, game integration and adoption are pending.
