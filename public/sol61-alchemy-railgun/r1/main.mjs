import { VERSION, DURATION_MS, planRailguns, createRailgunRenderer } from './effect.mjs?v=f691057c104742fb';
import { AUDIO_MS, createRailgunAudio } from './audio.mjs?v=1535e3a3c3fb4008';

export const GALLERY_VERSION_ID = 'alchemy-railgun-sol61-r1';
const STARTUP_SCHEMA = 'dva-gallery-startup/v1';
const STARTUP_STAGES = Object.freeze(['child-document', 'adapter', 'device', 'assets', 'pipelines', 'first-frame', 'playing']);
const STARTUP_STATUSES = Object.freeze(['pending', 'delayed', 'ready', 'error', 'cancelled', 'unsupported']);

export function createStartupReporter(params, postMessage) {
  const token = String(params?.galleryStartupToken || '');
  const versionId = String(params?.galleryVersionId || '');
  const attemptEpoch = Number(params?.galleryAttemptEpoch);
  const enabled = /^[a-f0-9]{32}$/i.test(token) && versionId === GALLERY_VERSION_ID &&
    Number.isSafeInteger(attemptEpoch) && attemptEpoch > 0 && typeof postMessage === 'function';
  let sequence = 0;
  let latest = null;
  return Object.freeze({
    enabled,
    send(stage, status, extra = {}) {
      if (!enabled) return null;
      if (!STARTUP_STAGES.includes(stage) || !STARTUP_STATUSES.includes(status))
        throw new TypeError('invalid-gallery-startup-phase');
      const message = Object.freeze({ ...extra, schema: STARTUP_SCHEMA, token, versionId,
        attemptEpoch, sequence: ++sequence, stage, status });
      latest = message;
      postMessage(message);
      return message;
    },
    snapshot() { return latest; }
  });
}

export function createFirstFrameProof({ submitted, completed, canvas, passes }) {
  return Object.freeze({ recorded: true, submitted: submitted === true,
    completed: completed === true, canvasConnected: canvas?.isConnected === true,
    passes: Number.isSafeInteger(passes) ? passes : 0,
    viewportWidth: Number.isSafeInteger(canvas?.width) ? canvas.width : 0,
    viewportHeight: Number.isSafeInteger(canvas?.height) ? canvas.height : 0 });
}

export function isGalleryRetireMessage(event, { origin, source, token, versionId = GALLERY_VERSION_ID, attemptEpoch }) {
  const data = event?.data;
  const expectedEpoch = Number(attemptEpoch);
  return event?.source === source && event?.origin === origin && data?.schema === STARTUP_SCHEMA &&
    data.action === 'retire' && data.token === token && data.versionId === versionId &&
    Number.isSafeInteger(data.attemptEpoch) && Number.isSafeInteger(expectedEpoch) &&
    data.attemptEpoch === expectedEpoch;
}

export function createGallerySfxHandler({ audio, verify, getCurrentCause, isRetired = () => false,
  onEnabled = () => {}, onMuted = () => {} }) {
  const silent = () => Boolean(verify || audio?.snapshot?.().verify || audio?.snapshot?.().muted || isRetired());
  return Object.freeze({
    async activateFromGesture(item) {
      if (item?.id !== GALLERY_VERSION_ID || silent()) return false;
      const enabled = await audio.unlock();
      if (!enabled || silent()) return false;
      onEnabled();
      const cause = getCurrentCause();
      if (cause && cause.ageMs >= 0 && cause.ageMs < AUDIO_MS)
        audio.play(cause.id, cause.ageMs);
      return true;
    },
    setMuted(value) {
      if (verify && value === false) return false;
      audio.setMuted(Boolean(value));
      if (value) onMuted();
      return true;
    },
    stop() { audio.stop(); },
    snapshot() { return audio.snapshot(); }
  });
}

const browser = typeof window !== 'undefined' && typeof document !== 'undefined';
const pageParams = browser ? new URLSearchParams(location.search) : new URLSearchParams();
const verify = pageParams.has('verify');
const embed = pageParams.has('embed');
const startup = createStartupReporter({
  galleryStartupToken: pageParams.get('galleryStartupToken'),
  galleryVersionId: pageParams.get('galleryVersionId'),
  galleryAttemptEpoch: pageParams.get('galleryAttemptEpoch')
}, message => window.parent.postMessage(message, location.origin));
let startupStage = 'child-document';
let retired = false;
let cleanup = null;

