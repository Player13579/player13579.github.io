# Donation coin glow and sparkle — native replay

Root inspected the frozen 9-route candidate through the Codex in-app browser on 2026-10-03. The route manifest is `../donation-coin-native-host-r1/routes.json`; its byte checks passed after the server started, matching the fixed candidate.

- Actual WebGPU initialization succeeded, controls enabled, and frames were visibly rendered.
- `1460.png` and `1830.png`: rotating golden coins have luminous faces/rims and visible white-gold cross streaks attached to them.
- `source-off.png`: disabling the source removes the phenomenon.
- `expired.png`: the effect has disappeared at 2800 ms.
- `loop.png`: embed mode starts without a play click and renders the animated card/coin sequence.
- Console error/warning query returned an empty array in both inspected modes.
- Existing receipt, timing, trajectory, SFX and raw public-parent preservation tests passed.

This is technical replay and verification of the requested visual change, not user adoption or game integration. Verify mode was muted; normal audio listening was not tested. Images were sampled, not a full frame-by-frame quality audit. The temporary browser tab and server were closed.
