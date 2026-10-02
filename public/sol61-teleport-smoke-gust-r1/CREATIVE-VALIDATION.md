# Gust R1 validation

The derivative changes only smoke transport, lobe shape, and calculated bounds. The inherited quick actor movement and ground position, neutral-white scatter, source effects, atlas, and PCM are byte/source-path preserved.

Focused checks cover positive time-varying gust velocity, continuous integrated displacement, upper-lobe shear, differentiating curl/rolling radii, finite lobe geometry, every per-frame CPU support bound, expanded WGSL pixel/ray support, extinction step scaling, actor/source timing equivalence, and finite expiry at 800 actor-E-ms. At 400 ms departure travel is 0.713–0.816 H; at 720 ms arrival travel is 0.903–0.931 H.

The equations and host closure are locally tested. Native WGSL compilation/GPU replay and creative-quality review are pending primary acceptance. SFX listening, game integration, Safari/iPad, and adoption remain pending.
