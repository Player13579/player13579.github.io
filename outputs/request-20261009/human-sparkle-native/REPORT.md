# Human Transmutation R5 vs R6 native WebGPU replay

Status: `PASS_NATIVE_WEBGPU_REPLAY_AND_CAPTURE` for the direct preview entry only.

The sealed R6 package was left unchanged. Before Edge launched, its package manifest, READY marker, SEAL, and every sealed file were checked against the owner-provided hashes. R5 manifest and all 10 files in its declared runtime closure passed SHA-256 preflight. R6 runtime closure (13 files) also passed local-host preflight. Browser-loaded runtime responses were verified byte-for-byte against the R5 and R6 manifest pins (10 loaded paths for each direct `index.html` entry).

Headless Microsoft Edge / Playwright used `verify=1`, muted audio, DPR 1, and the same 980×480 embed surface. Each version passed H64 and H128 captures at 450, 650, 850, and 1050 ms; `receipt.actualActorHeight` matched every requested height. H192 was skipped because the fixture API accepts only H48/H64/H128. All 16 captures are real 980×480 PNGs; each phase receipt had the expected exact version, elapsed time, four render passes, submitted/completed serial equality, and `queueCompleted: true`. Actual glint-source and emission attachments were read back after every phase.

Both versions completed two newly advanced natural loops through the page `replay()` API. Across active runs, shader compilation errors, uncaptured device errors, validation errors, device-loss errors, and rejected queue completions were zero. At the live continuous-loop snapshot, one next-frame queue completion remained in flight for each version; no queue operation was rejected. The adapter reported `vendor=intel`, `architecture=gen-12lp`; `isFallbackAdapter` was not exposed, so no hardware/fallback classification is claimed. Verification audio was not allocated. The public R5 root favicon returned 404 and was recorded as auxiliary; every manifest-pinned runtime resource loaded successfully.

This is standalone native technical replay and comparison evidence. It does not accept artistic quality, normal SFX listening, parent-gallery selection, publication, adoption, Safari/iPad, or main-game integration. Parent-gallery selection remains a separate post-publication check.

## Evidence

- EVIDENCE.json: outputs/request-20261009/human-sparkle-native/native-attempts/99640ee1-c03b-4c1e-83a0-3b4e82c44924/EVIDENCE.json
- Source preflight: outputs/request-20261009/human-sparkle-native/native-attempts/99640ee1-c03b-4c1e-83a0-3b4e82c44924/PRE-BROWSER-PREFLIGHT.json
- R6 immutable package manifest SHA-256: `5d2b0227669016ea7d229623272d714ea98f50bc194576efde2e8b27b590f4e7`
- Phase captures: `r5-h64-t450.png`, `r5-h64-t650.png`, `r5-h64-t850.png`, `r5-h64-t1050.png`, `r5-h128-t450.png`, `r5-h128-t650.png`, `r5-h128-t850.png`, `r5-h128-t1050.png`, `r6-h64-t450.png`, `r6-h64-t650.png`, `r6-h64-t850.png`, `r6-h64-t1050.png`, `r6-h128-t450.png`, `r6-h128-t650.png`, `r6-h128-t850.png`, `r6-h128-t1050.png`

Cleanup confirmed: Playwright context closed, Edge disconnected, and the owned loopback server closed.

## Retained harness attempts

- `9d639416-348d-48ec-bb0b-d4a8ce7860e8`: pre-browser check initially counted the manifest itself as one of the 20 content files. Corrected the harness to validate the manifest-plus-content convention against both seal and manifest entries; no browser launched.
- `413b9f55-ccc2-4cae-b962-acc90cbda6a1`: captured R5 phases, then correctly failed on the public root favicon 404 being treated as a runtime error. The final run records that auxiliary response separately.
- `b87a19b5-56ed-425b-8d8d-c6d94df87200`: R5 and R6 source preflights passed and R5 phases captured; the actual-response matcher initially retained the `/public/sol61-human-transmutation/r5/` URL prefix. The matcher was corrected to use the manifest-relative path; final actual response bodies remained strictly SHA-256 pinned and all 10 loaded paths per version matched.
