const VERSION = 'gbo-zero-sol61-r3';
const context = window.__dvaGalleryStartupContext;
const frame = document.querySelector('#preview');
const status = document.querySelector('#status');
const query = new URLSearchParams();
query.set('embed', '1');
if (new URLSearchParams(location.search).has('verify')) query.set('verify', '1');
frame.src = `./package/index.html?${query}`;

let retired = false;
let error = null;
let ready = false;
let disposePromise = null;
const api = () => frame.contentWindow?.__gboZero || null;
const child = () => {
  try { return api()?.snapshot?.() || null; }
  catch (cause) { error = String(cause?.message || cause); return null; }
};
const snapshot = () => {
  const childSnapshot = child();
  const receipt = childSnapshot?.lastReceipt;
  const renderer = childSnapshot?.renderer || null;
  const receiptGood = receipt?.completed === true && receipt.cause === childSnapshot?.cause &&
    receipt.generation === childSnapshot?.generation && receipt.source === true && receipt.observer === true;
  ready = !retired && childSnapshot?.versionId === VERSION && childSnapshot.ready === true && receiptGood &&
    renderer?.versionId === VERSION && renderer.disposed === false;
  if (ready) status.textContent = `${childSnapshot.stage} · ${Math.round(childSnapshot.ageMs)}ms`;
  else if (error) status.textContent = `失敗: ${error}`;
  return { versionId: VERSION, ready, disposed: retired, error, childSnapshot };
};
frame.addEventListener('load', () => { snapshot(); });
window.__gboGalleryHostR880 = Object.freeze({
  snapshot,
  async dispose() {
    if (disposePromise) return disposePromise;
    retired = true;
    disposePromise = (async () => {
      const source = api();
      if (!source?.dispose) throw new Error('R3 runtime disposal API unavailable');
      const finalSnapshot = await source.dispose();
      const renderer = finalSnapshot?.renderer;
      const loss = finalSnapshot?.deviceLoss;
      const pass = finalSnapshot?.versionId === VERSION && finalSnapshot.disposed === true &&
        finalSnapshot.pendingTasks === 0 && finalSnapshot.activeVoices === 0 && renderer?.disposed === true &&
        loss?.expected === true && loss?.reason === 'destroyed';
      return {
        versionId: VERSION, disposed: finalSnapshot.disposed === true,
        pendingTasks: finalSnapshot.pendingTasks, activeVoices: finalSnapshot.activeVoices,
        rendererDisposed: renderer?.disposed === true,
        deviceLoss: loss ? { reason: loss.reason, expected: loss.expected, message: loss.message } : null,
        pass
      };
    })();
    return disposePromise;
  }
});
if (context?.versionId === VERSION) setInterval(snapshot, 20);
