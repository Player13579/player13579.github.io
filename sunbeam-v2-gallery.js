import { create, plan, testInput } from './webgpu-sunbeam-pro-v2.mjs';
import { applyPreviewActorClock, previewActorAge } from './sunbeam-v2-gallery-clock.mjs';

(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const verification = params.has('verify');
  const canvas = document.getElementById('stage');
  const errorBox = document.getElementById('error');
  const state = { gpu: null, effect: null, frame: 0, raf: 0, dead: false,
    origin: 0, audioContext: null, consumedIds: new Set(), snapshot: { ready: false } };
  window.__sunbeamV2Preview = () => state.snapshot;

  function showError(error) {
    state.snapshot = { ...state.snapshot, ready: false, error: String(error?.stack || error) };
    errorBox.textContent = `WebGPU: ${error?.message || error}`;
    errorBox.hidden = false;
    state.dead = true;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.effect?.sfx?.stopAll();
  }

  function sizeCanvas() {
    const dpr = Math.min(2, Math.max(1, devicePixelRatio || 1));
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return { width, height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight, dpr };
  }

  function phaseAt(now) {
    // 1.2 seconds of actor time per loop at fixed ACC2 preview speed.
    return previewActorAge(now, state.origin);
  }

  function audioConfig() {
    if (verification) return undefined;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return undefined;
    state.audioContext = new Audio();
    const gates = {
      owner: () => true,
      room: () => true,
      verify: () => true,
      unlock: () => state.audioContext?.state === 'running'
    };
    return { context: state.audioContext, gates, consumedIds: state.consumedIds, volume: 0.8 };
  }

  async function unlockAudio() {
    if (verification || !state.audioContext || state.audioContext.state === 'running') return;
    await state.audioContext.resume();
    state.effect?.sfx?.refreshGates();
  }

  function makeInput(now, viewport, age) {
    const input = applyPreviewActorClock(testInput(age, true), age);
    const loopIndex = Math.max(0, Math.floor((now - state.origin) * 2 / 1200));
    input.eventId = `sunbeam-gallery-v2:${loopIndex}`;
    input.viewport = { widthCss: viewport.cssWidth, heightCss: viewport.cssHeight, dpr: viewport.dpr };
    input.camera = { zoom: 1.65, cssPxPerWorld: 1 };
    input.rays = (input.twoPalms ? [280, 314] : [297]).map(y => ({
      palmCss: [viewport.cssWidth * 110 / 980, viewport.cssHeight * y / 620],
      endCss: [viewport.cssWidth * 852.5 / 980, viewport.cssHeight * y / 620],
      directionCss: [1, 0]
    }));
    return input;
  }

  function draw(now) {
    if (state.dead || document.hidden) return;
    try {
      const viewport = sizeCanvas();
      const age = phaseAt(now);
      const input = makeInput(now, viewport, age);
      const planned = plan(input);
      const texture = state.gpu.context.getCurrentTexture();
      const view = texture.createView();
      const encoder = state.gpu.device.createCommandEncoder({ label: `sunbeam-preview-frame-${++state.frame}` });
      state.gpu.device.pushErrorScope('validation');
      const background = encoder.beginRenderPass({
        label: 'sunbeam-preview-world-clear',
        colorAttachments: [{ view, clearValue: { r: 0.018, g: 0.030, b: 0.041, a: 1 }, loadOp: 'clear', storeOp: 'store' }]
      });
      background.end();
      const frame = { id: state.frame, encoder, colorView: view, width: viewport.width,
        height: viewport.height, sampledAtMs: now };
      const receipt = state.effect.record(frame, [planned]);
      const commandBuffer = encoder.finish();
      state.gpu.device.queue.submit([commandBuffer]);
      const validation = state.gpu.device.popErrorScope();
      const done = state.gpu.device.queue.onSubmittedWorkDone();
      void state.effect.driver.submitted(receipt, { frameId: frame.id, encoder, validation, done })
        .then(() => { if (!verification) state.effect.sfx?.accept(receipt); })
        .catch(showError);
      state.snapshot = { ready: true, frame: state.frame, ageMs: age, actorRate: 2,
        loopIndex: Math.max(0, Math.floor((now - state.origin) * 2 / 1200)),
        viewport: { width: viewport.width, height: viewport.height, dpr: viewport.dpr },
        source: 'sunbeam-e-v2', verificationMuted: verification };
      state.raf = requestAnimationFrame(draw);
    } catch (error) {
      showError(error);
    }
  }

  async function start() {
    if (!navigator.gpu) throw new Error('このブラウザーでは WebGPU を利用できません。');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('WebGPU アダプターを取得できませんでした。');
    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    if (!context) throw new Error('WebGPU canvas context を取得できませんでした。');
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });
    state.gpu = { device, context, format };
    state.effect = await create({ device, format, audio: audioConfig() });
    state.origin = performance.now();
    state.gpu.device.lost.then(info => {
      if (!state.dead) showError(new Error(`GPU device lost: ${info.message || info.reason}`));
    });
    window.addEventListener('resize', () => { if (!state.dead) sizeCanvas(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (state.raf) cancelAnimationFrame(state.raf);
        state.raf = 0;
        state.effect?.sfx?.stopAll();
      } else if (!state.dead && !state.raf) state.raf = requestAnimationFrame(draw);
    });
    canvas.addEventListener('pointerdown', () => { void unlockAudio().catch(showError); });
    window.addEventListener('pagehide', cleanup, { once: true });
    window.addEventListener('beforeunload', cleanup, { once: true });
    draw(performance.now());
  }

  function cleanup() {
    if (state.dead) return;
    state.dead = true;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.effect?.sfx?.stopAll();
    void state.effect?.destroy();
    if (state.audioContext && state.audioContext.state !== 'closed') void state.audioContext.close();
    state.gpu?.context?.unconfigure?.();
  }

  void start().catch(showError);
})();
