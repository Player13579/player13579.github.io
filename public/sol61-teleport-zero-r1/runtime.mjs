import { TELEPORT_R1, sampleArtist, audioPlan } from './artist.mjs';
import { TELEPORT_WORLD_WGSL, packWorldUniforms } from './world-shader.mjs';
import { TELEPORT_POST_WGSL, packPostUniforms } from './post-shader.mjs';
import { renderPcm } from './sfx-score.mjs';

export const SOURCE_REVISION = Object.freeze({
  id: 'sol61-action-teleport-zero-r1', author: 'GPT-6.1-Sol',
  artist: '42092ea67e658add6d65afabd44f7e6281b8e15bcd489a607fb0176bb762712b',
  world: '7665c23e14bcbdfc8091e50cb9483924d6bfb4c5037bb87a1e85a52dbe570daf',
  post: 'a7d43f1eead91b6e3fd22641dbc66b882f10255a696a7fdbaddb1a762fe232fa',
  sfx: '02ed55f4a11940bc590f62fd1efc365473d005a58b84a89e6fb13d12c0be6e52'
});

export function loopSample(elapsedEms, reducedMotion = false) {
  if (!Number.isFinite(elapsedEms) || elapsedEms < 0) return Object.freeze({ variant: 'departure', ageEms: -1, state: sampleArtist(-1, 'departure', reducedMotion) });
  const phase = elapsedEms % (TELEPORT_R1.durationEms * 2);
  const variant = phase < TELEPORT_R1.durationEms ? 'departure' : 'arrival';
  const ageEms = phase % TELEPORT_R1.durationEms;
  return Object.freeze({ variant, ageEms, state: sampleArtist(ageEms, variant, reducedMotion) });
}

