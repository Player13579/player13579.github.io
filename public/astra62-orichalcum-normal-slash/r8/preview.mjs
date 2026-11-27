import {fixtureEvent, lifetimeMs, makeCue, makeGate, version} from './slash.mjs';

const canvas = document.querySelector('canvas');
const button = name => document.getElementById(name);
const status = button('state'), receipt = button('receipt');
const verify = new URL(location.href).searchParams.has('verify');
const accept = makeGate();
const choice = button('fixture');
const reduced = button('reduced'), sound = button('sound');
reduced.checked = matchMedia('(prefers-reduced-motion: reduce)').matches;
sound.checked = !verify;
sound.disabled = verify;
let device, context, pipeline, uniform, bind, format;
let active = null, serial = 0, generation = 0, raf = 0, rendering = false, dirty = true, disposed = false;
let audio, buffer, sounding;
let fault = false;
const dimensions = {width: 0, height: 0, scale: 1};
function silence() {
  if (sounding) {
    try { sounding.stop(); } catch {}
    sounding.disconnect(); sounding = null;
  }
}
function prepareAudio() {
  if (verify || !sound.checked) return;
  try {
    if (!audio) {
      audio = new AudioContext();
      const samples = makeCue(audio.sampleRate);
      buffer = audio.createBuffer(1, samples.length, audio.sampleRate);
      buffer.copyToChannel(samples, 0);
    }
    if (audio.state !== 'running') audio.resume().catch(() => {});
  } catch { sound.checked = false; }
}
function soundAt(cause, age) {
  if (cause.audioStarted || !cause.audioEnabled || cause !== active || verify ||
      !sound.checked || !audio || audio.state !== 'running' || !buffer || age >= buffer.duration * 1000) return;
  cause.audioStarted = true;
  try {
    const src = audio.createBufferSource();
    src.buffer = buffer;
    src.connect(audio.destination);
    src.onended = () => { src.disconnect(); if (sounding === src) sounding = null; };
    sounding = src;
    src.start(0, Math.max(0,age / 1000));
  } catch { silence(); }
}
function setSize() {
  const rect = canvas.getBoundingClientRect();
  const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
  if (!(rect.width > 0 && rect.height > 0 && cssW > 0 && cssH > 0)) return false;
  const limit = device.limits.maxTextureDimension2D;
  const dpr = Math.min(devicePixelRatio || 1, limit / cssW, limit / cssH);
  const width = Math.max(1,Math.round(cssW * dpr)), height = Math.max(1,Math.round(cssH * dpr));
  if (width !== dimensions.width || height !== dimensions.height) {
    canvas.width = width; canvas.height = height;
    context.configure({device, format, alphaMode:'opaque'});
    dimensions.width = width; dimensions.height = height;
  }
  dimensions.scale = Math.max(0.1,Math.min(width / 292, height / 135, dpr));
  return true;
}
function requestFrame() {
  dirty = true;
  if (!pipeline || raf || rendering || disposed || fault || document.hidden) return;
  raf = requestAnimationFrame(() => { raf = 0; draw().catch(fail); });
}
async function draw() {
  if (disposed || fault || document.hidden || !setSize()) return;
  dirty = false; rendering = true;
  try {
    const cause = active, gen = generation;
    const age = cause ? Math.max(0,performance.now() - cause.start) : 0;
    const live = Boolean(cause && age < lifetimeMs);
    device.queue.writeBuffer(uniform,0,new Float32Array([
      dimensions.width, dimensions.height, age, dimensions.scale,
      reduced.checked ? 1 : 0, live ? 1 : 0, cause?.facing ?? (choice.value==='left' ? -1 : 1), choice.value==='private' ? 0 : 1
    ]));
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({colorAttachments:[{
      view:context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'
    }]});
    pass.setPipeline(pipeline); pass.setBindGroup(0,bind); pass.draw(3); pass.end();
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    if (disposed || gen !== generation || document.hidden || fault) return;
    receipt.textContent = JSON.stringify({version, serial:cause?.id ?? null, ageMs:Math.round(age),
      mode:live ? 'playing' : 'idle', completed:true, width:dimensions.width,height:dimensions.height,
      scale:dimensions.scale,verify},null,2);
    if (live) {
      soundAt(cause, performance.now() - cause.start);
      dirty = true;
    } else if (cause) {
      active = null; silence(); status.textContent = '再生終了';
    }
  } finally { rendering = false; if (dirty) requestFrame(); }
}
function stop() {
  generation++; active = null; silence();
  status.textContent = '待機中'; requestFrame();
}
function fail(error) {
  if (disposed || fault) return;
  fault = true; active = null; generation++; silence();
  button('play').disabled = true; button('stop').disabled = true;
  status.textContent = '描画を開始・継続できません。' + String(error?.message ?? error).slice(0,240);
}
function dispose() {
  if (disposed) return;
  disposed = true; generation++; active = null; silence();
  cancelAnimationFrame(raf); observer.disconnect();
  audio?.close().catch(() => {});
  context?.unconfigure(); uniform?.destroy(); device?.destroy();
}
button('play').addEventListener('click',() => {
  if (fault || disposed || !pipeline || document.hidden) return;
  const id = ++serial;
  const event = accept(fixtureEvent(choice.value,id));
  if (!event) {
    stop(); status.textContent='この条件では通常斬撃を再生しません。'; return;
  }
  silence(); prepareAudio(); generation++;
  active = {...event,start:performance.now(),audioEnabled:!verify && sound.checked,audioStarted:false};
  status.textContent = '通常斬撃を再生中'; requestFrame();
});
button('stop').addEventListener('click',stop);
choice.addEventListener('change',stop);
sound.addEventListener('change',() => { if (active) active.audioEnabled = false; silence(); });
reduced.addEventListener('change',requestFrame);
const observer = new ResizeObserver(requestFrame);
observer.observe(canvas);
document.addEventListener('visibilitychange',() => {
  if (document.hidden) { stop(); cancelAnimationFrame(raf); raf=0; } else requestFrame();
});
window.addEventListener('pagehide',dispose,{once:true});
async function start() {
  const adapter = await navigator.gpu?.requestAdapter();
  if (!adapter) throw new Error('WebGPUが利用できません。');
  const acquired = await adapter.requestDevice();
  if (disposed) { acquired.destroy(); return; }
  device = acquired;
  device.lost.then(info => { if (!disposed) fail(info.message || 'GPU device lost'); });
  device.addEventListener('uncapturederror',event => fail(event.error));
  context = canvas.getContext('webgpu');
  if (!context) throw new Error('WebGPU表示面を取得できません。');
  format=navigator.gpu.getPreferredCanvasFormat();
  const response=await fetch(new URL('./effect.wgsl?rev=ori-slash-r8',import.meta.url));
  if (!response.ok) throw new Error('シェーダー読み込み失敗');
  const code=await response.text();
  if (disposed || fault) return;
  const shader=device.createShaderModule({code});
  const info=await shader.getCompilationInfo();
  const errors=info.messages.filter(m => m.type==='error');
  if (errors.length) throw new Error(errors.map(m => m.lineNum+' '+m.message).join(' / '));
  const ready=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:shader,entryPoint:'vs'},
    fragment:{module:shader,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
  if (disposed || fault) return;
  uniform=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
  bind=device.createBindGroup({layout:ready.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
  pipeline=ready;
  await draw();
  if (disposed || fault) return;
  status.textContent='準備完了';
  button('play').disabled=false; button('stop').disabled=false;
}
start().catch(fail);
