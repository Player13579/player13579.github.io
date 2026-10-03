import { DURATION_MS, VERSION, VARIANTS, freezeReceipt, sample } from './plan.mjs';
import { createExcaliburZeroRenderer } from './runtime.mjs';
import { createExcaliburZeroSfx } from './sfx.mjs';
import { makeCompletedFrameProof, mapLogicalProjection, parseGalleryHandshake } from './gallery-contract.mjs';

const GALLERY_VERSION_ID = 'excalibur-zero-flare-ghost-sol61-r1';
const PLAN_SHA256 = 'd626a66fc9c5bf03a8e6da33d13e7f345aeac1ec14e42a257c814cb4a0075c09';
const SHADER_SHA256 = '90d37f88edf5a25a994dcfcd7d28bd85df310d8f8346e4266a87d231df1fc9bc';
const params = new URLSearchParams(location.search);
const verify = params.has('verify');
const embedded = params.get('embed') === '1';
if (embedded) document.body.classList.add('embed');
const canvas = document.querySelector('#preview');
const statusNode = document.querySelector('#status');
const errorNode = document.querySelector('#error');
const phaseInput = document.querySelector('#phase');
const phaseOutput = document.querySelector('#phase-out');
const controls = {
  sourceOn: document.querySelector('#source-on').checked, sourceVisibility: 1,
  postOn: document.querySelector('#post-on').checked, flareOn: document.querySelector('#flare-on').checked,
  ghostOn: document.querySelector('#ghost-on').checked, nearOn: document.querySelector('#near-on').checked,
  variant: document.querySelector('#variant').value,
};
let renderer = null, audio = null, disposed = false, playing = false, raf = null;
let heldPhase = null, effectAgeMs = 0, cycle = 0, causeGeneration = 0, playGeneration = 0, causeOrdinal = 0, receipt = null;
let sourcePoint = { x: 172.8, y: 297.6 }, opticalCenter = { x: 480, y: 240 };
let drawChain = Promise.resolve(), frameSerial = 0, lastFrame = null, firstFrameReported = false;
const startup = parseGalleryHandshake(params, GALLERY_VERSION_ID);
const startupToken = startup?.token || '';
const attemptEpoch = startup?.attemptEpoch || 0;
const startupValid = Boolean(startup);
let startupSequence = 0;
let startupSnapshot = Object.freeze({ schema:'dva-gallery-startup/v1', stage:'child-document', status:'pending', versionId:GALLERY_VERSION_ID, sequence:0, firstFrame:null });
function report(stage, state, detail = {}) {
  if (!startupValid) return;
  startupSnapshot = Object.freeze({ schema:'dva-gallery-startup/v1', token:startupToken, versionId:GALLERY_VERSION_ID,
    attemptEpoch, stage, status:state, sequence:++startupSequence, ...detail });
  try { window.parent.postMessage(startupSnapshot, location.origin); } catch (error) { throw new Error(`startup reporting failed: ${error.message}`); }
}
window.__dvaGalleryStartupSnapshot = () => startupSnapshot;
report('child-document', 'pending');
const session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
function makeCause(nextCycle) {
  cycle = nextCycle; causeGeneration++;
  const causeKey = `${session}:play-${playGeneration}:cause-${++causeOrdinal}:cycle-${cycle}`;
  const source = { x:0, y:0 }, direction = { x:1, y:0 }, pathLength = 720;
  receipt = freezeReceipt({ causeId:`${VERSION}:${causeKey}`, handSnapshotId:`${VERSION}:${causeKey}:hand`,
    source, pathEnd:{ x:pathLength, y:0 }, direction, variant:controls.variant });
  audio?.setCause(receipt.causeId, effectAgeMs);
}
function currentView() {
  const width = renderer?.extent.width || canvas.width, height = renderer?.extent.height || canvas.height;
  return mapLogicalProjection({width,height},sourcePoint,opticalCenter);
}
function readControls() {
  return { sourceOn:document.querySelector('#source-on').checked,
    sourceVisibility:Number(document.querySelector('#visibility').value),
    postOn:document.querySelector('#post-on').checked, flareOn:document.querySelector('#flare-on').checked,
    ghostOn:document.querySelector('#ghost-on').checked, nearOn:document.querySelector('#near-on').checked,
    variant:document.querySelector('#variant').value, opticalCenter:currentView().opticalCenter };
}
function drawFrame(timestamp, initial = false) {
  const work = drawChain.then(() => drawFrameCore(timestamp, initial), () => drawFrameCore(timestamp, initial));
  drawChain = work.catch(() => {}); return work;
}
async function drawFrameCore(timestamp, initial = false) {
  if (disposed || !renderer) return null;
  try {
    if (playing && heldPhase === null) {
      const elapsed = Math.max(0, timestamp - playbackOrigin);
      const nextCycle = Math.floor(elapsed / DURATION_MS);
      effectAgeMs = elapsed % DURATION_MS;
      if (nextCycle !== cycle) makeCause(nextCycle);
    } else if (heldPhase !== null) effectAgeMs = heldPhase;
    const activeControls = readControls(); controls.variant = activeControls.variant;
    audio?.setEffectAge(effectAgeMs);
    const frame = renderer.render(receipt, effectAgeMs, { view:currentView(), controls:activeControls,
      causeGeneration, causeId:receipt.causeId });
    lastFrame = { ...frame, completion:undefined };
    statusNode.textContent = `Submitted ${frame.sequence} · E ${Math.floor(effectAgeMs)} / ${DURATION_MS} ms`;
    if (initial) report('first-frame', 'pending', { firstFrame:{ sequence:frame.sequence, submitted:true, completed:false, uniformAge:frame.uniformAge } });
    const completed = await frame.completion;
    frameSerial = completed.sequence;
    lastFrame = completed;
    statusNode.textContent = `WebGPU ready · completed ${frameSerial} · ${Math.floor(effectAgeMs)} ms · ${verify ? 'verify muted' : 'audio on request'}`;
    if (!firstFrameReported) {
      firstFrameReported = true;
      const proof = makeCompletedFrameProof(lastFrame, { canvasConnected:canvas.isConnected,
        canvasRect:canvas.getBoundingClientRect(),
        sourceHashes:{ plan:PLAN_SHA256, shader:SHADER_SHA256 }, completedFrame:completed });
      report('first-frame','ready',{ firstFrame:proof });
      report('playing','ready',{ firstFrame:proof });
    }
    return completed;
  } catch (error) {
    const message = error?.stack || error?.message || String(error);
    errorNode.textContent = message; errorNode.hidden = false; statusNode.textContent = 'WebGPU preview failed';
    report('playing','error',{ error:{ code:'WEBGPU_RENDER_ERROR', message:String(error?.message || error).slice(0,600) } });
    playing = false; return null;
  } finally {
    if (playing && heldPhase === null && !disposed) raf = requestAnimationFrame(tick);
  }
}
function tick(timestamp) { raf = null; void drawFrame(timestamp); }
let playbackOrigin = performance.now();
function snap() {
  const activeControls = readControls();
  return Object.freeze({ version:VERSION, galleryVersionId:GALLERY_VERSION_ID, verify, embedded,
    playing, heldPhase, effectAgeMs, cycle, causeGeneration, receipt, sampled:receipt ? sample(receipt,effectAgeMs,activeControls) : null,
    sourcePosition:Object.freeze({ ...sourcePoint }), opticalCenter:Object.freeze({ ...opticalCenter }),
    controls:Object.freeze(activeControls), sourceHashes:Object.freeze({ plan:PLAN_SHA256, shader:SHADER_SHA256 }),
    frame:lastFrame, submittedSerial:renderer?.snapshot.latestSubmittedFrame?.sequence || 0,
    completedSerial:renderer?.snapshot.latestCompletedFrame?.sequence || 0, render:renderer?.snapshot || null,
    audio:audio?.snapshot || null, startup:startupSnapshot, disposed });
}
async function hold() {
  if (disposed) throw new Error('preview disposed');
  if (raf != null) cancelAnimationFrame(raf); raf = null;
  if (playing && heldPhase === null) effectAgeMs = Math.max(0, performance.now() - playbackOrigin) % DURATION_MS;
  playing = false; heldPhase = effectAgeMs; phaseInput.value = String(heldPhase); phaseOutput.value = `${Math.floor(heldPhase)} ms`;
  await drawFrame(performance.now()); return snap();
}
async function setPhase(value, initial = false) {
  const n = Number(value); if (!Number.isFinite(n) || n < 0 || n > DURATION_MS) throw new Error('phase must be within 0..1200ms');
  if (raf != null) cancelAnimationFrame(raf); raf = null;
  playing = false; heldPhase = n; effectAgeMs = n; phaseInput.value = String(n); phaseOutput.value = `${Math.floor(n)} ms`;
  await drawFrame(performance.now(), initial); return snap();
}
async function play() {
  if (disposed) throw new Error('preview disposed');
  if (raf != null) cancelAnimationFrame(raf); raf = null;
  heldPhase = null; playing = true; playbackOrigin = performance.now(); effectAgeMs = 0; playGeneration++; makeCause(0);
  await drawFrame(performance.now()); return snap();
}
async function configure(next = {}) {
  if (disposed) throw new Error('preview disposed');
  if (next.variant && !Object.hasOwn(VARIANTS,next.variant)) throw new Error('unknown variant');
  if (next.sourcePosition) sourcePoint = { x:Number(next.sourcePosition.x), y:Number(next.sourcePosition.y) };
  if (next.opticalCenter) opticalCenter = { x:Number(next.opticalCenter.x), y:Number(next.opticalCenter.y) };
  for (const name of ['sourceOn','sourceVisibility','postOn','flareOn','ghostOn','nearOn']) {
    if (!Object.hasOwn(next,name)) continue;
    const selector={ sourceOn:'#source-on',sourceVisibility:'#visibility',postOn:'#post-on',flareOn:'#flare-on',ghostOn:'#ghost-on',nearOn:'#near-on' }[name];
    const node=document.querySelector(selector); if (node.type === 'checkbox') node.checked=Boolean(next[name]); else node.value=String(next[name]);
  }
  if (next.variant) document.querySelector('#variant').value = next.variant;
  controls.variant = document.querySelector('#variant').value;
  if (receipt.variant !== controls.variant) makeCause(cycle + (playing ? 0 : 1));
  await drawFrame(performance.now()); return snap();
}
async function dispose() {
  if (disposed) return; disposed = true; playing = false;
  if (raf != null) cancelAnimationFrame(raf); raf = null;
  audio?.dispose(); audio = null; const active = renderer; renderer = null; await active?.dispose();
}
window.__excaliburZeroPreview = Object.freeze({ setPhase, configure, snapshot:snap, play, hold, dispose });
let sfx;
try {
  report('adapter','pending');
  renderer = await createExcaliburZeroRenderer(canvas, { onDiagnostic:row => {
    if (row.type === 'error' || row.type === 'device-lost') { errorNode.textContent=row.message; errorNode.hidden=false; }
  } });
  report('adapter','ready'); report('device','ready'); report('assets','ready'); report('pipelines','ready');
  audio = createExcaliburZeroSfx({ isVerify:verify, getCurrentEffectAge:()=>effectAgeMs });
  window.__gallerySfx = Object.freeze({ activateFromGesture:()=>audio?.activateFromGesture(), stop:()=>audio?.stopCause() });
  sfx = audio;
  makeCause(0);
  const phaseParam = params.get('phase');
  if (phaseParam != null && Number.isFinite(Number(phaseParam)) && Number(phaseParam) >= 0 && Number(phaseParam) <= DURATION_MS) {
    await setPhase(Number(phaseParam), true);
  } else {
    playing = true; heldPhase = null; playbackOrigin = performance.now(); await drawFrame(performance.now(), true);
  }
  document.querySelector('#play').addEventListener('click', () => { void play(); });
  document.querySelector('#hold').addEventListener('click', () => { void hold(); });
  document.querySelector('#audio').addEventListener('click', async () => {
    const result = await audio?.activateFromGesture();
    statusNode.textContent = result?.state === 'active' ? 'Audio enabled for future causes · no late replay' : `Audio ${result?.state || 'unavailable'}`;
  });
  phaseInput.addEventListener('input', () => { phaseOutput.value = `${phaseInput.value} ms`; });
  phaseInput.addEventListener('change', () => { void setPhase(phaseInput.value); });
  for (const id of ['variant','source-on','post-on','flare-on','ghost-on','near-on','visibility','sx','sy','cx','cy']) {
    document.querySelector(`#${id}`).addEventListener('change', () => {
      sourcePoint={x:Number(document.querySelector('#sx').value),y:Number(document.querySelector('#sy').value)};
      opticalCenter={x:Number(document.querySelector('#cx').value),y:Number(document.querySelector('#cy').value)};
      controls.variant=document.querySelector('#variant').value;
      if (receipt.variant !== controls.variant) makeCause(cycle + 1);
      if (heldPhase === null) void drawFrame(performance.now()); else void drawFrame(performance.now());
    });
  }
  window.addEventListener('pagehide', () => { void dispose(); }, { once:true });
} catch (error) {
  const message=error?.stack || error?.message || String(error); errorNode.textContent=message; errorNode.hidden=false;
  statusNode.textContent='WebGPU initialization failed'; report('pipelines','error',{error:{code:'WEBGPU_INIT_ERROR',message:String(error?.message || error).slice(0,600)}});
  await dispose();
}

