# Teleport R6 — compact two-axis conversion cells

GPT-6.1-Sol creative design; faithfully implemented by GPT-6-Luna from the separately approved R6 contract. Fresh private candidate derived from immutable R5. Only approved cell size/gap, deterministic offset lanes, and per-cell crossing envelope change. Atlas, PCM, 640 E-ms clock, admission/privacy/owner/device lifecycle, source/nearby/OBS gains and gates remain inherited.

Normal target cell width is 3.25 CSS px (reduced motion 5.5). At actual H64 geometry this yields nominal 2.0 CSS px faces and maximum gap .38 of a cell. Grid derives from actual CSS body size and zoom, never backing pixels. Released/unresolved geometry scales by 1-.38*packetAmount; untouched and reconstructed geometry/UV remain exact.

Independent deterministic index lanes drive bounded departure x/y offsets: side*(.065±.025), -(.105±.015); arrival: side*(.045±.020), -(.075±.012). Both scale by existing packet amount and reduced-motion factor.

Crossing emission is 4*s*(1-s), s=sourceRelease or resolved for the phase, multiplied by the existing window and peak 2.15. The .72 packet term and finite source fade remain unchanged. PH2.8/.23 and OBS1.3/.18 remain unchanged.

CPU/WGSL and inherited test results do not establish native WebGPU replay, visual quality, normal SFX, adoption or game integration.
