/* Standalone gallery host. No game renderer, state, entrypoint, or audio context. */
(function () {
  'use strict';
  const A = window.DvaPublicGunnerPreviewAdapter;
  const effect = 'gunner', version = document.body.dataset.version;
  const api = window.DvaWebGPUGunnerShotE;
  const options = A.options(location.search), duration = 1200;
  const $ = id => document.getElementById(id);
  const canvas = $('preview'), status = $('status'), playButton = $('play'), timeControl = $('time');
  const state = { effect, version, status: 'initializing', ready: false, playing: false,
    disposed: false, elapsedMs: Math.min(options.elapsedMs, duration + 600),
    variant: options.variant, reducedMotion: options.reducedMotion, hardMuted: true,
    verify: options.verify, audioContextsCreated: 0, frames: 0, draws: 0,
    width: A.WIDTH, height: A.HEIGHT, errors: [], plan: null,
    technicalReplayCertification: 'not-run', qualityAcceptance: 'unreviewed' };
  let device, context, owner, effectPass, stageBuffer, stagePipeline, stageBind;
  let animation = 0, epoch = 0, busy = false, pending = false, resourcesReleased = false, renderPromise = Promise.resolve();
  // A deliberately neutral H64 fixture anchor. It is not an authored game actor.
  const stageShader = `
struct U { size:vec2f, anchor:vec2f, target:vec2f, mode:f32, pad:f32 };
@group(0) @binding(0) var<uniform> u:U;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.)); return vec4f(q[i],0.,1.);
}
fn box(q:vec2f,b:vec2f)->f32 { return max(abs(q.x)-b.x,abs(q.y)-b.y); }
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f {
 let at=p.xy; let grid=min(abs(fract(at.x/32.)-.5),abs(fract(at.y/32.)-.5));
 var c=mix(vec3f(.027,.045,.079),vec3f(.048,.075,.116),1.-smoothstep(.0,.022,grid));
 let q=at-u.anchor; let body=box(q-vec2f(0.,-27.),vec2f(11.,19.));
 let head=length(q-vec2f(0.,-54.))-10.;
 let legs=min(box(q-vec2f(-6.,-4.),vec2f(4.,4.)),box(q-vec2f(6.,-4.),vec2f(4.,4.)));
 let silhouette=min(min(body,head),legs); c=mix(c,vec3f(.20,.26,.34),1.-smoothstep(-.6,.6,silhouette));
 let ring=abs(length(at-u.target)-12.);
 let cross=min(box(at-u.target,vec2f(17.,.6)),box(at-u.target,vec2f(.6,17.)));
 let marker=(1.-smoothstep(.0,1.,min(ring,cross)))*u.mode;
 c=mix(c,vec3f(.34,.40,.49),marker*.65); return vec4f(c,1.);
}`;
  function snapshot() { return JSON.parse(JSON.stringify(state)); }
  function controls() {
    playButton.textContent = state.playing ? 'Pause' : 'Play';
    timeControl.value = String(Math.round(state.elapsedMs));
    $('time-label').textContent = `${Math.round(state.elapsedMs)} ms`;
  }
  function pause() {
    state.playing = false;
    if (animation) cancelAnimationFrame(animation);
    animation = 0; controls();
    if (state.ready) showStatus();
  }
  function showStatus() {
    const result = state.draws ? 'production effect draw submitted' : 'no live effect at this time';
    state.status = state.playing ? 'playing' : 'paused';
    status.textContent = `${state.playing ? 'Playing' : 'Paused'} · ${result} · ${state.frames} completed GPU submissions · muted\nNeutral H64 fixture anchor; no game actor or integration validation`;
  }
  function fail(error) {
    if (state.disposed) return;
    pause(); state.ready = false; state.status = 'error';
    const message = String(error?.message || error);
    state.errors.push(message); document.body.dataset.failed = 'true';
    status.textContent = `WebGPU unavailable or rejected this source: ${message}`;
    playButton.disabled = $('restart').disabled = timeControl.disabled = true;
    releaseResources();
  }
  function releaseResources() {
    if (resourcesReleased) return;
    resourcesReleased = true;
    effectPass?.destroy(); owner?.dispose(); context?.unconfigure(); device?.destroy();
  }
  function dispose() {
    if (state.disposed) return;
    pause(); state.disposed = true; state.ready = false; state.status = 'disposed';
    // The effect releases its own uniforms; the owner releases the stage buffer.
    releaseResources();
    playButton.disabled = $('restart').disabled = timeControl.disabled = true;
    status.textContent = 'Preview disposed';
  }
  async function checkShader(code, label) {
    const module = device.createShaderModule({ code, label });
    if (module.getCompilationInfo) {
      const info = await module.getCompilationInfo();
      const errors = info.messages.filter(item => item.type === 'error');
      if (errors.length) throw new Error(errors.map(item => `${label}:${item.lineNum || '?'} ${item.message}`).join('\n'));
    }
    return module;
  }
  async function renderOnce() {
    const input = A.fixture({ elapsedMs: state.elapsedMs, variant: state.variant,
      reducedMotion: state.reducedMotion, pixelWidth: canvas.width, pixelHeight: canvas.height });
    const frame = A.createFrame();
    device.pushErrorScope('validation');
    let result, caught;
    try {
      result = A.record(api, effectPass, input, frame);
      const target = [input.effect.targetX, input.effect.targetY];
      device.queue.writeBuffer(stageBuffer, 0, new Float32Array([
        canvas.width, canvas.height, input.anchor.x, input.anchor.y, ...target, 1, 0]));
      const encoder = device.createCommandEncoder({ label: 'Gallery repair preview only' });
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(),
        clearValue: { r: .027, g: .045, b: .079, a: 1 }, loadOp: 'clear', storeOp: 'store' }] });
      pass.setPipeline(stagePipeline); pass.setBindGroup(0, stageBind); pass.draw(3);
      frame.encode(pass, { device, format: owner.format, width: canvas.width, height: canvas.height });
      pass.end(); device.queue.submit([encoder.finish()]);
      await device.queue.onSubmittedWorkDone();
    } catch (error) { caught = error; }
    const validation = await device.popErrorScope();
    if (caught) throw caught;
    if (validation) throw new Error(validation.message);
    // An asynchronous GPU error may release the device while submission is pending.
    if (state.disposed || !state.ready || resourcesReleased) return;
    state.frames++; state.draws = result.drawn;
    state.plan = result.plan ? { progress: result.plan.progress,
      source: result.plan.source || null, target: result.plan.target || null } : null;
    controls(); showStatus();
  }
  function requestRender() {
    if (!state.ready || state.disposed || resourcesReleased) return Promise.resolve(snapshot());
    pending = true;
    if (busy) return renderPromise;
    busy = true;
    renderPromise = (async () => {
      try {
        while (pending && state.ready && !state.disposed && !resourcesReleased) { pending = false; await renderOnce(); }
      } catch (error) { fail(error); }
      finally { busy = false; }
      return snapshot();
    })();
    return renderPromise;
  }
  async function tick(now) {
    animation = 0;
    if (!state.playing || !state.ready || state.disposed || resourcesReleased) return;
    state.elapsedMs = (now - epoch) % (duration + 600);
    await requestRender();
    if (state.playing && state.ready && !state.disposed && !resourcesReleased) animation = requestAnimationFrame(tick);
  }
  function play() {
    if (!state.ready || state.disposed || resourcesReleased || state.playing) return;
    state.playing = true; epoch = performance.now() - state.elapsedMs;
    controls(); showStatus(); animation = requestAnimationFrame(tick);
  }
  function seek(ms) {
    if (!Number.isFinite(ms) || ms < 0) return Promise.reject(new TypeError('Time must be finite and nonnegative'));
    pause(); state.elapsedMs = Math.min(ms, duration + 600); controls(); return requestRender();
  }
  async function initialize() {
    try {
      if (!navigator.gpu) throw new Error('This browser does not expose navigator.gpu');
      const adapter = await navigator.gpu.requestAdapter();
      if (state.disposed || resourcesReleased) return snapshot();
      if (!adapter) throw new Error('No WebGPU adapter is available');
      device = await adapter.requestDevice();
      if (state.disposed || resourcesReleased) { device.destroy(); return snapshot(); }
      device.addEventListener('uncapturederror', event => fail(event.error));
      device.lost.then(info => { if (!state.disposed && !resourcesReleased) fail(new Error(`Device lost: ${info.message || info.reason}`)); });
      context = canvas.getContext('webgpu');
      if (!context) throw new Error('A WebGPU canvas context could not be created');
      const format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode: 'opaque' });
      owner = A.createOwner(device, format);
      // Compile the immutable production shader before constructing the real pass.
      await checkShader(api.shader, `${effect}-${version} production`);
      if (state.disposed || resourcesReleased) return snapshot();
      const module = await checkShader(stageShader, 'Neutral gallery fixture');
      if (state.disposed || resourcesReleased) return snapshot();
      device.pushErrorScope('validation');
      let caught;
      try {
        stagePipeline = device.createRenderPipeline({ layout: 'auto',
          vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{ format }] },
          primitive: { topology: 'triangle-list' } });
        stageBuffer = owner.own(device.createBuffer({ label: 'Gallery fixture uniform', size: 32, usage: 0x40 | 0x08 }));
        stageBind = device.createBindGroup({ layout: stagePipeline.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: { buffer: stageBuffer } }] });
        effectPass = api.create({ frameOwner: owner });
      } catch (error) { caught = error; }
      const validation = await device.popErrorScope();
      if (state.disposed || resourcesReleased) return snapshot();
      if (caught) throw caught;
      if (validation) throw new Error(validation.message);
      state.ready = true;
      playButton.disabled = $('restart').disabled = timeControl.disabled = false;
      await requestRender();
      if (options.autoplay) play();
    } catch (error) { fail(error); }
    return snapshot();
  }
  timeControl.max = String(duration + 600);
  $('variant').value = state.variant; $('reduced').checked = state.reducedMotion;
  playButton.addEventListener('click', () => state.playing ? pause() : play());
  $('restart').addEventListener('click', async () => { await seek(0); play(); });
  timeControl.addEventListener('input', () => { void seek(Number(timeControl.value)); });
  $('variant').addEventListener('change', () => { state.variant = $('variant').value; void requestRender(); });
  $('reduced').addEventListener('change', () => { state.reducedMotion = $('reduced').checked; void requestRender(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('pagehide', dispose, { once: true });
  controls();
  const ready = initialize();
  window.__webgpuEPreview = Object.freeze({ ready, snapshot, seek, play, pause, dispose,
    setReducedMotion(value) { state.reducedMotion = Boolean(value); $('reduced').checked = state.reducedMotion; return requestRender(); } });
})();
