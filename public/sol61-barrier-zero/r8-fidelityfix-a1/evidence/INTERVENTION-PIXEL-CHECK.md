# Barrier r8 per-cell near adapter pixel check

This is technical native-GPU support evidence for attempt `per-cell-near-fix-a1`; it is not a visual-quality acceptance. The frozen r8 runtime remains unchanged.

- Source runtime SHA-256: `ba17d5d4c59116be9fa89f25d438d668c1dfd32c6c67bd461a5c3b6bc6b18041`
- Attempt runtime SHA-256: `8f427e783340a1cb8e2e1d54609c6054a263d251c33a1963787dbef64347cb0f`
- Browser verification URL: `http://127.0.0.1:8774/pixel-check.html?verify=barrier-r8-fidelity-a1`
- Captures: `7`, each confirmed by a later submitted frame; canvas `980Å~620`; GPU errors `0`; verification audio context `absent`.
- Every dual capture reports two horizontal and two vertical blur draws with scissor rectangles `[157,212,176,196]` and `[647,212,176,196]`.

| Matched phase | Total changed pixels | Left cell | Right cell | Bounds inside corresponding scissor |
|---|---:|---:|---:|---|
| default-create160-dual vs near-off-create160-dual | 7111 | 4012 `[202, 274, 268, 360]` | 3099 `[695, 278, 755, 357]` | True |
| default-create430-dual vs near-off-create430-dual | 14944 | 7892 `[199, 256, 290, 363]` | 7052 `[690, 258, 779, 362]` | True |

At both create phases, toggling only `near` produces pixel changes in each cell, and the measured delta bounds stay inside their respective submitted scissor rectangles. At hit age 55, source-off changes 15,658 RGB pixels against the default live hit. The source-off hit capture and expiry/off capture are exactly equal in RGB (same PNG SHA-256 `f068cd3c...`), confirming the expired field contributes no visible pixels in this fixture.

Native capture files and submitted-frame metadata are under `outputs/request-20260930/sol61-barrier-zero/r8/attempts/per-cell-near-fix-a1/evidence/`. The machine-readable measurements and per-capture hashes are in the adjacent `INTERVENTION-PIXEL-CHECK.json`.

Statuses: runtime adapter technical check verified; quality, listening, game integration, public replay, and adoption are not run/unadopted.
