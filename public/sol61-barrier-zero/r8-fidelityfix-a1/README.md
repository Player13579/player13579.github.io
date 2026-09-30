# Barrier r8 repaired a1 — isolated runtime package

Edition id: `r8-fidelityfix-a1`. This combines the verified per-cell near-blur adapter with the Sol B-contract clarification. It is local package output only; no shared gallery or Git/public files were changed.

## Run and verify

Requires Node.js and a WebGPU-capable browser. No third-party, CDN, network module, or remote asset dependency is used. From this directory:

- `node verify-package.mjs` checks package closure, the immutable 23-file artist freeze, runtime identity, revised contract identity, imports, and actor/SFX assets.
- `node runtime-port-test.mjs` runs 78 bounded runtime topology/authority/support checks.
- `node cpu-check.mjs` runs original finite/support/state tests.
- `node verify.mjs` verifies the artist freeze; `node verify.mjs --serve` serves at `http://127.0.0.1:8765/index.html?verify=barrier-r8-fidelityfix-a1`. The verification query forces audio to zero. `POST /capture` writes inside this package's `evidence/`.

The original `b-contract.json` at package root remains part of the frozen 23-file source. Clarified package-level contract: `contracts/b-contract.json` (SHA-256 `bd33f7961d654a7f45af02d78ad257f72d691bd6b7f3912ede5b23486a388e69`). Its source/audit/CPU artifacts are copied under `provenance/b-compliance-fix-a1/` unchanged; their relative paths refer to the original attempt directory `C:\Users\user\Documents\Codex\2026-07-12\defenders-vs-attackers\outputs\request-20260930\sol61-barrier-zero\r8\attempts\b-compliance-fix-a1` and are provenance, not validators to run after relocation.

## Provenance and evidence

- Original artist manifest: SHA-256 `dadbc6e9542ec789eb677a7843d0f6205adbec08032d3bdb5d9f9bd8e3350de0`, 23 files, copied byte-identically. Original r8 source remains untouched.
- Runtime adapter source: `per-cell-near-fix-a1`, from `C:\Users\user\Documents\Codex\2026-07-12\defenders-vs-attackers\outputs\request-20260930\sol61-barrier-zero\r8\attempts\per-cell-near-fix-a1`. Original runtime SHA-256 `ba17d5d4c59116be9fa89f25d438d668c1dfd32c6c67bd461a5c3b6bc6b18041`; repaired runtime SHA-256 `8f427e783340a1cb8e2e1d54609c6054a263d251c33a1963787dbef64347cb0f`. Both blur passes iterate all cell scissors; first draw clears, second preserves. No artist parameters/WGSL or JS descriptor layouts changed.
- Revised B contract: source attempt `C:\Users\user\Documents\Codex\2026-07-12\defenders-vs-attackers\outputs\request-20260930\sol61-barrier-zero\r8\attempts\b-compliance-fix-a1`; same creation-time B commit `37eb4bdfe59f0dc075f9b4333b7d6af76b784a88`; artist code and parameters unchanged. Eleven scoped custom CPU checks pass. This is not canonical schema certification.
- Native WebGPU evidence from repaired runtime: `evidence/native-interventions.json` and seven PNGs under `evidence/native-interventions/`. Dual near-off deltas are nonzero in both cells at create 160/430 ms within submitted scissors; source-off hit and expiry are RGB-identical. This does not establish aesthetic quality or full-life continuous review.
- Canonical Pages replay: `CANONICAL-REPLAY-PROOF.md` records a foreground Chrome run at the copied path: 58 lifecycle frames across 29 phases and both modes, 12 isolation diagnostics, 58 later-confirmed frames, zero GPU errors, and no verification AudioContext. This proves technical replay only; the user-observed digital-semantics failure remains controlling.
- Exact package file hashes and dependency findings: `package-manifest.json`; runnable closure check: `verify-package.mjs`.

Statuses: runtime and bounded contract checks pass; independent canonical schema audit not run; visual-quality disposition: user-observed fail for digital semantics (root-owned review); full-life quality review, listening, game integration, and public publication are not run; adoption remains unadopted.
