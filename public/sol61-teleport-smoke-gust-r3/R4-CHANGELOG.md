# Teleport smoke height-zero preview R4

R4 is derived byte-for-byte from sealed R3 except for the package version labels and diagnostic normalization. The failure serializer now flattens the actual nested creative-kernel shape (`{label, messages:[...]}`) and the receiver's flat diagnostic shape into the same explicit scalar rows, retaining each `pipelineLabel`. Native `GPUValidationError.message`, stack details, visible failure and stop behavior remain preserved.

No artistic parameters, WGSL, timing, waits, audio, or lifespan behavior changed. The focused test invokes the actual creative `createWebGPUKernels` rejection, the receiver `pipeline` rejection, and the same recording function used by the preview failure path. These are mocked-device tests; actual native WGSL/WebGPU replay remains pending primary review. Quality, normal SFX listening, Safari, game integration, and adoption also remain pending.
