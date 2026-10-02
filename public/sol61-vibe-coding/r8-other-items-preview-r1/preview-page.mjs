import { VibeR2Host, DURATION_E_MS, PROGRAMS } from './runtime-host.mjs';
import { TARGETS } from './targets.mjs';
import { HeldAgeFixtureResume, fixtureCauseDue } from './resume-host-adapter.mjs';

const canvas = document.querySelector('#preview');
const startup = document.querySelector('#startup-status');
const errorOutput = document.querySelector('#error');
const status = document.querySelector('#status');
const select = document.querySelector('#variant');
const rateSelect = document.querySelector('#rate');
const motionSelect = document.querySelector('#motion');
const audioButton = document.querySelector('#audio');
const verify = new URLSearchParams(location.search).has('verify');
audioButton.disabled=verify;
if(verify) audioButton.textContent='Audio OFF · verify mode';
const durationMs = DURATION_E_MS;
let host = null, device = null, atlasTexture = null, raf = 0, closed = false;
const fixtureParams = new URLSearchParams(location.search);
const frozenAge = verify && fixtureParams.has('age') ? Number(fixtureParams.get('age')) : null;
let selectedVariant = fixtureParams.get('variant') || Object.keys(PROGRAMS)[0];
let nextVariant = selectedVariant, cause = null, cycle = 0, nextStartE = 0;
let lastFrameAt = 0, firstSubmit = false, basePipeline = null, owner, basis, body, context, idlePipeline, idleUniform, idleLayout;
let renderingFrames = 0, diagnosticErrors = [], acceptedCauses = 0, retiredCauses = 0;
const visibleFrameClock={rafCount:0,firstTimestamp:null,lastTimestamp:null,lastWallDeltaMs:0,totalWallDeltaMs:0,
  activeRenderFrames:0,idleRenderFrames:0,hiddenRafCount:0};
const heldAgeResume = frozenAge === null ? null : new HeldAgeFixtureResume({ dwellEms: 300 });

window.__vibeDiagnostics = { phase:'initializing', errors:diagnosticErrors };
window.__vibeSnapshotDiagnostics = () => {
  const statusSnapshot=host ? {...host.status} : {phase:window.__vibeDiagnostics.phase,submissions:0,completedProofs:0,lastError:null};
  return {
    status:statusSnapshot,
    resources:host ? {targets:host.targets.size,textures:host.textures.size,buffers:host.buffers.size,
      inflight:host.inflight.size,retirements:host.retirements.size,audioNodes:host.audioNodes.size} :
      {targets:0,textures:0,buffers:0,inflight:0,retirements:0,audioNodes:0},
    errors:diagnosticErrors.slice(-8),selectedVariant,ageEms:window.__vibeDiagnostics.ageEms ?? null,
    currentCauseKey:typeof cause?.key==='string'?cause.key.slice(0,100):null,
    currentCauseId:typeof cause?.raw?.id==='string'?cause.raw.id.slice(0,100):null,
    ownerClockEms:Number.isFinite(owner?.eVisualTime)?owner.eVisualTime:null,acceptedCauses,retiredCauses,
    visibleFrameClock:{...visibleFrameClock},
    currentness:!!owner && !closed && owner.currentVisible && owner.roomId==='vibe-r7-gallery-fixture' &&
      owner.identityGeneration==='white-hood-front-idle-v1',verifyAudioHardZero:verify,
    audioAllowed:host?.audioAllowed ?? false,reducedMotion:motionSelect.value==='reduced',renderingFrames
  };
};
function refreshDiagnostics(extra={}) {
  const statusSnapshot=host ? {...host.status} : {phase:window.__vibeDiagnostics.phase,submissions:0,completedProofs:0,lastError:null};
  window.__vibeDiagnostics={...window.__vibeDiagnostics,...extra,phase:statusSnapshot.phase,
    submissions:statusSnapshot.submissions,completedProofs:statusSnapshot.completedProofs,
    lastError:statusSnapshot.lastError,renderingFrames,
    acceptedCauses,retiredCauses,ownerClockEms:Number.isFinite(owner?.eVisualTime)?owner.eVisualTime:null,
    currentCauseKey:typeof cause?.key==='string'?cause.key.slice(0,100):null,
    currentCauseId:typeof cause?.raw?.id==='string'?cause.raw.id.slice(0,100):null,
    visibleFrameClock:{...visibleFrameClock},
    resources:host ? {targets:host.targets.size,textures:host.textures.size,buffers:host.buffers.size,
      inflight:host.inflight.size,retirements:host.retirements.size,audioNodes:host.audioNodes.size} :
      {targets:0,textures:0,buffers:0,inflight:0,retirements:0,audioNodes:0}};
}

