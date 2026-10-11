(() => {
  'use strict';
  const VERSION = 'special-ammo-legacy-host-clock-sfx-retirement-r1435';
  const PACKAGE_SCHEMA = 'special-ammo-host-clock-sfx-retirement-r1435/v1';
  const RETIRE_LOSS_DEADLINE_MS = 5000;
  const canvas = document.getElementById('gpu');
  const status = document.getElementById('status');
  const params = new URL(location.href).searchParams;
  const token = params.get('galleryStartupToken') || '';
  const versionId = params.get('galleryVersionId') || '';
  const attemptEpoch = Number(params.get('galleryAttemptEpoch'));
  const packageManifestSha256 = params.get('galleryPackageManifestSha256') || '';
  const packageSealSha256 = params.get('galleryPackageSealSha256') || '';
  const embedded = window.parent !== window;
  const parentVerifyMode = (() => { try { return embedded && new URL(window.parent.location.href).searchParams.has('verify'); } catch (_) { return false; } })();
  const verifyMode = params.has('verify') || parentVerifyMode;
  const soundButton = document.getElementById('sound');
  const kindSelect = document.getElementById('kind');
  const ammoSelect = document.getElementById('ammo');
  const weaponSelect = document.getElementById('weapon');
  let sequence = 0, frameId = 0, raf = 0, retiring = false, retired = false;
  let renderer = null, effectPass = null, device = null, targetHandle = null, rawDevice = null;
  let destroyCalled = false, activeFramePromise = Promise.resolve(), audioContext = null, master = null, cuePlayer = null;
  let effectId = 0, initStarted = false, audioEpoch = 0;
  // Preview events preserve the producer's 1450ms duration and use a 1426ms cycle.
  // The next cause starts at age 24ms, so continuous samples remain in [24, 1450).
  const PREVIEW_DURATION_MS = 1450, PREVIEW_MIN_AGE_MS = 24;
  const PREVIEW_CYCLE_MS = PREVIEW_DURATION_MS - PREVIEW_MIN_AGE_MS;
  let previewGeneration = 0, previewEpoch = 0;
  function restartPreview(now = performance.now()) { previewGeneration++; previewEpoch = now; }
  const origin = location.origin;
  const validIdentity = !embedded || (/^[0-9a-f]{32}$/.test(token) && versionId === VERSION &&
    Number.isSafeInteger(attemptEpoch) && attemptEpoch > 0 &&
    /^[0-9a-f]{64}$/.test(packageManifestSha256) && /^[0-9a-f]{64}$/.test(packageSealSha256));
  const setStatus = value => { status.textContent = String(value); };
  function send(stage, state, extra = {}) {
    if (!embedded || !validIdentity) return;
    window.parent.postMessage({ schema: 'dva-gallery-startup/v1', packageSchema: PACKAGE_SCHEMA,
      packageManifestSha256, packageSealSha256, token, versionId, attemptEpoch,
      sequence: ++sequence, stage, status: state, ...extra }, origin);
  }
  function fail(stage, error) {
    cancelAnimationFrame(raf);
    const message = String(error?.message || error || 'WebGPU preview failed').slice(0, 1000);
    const unsupported = /webgpu.{0,32}(?:unsupported|unavailable)|adapter unavailable|not supported/i.test(message);
    setStatus(message);
    send(stage, unsupported ? 'unsupported' : 'error', { error: {
      code: unsupported ? 'WEBGPU_UNSUPPORTED' : 'SPECIAL_AMMO_STARTUP_ERROR', message
    } });
  }
  function trackedDevice(raw) {
    rawDevice = raw;
    return new Proxy(raw, { get(target, property) {
      if (property === 'destroy') return () => {
        if (destroyCalled) return;
        destroyCalled = true;
        return Reflect.apply(target.destroy, target, []);
      };
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
  }
  const deviceLostOutcome = device => Promise.resolve(device.lost).then(info => ({
    settled: true, reason: info?.reason || '', message: String(info?.message || '')
  }), error => ({ settled: false, reason: 'rejected', message: String(error?.message || error) }));
  function timeout(promise, ms) {
    let timer;
    return Promise.race([promise, new Promise(resolve => { timer = setTimeout(() => resolve(null), ms); })])
      .finally(() => clearTimeout(timer));
  }
  function validRetireRequest(event) {
    const data = event?.data;
    return embedded && validIdentity && event.source === window.parent && event.origin === origin &&
      data?.schema === 'dva-gallery-startup/v1' && data.action === 'retire' &&
      data.token === token && data.versionId === versionId && data.attemptEpoch === attemptEpoch;
  }
  function sendRetireError(message) {
    if (!embedded || retired) return;
    window.parent.postMessage({ schema: 'dva-gallery-startup/v1', action: 'retire-error',
      packageSchema: PACKAGE_SCHEMA, packageManifestSha256, packageSealSha256, token, versionId,
      attemptEpoch, sequence: ++sequence, error: { code: 'RETIRE_UNSETTLED',
        message: String(message || 'GPU retirement did not settle').slice(0, 1000) },
      lifecycle: { packageSchema: PACKAGE_SCHEMA, packageManifestSha256, packageSealSha256,
        disposeSettled: false, teardown: 'unknown' } }, origin);
  }
  function disposeOwnedAudio(errors) {
    audioEpoch++;
    const ownedPlayer = cuePlayer, ownedContext = audioContext;
    cuePlayer = null; audioContext = null; master = null;
    try { ownedPlayer?.stopAll(); }
    catch (error) { errors.push(`audio voice stop: ${error?.message || error}`); }
    if (!ownedContext) return Promise.resolve();
    try {
      return Promise.resolve(ownedContext.close()).catch(error => {
        errors.push(`audio context close: ${error?.message || error}`);
      });
    } catch (error) {
      errors.push(`audio context close: ${error?.message || error}`);
      return Promise.resolve();
    }
  }
  async function retire() {
    if (retiring || retired) return;
    retiring = true;
    cancelAnimationFrame(raf);
    const errors = [];
    const audioCleanup = disposeOwnedAudio(errors);
    const teardownDeadline = performance.now() + RETIRE_LOSS_DEADLINE_MS;
    const remainingTeardownMs = () => Math.max(0, teardownDeadline - performance.now());
    try {
      const frameSettled = await timeout(activeFramePromise.then(() => true, error => {
        errors.push(`frame completion: ${error?.message || error}`); return true;
      }), remainingTeardownMs());
      if (frameSettled === null) errors.push('in-flight frame completion deadline expired');
      let drained = false;
      try {
        const drain = device?.queue?.onSubmittedWorkDone?.();
        if (!drain || typeof drain.then !== 'function') throw new Error('GPU queue drain API unavailable');
        drained = (await timeout(drain.then(() => true), remainingTeardownMs())) === true;
        if (!drained) errors.push('GPU queue drain deadline expired');
      } catch (error) { errors.push(`GPU queue drain: ${error?.message || error}`); }
      try { effectPass?.destroy(); } catch (error) { errors.push(`effect disposal: ${error?.message || error}`); }
      effectPass = null;
      try {
        if (renderer) { renderer.destroy(); destroyCalled = true; }
      } catch (error) { errors.push(`frame owner disposal: ${error?.message || error}`); }
      if (device && !destroyCalled) {
        try { device.destroy(); } catch (error) { errors.push(`device destroy: ${error?.message || error}`); }
      }
      const loss = rawDevice ? await timeout(deviceLostOutcome(rawDevice), remainingTeardownMs()) : null;
      if (!loss?.settled || !destroyCalled || loss.reason !== 'destroyed')
        errors.push(loss ? `device loss did not settle as destroyed: ${loss.reason || loss.message}` :
          `device loss did not settle within ${RETIRE_LOSS_DEADLINE_MS} ms`);
      const audioSettled = await timeout(audioCleanup.then(() => true), remainingTeardownMs());
      if (audioSettled !== true) errors.push('audio context close deadline expired');
      if (errors.length) throw new Error(errors.join('; '));
      retired = true;
      window.parent.postMessage({ schema: 'dva-gallery-startup/v1', action: 'retired',
        packageSchema: PACKAGE_SCHEMA, packageManifestSha256, packageSealSha256, token, versionId,
        attemptEpoch, sequence: ++sequence,
        lifecycle: { packageSchema: PACKAGE_SCHEMA, packageManifestSha256, packageSealSha256,
          disposeSettled: true, teardown: 'disposed', deviceLifecycle: 'destroyed-loss-settled',
          device: { status: 'destroyed-loss-settled', drained: true, destroyCalled: true, lostReason: 'destroyed' } }
      }, origin);
    } catch (error) { sendRetireError(error?.message || error); }
  }
  window.addEventListener('message', event => { if (validRetireRequest(event)) void retire(); });

  function currentType() {
    return ({ load: 'action-special-ammo-load', shot: 'action-special-ammo-shot',
      impact: 'action-special-ammo-impact' })[kindSelect.value];
  }
  function selectedVariant() { return `${ammoSelect.value}:${weaponSelect.value}`; }
  function sizeCanvas() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(2, Math.max(1, devicePixelRatio || 1));
    const width = Math.max(1, Math.floor(rect.width * dpr)), height = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height;
      return true;
    }
    return false;
  }
  function planFor(now) {
    const width = canvas.width, height = canvas.height;
    const effectiveNow = Math.max(now, previewEpoch);
    const elapsed = effectiveNow - previewEpoch;
    const cycle = Math.floor(elapsed / PREVIEW_CYCLE_MS);
    const age = PREVIEW_MIN_AGE_MS + (elapsed % PREVIEW_CYCLE_MS);
    const startedAt = effectiveNow - age;
    return window.DvaWebGPUSpecialAmmoEffect.plan({
      effect: { id: `special-ammo-preview-${previewGeneration}-${cycle}`, type: currentType(), variant: selectedVariant(),
        x: 490, y: 322, targetX: 715, targetY: 285, startedAt, duration: PREVIEW_DURATION_MS },
      now: effectiveNow, phase: 'playing', camera: { x: 0, y: 0 }, zoom: 1,
      viewport: { kind: 'main', width: 980, height: 620, pixelWidth: width, pixelHeight: height },
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
    });
  }
  function submitFrame(now, firstFrame = false) {
    if (retiring || renderer?.state !== 'ready') return;
    sizeCanvas();
    const viewport = { kind: 'main', width: 980, height: 620,
      pixelWidth: canvas.width, pixelHeight: canvas.height };
    const planned = planFor(now);
    if (!planned) throw new Error('Special ammo producer did not produce the selected active plan');
    targetHandle?.resize(canvas.width, canvas.height);
    const frame = renderer.beginFrame('Special ammo host frame');
    const passCount = { value: 0 };
    const countedEncoder = encoder => new Proxy(encoder, { get(target, key) {
      const value = Reflect.get(target, key, target);
      if (key === 'beginRenderPass') return (...args) => { passCount.value++; return Reflect.apply(value, target, args); };
      return typeof value === 'function' ? value.bind(target) : value;
    } });
    const compatibleFrame = { stage() {},
      add(command) { return frame.add({ ...command, encode(pass, info) { passCount.value++; return command.encode(pass, info); } }); },
      addEncoder(command) { return frame.addEncoder({ ...command, encode(encoder, info) { return command.encode(countedEncoder(encoder), info); } }); } };
    compatibleFrame.add({ target: 'main', label: 'Special ammo frame clear', clear: { r: .035, g: .055, b: .07, a: 1 }, encode() {} });
    effectPass.record({ frame: compatibleFrame, target: 'main', viewport, planned });
    let completed;
    const proofPromise = new Promise((resolve, reject) => {
      compatibleFrame.addEncoder({ reads: [], writes: ['main'], label: 'Special ammo submitted-frame receipt',
        encode(encoder, info) {
          const pass = encoder.beginRenderPass({ label: 'Special ammo receipt pass', colorAttachments: [{
            view: info.view('main'), loadOp: 'load', storeOp: 'store'
          }] });
          pass.end();
        },
        onSubmitted(proof) {
          Promise.all([proof.validation, proof.done]).then(([validation]) => {
            if (validation) throw validation;
            completed = Object.freeze({ recorded: true, submitted: true, completed: true,
              canvasConnected: canvas.isConnected === true, passes: passCount.value,
              viewportWidth: canvas.width, viewportHeight: canvas.height });
            resolve(completed);
          }).catch(reject);
        },
        onProofError(receipt) { reject(receipt.error || new Error('WebGPU submission proof failed')); }
      });
    });
    frame.submit();
    activeFramePromise = proofPromise;
    if (firstFrame) return proofPromise;
    void proofPromise.catch(error => fail('playing', error));
    return proofPromise;
  }
  async function initialize() {
    if (initStarted || retiring) return;
    initStarted = true;
    if (!validIdentity) throw new Error('Gallery startup identity is missing or invalid');
    if (!navigator.gpu) throw new Error('WebGPU unavailable');
    send('adapter', 'pending');
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('WebGPU adapter unavailable');
    send('adapter', 'ready');
    send('device', 'pending');
    const proxy = trackedDevice(await adapter.requestDevice());
    device = proxy;
    send('device', 'ready');
    send('assets', 'pending');
    const format = navigator.gpu.getPreferredCanvasFormat();
    renderer = await window.DvaWebGPUFrameCore.create({ format,
      gpu: { requestAdapter: async () => ({ requestDevice: async () => rawDevice }), getPreferredCanvasFormat: () => format } });
    sizeCanvas();
    targetHandle = renderer.registerTarget('main', canvas, { width: canvas.width, height: canvas.height, format });
    send('assets', 'ready');
    send('pipelines', 'pending');
    effectPass = window.DvaWebGPUSpecialAmmoEffect.create({ frameOwner: renderer });
    send('pipelines', 'ready');
    send('first-frame', 'pending');
    restartPreview(performance.now());
    const proof = await submitFrame(performance.now(), true);
    if (proof?.recorded !== true || proof.submitted !== true || proof.completed !== true ||
        proof.canvasConnected !== true || proof.passes < 1 || proof.viewportWidth < 1 || proof.viewportHeight < 1)
      throw new Error('Actual GPU first-frame completion proof was incomplete');
    send('first-frame', 'ready');
    send('playing', 'pending');
    send('playing', 'ready', { firstFrame: proof });
    setStatus('WebGPU描画開始 · audioはユーザー操作で有効化');
    const loop = now => {
      if (retiring || renderer?.state !== 'ready') return;
      try { void submitFrame(now, false); }
      catch (error) { fail('playing', error); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  function activateSound() {
    if (retiring || retired) return;
    if (verifyMode) { setStatus('verifyモードでは音声は常に無音です'); return; }
    if (!window.AudioContext && !window.webkitAudioContext) { setStatus('AudioContext unavailable'); return; }
    try {
      if (!audioContext) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        audioContext = new Audio(); master = audioContext.createGain(); master.gain.value = .3;
        master.connect(audioContext.destination);
        cuePlayer = window.DvaWebGPUECuePlayer.createPlayer({ getContext: () => audioContext,
          getMaster: () => master });
      }
      const ownedContext = audioContext, ownedPlayer = cuePlayer, epoch = ++audioEpoch;
      const current = () => !retiring && !retired && audioEpoch === epoch &&
        audioContext === ownedContext && cuePlayer === ownedPlayer;
      const resumed = ownedContext.state === 'running' ? Promise.resolve() : ownedContext.resume();
      void resumed.then(() => {
        if (!current()) return;
        const now = performance.now(), roomId = 'special-ammo-preview', roomGeneration = 1;
        const event = { eventId: `special-ammo-sfx-${++effectId}`, type: currentType(),
          variant: selectedVariant(), roomId, roomGeneration, eventAtMs: now, nowMs: now };
        const cue = window.DvaWebGPUCombatESfx.createLedger().admit(event, { audible: true,
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
        if (cue && current()) ownedPlayer.play(cue, { nowMs: now, volume: 1 });
      }).catch(error => { if (current()) setStatus(error?.message || 'AudioContext resume failed'); });
    } catch (error) { setStatus(error?.message || 'Audio unavailable'); }
  }
  soundButton.addEventListener('click', activateSound);
  for (const select of [kindSelect, ammoSelect, weaponSelect])
    select.addEventListener('change', () => restartPreview(performance.now()));
  if (verifyMode) { soundButton.disabled = true; soundButton.textContent = 'verify: 無音'; }
  initialize().catch(error => fail(renderer ? 'pipelines' : device ? 'device' : 'adapter', error));
})();



