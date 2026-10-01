import { createPass, createAudioOwner, plan, assertCurrent, VERSION } from '../rpg-e.mjs';

const FORMAT = 'rgba16float';
// Exact approved male-left r5/r6 pose hashes. The surrounding receipt remains
// explicitly hypothetical; these hashes only bind the authored mouth pivots.
const APPROVED_POSE_HASHES = [
  '2a2ca10e63b7e91f8379a0d0cf75dfe6994d9e904d6402c0eeb0e0c287a7c465',
  '857c1a936960b6cefbda60efda1205fa39fa4cdf7ba8682b0cfd6db4e4263643'
];

export function verifyMode(search) {
  const params = new URLSearchParams(search);
  return params.has('verify');
}

export function verificationAudioPolicy(search) {
  return verifyMode(search) ? 'hard-zero' : 'user-gesture-finite-version-sfx';
}

export function readReviewAge(search) {
  const params = new URLSearchParams(search);
  if (!params.has('reviewAgeMs')) return null;
  const raw = params.get('reviewAgeMs');
  if (!/^\d+$/.test(raw || '')) return false;
  const age = Number(raw);
  return Number.isSafeInteger(age) && age >= 0 && age <= 1199 ? age : false;
}

export function validateSurfaceLease(device, lease, hdrView) {
  const names = ['baseRadiance', 'albedo', 'worldNormal', 'worldPosition'];
  return Boolean(lease && lease.device === device && lease.targetView !== hdrView &&
    lease.scope === 'physical-surface-inputs' && typeof lease.isCurrent === 'function' && lease.isCurrent() &&
    names.every(name => lease[name] && lease[name] !== hdrView) &&
    new Set(names.map(name => lease[name])).size === names.length);
}

export function boundedSurfaceSize(cssWidth, cssHeight, dpr, maxPixels = 2_500_000) {
  if (![cssWidth, cssHeight, dpr, maxPixels].every(Number.isFinite) ||
      cssWidth <= 0 || cssHeight <= 0 || dpr <= 0 || maxPixels < 4)
    throw new RangeError('Preview surface dimensions are invalid or too large');
  const scale = Math.min(1.5, dpr);
  let width = Math.max(2, Math.floor(cssWidth * scale));
  let height = Math.max(2, Math.floor(cssHeight * scale));
  if (width * height > maxPixels) {
    const fit = Math.sqrt(maxPixels / (width * height));
    width = Math.max(2, Math.floor(width * fit));
    height = Math.max(2, Math.floor(height * fit));
  }
  return Object.freeze({ width, height });
}

function f32ToF16(value) {
  const f = new Float32Array([value]);
  const u = new Uint32Array(f.buffer)[0];
  const sign = (u >>> 16) & 0x8000;
  let exp = ((u >>> 23) & 0xff) - 127 + 15;
  let mantissa = u & 0x7fffff;
  if (exp <= 0) {
    if (exp < -10) return sign;
    mantissa = (mantissa | 0x800000) >>> (1 - exp);
    return sign | ((mantissa + 0x1000) >>> 13);
  }
  if (exp >= 31) return sign | 0x7c00;
  return sign | (exp << 10) | ((mantissa + 0x1000) >>> 13);
}

const surfaces = [
  { p: [[0, 540], [960, 540], [960, 900], [0, 900]], c: [0.055, 0.064, 0.067], n: [0, 0, 1], z: 0 },
  { p: [[35, 390], [150, 390], [150, 540], [35, 540]], c: [0.12, 0.14, 0.15], n: [0.08, 0, 0.997], z: 4 },
  { p: [[760, 405], [925, 405], [925, 540], [760, 540]], c: [0.14, 0.13, 0.11], n: [-0.1, 0, 0.995], z: 4 },
  { p: [[180, 674], [380, 674], [380, 700], [180, 700]], c: [0.19, 0.21, 0.22], n: [0, 0, 1], z: 3 },
  // Sparse polygon surfaces are a simple preview robot, RPG tube and two raised blocks.
  { p: [[476, 630], [513, 630], [535, 691], [459, 691]], c: [0.17, 0.19, 0.20], n: [0.08, 0, 0.997], z: 14 },
  { p: [[478, 590], [512, 590], [519, 620], [473, 620]], c: [0.24, 0.25, 0.23], n: [0, -0.12, 0.993], z: 24 },
  { p: [[446, 617], [480, 617], [480, 629], [446, 629]], c: [0.11, 0.12, 0.12], n: [0, 0, 1], z: 19 },
  { p: [[443, 614], [448, 614], [448, 632], [443, 632]], c: [0.33, 0.28, 0.19], n: [0, 0, 1], z: 19 },
  { p: [[591, 690], [649, 690], [649, 743], [591, 743]], c: [0.13, 0.15, 0.16], n: [0, 0, 1], z: 8 },
  { p: [[663, 610], [709, 610], [709, 644], [663, 644]], c: [0.20, 0.17, 0.13], n: [0, 0, 1], z: 13 }
];

