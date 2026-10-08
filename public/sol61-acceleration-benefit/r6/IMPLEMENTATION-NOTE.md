# Acceleration Benefit R6 implementation

This package is a one-correction derivative of the byte-verified public R5 closure. The settled Sol design keeps the carrier volumes, body illumination, 17.5° optical axis, color, duration, and SFX contract. This implementation changes the sparkle model only:

- 24 short sources follow the six carrier packets, with four tangent anchors per packet at -0.45, -0.10, 0.25, and 0.60 packet half-length and alternating ±0.25 half-width offsets. Their staggered births derive from each carrier's start and travel time; their deterministic lives range from 0.12 to 0.16 seconds. Flux is gated by the matching packet's active support.
- Eight receiver-rim sources start at 0.60 seconds plus 0.035 seconds per source, live for 0.12–0.15 seconds, and sample the registered actor rim from y=-0.18 to y=0.28.
- In actor-height units, the cross-PSF width decreases from 0.0036 to 0.0018, decay from 0.049 to 0.018, and source radius from 0.0045 to 0.0024. The pixel-footprint integration term and exponential ray falloff remain.

The implementation model is GPT-6-Luna, the bounded role in the 2026-10-08 local model-routing snapshot. Creative design authority remains GPT-6.1-Sol. The package is unadopted and has no visual-quality acceptance, native WebGPU replay, normal-audio listening, game integration, or publication claim. It is ready for the separately assigned native runner; any needed repair belongs in a distinct derivative.
