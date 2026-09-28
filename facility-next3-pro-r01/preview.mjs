import { FACILITIES, LIFE_MS, MASK_SIZE } from './src/contract.mjs';
import { FacilityRuntime } from './src/runtime.mjs';
import { GPUHub, FacilityRenderer } from './src/renderer.mjs';

const params = new URLSearchParams(location.search);
const verify = params.has('verify');
if (verify) document.body.classList.add('verify');
const gallery = document.querySelector('#gallery');
const scope = { roomId: 'facility-gallery', matchId: 'facility-next3-pro-r01', epoch: 0 };
let disposed = false, raf = 0, cycle = 0, cycleStart = performance.now(), hub;
const panels = [];
const masks = new Uint8Array(MASK_SIZE * MASK_SIZE * 4);
for (let i = 0; i < masks.length; i += 4) { masks[i] = 255; masks[i + 3] = 255; }
const masksFor = () => masks;
const runtime = new FacilityRuntime({ scope, clock: () => performance.now(), audio: null });

for (const facility of FACILITIES) for (const tone of ['dark', 'light']) {
  const figure = document.createElement('figure');
  figure.innerHTML = `<figcaption><strong>${facility.name}</strong><small>${facility.objectId}</small></figcaption><div class="field ${tone}"><canvas aria-label="${facility.name}, ${tone} field, H64 WebGPU preview"></canvas><span class="tone">${tone.toUpperCase()}</span><span class="h64" aria-hidden="true"></span></div>`;
  gallery.append(figure);
  panels.push({ facility, tone, field: figure.querySelector('.field'), canvas: figure.querySelector('canvas'), renderer: null });
}

function emitCycle(at) {
  cycle++;
  for (let i = 0; i < FACILITIES.length; i++) {
    const f = FACILITIES[i];
    runtime.receiveMagic({
      type: 'magicEffect', kind: f.kind, effectKind: f.effectKind,
      objectId: f.objectId, objectCausalId: `gallery:${cycle}:${f.index}`,
      x: f.x, y: f.y, playerId: 'gallery-preview'
    }, { ...scope, receivedAt: at });
  }
}

function render() {
  if (disposed) return;
  const now = performance.now();
  if (now - cycleStart >= LIFE_MS + 650) { cycleStart = now; emitCycle(now); }
  const snapshot = runtime.snapshot(now);
  for (const panel of panels) {
    const f = panel.facility, rect = panel.field.getBoundingClientRect();
    const view = { cameraX: f.x, cameraY: f.y, width: rect.width, height: rect.height, zoom: rect.width / 240 };
    panel.renderer?.render(snapshot.filter(e => e.objectId === f.objectId), view, { dpr: Math.min(2, devicePixelRatio || 1) });
  }
  if ((panels[0].renderer?.stats.frames ?? 0) % 60 === 0) {
    const frames = panels.map(p => p.renderer?.stats.frames ?? 0);
    document.title = `Facility E 03 r0.1 — ChatGPT Pro | GPU ready | frames ${frames.join('/')}`;
  }
  raf = requestAnimationFrame(render);
}

async function dispose() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(raf);
  runtime.dispose();
  for (const p of panels) p.renderer?.dispose();
  hub?.dispose();
}
window.addEventListener('pagehide', dispose, { once: true });
window.facilityNext3Preview = { get status() {
  return { verify, disposed, gpu: !!hub && !hub.lost && !hub.disposed,
    compilation: hub?.compilation ?? null,
    frames: panels.map(p => p.renderer?.stats.frames ?? 0),
    drawnEvents: panels.map(p => p.renderer?.stats.drawnEvents ?? 0),
    diagnostics: hub?.errors ?? [] };
}, dispose };

emitCycle(cycleStart);
try {
  hub = await GPUHub.create();
  if (!disposed) {
    for (const panel of panels) panel.renderer = new FacilityRenderer(panel.canvas, hub, { masksFor });
    render();
  }
} catch (error) {
  console.error('Facility WebGPU preview failed', error);
  document.title = `Facility E 03 r0.1 — ChatGPT Pro | GPU error: ${String(error).slice(0, 100)}`;
  gallery.replaceChildren();
  gallery.textContent = 'WebGPU unavailable';
}
