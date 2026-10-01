# RPG E r1 runtime preview

Serve this directory tree over HTTP and open `runtime-preview/index.html`. The host uses no library or network dependency. The standalone route retains the one-shot controls. Add `?embed=1` for the gallery fixture loop: the page hides the standalone header/controls, keeps the visible `#error` alert bridge, and runs 1200 ms of local E-clock time followed by a 300 ms quiet gap. Each cycle receives new cause/source/attempt/sound IDs; cycle telemetry is exposed through `window.__rpgGalleryPreview.snapshot()` and the parent audio bridge through `window.__gallerySfx.activateFromGesture(item)`.

Embed playback begins automatically but silently. The parent must invoke the bridge from a user gesture. It synchronously starts/resumes AudioContext and arms finite authored launch/impact PCM for the next fresh cycle, after the exact module submission receipt exists, avoiding a late mid-cycle sound start. `?verify=1` selects hard-zero mode: no AudioContext is created, no unlock path succeeds, and the preview remains silent. Optional `?reviewAgeMs=0..1199` is a held local fixture age for inspection; omit it for the ordinary local loop. No authoritative producer/server clock is converted or inferred.

The receipt, room, impacts, and 3D light positions are hypothetical preview inputs. Physical pose anchors come from the approved male-left RPG source; the scene body and supplied physical-material surfaces are simple preview geometry. This is not a game port, quality acceptance, adoption, or evidence of game integration.