export function srgbEncode1(x) {
  const c = Math.max(0, x);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

const FINAL_WGSL = /* wgsl */ `
@group(0) @binding(0) var image:texture_2d<f32>;
@group(0) @binding(1) var imageSampler:sampler;
struct V { @builtin(position) position:vec4<f32>, @location(0) uv:vec2<f32> };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
 let p=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));
 var o:V; o.position=vec4<f32>(p[i],0.,1.); o.uv=p[i]*vec2<f32>(.5,-.5)+vec2<f32>(.5); return o;
}
fn encode(c:vec3<f32>)->vec3<f32> {
 let x=max(c,vec3<f32>(0.));
 return select(1.055*pow(x,vec3<f32>(1./2.4))-.055,12.92*x,x<=vec3<f32>(.0031308));
}
@fragment fn fs(v:V)->@location(0) vec4<f32> {
 let c=textureSampleLevel(image,imageSampler,v.uv,0.); return vec4<f32>(encode(c.rgb),c.a);
}`;

const BODY_PLACEHOLDER_WGSL = /* wgsl */ `
@group(0) @binding(0) var body:texture_2d<f32>;
struct V { @builtin(position) position:vec4<f32>, @location(0) uv:vec2<f32> };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
 let p=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));
 var o:V; o.position=vec4<f32>(p[i],0.,1.); o.uv=p[i]*vec2<f32>(.5,-.5)+vec2<f32>(.5); return o;
}
struct Out { @location(0) scene:vec4<f32>, @location(1) sourceSignal:vec4<f32> };
@fragment fn fs(v:V)->Out {
 let placeholder=textureLoad(body,vec2<i32>(0,0),0);
 var o:Out; o.scene=placeholder; o.sourceSignal=vec4<f32>(0.); return o;
}`;

function makeTexture(device, width, height, label, format = 'rgba16float') {
  return device.createTexture({ label, size: [width, height], format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
}
function shader(device, label, code) { return device.createShaderModule({ label, code }); }
function drawPass(encoder, view, pipeline, bindGroup, label, loadOp = 'clear', clearValue = { r: 0, g: 0, b: 0, a: 0 }) {
  const pass = encoder.beginRenderPass({ label, colorAttachments: [{ view, loadOp, clearValue, storeOp: 'store' }] });
  pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup); pass.draw(3); pass.end();
}

export async function startTeleportGallery({ canvas, soundButton, reducedMotion = false } = {}) {
  if (!canvas || !globalThis.navigator?.gpu) throw new Error('WebGPU required');
  const verify = new URLSearchParams(globalThis.location?.search || '').has('verify');
  const diagnostic = globalThis.__dvaTeleport = {
    id: TELEPORT_R1.id, sourceRevision: SOURCE_REVISION, state: 'starting', frame: 0,
    verify, errors: [], shaderCompilation: 'pending', gpuSubmissions: 0,
    receiver: 'disabled: transparent 1x1 gallery body placeholder; no actualbody integration',
    actualBody: 'transparent-1x1-placeholder', mapReceiver: 'disabled: no actual map material',
    layers: ['full-frame rear field', 'full-frame transparent 1x1 body placeholder', 'full-frame front field'],
    referenceBodyH: 64, outputColor: 'linear-sRGB internal; one final sRGB encode'
  };
  const ownedTextures = new Set();
  const ownedBuffers = new Set();
  const ownTexture = (...args) => { const texture = makeTexture(...args); ownedTextures.add(texture); return texture; };
  let device, context, raf = 0, stopped = false, resizeObserver, audioContext = null;
  let startTime = 0;
    let lastCueKey = '', currentVariant = '', sourceVisible = false;
  const audioSources = new Set();
  const reportError = (where, error) => { diagnostic.errors.push({ where, message: String(error?.message || error) }); diagnostic.state = 'error'; };
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No WebGPU adapter');
    device = await adapter.requestDevice();
    diagnostic.adapter = adapter.info?.description || adapter.info?.vendor || 'WebGPU adapter';
    context = canvas.getContext('webgpu');
    if (!context) throw new Error('WebGPU canvas context unavailable');
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format: canvasFormat, alphaMode: 'premultiplied' });
    device.addEventListener('uncapturederror', (event) => reportError('uncapturederror', event.error));
    device.lost.then((info) => { if (!stopped) reportError('device-lost', info.message || info.reason); });

    const worldModule = shader(device, 'Teleport r1 frozen world WGSL', TELEPORT_WORLD_WGSL);
    const postModule = shader(device, 'Teleport r1 frozen optical WGSL', TELEPORT_POST_WGSL);
    const finalModule = shader(device, 'Teleport r1 final sRGB output', FINAL_WGSL);
    const bodyPlaceholderModule = shader(device, 'Transparent gallery body placeholder', BODY_PLACEHOLDER_WGSL);
    const modules = [['world', worldModule], ['body-placeholder', bodyPlaceholderModule], ['post', postModule], ['final', finalModule]];
    for (const [name, module] of modules) {
      const info = await module.getCompilationInfo();
      const errors = info.messages.filter((message) => message.type === 'error');
      if (errors.length) throw new Error(`${name} WGSL: ${errors.map((entry) => entry.message).join(' | ')}`);
    }
    diagnostic.shaderCompilation = 'pass: world fs, post blurFS/finishFS, final vs/fs';

    const worldPipeline = device.createRenderPipeline({ label: 'Teleport r1 rear/body/front HDR scene/source MRT', layout: 'auto',
      vertex: { module: worldModule, entryPoint: 'vs' }, fragment: { module: worldModule, entryPoint: 'fs', targets: [
        { format: 'rgba16float', blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } },
        { format: 'rgba16float', blend: { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } } }
      ] } });
    const blurPipeline = device.createRenderPipeline({ label: 'Teleport r1 per-owner blur', layout: 'auto',
      vertex: { module: postModule, entryPoint: 'vs' }, fragment: { module: postModule, entryPoint: 'blurFS', targets: [{ format: 'rgba16float' }] } });
    const bodyPlaceholderPipeline = device.createRenderPipeline({ label: 'transparent 1x1 body placeholder pass', layout: 'auto',
      vertex: { module: bodyPlaceholderModule, entryPoint: 'vs' }, fragment: { module: bodyPlaceholderModule, entryPoint: 'fs', targets: [
        { format: 'rgba16float', blend: { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } } },
        { format: 'rgba16float', blend: { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } } }
      ] } });
    const finishPipeline = device.createRenderPipeline({ label: 'Teleport r1 scene A/B finish', layout: 'auto',
      vertex: { module: postModule, entryPoint: 'vs' }, fragment: { module: postModule, entryPoint: 'finishFS', targets: [{ format: 'rgba16float' }] } });
    const finalPipeline = device.createRenderPipeline({ label: 'Teleport r1 sole final sRGB encode', layout: 'auto',
      vertex: { module: finalModule, entryPoint: 'vs' }, fragment: { module: finalModule, entryPoint: 'fs', targets: [{ format: canvasFormat }] } });

    // Actual-body is deliberately transparent and only 1x1. It cannot receive or
    // occlude light; no fixture actor or renderer/main-scene API is substituted.
    const actualBodyPlaceholder = ownTexture(device, 1, 1, 'transparent actual-body placeholder', 'rgba8unorm');
    device.queue.writeTexture({ texture: actualBodyPlaceholder }, new Uint8Array([0, 0, 0, 0]), { bytesPerRow: 4 }, [1, 1]);
    let width = 0, height = 0, sceneA, sceneB, source, blurA, blurB, coverage, worldUniforms = [], postUniforms = [], postSampler, finalSampler;
    const resetTargets = () => {
      const dpr = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
      const nextWidth = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const nextHeight = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (nextWidth === width && nextHeight === height) return;
      for (const texture of [sceneA, sceneB, source, blurA, blurB, coverage]) if (texture) { texture.destroy(); ownedTextures.delete(texture); }
      for (const buffer of [...worldUniforms, ...postUniforms]) { buffer.destroy(); ownedBuffers.delete(buffer); }
      width = nextWidth; height = nextHeight; canvas.width = width; canvas.height = height;
      sceneA = ownTexture(device, width, height, 'scene A linear HDR');
      sceneB = ownTexture(device, width, height, 'scene B linear HDR');
      source = ownTexture(device, width, height, 'single receipt source signal');
      blurA = ownTexture(device, width, height, 'receipt blur A');
      blurB = ownTexture(device, width, height, 'receipt blur B');
      coverage = ownTexture(device, width, height, 'gallery solid coverage clear');
      worldUniforms = Array.from({ length: 2 }, (_, i) => { const b = device.createBuffer({ label: `world 96-byte frozen contract ${i}`, size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); ownedBuffers.add(b); return b; });
      postUniforms = Array.from({ length: 3 }, (_, i) => { const b = device.createBuffer({ label: `post 64-byte frozen contract ${i}`, size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); ownedBuffers.add(b); return b; });
      postSampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
      finalSampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
      diagnostic.viewport = { width, height, dpr, generation: (diagnostic.viewport?.generation || 0) + 1 };
    };
    resizeObserver = new ResizeObserver(resetTargets); resizeObserver.observe(canvas); resetTargets();

    const worldBind = (index, uniformData) => {
      const worldUniform = worldUniforms[index];
      device.queue.writeBuffer(worldUniform, 0, uniformData);
      return device.createBindGroup({ layout: worldPipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: { buffer: worldUniform } }, { binding: 1, resource: coverage.createView() }
      ] });
    };
    const postBind = (pipeline, uniformIndex, uniformData, signalTexture, blurTexture, sceneTexture) => {
      const postUniform = postUniforms[uniformIndex];
      device.queue.writeBuffer(postUniform, 0, uniformData);
      const entries = [{ binding: 0, resource: { buffer: postUniform } }, { binding: 1, resource: signalTexture.createView() },
        { binding: 4, resource: postSampler }];
      if (pipeline === finishPipeline) entries.push({ binding: 2, resource: blurTexture.createView() }, { binding: 3, resource: sceneTexture.createView() });
      return device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries });
    };
    const finalBind = () => device.createBindGroup({ layout: finalPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: sceneB.createView() }, { binding: 1, resource: finalSampler }
    ] });

    const draw = (timestamp) => {
      if (stopped) return;
      if (document.hidden) { raf = requestAnimationFrame(draw); return; }
      try {
        resetTargets();
        const elapsed = Math.max(0, timestamp - startTime);
        const cycle = loopSample(elapsed, reducedMotion);
        currentVariant = cycle.variant;
        const state = cycle.state;
        sourceVisible = state.active && state.core + state.seam > 0;
        const H = 64 * (diagnostic.viewport?.dpr || 1);
        const anchorX = width * .5, anchorY = height * .5;
        // Gallery has no actual actor/map receiver. Preserve the artist field but
        // gate both material receive paths until an actual host draw exists.
        const galleryState = Object.freeze({ ...state, receiver: 0, footEnergy: 0 });
        const enc = device.createCommandEncoder({ label: `Teleport receipt frame ${diagnostic.frame + 1}` });
        const coveragePass = enc.beginRenderPass({ label: 'no actual solid occluders in standalone gallery', colorAttachments: [
          { view: coverage.createView(), loadOp: 'clear', clearValue: { r: 0, g: 0, b: 0, a: 0 }, storeOp: 'store' }
        ] }); coveragePass.end();
        const pass = enc.beginRenderPass({ label: 'rear + transparent body placeholder + front MRT', colorAttachments: [
          { view: sceneA.createView(), loadOp: 'clear', clearValue: { r: .012, g: .018, b: .032, a: 1 }, storeOp: 'store' },
          { view: source.createView(), loadOp: 'clear', clearValue: { r: 0, g: 0, b: 0, a: 0 }, storeOp: 'store' }
        ] });
        pass.setPipeline(worldPipeline);
        const rear = worldBind(0, packWorldUniforms(galleryState, { width, height, anchorX, anchorY, bodyH: H, layer: 'rear' }));
        pass.setBindGroup(0, rear); pass.draw(3);
        // Full-frame middle layer samples only the transparent 1x1 placeholder.
        // It emits zero, never a synthetic sprite or receiver.
        pass.setPipeline(bodyPlaceholderPipeline);
        pass.setBindGroup(0, device.createBindGroup({ layout: bodyPlaceholderPipeline.getBindGroupLayout(0), entries: [
          { binding: 0, resource: actualBodyPlaceholder.createView() }
        ] }));
        pass.draw(3);
        pass.setPipeline(worldPipeline);
        const front = worldBind(1, packWorldUniforms(galleryState, { width, height, anchorX, anchorY, bodyH: H, layer: 'front' }));
        pass.setBindGroup(0, front); pass.draw(3); pass.end();

        const horizontal = packPostUniforms(galleryState, { width, height, anchorX, anchorY, bodyH: H, direction: [1, 0] });
        const vertical = packPostUniforms(galleryState, { width, height, anchorX, anchorY, bodyH: H, direction: [0, 1] });
        drawPass(enc, blurA.createView(), blurPipeline, postBind(blurPipeline, 0, horizontal, source, blurA, sceneA), 'owner source horizontal blur');
        drawPass(enc, blurB.createView(), blurPipeline, postBind(blurPipeline, 1, vertical, blurA, blurB, sceneA), 'owner source vertical blur');
        drawPass(enc, sceneB.createView(), finishPipeline,
          postBind(finishPipeline, 2, packPostUniforms(galleryState, { width, height, anchorX, anchorY, bodyH: H }), source, blurB, sceneA),
          'scene A to B optical finish');
        drawPass(enc, context.getCurrentTexture().createView(), finalPipeline, finalBind(), 'sole linear to sRGB encode');
        device.queue.submit([enc.finish()]);
        diagnostic.gpuSubmissions++;
        diagnostic.frame++;
        diagnostic.state = 'running';
        const cueKey = `${Math.floor(elapsed / 760)}:${cycle.variant}`;
        diagnostic.current = { variant: cycle.variant, ageEms: cycle.ageEms, sourceVisible, active: state.active, bodyH: H, receiverGain: 0, loopEms: elapsed % 1520, cueKey };
        if (cueKey !== lastCueKey && state.active) {
          lastCueKey = cueKey;
          const audioWasAuthorizedAtSubmit = Boolean(audioContext?.state === 'running' && !verify && !document.hidden);
          if (audioWasAuthorizedAtSubmit) submitCueProof(cueKey, audioContext);
        }
      } catch (error) { reportError('frame', error); }
      raf = requestAnimationFrame(draw);
    };

    startTime = performance.now();
    const submitCueProof = (cueKey, authorizedContext) => {
      const submittedAt = performance.now();
      void device.queue.onSubmittedWorkDone().then(() => {
        if (stopped || verify || !audioContext || audioContext !== authorizedContext || document.hidden || diagnostic.current?.cueKey !== cueKey) return;
        const currentElapsed = Math.max(0, performance.now() - startTime);
        const current = loopSample(currentElapsed, reducedMotion);
        const currentKey = `${Math.floor(currentElapsed / 760)}:${current.variant}`;
        const visibleNow = current.state.active && (current.state.gateAlpha > 0 || current.state.core > 0 || current.state.seam > 0);
        if (currentKey !== cueKey || !visibleNow) return;
        const plan = audioPlan(current.ageEms, 1, { muted: false, verify });
        if (!plan.audible) return;
        const pcm = pcmCache[current.variant];
        const buffer = audioContext.createBuffer(1, pcm.length, 48000);
        buffer.copyToChannel(pcm, 0);
        const node = audioContext.createBufferSource(); node.buffer = buffer; node.playbackRate.value = plan.playbackRate;
        node.connect(audioContext.destination); audioSources.add(node);
        node.onended = () => { audioSources.delete(node); try { node.disconnect(); } catch {} };
        node.start(0, plan.canonicalOffsetSeconds);
        diagnostic.lastAudioProof = { cueKey, submittedAt, provedAt: performance.now(), canonicalOffsetSeconds: plan.canonicalOffsetSeconds };
      }).catch((error) => reportError('audio-submit-proof', error));
    };
    const pcmCache = { departure: renderPcm('departure'), arrival: renderPcm('arrival') };
    const unlockAudio = async () => {
      if (verify) return;
      try {
        audioContext ||= new AudioContext({ sampleRate: 48000 });
        await audioContext.resume();
        diagnostic.audio = 'enabled-by-user-gesture';
        soundButton.textContent = '音声を有効化しました'; soundButton.disabled = true;
      } catch (error) { reportError('audio-unlock', error); }
    };
    if (soundButton) {
      soundButton.disabled = verify;
      soundButton.textContent = verify ? '検証モード：消音固定' : 'クリックして音声を有効化';
      soundButton.addEventListener('click', unlockAudio);
    }
    if (verify) diagnostic.audio = 'forced-mute';
    else diagnostic.audio = 'gesture-locked';
    const onVisibilityChange = () => {
      if (document.hidden) {
        for (const node of audioSources) { try { node.stop(); node.disconnect(); } catch {} }
        audioSources.clear(); lastCueKey = diagnostic.current?.cueKey || lastCueKey;
        diagnostic.audio = verify ? 'forced-mute' : 'silenced-page-hidden';
        return;
      }
      // Start a fresh demo receipt after visibility returns; never continue a
      // hidden interval's old pulse/cue phase.
      startTime = performance.now(); lastCueKey = '';
      diagnostic.audio = verify ? 'forced-mute' : audioContext?.state === 'running' ? 'enabled-by-user-gesture' : 'gesture-locked';
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    const stop = () => {
      if (stopped) return;
      stopped = true; cancelAnimationFrame(raf); resizeObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      soundButton?.removeEventListener('click', unlockAudio);
      for (const node of audioSources) { try { node.stop(); node.disconnect(); } catch {} }
      audioSources.clear();
      if (audioContext && audioContext.state !== 'closed') void audioContext.close();
      for (const buffer of ownedBuffers) buffer.destroy(); ownedBuffers.clear();
      for (const texture of ownedTextures) texture.destroy(); ownedTextures.clear();
      context?.unconfigure(); diagnostic.state = 'stopped';
    };
    globalThis.addEventListener?.('pagehide', stop, { once: true });
    globalThis.__dvaTeleportStop = stop;
    raf = requestAnimationFrame(draw);
    return stop;
  } catch (error) {
    reportError('startup', error);
    for (const texture of ownedTextures) texture.destroy();
    for (const buffer of ownedBuffers) buffer.destroy();
    if (audioContext && audioContext.state !== 'closed') void audioContext.close();
    context?.unconfigure();
    throw error;
  }
}