if (browser) {
  document.body.classList.toggle('verify', verify);
  document.body.classList.toggle('embed', embed);
  window.__dvaGalleryStartupSnapshot = () => startup.snapshot();
  if (startup.enabled) startup.send('child-document', 'ready');
  window.addEventListener('message', event => {
    if (!isGalleryRetireMessage(event, { origin: location.origin, source: window.parent,
      token: pageParams.get('galleryStartupToken'), versionId: GALLERY_VERSION_ID,
      attemptEpoch: pageParams.get('galleryAttemptEpoch') })) return;
    retired = true;
    startup.send(startupStage, 'cancelled');
    cleanup?.();
  });
}

const SCENE = `struct S{data:vec4f};@group(0) @binding(0)var<uniform>u:S;@vertex fn vs(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}@fragment fn fs(@builtin(position)p:vec4f)->@location(0)vec4f{let grid=select(0.,.013,(u32(p.x/u.data.w)%64u<1u)||(u32(p.y/u.data.w)%64u<1u));let bg=mix(vec3f(.028,.047,.06),vec3f(.64,.69,.73),u.data.z);return vec4f(bg+grid,1.);}`;

async function boot() {
  const canvas = document.querySelector('#view');
  const controls = Object.fromEntries(['age', 'source', 'obs', 'reduced', 'bright', 'proof', 'label']
    .map(id => [id, document.getElementById(id)]));
  if (!canvas) return;
  const audio = createRailgunAudio({ verify, muted: verify });
  let device, context, renderer, scene, source, sceneView, sourceView, scenePipe, sceneUniform, sceneBind;
  let disposed = false, disposePromise = null, failed = null, mode = 'play', heldAge = 0;
  let epoch = performance.now(), cycle = 0, run = 0, frameId = 0;
  let submission = 0, completion = 0, observationBoundary = 0, current = null, completed = null;
  let audioEnabled = false, animationFrame = 0, firstFramePending = false;
  const pending = new Map();

  function send(stage, status, extra) {
    startupStage = stage;
    startup.send(stage, status, extra);
  }
  function dimensions() {
    const ratio = Math.min(2, devicePixelRatio || 1);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height || !scene) {
      scene?.destroy(); source?.destroy();
      canvas.width = width; canvas.height = height;
      scene = device.createTexture({ label: 'TEST_ONLY matte plane linear', size: [width, height],
        format: 'rgba16float', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
      source = device.createTexture({ label: 'railgun source HDR', size: [width, height],
        format: 'rgba16float', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC });
      sceneView = scene.createView(); sourceView = source.createView();
    }
    return ratio;
  }
  function receipt(age) {
    const ratio = Math.min(2, devicePixelRatio || 1);
    const worldWidth = canvas.width / ratio, worldHeight = canvas.height / ratio;
    const id = `magic_alchemy_railgun_${run}_${cycle}`;
    return { type: 'alchemy-railgun', id, playerId: 'TEST_ONLY', startedAt: 0,
      handWorld: { x: -worldWidth * .32, y: worldHeight * .055 }, handSourceId: id,
      handFrameId: frameId, targetX: worldWidth * .30, targetY: -worldHeight * .06,
      radius: 100, variant: 'normal', ageMs: age };
  }
  function currentCause() {
    if (disposed || failed || retired || document.hidden || mode !== 'play' || !controls.source.checked) return null;
    const elapsed = Math.max(0, performance.now() - epoch);
    const currentCycle = Math.floor(elapsed / 1250);
    const ageMs = elapsed - currentCycle * 1250;
    if (ageMs < 0 || ageMs >= DURATION_MS) return null;
    return { id: `magic_alchemy_railgun_${run}_${currentCycle}`, ageMs };
  }
  function snapshot() {
    return { version: VERSION, galleryVersionId: GALLERY_VERSION_ID, verify, failed, mode, cycle, frameId,
      submission, completion, observationBoundary, current, completed, audio: audio.snapshot(),
      width: canvas.width, height: canvas.height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight,
      referenceWorldHeight: 64, sourceOn: controls.source.checked, obs: controls.obs.checked,
      reduced: controls.reduced.checked, startup: startup.snapshot() };
  }
  function dispose() {
    if (disposePromise) return disposePromise;
    disposed = true;
    cancelAnimationFrame(animationFrame);
    audio.stop();
    disposePromise = (async () => {
      try { await device?.queue.onSubmittedWorkDone(); } catch (_) {}
      renderer?.dispose(); scene?.destroy(); source?.destroy(); sceneUniform?.destroy();
      context?.unconfigure(); device?.destroy();
      await audio.dispose();
    })();
    return disposePromise;
  }
  cleanup = () => { void dispose(); };

  function frame(now) {
    if (disposed || retired || failed) return;
    try {
      const ratio = dimensions();
      let age = heldAge;
      if (mode === 'play') {
        const elapsed = Math.max(0, now - epoch);
        cycle = Math.floor(elapsed / 1250);
        age = elapsed - cycle * 1250;
      }
      frameId++;
      const frameInput = { id: frameId, nowMs: age, zoom: ratio, camera: { x: 0, y: 0 },
        viewport: { x: canvas.width, y: canvas.height }, visible: !document.hidden,
        obs: controls.obs.checked, reducedMotion: controls.reduced.checked };
      const event = receipt(age);
      const plans = controls.source.checked && (mode === 'play' || mode === 'hold')
        ? planRailguns([event], frameInput) : [];
      if (audioEnabled && mode === 'play' && plans.length) audio.play(event.id, plans[0].ageMs);

      const encoder = device.createCommandEncoder();
      device.queue.writeBuffer(sceneUniform, 0, new Float32Array([
        canvas.width, canvas.height, +controls.bright.checked, ratio
      ]));
      const background = encoder.beginRenderPass({ colorAttachments: [{ view: sceneView,
        loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
      background.setPipeline(scenePipe); background.setBindGroup(0, sceneBind); background.draw(3); background.end();
      const output = context.getCurrentTexture();
      renderer.recordSource(encoder, plans, sourceView);
      renderer.recordComposite(encoder, { sourceView, sceneView, outputView: output.createView(),
        targetIdentities: { source, scene, output }, width: canvas.width, height: canvas.height,
        pixelRatio: ratio, obs: controls.obs.checked, registeredMattePlaneGain: .35 });
      device.queue.submit([encoder.finish()]);
      submission++;
      const record = { submission, frameId, ageMs: age, cycle, sourceOn: controls.source.checked,
        visibleSources: plans.map(plan => plan.sourceId), obs: controls.obs.checked,
        reduced: controls.reduced.checked, sourceCleared: true, passes: 3 };
      current = record; pending.set(submission, record);
      device.queue.onSubmittedWorkDone().then(() => {
        if (disposed || retired) return;
        if (record.submission > completion) { completion = record.submission; completed = record; }
        pending.delete(record.submission);
        requestAnimationFrame(() => { observationBoundary = Math.max(observationBoundary, record.submission); });
      }).catch(error => fail('playing', 'RAILGUN_QUEUE_FAILED', error));
      controls.label.textContent = `${age.toFixed(1)}ms`; controls.age.value = String(age);
      controls.proof.textContent = JSON.stringify(snapshot(), null, 1);
      if (!firstFramePending && startup.enabled) {
        firstFramePending = true;
        send('first-frame', 'pending');
        device.queue.onSubmittedWorkDone().then(() => {
          if (disposed || retired || failed) return;
          const firstFrame = createFirstFrameProof({ submitted: true, completed: true,
            canvas, passes: 3 });
          if (!firstFrame.canvasConnected || !firstFrame.viewportWidth || !firstFrame.viewportHeight) {
            fail('first-frame', 'FIRST_FRAME_CANVAS_INVALID', new Error('canvas is detached or zero-sized'));
            return;
          }
          send('first-frame', 'ready', { firstFrame });
          send('playing', 'ready', { firstFrame });
        }).catch(error => fail('first-frame', 'FIRST_FRAME_QUEUE_FAILED', error));
      }
      animationFrame = requestAnimationFrame(frame);
    } catch (error) { fail(startupStage, 'RAILGUN_FRAME_FAILED', error); }
  }
  function fail(stage, code, error) {
    if (failed || disposed || retired) return;
    failed = `${code}: ${String(error?.message || error || 'unknown').slice(0, 1000)}`;
    audio.stop();
    controls.proof.textContent = failed;
    send(stage, 'error', { error: { code, message: String(error?.message || error || 'unknown').slice(0, 1000) } });
  }
  function play() {
    if (retired || disposed || failed) return snapshot();
    mode = 'play'; epoch = performance.now(); cycle = 0; run++; audio.stop();
    return snapshot();
  }
  const bridge = createGallerySfxHandler({ audio, verify, getCurrentCause: currentCause,
    isRetired: () => retired || disposed || Boolean(failed), onEnabled: () => { audioEnabled = true; },
    onMuted: () => { audioEnabled = false; } });
  window.__gallerySfx = bridge;
  window.railgun = { snapshot, hold(ms) {
    mode = 'hold'; heldAge = Math.max(0, Math.min(1000, Number(ms))); audio.stop(); return snapshot();
  }, play, setMuted(value) { return bridge.setMuted(value); }, set({ source, obs, reduced, bright } = {}) {
    if (source !== undefined) { controls.source.checked = !!source; if (!source) audio.stop(); }
    if (obs !== undefined) controls.obs.checked = !!obs;
    if (reduced !== undefined) controls.reduced.checked = !!reduced;
    if (bright !== undefined) controls.bright.checked = !!bright;
    return snapshot();
  }, async afterCompletedFrame(afterSubmission = 0) {
    while (!failed && completion <= afterSubmission) await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); return snapshot();
  }, dispose };

  document.getElementById('hold').onclick = () => window.railgun.hold(Number(controls.age.value));
  controls.age.oninput = () => window.railgun.hold(Number(controls.age.value));
  document.getElementById('play').onclick = () => play();
  controls.source.onchange = () => { if (!controls.source.checked) audio.stop(); };
  document.getElementById('audio').onclick = () => { void bridge.activateFromGesture({ id: GALLERY_VERSION_ID }); };
  document.addEventListener('visibilitychange', () => {
    audio.stop();
    if (document.hidden) { mode = 'hold'; heldAge = DURATION_MS; }
    else play();
  });
  window.addEventListener('pagehide', () => { void dispose(); }, { once: true });

  try {
    if (retired) { await dispose(); return; }
    send('adapter', 'pending');
    if (!navigator.gpu) throw new Error('WebGPU required');
    const adapter = await navigator.gpu.requestAdapter();
    if (retired) { await dispose(); return; }
    if (!adapter) throw new Error('No WebGPU adapter');
    send('adapter', 'ready'); send('device', 'pending');
    device = await adapter.requestDevice();
    if (retired) { await dispose(); return; }
    send('device', 'ready');
    device.addEventListener('uncapturederror', event => fail(startupStage,
      'RAILGUN_GPU_VALIDATION', event?.error || event));
    device.lost.then(info => fail(startupStage, 'RAILGUN_DEVICE_LOST',
      new Error(`${info?.reason || 'unknown'}: ${info?.message || ''}`)));
    context = canvas.getContext('webgpu');
    if (!context) throw new Error('canvas webgpu context unavailable');
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });
    send('assets', 'pending');
    if (VERSION !== 'alchemy-railgun-sol61-r1') throw new Error('unexpected sealed E module version');
    send('assets', 'ready'); send('pipelines', 'pending');
    renderer = await createRailgunRenderer(device, { outputFormat: format });
    if (retired) { await dispose(); return; }
    sceneUniform = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const module = device.createShaderModule({ code: SCENE });
    const info = await module.getCompilationInfo();
    const shaderErrors = info.messages.filter(message => message.type === 'error');
    if (shaderErrors.length) throw new Error(shaderErrors.map(message => message.message).join('\n'));
    scenePipe = device.createRenderPipeline({ layout: 'auto',
      vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format: 'rgba16float' }] },
      primitive: { topology: 'triangle-list' } });
    sceneBind = device.createBindGroup({ layout: scenePipe.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: sceneUniform } }] });
    if (retired) { await dispose(); return; }
    send('pipelines', 'ready');
    play();
    animationFrame = requestAnimationFrame(frame);
  } catch (error) {
    fail(startupStage, 'RAILGUN_STARTUP_FAILED', error);
    if (startup.enabled && startup.snapshot()?.status !== 'error')
      send(startupStage, 'error', { error: { code: 'RAILGUN_STARTUP_FAILED', message: String(error?.message || error) } });
  }
}

if (browser && document.querySelector('#view')) void boot();
