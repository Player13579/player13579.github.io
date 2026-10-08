# Human R3 actual native comparison

R3 ran in formal Chromium 151.0.7922.34 with Playwright 1.62.0, `chromium_sandbox=True`, and the declared SwiftShader WebGPU opt-in flags. The browser reported a SwiftShader fallback adapter; this is a software WebGPU capture. CDP’s actual command line was saved, with no `--no-sandbox`, `--disable-gpu-sandbox`, `--disable-web-security`, or `--ignore-gpu-blocklist` argument. The 16-file sealed source snapshot passed source and HTTP byte closure before capture, and the source pins were identical after capture.

The capture reused one R3 cause and generation at phase 452 ms for H48/H64/H128, source-off and observer-off states, then sampled phases 45, 220, 430, 440, 452, 464, 710, 790, 814, 840, 865, 1050, 1199, and 1200 ms. Each recorded completed and submitted counter is numeric and equal, and each screenshot followed the completed frame and rgba16float emission readback. Source-off at 452 and source plus observer off at expiry returned strict zero RGB. The run had no page errors and produced a WebM.

Against the prior R2 capture, R3 preserved the target (`revived-philia`), source image SHA-256, viewport geometry (1060×480 CSS / 2120×960 physical at DPR 2), dark body/canvas colors, and lifecycle emission readback counts across all heights and sampled phases. A foreground-pixel bounding measurement on the H48/H64/H128 canvas screenshots found horizontal spans of 109/146/294 px in R2 and 65/87/174 px in R3, reductions of 40.37/40.41/40.82%; vertical spans stayed 67/87/173 px. This measurement includes the actor and effect material and is a coarse visible envelope check.

The phase-452 R3 capture still shows short bilateral protrusions above the actor. Visual quality remains pending Root review. This receipt does not accept hardware, iPad, ordinary SFX, gallery, adoption, or public release.

See [NATIVE-OUTCOME.json](NATIVE-OUTCOME.json), [PAIRED-COMPARISON.json](PAIRED-COMPARISON.json), [SOURCE-PINS.json](SOURCE-PINS.json), and [RUN-CONTRACT.json](RUN-CONTRACT.json). Raw images, video, WebGPU observer evidence, HTTP closure, CDP details, and complete run result are in `matchingartifacts/`.
