# r0.8 design

## 1. Contract scope
Barrier E is a durability barrier effect. Authority-side durability judgment and actor-time are preserved. This package covers only VFX + SFX for:
- create — 650 ms
- absorb — 650 ms
- fracture — 480 ms
- bust — 480 ms

All timing is linear.

## 2. B base / extensions
### PH
- receiver-centered digital field volume
- front plane
- rear plane
- depth connectors
- side ribbons
- event-state modifications

### OBS
- premultiplied-alpha barrier pass
- composite pass over dark/light preview backgrounds
- source-bound local halo only

### Active extensions
- PH/OBS separation
- VFX multi-layer rules
- LDM
- IntensityBudget
- SamplingContract

## 3. Primary form
### Macro
A **digital field capsule** built from a front rounded-rect plane and a rear rounded-rect plane, offset in screen space to show depth.

### Meso
- front plane: brighter cyan contour and skin band
- rear plane: dimmer blue contour and skin band
- depth connectors: structural rails between corresponding anchors
- side ribbons: faint linking surfaces that reveal enclosure without filling the center

### Micro
- node emitters at corner and side anchors
- create sweep
- absorb impact tile + transmission line
- fracture crack glow
- bust shutdown bars

## 4. World / projection intent
Procedurally screen-space, but intended to read as a world-space enclosure around the receiver.
- width: `1.78 H`
- height: `2.00 H`
- front plane center: `(-0.12, -0.05)` in normalized local coordinates
- rear plane center: `(0.16, 0.10)` in normalized local coordinates

## 5. Coverage / radiance separation
- structural coverage is carried by contour and skin bands
- radiance is emitted by nodes, rails, and event loci
- no global dimming to avoid white blowout
- no mandatory color gradient
- halo is only allowed near strong sources

## 6. Event logic
### create
Rear plane appears first, then connectors, then front plane. A deployment sweep traverses the volume.

### absorb
The field remains the same object but changes information state locally: the right-front impact tile brightens, the front plane dents inward, and a transmission path lights toward the interior/rear, showing the attack being caught by the field.

### fracture
Durability reaches zero. A diagonal structural tear cuts both planes and shears the halves apart.

### bust
A deliberate removal event. The central authorization zone turns off first, side structure peels outward slightly, and orderly shutdown bars pass through before the field disappears.

## 7. Rule -> code -> display mapping
- clear airspace -> narrow skin bands + open center in `barrier-pro-model.mjs` / `barrier-pro-shader.wgsl` -> receiver remains visible inside the volume
- front/back depth -> dual plane centers and connectors -> volume read instead of flat emblem
- absorb causality -> impact tile / transmission / local dent -> readable interception state
- fracture vs bust distinction -> diagonal crack shear vs center-off deauthorization -> distinct end states
- local source response -> node and event radiance -> constrained glow / lens response

## 8. SFX
One one-shot per event:
- create: rising deployment
- absorb: intercept chirp
- fracture: sharp failure snap
- bust: orderly power-down release

## 9. Acceptance
This ZIP records `not_run` for real GPU, continuous playback acceptance, real listening, and final quality acceptance.
