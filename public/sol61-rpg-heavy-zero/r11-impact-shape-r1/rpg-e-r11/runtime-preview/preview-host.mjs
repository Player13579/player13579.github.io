import { createPass, createAudioOwner, plan, assertCurrent, CANDIDATE_VERSION } from '../rpg-e-r11.mjs';
import { assertPinnedPackage } from './pin-guard.mjs';

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

const f32Scratch = new Float32Array(1);
const u32Scratch = new Uint32Array(f32Scratch.buffer);

function f32ToF16(value) {
  f32Scratch[0] = value;
  const u = u32Scratch[0];
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
const F16_ONE = f32ToF16(1);
const BACKGROUND_PALETTE = new Uint16Array([f32ToF16(0.012), f32ToF16(0.016), f32ToF16(0.021), F16_ONE]);
const SURFACE_PALETTES = surfaces.map(surface => {
  const base = new Uint16Array(4), albedo = new Uint16Array(4), normal = new Uint16Array(4);
  for (let c = 0; c < 3; c++) {
    base[c] = f32ToF16(surface.c[c]);
    albedo[c] = f32ToF16(Math.min(1, surface.c[c] * 2.3));
    normal[c] = f32ToF16(surface.n[c]);
  }
  base[3] = F16_ONE; albedo[3] = F16_ONE; normal[3] = F16_ONE;
  return Object.freeze({ base, albedo, normal, z: f32ToF16(surface.z), one: F16_ONE });
});

export function makeSurfacePixels(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width * height > 2_500_000)
    throw new RangeError('Preview surface dimensions are invalid or too large');
  const count = width * height;
  const baseRadiance = new Uint16Array(count * 4), albedo = new Uint16Array(count * 4);
  const worldNormal = new Uint16Array(count * 4), worldPosition = new Uint16Array(count * 4);
  const writePalette = (array, i, palette) => {
    array[i] = palette[0]; array[i + 1] = palette[1]; array[i + 2] = palette[2]; array[i + 3] = palette[3];
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const pixel = y * width + x, i = pixel * 4;
    // world coordinates are calibrated to the approved fixture's logical 960x540 camera.
    const wx = (x + 0.5) * 960 / width + 0;
    const wy = 500 + (y + 0.5 - height / 2) * 960 / width;
    const screenX = wx, screenY = wy;
    writePalette(baseRadiance, i, BACKGROUND_PALETTE);
    for (let s = 0; s < surfaces.length; s++) {
      const surface = surfaces[s];
      if (!inside(screenX, screenY, surface.p)) continue;
      const palette = SURFACE_PALETTES[s];
      writePalette(baseRadiance, i, palette.base);
      writePalette(albedo, i, palette.albedo);
      writePalette(worldNormal, i, palette.normal);
      worldPosition[i] = f32ToF16(wx);
      worldPosition[i + 1] = f32ToF16(wy);
      worldPosition[i + 2] = palette.z;
      worldPosition[i + 3] = palette.one;
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

export const EMBED_CYCLE_LENGTH_MS = 1500;
export const EMBED_EVENT_DURATION_MS = 1200;
export function embedLoopState(elapsedMs) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Embed elapsed time must be finite and nonnegative');
  const cycle = Math.floor(elapsedMs / EMBED_CYCLE_LENGTH_MS);
  const phaseMs = elapsedMs - cycle * EMBED_CYCLE_LENGTH_MS;
  return Object.freeze({ cycle, ageMs: Math.min(EMBED_EVENT_DURATION_MS, phaseMs),
    inPauseGap: phaseMs >= EMBED_EVENT_DURATION_MS });
}

export function frameInput(age, variant, reducedMotion, cycle = 0) {
  if (!Number.isSafeInteger(cycle) || cycle < 0) throw new RangeError('Preview cycle must be a nonnegative safe integer');
  const ordinal = cycle === 0 ? '1' : `cycle-${cycle + 1}`;
  const causeId = `preview-rpg-cast-${ordinal}`;
  const sourceId = `preview-magic-rpg-${ordinal}`;
  const soundId = `preview-linked-sound-${ordinal}`;
  const attemptPhysical = cycle === 0 ? 'preview-attempt-1' : `preview-attempt-cycle-${cycle + 1}-1`;
  const attemptDefended = cycle === 0 ? 'preview-attempt-2' : `preview-attempt-cycle-${cycle + 1}-2`;
  const eClockStartedAt = 1000 + cycle * EMBED_CYCLE_LENGTH_MS;
  const f = {
    receipt: { schema: 'preview-rpg-use-r1', provenance: 'hypothetical-preview-only', causeId,
      roomId: 'preview-room', sessionGeneration: 1, actorId: 'preview-male-bot', soundId,
      localDurationMs: 1200, eClockRoomId: 'preview-room', eClockStartedAt,
      source: { id: sourceId, type: 'gunner-rpg', variant: 'normal', radius: 300, durationMs: 0,
        playerId: 'preview-male-bot', x: 500, y: 700, at: 1_800_000_000_000 + cycle * EMBED_CYCLE_LENGTH_MS, targetX: 200, targetY: 700 },
      attempts: [
        { id: attemptPhysical, causeId, position: { x: 260, y: 650 }, outcome: 'preview-physical-impact', visible: true },
        { id: attemptDefended, causeId, position: { x: 490, y: 530 }, outcome: 'preview-defended', visible: true }
      ],
      lightPositions: { [sourceId]: { x: 457, y: 624, z: 45 }, [attemptPhysical]: { x: 260, y: 650, z: 20 } }
    },
    poseLease: { identity: 'male-bot', direction: 'left', motionId: 'gunner-rpg', actorId: 'preview-male-bot',
      sourceEffectId: sourceId, causeId, ground: { x: 500, y: 700 },
      scale: 112 / 1180, poseHashes: APPROVED_POSE_HASHES },
    rawActorClock: eClockStartedAt + age, motionAgeMs: Math.min(age, 260),
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
  const controls = Object.fromEntries(['play','silent','pause','variant','reduced','sourceLight','receiverPass','observerSourceFeed','observerResponse','clock','clockValue'].map(id => [id, document.querySelector('#' + id)]));
  const verification = verifyMode(location.search);
  const embedded = new URLSearchParams(location.search).has('embed');
  let adapter, device, context, effectPass, audioContext = null, audioOwner = null, textures = null;
  let hdr = null, hdrView = null, observerHdr = null, observerHdrView = null, finalPipeline = null, finalUniform = null;
  let targetWidth = 0, targetHeight = 0, frameSerial = 0, targetGeneration = 0;
  const reviewAge = readReviewAge(location.search);
  let ready = false, running = false, dead = false, soundUnlocked = false, manualAge = typeof reviewAge === 'number' ? reviewAge : 0;
  let startedAt = 0, ageAtStart = manualAge, previousAge = -1, rafId = 0;
  let submittedFrames = 0, submittedEFrames = 0, lastSubmission = null;
  let embedElapsedMs = 0, embedLastNow = null, soundEligibleCycle = null;
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
    const owned = [hdr, observerHdr, ...Object.values(textures || {})].filter(Boolean);
    hdr = hdrView = observerHdr = observerHdrView = textures = null;
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
    document.querySelector("#scale").textContent = `Pose calibration 112 world units; projected reference ${(112 * canvas.getBoundingClientRect().width / 960).toFixed(2)} CSS px. Proxy body only; no H64/actual actor occlusion proof.`;
    context.configure({ device, format: navigator.gpu.getPreferredCanvasFormat(), alphaMode: 'opaque' });
    disposeTargets(true);
    const pixels = makeSurfacePixels(width, height);
    textures = Object.fromEntries(Object.entries(pixels).map(([name, data]) => [name, makeTexture(device, 'RPG preview physical ' + name, width, height, data)]));
    hdr = device.createTexture({ label: 'RPG R11 PH scene-radiance target', size: [width, height], format: FORMAT,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST });
    hdrView = hdr.createView();
    observerHdr = device.createTexture({ label: 'RPG R9 distinct observer-output target', size: [width, height], format: FORMAT,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT });
    observerHdrView = observerHdr.createView();
    targetWidth = width; targetHeight = height; targetGeneration++;
    device.queue.writeBuffer(finalUniform, 0, new Float32Array([width, height, 0, 0]));
    leaseText.textContent = `Same WebGPUDevice: yes\nScene radiance: rgba16float PH scene target ${width}×${height}\nObserver output: distinct rgba16float target; no read/write alias\nVisibility: actual host source presentation order; R11 fields are foreground overlay (world occlusion is not modeled), one transmission layer per actual field\nFrame ownership: one exact frameToken shared by plan, source mask, scene and observer leases\nPost sequence: physical-surface receiver → R11 impact PH → source-qualified R9 OBS → one final tone map → canvas\nControls: physical source-light inputs, receiver pass, OBS source feed and OBS response are independent\nSubmission: one encoder; exact R8 receipt plus R9 observer binding; queue-completion release\nVerification: audio hard-zero whenever URL contains verify`;
    if (hadTargets) draw();
  }
  async function init() {
    try {
      await assertPinnedPackage({ urls: [new URL('../rpg-e-r11.mjs', import.meta.url), new URL('../observer.mjs', import.meta.url), new URL('../r8/rpg-e.mjs', import.meta.url)] });
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
      if (embedded && reviewAge === null) {
        ageAtStart = 0; startedAt = performance.now(); embedLastNow = startedAt; running = true; draw();
      } else draw();
    } catch (error) { errors(`Preview could not initialize: ${error?.message || error}`); }
  }

  function currentAge(now = performance.now()) {
    if (typeof reviewAge === 'number') return reviewAge;
    if (embedded && running) return embedLoopState(advanceEmbedClock(now)).ageMs;
    return running ? Math.min(1200, ageAtStart + now - startedAt) : manualAge;
  }
  function advanceEmbedClock(now = performance.now()) {
    if (embedLastNow === null) embedLastNow = now;
    if (document.hidden) { embedLastNow = now; return embedElapsedMs; }
    embedElapsedMs += Math.max(0, now - embedLastNow);
    embedLastNow = now;
    return embedElapsedMs;
  }
  function currentCycle(now = performance.now()) {
    return embedded && running && reviewAge === null
      ? embedLoopState(advanceEmbedClock(now)).cycle : 0;
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
    if (embedded && soundEligibleCycle !== null && currentCycle() < soundEligibleCycle) return;
    const common = { verify: false, visible: !document.hidden, unlocked: true, muted: false, sensoryBlocked: false };
    audioOwner.admit(submission, 'launch', common);
    if (submission.endpoints.some(e => e.role === 'impact')) {
      const impact = submission.endpoints.find(e => e.role === 'impact');
      if (impact) audioOwner.admit(submission, 'impact', { ...common, endpointId: impact.id });
    }
  }
  function activateFromGesture() {
    if (verification) return { state: 'silent' };
    try {
      const resumed = ensureAudio();
      const finish = () => {
        soundUnlocked = Boolean(audioContext && audioContext.state === 'running');
        if (soundUnlocked && embedded) soundEligibleCycle = currentCycle() + 1;
        return { state: soundUnlocked ? 'active' : 'locked' };
      };
      return resumed && typeof resumed.then === 'function' ? resumed.then(finish, () => ({ state: 'locked' })) : finish();
    } catch (error) { return { state: 'unsupported', error: String(error?.message || error) }; }
  }
  const previewSnapshot = () => {
    const now = performance.now(), ageMs = currentAge(now), cycle = currentCycle(now);
    return Object.freeze({ ready, embedded, verification, candidateVersion: CANDIDATE_VERSION, cycle, ageMs,
      diagnostics: Object.freeze({ receiverSourceLight: controls.sourceLight.checked, receiverPass: controls.receiverPass.checked, observerSourceFeed: controls.observerSourceFeed.checked, observerResponse: controls.observerResponse.checked }),
      inPauseGap: embedded && running && ageMs >= EMBED_EVENT_DURATION_MS,
      submittedFrames, submittedEFrames, lastSubmission: lastSubmission && Object.freeze({ ...lastSubmission }),
      audio: Object.freeze({ unlocked: soundUnlocked, contextState: audioContext?.state || 'not-created',
        availableFromCycle: soundEligibleCycle }),
      error: diagnostic.dataset.error ? diagnostic.textContent : '' });
  };
  window.__rpgGalleryPreview = Object.freeze({ snapshot: previewSnapshot });
  window.__gallerySfx = Object.freeze({ activateFromGesture, snapshot: previewSnapshot,
    status: () => verification ? 'silent' : soundUnlocked ? 'active' : 'ready' });
  function makeObserverLease(result, frameToken, sourceCurrent) {
  if (!device || !hdr || !observerHdr || !textures || !Array.isArray(result.fields) || !result.fields.length)
    throw new Error('R9 needs actual scene, target and planned source fields.');
  const width = canvas.width, height = canvas.height, layers = result.fields.length;
  const capturedGeneration = targetGeneration, capturedScene = hdr, capturedSceneView = hdrView;
  const capturedOutput = observerHdr, capturedOutputView = observerHdrView, capturedSurfaces = textures;
  const visibilityTexture = device.createTexture({ label: 'R9 actual preview draw-order transmission',
    size: { width, height, depthOrArrayLayers: layers }, dimension: '2d', format: 'r8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
  // In this faithful R8 host every PH field is submitted as a foreground overlay after the
  // preview surfaces. This mask encodes that exact presentation order. It makes no claim
  // about physical world depth or body occlusion.
  const transmissionBytes = new Uint8Array(width * height * layers); transmissionBytes.fill(255);
  device.queue.writeTexture({ texture: visibilityTexture }, transmissionBytes,
    { offset: 0, bytesPerRow: width, rowsPerImage: height }, { width, height, depthOrArrayLayers: layers });
  const actualPlan = result;
  const lease = Object.freeze({ scope: 'actual-source-observer-inputs', device, frameToken,
    causeId: result.causeId, sourceEffectId: result.sourceEffectId, plan: actualPlan, width, height, fieldLayers: layers,
    sceneRadiance: capturedSceneView, transmission: visibilityTexture.createView({ dimension: '2d-array' }),
    sceneTexture: capturedScene, transmissionTexture: visibilityTexture, outputTexture: capturedOutput,
    visibilityProvenance: 'all PH fields are rendered as unoccluded foreground overlays; world occlusion not modeled',
    isCurrent: () => !dead && frameToken.frameId === frameSerial && sourceCurrent() &&
      targetGeneration === capturedGeneration && targetWidth === width && targetHeight === height &&
      hdr === capturedScene && hdrView === capturedSceneView && observerHdr === capturedOutput &&
      observerHdrView === capturedOutputView && textures === capturedSurfaces });
  return lease;
  }
  function draw() {
    if (!ready || dead) return;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    const now = performance.now();
    const age = currentAge(now);
    controls.clockValue.value = `${Math.floor(age)} ms`;
    const width = canvas.width, height = canvas.height;
    const cycle = currentCycle(now);
    const frame = frameInput(age, controls.variant.value, controls.reduced.checked, cycle);
    // Exact public plan input: disabling source illumination does not alter the
    // emitted E geometry or create a substitute source.
    if (!controls.sourceLight.checked) frame.receipt.lightPositions = {};
    const result = plan(frame);
    const isCurrent = () => { try { assertCurrent(result, frame); return !dead; } catch { return false; } };
    let prepared = null, observerLease = null;
    try {
      const encoder = device.createCommandEncoder({ label: 'RPG preview one-shot frame encoder' });
      const target = context.getCurrentTexture().createView();
      let recording = null;
      if (result.status === 'planned') {
        const frameToken = Object.freeze({ frameId: ++frameSerial, createdAt: now });
        prepared = effectPass.prepare(result, { viewport: { width, height }, camera: { x: 480, y: 500, zoom: width / 960 }, sourceCurrent: isCurrent, frameToken });
        const viewLease = { device, targetView: target, scope: 'physical-surface-inputs', isCurrent: () => !dead && isCurrent(),
          baseRadiance: textures.baseRadiance.createView(), albedo: textures.albedo.createView(),
          worldNormal: textures.worldNormal.createView(), worldPosition: textures.worldPosition.createView() };
        if (!validateSurfaceLease(device, viewLease, hdrView)) throw new Error('Missing, stale, aliased, or foreign-device physical material resources; no lighting substitute was run.');
        observerLease = makeObserverLease(result, frameToken, isCurrent);
        recording = prepared.record(encoder, observerHdrView, { lightingLease: controls.receiverPass.checked ? viewLease : null, observerLease, observerSourceOn: controls.observerSourceFeed.checked, observerOn: controls.observerResponse.checked, intensity: 1 });
        if (controls.receiverPass.checked && !recording.dynamicLightRecorded && result.lights.length) throw new Error('Surface-light pass did not record; full lighting preview is unavailable.');
        if (!controls.receiverPass.checked) status('Physical receiver diagnostic OFF; R9 observer remains independently recorded.');
        else if (!recording.dynamicLightRecorded) status('VFX preview only: this frame has no live explicit light source.');
        else if (age !== previousAge) status(`Submitted E clock ${Math.floor(age)} ms · R11 impact PH + retained R9 observer recorded · source feed ${controls.observerSourceFeed.checked ? 'ON' : 'OFF'} · response ${controls.observerResponse.checked ? 'ON' : 'OFF'} · foreground visibility parity only`);
      } else {
        encoder.copyTextureToTexture({ texture: textures.baseRadiance }, { texture: hdr }, [width, height]);
        if (age !== previousAge) status(`E clock ${Math.floor(age)} ms · authored field ended; preview surfaces remain`);
      }
      const resolve = encoder.beginRenderPass({ colorAttachments: [{ view: target, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
      const finalBind = device.createBindGroup({ layout: finalPipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: recording ? observerHdrView : hdrView }, { binding: 1, resource: { buffer: finalUniform } }
      ] });
      resolve.setPipeline(finalPipeline); resolve.setBindGroup(0, finalBind); resolve.draw(3); resolve.end();
      if (recording) {
        const receipt = effectPass.submit(recording);
        submittedEFrames++;
        lastSubmission = { causeId: receipt.causeId, sourceEffectId: receipt.sourceEffectId,
          soundId: receipt.soundId, roomId: receipt.roomId, sessionGeneration: receipt.sessionGeneration,
          ageMs: result.age, cycle, submitted: effectPass.isSubmitted(receipt), candidateVersion: receipt.candidateVersion, observerVersion: receipt.observerVersion, observerRecorded: receipt.observerRecorded, observerEnabled: receipt.observerEnabled, observerSourceEnabled: receipt.observerSourceEnabled, frameTokenId: frameSerial };
        prepared.release();
        if (observerLease) { const mask = observerLease.transmissionTexture; Promise.resolve(receipt.completion).then(() => mask.destroy(), () => mask.destroy()); observerLease = null; }
        admitSound(receipt);
      } else device.queue.submit([encoder.finish()]);
      submittedFrames++;
      previousAge = age;
    } catch (error) {
      prepared?.release(); observerLease?.transmissionTexture?.destroy(); running = false; errors(`Preview frame stopped: ${error?.message || error}`); return;
    }
    if (running && !embedded && age >= 1200) { running = false; manualAge = 1200; }
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
  controls.sourceLight.addEventListener('change', () => { previousAge = -1; draw(); });
  controls.receiverPass.addEventListener('change', () => { previousAge = -1; draw(); });
  controls.observerSourceFeed.addEventListener('change', () => { previousAge = -1; draw(); });
  controls.observerResponse.addEventListener('change', () => { previousAge = -1; draw(); });
  document.addEventListener('visibilitychange', () => {
    if (embedded && running) embedLastNow = performance.now();
    if (document.hidden) {
      soundUnlocked = false;
      if (embedded) soundEligibleCycle = currentCycle() + 1;
      if (audioContext?.state === 'running') audioContext.suspend();
    }
  });
  window.addEventListener('beforeunload', () => { running = false; audioOwner?.destroy(); audioContext?.close(); effectPass?.destroy(); disposeTargets(); });
  if (verification) { controls.play.hidden = true; controls.silent.textContent = 'Play · audio hard zero'; }
  if (embedded) {
    document.documentElement.classList.add('embed');
    for (const control of [controls.play, controls.silent, controls.pause]) control.hidden = true;
  }
  init();
}

if (typeof document !== 'undefined') install();
