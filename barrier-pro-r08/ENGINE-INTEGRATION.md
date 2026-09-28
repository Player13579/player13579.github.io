# Engine integration notes

## Preview render path
1. render barrier to `rgba16float` offscreen target with premultiplied alpha
2. composite over preview background with a second pass using `textureLoad`

## Integration cautions
- preserve linear actor-time
- do not attach scene-wide dimming as a white-blowout workaround
- do not replace structural readability with particle padding or bloom padding
- do not connect this ZIP directly to the game; this is preview-only code

## Validation status
External real-GPU playback and real listening are still required; this package marks them `not_run`.
