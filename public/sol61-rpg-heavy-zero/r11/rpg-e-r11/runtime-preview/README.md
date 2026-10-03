# Rocket R11 private faithful preview

This host adapts the exact R10 faithful preview ABI to the sealed R11 entry, physical pass and the historical R9 observer module. The R11 source, PH and OBS entry-byte pins are checked before WebGPU initialization. R11 remains unadopted, quality pending and preview-only.

Normal source/pose defaults retain the authored 1× timing: pose age follows E age through 260 ms; an explicit pose-age override is available for inspection. Source visibility, PH receiver source light, PH receiver pass, OBS source feed, OBS response and OBS intensity are independent. The observer visibility mask follows this host's foreground overlay order and does not model world/body occlusion. The displayed robot and surfaces are gray fixture geometry; actual motion sprite/body integration is not established.

Embedded mode uses distinct hypothetical source/cause identities per 1500 ms cycle, a 1200 ms event and a 300 ms pause. Verification is hard-zero audio; ordinary audio remains gesture-gated and uses the authored event PCM. The authored source reports 80 carrier evaluations per volume pixel; native 1/4/8-effect GPU cost was not measured.

Native source compilation and quality review are pending the root-owned WebGPU session. No game integration, adoption, normal-audio listening or Safari/iPad acceptance is claimed.
