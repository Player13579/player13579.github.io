# r0.7 design

## 1. Design contract summary
Barrier E is a shared durability-based barrier effect. The game authority decides durability existence and depletion. This package only designs the VFX + SFX expression of the four events:
- create — 650 ms
- absorb — 650 ms
- fracture — 480 ms
- bust — 480 ms

The clock is linear with no easing.

## 2. B foundation and active extensions

### PH / OBS split
**PH**
- receiver-centered digital field volume
- front contour plane
- rear contour plane
- four depth connectors
- event-specific field-state changes
- node emitters and event loci

**OBS**
- premultiplied-alpha barrier render target
- background composite pass
- source-bound local halo / lens response

### Active extensions
- VFX multi-layer rules
- LDM
- IntensityBudget
- SamplingContract

## 3. Primary form
### Macro
A tall **dual-plane segmented octagonal field** surrounding a clear interior airspace.

### Meso
- front contour: brighter cyan structural plane
- rear contour: dimmer blue structural plane
- four connectors: depth explanation between planes
- contour segments: digital, modular, structural

### Micro
- corner nodes as local emitters
- contour rail glints
- event-specific local structures:
  - create sweep
  - absorb impact brace + ring
  - fracture crack edge glow
  - bust shutdown bars

## 4. World / projection rules
The reference implementation is screen-space procedural, but the intended reading is world-space around the receiver.
- width: `1.56 H`
- height: `1.78 H`
- front plane offset at H64: `(-3.0 px, -1.5 px)`
- rear plane offset at H64: `(3.0 px, 1.8 px)`

## 5. Opacity, coverage, and radiance
- opacity/coverage is used only for the structural field body
- radiance is separate and tied to emitters or event loci
- no global darkening to avoid white blowout
- no mandatory hue gradient
- local halo exists only around strong emitters

## 6. Event logic
### create
The same digital field assembles through a traveling activation sweep. Segment groups, connectors, and nodes lock into the final held volume.

### absorb
The same field remains intact but dents inward at the impact locus. The action point on the right side becomes brighter, and a short brace plus local ring reveal energy routing.

### fracture
Durability hits zero. A diagonal structural tear cuts through both planes. The two sides shear apart, leaving stressed crack glow.

### bust
A deliberate removal effect. Segments shut down in a controlled order and the two sides separate outward while connectors vanish. It must not read like the violent diagonal break of fracture.

## 7. Design rule -> code -> display correspondence
- **clear airspace** -> contour-only geometry in `barrier-pro-model.mjs` / `barrier-pro-shader.wgsl` -> center remains visibly open at H64 representative times
- **front/rear depth** -> separate front/rear polygon planes + connector lines -> visible volume rather than flat badge
- **event causality** -> event-specific coordinate deformation and activation masks -> create/absorb/fracture/bust differ for the same field structure
- **source-bound light** -> node glow, impact glow, crack glow, shutdown bars -> local illumination and limited lens response near the cause
- **OBS isolation** -> composite pass only mixes premultiplied barrier over background -> no background-specific redesign

## 8. SFX
Each event has one short, cause-matched one-shot.
- create: rising deployment tone
- absorb: impact chirp / catch
- fracture: sharp break / crackle
- bust: controlled power-down release

## 9. Status
This ZIP does not claim final quality acceptance. External real-GPU and real-listening review remain required.
