# Native compiler observation — incomplete, no shader verdict

Final source unchanged: module3d504ac616af4feeb2d555337d7ecabd927505dff2a05240a87e9d3816873354, SOURCE63058e74448f9f1884ec927c6e56a8f52e1d729ba3d4d3f4fa539d7a51ac5795, COMPOSITE07d99dbde28e2635ebda3e0aae262ba546f5d7f7579c4908dd4fd9e3d0ae1a01.

Root data-URL calls timed out without returned renderer compilation information. Same-origin exact immutable HTTP module subsequently imported, adapter/device created, and persisted last stage remained device-created after bounded observation. Root saved the HTTP-INCOMPLETE receipt and closed tab429. This disproves the earlier assumption that changing data import alone establishes a working compile route. No shader error or pass was observed. Do not call this WebGPU unsupported, source rejection, shader validity, driver failure or successful compile.

The exact exported renderer creates SOURCE and COMPOSITE modules, then awaits each compilation-info result before pipeline construction. The persisted device-created stage is outside those steps. It cannot distinguish synchronous module creation, first compilation-info pending, second info pending, or a later pipeline call that lacked its own marker. Absence of console errors is not an accepted shader result. The closed context no longer permits retroactive stage diagnosis.

## Read-only actual source comparison

R3 SOURCE3711bytes/55lines; R4 SOURCE4337bytes/63lines. Both have zero loops, three textual sqrt calls and eight exp calls. R4 adds a nested min/max scalar width expression, section offset/half/q and one scalar select for true radial support. It retains all entrypoints, uniform fields/64B binding, helper functions, output and target contracts. COMPOSITE is exact byte equality with the previously compiled R3 export.

No added recursion, variable-length array, texture sampling, derivatives, uniformity-sensitive barrier, depth iterations, bind-layout change or shader-sized loop bound was found. There is no concrete static indication of a large compiler workload. Textual operation counts are not compiler-cost or GPU-performance measurements. The extra min/max and q-dependent guard could expose a compiler-specific issue, but the current receipts do not demonstrate that. No source simplification or corrective derivative is authorized merely by the timeout.

## Minimum differential diagnostic proposed to primary

Use one fresh owned actual device in a blank verified context. Persist import completion/hash, adapter/device, device.lost and uncaptured errors; mark before and after each createShaderModule and before/after compilation-info promise resolution. First request the exact unchanged exported COMPOSITE compilation info as control. If it also remains pending, stop: current evidence cannot attribute failure to R4 SOURCE expressions. If control returns, request exact final SOURCE info with its own stages. Only a SOURCE-specific pending/error result supports investigating the changed section expression; a parse error must retain the exact source location/message. Do not await one opaque full-renderer promise again or perform another unbounded retry.

This shader-level diagnostic is not final exported-renderer pipeline acceptance. If both infos return, the actual exported createRailgunRenderer construction still must complete with exact module/export hashes, pipeline/bind-group stages and error scopes before freezing. No actual draw, visual quality, performance, normal motion or audio is covered.

## Resource and integration state

Exact-byte host PID38964/port55009 was identified from executable command line and listener ownership, then stopped. COMPILE-HOST-CLEANUP.json confirms no process or listener remains; exec session28456 ended. Parent closed owned browser contexts. No source mutation or producer rerun followed these native observations.

R4 CPU checks remain passed on final3d504 bytes, but SOURCE-FREEZE/SEAL have not been written and draft LUNA-HANDOFF is not released. Native receipt acceptance is mandatory in seal.mjs; incomplete receipts cannot satisfy it. R3 remains intact. Consequential GPU/native interpretation stays with primary; no third blind retry or unrelated architecture change.
