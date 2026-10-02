# Teleport pixel r1 isolated preview review

This package binds the unmodified Sol creative module to an existing white-hood/front authored sprite texture through the current player sprite cache lease. The visible pair and one-endpoint records are local fixture data. No game, server, gallery, browser, or published asset was touched.

The preview adapter preserves the producer contract's privacy boundary. Endpoint-only projections accept only whitelisted visible endpoint metadata and reject extra keys such as caster, saved origin, omitted endpoint ID, hidden source data, or private pose. An arrival endpoint must identify the transported actor as its public source player; a departure endpoint must bind its visible source player and target to the transported actor. It validates room/incarnation/session identity, family, event type/variant/radius, endpoint coordinates/time, actor revision and pose identity. It uses a single local first-receipt clock and checks eClock room identity before applying the finite lifetime. Endpoint-only plans have one endpoint and `bodyLease: null`; this preview never suppresses a normal gameplay body. Duplicate polls with the same incarnation/session/cast/role are rejected, while a new client session generation is distinct.

The full-pair fixture is an explicit already-paired input. The adapter does not infer a pair from time, position, actor, or adjacency. Its test confirms departure caster/target, arrival actor, source IDs, and shared cast identity before producing a frozen preview receipt.

## Contract gaps left for integration

- The creative module's current `admit()` remains full-pair-only. Endpoint-only behavior exists only in this preview adapter and is not game integration or producer/source-proof acceptance.
- Full-pair admission now keeps authoritative fractional `from`/`to` values and the transported actor's exact pose anchor, while checking legacy event coordinates against `Math.round(raw coordinate)`. Fixtures cover a valid fractional pair and reject a wrong rounded cell and substituted source. The preview adapter is still local fixture code; this does not establish real producer/source-proof acceptance.
- Endpoint-only arrival creates no gameplay body suppression, correctly avoiding hidden/moving-body mistakes in a visual preview. Production still needs the separate prepared-command/body ownership integration with actor+cast+revision+endpoint lease semantics; it must suppress only after successful prepared pixel commands and return ownership on cancellation.
- The chosen existing sprite path and SHA-256 match the current runtime motion manifest. That manifest does not record the original image author, so this preview marks authorship unresolved and does not claim asset-author acceptance.
- The preview needs the current canonical dirty `webgpu-player-sprite.js` for `prepareSampledResource` and `ownerLease.pin`. Git HEAD `6275464` lacks this API. The dependency manifest and package source-freeze pin the observed worktree bytes; the dirty technical dependency is not a game-release dependency and must be independently integrated or excluded before any publication.
- No real browser, WebGPU shader compile, GPU submission, visual quality, sound, server projection, or game producer was tested. Node VM tests establish adapter semantics, source/asset identity, and current sprite-cache lease behavior only.

No change to `DESIGN.md` or `teleport-pixel.mjs` was needed. Existing authorship labels in `source-freeze.json` are preserved.
