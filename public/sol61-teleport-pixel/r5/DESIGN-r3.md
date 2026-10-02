# Teleport pixel r3 — readable conversion front

Creative design: GPT-6.1-Sol. Bounded implementation and tests: GPT-6-Luna. This derivative retains the r2 causal receipt, exact authored-source and endpoint lease checks, actor-owned 640 E-ms clock, privacy, rendering target/ABI, authored PNG bytes, audio source, observer pipeline, and adapter. It changes the cell motion/UV decision into a coherent conversion front.

At departure, unconverted cells keep their exact geometry and continuous authored UVs. A head-to-feet front releases compact, deterministic row-lane packets; only released cells quantize, offset, and fade. Coverage reaches zero at 280 E-ms. At arrival, cell packets start as unresolved offsets and a bottom-to-top front restores each cell to its own geometry and continuous UVs; the unchanged body is fully resolved before 640 E-ms. Source alpha and the scene/source MRT remain in the existing linear/HDR pipeline.

The actual WGSL and an exported CPU probe share the declared numeric constants in `teleport-pixel.mjs`. The CPU tests are behavioral evidence for the intended vertex decisions, not shader compilation or native GPU evidence. Normal cell target is 2.5 CSS px under the existing 32×40 caps; reduced motion uses 5.5 CSS px and 0.3 displacement scale.

Status: focused CPU contracts pass; native WebGPU compilation, uninterrupted temporal H64 quality review, game integration, normal audio listening, adoption, and gallery publication remain pending. Do not infer visual acceptance from deterministic math checks.