function inside(px, py, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// CPU-authored texels describe this host's explicit geometry; all four textures are uploaded
// to and sampled from the exact device that records the effect.
export function makeSurfacePixels(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width * height > 2_500_000)
    throw new RangeError('Preview surface dimensions are invalid or too large');
  const count = width * height;
  const baseRadiance = new Uint16Array(count * 4), albedo = new Uint16Array(count * 4);
  const worldNormal = new Uint16Array(count * 4), worldPosition = new Uint16Array(count * 4);
  const write = (array, pixel, rgba) => { const i = pixel * 4; for (let c = 0; c < 4; c++) array[i + c] = f32ToF16(rgba[c]); };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const pixel = y * width + x;
    // world coordinates are calibrated to the approved fixture's logical 960x540 camera.
    const wx = (x + 0.5) * 960 / width + 0;
    const wy = 500 + (y + 0.5 - height / 2) * 960 / width;
    const screenX = wx, screenY = wy;
    write(baseRadiance, pixel, [0.012, 0.016, 0.021, 1]);
    for (const surface of surfaces) if (inside(screenX, screenY, surface.p)) {
      write(baseRadiance, pixel, [...surface.c, 1]);
      write(albedo, pixel, [...surface.c.map(v => Math.min(1, v * 2.3)), 1]);
      write(worldNormal, pixel, [...surface.n, 1]);
      write(worldPosition, pixel, [wx, wy, surface.z, 1]);
    }
  }
  return { baseRadiance, albedo, worldNormal, worldPosition };
}

function makeTexture(device, label, width, height, data) {
  const usage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC;
  const texture = device.createTexture({ label, size: [width, height], format: FORMAT, usage });
  device.queue.writeTexture({ texture }, data, { bytesPerRow: width * 8, rowsPerImage: height }, [width, height]);
  return texture;
}

export function frameInput(age, variant, reducedMotion) {
  const f = {
    receipt: { schema: 'preview-rpg-use-r1', provenance: 'hypothetical-preview-only', causeId: 'preview-rpg-cast-1',
      roomId: 'preview-room', sessionGeneration: 1, actorId: 'preview-male-bot', soundId: 'preview-linked-sound-1',
      localDurationMs: 1200, eClockRoomId: 'preview-room', eClockStartedAt: 1000,
      source: { id: 'preview-magic-rpg-1', type: 'gunner-rpg', variant: 'normal', radius: 300, durationMs: 0,
        playerId: 'preview-male-bot', x: 500, y: 700, at: 1_800_000_000_000, targetX: 200, targetY: 700 },
      attempts: [
        { id: 'preview-attempt-1', causeId: 'preview-rpg-cast-1', position: { x: 260, y: 650 }, outcome: 'preview-physical-impact', visible: true },
        { id: 'preview-attempt-2', causeId: 'preview-rpg-cast-1', position: { x: 490, y: 530 }, outcome: 'preview-defended', visible: true }
      ],
      lightPositions: { 'preview-magic-rpg-1': { x: 457, y: 624, z: 45 }, 'preview-attempt-1': { x: 260, y: 650, z: 20 } }
    },
    poseLease: { identity: 'male-bot', direction: 'left', motionId: 'gunner-rpg', actorId: 'preview-male-bot',
      sourceEffectId: 'preview-magic-rpg-1', causeId: 'preview-rpg-cast-1', ground: { x: 500, y: 700 },
      scale: 112 / 1180, poseHashes: APPROVED_POSE_HASHES },
    rawActorClock: 1000 + age, motionAgeMs: Math.min(age, 260),
    context: { roomId: 'preview-room', sessionGeneration: 1, phase: 'playing', hidden: false,
      sensoryBlocked: false, sourceVisible: true }
  };
  f.receipt.source.variant = variant;
  f.receipt.source.radius = variant === 'enhance' ? 360 : 300;
  return { ...f, rawActorClock: f.receipt.eClockStartedAt + age,
    motionAgeMs: Math.min(age, 260), reducedMotion };
}

