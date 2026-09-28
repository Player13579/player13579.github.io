# Barrier E r0.7

Barrier E r0.7 is a root redesign of the barrier as a **digital defensive field**. It was authored from scratch from the current request and the observed r0.6 implementation failure, without using Sol / Astra / old barrier designs or reusing the failed cup/sleeve/gate/frame readings of earlier r0.x versions as creative input.

## Included deliverables
- design contract and audit
- executable WebGPU code and WGSL
- CPU sampler and proxy evidence
- H64 dark/light 4-event auto-loop preview
- SFX WebAudio implementation and WAV renders
- tests and SHA256 manifest
- explicit `not_run` acceptance status for real GPU / real listening / final quality

## Key change from r0.6
r0.6 could black-screen because the composite stage bound a texture/sampler combination with a type mismatch. r0.7 removes that risk by using a **textureLoad-based composite pass with no sampler**.

## Preview
Open `barrier-pro-gallery.html` from a local HTTP server in Chrome with WebGPU enabled.

## Acceptance status
This ZIP does **not** declare final quality acceptance.
- real GPU acceptance: `not_run`
- continuous playback acceptance: `not_run`
- real audio acceptance: `not_run`
- final quality acceptance: `not_run`

Compile success, readback success, or numeric tests are not treated as visual acceptance.
