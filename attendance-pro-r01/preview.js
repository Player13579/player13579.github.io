import { CONTRACT, AttendanceController, AttendanceRenderer, requestWebGPU, srgbViewFormat } from './src/index.js';
import { DURATION_MS, DEMO_CYCLE_MS } from './src/timeline.js';

const canvas = document.getElementById('attendance-preview');
const preview = { status: 'initializing', frames: 0, cycles: 0, visibleFrames: 0,
  emptyFrames: 0, errors: [], renderer: null, lastStats: null };
window.__attendancePreview = preview;
let device, context, renderer, outputFormat, controller, epoch = 0, currentCycle = -1;
let running = true;

function fail(error) {
  running = false;
  preview.status = 'failed';
  preview.errors.push(String(error?.stack || error));
  document.documentElement.dataset.attendancePreview = 'failed';
  console.error(error);
}

function beginCycle(now, born, cycle) {
  controller.ingest({ ...CONTRACT, sourceId: `gallery-attendance-${cycle}`,
    playerId: 'gallery-preview-actor', world: { x: 0, y: 0 }, target: null },
    { receivedAtGameMs: now, eventAtGameMs: born });
  currentCycle = cycle;
  preview.cycles += 1;
}

function render(now) {
  if (!running) return;
  try {
    const cycle = Math.floor((now - epoch) / DEMO_CYCLE_MS);
    const born = epoch + cycle * DEMO_CYCLE_MS;
    if (cycle !== currentCycle) beginCycle(now, born, cycle);
    const events = controller.update(now, { listener: { x: 0, y: 0 } });
    const encoder = device.createCommandEncoder({ label: 'Attendance E gallery preview' });
    renderer.encode({ encoder, targetView: context.getCurrentTexture().createView({ format: outputFormat }),
      width: canvas.width, height: canvas.height, events,
      camera: { x: 0, y: 0, pixelsPerWorldUnit: 64 * 6.25 / CONTRACT.radius },
      background: 'dark', postEffects: true, reducedMotion: false });
    device.queue.submit([encoder.finish()]);
    preview.frames += 1;
    preview.lastStats = renderer.lastStats;
    if (renderer.lastStats.markerCount > 0) preview.visibleFrames += 1;
    else preview.emptyFrames += 1;
    preview.activeEvents = events.length;
    preview.currentAgeMs = Math.min(DURATION_MS, Math.max(0, now - born));
    preview.status = 'running';
    requestAnimationFrame(render);
  } catch (error) { fail(error); }
}

async function boot() {
  const gpu = await requestWebGPU();
  device = gpu.device;
  preview.adapter = gpu.info || null;
  device.addEventListener('uncapturederror', event => fail(event.error));
  device.lost.then(info => { if (running) fail(new Error(`GPUDevice lost: ${info.reason} ${info.message}`)); });
  const baseFormat = navigator.gpu.getPreferredCanvasFormat();
  outputFormat = srgbViewFormat(baseFormat);
  context = canvas.getContext('webgpu');
  if (!context) throw new Error('WebGPU canvas context unavailable');
  context.configure({ device, format: baseFormat, viewFormats: [outputFormat],
    alphaMode: 'premultiplied', colorSpace: 'srgb' });
  renderer = await AttendanceRenderer.create({ device, outputFormat });
  preview.renderer = renderer.lastStats || null;
  controller = new AttendanceController();
  epoch = performance.now();
  preview.status = 'running';
  document.documentElement.dataset.attendancePreview = 'ready';
  requestAnimationFrame(render);
}

window.addEventListener('pagehide', () => {
  running = false;
  controller?.dispose();
  renderer?.dispose();
  device?.destroy();
});
boot().catch(fail);
