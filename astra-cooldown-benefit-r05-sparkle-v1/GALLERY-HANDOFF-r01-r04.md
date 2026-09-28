# Cooldown r0.5 sparkle r01-r04 gallery handoff

Owned base: `.codex-runtime/pages-telemetry-release/astra-cooldown-benefit-r05-sparkle-v1/`.

Copy only the 44 exact paths in `allowlist-r01-r04.json` into the same relative base under public. Each version is standalone. Source and evidence are frozen. Do not replace the adopted `astra-cooldown-benefit-v1/versions/r05`. The current root scratch preview is not the publication entry.

| Version | Quality | Why | Replay |
|---|---|---|---|
| r0.1 | rejected | Receiver glints buried inside strong body emission; H64 sparkle shape unreadable. | `versions/r01/index.html?verify=1&embed=1&height=64` |
| r0.2 | rejected | Larger rays still centered inside body; core and arms not independently legible. | `versions/r02/index.html?verify=1&embed=1&height=64` |
| r0.3 | quality-hold | Primary review hold: prism corners visible; receiver sparkle difference remains weak at phase .715-.845. | `versions/r03/index.html?verify=1&embed=1&height=64` |
| r0.4 | review-pending | Primary visual candidate: corners -> feet -> both body sides readable, original geometry/emission preserved. User adoption and auditory review pending. | `versions/r04/index.html?verify=1&embed=1&height=64` |

All revisions remain not user-adopted and not game-integrated. The parent r0.5 remains adopted. Gallery listing is not adoption. Metadata VERSION.json is authoritative for current quality; historical design notes describe their review stage at creation.

Technical: r04 36 focused checks; 350 WebGPU submissions / 3 loops / errors 0; 102 captures. Original vs OFF exact for 34 H64 images. Body and face alpha protection: 10 late-life images have zero newly changed covered-body pixels. Original source 5 hashes unchanged. Single-trigger OfflineAudioContext check passes; verify browser output is silent. Actual hearing, game binding, gallery iframe and isolated GPU timing are not verified.

Evidence per version: `versions/rNN/evidence/lifetime-h64-{dark,light}.png`, `comparison-h64-{dark,light}.png`, `gpu.json`, `focused-tests.json`, `pixels.json`. Each package contains runtime, evidence and source documentation.

| Package | SHA256 |
|---|---|
| `cooldown-r05-sparkle-r01-package.zip` | `588f4270bc69ad89d545ac8de686d04f44bc9754d4761b9c340c470b081c848e` |
| `cooldown-r05-sparkle-r02-package.zip` | `68f52c0cbc6fcf8cd3cf952738f36138f9aba75507df073886bfe80158fda6a9` |
| `cooldown-r05-sparkle-r03-package.zip` | `e989b590874830b8350fb74a7e11d107d7d2c232710f82c7a7e8f9ab7d980c75` |
| `cooldown-r05-sparkle-r04-package.zip` | `b9b8c76ec263a85759d1ced16ca1642e52e1be0b98b13e14d03b1879a03b4952` |

Allowlist SHA256: `02a52340b4b7caa41f7d209c847f1c4dbde0b409f94e29284089768f0bb4f1e5`
Handoff SHA256: `4881b55abbcde154bbf2eed2eef283ff7cf03a86d84357bc1b310e2477f28b69`

No original/game/gallery/adoption files were edited. Browser and server resources are closed.

モデル分担: GPT-6-Astra 100% — sparkle design/VFX/SFX, source-preserving implementation, focused tests and WebGPU evidence. Exact model display name from 2026-09-28T12:36:15.1649272Z local model-routing-state.json.

Game port: `PORT-CONTRACT-r04.md`, SHA256 `804b30a4c9c04d7ab7238c43dc39729344c37517de290c98fa0970b5738f3901` (read-only inspection, exact parameters and proposed additive OBS draw). Game integration is separate and not implemented here.
