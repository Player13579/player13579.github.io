# Teleport white-smoke gust R2 implementation contract

This is a fresh faithful implementation derivative of the settled Sol-led R2 creative direction. The implementation remains by GPT-6-Luna; creative quality review remains with GPT-6.1-Sol. The frozen R1 package is an immutable comparison source, not modified.

## Preserved behavior

- White neutral scattering, fixed ground/world XY, authored sprite/alpha path, source-light path, and finite causal PCM are inherited from R1/R4.
- Body strokes stay 140 actor-E-ms at 1x; arrival begins at 180 E-ms, departure smoke ends at 500 E-ms, and the full smoke lifetime remains 800 actor-E-ms. Playback rate is applied once by the existing preview clock. Presentation lifetime does not add gameplay delay.
- Keep seven broad lobes, the existing positive integrated mean wind, actor phases, source/body logic, and SFX bytes. Do not add raster texture or micro-particles.

## R2 smoke implementation

- Keep R1's positive decaying mean advection (3.0 H/s base, 2.5 s^-1 decay, 0.35 gust fraction, 0.24 s period, 8% height shear). The actor and authored source remain fixed to their causal receipt/pose.
- During each lobe's own elapsed time, add a coherent projected x differential of `0.44 * (seedHeightH - 0.54) * envelope`. The envelope is `smooth(t / 0.02) * (1 - smooth((t - 0.42) / 0.16))`, with time in seconds and the existing clamped smoothstep. This strengthens high-to-low separation through the dense 70–350 elapsed-E-ms window.
- Add one broad x–height roll. Normalize each seed's x around -0.01 H by 0.22 H; phase advances at 8 rad/s. The projected x and physical height offsets are `0.20 * envelope * u * cos(phase)` H and `0.10 * envelope * u * sin(phase)` H. Both use the same smooth finite envelope. This is a coherent x-height fold, not a uniform cloud shift or depth-only curl.
- Apply a determinant-one normalized x–z shear per lobe: `localX -= tiltXZ * localZ`, where `tiltXZ = 0.40 * envelope * sin(phase)`. Store it in the existing fourth `radiusPad` float. CPU support expands x by `abs(tiltXZ) * radiusZ`; bounds also include the x/height offsets of the actual finite-difference gradient taps. Height and depth bounds remain derived from the same transported lobes. The field and its finite-difference gradients use the same WGSL transform.
- Preserve R1 ray sampling at 16 steps. Extinction remains scaled by the actual support-derived ray step. Compensate each lobe's density by its actual radius product relative to its seed radius product, preserving the R4 per-lobe `density * volume` proxy across expansion and roll; this is a proxy, not exact clipped physical mass.
- Against R1 at paired high seed indexes [4,5] and low seed indexes [0,1], test 58 samples across departure/arrival elapsed ages 70–350 ms. Their horizontal projected center-separation gain must stay within 0.20–0.35 H.

## Acceptance boundary

Focused numeric, storage-layout, support, actor/source/SFX preservation, and syntax tests do not establish native shader compilation or visual quality. Native WebGPU replay, continuous H64 quality, normal SFX listening, game integration, and Safari/iPad remain pending. Do not list as technically replayable or claim acceptance before primary native verification.
