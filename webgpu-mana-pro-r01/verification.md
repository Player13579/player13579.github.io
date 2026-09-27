# Mana Pro r0.1 adapter verification

Date: 2026-09-27 (Asia/Tokyo)

- Foreground Chrome route: `http://127.0.0.1:4179/webgpu-mana-pro-r01/?verify=mana-gallery-adapter-20260927&embed=1`.
- Result: WebGPU effect and scene rendered visibly on the 980×620 stage. Chrome accessibility state exposed only the canvas; status text and sound button were hidden in embed/verify mode.
- Local server requests for the page, `preview/replay.js`, `preview/scene.js`, scene WGSL, package state/geometry/renderer/index/integration, and mana WGSL returned HTTP 200. The prior missing `src/integration.js` route now succeeds.
- Verification mode remained silent by contract: audio is muted during initialization, the gesture unlock handler returns before `audio.unlock()`, and the AudioWorklet module was not requested. No sound was played or listened to; SFX quality remains unaccepted.
- Closed the Codex-owned Chrome verification tab and stopped the temporary Python server. The primary task's existing Chrome tabs were left open.
