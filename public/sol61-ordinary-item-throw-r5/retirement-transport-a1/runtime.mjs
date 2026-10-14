const FLOAT = 'rgba16float';
export const WORLD_SOURCE_SHA256 = 'fcac0733409442e222a9d94dcedf17f7fb187020a7578b312db02244013bf6a7';
export async function verifyWorldSourceBytes(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const actual = [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2,'0')).join('');
  if (actual !== WORLD_SOURCE_SHA256) throw new Error(`R5 shader source identity mismatch: expected ${WORLD_SOURCE_SHA256}, received ${actual}`);
  return actual;
}
// CPU projection reference; shader uses these same parabolic position/tangent equations.
export function trajectoryAt(uniform, phase) {
  if (!(uniform instanceof Float32Array) || uniform.length!==16 || !Number.isFinite(phase) || phase<0 || phase>1) throw new TypeError('finite phase and frame uniform required');
  const lift=uniform[10],dx=uniform[6]-uniform[4],dy=uniform[7]-uniform[5];
  return {x:uniform[4]+dx*phase,y:uniform[5]+dy*phase-4*lift*phase*(1-phase),
    tangentX:dx,tangentY:dy-4*lift*(1-2*phase),accelerationY:8*lift/(uniform[9]*uniform[9])};
}
export const THROW_EVENT = 'action-item-throw';
export function observerUniform(enabled = true) { return new Float32Array([enabled ? 1 : 0,0,0,0]); }
export const THROW_VARIANT = /^flight:(?!$).+/;

export function eventAt(event, nowMs, { width, height, worldToPixel = 1, sourceEnabled = true,
  wakeGain = 1, receiverGain = 1, liftPx, reducedMotion = false, project = point => point } = {}) {
  if (!event || event.type !== THROW_EVENT || !THROW_VARIANT.test(String(event.variant || '')))
    throw new TypeError('Expected the successful ordinary action-item-throw flight event');
  if (!String(event.id || '') || !String(event.playerId || '') || event.success === false)
    throw new TypeError('Throw E requires a successful stable-cause event with an owner');
  if (!Number.isFinite(nowMs) || ![event.x,event.y,event.targetX,event.targetY,event.startedAt,event.duration,
      width,height,worldToPixel,wakeGain,receiverGain].every(Number.isFinite) || event.duration <= 0 || width <= 0 || height <= 0 || worldToPixel <= 0)
    throw new TypeError('Throw event needs finite source, resolved endpoint, duration, clock, and viewport');
  const ageMs = nowMs - event.startedAt;
  if (ageMs < 0) return { status: 'not-started', eventId: String(event.id || '') };
  if (ageMs >= event.duration) return { status: 'expired', eventId: String(event.id || '') };
  const source = project({x:event.x,y:event.y}), target = project({x:event.targetX,y:event.targetY});
  if (!source || !target || ![source.x,source.y,target.x,target.y].every(Number.isFinite)) throw new TypeError('Projected throw route must be finite');
  const distance = Math.hypot(event.targetX-event.x,event.targetY-event.y);
  if (distance <= 1e-8) return { status:'stationary', eventId:String(event.id) };
  const normalizedSpeed = distance / event.duration;
  if (liftPx !== undefined && !Number.isFinite(liftPx)) throw new TypeError("liftPx must be finite");
  const lift = Number.isFinite(liftPx) ? liftPx : Math.min((reducedMotion ? 8 : 32) * worldToPixel,Math.hypot(target.x-source.x,target.y-source.y)*.12);
  return {
    status: 'active', eventId: String(event.id || ''), causeId: String(event.id || ''),
    itemId: String(event.variant).slice('flight:'.length), ownerId: String(event.playerId || ''),
    durationMs: event.duration, ageMs, speedWorldPerMs: normalizedSpeed,
    uniform: new Float32Array([
      width,height,worldToPixel,sourceEnabled ? 1 : 0,
      source.x,source.y,target.x,target.y,
      ageMs,event.duration,lift,Math.max(0,Math.min(2,normalizedSpeed / 0.4)),
      Math.max(0,Math.min(3,wakeGain)),Math.max(0,Math.min(3,receiverGain)),sourceEnabled ? 1 : 0,0
    ])
  };
}

