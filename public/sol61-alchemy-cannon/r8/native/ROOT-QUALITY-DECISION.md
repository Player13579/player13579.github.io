# R8 native review status

The frozen R8 source has a limited native technical pass: one cause/event/frame was submitted and completed at 220 ms with OBS ON (160) and OFF (162), and the same event expired at 420 ms (163) with zero active samples and one expired event. All queue errors are null and all three records bind the exact R8 effect, shader, and audio pins.

Quality is **not accepted**. Root's review found that the OBS OFF image still reads as a thin blue/green band with an isolated white flattened lenticular head; the cross-section is not materially readable, and OBS ON does not resolve it. White intensity itself is not the cause. The images are preserved byte-for-byte under their original PNG-suffixed filenames, but byte inspection detects JPEG (FF D8 FF E0) data; metadata reports the actual media type rather than treating the suffix as proof.

These captures do not establish continuous motion, the full 900 ms activation, normal audio, performance, Safari/iPad behavior, main-game integration, adoption, or publication.
