# Cannon R12 faithful runtime

This private runtime adapts the settled R11 WebGPU gallery/runtime contract to the exact R12 effect and shader bytes. Producer source remains an unsealed Sol draft and was only copied into this owned output. No creative design edits or quality acceptance are implied.

## Source and adapter contract

- Exact copied R12 effect: `source-r12/effect.mjs`, SHA-256 `a083818c5c4c09c90c56c727b9e893329cf8e1bb13f873569585c7a88fa1eb59`.
- Exact copied R12 audio: `source-r12/audio.mjs`, SHA-256 `683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a`.
- Exported WGSL shader SHA-256 `c6b03455df10f3006c0a3754d974071180ccde451a5314cd61e341d6963e1aa4`.
- R11 renderer/gallery adapter logic is identity/hash adapted only; the R12 effect module and shader are the exact supplied source bytes. Audio is byte-identical. The original producer folder is unsealed and untouched.
- Existing ABI preserved: 32-byte event tuple / 8 float32 values `[u,y,encodedAge,power]`; 16-byte View uniform; 16 depth samples; no additional bindings or draw adapters.
- Activation 900 ms, beam 420 ms, connected endpoint and sampler/source validation retained. R12 shape front freezes at reduced-motion age 210 ms while event age/lifetime remains real.

## Focused validation

Run from repository root:

`node --test outputs/request-20261004/finish-cannon-r12-runtime-luna-r1/runtime-r12/tests/runtime-r12.test.mjs`

`node outputs/request-20261004/finish-cannon-r12-runtime-luna-r1/runtime-r12/check-route-pins-r12.mjs`

The focused suite checks exact pins, adapter adaptation, R11/R12 sampler parity, finite front saturation and reduced freeze, exact 420 ms expiry, verify-mode audio mute, 32-byte tuple offsets, View16 and shader import. These are source/CPU and fake-WebGPU checks; they do not establish native GPU success, visual acceptance, whole-life smoothness, ordinary audio, device performance, adoption or game integration.

## Root native review

The private host serves only the four routes enumerated in `ROUTE-PINS.json`, checks each response against pinned byte length and SHA-256, binds only to `127.0.0.1`, and requires a random initial browser lease token followed by an HttpOnly SameSite cookie. Host lease expires after 30 minutes. All review URLs use `verify=1` (audio hard-muted).

Page API: `window.__alchemyCannonNativeReview.snapshot()` and `window.__alchemyCannonNativeReview.capturePulsePhase({phaseMs:220,causeId:"cannon-r12-root-review"})`; current proof: `window.__alchemyCannonProof`. Capture the same cause at 28/100/150/210/220/420 ms and continuous 1x life; inspect actual completed frame snapshots and screen output. No root-native or quality acceptance is asserted here.

Stop only this owned host with `runtime-r12/stop-host-r12.ps1`; it checks PID, start time, executable and command line, sends the random shutdown token, then verifies the port is closed.
