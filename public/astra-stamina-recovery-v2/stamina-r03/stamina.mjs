export const VERSION = 'stamina-astra-revision-r03';
export const DURATION = 1.5;
export const SPARK_ANGLE_DEG = 18;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = v => { const x = clamp(v); return x * x * (3 - 2 * x); };

export function samplePhase(time, { reducedMotion = false } = {}) {
  if (!Number.isFinite(time)) throw new TypeError('time must be finite');
  const active = time > 0 && time < DURATION;
  const receive = smooth((time - .09) / .61);
  const settle = smooth((time - .70) / .42);
  const rebound = smooth((time-.47)/.31)*(1-smooth((time-.78)/.46))*(reducedMotion ? .12 : 1);
  const envelope = active ? smooth(time / .12) * (1 - smooth((time - 1.12) / .38)) : 0;
  return Object.freeze({ time, active, receive, settle, rebound, envelope,
    stage: time <= 0 ? 'before' : time < .12 ? 'onset' : time < .70 ? 'receive' : time < 1.12 ? 'restore-support' : time < 1.5 ? 'settle' : 'ended' });
}

// Strict normalized receipt for a future adapter. This is not wired to the game.
export class ReceiptGate {
  constructor({ maxReceipts = 2048 } = {}) {
    if (!Number.isInteger(maxReceipts) || maxReceipts < 1) throw new RangeError('maxReceipts');
    this.maxReceipts = maxReceipts; this.seen = new Set(); this.closed = false;
  }
  accept(receipt, nowSeconds) {
    if (this.closed) return { accepted: false, reason: 'disposed' };
    if (!Number.isFinite(nowSeconds)) return { accepted: false, reason: 'invalid-clock' };
    const r = receipt;
    if (!r || r.eventId !== 'gain-stamina' || r.semantic !== 'stamina-gain' || r.result !== 'changed' || r.authoritative !== true || r.naturalTick === true || !Number.isFinite(r.actualDelta) || r.actualDelta <= 0 || typeof r.causeId !== 'string' || !r.causeId || typeof r.recipientId !== 'string' || !r.recipientId || !Number.isFinite(r.atSeconds)) return { accepted: false, reason: 'invalid-outcome' };
    const key = JSON.stringify([r.recipientId, r.causeId]);
    if (this.seen.has(key)) return { accepted: false, reason: 'duplicate' };
    if (this.seen.size >= this.maxReceipts) return { accepted: false, reason: 'receipt-capacity' };
    const elapsed = nowSeconds - r.atSeconds;
    if (elapsed < 0) return { accepted: false, reason: 'future-outcome' };
    this.seen.add(key);
    if (elapsed >= DURATION) return { accepted: false, reason: 'expired-outcome' };
    return { accepted: true, causeId: r.causeId, recipientId: r.recipientId, elapsed, lifetime: DURATION };
  }
  dispose() { this.closed = true; this.seen.clear(); }
}

export function synthesizeSfx(sampleRate = 48000) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('sampleRate');
  const frames = Math.ceil(DURATION * sampleRate);
  const samples = new Float32Array(frames);
  let random = 0x65473012, lowNoise = 0;
  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate;
    random ^= random << 13; random ^= random >>> 17; random ^= random << 5;
    const noise = (random >>> 0) / 0xffffffff * 2 - 1;
    lowNoise += .045 * (noise - lowNoise);
    const breath = smooth(t / .10) * (1 - smooth((t - .24) / .29));
    let s = .095 * lowNoise * breath;
    const events = [[.13, 220, .42, .09], [.37, 330, .52, .115], [.72, 440, .49, .095], [.85, 660, .31, .027]];
    for (const [start, hz, duration, amp] of events) {
      const age = t - start;
      if (age <= 0 || age >= duration) continue;
      const e = smooth(age / .016) * (1 - smooth(age / duration));
      const phase = 2 * Math.PI * (hz * age + 9 * age * age);
      s += amp * e * (Math.sin(phase) + .22 * Math.sin(phase * 2.01) + .08 * Math.sin(phase * 3.02));
    }
    samples[i] = t <= 0 || t >= 1.44 ? 0 : s * (1 - smooth((t - 1.38) / .06));
  }
  return samples;
}

export class StaminaAudio {
  constructor({ verify = false, contextFactory = () => new AudioContext(), maxReceipts = 2048 } = {}) {
    this.verify = !!verify; this.contextFactory = contextFactory; this.gate = new ReceiptGate({ maxReceipts });
    this.context = null; this.buffer = null; this.nodes = new Map(); this.muted = this.verify; this.closed = false;
  }
  async enable() {
    if (this.verify || this.closed) return false;
    this.context ??= this.contextFactory();
    await this.context.resume();
    if (this.closed) return false;
    this.muted = false;
    return true;
  }
  setMuted(value) {
    this.muted = this.verify || !!value;
    if (this.muted) for (const id of [...this.nodes.keys()]) this.cancel(id);
    return this.muted;
  }
  play(receipt, nowSeconds) {
    if (this.closed || this.verify || this.muted || !this.context || this.context.state !== 'running') return false;
    const decision = this.gate.accept(receipt, nowSeconds);
    if (!decision.accepted) return false;
    if (!this.buffer) {
      const data = synthesizeSfx(this.context.sampleRate);
      this.buffer = this.context.createBuffer(1, data.length, this.context.sampleRate);
      this.buffer.copyToChannel(data, 0);
    }
    const key = JSON.stringify([receipt.recipientId, receipt.causeId]);
    const source = this.context.createBufferSource(); source.buffer = this.buffer;
    const gain = this.context.createGain(); gain.gain.value = .72;
    source.connect(gain); gain.connect(this.context.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); this.nodes.delete(key); };
    this.nodes.set(key, { source, gain });
    source.start(this.context.currentTime, decision.elapsed);
    return true;
  }
  cancel(key) {
    const node = this.nodes.get(key); if (!node) return false;
    try { node.source.stop(); } catch { /* Already stopped. */ }
    node.source.disconnect(); node.gain.disconnect(); this.nodes.delete(key); return true;
  }
  async dispose() {
    if (this.closed) return;
    this.closed = true; this.gate.dispose();
    for (const key of [...this.nodes.keys()]) this.cancel(key);
    if (this.context && this.context.state !== 'closed') await this.context.close();
  }
}