function phase(message) { startup.hidden = false; startup.dataset.failed = 'false'; startup.textContent = message; window.__vibeDiagnostics={...window.__vibeDiagnostics,phase:message}; }
function fail(error) {
  if(errorOutput) { errorOutput.style.display='block'; errorOutput.textContent=`Vibe r7: ${error?.name || 'Error'}: ${error?.message || error}`; }
  if (closed) return;
  closed = true; if (raf) cancelAnimationFrame(raf);
  startup.hidden = false; startup.style.display='block'; startup.dataset.failed = 'true';
  startup.textContent = `Vibe r7 preview failed: ${error?.name || 'Error'}: ${error?.message || error}`;
  status.textContent = `Stopped in ${host?.status?.phase || 'startup'}; no successful frame is claimed.`;
  host?.dispose();
}
window.addEventListener('error', event => fail(event.error || new Error(event.message || 'Module/startup error')));
window.addEventListener('unhandledrejection', event => fail(event.reason || new Error('Unhandled startup rejection')));
if(frozenAge !== null && (!Number.isFinite(frozenAge) || frozenAge < 0 || frozenAge >= durationMs)) throw new RangeError('Frozen fixture age must be in 0..1199 E-ms');
if(!PROGRAMS[selectedVariant]) throw new RangeError('Unknown fixture variant');

for (const variant of Object.keys(PROGRAMS)) {
  if (!TARGETS[variant]) throw new Error(`Missing producer target description for ${variant}`);
  const option = document.createElement('option'); option.value = variant;
  option.textContent = `${variant} — ${TARGETS[variant]}`; select.append(option);
}
select.value = selectedVariant;
audioButton.disabled = verify;
audioButton.textContent = verify ? 'Audio OFF · verify mode' : 'Enable sound';

select.addEventListener('change', () => {
  selectedVariant = select.value; nextVariant = selectedVariant;
  if (!owner || !host) { status.textContent = `Selected target: ${TARGETS[nextVariant]}`; return; }
  retireCause('variant-change');
  nextStartE = owner.eVisualTime + 300;
  status.textContent = `All-off dwell · 300 actor E-ms before the next fixture receipt. Target: ${TARGETS[nextVariant]}`;
});
rateSelect.addEventListener('change', () => {
  if (!owner) return;
  owner.playbackRate = Number(rateSelect.value);
  if (cause) host.setPlaybackRate(cause.key, owner.playbackRate);
});
motionSelect.addEventListener('change', () => { status.dataset.motion = motionSelect.value; });
audioButton.addEventListener('click', async () => {
  if (verify || !host) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('Web Audio is unavailable');
    host.audioContext ||= new Audio({ latencyHint: 'interactive' });
    await host.audioContext.resume();
    audioButton.textContent = host.audioContext.state === 'running' ? 'Sound enabled' : 'Enable sound';
  } catch (error) { status.textContent = `Sound is unavailable: ${error.message || error}`; }
});

function configureSize() {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  // The presentation bitmap maps to the content box; borders are not GPU pixels.
  const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  return { width, height, dpr };
}

function makeBasePipeline(gpu) {
  const bg = fixtureParams.get('background') === 'light' ? '.64,.70,.76' : '.009,.014,.019';
  const module = gpu.createShaderModule({ label: 'Vibe r7 neutral linear preview base', code: `
struct Out { @location(0) scene:vec4f, @location(1) source:vec4f };
@vertex fn vs(@builtin(vertex_index)i:u32)->@builtin(position)vec4f {
 let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3)); return vec4f(p[i],0,1);
}
@fragment fn fs()->Out { var o:Out; o.scene=vec4f(${bg},1); o.source=vec4f(0); return o; }
` });
  return gpu.createRenderPipeline({
    label: 'Vibe r7 neutral linear background', layout: 'auto', vertex: { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: 'fs', targets: [{ format: 'rgba16float' }, { format: 'rgba16float' }] },
    primitive: { topology: 'triangle-list' }
  });
}

