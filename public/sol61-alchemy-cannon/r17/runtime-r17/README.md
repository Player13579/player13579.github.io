# Cannon R17 faithful runtime

Private native-review runtime only. R17's frozen effect/material/audio inputs are copied byte-for-byte under source-r17. The concatenated shader is obtained by ESM-importing effect.mjs and hash-checked; effect imports the required material.mjs. No creative source modifications.

Runtime inherits the settled R16/R13 cause-preserving held-phase controls and renderer ABI (32-byte tuples, View16, existing negative-tag material path). The per-draw configuration receipt records the actual preferred canvas format, premultiplied alpha, and one / one-minus-src-alpha blend. `depthSamples` means 24 material optical path cells; `parcelCount` means 7 source-born material packets. Neither is a hardware depth or physical-particle count.

The native review host uses verify=1, which hard-mutes audio, and starts idle. For root's matched initial gate, use capturePulsePhase({phaseMs:220,causeId:'cannon-r17-root-review'}), capture OBS off and on at the same cause/frame/settings, and wait for submitted/completed queue proof. No native or visual quality acceptance is claimed by source checks.

Focused runtime checks pass 6/6; copied authored source checks pass 104 sampler parity and 140 bounds checks. Native compile/visual review, ordinary SFX, performance, device support, game integration and adoption remain pending.
