import { createReloadRenderer, planReloadInput } from './runtime.mjs';

export function makeMockGpu({ validationError = null, shaderErrors = [], emissionPresent = true, seedReadbacks = false } = {}) {
  const log = { scopes: 0, bufferBytes: [], bindGroups: [], pipelineDescriptors: [], passLabels: [], drawCounts: [], submits: 0, copies: [], destroys: 0, configured: false, unconfigured: false, events: [] };
  const device = {
    limits: { maxTextureDimension2D: 4096 },
    queue: {
      writeBuffer(buffer, offset, data) { log.bufferBytes.push(data.byteLength); },
      submit(commands) { log.submits += commands.length; log.events.push('submit'); },
      onSubmittedWorkDone() { log.events.push('queueDone'); return Promise.resolve(); }
    },
    pushErrorScope(kind) { if (kind !== 'validation') throw new Error('wrong error scope'); log.scopes++; },
    async popErrorScope() { return validationError; },
    createShaderModule() { return { async getCompilationInfo() { return { messages: shaderErrors }; } }; },
    async createRenderPipelineAsync(desc) { log.pipelineDescriptors.push(desc); return { desc, getBindGroupLayout(index) { return { index, desc }; } }; },
    createBuffer(desc) { const bytes = new ArrayBuffer(desc.size); if (desc.label.includes('emission-proof') && emissionPresent) new Uint16Array(bytes)[0]=0x3c00; return { desc, async mapAsync() { log.events.push(`map:${desc.label}`); }, getMappedRange() { return bytes; }, unmap() {}, destroy() { log.destroys++; } }; },
    createTexture(desc) { return { desc, createView() { return { texture: this }; }, destroy() { log.destroys++; } }; },
    createBindGroup(desc) { log.bindGroups.push(desc); return desc; },
    createCommandEncoder() {
      return {
        beginRenderPass(desc) { log.passLabels.push(desc.label); return { setPipeline() {}, setBindGroup() {}, draw(count) { log.drawCounts.push(count); }, end() {} }; },
        copyTextureToBuffer(source, destination, size) { log.copies.push({ texture: source.texture.desc.label, width: size.width, height: size.height }); const data = new Uint16Array(destination.buffer.getMappedRange()); if (seedReadbacks) data[0] = source.texture.desc.label.includes('/world-') ? 0x3c00 : source.texture.desc.label.includes('/emission-') ? 0x3800 : source.texture.desc.label.includes('/blurY-') ? 0x4000 : 0; }, finish() { return { mock: true }; }
      };
    },
    addEventListener() {}, removeEventListener() {},
    lost: new Promise(() => {}), destroy() { log.destroys++; }
  };
  const context = {
    configure() { log.configured = true; }, unconfigure() { log.unconfigured = true; },
    getCurrentTexture() { return { createView() { return { mockOutput: true }; } }; }
  };
  const canvas = { isConnected: true, getContext(type) { return type === 'webgpu' ? context : null; } };
  const gpu = { async requestAdapter() { return { async requestDevice() { return device; } }; }, getPreferredCanvasFormat() { return 'bgra8unorm'; } };
  return { canvas, context, device, gpu, log };
}
export { createReloadRenderer, planReloadInput };






