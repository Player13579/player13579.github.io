# Version-bound SFX preservation

The exact frozen R3 creative.mjs contains the authored AUDIO_CUES, DonationSound and createGallerySfxHook. The gallery points to this R3 package so its user-gesture bridge invokes the hook supplied by this version. The shared parent asset-gallery-sfx-bridge.js remains unchanged (SHA-256 0226c09c1edb5750f508cce46bd87376c1a85d37ff7d5961d1a144e26849622f); R1's separate gallery-audio-bridge.mjs and all R1/R2 package paths are untouched. Verify playback is muted; ordinary user-gesture listening was not run.
