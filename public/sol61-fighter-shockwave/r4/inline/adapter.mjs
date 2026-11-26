import {VERSION,mayReportReady,mayReportRetired} from './gates.mjs';
import {boundSearch,envelope} from './envelope.mjs';
if(parent===window) throw Error('Use the original standalone R4 page');
const parentOrigin=location.origin;
const binding=boundSearch(location.search);
const protocol=envelope({binding,origin:parentOrigin,session:crypto.randomUUID(),source:parent,send:(data,target)=>parent.postMessage(data,target)});
const abort=new AbortController();
let gen=1, drawProof=null, firstReady=false, boot, retiring, resumeTask, closingAudio, audioWasCreated=false, audioSettling=false, audioCloseFailed=false, lost, deviceLost=false, uncaptured=false, configured=false;
let stage='child-document';
const progress=(s,status='pending',extra={})=>{stage=s; protocol.emit({stage:s,status,...extra})};
progress(stage);
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
    gen++;
    start = performance.now();
    launchPlayed = false;
    if (muted() || !ready || !audio || audio.state !== 'running') return;
    bus?.disconnect?.();
    bus = audio.createGain();
    bus.gain.value = 0.50;
    bus.connect(audio.destination);
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
    if (muted() || !ready || audioSettling || audioCloseFailed) return false;
    audio ??= new AudioContext();
    audioWasCreated=true;
    const current = audio;
    await (resumeTask = current.resume());
    if (audio !== current || muted() || !ready || current.state !== 'running') return false;
    reset();
    if (audio !== current || muted() || !ready || current.state !== 'running' || !bus) return false;
    audioButton.textContent = '音声再生中';
    return true;
}
async function stopAudio() {
    const previous = audio;
    audio = null;
    bus?.disconnect();
    bus = null;
    audioButton.textContent = '音声を開始';
    if (previous && previous.state !== 'closed') {
        audioSettling=true;
        closingAudio = Promise.resolve().then(()=>previous.close()).then(()=>previous.state==='closed').catch(()=>false);
        const closed=await closingAudio;
        audioSettling=false;
        audioCloseFailed ||= !closed;
        if (!closed) throw Error('AudioContext did not close');
    }
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
    if (now-start >= cycle) { gen++; start = now; launchPlayed = false; }
    const phase = (now-start)/spec.duration - 0.47;
    if (phase >= 0 && !launchPlayed) { launchPlayed = true; if (phase < 0.13) sound(); }
    const resolution = Math.min(devicePixelRatio || 1,2);
    const ownsProof=!firstReady&&!drawProof&&phase>=0.065&&phase<=0.79&&!document.hidden&&canvas.isConnected&&canvas.clientWidth>0&&canvas.clientHeight>0;
    const receipt=ownsProof?{version:VERSION,attempt:binding.attemptEpoch,generation:gen,device,phase,visible:true,canvasConnected:true,width:canvas.clientWidth,height:canvas.clientHeight}:null;
    if(receipt) for(const scope of ['validation','out-of-memory','internal']) device.pushErrorScope(scope);
    let fence;
    try {
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
    if(!firstReady) fence=device.queue.onSubmittedWorkDone().then(()=>true,()=>false);
    } catch(error) {
        fail(error);
    } finally {
        if(receipt) {
            const scopes=Promise.all([device.popErrorScope(),device.popErrorScope(),device.popErrorScope()]);
            drawProof=Promise.all([fence,scopes]).then(([completed,errors])=>{
                const live={...receipt,generation:gen,device,alive,phase:(performance.now()-start)/selected().duration-.47,
                    canvasConnected:canvas.isConnected,visible:!document.hidden,width:canvas.clientWidth,height:canvas.clientHeight,deviceLost,uncaptured};
                Object.assign(receipt,{recorded:!!fence,submitted:!!fence,completed,passes:1,cleanScopes:errors.every(x=>x===null)});
                if(errors.some(Boolean)) throw Error('R4 GPU error scope during active frame');
                if(firstReady||!mayReportReady(receipt,live)) return;
                firstReady=true;
                const {device:_,width,height,...wire}=receipt;
                progress('playing','ready',{firstFrame:{...wire,viewportWidth:width,viewportHeight:height}});
            }).catch(error=>{if(alive) fail(error);}).finally(()=>{drawProof=null;});
        }
    }
    if(!firstReady&&fence){
        const pacing=drawProof??fence;
        void pacing.then(()=>{if(alive)raf=requestAnimationFrame(draw);});
    }else if(alive) raf = requestAnimationFrame(draw);
}
function fail(error) {
    if(!alive)return;
    progress(stage,'error',{error:{code:'R4_ADAPTER_ERROR',message:String(error?.message||error)}});
    void retire();
}
function retire() {
    if(retiring) return retiring;
    alive=false;ready=false;gen++;cancelAnimationFrame(raf);abort.abort();
    retiring=(async()=>{
        const errors=[], l={errors,rafStopped:true};
        const capture=async(name,run)=>{try{return await run()}catch(error){errors.push(name+': '+String(error));}};
        // Closing can unblock a suspended resume; both must finish.
        const closing=capture('audio close',async()=>{await stopAudio(); return !closingAudio||await closingAudio;});
        await Promise.resolve(boot).catch(()=>{}); l.bootSettled=true;
        await drawProof; l.drawSettled=true;
        await Promise.resolve(resumeTask).catch(()=>{}); l.audioResumeSettled=true;
        const audioClosed=await closing;
        l.audioCreated=audioWasCreated;l.audioState=l.audioCreated?(audioClosed&&!audioCloseFailed?'closed':'unknown'):'not-created';
        l.deviceCreated=!!device;l.noPendingAdapterDevice=!device;l.deviceState=device?'unknown':'not-created';
        if(device) {
            await capture('queue drain',async()=>{await device.queue.onSubmittedWorkDone();l.drainCompleted=true;});
        }
        l.bufferCreated=!!uniforms;l.bufferState='not-created';
        if(uniforms) await capture('uniforms',()=>{uniforms.destroy();l.bufferState='destroyed';});
        l.contextConfigured=configured;l.contextState='not-configured';
        if(configured) await capture('canvas',()=>{context.unconfigure();l.contextState='unconfigured';});
        if(device) {
            await capture('GPU destroy',()=>{device.destroy();l.destroyCalled=true;});
            if(l.destroyCalled) await capture('GPU lost settlement',async()=>{l.lostReason=(await lost).reason;if(l.lostReason==='destroyed')l.deviceState='destroyed-loss-settled';});
        }
        return Object.freeze(l);
    })();
    return retiring;
}
let answered=false;
addEventListener('message',event=>{
    if(answered||!protocol.accepts(event))return;
    answered=true;
    void retire().then(lifecycle=>{
        const ok=mayReportRetired(lifecycle)&&canvas.isConnected;
        protocol.emit({stage,status:'cancelled',action:ok?'retired':'retire-error',type:ok?'dva-effect-retired':'dva-effect-retire-error',lifecycle});
    },()=>protocol.emit({stage,status:'cancelled',action:'retire-error',type:'dva-effect-retire-error'}));
});
addEventListener('pagehide',()=>void retire(),{once:true});
document.addEventListener('visibilitychange',() => {
    if (document.hidden) void stopAudio().catch(fail);
    else reset();
});
async function initialize() {
    progress('adapter');
    const adapter = await navigator.gpu?.requestAdapter();
    if (!adapter) throw Error('WebGPU アダプターを利用できません');
    if(!alive)return;
    progress('device');
    const newDevice = await adapter.requestDevice();
    device = newDevice;
    lost=device.lost;
    lost.then(info=>{deviceLost=true;if(alive)fail(Error(info.message||'GPU device lost'));});
    device.addEventListener('uncapturederror',event=>{uncaptured=true;fail(event.error);});
    if(!alive)return;
    progress('assets');
    const response = await fetch(new URL('./field.wgsl',import.meta.url),{signal:abort.signal});
    if (!response.ok) throw Error('シェーダーを読み込めません');
    const module = device.createShaderModule({ code: await response.text() });
    const info = await module.getCompilationInfo();
    const errors = info.messages.filter(message => message.type === 'error');
    if (errors.length) throw Error(errors.map(m => m.message).join('\n'));
    if (!alive) return;
    progress('pipelines');
    context = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();
    pipeline = await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint:'fragment',targets:[{format}]},primitive:{topology:'triangle-list'}});
    if (!alive) return;
    context.configure({ device,format,alphaMode:'opaque' });
    configured=true;
    uniforms = device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    bindGroup = device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniforms}}]});
    progress('first-frame');
    ready = true;
    reset();
    raf = requestAnimationFrame(draw);
}
boot = initialize();
void boot.catch(fail);
