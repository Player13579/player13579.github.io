const canvas = document.querySelector('canvas');
const status = document.querySelector('#status');
const audioButton = document.querySelector('#audio');
const controls = Object.fromEntries(['normal','giant','light'].map(id => [id, document.getElementById(id)]));
const inVerify = url => new URL(url).searchParams.has('verify');
let verification = inVerify(location.href);
try { verification ||= inVerify(parent.location.href); } catch { /* Cross-origin embed. */ }
let device, context, pipeline, uniforms, bindGroup, raf = 0;
let large = false, light = false, alive = true, ready = false;
let start = performance.now(), launchPlayed = false, audio = null, bus = null;
const origin = [62, 96];
const regular = { end: [305, 89], width: 48, duration: 550 };
const giant = { end: [325, 84], width: 98, duration: 650 };
const selected = () => large ? giant : regular;
const muted = () => verification || document.hidden || !alive;
function reset() {
    start = performance.now();
    launchPlayed = false;
    if (bus && audio) {
        bus.disconnect();
        bus = audio.createGain();
        bus.gain.value = 0.50;
        bus.connect(audio.destination);
    }
}
function selectMode(value) {
    large = value;
    controls.normal.setAttribute('aria-pressed', String(!value));
    controls.giant.setAttribute('aria-pressed', String(value));
    reset();
}
controls.normal.onclick = () => selectMode(false);
controls.giant.onclick = () => selectMode(true);
controls.light.onclick = () => {
    light = !light;
    controls.light.setAttribute('aria-pressed', String(light));
};
async function enableAudio() {
    if (muted() || !ready) return false;
    audio ??= new AudioContext();
    await audio.resume();
    if (muted() || audio.state !== 'running') return false;
    reset();
    audioButton.textContent = '音声再生中';
    return true;
}
async function stopAudio() {
    const previous = audio;
    audio = null;
    bus?.disconnect();
    bus = null;
    audioButton.textContent = '音声を開始';
    if (previous && previous.state !== 'closed') await previous.close();
}
audioButton.disabled = verification;
audioButton.onclick = () => enableAudio().catch(error => status.textContent = error.message);
window.__gallerySfx = Object.freeze({ activateFromGesture: enableAudio, stop: stopAudio });
function sound() {
    if (muted() || audio?.state !== 'running' || !bus) return;
    const seconds = large ? 0.27 : 0.17;
    const signal = audio.createBuffer(1,Math.ceil(audio.sampleRate*seconds),audio.sampleRate);
    const samples = signal.getChannelData(0);
    let smooth = 0, seed = 73243751;
    for (let i = 0; i < samples.length; ++i) {
        const s = i/audio.sampleRate;
        seed = (Math.imul(1664525,seed) + 1013904223) >>> 0;
        const noise = 2*(seed/4294967296)-1;
        smooth += (large ? 0.085 : 0.15)*(noise-smooth);
        const attack = 1-Math.exp(-s/0.0025);
        const pulse = s/(large ? 0.010 : 0.006);
        const pressure = pulse*(1-pulse/2)*Math.exp(-pulse);
        const tail = 1-i/(samples.length-1);
        samples[i] = attack*tail*tail*(0.62*smooth*Math.exp(-s/(seconds*0.63)) + 0.70*pressure);
    }
    const source = audio.createBufferSource();
    source.buffer = signal;
    source.connect(bus);
    source.onended = () => source.disconnect();
    source.start();
}
function draw(now) {
    if (!alive || !ready) return;
    const spec = selected();
    const cycle = spec.duration*1.60 + 630;
    if (now-start >= cycle) { start = now; launchPlayed = false; }
    const phase = (now-start)/spec.duration - 0.47;
    if (phase >= 0 && !launchPlayed) { launchPlayed = true; if (phase < 0.13) sound(); }
    const resolution = Math.min(devicePixelRatio || 1,2);
    const width = Math.max(1,Math.min(device.limits.maxTextureDimension2D,Math.round(canvas.clientWidth*resolution)));
    const height = Math.max(1,Math.min(device.limits.maxTextureDimension2D,Math.round(canvas.clientHeight*resolution)));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    device.queue.writeBuffer(uniforms,0,new Float32Array([width,height,phase,+large,...origin,...spec.end,spec.width,+light,0,0]));
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1] }] });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0,bindGroup);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
    raf = requestAnimationFrame(draw);
}
function retire() {
    if (!alive) return;
    alive = false;
    ready = false;
    cancelAnimationFrame(raf);
    void stopAudio();
    uniforms?.destroy();
    context?.unconfigure();
    device?.destroy();
}
addEventListener('pagehide',retire,{once:true});
document.addEventListener('visibilitychange',() => {
    if (document.hidden) void stopAudio();
    else reset();
});
async function initialize() {
    const adapter = await navigator.gpu?.requestAdapter();
    if (!adapter) throw Error('WebGPU アダプターを利用できません');
    const newDevice = await adapter.requestDevice();
    if (!alive) { newDevice.destroy(); return; }
    device = newDevice;
    device.lost.then(info => { if (alive) { retire(); status.textContent = info.message || 'GPU 接続が失われました'; } });
    const response = await fetch(new URL('./field.wgsl',import.meta.url));
    if (!response.ok) throw Error('シェーダーを読み込めません');
    const module = device.createShaderModule({ code: await response.text() });
    const info = await module.getCompilationInfo();
    const errors = info.messages.filter(message => message.type === 'error');
    if (errors.length) throw Error(errors.map(m => m.message).join('\n'));
    if (!alive) return;
    context = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();
    pipeline = await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint:'fragment',targets:[{format}]},primitive:{topology:'triangle-list'}});
    if (!alive) return;
    context.configure({ device,format,alphaMode:'opaque' });
    uniforms = device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    bindGroup = device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniforms}}]});
    ready = true;
    reset();
    raf = requestAnimationFrame(draw);
}
initialize().catch(error => { if (alive) { retire(); status.textContent = error.message; } });
