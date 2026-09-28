# Frozen r04 sparkle → live r05 adapter port contract

This is a port specification, not an implemented game integration or adoption. r04 is a primary-reviewed visual candidate; user adoption and auditory review are pending. Original r05 remains adopted. Do not change the frozen versions. This contract supplies exact parameter and function parity for the integration owner.

## Source authority

Read-only adapter: `../webgpu-cooldown-benefit-e.js`, in the Pages checkout. It is being edited by another worker. Frozen creative source: `versions/r04/shader-sparkle-r04.mjs`; SFX wrapper: `versions/r04/effect.mjs`; unchanged parent: `versions/r04/original-r05/`. Inspection hashes and function line anchors are appended below. Prefer function name plus SHA over line number if the other worker changes the adapter.

## Layer and blend contract

Preserve `recordRear → sprite cache.record → recordActor → recordFront`, including existing three-pass WGSL and blend. Proposed new `recordSparkles` executes immediately AFTER `recordFront`, for the same owner/effect. This is the final front-layer optical response, not a new world object or replacement sprite.

The frozen shader does `c += sparkleObservations(p,t)` after the entire original output. Existing adapter passes use source-alpha / one-minus-source-alpha; adding the radiance to the existing front return would attenuate scene colors and is not equivalent. A fourth, additive draw reproduces the operation:

```js
blend: {
  color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
  alpha: { srcFactor: 'zero', dstFactor: 'one', operation: 'add' }
}
```

Return `vec4f(radiance,0.)`, or discard exactly zero radiance. Destination alpha is unchanged. No background color or clear. No standalone portrait texture. One additional draw per visible admitted owner inside the six finite windows. Use the same shared frameOwner/device/target, bounded uniform slots and destruction. Separate additive pipeline/bind layout or explicitly shared layouts are required; do not reuse a bind group from an incompatible auto-layout pipeline. This fourth-draw architecture is a proposal for primary acceptance; an equivalent internal command must preserve the exact equation and draw order.

## Actual sprite alpha, crop and transform

Use the same `command.texture` and actual sprite rect/crop/transform/opacity as the existing planned owner. The adapter `coords(v.p.xy)` already transforms physical pixels through the inverse affine transform, sprite rect and crop. Its normalized p is `(sourceLocal.x-128)/222, (240-sourceLocal.y)/222`. Keep p orientation and origin. Crop offset enters sampling, not p origin.

Replace frozen `actorAlpha(vec2f(128+p.x*222,240-p.y*222))` with:

```wgsl
fn localAlpha(p:vec2f)->f32 {
  return body(u.crop.xy + vec2f(128.+p.x*222.,240.-p.y*222.)).a;
}
```

Existing `body()` clips to submitted crop/atlas and samples the actual live texture. Never use full-atlas alpha, another frame or the standalone Sophia image. Source existence is `localAlpha(seed)*u.state.z`. Fragment protection is `1-smoothstep(.03,.18,localAlpha(p))`, without applying actor opacity to this mask. This keeps covered clothing/face unmodified even for a faded actor. The adapter's `u.state.w` is its layer enum; frozen `u.state.w` was actor-present, so it MUST map to adapter `u.state.z` here.

Frozen `u.body.z` is CSS/display H, not framebuffer pixels. For exact 1.2→3.5 CSS-pixel center expansion under DPR/affine transform, use previously unused `transform2.zw` for CSS pixels per normalized p axis:

```js
// tr=[a,b,c,d,tx,ty], BEFORE multiplying by backing sx/sy.
const hxCss = 222 * s.w / crop[2] * Math.hypot(a,b);
const hyCss = 222 * s.h / crop[3] * Math.hypot(c,d);
values[14] = hxCss;
values[15] = hyCss;
```

Existing inverse transform uses only transform2.xy. Require finite positive scales; preserve existing determinant, size and crop checks. For the three axis-aligned outward vectors, `scale=length(outward*u.transform2.zw)` replaces frozen H. Center is `boundary+outward*mix(1.20,3.50,rise)/scale`. Do not apply DPR twice. Normalized cross radii continue to transform with the actor; under H64 uniform scale they have the frozen dimensions.

Boundary search: exactly 40 samples at `seed+outward*i*.005`, i=1…40. Retain the LAST position with localAlpha>=.15, not the first transparent gap. If seed alpha is zero, emit zero; do not invent a detached fallback star. Actual poses with transparent seeds need review. A dynamic fallback source is a new creative revision, not a faithful port.

## Time, position and radiance parity

Authoritative t is `planned.values[4] = elapsed/1480`. Do NOT use `planned.progress=elapsed/duration` when a duration is truncated; that would accelerate sparkle relative to original prism/body. Keep reducedMotion mapping (`u.state.y`). Do not normalize again or use another clock.

Copy `compressionSource` and `crossObservation` math from frozen source, changing only aliases described above. Compression: collapse=smoothstep(.16,.48,t), times .65 under reducedMotion; h=(.34+.08c,mix(.58,.027,c),.235*(1-.26c)); yaw=-.56+.16c. Source corners are (-hx,hy,hz), (hx,-hy,hz), (0,hy,hz), rotated by -yaw, projected to (world.x,world.y+.48-.28world.z). They are actual prism corners.

