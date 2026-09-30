import { DESIGN, acceptBenefit } from './design.mjs';
import { scene, optics } from './shaders.mjs';
import { ClockAudio } from './audio.mjs';
import { support, scissors } from './projection.mjs';

const query = new URLSearchParams(location.search);
const verification = query.has('verify');
if (query.has('embed')) document.body.classList.add('embedded');
const audio = new ClockAudio(verification);
const hook = async value => audio.enable(typeof value === 'boolean' ? value : value?.enabled ?? value?.muted === false);
hook.activateFromGesture = async () => ({ enabled: await audio.enable(true) });
hook.setMuted = value => audio.enable(!value);
hook.snapshot = () => ({ audioGain: audio.enabled && !verification ? .62 : 0,
  audioState: audio.context?.state ?? 'not-created', verify: verification, enabled: audio.enabled });
globalThis.__gallerySfx = hook;

const canvas = document.querySelector('canvas');
const label = document.querySelector('output');
const faults = [];
let device, animation;

try {
  if (!navigator.gpu) throw Error('WebGPU未対応');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw Error('GPU adapterなし');
  device = await adapter.requestDevice();
  device.addEventListener('uncapturederror', event => faults.push(event.error.message));
  const surface = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  surface.configure({ device, format, alphaMode: 'opaque' });

  const modules = [device.createShaderModule({ code: scene }), device.createShaderModule({ code: optics })];
  for (const module of modules) {
    const info = await module.getCompilationInfo();
    const errors = info.messages.filter(message => message.type === 'error');
    if (errors.length) throw Error(errors.map(message => `${message.lineNum}:${message.message}`).join('\n'));
  }

  const parameters = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const layouts = [
    device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} }
    ] }),
    device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } }
    ] })
  ];
  const pipelineLayouts = layouts.map(layout => device.createPipelineLayout({ bindGroupLayouts: [layout] }));
  const pipelines = {};
  const blend = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
  for (const [name, vertex, fragment] of [
    ['background', 'triangle', 'backdrop'], ['rear', 'triangle', 'behind'],
    ['actor', 'character', 'person'], ['front', 'triangle', 'ahead']
  ]) {
    pipelines[name] = await device.createRenderPipelineAsync({ layout: pipelineLayouts[0],
      vertex: { module: modules[0], entryPoint: vertex },
      fragment: { module: modules[0], entryPoint: fragment, targets: [{ format: 'rgba16float', blend }, { format: 'rgba16float', blend }] },
      primitive: { topology: 'triangle-list' } });
  }
  for (const [name, fragment, target] of [
    ['horizontal', 'xBlur', 'rgba16float'], ['vertical', 'yBlur', 'rgba16float'], ['finish', 'present', format]
  ]) {
    pipelines[name] = await device.createRenderPipelineAsync({ layout: pipelineLayouts[1],
      vertex: { module: modules[1], entryPoint: 'triangle' },
      fragment: { module: modules[1], entryPoint: fragment, targets: [{ format: target }] },
      primitive: { topology: 'triangle-list' } });
  }

  const bitmap = await createImageBitmap(await (await fetch('./body.png')).blob());
  const characterTexture = device.createTexture({ size: [bitmap.width, bitmap.height], format: 'rgba8unorm',
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT });
  device.queue.copyExternalImageToTexture({ source: bitmap }, { texture: characterTexture }, [bitmap.width, bitmap.height]);
  bitmap.close();
  const sceneGroup = device.createBindGroup({ layout: layouts[0], entries: [
    { binding: 0, resource: { buffer: parameters } }, { binding: 1, resource: characterTexture.createView() },
    { binding: 2, resource: device.createSampler({ minFilter: 'linear', magFilter: 'linear' }) }
  ] });

  const controls = { emission: true, observations: true, sparkle: true, receiver: true,
    clock: true, connection: true, rear: true, front: true, bodyHeight: 64, dual: query.has('audit') };
  let textures = [], postGroups = {}, dimensions = '', paused = null;
  let epoch = performance.now(), lastCleanFrame = 0, cycle = -1, frame = 0;
  let phase = 'warmup';
  const cleanIntervals = [], captureIntervals = [], receipts = new Set();
  const fullScissor = (pass, width, height) => pass.setScissorRect(0, 0, width, height);
  const drawScissoredFullscreen = (pass, pipeline, rectangles) => {
    pass.setPipeline(pipeline);
    for (const [x, y, width, height] of rectangles) {
      pass.setScissorRect(x, y, width, height);
      pass.draw(3);
    }
  };
  const currentSettings = () => ({ width: canvas.width, height: canvas.height,
    bodyHeight: controls.bodyHeight, dpr: devicePixelRatio || 1, dual: controls.dual });
  const observationLive = elapsed => controls.observations && elapsed > 0 && elapsed < 2400;

  function resize() {
    const dpr = devicePixelRatio || 1;
    const width = Math.round(canvas.clientWidth * dpr), height = Math.round(canvas.clientHeight * dpr);
    const next = `${width}:${height}`;
    if (next === dimensions) return;
    dimensions = next;
    canvas.width = width;
    canvas.height = height;
    for (const texture of textures) texture.destroy();
    textures = Array.from({ length: 4 }, () => device.createTexture({ size: [width, height], format: 'rgba16float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING }));
    for (const [name, index] of [['horizontal', 1], ['vertical', 2], ['finish', 3]]) {
      postGroups[name] = device.createBindGroup({ layout: layouts[1], entries: [
        { binding: 0, resource: { buffer: parameters } },
        { binding: 1, resource: textures[index].createView() },
        { binding: 2, resource: textures[0].createView() }
      ] });
    }
  }

  function render(now) {
    resize();
    const elapsed = paused ?? ((now - epoch) % 3500);
    if (lastCleanFrame) {
      const interval = { ms: now - lastCleanFrame, paused: paused !== null, phase };
      const target = phase === 'clean' ? cleanIntervals : captureIntervals;
      target.push(interval);
      if (target.length > 2000) target.shift();
    }
    if (phase === 'clean') lastCleanFrame = now;
    else if (phase === 'capture') lastCleanFrame = now;
    if (paused === null) {
      cycle = Math.floor((now - epoch) / 3500);
      const receipt = { kind: 'remaining-wait-shortened', outcome: 'committed',
        causeId: `demonstration:${cycle}`, beneficiaryId: 'fixture-sophia', authoritativePositive: true };
      if (elapsed < 2400 && acceptBenefit(receipt, receipts)) audio.play(receipt.causeId);
    }

    const dpr = devicePixelRatio || 1;
    device.queue.writeBuffer(parameters, 0, new Float32Array([
      canvas.width, canvas.height, controls.bodyHeight * dpr, dpr, elapsed / 1000, 0, 0, 0,
      +controls.emission, +controls.observations, +controls.sparkle, +controls.receiver,
      +controls.clock, +controls.connection, 0, +controls.dual
    ]));

    const encoder = device.createCommandEncoder();
    const settings = currentSettings();
    const regions = support(settings.bodyHeight * settings.dpr / 64);
    const scenePass = encoder.beginRenderPass({ colorAttachments: textures.slice(0, 2).map(texture => ({
      view: texture.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 }
    })) });
    fullScissor(scenePass, canvas.width, canvas.height);
    scenePass.setBindGroup(0, sceneGroup);
    scenePass.setPipeline(pipelines.background);
    scenePass.draw(3);
    if (elapsed < 2400 && controls.rear) {
      drawScissoredFullscreen(scenePass, pipelines.rear, scissors(regions.PH, settings));
    }
    // The actor vertex path remains bounded by the original atlas cell/quad; give it a full viewport scissor.
    fullScissor(scenePass, canvas.width, canvas.height);
    scenePass.setPipeline(pipelines.actor);
    scenePass.draw(6, controls.dual ? 2 : 1);
    if (elapsed < 2400 && controls.front) {
      drawScissoredFullscreen(scenePass, pipelines.front, scissors(regions.PH, settings));
    }
    scenePass.end();

    const blurActive = observationLive(elapsed);
    if (blurActive) {
      const horizontal = encoder.beginRenderPass({ colorAttachments: [{ view: textures[2].createView(),
        loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
      horizontal.setBindGroup(0, postGroups.horizontal);
      drawScissoredFullscreen(horizontal, pipelines.horizontal, scissors(regions.xBlur, settings));
      horizontal.end();

      const vertical = encoder.beginRenderPass({ colorAttachments: [{ view: textures[3].createView(),
        loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
      vertical.setBindGroup(0, postGroups.vertical);
      drawScissoredFullscreen(vertical, pipelines.vertical, scissors(regions.yBlur, settings));
      vertical.end();
    }

    const finish = encoder.beginRenderPass({ colorAttachments: [{ view: surface.getCurrentTexture().createView(),
      loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
    fullScissor(finish, canvas.width, canvas.height);
    finish.setPipeline(pipelines.finish);
    finish.setBindGroup(0, postGroups.finish);
    finish.draw(3); // Fullscreen background/composite is retained; present shader exits before reading stale blur when inactive.
    finish.end();
    device.queue.submit([encoder.finish()]);
    frame++;
    animation = requestAnimationFrame(render);
  }

  globalThis.__clockAudit = {
    ready: true, compiled: true, id: DESIGN.id, verify: verification,
    adapter: { vendor: adapter.info?.vendor, architecture: adapter.info?.architecture }, faults, controls,
    seek(ms) { paused = ms; phase = 'capture'; },
    beginCapture() { phase = 'capture'; paused = null; },
    beginClean() { phase = 'clean'; paused = null; epoch = performance.now(); cycle = -1;
      lastCleanFrame = 0; cleanIntervals.length = 0; receipts.clear(); },
    snapshot() { return { frames: frame, cyclesStarted: cycle + 1, cleanIntervals: cleanIntervals.slice(),
      captureIntervals: captureIntervals.slice(), faults: [...faults], verify: verification,
      audio: hook.snapshot(), width: canvas.width, height: canvas.height,
      bodyHeight: controls.bodyHeight, dpr: devicePixelRatio || 1, dual: controls.dual }; },
    close() { cancelAnimationFrame(animation); audio.close(); for (const texture of textures) texture.destroy();
      characterTexture.destroy(); parameters.destroy(); device.destroy(); }
  };
  label.textContent = '待機時間短縮・時計zero r3';
  animation = requestAnimationFrame(render);
  addEventListener('pagehide', () => globalThis.__clockAudit.close(), { once: true });
} catch (error) {
  faults.push(error.message);
  label.textContent = error.message;
  globalThis.__clockAudit = { ready: false, faults };
}