export const OBSERVER_SOURCE_SHA256 = '8dde3bafd3cefa22492263f2333c24da29260de678fae8b2f6344fd8611da219';
export const OBSERVER_WGSL = "// GPT-6.1-Sol R3 draft: gap-free normalized 5x5 binomial point spread.\nstruct Out { @location(0) color:vec4f };\n@group(0) @binding(0) var scene:texture_2d<f32>;\n@group(0) @binding(1) var emission:texture_2d<f32>;\nstruct Observer { enabled:f32, _pad0:f32, _pad1:f32, _pad2:f32 };\n@group(0) @binding(2) var<uniform> observer:Observer;\nstruct V { @builtin(position) position:vec4f };\n@vertex fn vertex(@builtin(vertex_index) i:u32)->V {\n  let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n  var o:V; o.position=vec4f(p[i],0.,1.); return o;\n}\nfn encodeSRGB(linear:vec3f)->vec3f {\n  return select(1.055*pow(max(linear,vec3f(0.)),vec3f(1./2.4))-.055,\n    12.92*linear,linear<=vec3f(.0031308));\n}\n@fragment fn fragment(input:V)->Out {\n  let dims=vec2i(textureDimensions(scene));\n  let p=clamp(vec2i(input.position.xy),vec2i(0),dims-vec2i(1));\n  let s=textureLoad(scene,p,0);\n  let weights=array<f32,5>(1.,4.,6.,4.,1.);\n  var spread=vec3f(0.);\n  for(var y=0u;y<5u;y++) {\n    for(var x=0u;x<5u;x++) {\n      let q=clamp(p+vec2i(i32(x)-2,i32(y)-2),vec2i(0),dims-vec2i(1));\n      spread+=textureLoad(emission,q,0).rgb*(weights[x]*weights[y]/256.);\n    }\n  }\n  let bloom=spread*(.16*clamp(observer.enabled,0.,1.));\n  let background=vec3f(.012,.02,.03);\n  let radiance=background*(1.-s.a)+s.rgb+bloom;\n  let mapped=radiance/(vec3f(1.)+radiance);\n  var o:Out; o.color=vec4f(encodeSRGB(mapped),1.); return o;\n}\n";
export async function verifyObserverSourceBytes(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const actual = [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2,'0')).join('');
  if (actual !== OBSERVER_SOURCE_SHA256) throw new Error("R5 observer source identity mismatch: expected " + OBSERVER_SOURCE_SHA256 + ", received " + actual);
  return actual;
}export async function createRuntime({ canvas, shaderUrl = './world.wgsl', onStatus = () => {} } = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('A WebGPU canvas is required');
  const gpu = globalThis.navigator?.gpu;
  if (!gpu) throw new Error('WebGPU unavailable');
  const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('WebGPU adapter unavailable');
  const device = await adapter.requestDevice();
  let context;
  try { context = canvas.getContext('webgpu'); } catch (error) { device.destroy(); throw error; }
  if (!context) { device.destroy(); throw new Error('GPUCanvasContext unavailable'); }
  const format = gpu.getPreferredCanvasFormat();
  try { context.configure({ device, format, alphaMode: 'premultiplied' }); }
  catch (error) { device.destroy(); throw error; }
  let destroyed = false, width = 0, height = 0, sceneTex, emissionTex, bindGroup, lastFence = Promise.resolve();
  let submittedCount=0,completedCount=0,pendingSubmissions=0,submissionCallbackCount=0,contextUnconfigured=false,deviceDestroyCalls=0,lostInfo=null,disposePromise=null,retirementProof=null,disposeSubmissionCount=null;
  const uncapturedErrors=[],cleanupErrors=[];
  function safelyRelease(resource,method='destroy') {
    try{resource?.[method]();}catch(error){const message=String(error?.message||error);cleanupErrors.push(message);try{onStatus({type:'cleanup-error',message});}catch{}}
  }
  device.addEventListener('uncapturederror',event=>{
    const detail={type:'uncaptured-gpu-error',message:String(event.error?.message||event.error||'GPU error')};
    uncapturedErrors.push(detail); onStatus(detail);
  });
  const lostPromise = device.lost.then(info => { lostInfo={reason:String(info?.reason||''),message:String(info?.message||'')}; onStatus({ type:'device-lost', reason:info.reason, message:info.message }); return info; });
  let uniformBuffer,observerBuffer;
  try {
  const shaderResponse = await fetch(shaderUrl, { cache:'no-store' });
  if (!shaderResponse.ok) { throw new Error(`world.wgsl HTTP ${shaderResponse.status}`); }
  const shaderBytes = await shaderResponse.arrayBuffer();
  let worldSourceSha256;
  try { worldSourceSha256 = await verifyWorldSourceBytes(shaderBytes); }
  catch (error) { throw error; }
  const worldSource = new TextDecoder().decode(shaderBytes);
  const worldModule = device.createShaderModule({ label:'throw-r5-world', code:worldSource });
  const observerModule = device.createShaderModule({ label:'throw-r5-observer', code:OBSERVER_WGSL });
  const [worldInfo, observerInfo] = await Promise.all([worldModule.getCompilationInfo(), observerModule.getCompilationInfo()]);
  const errors = [...worldInfo.messages,...observerInfo.messages].filter(m => m.type === 'error');
  if (errors.length) { throw new Error(`Shader compilation failed: ${JSON.stringify(errors)}`); }
  device.pushErrorScope('validation');
  const worldPipeline = device.createRenderPipeline({
    label:'throw-r5-mrt-world', layout:'auto',
    vertex:{ module:worldModule, entryPoint:'vertex' },
    fragment:{ module:worldModule, entryPoint:'fragment', targets:[{format:FLOAT},{format:FLOAT}] },
    primitive:{ topology:'triangle-list' }
  });
  const observerPipeline = device.createRenderPipeline({
    label:'throw-r5-emission-observer', layout:'auto',
    vertex:{ module:observerModule, entryPoint:'vertex' },
    fragment:{ module:observerModule, entryPoint:'fragment', targets:[{
      format, blend:{ color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
        alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'} }
    }] }, primitive:{topology:'triangle-list'}
  });
  const pipelineError = await device.popErrorScope();
  if (pipelineError) { throw new Error(`Pipeline validation failed: ${pipelineError.message}`); }
  uniformBuffer = device.createBuffer({ label:'throw-r5-frame-64', size:64,
    usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST });
  observerBuffer=device.createBuffer({label:'throw-r5-observer-controls',size:16,
    usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});

  function releaseTargets() {
    safelyRelease(sceneTex); safelyRelease(emissionTex); sceneTex=emissionTex=bindGroup=undefined;
  }
  async function resize() {
    if(destroyed)throw new Error("Throw R5 runtime disposed");
    const dpr=Math.min(globalThis.devicePixelRatio||1,2);
    const w=Math.max(1,Math.round(canvas.clientWidth*dpr)), h=Math.max(1,Math.round(canvas.clientHeight*dpr));
    if (w===width&&h===height) return;
    await lastFence;
    if(destroyed)throw new Error("Throw R5 runtime disposed");
    releaseTargets(); width=w;height=h;canvas.width=w;canvas.height=h;
    sceneTex=device.createTexture({label:'throw-r5-scene',size:[w,h],format:FLOAT,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
    emissionTex=device.createTexture({label:'throw-r5-emission',size:[w,h],format:FLOAT,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
    bindGroup=device.createBindGroup({layout:observerPipeline.getBindGroupLayout(0),entries:[
      {binding:0,resource:sceneTex.createView()},{binding:1,resource:emissionTex.createView()},
      {binding:2,resource:{buffer:observerBuffer}}
    ]});
    onStatus({type:'resize',width:w,height:h,format:FLOAT});
  }
  async function render({ event, nowMs, sourceEnabled = true, observerEnabled = true,
    width:worldWidth, height:worldHeight, worldToPixel = 1, wakeGain = 1, receiverGain = 1,
    reducedMotion = false, project = point => point } = {}) {
    if (destroyed) throw new Error('Throw R5 runtime disposed');
    await resize();
    const w=worldWidth??width,h=worldHeight??height;
    const planned=eventAt(event,nowMs,{width:w,height:h,worldToPixel,sourceEnabled,wakeGain,receiverGain,reducedMotion,project});
    device.queue.writeBuffer(observerBuffer,0,observerUniform(observerEnabled));
    const encoder=device.createCommandEncoder({label:'throw-r5-frame'});
    const worldPass=encoder.beginRenderPass({label:'throw-r5-mrt-pass',colorAttachments:[
      {view:sceneTex.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'},
      {view:emissionTex.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}
    ]});
    if (planned.status==='active'&&sourceEnabled) {
      device.queue.writeBuffer(uniformBuffer,0,planned.uniform);
      worldPass.setPipeline(worldPipeline);
      worldPass.setBindGroup(0,device.createBindGroup({layout:worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniformBuffer}}]}));
      worldPass.draw(3);
    }
    worldPass.end();
    const observerPass=encoder.beginRenderPass({label:'throw-r5-observer-pass',colorAttachments:[{
      view:context.getCurrentTexture().createView(),clearValue:{r:0.012,g:0.02,b:0.03,a:1},loadOp:'clear',storeOp:'store'
    }]});
    observerPass.setPipeline(observerPipeline); observerPass.setBindGroup(0,bindGroup); observerPass.draw(3); observerPass.end();
    const command=encoder.finish(); device.queue.submit([command]);
    submittedCount++; pendingSubmissions++; submissionCallbackCount++;
    lastFence=device.queue.onSubmittedWorkDone().then(()=>{completedCount++;return true;},error=>{
      onStatus({type:'queue-fence-error',message:String(error?.message||error)}); return false;
    }).finally(()=>{pendingSubmissions--;submissionCallbackCount--;});
    const receipt={status:planned.status,eventId:planned.eventId,ageMs:planned.ageMs??null,durationMs:planned.durationMs??null,
      speedWorldPerMs:planned.speedWorldPerMs??null,sourceEnabled,observerEnabled,submitted:true,width,height,
      targetFormats:[FLOAT,FLOAT],frameUniformBytes:64,uncapturedErrorCount:uncapturedErrors.length};
    onStatus({type:'frame-submitted',...receipt});
    return {...receipt,completed:lastFence};
  }
  function retirementSnapshot() { return Object.freeze({
    deviceIdentity:device, destroyed, submittedCount, completedCount, pendingSubmissions, submissionCallbackCount,
    noNewSubmissionsAfterDispose:destroyed&&disposeSubmissionCount===submittedCount, contextUnconfigured, deviceDestroyCalls, lostSettled:Boolean(lostInfo),
    lostReason:lostInfo?.reason??null, cleanupErrors:[...cleanupErrors], uncapturedErrors:[...uncapturedErrors]
  }); }
  async function dispose() {
    if(disposePromise)return disposePromise;
    disposePromise=(async()=>{
      if(!destroyed) {
        destroyed=true; disposeSubmissionCount=submittedCount;
        const fenceOk=await lastFence;
        releaseTargets(); safelyRelease(uniformBuffer); safelyRelease(observerBuffer);
        try { context.unconfigure(); contextUnconfigured=true; } catch(error) { const message=String(error?.message||error); cleanupErrors.push(message); try{onStatus({type:'cleanup-error',message});}catch{} }
        try { deviceDestroyCalls++; device.destroy(); } catch(error) { const message=String(error?.message||error); cleanupErrors.push(message); try{onStatus({type:'cleanup-error',message});}catch{} }
        await lostPromise;
        const snap=retirementSnapshot();
        retirementProof=Object.freeze({...snap, fenceOk, queueDrained:fenceOk===true&&snap.pendingSubmissions===0&&snap.submissionCallbackCount===0&&snap.submittedCount===snap.completedCount, sameDevice:snap.deviceIdentity===device, lostSettled:snap.lostSettled&&snap.lostReason==='destroyed', destroyedLossExpected:snap.lostReason==='destroyed'});
      }
      return retirementProof??retirementSnapshot();
    })();
    return disposePromise;
  }
  return Object.freeze({adapter,device,format,worldSource,worldSourceSha256,worldCompilation:worldInfo,observerCompilation:observerInfo,
    pipelineValidationError:pipelineError,get cleanupErrors(){return [...cleanupErrors];}, get uncapturedErrors(){return [...uncapturedErrors];},
    render,resize,dispose,lost:lostPromise,get size(){return {width,height};},get retirement(){return retirementProof??retirementSnapshot();}});
  } catch(error) {
    destroyed=true;
    for(const resource of [sceneTex,emissionTex,uniformBuffer,observerBuffer]){try{resource?.destroy();}catch{}}
    try{context.unconfigure();}catch{}try{device.destroy();}catch{}
    throw error;
  }
}




