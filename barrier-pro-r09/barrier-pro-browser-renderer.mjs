import { sampleImage } from './barrier-pro-browser-sampler.mjs';

export async function createBarrierRenderer(canvas, { scale = 2 } = {}) {
  if (!navigator.gpu) throw new Error('WebGPU not available');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No GPU adapter');
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) throw new Error('WebGPU canvas context unavailable');
  const format = navigator.gpu.getPreferredCanvasFormat();
  canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
  canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
  context.configure({ device, format, alphaMode: 'opaque' });
  const response = await fetch('./barrier-pro-shader.wgsl');
  if (!response.ok) throw new Error(`WGSL fetch failed: ${response.status}`);
  const shader = device.createShaderModule({ code: await response.text() });
  const pipeline = device.createRenderPipeline({
    layout: 'auto', vertex: { module: shader, entryPoint: 'vsMain' },
    fragment: { module: shader, entryPoint: 'fsMain', targets: [{ format }] }, primitive: { topology: 'triangle-list' },
  });
  const uniform = device.createBuffer({ size: 8, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  let texture, bindGroup, texWidth = 0, texHeight = 0, lastSampleKey = '';
  function ensureTexture(w, h) {
    if (texture && texWidth === w && texHeight === h) return;
    texture?.destroy(); texWidth = w; texHeight = h;
    texture = device.createTexture({ size: [w, h, 1], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: uniform } }, { binding: 1, resource: texture.createView() },
    ] });
  }
  function render({ event, tMs, receiverHeightPx = 64, background = 'dark' }) {
    const sampleTime = Math.floor(tMs / 33) * 33;
    const sampleKey = `${event}/${background}/${receiverHeightPx}/${sampleTime}`;
    if (sampleKey !== lastSampleKey) {
      const image = sampleImage({ event, tMs: sampleTime, heightPx: receiverHeightPx, background });
      ensureTexture(image.width, image.height);
      device.queue.writeBuffer(uniform, 0, new Float32Array([image.width, image.height]));
      device.queue.writeTexture({ texture }, image.pixels, { bytesPerRow: image.width * 4 }, { width: image.width, height: image.height, depthOrArrayLayers: 1 });
      lastSampleKey = sampleKey;
    }
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }] });
    pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup); pass.draw(3); pass.end();
    device.queue.submit([encoder.finish()]);
  }
  return { device, render };
}
