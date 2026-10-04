# Cannon R10 faithful runtime draft

Creative source: GPT-6.1-Sol R10, unsealed draft. This adapter is based on the settled R9 runtime, preserves its R8-derived renderer/gallery behavior, and replaces only R9 identity/source pins plus the exact R10 effect/audio modules.

## Frozen input pins

- effect.mjs: a532bbefe31fa73c04c3f8bb66ce1d8dc83e21a61423c4d7b5bc33c56b1cc3b4
- imported SHADER export: bbbcf682cbd43de7b221ff164973ccf81606ac8fb6bd4634c15754a6c3edac20
- audio.mjs (preserved): 683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a
- R10 DESIGN-CONTRACT.md SHA-256: 2a4f4d8d1c792ab143497f4178c64858322e8307c83d312677b0dd7a1cb65047

## Runtime contract retained

32-byte event vertex tuple; 16-byte View uniform; depth samples remain 16 in the vertex ABI; main/observation tags and layer routing unchanged; event/cause/source/endpoint/frame binding, 900 ms activation and 420 ms beam expiry, reduced-motion freeze, OBS-only overlay, hard-muted verify mode, gallery lifecycle/startup protocol, and R9 audio bytes/behavior are retained. No damage/impact effects are invented.

R10's creative shader projects three ordered charge sheets. CPU steps compatibility remains available but the projected sheet renderer makes no quadrature or depth-integration accuracy claim. The actual native browser review must inspect same-event 220 ms OBS ON/OFF, 420 ms expiry, and the normal full-life root review API. CPU/source checks and mocks do not establish native WGSL compilation, visual acceptance, SFX listening, performance, Safari/iPad, or game integration.
