(async function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const verify = params.has('verify');
  if (params.has('embed')) document.body.classList.add('embed');
  const canvas = document.getElementById('heal');
  const status = document.getElementById('status');
  const WIDTH = 980, HEIGHT = 620, DURATION = 12000;
  const GAMEPLAY_ZOOM = 1.65;
  // Flora's ordinary acceleration is 2.5 * 0.72. Keep the 12-second buff
  // on wall time while the restoration cast runs on the owner's visual time.
  const FLORA_ACTOR_TIME_SCALE = 1.8;
  // Current blue-dress/front idle entry in AUTHORED_CHARACTER_MOTION_MANIFEST.
  // Keep its complete cell and registration, including the game's body scale.
  const AVATAR_PATH = 'assets/generated/sophia-front-five-v753.png';
  const AVATAR_CROP = Object.freeze([0, 0, 256, 256]);
  const AVATAR_SOURCE_SIZE = Object.freeze([768, 512]);
  const AVATAR_LAYOUT_SCALE = 0.4375 * 0.72;
  const AVATAR_SOURCE_ORIGIN = Object.freeze({ x: 128, y: 240 });
  const AVATAR_GROUND = Object.freeze({ x: 0, y: 31 });
  const player = Object.freeze({ id: 'heal-preview-caster', x: WIDTH / 2, y: HEIGHT / 2 + 28 });
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const fixedPhase = verify && params.has('phase')
    ? Math.max(0, Math.min(DURATION - 1, Number(params.get('phase')) * 1000)) : null;
  const requestedZoom = Number(params.get('zoom'));
  const zoom = (params.has('embed') || (verify && fixedPhase !== null)) && params.has('zoom') &&
    Number.isFinite(requestedZoom) && requestedZoom >= 0.5 && requestedZoom <= 3
    ? requestedZoom : GAMEPLAY_ZOOM;
  const reducedMotion = params.get('reduced') === '1';
  const previewId = globalThis.crypto?.randomUUID?.() || String(Date.now());
  let renderer, targetHandle, healPass, avatarTexture, audioContext, audioPlayer;
  let audioEnabled = false, soundIndex = 0;
  let phaseMs = fixedPhase ?? 0, phaseOriginMs = 0, rafId = 0, frameId = 0;
  function render() {
    const viewport = { kind: 'main', width: WIDTH, height: HEIGHT,
      pixelWidth: targetHandle.width, pixelHeight: targetHandle.height };
    const effect = { id: `heal-preview:${previewId}`, type: 'flora', playerId: player.id,
      startedAt: 0, duration: DURATION };
    const visualElapsedMs = phaseMs * FLORA_ACTOR_TIME_SCALE;
    const camera = { x: player.x - WIDTH / (2 * zoom),
      y: player.y - 28 - HEIGHT / (2 * zoom) };
    const planned = window.DvaWebGPUHealE.plan({ effect, player, now: phaseMs,
      camera, zoom, viewport, reducedMotion,
      visualElapsedMs,
      accelerationUntil: DURATION });
    const frame = renderer.beginFrame(`Heal preview ${++frameId}`);
    try {
      frame.clear('heal-preview', [0.028, 0.072, 0.095, 1]);
      const avatarRect = {
        x: (player.x - camera.x + AVATAR_GROUND.x -
          AVATAR_SOURCE_ORIGIN.x * AVATAR_LAYOUT_SCALE) * zoom,
        y: (player.y - camera.y + AVATAR_GROUND.y -
          AVATAR_SOURCE_ORIGIN.y * AVATAR_LAYOUT_SCALE) * zoom,
        w: AVATAR_CROP[2] * AVATAR_LAYOUT_SCALE * zoom,
        h: AVATAR_CROP[3] * AVATAR_LAYOUT_SCALE * zoom
      };
      frame.sprite('heal-preview', { ...avatarRect, texture: avatarTexture,
        crop: AVATAR_CROP, sourceSize: AVATAR_SOURCE_SIZE,
        color: [1, 1, 1, 1], mode: 'source-over' });
      const outcome = healPass.record({ frame, target: 'heal-preview', viewport, planned });
      frame.submit();
      window.__healPreviewSnapshot = Object.freeze({ ready: true, frameId,
        phaseMs, visualElapsedMs, actorTimeScale: FLORA_ACTOR_TIME_SCALE, zoom,
        drawn: outcome.drawn, effectId: planned?.effectId || '',
        accelerationActive: Boolean(planned?.accelerationActive),
        avatarRect, avatarCrop: AVATAR_CROP, verify });
      status.textContent = '';
    } catch (error) {
      try { frame.discard(); } catch (_) {}
      throw error;
    }
  }
  function tick(now) {
    rafId = 0;
    const previousPhase = phaseMs;
    // Derive wall phase from one origin so slow or background frames do not
    // stretch the authoritative 12-second acceleration window.
    phaseMs = Math.max(0, now - phaseOriginMs) % DURATION;
    render();
    if (audioEnabled && phaseMs < previousPhase) void playPreviewSound();
    rafId = requestAnimationFrame(tick);
  }
  async function playPreviewSound() {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor || !window.DvaHealESfx) throw new Error('Heal audio unavailable');
      if (!audioContext) {
        audioContext = new AudioContextCtor();
        const master = audioContext.createGain();
        master.gain.value = 0.58;
        master.connect(audioContext.destination);
        audioPlayer = window.DvaHealESfx.createPlayer({
          getAudioContext: () => audioContext, getMasterGain: () => master,
          nowMs: () => performance.now() });
      }
      if (audioContext.state === 'suspended') await audioContext.resume();
      const nowMs = performance.now();
      const event = { kind: 'self-restoration', self: true,
        eventId: `heal-preview-sound:${previewId}:${++soundIndex}`, roomId: 'heal-preview',
        roomGeneration: 0, eventAtMs: Math.max(0, nowMs - phaseMs) };
      // Use the same wall/actor clocks as the previewed effect. A gesture late
      // in the cast hears only remaining cue phases, never the skipped onset.
      const cue = audioPlayer.play(event, { nowMs, verify, volume: 0.58,
        actorTimeScale: FLORA_ACTOR_TIME_SCALE,
        visualElapsedMs: phaseMs * FLORA_ACTOR_TIME_SCALE });
      window.__healPreviewAudio = Object.freeze({ status: cue ? 'scheduled' : 'suppressed',
        verify, cue: cue?.sourceEventId || '' });
    } catch (error) {
      window.__healPreviewAudio = Object.freeze({ status: 'error', error: String(error) });
    }
  }
  try {
    if (!window.DvaWebGPURenderer?.create || !window.DvaWebGPUHealE?.create)
      throw new Error('Shared WebGPU renderer or Heal E unavailable');
    renderer = await window.DvaWebGPURenderer.create({ gpu: navigator.gpu });
    targetHandle = renderer.registerTarget('heal-preview', canvas,
      { width: Math.round(WIDTH * dpr), height: Math.round(HEIGHT * dpr),
        logicalWidth: WIDTH, logicalHeight: HEIGHT });
    const avatar = new Image();
    avatar.src = AVATAR_PATH;
    await avatar.decode();
    if (avatar.naturalWidth !== AVATAR_SOURCE_SIZE[0] ||
        avatar.naturalHeight !== AVATAR_SOURCE_SIZE[1])
      throw new Error('Blue actor sprite sheet dimensions changed');
    avatarTexture = renderer.own(renderer.device.createTexture({
      label: 'Heal preview authored blue-dress front idle', size: AVATAR_SOURCE_SIZE,
      format: 'rgba8unorm', usage: GPUTextureUsage.COPY_DST |
        GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT }));
    renderer.device.queue.copyExternalImageToTexture({ source: avatar },
      { texture: avatarTexture, premultipliedAlpha: true }, AVATAR_SOURCE_SIZE);
    healPass = window.DvaWebGPUHealE.create({ renderer, frameOwner: renderer });
    await healPass.ready;
    render();
    window.__healPreviewReady = true;
    if (fixedPhase === null) {
      phaseOriginMs = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  } catch (error) {
    try { healPass?.destroy(); } catch (_) {}
    try { targetHandle?.unregister(); } catch (_) {}
    try { renderer?.destroy(); } catch (_) {}
    window.__healPreviewReady = false;
    window.__healPreviewError = String(error?.stack || error);
    status.textContent = `WebGPU unavailable: ${String(error)}`;
  }
  canvas.addEventListener('pointerdown', () => {
    audioEnabled = true;
    void playPreviewSound();
  }, { once: true });
  window.addEventListener('beforeunload', () => {
    if (rafId) cancelAnimationFrame(rafId);
    healPass?.destroy(); renderer?.destroy();
    if (audioContext && audioContext.state !== 'closed') void audioContext.close();
  }, { once: true });
})();
