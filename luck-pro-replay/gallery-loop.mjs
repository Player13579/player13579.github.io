/** Gallery-only continuous WebGPU replay for the original Pro Luck modules. */
export async function mountLuckLoop({ module, label }) {
  const canvas = document.querySelector('canvas');
  const fail = (error) => {
    document.documentElement.dataset.status = 'error';
    // Keep successful embeds entirely effect-only; this node is visible only on failure.
    const node = document.querySelector('[data-error]');
    node.textContent = `${label}: ${error?.message ?? error}`;
    node.hidden = false;
  };
  try {
    if (!navigator.gpu) throw new Error('WebGPU unavailable');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No WebGPU adapter');
    const device = await adapter.requestDevice();
    const errors = [];
    device.addEventListener('uncapturederror', (event) => errors.push(event.error));
    device.lost.then((info) => errors.push(new Error(`Device lost: ${info.message || info.reason}`)));

    const format = navigator.gpu.getPreferredCanvasFormat();
    const context = canvas.getContext('webgpu');
    if (!context) throw new Error('Could not create WebGPU canvas context');
    context.configure({ device, format, alphaMode: 'opaque' });
    const frameOwner = module.createFrameOwner({ device, onError: (error) => errors.push(error) });
    const effect = module.create({
      renderer: { device, format, outputTransfer: format.endsWith('-srgb') ? 'linear' : 'srgb' },
      frameOwner
    });
    await effect.ready;

    const width = canvas.width, height = canvas.height;
    const viewport = { x: 0, y: 0, width, height };
    const camera = { viewProjection: [0.9,0,0,0, 0,0.9,0,0, 0,0,1,0, 0,0,0.5,1] };
    const started = performance.now();
    let sequence = 0, busy = false, stopped = false;
    const render = async (now) => {
      if (stopped) return;
      if (!busy) {
        busy = true;
        try {
          const actorTime = Math.max(0, now - started);
          const sequenceNow = Math.floor(actorTime / 1780);
          if (sequenceNow !== sequence) sequence = sequenceNow;
          const age = actorTime - sequence * 1780;
          const input = {
            sessionId: `luck-gallery-${label}`, roomEpoch: 'luck-gallery-loop', viewport,
            dpr: 1, zoom: 1, camera, surfaceVisible: true, reducedMotion: false,
            actors: [{ id: 'luck-gallery-actor', position: [0,0,0], body: {
              right: [1,0,0], up: [0,1,0], halfWidth: 0.055, halfHeight: 0.10
            }, display: { visible: true, opacity: 1 } }],
            events: [{ id: `luck-gallery-event-${sequence}`, type: 'benefit-acquired',
              playerId: 'luck-gallery-actor', effectKind: 'luckBoost', variant: 'donation-rational',
              durationMs: 1680, elapsedActorMs: Math.min(age, 1680), actorRate: 1 }]
          };
          const planned = module.plan(input);
          const frame = { id: `luck-gallery-frame-${Math.floor(now)}`, encoder: device.createCommandEncoder() };
          const target = context.getCurrentTexture(), view = target.createView();
          const pass = frame.encoder.beginRenderPass({ colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0.025, g: 0.035, b: 0.04, a: 1 } }] });
          pass.end();
          effect.record({ frame, target: { view, width, height, sampleCount: 1 }, viewport: planned.viewport, planned });
          device.queue.submit([frame.encoder.finish()]);
          await frameOwner.submitted(frame, { sessionId: planned.sessionId, roomEpoch: planned.roomEpoch, surfaceVisible: true });
          if (errors.length) throw errors[0];
        } catch (error) {
          stopped = true;
          fail(error);
          try { effect.destroy(); } catch { /* preserve initial render error */ }
        } finally { busy = false; }
      }
      if (!stopped) requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
    window.addEventListener('pagehide', () => { stopped = true; effect.destroy(); }, { once: true });
    document.documentElement.dataset.status = 'playing';
  } catch (error) { fail(error); }
}
