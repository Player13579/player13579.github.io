# Rocket R8 faithful private adapter

Creative source is the exact frozen GPT-6.1-Sol R8 module. Runtime host and WebGPU ABI derive from the R7 preview host; host identity and the pin guard are updated to R8. R8 design and runtime sources are preserved in the parent stage provenance folder.

The host's normal route records physical receiver illumination from the exact `lightingLease`, followed by the R8 VFX geometry, then tone maps to the WebGPU canvas. Source-light OFF is exposed only through the module's explicit `receipt.lightPositions` input. Receiver-pass OFF is exposed only through the documented optional `lightingLease` record argument. Both controls default ON, and neither alters creative module bytes.

The module has no independent observer-response control or distinct OBS implementation. Its receiver-light pass does not satisfy mandatory PostEffects. This version is therefore `mandatoryPostEffects: unmet`; native observation and quality remain primary-owned, and this adapter cannot produce a valid observer OFF comparison. No code path or test claims otherwise.

The preview remains hypothetical-only, unadopted, and disconnected from gameplay. `?verify=1` hard-mutes all audio. Native WGSL/GPU output, source/receiver diagnostics on a real GPU, normal sound listening, Safari/iPad, and full game integration are not established here.
