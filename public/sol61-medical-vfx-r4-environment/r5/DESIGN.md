# Medical r4 environment E r5 — visible material/transport candidate

Ownership: outputs `medical-vfx-r4-environment/r5` and canonical `public/sol61-medical-vfx-r4-environment/r5` only. Preserve immutable original and r1–r4/history. No new image, fixture, equipment, sound, flicker, sweep, particles, gallery or app edit. Native quality is pending.

## Observed failure and revision

Reviewed actual r4 `medical-vfx-r4-gallery-registration/native/r4-obs-off.jpg` and `r4-off.jpg` with view_image, and quality feedback `r4/gallery-registration/PUBLIC-RESULT.json`. r4 was WebGPU ready and enabled, errors0; public embedding was confirmed by the primary. This is weak visible action, not missing code/reflection or failed publication. Its receiver ratio near.05 and cushion peak.14 repeated baked reflection shapes and disappeared at actual fit. CPU ray geometry did not establish readability.

r5 retains source-derived projection but explicitly strengthens upper-input relative calibration4→24 and vinyl peak.14→.64 linear. Both frame sides are treated; actual cabinet top receives a broad material-normal response. The practical readability contract is: at gallery fit, OBS OFF must show a clear material sheen on the cushion/actual surfaces and a corresponding frame-bound floor response that can be distinguished from this version's exact original. Native reviewers must reject a pasted patch, simple flat recolor, or conspicuous unexplained contour even if the numeric difference is large. Strong radiance is permitted; white output is not itself a pass or fail criterion.

## Immutable source and authority

Original1164×1351 SHA-256 `9f3fe2fb6772daa8104dcf97abe1bf87e5254a17af4c629dd0d3b5d7088ffa7e`. Image-stage B-code `map-zero-reset/medical-vfx-r4/B-design-code-medical-VFX.py` SHA `8cf8d6fe6c3359625512d994451016623311e417522b836228d609c70da26232`. That baked image-generation VFX stage is preserved and distinct from this WebGPU E. Current B commit `22d3fcfd617f42b1a967de767906204c0221ec64`, base blob `8f1286e12402fe7b19650ad44bcddb38ad227a08`, extension blob `f35b61661d0209c0329d4a501a760d35b451d52e`.

Applicable B runtime/extension principles: actual WebGPU ECode, VFX multilayer source/material/world/receiver separation, geometric morphology and material response, stationary transport causality, environment composition, actual-size readability, source-bound local OBS and LDM spatial radiance envelopes. PostEffects are selected for reflective highlights; variants/magic/particles are not compulsory. No image-schema structural or quality pass is asserted for runtime E. Current map exception requires no SFX.

## Source → metal → floor

The declared approximately4600K upper diffuse lighting remains stationary. Cross-section input samples−10°,0°,10° from vertical have weights.25,.5,.25, without inventing fixture geometry or a new lamp. Bed height.70m is source-declared; scale1164/2.88 ≈404.17px/m. Tube radius.018m is a visible-width assumption. Curved outward/up normals11°,14.5°,18°,21.5°,25° weighted.12,.23,.30,.23,.12 represent the reflecting arc.

Every pair computes incidence `-I·N`, reflection `R=I−2(I·N)N`, then floor intersection travel `.70/(-R.vertical)` and transverse displacement `travel*R.lateral`. Gaussian spread `(0.035m + .10*travel)*pixelScale` accounts for unresolved finite source geometry/roughness. Weight equals angular weight×incident cosine×reflectance.72×relative upper input24×projected tube width divided by normalized Gaussian area `sqrt(2π)*sigma`. Increased spreading decreases density. This budget and geometry produce the receiver; no independent rectangle start/end/width is selected on the floor.

Right tube x574, y443..994 projects east; actual left tube x343 with the same axial extent projects west using mirrored cross-section (same symmetric upper input); lower tube y1016, x355..570 projects south. Finite source-axis support transfers to the floor with roughness broadening. Floor183,358..974,1252 excludes bed/contact323,394..603,1100. Room clipping discards out-of-bounds light without renormalization. New irradiance multiplies the decoded original floor color to retain material read, rather than independently adding a luminous white rectangle. Relative calibration24 is an explicitly selected visibility calibration against a baked photograph-like texture, not measured lux or proof of global energy conservation.

## Source → material → view, then separate OBS

Vinyl bounds357,430..563,550 and358,572..563,990 use dome normal `normalize(-.62*qx,-.43*qy,1)`, upper source/view `(0,0,1)`, half-vector response exponent16 and peak.64. The lobe follows the two cushion geometries and static normal field, not motion or recoloring the whole room. Cabinet206,117..479,253 uses this broad half-vector response at.75 coefficient, excluding actual tray bounds215,136..338,239 and384,121..470,233. It is a selected micro-normal approximation on the existing top, not a new object.

Registered metal: right569,443..580,994 and left336,443..349,994, peak10.8 with x sigma3.5 and axial sigma240; lower355,1006..570,1026 peak7.5, sigma90×3.5. Exposed legs350,1020..363,1038 and560,1020..573,1038 respond.42. Faucet884,111..903,191 responds4.8 near893,138. Ceramic795,188..977,286 retains drain exclusion around885,235 and a shoulder near942,229, peak.32. Wall146,350..169,1247 has supporting source-return.025. These surfaces use distinct response widths instead of generic global grading.

OBS is a separate local PSF bound to the actual metal source regions. Right/left radii20×180 peak.18; lower80×18 peak.14; faucet18×22 peak.095. It does not produce floor irradiation. OBS OFF retains all world material/transport response. Source/world/effect OFF returns exact sampled original including baked VFX; it cannot turn off the image's baked lighting. No blanket.97/headroom cap. PERIOD=0; shader time unused.

Source PH3/PH5/PH6 Optics applicable/primary. Materials PH3/PH5 applicable/primary, PH6 not_applicable/latent. Thermo all applicable/latent; Fluid/WaveOptics all not_applicable/latent. Electromagnetics PH3/PH5 applicable/latent, PH6 applicable/supporting. Rheology PH3 applicable/supporting, PH5/PH6 not_applicable/latent. SurfaceScience PH3 applicable/supporting, PH5 applicable/primary, PH6 not_applicable/latent. Those source states are preserved, not relabeled as simulated by this shader.

## Limits and review

This is analytic 2D registered transport plus selected material-normal responses, not calibrated 3D transport, a complete BRDF, complete source hemisphere, geometric occlusion beyond masks or global radiometry. Normal distribution, radius, roughness and relative source calibration are artist assumptions. OBS is analytic source-bound PSF, not an extracted HDR convolution pass. Input already contains baked reflections, so double-counting/coherence must be judged visually. Stronger source calibration may create broad overbright floor or mattress glare; runtime quality may still fail.

CPU checks test geometry, normalized spreading, stationary/off contracts, source registration and closure; they do not test actual shader compilation or visual quality. Root native: `index.html?embed=1&verify&obs=off` first; exact original/effect OFF; combined; source/world OFF; OBS ON/OFF. Same `window.__medicalR3` state/evidence/setEffect/setLayer/setTime/resume/stop. Inspect gallery fit and full size, zero errors and silence. Adoption and game integration remain separate.

Requested creative route is GPT-6.1-Sol. Actual execution model ID is not exposed to this worker's tool/session metadata; do not infer it from requested route or agent name. Primary must reconcile real execution/spawn evidence. Local catalog2026-10-01 establishes display spelling only. Unresolved quality/design judgment is this assignment's scope.
