import { PREVIEW_RECEIPT_INTERVAL_MS } from './host-contract.mjs';

export function startWeaponSwitchGalleryFixture({
  url,
  snapshot,
  receipt,
  getVariant,
  setStatus,
  resumeButton,
  onPageHide = () => {},
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  makeId = () => crypto.randomUUID(),
  intervalMs = PREVIEW_RECEIPT_INTERVAL_MS,
  retryMs = 16
}) {
  const params = new URL(url).searchParams;
  if (!params.has('embed') || !params.has('galleryFixture')) return () => {};

  let stopped = false;
  let timer = null;
  let receiptCount = 0;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (timer !== null) clearTimer(timer);
    timer = null;
    resumeButton?.removeEventListener('click', onResume);
    onPageHide();
  };
  const schedule = delay => {
    if (!stopped) timer = setTimer(step, delay);
  };
  const step = () => {
    timer = null;
    if (stopped) return;
    const state = snapshot?.();
    if (state?.latestError) {
      setStatus(`Gallery fixture stopped — ${state.latestError.message || 'preview runtime error'}.`);
      stop();
      return;
    }
    if (!state?.initialized || state.phase !== 'playing' ||
        Object.keys(state.sourceHashes || {}).length !== 3) {
      schedule(retryMs);
      return;
    }
    if (state.held) {
      setStatus(`Gallery fixture paused during Hold — no game event; ${receiptCount} synthetic previews sent.`);
      schedule(intervalMs);
      return;
    }
    const accepted = receipt?.({
      id: `gallery-preview-fixture-${params.get('galleryStartupToken') || 'local'}-${makeId()}`,
      x: 0,
      y: 0,
      variant: Number(getVariant?.())
    });
    if (accepted) {
      receiptCount += 1;
      setStatus(`Gallery fixture loop active — synthetic preview ${receiptCount}; no game event.`);
    } else {
      setStatus(`Gallery fixture waiting to retry — ${receiptCount} synthetic previews sent; no game event.`);
    }
    schedule(intervalMs);
  };
  const onResume = () => {
    if (stopped) return;
    if (timer !== null) clearTimer(timer);
    schedule(0);
  };

  resumeButton?.addEventListener('click', onResume);
  schedule(0);
  return stop;
}
