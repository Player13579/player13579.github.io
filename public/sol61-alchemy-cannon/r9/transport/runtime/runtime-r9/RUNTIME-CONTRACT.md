# Cannon R9 faithful runtime contract draft

This private runtime package adapts the established R8 preview renderer and gallery protocol to the supplied **unsealed R9 draft**. It does not modify or freeze that creative input. The output owns only this private package; no catalog, shared game/runtime, public source, or release candidate is changed.

The R9 source event sampler, `validateEvent` / `sampleEvent` API, audio bytes, 900 ms activation, 420 ms beam, event/hand/endpoint identity, `gbo-tenfold` variant, causal frame clock, source and OBS controls, reduced-motion encoding, verify hard mute, and parent startup handshake are retained. The 32-byte vertex tuple remains at locations 0/1/2 and offsets 0/8/24; the View uniform remains 16 bytes. Negative material tags still identify main emission (-2, layer 2) and OBS (-1, layer 0); ordinary straight-RGBA vertices remain on the existing premultiplied pipeline. The R9 shader export from the copied draft is used unchanged. Its three overlapping transported rolls and 16-depth main material integral run only in the fragment shader; no CPU render integral, texture, binding, mesh, rail, static lattice, detached white peak, background compensation, or lens symbol was added.

The R9 creative inputs remain draft-provenance only: exact copied effect/audio SHA-256 values are recorded in `SOURCE-PINS.json`. The source `DESIGN-CONTRACT.md` and its checked CPU draft results are copied verbatim for review context. They are not sealed creative approval or visual acceptance. Root owns native compilation, actual drawing, material/quality judgment, and any freeze decision.

## Native review URL and API

After the owned server starts, use the base URL and PID in `HOST-LEASE.json`.

- Held sample, OBS on: `/?verify=1&pulsePhase=220&causeId=r9-native-220&variant=continuous&observation=1&source=1`
- For a same-event/frame/cause OBS-off comparison, uncheck the OBS control. The page re-renders the held review sample; use `window.__alchemyCannonNativeReview.snapshot()` for the completed receipt. `capturePulsePhase({phaseMs:220,causeId:'r9-native-220'})` is also exposed for a fresh held frame.
- Continuous beam life: `/?verify=1&mode=pulses&variant=continuous&source=1&observation=0`; root can also choose GBO with `variant=gbo-tenfold`.
- Reduced-motion fixture: `/?verify=1&mode=pulses&reducedMotion=1&variant=continuous`.
- Exact beam expiry: `/?verify=1&pulsePhase=420&causeId=r9-expiry&variant=continuous&source=1&observation=1`.
- Effect disabled: hold at 220 ms and set `source=0`; the gallery source checkbox/query controls the actual render input.

`verify=1` hard-mutes the audio. These routes expose synthetic fixed hand `(180,270)` and endpoint `(760,270)` review fixtures; they prove renderer behavior only and do not establish game integration, full activation quality, performance, or ordinary audio listening. The design contract's rejection criteria remain active: three flat rails, decorative lattice/repetition, disconnected white peaks, or the prior thin band plus isolated leaf are not acceptable. Compilation and CPU checks alone do not pass these visual requirements.
