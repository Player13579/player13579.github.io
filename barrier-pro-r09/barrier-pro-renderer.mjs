import { sampleImage } from './barrier-pro-sampler.mjs';

export async function createBarrierRenderer(canvas, { scale = 2 } = {}) {
  if (!navigator.gpu) throw new Error('WebGPU not available');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No GPU adapter');
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();

  const width = Math.max(1, Math.round(canvas.clientWidth * scale));
  const height = Math.max(1, Math.round(canvas.clientHeight * scale));
  canvas.width = width;
  canvas.height = height;
  context.configure({ device, format, alphaMode: 'opaque' });

  const shaderCode = await (await fetch('./barrier-pro-shader.wgsl')).text();
  const shader = device.createShaderModule({ code: shaderCode });
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shader, entryPoint: 'vsMain' },
    fragment: { module: shader, entryPoint: 'fsMain', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });

  const uniformBuffer = device.createBuffer({ size: 8, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  let texture = null;
  let bindGroup = null;
  let texWidth = 0, texHeight = 0;

  function ensureTexture(w, h) {
    if (texture && texWidth === w && texHeight === h) return;
    texture?.destroy();
    texWidth = w; texHeight = h;
    texture = device.createTexture({
      size: [w, h, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: texture.createView() },
      ],
    });
  }

  function render({ event, tMs, receiverHeightPx = 64, background = 'dark', coreLightEnabled = true }) {
    const image = sampleImage({ event, tMs, heightPx: receiverHeightPx, background, coreLightEnabled });
    ensureTexture(image.width, image.height);
    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([image.width, image.height]));
    device.queue.writeTexture(
      { texture },
      image.pixels,
      { bytesPerRow: image.width * 4 },
      { width: image.width, height: image.height, depthOrArrayLayers: 1 }
    );

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  return { device, render };
}
