# Luck Pro r0.1 / r0.2 replay adapters

Both ChatGPT Pro Luck modules are preserved byte-for-byte. The fixed-sample actor-fixture diagnostic remains at `luck-gpu-harness.html?candidate=legacy` or `?candidate=revision`. Clean gallery previews are `luck-pro-r01.html?embed=1` and `luck-pro-r02.html?embed=1`; each continuously loops the exact Pro module on a 980x620 WebGPU canvas without visible controls or diagnostics during successful playback. Add `&verify=<token>` for silent Codex browser verification. WebGPU and HTTP localhost/HTTPS are required.

Both routes were observed rendering in external Chrome on 2026-09-27 with `embed=1&verify=...`; no page errors were logged. The original still shows only a thin gold/green Y-shaped mark and has failed visual-quality acceptance. The revision rendered a broader cyan/gold effect. This verifies technical WebGPU playback only; it does not grant quality acceptance. Neither version is integrated into gameplay. This directory does not modify the E gallery catalog; the parent may point version entries at these preview routes while preserving their quality statuses.

The diagnostic harness models a `donation-rational` Luck event on a neutral actor at fixed sample ages and uses CPU readback only to quantify pixel changes. The gallery routes instead loop the exact event lifecycle against a dark empty field, with no actor geometry, audio, or readback diagnostics. They verify technical replay only, not gameplay-size occlusion or visual acceptance.

Run focused validation from the repository root:

```powershell
node --test public/luck-pro-replay/adapter.test.mjs
```