function makeCause() {
  cycle++;
  const id = `gallery-fixture-${cycle}`;
  const raw = { type: 'action-vibe-coding', id, at: performance.timeOrigin + performance.now(),
    x: 0, y: 0, radius: 145, durationMs: 0, playerId: owner.id, targetId: '', viewerId: '', variant: nextVariant };
  const accepted = host.accept(raw, owner, basis, 'gallery-fixture');
  if (!accepted) throw new Error('Gallery fixture identity was already spent');
  acceptedCauses++;
  cause = { key: accepted.key, raw, startE: owner.eVisualTime, variant: nextVariant };
  nextStartE = cause.startE + durationMs + 300;
  status.textContent = `Fixture cause ${id} · ${raw.variant} · ${TARGETS[raw.variant]} · 1200 actor E-ms`;
}

function retireCause(_reason) {
  if(!cause || !host || !host.causes?.active?.has(cause.key)) { cause=null; return false; }
  host.cancel(cause.key);retiredCauses++;cause=null;refreshDiagnostics();return true;
}

function recordBase(pass, { viewport }) {
  pass.setPipeline(basePipeline);
  pass.setScissorRect(0, 0, viewport[0], viewport[1]);
  pass.draw(3, 1);
}

function makeIdlePipeline(gpu,format) {
  const code=`
struct Frame { viewport:vec2f, origin:vec2f, axisX:vec2f, axisY:vec2f, crop:vec4f, misc:vec4f };
@group(0) @binding(0) var<uniform> u:Frame;
@group(0) @binding(1) var atlas:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
struct V { @builtin(position) p:vec4f,@location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index)i:u32)->V {
 let q=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1))[i];
 let p=u.origin+q.x*u.axisX+q.y*u.axisY; var v:V;v.p=vec4f(p/u.viewport*vec2f(2,-2)+vec2f(-1,1),0,1);v.uv=u.crop.xy+q*u.crop.zw;return v;
}
fn encode(x:vec3f)->vec3f { return select(x*12.92,1.055*pow(x,vec3f(1.0/2.4))-vec3f(.055),x>vec3f(.0031308)); }
@fragment fn fs(v:V)->@location(0) vec4f {
 let c=textureSampleLevel(atlas,samp,v.uv,0);return vec4f(encode(c.rgb)*c.a,c.a);
}`;
  idleLayout=gpu.createBindGroupLayout({entries:[{binding:0,visibility:3,buffer:{type:'uniform'}},{binding:1,visibility:2,texture:{sampleType:'float'}},{binding:2,visibility:2,sampler:{type:'filtering'}}]});
  idleUniform=gpu.createBuffer({label:'Gallery fixture idle actual body',size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const module=gpu.createShaderModule({label:'Gallery fixture idle actual body',code});
  return gpu.createRenderPipeline({layout:gpu.createPipelineLayout({bindGroupLayouts:[idleLayout]}),vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]}});
}
function clearOutput() {
  if(!device || !context || !idlePipeline || !body) return;
  const u=new Float32Array(16);u.set([canvas.width,canvas.height,...body.originPx,...body.axisX,...body.axisY,...body.crop,1]);
  device.queue.writeBuffer(idleUniform,0,u);
  const bg=fixtureParams.get('background') === 'light' ? {r:.821,g:.854,b:.886,a:1} : {r:.0932,g:.1232,b:.1473,a:1};
  const encoder=device.createCommandEncoder({label:'Vibe r7 actual body, E all-off'});
  const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:bg}]});
  const bind=device.createBindGroup({layout:idleLayout,entries:[{binding:0,resource:{buffer:idleUniform}},{binding:1,resource:body.view},{binding:2,resource:body.sampler}]});
  pass.setPipeline(idlePipeline);pass.setBindGroup(0,bind);pass.draw(6);pass.end();device.queue.submit([encoder.finish()]);
  renderingFrames++;visibleFrameClock.idleRenderFrames++;
  refreshDiagnostics({idleFrame:true,ageEms:null,currentness:false,selectedVariant,verifyAudioHardZero:verify,
    audioAllowed:host?.audioAllowed ?? false,reducedMotion:motionSelect.value==='reduced'});
}

