# Gust R2 focused validation

R2 addresses R1's compact centered-cloud evidence with additional actual projected high/low center separation and a single broad rolling fold in x and physical height. The implementation keeps R1's positive integrated gust mean and the settled 140 ms body stroke, 800 actor-E-ms life, white material, fixed ground points, source path, and SFX.

The reproducible focused suite checks 58 departure/arrival samples over the dense 70–350 elapsed-E-ms interval against R1. The measured additional high-to-low projected horizontal separation is 0.28125–0.33382 actor-heights. A sampled smooth envelope reaches x-fold amplitude 0.18845 H and physical-height amplitude 0.10000 H. The original 16-ray integration budget is preserved. A per-lobe density × radius-product proxy remains constant across the tested expansion/rolling interval; this proxy does not claim exact clipped physical mass. The actual GPU storage row carries the tilt scalar in `radiusPad.w`, and its CPU support includes transformed x extents and both field-gradient tap offsets.

These are CPU, mock-device, and source-level checks. Actual native WGSL compilation/replay and H64 visual quality remain pending primary review. Normal SFX listening, game integration, Safari/iPad, and adoption remain unaccepted.
