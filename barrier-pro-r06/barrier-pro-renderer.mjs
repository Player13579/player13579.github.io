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
  const width = canvas.clientWidth * scale | 0;
  const height = canvas.clientHeight * scale | 0;
  canvas.width = width;
  canvas.height = height;
  context.configure({ device, format, alphaMode: 'opaque' });

  const shaderCode = await fetch('./barrier-pro-shader.wgsl').then(r => r.text());
  const module = device.createShaderModule({ code: shaderCode });
  const compilation = await module.getCompilationInfo();
  for (const message of compilation.messages) {
    diagnostics.push(`WGSL ${message.type} ${message.lineNum}:${message.linePos}: ${message.message}`);
  }
  const bufferSize = 32;
  const uniformBuffer = device.createBuffer({ size: bufferSize, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  const commonBindGroupLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }]
  });
  const barrierBindGroup = device.createBindGroup({
    layout: commonBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
  });

  device.pushErrorScope('validation');
  const barrierPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [commonBindGroupLayout] }),
    vertex: { module, entryPoint: 'vsMain' },
    fragment: {
      module,
      entryPoint: 'fsBarrier',
      targets: [{ format: 'rgba16float', blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } }]
    },
    primitive: { topology: 'triangle-list' }
  });
  const barrierPipelineError = await device.popErrorScope();
  if (barrierPipelineError) diagnostics.push(`barrier pipeline: ${barrierPipelineError.message}`);

  const compositeSampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
  const compositeLayout0 = commonBindGroupLayout;
  const compositeLayout1 = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } }
    ]
  });
  device.pushErrorScope('validation');
  const compositePipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [compositeLayout0, compositeLayout1] }),
    vertex: { module, entryPoint: 'vsMain' },
    fragment: { module, entryPoint: 'fsComposite', targets: [{ format }] },
    primitive: { topology: 'triangle-list' }
  });
  const compositePipelineError = await device.popErrorScope();
  if (compositePipelineError) diagnostics.push(`composite pipeline: ${compositePipelineError.message}`);

  let offscreen = null;
  let compositeBindGroup = null;
  function ensureTargets() {
    if (offscreen && offscreen.width === width && offscreen.height === height) return;
    offscreen?.texture?.destroy?.();
    const texture = device.createTexture({
      size: [width, height],
      format: 'rgba16float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    });
    const view = texture.createView();
    offscreen = { texture, view, width, height };
    compositeBindGroup = device.createBindGroup({
      layout: compositeLayout1,
      entries: [
        { binding: 0, resource: view },
        { binding: 1, resource: compositeSampler }
      ]
    });
  }
  ensureTargets();

  function eventKind(event) {
    return ({ create: 0, absorb: 1, fracture: 2, bust: 3 })[event] ?? 0;
  }

  function render({ event = 'create', tMs = 0, receiverHeightPx = 64, background = 'dark', coreLightEnabled = true } = {}) {
    ensureTargets();
    const duration = EVENTS[event].durationMs;
    const timeNorm = Math.max(0, Math.min(1, tMs / duration));
    const uniformData = new ArrayBuffer(bufferSize);
    const f32 = new Float32Array(uniformData);
    const u32 = new Uint32Array(uniformData);
    f32[0] = width;
    f32[1] = height;
    f32[2] = receiverHeightPx;
    f32[3] = timeNorm;
    u32[4] = eventKind(event);
    u32[5] = background === 'light' ? 1 : 0;
    u32[6] = coreLightEnabled ? 1 : 0;
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const encoder = device.createCommandEncoder();
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{ view: offscreen.view, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }]
      });
      pass.setPipeline(barrierPipeline);
      pass.setBindGroup(0, barrierBindGroup);
      pass.draw(3);
      pass.end();
    }
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }]
      });
      pass.setPipeline(compositePipeline);
      pass.setBindGroup(0, barrierBindGroup);
      pass.setBindGroup(1, compositeBindGroup);
      pass.draw(3);
      pass.end();
    }
    device.queue.submit([encoder.finish()]);
  }

  return { device, render, diagnostics, adapterInfo: adapter.info ?? null };
}
