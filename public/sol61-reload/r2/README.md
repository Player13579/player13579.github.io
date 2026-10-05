# Reload E R2 parent candidate

Creative source: GPT-6.1-Sol R2/5 (frozen planner/WGSL/SFX pins in package-manifest.json). Faithful runtime/gallery host: GPT-6-Luna. This route is a private candidate based on e9cba13caf6e6d38c54f902d44e127b8c39bf99b; native parent proof is pending.

The R2 canvas uses a version-bound H64 scale and the R2 shape bounds exactly: top +0.46H; bottom −0.72H. The runtime passes H64 to the planner and maps world coordinates using that scale; it does not reuse R1-specific fit dimensions. Parent presentation zoom is separately version-bound for R2. Actual parent framing remains to be checked by root.

Runtime: WebGPU only, 128-byte uniform, entrypoints vsFullscreen/fsWorld/fsBlurX/fsBlurY/fsComposite, world+emission MRT in rgba16float, X/Y blur and composite. Each frame runs the same four passes. Standalone output clears to transparent; the fixture auto-loops declared start/pending → a separate complete cause at 2200ms → 620ms complete decay/source-off → pause → fresh cause. This is explicitly a gallery fixture and does not claim gameplay completion. Source/Main/visibility-off must be followed by a clear submission; OBS affects source-bound bloom only.

The first-frame proof carries causeId, submitId, actual encoder pass labels, numeric emission RGB scan and device/target generation from the same awaited submission. Keep `nonzeroEmission` only as the compatibility boolean. Optional `frame-diagnostic=1&gpu-probe=1` is diagnostic only and captures same-submit world/emission/blurY under the existing queueDone. Verify URLs hard-zero SFX; ordinary playback is unmuted by default and still obeys the actual gesture/bridge path.

Validation here is source/package integrity plus fake-GPU/CPU tests. No WGSL native compile, actual parent replay, visual quality, ordinary audio listening, Safari/iPad, performance, adoption or gameplay integration is claimed. Publication eligibility remains false.