export async function createRenderer(canvas, { device: sharedDevice, shaderCode, spriteBitmap } = {}) {
  if (!globalThis.navigator?.gpu) throw new Error('WebGPU required');
  const adapter = sharedDevice ? null : await navigator.gpu.requestAdapter();
  if (!sharedDevice && !adapter) throw new Error('WebGPU adapter unavailable');
  const device = sharedDevice ?? await adapter.requestDevice();
  const ownsDevice = !sharedDevice;
  const context = canvas.getContext('webgpu');
  if (!context) { if (ownsDevice) device.destroy(); throw new Error('WebGPU canvas unavailable'); }
  let texture, uniform, disposed = false;
  const errors = [];
  const onError = e => errors.push(e.error.message);
  device.addEventListener('uncapturederror', onError);
  try {
    const code = shaderCode ?? await (await fetch(new URL('./stamina.wgsl', import.meta.url))).text();
    const module = device.createShaderModule({ label: VERSION, code });
    const info = await module.getCompilationInfo();
    const compilerErrors = info.messages.filter(m => m.type === 'error');
    if (compilerErrors.length) throw new Error(compilerErrors.map(m => `${m.lineNum}:${m.linePos} ${m.message}`).join('\n'));
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });
    let bitmap = spriteBitmap;
    if (!bitmap) {
      const response = await fetch(new URL('./assets/philia-front-nine-v752.png', import.meta.url));
      if (!response.ok) throw new Error(`Actor fixture HTTP ${response.status}`);
      bitmap = await createImageBitmap(await response.blob(), 0, 0, 256, 256);
    }
    texture = device.createTexture({ size: [256, 256], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    device.queue.copyExternalImageToTexture({ source: bitmap, flipY: false }, { texture, premultipliedAlpha: false }, [256, 256]);
    if (!spriteBitmap) bitmap.close();
    uniform = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    device.pushErrorScope('validation');
    const pipeline = await device.createRenderPipelineAsync({ layout: 'auto', vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{ format }] }, primitive: { topology: 'triangle-list' } });
    const pipelineError = await device.popErrorScope();
    if (pipelineError) throw new Error(pipelineError.message);
    const bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: uniform } }, { binding: 1, resource: texture.createView() },
      { binding: 2, resource: device.createSampler({ minFilter: 'linear', magFilter: 'linear' }) }
    ] });
    const values = new Float32Array(24);
    let frames = 0, lost = false;
    device.lost.then(info => { lost = true; if (!disposed) errors.push(`device-lost: ${info.reason}: ${info.message}`); });
    return {
      device, errors, compilerMessages: info.messages.map(m => ({ type: m.type, message: m.message })),
      get frames() { return frames; },
      draw({ time = 0, height = 64, background = [.023, .032, .046], sparkle = true, glow = true, main = true, actor = true, reducedMotion = false, originX = canvas.width / 2, originY = canvas.height * .74 } = {}) {
        if (disposed || lost) return false;
        if (![time, height, originX, originY, ...background].every(Number.isFinite) || height <= 0) throw new TypeError('Invalid drawing metrics');
        values.set([canvas.width, canvas.height, time, height, ...background, reducedMotion ? 1 : 0, sparkle ? 1 : 0, glow ? 1 : 0, main ? 1 : 0, actor ? 1 : 0, originX, originY, 0, 0]);
        device.queue.writeBuffer(uniform, 0, values);
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: { r: background[0], g: background[1], b: background[2], a: 1 }, loadOp: 'clear', storeOp: 'store' }] });
        const scale=height/64;
        const sx=Math.max(0,Math.floor(originX-42*scale)), sy=Math.max(0,Math.floor(originY-76*scale));
        const sw=Math.max(0,Math.min(canvas.width,Math.ceil(originX+42*scale))-sx), sh=Math.max(0,Math.min(canvas.height,Math.ceil(originY+9*scale))-sy);
        pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup); if(sw&&sh){pass.setScissorRect(sx,sy,sw,sh);pass.draw(3);} pass.end(); device.queue.submit([encoder.finish()]); frames++; return true;
      },
      dispose() { if (disposed) return; disposed = true; context.unconfigure(); uniform.destroy(); texture.destroy(); device.removeEventListener('uncapturederror', onError); if (ownsDevice) device.destroy(); }
    };
  } catch (error) {
    disposed = true; context.unconfigure(); uniform?.destroy(); texture?.destroy(); device.removeEventListener('uncapturederror', onError); if (ownsDevice) device.destroy(); throw error;
  }
}