function install() {
  const canvas = document.querySelector('#stage'), diagnostic = document.querySelector('#diagnostic');
  const modeBadge = document.querySelector('#mode'), leaseText = document.querySelector('#lease');
  const errorBridge = document.querySelector('#error');
  const controls = Object.fromEntries(['play','silent','pause','variant','reduced','clock','clockValue'].map(id => [id, document.querySelector('#' + id)]));
  const verification = verifyMode(location.search);
  let adapter, device, context, effectPass, audioContext = null, audioOwner = null, textures = null;
  let hdr = null, hdrView = null, finalPipeline = null, finalBind = null, finalUniform = null;
  let targetWidth = 0, targetHeight = 0;
  const reviewAge = readReviewAge(location.search);
  let ready = false, running = false, dead = false, soundUnlocked = false, manualAge = typeof reviewAge === 'number' ? reviewAge : 0;
  let startedAt = 0, ageAtStart = manualAge, previousAge = -1, rafId = 0;
  const errors = message => { diagnostic.textContent = message; diagnostic.dataset.error = 'true'; errorBridge.textContent = message; errorBridge.hidden = false; };
  const status = message => { diagnostic.textContent = message; delete diagnostic.dataset.error; errorBridge.textContent = ''; errorBridge.hidden = true; };
  modeBadge.textContent = verification ? 'VERIFY · AUDIO HARD ZERO' :
    typeof reviewAge === 'number' ? 'REVIEW · FIXED ACTUAL E AGE' : 'Preview · muted until gesture';
  if (reviewAge === false) {
    errors('Invalid reviewAgeMs. Use an integer from 0 through 1199, or omit it for the normal 0–1200 ms run.');
    return;
  }
  if (typeof reviewAge === 'number') {
    controls.play.hidden = controls.silent.hidden = controls.pause.hidden = true;
    controls.clock.disabled = true;
    controls.clock.value = String(reviewAge);
    controls.clockValue.value = `${reviewAge} ms · held`;
  }

  function disposeTargets(waitForQueue = false) {
    const owned = [hdr, ...Object.values(textures || {})].filter(Boolean);
    hdr = hdrView = textures = null;
    const release = () => owned.forEach(texture => texture.destroy());
    if (waitForQueue && owned.length) device.queue.onSubmittedWorkDone().then(release, release);
    else release();
  }
  function resizeTargets() {
    if (!ready || dead) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const { width, height } = boundedSurfaceSize(rect.width, rect.height, devicePixelRatio || 1);
    if (width === targetWidth && height === targetHeight && hdr && textures) return;
    const hadTargets = Boolean(hdr && textures);
    canvas.width = width; canvas.height = height;
    context.configure({ device, format: navigator.gpu.getPreferredCanvasFormat(), alphaMode: 'opaque' });
    disposeTargets(true);
    const pixels = makeSurfacePixels(width, height);
    textures = Object.fromEntries(Object.entries(pixels).map(([name, data]) => [name, makeTexture(device, 'RPG preview physical ' + name, width, height, data)]));
    hdr = device.createTexture({ label: 'RPG preview HDR composition target', size: [width, height], format: FORMAT,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST });
    hdrView = hdr.createView();
    targetWidth = width; targetHeight = height;
    finalBind = device.createBindGroup({ layout: finalPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: hdrView }, { binding: 1, resource: { buffer: finalUniform } }
    ] });
    device.queue.writeBuffer(finalUniform, 0, new Float32Array([width, height, 0, 0]));
    leaseText.textContent = `Same WebGPUDevice: yes\nTarget: rgba16float ${width}×${height}\nPhysical inputs: baseRadiance, linear albedo, signed worldNormal, worldPosition + valid-surface mask\nGeometry: explicit floor, raised blocks, and simple RPG preview body; absent pixels carry mask 0\nBody scale: 112 logical units high from approved r5/r6 frame bounds and the module's pivot scale\nClock: normal playback advances E and actor clocks together at 1× for 0–1200 ms\nPost sequence: actual per-surface light → authored E → final tone map → canvas\nSubmission: one encoder, exact r1 record receipt, queue completion release\nLight positions: fixture-declared hypothetical 3D coordinates only`;
    if (hadTargets) draw();
  }
  async function init() {
    try {
      if (!navigator.gpu) throw new Error('This browser does not expose WebGPU. The preview requires a WebGPU adapter.');
      adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('No WebGPU adapter is available.');
      device = await adapter.requestDevice();
      device.addEventListener('uncapturederror', event => {
        running = false; errors(`WebGPU resource or command validation failed: ${event.error?.message || event.error || 'unknown GPU error'}`);
      });
      device.lost.then(info => { dead = true; running = false; disposeTargets(); effectPass?.destroy(); errors(`WebGPU device lost (${info.reason || 'unknown'}): ${info.message || 'device unavailable'}`); });
      context = canvas.getContext('webgpu');
      if (!context) throw new Error('Could not acquire the canvas WebGPU context.');
      effectPass = await createPass({ device, format: FORMAT });
      const shader = device.createShaderModule({ label: 'RPG preview final tone map', code: `
        struct Params { size: vec2f, exposure: vec2f };
        @group(0) @binding(0) var hdr: texture_2d<f32>;
        @group(0) @binding(1) var<uniform> params: Params;
        @vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
          let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3)); return vec4f(p[i],0,1);
        }
        fn srgb(v:f32)->f32 { if(v<=0.0031308){return v*12.92;} return 1.055*pow(v,1.0/2.4)-0.055; }
        @fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f {
          let xy=clamp(vec2i(p.xy),vec2i(0),vec2i(params.size)-vec2i(1));
          let c=textureLoad(hdr,xy,0).rgb;
          let mapped=c/(vec3f(1.0)+c);
          return vec4f(srgb(mapped.r),srgb(mapped.g),srgb(mapped.b),1.0);
        }` });
      finalPipeline = await device.createRenderPipelineAsync({ label: 'RPG preview HDR display resolve', layout: 'auto',
        vertex: { module: shader, entryPoint: 'vs' }, fragment: { module: shader, entryPoint: 'fs', targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }] },
        primitive: { topology: 'triangle-list' } });
      finalUniform = device.createBuffer({ label: 'RPG preview display dimensions', size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      ready = true;
      // Resize handling is installed only after device, effect, and final display pipelines exist.
      resizeTargets(); new ResizeObserver(resizeTargets).observe(canvas.parentElement);
      controls.play.disabled = controls.silent.disabled = controls.pause.disabled = false;
      status(typeof reviewAge === 'number'
        ? `Ready. Held at actual fixture E age ${reviewAge} ms; event geometry remains hypothetical preview data.`
        : 'Ready. The rendered pose and all event locations are hypothetical preview data.');
      draw();
    } catch (error) { errors(`Preview could not initialize: ${error?.message || error}`); }
  }

  function currentAge(now = performance.now()) {
    if (typeof reviewAge === 'number') return reviewAge;
    return running ? Math.min(1200, ageAtStart + now - startedAt) : manualAge;
  }
  function stopAt(age) { running = false; manualAge = Math.max(0, Math.min(1200, age)); controls.clock.value = String(Math.floor(manualAge)); controls.clockValue.value = `${Math.floor(manualAge)} ms`; }
  function ensureAudio() {
    if (verification) return false;
    if (!audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw new Error('Web Audio is unavailable; use Play silently.');
      audioContext = new Ctx(); audioOwner = createAudioOwner({ context: audioContext, destination: audioContext.destination,
        isSubmitted: receipt => effectPass?.isSubmitted(receipt) === true });
    }
    return audioContext.resume();
  }
  function admitSound(submission) {
    if (!audioOwner || verification || !soundUnlocked) return;
    const common = { verify: false, visible: !document.hidden, unlocked: true, muted: false, sensoryBlocked: false };
    audioOwner.admit(submission, 'launch', common);
    if (submission.endpoints.some(e => e.role === 'impact')) {
      const impact = submission.endpoints.find(e => e.role === 'impact');
      if (impact) audioOwner.admit(submission, 'impact', { ...common, endpointId: impact.id });
    }
  }
  function draw() {
    if (!ready || dead) return;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    const age = currentAge();
    controls.clockValue.value = `${Math.floor(age)} ms`;
    const width = canvas.width, height = canvas.height;
    const frame = frameInput(age, controls.variant.value, controls.reduced.checked);
    const result = plan(frame);
    const isCurrent = () => { try { assertCurrent(result, frame); return !dead; } catch { return false; } };
    let prepared = null;
    try {
      const encoder = device.createCommandEncoder({ label: 'RPG preview one-shot frame encoder' });
      const target = context.getCurrentTexture().createView();
      let recording = null;
      if (result.status === 'planned') {
        prepared = effectPass.prepare(result, { viewport: { width, height }, camera: { x: 480, y: 500, zoom: width / 960 }, sourceCurrent: isCurrent });
        const viewLease = { device, targetView: target, scope: 'physical-surface-inputs', isCurrent: () => !dead,
          baseRadiance: textures.baseRadiance.createView(), albedo: textures.albedo.createView(),
          worldNormal: textures.worldNormal.createView(), worldPosition: textures.worldPosition.createView() };
        if (!validateSurfaceLease(device, viewLease, hdrView)) throw new Error('Missing, stale, aliased, or foreign-device physical material resources; no lighting substitute was run.');
        recording = prepared.record(encoder, hdrView, { loadOp: 'clear', lightingLease: viewLease });
        if (!recording.dynamicLightRecorded && result.lights.length) throw new Error('Surface-light pass did not record; full lighting preview is unavailable.');
        if (!recording.dynamicLightRecorded) status('VFX preview only: this frame has no live explicit light source.');
        else if (age !== previousAge) status(`Submitted E clock ${Math.floor(age)} ms · physical-surface light recorded · hypothetical preview only`);
      } else {
        encoder.copyTextureToTexture({ texture: textures.baseRadiance }, { texture: hdr }, [width, height]);
        if (age !== previousAge) status(`E clock ${Math.floor(age)} ms · authored field ended; preview surfaces remain`);
      }
      const resolve = encoder.beginRenderPass({ colorAttachments: [{ view: target, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
      resolve.setPipeline(finalPipeline); resolve.setBindGroup(0, finalBind); resolve.draw(3); resolve.end();
      if (recording) {
        const receipt = effectPass.submit(recording);
        prepared.release(); admitSound(receipt);
      } else device.queue.submit([encoder.finish()]);
      previousAge = age;
    } catch (error) {
      prepared?.release(); running = false; errors(`Preview frame stopped: ${error?.message || error}`); return;
    }
    if (running && age >= 1200) { running = false; manualAge = 1200; }
    if (running) rafId = requestAnimationFrame(() => { rafId = 0; draw(); });
  }

  controls.play.addEventListener('click', async () => {
    try {
      const resumed = ensureAudio();
      if (resumed && typeof resumed.then === 'function') await resumed;
      soundUnlocked = Boolean(audioContext && audioContext.state === 'running');
      if (!soundUnlocked) status('Audio stayed locked; use Play silently or try the sound button again after a user gesture.');
      ageAtStart = manualAge; startedAt = performance.now(); running = true; draw();
    } catch (error) { errors(`Audio could not unlock: ${error.message}. Use Play silently to continue.`); }
  });
  controls.silent.addEventListener('click', () => { soundUnlocked = false; ageAtStart = manualAge; startedAt = performance.now(); running = true; draw(); });
  controls.pause.addEventListener('click', () => stopAt(currentAge()));
  controls.clock.addEventListener('input', () => { stopAt(Number(controls.clock.value)); previousAge = -1; draw(); });
  controls.variant.addEventListener('change', () => { previousAge = -1; draw(); });
  controls.reduced.addEventListener('change', () => { previousAge = -1; draw(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { soundUnlocked = false; if (audioContext?.state === 'running') audioContext.suspend(); } });
  window.addEventListener('beforeunload', () => { running = false; audioOwner?.destroy(); audioContext?.close(); effectPass?.destroy(); disposeTargets(); });
  if (verification) { controls.play.hidden = true; controls.silent.textContent = 'Play · audio hard zero'; }
  init();
}

if (typeof document !== 'undefined') install();

