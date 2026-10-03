# R5 native readiness record

Root captured the exact private package at `gallery.html?verify=exR5-root` using the owned local host. The verifier URL forces mute.

| Phase | Source/uniform age | Frame evidence | Result |
| --- | ---: | --- | --- |
| 520 ms | 520 / 520 ms | frame 1, two passes, queue completed, zero reported GPU errors | R5 WORLD+POST compiled and the submitted image was visible |
| 1050 ms | 1050 / 1050 ms | frame 2, two passes, first saved JSON says `completed:false` and completed serial 1 | Screenshot was captured after the UI showed completed frame 2 at 1050 ms; that screenshot does not repair the queue-completion gap in the saved JSON |
| 1200 ms | 1200 / 1200 ms | frame 3, two passes, queue completed, zero reported GPU errors | Plan reports `alive:false`, confirming expiry |

Saved JSON and PNG pairs are `phase520`, `phase1050`, and `phase1200` in this directory. All three JSON records bind the exact R5 plan hash `bfca1621b85413c248c24c737fffac1b19b1e1e26b0642120e0cb490314bb299` and shader hash `e799ebaba6b7ecbc4cc7a4bbbd9326092fb93191f8181c61c83466dc32bbf361`.

The screenshots show a smooth, compact body; root judged the smooth-body quality concern unresolved. This is native pipeline/readiness evidence only. Full-lifetime quality, DPR changes during R5 capture, reduced-motion behavior on a real device, performance, ordinary audio, and game integration remain unverified. SFX reports its inherited source identity as R3, matching the exact frozen SFX module; the gallery version remains R5.

The temporary host was PID 20456 at `127.0.0.1:55076`. It served only the gallery and six imported runtime modules, returned 404 for the package manifest, and was stopped after root finished capture. See `host-lease.json`, `host-check.json`, and `host-cleanup.json`.

## Rebase and parent-native evidence scope

This R5 package is now proposed against public parent 01dc03c4963230aca2efff2864ca137bda48f31b (tree f276bc8f184975f7a7988c6099f00ad774f51660), after Cannon R5 became the current default. The included held-520 parent-native proof is from earlier candidate 62ffc8b65663cafef59a8693936b2450222d890c on base 5309567c450fc6553d50be31c0eb422d2523c7b3 (tree 702de321dfe68f1008f2003e42eadb400a57ce62); it is retained byte-for-byte under `native/prior-base-5309567/`. It supports only that prior candidate/base and does not pass parent replay for this current candidate. Root-native replay on 01dc03c4963230aca2efff2864ca137bda48f31b remains pending.

Direct R5 snapshots at 520 and 1200 ms retain their prior pinned status. The saved 1050 ms JSON remains incomplete even though a separate later UI capture completed. Smooth-body visual quality remains not accepted; adoption unknown; normal SFX, game integration, Safari/iPad, performance and current-parent replay remain unverified.

## Preceding-base parent-gallery native replay

Root captured a parent-gallery held-520 pass on immediately preceding public base 01dc03c4963230aca2efff2864ca137bda48f31b (tree f276bc8f184975f7a7988c6099f00ad774f51660) with source candidate d37ffe54d7c8015fb8bc2b27dab094138c3062b3 (tree 24ba3f85533fb1abe08b426c34756b56d62d2056). The completed frame used two passes at CSS 980x490 / render 1960x980 / DPR 2; startup was ready, first frame completed, and reported errors and warnings were empty. Exact JSON and screenshot bytes are under `native/predecessor-base-01dc/`; plan and shader hashes are `bfca1621b85413c248c24c737fffac1b19b1e1e26b0642120e0cb490314bb299` and `e799ebaba6b7ecbc4cc7a4bbbd9326092fb93191f8181c61c83466dc32bbf361`.

The current final base is 17b8cc8270fddf383d2044dad6a7246088401672 (tree 2567f0a64642648cc9cc149bd33f6309061fcf13) after Cannon R6. This proof remains scoped to the preceding base/source candidate and does not establish parent-gallery replay on 17b8cc8270fddf383d2044dad6a7246088401672. Renderer, plan, shader, SFX, gallery runtime and parent bridge remain unchanged from the tested source candidate; no fresh native replay on the later base is claimed. Smooth-body visual quality remains not accepted; adoption unknown; current-base replay, normal SFX listening, game integration, Safari/iPad, reduced-motion and performance acceptance remain unverified.
