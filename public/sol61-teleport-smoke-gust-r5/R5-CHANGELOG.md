# Teleport white smoke gust R5 faithful port

R5 imports the exact frozen GPT-6.1-Sol source in `gust-design.mjs` and adapts the existing R4 CPU/render path to its seven overlapping broad volumes and height-phased rolling fold. The host evaluates the same `buildSmokeLobes` output for CPU support and the unchanged WGSL lobe storage/shader path. No alternate coefficients, equations, ray-step, body, ground, source atlas, receipt, E clock, actor movement, or audio behavior were introduced.

The profile and preview identifiers are R5. R4 remains preserved in its own sealed package. Source/support and behavioral tests pass; native WGSL/GPU replay and quality review remain pending.
