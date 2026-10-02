# R3 shear equation correction

The only artistic/runtime equation change from R2 is the normalized WGSL shear coefficient: `normalized.x -= tiltXZ * (radiusZ / radiusX) * normalized.z`. This is algebraically equivalent to the settled physical transform `physicalX -= tiltXZ * physicalZ` before normalization. R2's transform and full 16-ray, seven-lobe creative design remain preserved in its own sealed package.

The new geometric test evaluates the shader-equivalent ellipsoid surface using the physical contract, evaluates the normalized WGSL transform at those positions, and checks that the actual CPU support bounds contain each query and both finite-difference taps over both roles and the active timeline. All focused tests are source/CPU evidence. Native WebGPU, visual quality, normal audio listening, and game integration remain pending.