| Source | begin / peak / end | Radius in p | Tint | Outward |
|---|---|---|---|---|
| prism 0 | .325 / .400 / .510 | .083 | (1,.83,.40) | prism |
| prism 1 | .380 / .470 / .570 | .090 | (1,.87,.49) | prism |
| prism 2 | .445 / .535 / .580 | .085 | (1,.94,.64) | prism |
| receiver (-.045,.07) | .655 / .715 / .805 | .170 | (.60,1,.81) | (0,-1) |
| receiver (.16,.44) | .715 / .780 / .880 | .190 | (.60,1,.81) | (1,0) |
| receiver (-.14,.64) | .780 / .845 / .950 | .183 | (.60,1,.81) | (-1,0) |

All prism radiance is multiplied by `1-smoothstep(.48,.58,t)`. Compression pulse is rise*(1-smoothstep(peak,end,t)), rise=smoothstep(begin,peak,t). For d=abs(p-source), horizontal=pow(max(0,1-dx/r-dy/(r*.20)),1.4); vertical=pow(max(0,1-dy/(r*1.14)-dx/(r*.18)),1.4). Core=exp2(-dot(d,d)/.014²*2.4); near=exp2(-dot(d,d)/(r²*.48)*3). Radiance=(tint*max(horizontal,vertical)*2.05+vec3f(1.25)*core+tint*near*.20)*pulse.

Receiver pulse is rise*(1-smoothstep(peak+.016,end,t)); skip before alpha search if pulse<=0 or distance(p,seed)>radius+.36. Center expands as above. Horizontal uses width .24, exponent1.1; vertical length1.18, width.22, exponent1.1. Core uses .023²*2.4; near uses radius²*.35*3. Radiance=(tint*max(arms)*3.4+vec3f(2)*core+tint*near*.22)*pulse*seedAlpha*actorOpacity*fragmentProtection. These are exact frozen values, not fit-to-reference approximations.

Zero before t=.325 and at/after .950. Do not change prism/body geometry, emission or response timing. No background-conditioned gain/color, exposure suppression, new trails/rings/icons, or extra particle simulation.

## SFX and lifecycle

Frozen `effect.mjs` re-exports original `CooldownEvents` unchanged. Game admission stays with its existing app/adapter: do not add a second receipt consumer or trigger once per star. Preserve recipient ownership, changed-result admission, dedupe, expiry/future rejection, late audio suppression and live actor resolution. Standalone tests do not prove live event integration.

Copy frozen `synthesizeSfx` and its single-trigger wrapper. It copies original r05 PCM (1.22s) into a 1.44s buffer, then adds two responses: at1.034s/1512Hz/gain.060 and at1.184s/2016Hz/gain.050. Each uses attack=1-exp(-200t), release=exp(-24t), end=min(1,(.24-t)/.020,(1.44-time)/.025), waveform=sin(2πft)+.22sin(2πf*2.007t); reject t<0 or t>.24. One buffer source, gain.7, one start, disconnect onended. Original PCM is exact until1.034s and preserved as a component afterwards; the resulting sum is NOT byte-identical to original SFX. Keep verify audio locked zero. No separate per-star sounds.

## Port acceptance and unresolved limits

- Preserve adopted source hashes. Toggle OFF must leave the existing adapter's output identical, including all body pixels. Existing three passes are not to be retuned as part of this port.
- H64 actual live sprite/crop full-life phases: 0,.04,.12,.24,.34,.40,.47,.535,.60,.655,.715,.780,.845,.90,.97,1,1.08; dark/light, reduced motion and relevant facing/frame variants. No standalone sprite substitute.
- At receiver phases covered alpha>=.25 body/face pixels must have zero newly changed pixels. Visible rays remain bound to actual sources; at t>=.950 extra radiance is zero.
- DPR1/2, translation/rotation/mirror/nonuniform scale, atlas crop offsets/bounds, singular transform, hidden alpha, missing owner/texture, future/expiry and distinct overlapping owners. Bounded uniform slots must not overwrite another encoded draw.
- Validate rear→sprite→actor→front→OBS order, successful-encoding receipts only, current frameOwner/target, shader diagnostics/GPU errors/device loss and cleanup. Measure extra GPU cost serially; standalone RAF intervals were not GPU timings.
- One admitted event = one SFX trigger, no stale replay, finite tail/added onsets; verify audio remains zero.
- Actual motion source availability, current adapter main-effect compositing, game integration, gallery iframe, audible listening and user adoption are not certified by this standalone task. The existing adapter's compositing is under another worker's test; its old color mapping was not modified or accepted here.

## Inspection hashes and line anchors

- adapter SHA256: `e9ec6e81308f486f9200df750b3d8cab47ec12fcbe59009aae28f0ca617aafd5`
- frozen shader SHA256: `369e076862285656327fc6dd7cc18f3ab3ffb38e411a09bfae86c13e10eff0c7`
- frozen effect/SFX SHA256: `3338b3a2ce8574c635121234ff82aa099cb9e8c7080b77d16914a62dfaf5c4e6`

Adapter: `struct U` line 18, `fn coords` line 46, `fn body` line 54, `@fragment fn fs` line 61, `function plan` line 86, `const values =` line 111, `const pipeline=` line 129, `function record` line 144, `api.recordRear` line 160.

Frozen shader: `fn compressionSource` line 4, `fn crossObservation` line 14, `fn receiverObservation` line 24, `fn sparkleObservations` line 50, `export const shader` line 62.

Frozen effect: `synthesizeSfx` line 8, `trigger` line 19.
