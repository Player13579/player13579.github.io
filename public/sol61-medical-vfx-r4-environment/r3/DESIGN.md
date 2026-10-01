# Medical r4 environment E r3 — directional receiver candidate

Owned outputs are this r3 directory and canonical `public/sol61-medical-vfx-r4-environment/r3`. r1/r2, their publication history, and the image remain unchanged. This is a new quality candidate, not an accepted effect. Native replay and visual acceptance belong to the primary.

## Separate stages and authority

The 1164×1351 original is exactly SHA-256 `9f3fe2fb6772daa8104dcf97abe1bf87e5254a17af4c629dd0d3b5d7088ffa7e`. Its baked VFX comes from `map-zero-reset/medical-vfx-r4/B-design-code-medical-VFX.py`, SHA-256 `8cf8d6fe6c3359625512d994451016623311e417522b836228d609c70da26232`. That image-generation stage is preserved; it does not establish runtime E. This package adds a separately inspectable WebGPU shader. No new raster, lamp, water, equipment, air beam, sound, random flicker, or decorative sweep is introduced.

Current B authority is commit `22d3fcfd617f42b1a967de767906204c0221ec64`, base blob `8f1286e12402fe7b19650ad44bcddb38ad227a08`, extension blob `f35b61661d0209c0329d4a501a760d35b451d52e`. Runtime ECode/WebGPU and visible output are applicable; image-generation structural approval is not claimed for this runtime. PH source/material/world and OBS observer are separated. PostEffects are topic-selected: a restrained local observer PSF accompanies actual reflective highlights. Arbitrary extension variants and particles are not required. Map SFX is none under the current user exception.

## Cause and intended read

r2 raised peaks and added smooth brightness near already bright baked highlights. Its static signature remained close to the original and its small source cores shrank at gallery size. r3 changes the world response's spatial structure: the right bed tube is linked to an oriented, finite patch on the dry floor to its right. The lower bed frame supplies a smaller patch oriented south. OBS OFF must still reveal both receiver orientations. This is the acceptance objective, not a result inferred from shader presence, CPU fields, or brightness.

The declared upper diffuse light remains fixed, approximately 4600 K. Selected outer/downward curved tube normals redirect part of that source toward the floor; diffuse illumination and surface roughness spread it. The footprint is a broad floor-bound lobe with soft longitudinal ends and a smooth cross-section, not an illuminated volume or hard caustic. Its source and receiver share orientation and extent. The secondary local PSF belongs to the observer and is not the source of the floor patch.

Registration uses original-image pixels, origin top-left. Right tube mask `[569,443]..[580,994]`; selected bright segment center `[574,660]`, Gaussian radii `[3.8,66]`, linear increment peak 4.5. Right receiver starts 78 px and ends 332 px east from that center, with transverse half-width growing 44→77 px and peak linear increment 1.15. It occupies x652..906 near y660. Lower frame `[355,1006]..[570,1026]`; segment `[468,1016]`, radii `[48,3.5]`, peak 3.2. Its receiver extends 100..229 px south, half-width 41→63 px, peak .66. Both are gated by floor `[183,358]..[974,1252]`, excluding bed/contact `[323,394]..[603,1100]`.

Other material registration remains subordinate: faucet `[884,111]..[903,191]`, highlight `[893,138]` peak1.6; left tube `[336,440]..[349,994]` .08; exposed legs `[350,1020]..[363,1038]` and `[560,1020]..[573,1038]` .16. Ceramic `[795,188]..[977,286]` uses a drain exclusion around `[885,235]` and shoulder response around `[944,228]` peak .28. Vinyl/cabinet/wall/floor background increments .009/.010/.005/.003 are supporting and must not count as the main E read. OBS PSFs at right/lower/faucet use radii20×77/57×19/18×22 and peaks .13/.10/.065, gated to the room.

At image width288 the primary support length is about63 px; full transverse width is about22–38 px. These are construction sizes, not measured rendered visibility. The floor patch must read as plausible reflected illumination rather than a painted stripe or flashlight beam. Root must inspect original/ON, world-only, and OBS-only differences at actual gallery size and full size.

## Geometry and physical limits

The image declares bed height about .70 m and room width about2.88 m. Using1164/2.88 ≈404 px/m, a selected curved normal approximately `(0.951,0.309)` in lateral/up coordinates reflects a vertical downward incident direction into approximately `(.588,-.809)`. Its .70 m drop gives .51 m lateral travel, about206 px, matching the primary interior near x780. This is an explicitly selected projected normal, not measured geometry. The lower frame uses a separately selected south/down orientation and shorter footprint. Different near-field spreads represent curvature/roughness approximations, not calibrated material parameters.

The shader is a registered 2D radiance-addition construction. It does not solve 3D transport, an actual BRDF, visibility/occlusion outside the masks, source luminance, or global energy conservation. Source gain is shared; that enforces toggle causality but is not a radiometric conservation proof. Source OFF returns the unchanged sampled original: baked illumination cannot be removed by this E toggle. Original/effect/world OFF likewise return that original. OBS OFF preserves all new world components. Linear additions may exceed1 before presentation; no blanket .97/headroom cap is used. SDR presentation may clip, so peak radiance alone is not quality evidence.

## Source PH status and preservation

Image-source PH3/PH5/PH6 Optics are applicable/primary. Materials PH3/PH5 are applicable/primary; PH6 not_applicable/latent. Thermo PH3/PH5/PH6 are applicable/latent. Fluid and WaveOptics are all not_applicable/latent. Electromagnetics PH3/PH5 are applicable/latent and PH6 applicable/supporting. Rheology PH3 is applicable/supporting, PH5/PH6 not_applicable/latent. SurfaceScience PH3 is applicable/supporting, PH5 applicable/primary, PH6 not_applicable/latent. These source conditions are not relabeled as simulated by this shader. Other PH image declarations remain source provenance.

The runtime's deep structure is fixed source → curved reflective metal/ceramic → registered floor/material radiance → local observer PSF. Geometry constraints, scale, stationary state, coupled gain and explicit masks are implemented. Perceptual readability, beauty/coherence and failure patterns require actual native review. Evidence consists of executable shader, unchanged original hash, CPU field checks and dependency closure; no formal image-schema STRUCTURAL_PASS, GPU pass or quality acceptance is claimed.

## Validation and acceptance boundary

CPU probes test directional support, excluded contact area, source/world/effect zeroing and OBS separation. They cover the two main receiver lobes and two bed source cores, not every shader component or GPU pixel. Syntax and dependency hashes are separate checks. No temporal effect is claimed; PERIOD=0 and shader time is unused. Static source/room state supplies the cause.

Native required: WebGPU compile/replay without errors; original OFF image identity at matching viewport; source/world toggles; world-only receiver direction recognizable at gallery fit; combined OBS neither hiding that read nor making a pasted beam; full-size mask registration; no unwanted clipping silhouette/no double counting of baked reflection; no audio. Quality is pending even if all technical checks pass. Root may reject this construction's appearance or physical plausibility; r1/r2 remain history.

Model attribution: requested creative route GPT-6.1-Sol; exact execution metadata is not exposed to this worker and requires primary reconciliation with the configured agent identity. Local catalog snapshot is `.codex/model-routing-state.json` (2026-10-01). This assignment is a narrow unresolved creative/root-cause judgment, not routine settled implementation.
