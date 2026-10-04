# R13 repair attempt 02 — single-pulse restart cause preservation

Attempt 01 and its root-reviewed native evidence remain untouched. Console evidence in attempt 01 showed `restartCurrent → start(lastMode) → createPulseReviewEvent` with an empty cause after ordinary pulse completion. The same cause was also omitted when an OBS/source change restarted an active single-pulse run.

This attempt carries the active `run.causeId` through OBS/source restarts and retains the last native-review cause after expiry. A single-pulse start now fails with a clear state error before renderer/audio state is changed if no valid cause is available; the ready route remains idle and does not invent a cause. Held `pulse-review` changes continue the held frame without restarting it. The 900/420 ms creative sampler, source bytes, audio bytes, geometry, shader, bindings, and review API otherwise remain unchanged.

Validation: `tests/runtime-r13.test.mjs` exercises the actual exported restart handler for an active run, post-expiry run, held review, and no-cause state. It binds the retained cause to the actual R13 event sampler and native pulse proof and checks event identity, age 220, visible vertices, cause, and completed queue proof. Full inherited R13 suite is 9/9 passing. `ROUTE-CLOSURE-CHECK.json` verifies exact four route bytes/hash pins and local import closure. Before native review, no host was running; the later fresh host was launched only for root control verification and has now been stopped.

The specific control-repair verification is complete. Visual quality, ordinary SFX listening, device/performance, game integration and adoption remain pending. Attempt 01’s saved console error is preserved as historical evidence.

## Limited native control-repair verification

Root used a fresh private attempt-02 host (PID 35336, port 58797) and verified four active-run and four expired-run OBS/source toggles. Each restart retained visible event ID `alchemy-cannon-review:cannon-r13-control-repair`; expired toggles recorded the same terminal pre-cause and restarted with the same ID. A separate held220 control check retained age 220 and queue completion. Root's `native-root/control-check/SUMMARY.json` reports no errors; console capture is empty. The source/creative pins remained unchanged. `HOST-STOP-RESULT.json` records identity-checked stop and port closure.

This is a limited pass for the cause-preservation control defect only. The same root summary states `R13 material/OBS fail unchanged`; it is not a material/visual quality pass and does not establish full motion, SFX, device, performance or game integration.
