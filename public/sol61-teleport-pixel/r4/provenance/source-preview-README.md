# Isolated preview package

`index.html` replays the unchanged `../teleport-pixel.mjs` WebGPU prototype with an explicit local fixture. It loads the exact existing authored white-hood/front sprite file and creates a `DvaWebGPUPlayerSprite` sampled resource so the prototype pins the cache-owned texture version. The page offers a visible causal-pair fixture and separate arrival-only/departure-only projection fixtures.

This is a package preview, not a server-issued receipt or game/gallery integration. Its required sprite lease provider is the canonical dirty working-tree `webgpu-player-sprite.js` recorded in `dependency-manifest.json` and `../source-freeze.json`; the public Git HEAD does not contain that provider API. The canonical PNG's runtime motion identity/hash are verified, but its original image author is absent from the current manifest and marked unresolved.

Checks from workspace root:

```powershell
node outputs/request-20261001/teleport-pixel-zero-r1/runtime-preview/preview-contract.test.mjs
```

The test exercises endpoint privacy/causal pair validation, verifies actual source asset bytes, runs the current player sprite command/cache lease code in a VM, and binds the actual `bindAuthoredPose` implementation. It uses a fake WebGPU device for the cache path. No browser was opened and no test server was started; native WGSL compile, GPU output, and visual acceptance remain unverified.
