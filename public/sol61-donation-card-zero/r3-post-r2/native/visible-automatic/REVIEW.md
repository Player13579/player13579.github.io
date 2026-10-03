# Visible automatic replay verification

Root verified the unchanged frozen donation-card-r3-post-runtime-r2 via CUA-owned IAB tab 211 at `http://127.0.0.1:4272/sol61-donation-card-zero/r3-post-r2/package/index.html?verify=1&embed=1`, explicitly visible. No hold/receive/manual play or runtime mutation was used.

Both snapshots report document.hidden=false. Snapshot A reports ready, running, receipt-close, generation4 and587 actual renderer submits; snapshot B reports transfer-gold, loop15 and2184 submits. Retained frames contain present-card, transfer-gold, receipt-close, clear/idle and subsequent new receipt cycles. World and observer compiler diagnostics pass; browser error/warning log is empty. Actual screenshots auto-a.png and auto-b.png show the card, payment terminal, gold transfer and arrival light at different phases.

The earlier single white hidden-tab capture is insufficient evidence of an embed failure. Source returns before scheduling when initially hidden, and ordinary playback also contains a700ms idle interval. Visible automatic replay is now confirmed; no speculative runtime successor was created. This is Chromium technical replay evidence, not Safari, ordinary audible SFX, gallery publication, game integration or final creative acceptance. Source/observer phase comparison gates remain separately tracked.

Cleanup: tab211 closed and inventory contains only user-owned tab2; owned server session11231 stopped with Ctrl-C, exit1. Historical failed/ambiguous evidence retained.
