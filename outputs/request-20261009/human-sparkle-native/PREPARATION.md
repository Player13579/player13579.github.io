# Human Transmutation native WebGPU verification preparation

Status: native verification completed against the owner-sealed R6 package; see `REPORT.md` and its attempt evidence.

## Owned scope

This workspace is `outputs/request-20261009/human-sparkle-native/`. The candidate producer owns `outputs/request-20261009/human-small-many-r6/public/sol61-human-transmutation/r6/`; do not edit that tree. The runner and all results are owned here; the frozen R6 tree was read-only during verification.

## Runtime API observed

The R5 public `index.html` and current R6 candidate `index.html` expose the same `window.__human` API from their `preview.mjs`:

- `getState()` reports `ready`, `fatal`, `verify`, continuous-play `loops`, current receipt, renderer state, and shader `compilationMessages`.
- `hold(ms)` pauses the real runtime at that authored elapsed time, calls the actual renderer, waits for the render promise, and returns state.
- `replay()` invokes the page's actual replay button and waits for its render tail.
- `inspectGlints()` and `inspectEmission()` perform actual GPU attachment readback after a completed render.

The per-frame renderer receipt records the exact `version`, `elapsedMs`, actual actor height, canvas extents, submitted/completed serials, four submitted passes, and `queueCompleted: true`. Each draw uses the real `device.queue.onSubmittedWorkDone()` and pops a validation error scope. The page listens for uncaptured GPU errors and lost device failures.

Both observed HTML files use the same embed CSS extent (980×480). The matching route is `?verify=1&embed=1&height=64`; the runner must keep the same viewport, DPR, query, fixture/API, and requested phase for R5 and R6. Verification mode disables its audio UI path; Edge should also launch with `--mute-audio`.

`fixture.mjs` currently accepts actor heights `[48, 64, 128]` only. The agreed comparison heights are H64 and H128; H192 is unsupported and must be recorded as skipped. Record the actual `receipt.actualActorHeight` at every capture and require it to match the requested fixture height, since a nominal setting alone is insufficient.

The final runner also preflights the public R5 manifest and each declared runtime file, then hashes every runtime response actually loaded by Edge against that version's manifest. Keep failures from earlier harness attempts as history; fix harness accounting/path normalization without weakening actual response-byte checks.

## Intended native checks after package freeze

1. Confirm the R6 package manifest SHA equals the owner-provided immutable hash, then verify every manifest-pinned response served by the owned test host before launching Edge.
2. Load public R5 with exact source pins and local frozen R6 in owned headless Microsoft Edge Playwright pages, each with `verify=1`, muted audio, and the same 980×480 embed / fixture inputs.
3. At H64 and H128, capture both R5 and R6 at 450, 650, 850, and 1050 ms using `__human.hold(phase)`. Save actual-format PNGs and per-phase receipts. Record the actual rendered actor height and glint/emission attachment readback results for each capture.
4. Check exact version identity, shader compilation messages, GPU adapter information (including fallback/software identification when exposed), device loss and uncaptured errors, validation scopes, submitted/completed serial equality, and queue completion.
5. Exercise real `__human.replay()` and observe at least two newly advanced natural loops with no fatal state; capture before/after loop counters and final completed receipt.
6. Treat these as technical native replay and requested sparkle-comparison evidence only. Do not claim visual-quality acceptance from mocks, source inspection, or native rendering alone.
7. Close only task-owned Edge contexts and the local server, recording cleanup status. Do not touch user tabs or publish/mutate shared files.

## Source observations

- R5 public URL: `https://player13579.github.io/public/sol61-human-transmutation/r5/index.html?verify=1&embed=1&height=64`
- R5 manifest states normal gallery version `human-transmutation-sol61-r5`, but its `defaultVersionId` field names R4; preserve that discrepancy. The public catalog entry in `human-sparkle-source/EVIDENCE.md` identifies R5 as the displayed default.
- R6 package directory is present but its package manifest was not present at preparation time. The candidate files therefore remain mutable and are not eligible to run yet.