function frame(now) {
  if (closed) return;
  raf = requestAnimationFrame(frame);
  if (document.hidden) { visibleFrameClock.hiddenRafCount++;lastFrameAt = now;return; }
  visibleFrameClock.rafCount++;visibleFrameClock.firstTimestamp??=now;
  visibleFrameClock.lastTimestamp=now;
  if (!host || host.status.phase === 'fatal' || host.status.phase === 'device-lost') {
    if (host && host.status.phase !== 'ready' && host.status.phase !== 'submitted') fail(new Error(host.status.lastError || host.status.phase));
    return;
  }
  const { width, height, dpr } = configureSize();
  const wallDelta = lastFrameAt ? Math.max(0, now - lastFrameAt) : 0;
  visibleFrameClock.lastWallDeltaMs=wallDelta;visibleFrameClock.totalWallDeltaMs+=wallDelta;
  lastFrameAt = now;
  owner.playbackRate = Number(rateSelect.value);
  owner.eVisualTime += frozenAge === null ? wallDelta * owner.playbackRate : 0;
  if (!cause && fixtureCauseDue({ frozenAge, ownerE: owner.eVisualTime, nextStartE,
    deltaEms: wallDelta * owner.playbackRate, visible: !document.hidden, resume: heldAgeResume })) makeCause();
  if (!cause) { clearOutput(); return; }
  if(frozenAge !== null) owner.eVisualTime = cause.startE + frozenAge;
  const age = owner.eVisualTime - cause.startE;
  if (age >= durationMs) {
    clearOutput();
    retireCause('natural-expiry'); // Retire the visual exactly at 1200 E-ms.
    status.textContent = `All-off dwell · next fixture may start after 300 actor E-ms.`;
    return;
  }
  const worldToPixels = (64 / 70.875) * dpr;
  const actorAnchor = [width * .5, height * .55];
  const displayGround = [actorAnchor[0], actorAnchor[1] + 31 * worldToPixels];
  const spriteScale = .315 * worldToPixels;
  body = { ...body, originPx: [actorAnchor[0] - 128 * spriteScale,
    actorAnchor[1] + (31 - 240 * .315) * worldToPixels],
    axisX: [256 * spriteScale, 0], axisY: [0, 256 * spriteScale], opacity: 1 };
  const isCurrent=()=>!closed && owner.currentVisible && owner.roomId==='vibe-r7-gallery-fixture' && owner.identityGeneration==='white-hood-front-idle-v1';
  try {
    const result = host.recordCell({ key: cause.key, owner, basis, origin: 'gallery-fixture',
      width, height, rect: [0, 0, width, height], cellRect: [0, 0, width, height],
      originPx: displayGround, cameraScale: worldToPixels, body,
      sourceOn: !(verify && fixtureParams.get('source') === 'off'), observerOn: !(verify && fixtureParams.get('obs') === 'off'),
      receiverOn: !(verify && fixtureParams.get('near') === 'off'),
      reducedMotion: motionSelect.value === 'reduced', drawBase: recordBase,
      currentness: isCurrent });
    renderingFrames++;visibleFrameClock.activeRenderFrames++;
    refreshDiagnostics({ageEms:result.ageEms,selectedVariant,currentness:isCurrent(),
      verifyAudioHardZero:verify,audioAllowed:host.audioAllowed,reducedMotion:motionSelect.value==='reduced',idleFrame:false});
    if (result.submitted && !firstSubmit) {
      firstSubmit = true; startup.hidden = true; startup.style.display='none';
    }
    if (result.proof) result.proof.then(proof => {
      if (proof.accepted && proof.cues?.length) status.textContent += ` · cue ${proof.cues.join(', ')}`;
    }).catch(fail);
  } catch (error) { fail(error); }
}

