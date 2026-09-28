# Engine integration notes

## Rendering path in this package
1. render barrier field into `rgba16float` offscreen target using premultiplied alpha
2. composite onto preview background in a second pass using `textureLoad`

## Integration cautions
- do not distort the receiver or resize the effect independently of receiver height `H`
- keep event timing linear
- keep fracture and bust semantically distinct
- do not replace structural readability with bloom padding, particle garnish, or scene darkening
- do not connect this ZIP directly to the game; this package is preview-only

## External validation required
Final evaluation still requires external Chrome/WebGPU observation and real audio listening.
