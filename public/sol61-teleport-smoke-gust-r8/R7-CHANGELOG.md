# R7 implementation record

R7 adds a versioned conversion-radiance shader path to the frozen R6 curved smoke and height host. The seven cross-sections, phase/physical-height rules, paired-ticket privacy, authored pose source, finite SFX scheduler and PCM are inherited; the new radiance source is the exact Sol-approved `radiance.mjs`. Smoke scattering remains neutral and non-emissive. A separate density-qualified conversion source is sampled through the same medium and is composed back→body→front into the observer-only source target so actual alpha attenuates rear light. GPU flux slots 0–4 carry body flux, conversion flux and its weighted centroid; the buffer is cleared every frame and bound to independently reflected shader layouts.

`sourceRole` now names any active optical emitter. `bodySourceRole` preserves the shorter, ticket-authorized body-source diagnostic, and `conversionSources` reports the separate event-owned source lifetime. These diagnostics do not grant suppression or gameplay authority.

The derivative changes only its own preview package. R6 inputs and all upstream design sources remain byte-identical. Focused CPU/source tests pass; WGSL compilation, native replay, quality, normal audio listening, game integration, Safari and adoption remain pending.
