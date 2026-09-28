import { EVENTS } from './barrier-pro-model.mjs';

export async function createBarrierRenderer(canvas, { scale = 2 } = {}) {
  if (!navigator.gpu) throw new Error('WebGPU not available');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No WebGPU adapter');
  const device = await adapter.requestDevice();
  const diagnostics = [];
  device.addEventListener('uncapturederror', event => {
    diagnostics.push(`uncaptured ${event.error?.name ?? 'GPUError'}: ${event.error?.message ?? event.error}`);
  });
  device.lost.then(info => diagnostics.push(`device lost: ${info.reason} ${info.message}`));
  const format = navigator.gpu.getPreferredCanvasFormat();
  const context = canvas.getContext('webgpu');
  const width = Math.max(1, (canvas.clientWidth * scale) | 0);
  const height = Math.max(1, (canvas.clientHeight * scale) | 0);
  canvas.width = width;
  canvas.height = height;
  context.configure({ device, format, alphaMode: 'opaque' });

  const code = await fetch('./barrier-pro-shader.wgsl?adapter=r07-reserved-word-fix1').then(r => r.text());
  const module = device.createShaderModule({ code });
  const info = await module.getCompilationInfo();
  if (info.messages.some(m => m.type === 'error')) {
    throw new Error(info.messages.map(m => `${m.type} ${m.lineNum}:${m.linePos}: ${m.message}`).join('\n'));
  }

  const uniformSize = 32;
  const uniformBuffer = device.createBuffer({ size: uniformSize, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const layout0 = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: {} }] });
  const uniformBindGroup = device.createBindGroup({ layout: layout0, entries: [{ binding: 0, resource: { buffer: uniformBuffer } }] });

  const barrierPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [layout0] }),
    vertex: { module, entryPoint: 'vsMain' },
    fragment: {
      module,
      entryPoint: 'fsBarrier',
      targets: [{ format: 'rgba16float', blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } }]
    },
    primitive: { topology: 'triangle-list' }
  });

  const layout1 = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } }] });
  const compositePipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [layout0, layout1] }),
    vertex: { module, entryPoint: 'vsMain' },
    fragment: { module, entryPoint: 'fsComposite', targets: [{ format }] },
    primitive: { topology: 'triangle-list' }
  });

  let offscreenTexture = null;
  let offscreenView = null;
  let textureBindGroup = null;
  function ensureOffscreen() {
    if (offscreenTexture) return;
    offscreenTexture = device.createTexture({
      size: [width, height],
      format: 'rgba16float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    });
    offscreenView = offscreenTexture.createView();
    textureBindGroup = device.createBindGroup({ layout: layout1, entries: [{ binding: 0, resource: offscreenView }] });
  }
  ensureOffscreen();

  const eventKind = event => ({ create: 0, absorb: 1, fracture: 2, bust: 3 })[event] ?? 0;

  function render({ event = 'create', tMs = 0, receiverHeightPx = 64, background = 'dark', coreLightEnabled = true } = {}) {
    const duration = EVENTS[event].durationMs;
    const timeNorm = Math.max(0, Math.min(1, tMs / duration));
    const raw = new ArrayBuffer(uniformSize);
    const f32 = new Float32Array(raw);
    const u32 = new Uint32Array(raw);
    f32[0] = width;
    f32[1] = height;
    f32[2] = receiverHeightPx;
    f32[3] = timeNorm;
    u32[4] = eventKind(event);
    u32[5] = background === 'light' ? 1 : 0;
    u32[6] = coreLightEnabled ? 1 : 0;
    device.queue.writeBuffer(uniformBuffer, 0, raw);

    const encoder = device.createCommandEncoder();
    {
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: offscreenView, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
      pass.setPipeline(barrierPipeline);
      pass.setBindGroup(0, uniformBindGroup);
      pass.draw(3);
      pass.end();
    }
    {
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }] });
      pass.setPipeline(compositePipeline);
      pass.setBindGroup(0, uniformBindGroup);
      pass.setBindGroup(1, textureBindGroup);
      pass.draw(3);
      pass.end();
    }
    device.queue.submit([encoder.finish()]);
  }

  return { device, render, diagnostics, compilationInfo: info, adapterInfo: adapter.info ?? null };
}
