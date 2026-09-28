# Barrier E r0.8

Barrier E r0.8 is a root redesign of the barrier as a **digital protective field volume** rather than a flat contour emblem. The intent is to make the protected airspace, front plane, rear plane, and event-specific causal state changes more legible at H64.

## Included
- design contract
- audit
- WebGPU renderer and WGSL
- CPU sampler
- H64 dark/light four-event auto-loop preview
- one-shot SFX implementation and WAV renders
- tests
- SHA256 manifest
- explicit `not_run` release status for real GPU / real listening / final quality acceptance

## Main design direction
- front and rear rounded-rect digital planes
- depth connectors and side ribbons to state volume
- clear interior airspace
- cause-specific state changes for create / absorb / fracture / bust

## Important status
This ZIP does **not** declare final quality acceptance.
- real GPU acceptance: `not_run`
- continuous playback acceptance: `not_run`
- real audio acceptance: `not_run`
- final quality acceptance: `not_run`

Passing code, tests, or WGSL compilation is not treated as visual acceptance.
