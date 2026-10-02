# Teleport smoke gust R1 package contract

This package is a new derivative of the frozen R4 white-smoke original. It preserves the original actor, grounded XY, quick physical movement, 140 ms stroke, paired-body handoff, 800 actor-E-ms finite lifetime, neutral-white smoke material and scattering, source-light and receiver paths, atlas, and PCM. Its change is smoke-lobe transport, shape, and derived render bounds only.

Wind velocity is positive and decays over the effect life, with a time-varying gust modulation and 8% height shear. Its closed-form integral starts at zero and is continuous; authored lobe centers are transported individually according to their heights. A smooth fading curl adds x/depth differentiation, and radii roll and elongate by lobe. The field, gradient and source lighting are evaluated at advected positions. The actor and its source-light origin stay fixed to the original receipt/pose.

At departure age 400 ms travel is 0.713–0.816 actor-heights; at arrival age 720 ms it is 0.903–0.931 actor-heights. The CPU derives each frame's padded union of all lobe ellipsoids. This support is passed through the endpoint plan into WGSL and controls x/depth/height rejection, projected-y bounds, and front/back depth rays. Sixteen depth samples cover the full computed volume, with extinction scaled to each ray step. No old fixed ±0.95 x or -1.95 y clip remains.

`index.html` is the diagnostic preview. `gallery-content.html` reuses the exact preview module, vendor helper, WebGPU host and effect source while presenting the existing canvas edge-to-edge; hidden, accessible controls and state elements remain in the DOM for the preview code. A `verify` query hard-zeros audio and cannot be unmuted. Normal SFX remain behind the original user-gesture API. No new raster, particle source, or audio content is introduced.

Native WGSL compilation/GPU replay, full-life creative quality, normal SFX listening, game integration, Safari/iPad and adoption have not been accepted. Listing or replay does not establish those outcomes.
