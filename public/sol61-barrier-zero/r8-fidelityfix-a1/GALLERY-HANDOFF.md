# Gallery registration — Barrier `barrier-sol61-r8-fidelityfix-a1`

- Group/default: Barrier (`barrier-pro`), newest version in the Unadopted Effect list. No adopted default.
- Entry: `public/sol61-barrier-zero/r8-fidelityfix-a1/entry.html?embed=1`; 980×620 CSS-pixel native canvas, 49:31, no crop. It waits for the initial native submit, then runs the authored 4,600 ms create/stable/hit/stable/break/off timeline on requestAnimationFrame and calls the runtime’s native submit API at a 30 fps target. It rechecks phase and cycle after each awaited native submit before allowing a finite cue, resets event IDs at each wrap, and never invokes the evidence-capture fixture.
- Authors: GPT-6.1-Sol — creative design and B-contract clarification; GPT-6-Luna — faithful WebGPU runtime/adapter and package assembly.
- Technical replay: canonical replay evidence has 58 lifecycle frames, 12 diagnostics, 0 GPU errors, lifecycle submits confirmed. The actual nested gallery replay independently recorded a complete ordered phase cycle, a cycle wrap, 131 WebGPU submits with 0 GPU errors, and a 980×620 rendered canvas. Verification mode confirmed no AudioContext was created. Ten CPU tests cover phase/cycle crossings and slow-submit expiry suppression.
- SFX: create/hit/break use the authored finite WAVs through the runtime’s cause-linked event API. The gallery gesture bridge unlocks sound; verification mode stays silent and creates no AudioContext.
- Quality: **user-observed FAIL for digital semantics**. Pixel diagnostics and shader submissions do not override this result.
- Adoption: unadopted. Game integration and listening: not run.

See `CANONICAL-REPLAY-PROOF.md`, `evidence/`, and sibling `barrier-r8-gallery-registration-proof` for the gallery registry/source proof, autoplay capture, CPU gate test, and read-only staged Git byte-check script.
