# Ordinary Item Throw E — Sol R1 private runtime package

This package is a faithful runtime/preview wrapper around the root-authored `world.wgsl`; the creative shader is byte-identical to `outputs/request-20261010/ordinary-item-throw-sol61-r1/world.wgsl`. The wrapper does not change its design. The candidate is `ordinary-item-throw-sol61-r1`, provisional first dedicated creative edition R1/5; it is not yet natively replayed, quality accepted, integrated into the main game, or registered in the public gallery.

The producer contract is the successful `action-item-throw` `flight:<itemId>` event emitted after `throwOwnedItem` succeeds. It must carry a stable event id and owner, source position, collision-resolved landing point, local start clock, and authoritative duration. The adapter projects both endpoints into the effect target and passes that duration unchanged. The preview's 600 ms duration is a fixture only. The effect scope is the ordinary throwable's travel and arrival. Character release/follow/recovery motion, item acquisition receipts, and Frag/Stun terminal effects remain separate. The older generic main-game shape cue is preserved as runtime history and was not used as design input.

`runtime.mjs` compiles the world and emission outputs into paired `rgba16float` targets with a 64-byte frame uniform. The standalone observer composites a neutral dark base and the raw source plus a small emission-only bloom in linear radiance, applies one Reinhard/display-gamma step, and outputs opaque pixels. A small 8-tap emission-only observer pass is independently switchable. `sfx.mjs` produces band-passed air noise whose level and center frequency follow physical throw speed; it deduplicates stable cause IDs and hard-gates verification mode. There is no landing/impact sound.

Open `index.html` on localhost/HTTPS in a WebGPU browser. `?embed=1` removes preview controls. The root-owned native runner should use a URL containing `verify` and follow `native-runner-contract.json`; this worker did not launch a browser or claim GPU/visual acceptance. CPU tests run with:

```sh
node --test tests/runtime.test.mjs
```

A neutral dark opaque surface belongs to this standalone preview only. The main-game integration consumes the paired scene/emission targets in the existing game background. Source OFF clears the effect and stops the active air voice; Observer OFF preserves the source and disables only bloom.


