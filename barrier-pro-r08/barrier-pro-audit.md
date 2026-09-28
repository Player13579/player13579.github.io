# r0.8 audit

## Inputs used
- the current user brief for r0.8
- the observed failure facts from r0.7 on real Chrome/WebGPU
- internal inspection of the r0.7 / r0.8 code only

No Sol / Astra / old barrier designs were used as creative input.

## r0.7 failure analysis carried into r0.8
### Visual failure facts
- the field read as a mostly flat blue octagonal contour
- protected airspace and front/back enclosure were weak at H64
- absorb looked like a small add-on on the right rather than a field-state response
- fracture / bust were still too close to “same contour, different deformation”

### Design response in r0.8
- replaced the octagonal outline read with a **front plane + rear plane + depth connectors + side ribbons** volume
- made the interior remain open while narrow structural skins state the presence of a field
- tied absorb to a front-side impact tile plus an internal transmission path
- kept fracture as diagonal tear + shear
- kept bust as an orderly deauthorization state with center-off and shutdown bars

## Implementation response
- retained the r0.7 safe composite path (`rgba16float` offscreen + `textureLoad` composite)
- updated numeric tests to check airspace openness and event-state distinction

## Acceptance state
Real GPU playback and real listening were not executed in this package build, so quality remains `not_run`.
