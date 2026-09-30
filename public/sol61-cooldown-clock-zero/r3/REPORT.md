# Cooldown Clock Zero r3 — technical replay handoff

The r3 source remains the Sol-authored design candidate `cooldown-clock-zero-r3` and keeps the settled clockwise clock contract: screen `+x` right/`+y` down, `direction(θ)=[sin(θ),−cos(θ)]`, current hand `1.55·smoothstep(.30,.72,t)`, end hand `2.4+.25·smoothstep(.30,.72,t)`, and remaining gap shrinking from 2.4 to 1.1 radians. Creative geometry, timing, palette, audio, and source files were not revised in this task. Only the runtime harness/snapshots and owned evidence/report were extended.

## Verification

- `node --check gpu-check.mjs` and `node --check main.mjs`: pass.
- `node clockwise-focused-check.mjs`: pass; 1,000 monotonic angle samples and unchanged frozen r1 (60 files) / r2 (68 files) manifests.
- `node cpu-check.mjs`: pass; 602,424 checks.
- `node renderer-port-check.mjs`: earlier pass; 570,554 projected support-pixel centers and 592,088 clipped-scissor pixels across four configurations, including all-angle current/end/wait-arc coverage.
- `node gpu-check.mjs --boot-only`: actual Intel Gen-12LP hardware WebGPU compile and first frame; zero faults; verify audio gain 0 and audio context not created.
- `node gpu-check.mjs --capture-only`: actual full-life H64 dual dark/light captures and diagnostic interventions; 544 paused capture intervals are kept separate from cadence evidence.
- `node gpu-check.mjs`: clean capture-free 10,700 ms scheduler window: 778 frames, 3 complete cycles, 575 intervals (mean 18.586 ms, max 36 ms, 0 intervals above 50 ms), zero faults. Separate capture-adjacent intervals are not combined with this result.
- `python evidence/verify-rendered-geometry.py`: screenshot pixel analysis confirms visible original body crop bounds of 39×63 px on dark and 38×63 px on light within the H64 quad projection (expected quad 38.684×64 px). Raster-ray peaks from the rendered dark-side clock pixels advance clockwise for both hands: current needle 354°→45°→87° and bright end hand 136°→145°→151° at the 310/510/700 ms samples. These are measured screenshot pixels, with expected angles and method recorded in `evidence/rendered-geometry.json`.

All owned Chrome tabs, Chrome processes, temporary servers, and checked profiles were closed/removed after each run. Verification used `?verify=1`; audio remained forced silent. The exact entry and source/evidence hashes are in `evidence/freeze-r3.json`.

## Scope and remaining gates

This establishes technical hardware-WebGPU replay, full-lifetime H64 dual-background rendering, clockwise raster motion, and the capture-free cadence result. Visual quality acceptance, actual listening, integration into the game, public replay, and adoption were not tested and remain separate gates. `index.html` is the standalone entry under `outputs/request-20260930/cooldown-clock-zero/r3/`; root owns gallery/release integration.

## Model work share

**GPT-6.1-Sol 45%** — authored the settled r3 creative design and clockwise contract. **GPT-6-Luna 55%** — implemented the faithful WebGPU port/harness checks and completed the bounded hardware replay, raster analysis, and evidence freeze without changing creative decisions.
