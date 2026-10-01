# Medical r4 environment E r4 — frozen projected reflection contract

New candidate only; native quality review pending. Own this outputs r4 and canonical `public/sol61-medical-vfx-r4-environment/r4`. Original image and r1/r2/r3 remain unchanged. No SFX, image generation, arbitrary dynamics, new fixture or registry edit.

## Source, receiver and observer

The fixed approximately4600K upper diffuse source is the image-declared cause. Its cross-sectional directional spread is sampled at −10°,0°,10° from vertical with weights .25,.50,.25. No finite fixture position or additional directional lamp is invented. UpperSource→curvedMetal→floor and upperSource→vinyl/ceramic→view are separate world paths. OBS is a separate local lens response and does not establish irradiation on the floor.

The original B-code image is an earlier image-generation VFX stage, not runtime E. Immutable original SHA-256 `9f3fe2fb6772daa8104dcf97abe1bf87e5254a17af4c629dd0d3b5d7088ffa7e`; size1164×1351. Image B-code SHA `8cf8d6fe6c3359625512d994451016623311e417522b836228d609c70da26232`. Current B source commit `22d3fcfd617f42b1a967de767906204c0221ec64`, base blob `8f1286e12402fe7b19650ad44bcddb38ad227a08`, extension blob `f35b61661d0209c0329d4a501a760d35b451d52e`.

## Geometry-derived floor response

Registration: top-left image coordinates. Right tube cross-coordinate x574, axial extent y443..994; lower tube cross-coordinate y1016, axial extent x355..570. Height .70m follows the declared bed scale; pixel scale1164/2.88 ≈404.17px/m. Tube radius .018m is an explicitly assumed cylindrical radius from its visible width, not measured geometry. Curved outward/up normal angles11°,14.5°,18°,21.5°,25° have weights .12,.23,.30,.23,.12. The same upper source illuminates each surface; lower tube uses a rotated surface cross-section, not a second light.

For every source-direction and curved-normal pair: incident direction I and normal N give incidence `max(0,-I·N)` and reflected direction `R=I−2(I·N)N`. A downward R intersects the floor after distance `.70/(-R.vertical)`; transverse displacement is that distance times R.lateral. These15 samples are frozen as executable source geometry records in `RAYS`. There is no artist-entered floor start/end/width rectangle. Changing height, surface normal or source direction changes the computed displacement. The tube's actual axial start/end is retained at the receiver, broadened by the roughness kernel, so the right receiver stays primarily rail-parallel instead of forming r3's transverse plateau.

Receiver kernel sigma is `(0.035m + travel*.10)*pixelScale`. The constant .035m is finite angular/unresolved geometry spread; .10 is a roughness-spread approximation. Each sample weight is angular weight × incident cosine × reflectance .72 × sourceExposure4 × projected tube width `2r` / normalized transverse Gaussian area `sqrt(2π)*sigma`. This ties intensity inversely to its spreading and to the receiving support. SourceExposure4 is an artist-selected relative upper-irradiance calibration against the already-lit original, not measured lux or an independently placed emitter. All generated values and inputs are inspectable in CONTRACT/RAYS.

Floor bounds `[183,358]..[974,1252]` exclude bed/contact `[323,394]..[603,1100]`. Reflected irradiation multiplies decoded floor material color rather than replacing it with a constant luminous white fill. Thus material texture survives unless native presentation clips. Floor reflection is supporting: the small tube illuminated by a diffuse source cannot honestly justify r3's dominant independent white patch. Increased white output is not an acceptance objective.

## Main material read

The primary visible world cue is a broad satin response on the actual two vinyl cushions `[357,430]..[563,550]` and `[358,572]..[563,990]`. Their projected dome normal is `normalize(-.62*qx,-.43*qy,1)`; source/view directions are both overhead, yielding a half-vector lobe with exponent16 and peak linear increment .14. The shape follows cushion geometry and surface normal. It does not move on steady illumination. This is a source-bound reflectance approximation, not a different light in the room.

Metal masks preserve right/lower tubes, both exposed legs, and faucet; ceramic preserves its actual rim/shoulder and drain exclusion. Right tube response has axial extent comparable to the registered tube rather than a short selected source spot. Material/view gains are separately parameterized responses to the same upper source, not measurements or a complete energy-normalized BRDF. OBS radii20×180/80×18/18×22 at right tube/lower tube/faucet and amplitudes .075/.055/.04 remain secondary. OBS OFF retains the entire world result. Source/world/effect OFF returns the unchanged sampled original, including its baked VFX. No claim is made to switch off baked source illumination.

## B and PH applicability

Applicable rules: actual WebGPU-only ECode implementation, source→surface→receiver relationships, PH world versus OBS observer separation, code-declared location registration, topic-selected local observer PostEffects, actual-size native visibility/quality. No general image-generation structural pass or universal extension variant is claimed. Source PH3/PH5/PH6 Optics are applicable/primary. Materials PH3/PH5 applicable/primary, PH6 not_applicable/latent. Thermo all applicable/latent; Fluid/WaveOptics all not_applicable/latent. Electromagnetics PH3/PH5 applicable/latent, PH6 applicable/supporting. Rheology PH3 applicable/supporting, PH5/PH6 not_applicable/latent. SurfaceScience PH3 applicable/supporting, PH5 applicable/primary, PH6 not_applicable/latent. These source statuses are preserved; latent conditions are not advertised as numerical simulation.

## Physical and acceptance limits

This is a 2D analytic projection of selected cross-sectional normals and a finite axial tube, not calibrated 3D light transport. It omits full angular hemispherical integration, geometric occluders beyond masks, a complete BRDF, calibrated floor albedo, actual fixture geometry and global radiometric conservation. Kernel width/normal distribution/relative exposure are disclosed artist assumptions. Derived geometry and normalized spreading remedy the independent-placement failure; they do not prove the approximation is physically accurate or beautiful.

No temporal motion or arbitrary flicker: PERIOD=0, shader time unused. No blanket .97/white-avoidance cap. Preferred SDR canvas format can clip; native inspection decides acceptability. Main failure risks: vinyl response looks like a flat recolor, reflected floor response remains too weak, tube-parallel soft response still lacks naturalness, double counting baked highlights, registration spill, or insufficient material read at gallery fit. Do not pass merely because fields differ or pixels brighten.

Required root native comparison: `?embed=1&verify&obs=off` world-only first; original via effect OFF; combined ON; source OFF; world OFF; OBS ON/OFF. Same `window.__medicalR3` state/evidence/setEffect/setLayer/setTime/stop API. Check actual fit and full-size: floor response derives from rail direction/extent without detached rectangle, main cushion sheen reads as material receiving fixed light, OBS supplements rather than creates E, unchanged OFF image, compile/replay errors0 and no sound. Adoption and game integration remain separate.

Requested creative author GPT-6.1-Sol; exact worker execution metadata unavailable here, primary reconciles configured identity. Latest local catalog2026-10-01. Unresolved design/quality revision justifies this narrow creative assignment.
