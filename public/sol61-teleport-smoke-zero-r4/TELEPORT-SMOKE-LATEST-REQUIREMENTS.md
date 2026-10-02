# Teleport smoke redesign — latest user requirements

User requirements, 2026-10-02:

- Design the new teleport E from zero: disappear with white smoke, then appear with white smoke.
- At departure the character rises in physical altitude; at arrival the character descends in physical altitude. These motions do not move ground/world XY north or south.
- Make both height strokes quick and crisp. Separate their short motion duration from smoke dissipation; do not make the character float slowly while smoke remains.

Implementation proposal authorized for the design track: each height stroke is 140 E-ms at 1×. Exact artistic timings must be version-bound, with the existing E playback-rate policy applied once. Artistic presentation lifetime must not add gameplay delay or cooldown.

Creative owner: current GPT-6.1-Sol design track `teleport-smoke-height-zero-design`. These are specific requirements for this new teleport version, not a universal white-smoke or fixed-duration rule for all E. Existing pixel versions retain their provenance and are not evidence of acceptance of this new design.

Acceptance remains pending: actual WebGPU replay, fixed ground XY with readable physical elevation and ground-shadow separation, quick ascent/descent across the lifetime, white smoke, finite SFX, and gallery publication with true version-specific status. This requirements record is not an implementation or quality-pass receipt.
