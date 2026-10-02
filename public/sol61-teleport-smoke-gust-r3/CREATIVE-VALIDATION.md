# R3 validation

R3 adds a shader-equivalent geometric test that samples the actual normalized WGSL shear over both roles and the active timeline, then checks the actual CPU support bounds including both finite-difference query offsets. Existing R2 focused tests are rerun against the R3 derivative. This remains CPU/source-level evidence; native WGSL/GPU rendering and Sol quality review are pending.