async function start() {
  phase('Loading the registered white-hood front idle atlas…');
  const atlasResponse = await fetch('./actor-white-hood-front-atlas.png');
  if (!atlasResponse.ok) throw new Error(`Registered actor atlas load failed (${atlasResponse.status})`);
  const bitmap = await createImageBitmap(await atlasResponse.blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  if (bitmap.width !== 768 || bitmap.height !== 768) throw new Error(`Actor atlas dimensions changed: ${bitmap.width}×${bitmap.height}`);
  if (!navigator.gpu) throw new Error('WebGPU is unavailable');
  phase('Requesting WebGPU adapter…');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No WebGPU adapter is available');
  phase('Creating WebGPU device and linear preview targets…');
  device = await adapter.requestDevice();
  window.__vibeDiagnostics = {adapter: {vendor:adapter.info?.vendor,architecture:adapter.info?.architecture,device:adapter.info?.device,description:adapter.info?.description}, userAgent:navigator.userAgent, errors:[], phase:'initializing'};
  device.addEventListener('uncapturederror',event=>{ diagnosticErrors.push(event.error?.message || 'Uncaptured WebGPU error'); diagnosticErrors=diagnosticErrors.slice(-8); refreshDiagnostics({errors:diagnosticErrors.slice()}); });
  const size = configureSize(); const ctx = canvas.getContext('webgpu');
  if (!ctx) throw new Error('Could not create the WebGPU canvas context');
  const format = navigator.gpu.getPreferredCanvasFormat();
  idlePipeline = makeIdlePipeline(device,format);
  const textureUsage = (GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT);
  atlasTexture = device.createTexture({ label: 'Registered white-hood front idle atlas', size: [bitmap.width, bitmap.height, 1],
    format: 'rgba8unorm-srgb', usage: textureUsage });
  device.queue.copyExternalImageToTexture({ source: bitmap }, { texture: atlasTexture, premultipliedAlpha: false }, [bitmap.width, bitmap.height]);
  bitmap.close();
  basePipeline = makeBasePipeline(device);
  context = ctx;
  host = new VibeR2Host({ device, context: ctx, canvas, format, onError: error => {
    if(errorOutput) { errorOutput.style.display='block'; errorOutput.textContent=`Vibe r7: ${error?.name || 'Error'}: ${error?.message || error}`; }
    startup.hidden = false; startup.style.display='block'; startup.dataset.failed = 'true';
    startup.textContent = `WebGPU host error: ${error?.name || 'Error'}: ${error?.message || error}`;
  } });
  phase('Compiling r7 pipelines…'); await host.ready;
  owner = { id: 'vibe-preview-white-hood', roomId: 'vibe-r7-gallery-fixture', identityGeneration: 'white-hood-front-idle-v1',
    eVisualTime: 0, currentVisible: true, playbackRate: Number(rateSelect.value) };
  basis = { generation: 'white-hood-front-idle-h64-registration-v1', hWorld: 70.875 };
  const sampler = device.createSampler({ addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge', magFilter: 'linear', minFilter: 'linear' });
  body = { view: atlasTexture.createView(), sampler, originPx: [0, 0], axisX: [1, 0], axisY: [0, 1],
    crop: [0, 0, 1 / 3, 1 / 3], opacity: 1 };
  if (verify) { host.audioAllowed = false; startup.textContent = 'Ready · verify mode keeps audio OFF; waiting for first submitted frame…'; }
  else startup.textContent = 'Ready · waiting for first submitted frame…';
  lastFrameAt = 0; raf = requestAnimationFrame(frame);
}

window.addEventListener('pagehide', () => {
  closed = true; if (raf) cancelAnimationFrame(raf);
  host?.dispose();
  host?.audioContext?.close().catch(()=>{});
  try { idleUniform?.destroy(); } catch {}
  try { atlasTexture?.destroy(); } catch {}
  try { device?.destroy(); } catch {}
}, { once: true });
document.addEventListener('visibilitychange', () => {
  if (!owner || !host) return;
  if (document.hidden) {
    owner.currentVisible = false;
    retireCause('visibility-hidden');
    heldAgeResume?.hiddenCancellation();
    nextStartE = owner.eVisualTime + 300;
    status.textContent = 'Preview hidden; fixture identity canceled. A fresh cause will wait for 300 visible actor E-ms.';
  } else {
    owner.currentVisible = true;
    lastFrameAt = 0;
  }
});

start().catch(fail);
