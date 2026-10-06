# Reload R3 startup-repair derivative

This is a private technical derivative of the frozen Reload R3 package, prepared against current public parent `68bb8cbcf6829eacee6a39b63e3dd8b1b441d49a` (tree `726402e577702534dd08712a5a32883cec048309`). It preserves Reload R3 identity, GPT-6.1-Sol creative authorship, WGSL, planner, SFX, ABI, four-pass order, first-frame emission proof, and source/main/OBS/visibility gates.

The bounded repair reports startup phases at their real API boundaries, retires late constructor results by their owner, releases only owned GPU/context resources, guards the initial resize commit after validation and queue waits, registers cleanup before shader fetch, and prevents stale frames from publishing readiness or scheduling RAF. The caller's existing 15/45/10/90-second deadlines are unchanged.

Run the package CPU checks from this directory with `npm test`. The added deterministic checks hold actual adapter, pipeline, compilation, validation, initial-resize, and render-queue promises. They do not establish native device timing or physical cancellation of pending browser GPU calls.

Status: private candidate; native first-frame replay, visual/audio quality, Safari, game integration, and publication remain pending. The derivative manifest and seal record the exact current-parent pins and preserved source hashes.
