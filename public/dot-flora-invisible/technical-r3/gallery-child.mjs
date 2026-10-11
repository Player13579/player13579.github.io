const SCHEMA = 'dva-gallery-startup/v1';
const STAGES = ['child-document','adapter','device','assets','pipelines','first-frame','playing'];
export function bindGalleryChild({window: win,versionId,getSnapshot,replay,stop,setMuted,unlockFromGesture,dispose}) {
  const url = new URL(win.location.href), p = url.searchParams;
  const token = p.get('galleryStartupToken'), epoch = Number(p.get('galleryAttemptEpoch'));
  const embedded = p.get('embed') === '1' && win.parent !== win;
  if (embedded && (!token || !Number.isSafeInteger(epoch) || epoch < 1 || p.get('galleryVersionId') !== versionId)) throw new Error('gallery identity missing or mismatched');
  const verify = p.has('verify');
  let sequence = 0, stage = 'child-document', ready = false, retired = false, retiring = null, audioSerial = 0;
  let latest = null, audioState = verify ? 'silent' : 'ready';
  const origin = url.origin;
  const emit = fields => {
    latest = {schema:SCHEMA,token,versionId,attemptEpoch:epoch,sequence:++sequence,stage,...fields};
    if (embedded) win.parent.postMessage(latest,origin);
    return latest;
  };
  function reportStage(next) {
    if (retired || !STAGES.includes(next) || STAGES.indexOf(next) < STAGES.indexOf(stage)) return false;
    stage = next; emit({status:'pending'}); return true;
  }
  function reportFrame() {
    if (retired || ready) return false;
    const s = getSnapshot(), f = s?.firstFrame;
    if (s?.active !== true || !s.causeId || !Number.isSafeInteger(s.generation) || !Number.isFinite(s.sourceAgeMs) || s.sourceAgeMs < 0 || s.sourceAgeMs >= 1600 ||
      f?.causeId !== s.causeId || f?.generation !== s.generation || !Number.isFinite(f.sourceAgeMs) || f.sourceAgeMs < 0 || f.sourceAgeMs >= 1600 ||
      f.recorded !== true || f.submitted !== true || f.completed !== true || f.canvasConnected !== true ||
      !Number.isSafeInteger(f.passes) || f.passes < 1 || !Number.isFinite(f.viewportWidth) || f.viewportWidth <= 0 || !Number.isFinite(f.viewportHeight) || f.viewportHeight <= 0) return false;
    stage = 'playing'; ready = true; emit({status:'ready',firstFrame:{...f}}); return true;
  }
  function reportVisualError(error) {
    if (retired) return false;
    emit({status:'error',error:{code:String(error?.code || 'PREVIEW_STARTUP_ERROR'),message:String(error?.message || error)}}); return true;
  }
  async function activateFromGesture() {
    if (verify) return {state:'silent',reason:'verification mode'};
    if (retired) return {state:'stale',reason:'preview retired'};
    const serial = ++audioSerial;
    try {
      const result = await unlockFromGesture();
      if (retired || serial !== audioSerial) return {state:'stale',reason:'preview changed before audio completed'};
      const s = getSnapshot();
      // Require authored playback to confirm both permission and real context state.
      if (result === false || s?.audio?.unlocked !== true || s?.audio?.contextState !== 'running') {
        audioState = 'unsupported'; return {state:audioState,reason:'source audio is not running'};
      }
      audioState = 'active'; return {state:audioState,reason:'using the preview’s authored SFX'};
    } catch (error) {
      audioState = 'unsupported'; return {state:audioState,reason:String(error?.message || error)};
    }
  }
  function retire() {
    if (retiring) return retiring;
    retired = true; audioSerial++;
    retiring = (async()=>{
      try {
        stop(); setMuted(true);
        await dispose();
        const lifecycle = getSnapshot()?.lifecycle;
        if (lifecycle?.disposeSettled !== true || lifecycle?.teardown !== 'disposed') throw new Error('disposal proof unavailable');
        emit({action:'retired',status:'cancelled',lifecycle});
        return lifecycle;
      } catch (error) { emit({action:'retire-error',status:'cancelled',teardown:'unknown',error:{message:String(error?.message || error)}}); return null; }
      finally { win.removeEventListener('message',onMessage); }
    })();
    return retiring;
  }
  function onMessage(event) {
    const d = event?.data;
    if (!embedded || event.source !== win.parent || event.origin !== origin || d?.schema !== SCHEMA || d.token !== token || d.versionId !== versionId || d.attemptEpoch !== epoch || d.action !== 'retire') return;
    void retire();
  }
  const sfx = Object.freeze({activateFromGesture});
  const startupSnapshot = () => latest && {...latest};
  win.__gallerySfx = sfx;
  win.__dvaGalleryStartupSnapshot = startupSnapshot;
  win.addEventListener('message',onMessage);
  setMuted(verify || getSnapshot()?.muted === true);
  emit({status:'pending'});
  return Object.freeze({reportStage,reportFrame,reportVisualError,retire,snapshot:startupSnapshot,
    replay:()=>retired ? false : replay(),stop:()=>stop(),setMuted:value=>setMuted(verify || Boolean(value)),
    activateFromGesture,get audioState(){return audioState;},embedded,verify});
}
