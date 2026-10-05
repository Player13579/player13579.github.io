import { DURATION } from './source/effect.mjs';

// The gallery's ordinary iframe route asks for an automatic replay. Keep the
// authored runtime untouched: drive the same visible controls a reviewer can
// click, alternating its single- and three-cause fixtures.
export function installGalleryAutoplay({ query, status, single, joint, cancel, documentRef, windowRef,
  MutationObserverClass = MutationObserver, setTimer = setTimeout, clearTimerFn = clearTimeout,
  durationMs = DURATION * 1000 }) {
  if (query.get('galleryAutoLoop') !== '1') return null;
  let started = false;
  let enabled = true;
  let cycle = 0;
  let timer = 0;

  function clearTimer() {
    if (timer) clearTimerFn(timer);
    timer = 0;
  }

  function playNext() {
    clearTimer();
    if (!enabled || documentRef.hidden) return;
    (cycle++ % 2 ? joint : single).click();
    timer = setTimer(playNext, durationMs + 500);
  }

  function maybeStart() {
    if (started || !enabled || documentRef.hidden || !status.textContent.includes('WebGPU ready')) return;
    started = true;
    playNext();
  }

  new MutationObserverClass(maybeStart).observe(status, { childList: true, characterData: true, subtree: true });
  maybeStart();
  cancel.addEventListener('click', () => { enabled = false; clearTimer(); });
  documentRef.addEventListener('visibilitychange', () => {
    clearTimer();
    if (!documentRef.hidden) {
      if (started) playNext();
      else maybeStart();
    }
  });
  windowRef.addEventListener('pagehide', clearTimer, { once: true });
  return Object.freeze({ stop: () => { enabled = false; clearTimer(); }, get started() { return started; } });
}

if (typeof location !== 'undefined' && typeof document !== 'undefined') {
  installGalleryAutoplay({ query: new URL(location.href).searchParams,
    status: document.querySelector('#status'), single: document.querySelector('#play'),
    joint: document.querySelector('#joint'), cancel: document.querySelector('#cancel'),
    documentRef: document, windowRef: window });
}
