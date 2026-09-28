# r0.7 audit

## Inputs used
- current user request
- r0.6 implementation defect report
- internal inspection of r0.6 / r0.7 code only

No Sol/Astra/old barrier designs were used as design input.

## r0.6 implementation defect
The original r0.6 package could render black because the composite pass used a texture sample type / sampler combination that did not match the offscreen format expectations. A technical adapter could repair that mismatch and restore drawing. r0.7 fixes this structurally:
- barrier pass renders to `rgba16float`
- composite pass reads with `textureLoad`
- no sampler is bound in the composite pass
- this removes the sampleType/sampler mismatch class for the preview path

## Design reason for further revision
Even after the technical fix, the earlier design direction still risked reading as a discrete object rather than a held defensive space. r0.7 addresses that at the design level by:
- making the **clear protected airspace** the center of the read,
- using **front and rear contour planes** instead of a filled body,
- using **depth connectors** to state volume,
- tying event differences to structural changes of the same field.

## Design / implementation separation
### Design causes addressed
- object-like reading instead of field-like reading
- unclear difference between front and rear structure
- weak action-point readability at H64
- fracture vs bust not different enough if both only “split”

### Implementation causes addressed
- composite texture mismatch
- insufficient explicit tests for center-airspace openness
- lack of direct correspondence from design rule -> code path -> preview artifact

## r0.7 remaining limits
- real GPU visual acceptance: not executed in this build
- continuous playback acceptance: not executed in this build
- real SFX listening acceptance: not executed in this build
- therefore final quality acceptance remains `not_run`
