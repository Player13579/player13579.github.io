const FLOAT = 'rgba16float';
export const THROW_EVENT = 'action-item-throw';
export const THROW_VARIANT = /^flight:(?!$).+/;

export function eventAt(event, nowMs, { width, height, worldToPixel = 1, sourceEnabled = true,
  wakeGain = 1, receiverGain = 1, liftPx, reducedMotion = false, project = point => point } = {}) {
  if (!event || event.type !== THROW_EVENT || !THROW_VARIANT.test(String(event.variant || '')))
    throw new TypeError('Expected the successful ordinary action-item-throw flight event');
  if (!String(event.id || '') || !String(event.playerId || '') || event.success === false)
    throw new TypeError('Throw E requires a successful stable-cause event with an owner');
  if (!Number.isFinite(nowMs) || ![event.x,event.y,event.targetX,event.targetY,event.startedAt,event.duration,
      width,height,worldToPixel].every(Number.isFinite) || event.duration <= 0 || width <= 0 || height <= 0 || worldToPixel <= 0)
    throw new TypeError('Throw event needs finite source, resolved endpoint, duration, clock, and viewport');
  const ageMs = nowMs - event.startedAt;
  if (ageMs < 0) return { status: 'not-started', eventId: String(event.id || '') };
  if (ageMs >= event.duration) return { status: 'expired', eventId: String(event.id || '') };
  const source = project({x:event.x,y:event.y}), target = project({x:event.targetX,y:event.targetY});
  if (!source || !target || ![source.x,source.y,target.x,target.y].every(Number.isFinite)) throw new TypeError('Projected throw route must be finite');
  const distance = Math.hypot(event.targetX-event.x,event.targetY-event.y);
  const normalizedSpeed = distance / event.duration;
  const lift = Number.isFinite(liftPx) ? liftPx : (reducedMotion ? 8 : 32) * worldToPixel;
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

const OBSERVER_WGSL = `
struct Out { @location(0) color: vec4f };
@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var emission: texture_2d<f32>;
struct Observer { enabled:f32, _pad0:f32, _pad1:f32, _pad2:f32 };
@group(0) @binding(2) var<uniform> observer:Observer;
struct V { @builtin(position) position: vec4f };
@vertex fn vertex(@builtin(vertex_index) i:u32)->V {
  let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o:V; o.position=vec4f(p[i],0.,1.); return o;
}
@fragment fn fragment(input:V)->Out {
  let dims=vec2i(textureDimensions(scene));
  let p=clamp(vec2i(input.position.xy),vec2i(0),dims-vec2i(1));
  let s=textureLoad(scene,p,0);
  // Compact 8-tap emission-only blur; small radius and gain avoid a fullscreen flare.
  let offsets=array<vec2i,8>(vec2i(-2,0),vec2i(2,0),vec2i(0,-2),vec2i(0,2),
    vec2i(-1,-1),vec2i(1,-1),vec2i(-1,1),vec2i(1,1));
  var b=vec3f(0.);
  for(var i=0u;i<8u;i++){let q=clamp(p+offsets[i],vec2i(0),dims-vec2i(1));b+=textureLoad(emission,q,0).rgb;}
  let bloom=b*(0.0125*clamp(observer.enabled,0.,1.));
  let background=vec3f(0.012,0.02,0.03);
  let radiance=background*(1.-s.a)+s.rgb+bloom;
  let mapped=radiance/(vec3f(1.)+radiance);
  var o:Out; o.color=vec4f(pow(max(mapped,vec3f(0.)),vec3f(1./2.2)),1.); return o;
}`;

export async function createRuntime({ canvas, shaderUrl = './world.wgsl', onStatus = () => {} } = {}) {
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
  const uncapturedErrors=[];
  device.addEventListener('uncapturederror',event=>{
    const detail={type:'uncaptured-gpu-error',message:String(event.error?.message||event.error||'GPU error')};
    uncapturedErrors.push(detail); onStatus(detail);
  });
  const lostPromise = device.lost.then(info => { onStatus({ type:'device-lost', reason:info.reason, message:info.message }); return info; });
  const shaderResponse = await fetch(shaderUrl, { cache:'no-store' });
  if (!shaderResponse.ok) { context.unconfigure(); device.destroy(); throw new Error(`world.wgsl HTTP ${shaderResponse.status}`); }
  const worldSource = await shaderResponse.text();
  const worldModule = device.createShaderModule({ label:'throw-r1-world', code:worldSource });
  const observerModule = device.createShaderModule({ label:'throw-r1-observer', code:OBSERVER_WGSL });
  const [worldInfo, observerInfo] = await Promise.all([worldModule.getCompilationInfo(), observerModule.getCompilationInfo()]);
  const errors = [...worldInfo.messages,...observerInfo.messages].filter(m => m.type === 'error');
  if (errors.length) { context.unconfigure(); device.destroy(); throw new Error(`Shader compilation failed: ${JSON.stringify(errors)}`); }
  device.pushErrorScope('validation');
  const worldPipeline = device.createRenderPipeline({
    label:'throw-r1-mrt-world', layout:'auto',
    vertex:{ module:worldModule, entryPoint:'vertex' },
    fragment:{ module:worldModule, entryPoint:'fragment', targets:[{format:FLOAT},{format:FLOAT}] },
    primitive:{ topology:'triangle-list' }
  });
  const observerPipeline = device.createRenderPipeline({
    label:'throw-r1-emission-observer', layout:'auto',
    vertex:{ module:observerModule, entryPoint:'vertex' },
    fragment:{ module:observerModule, entryPoint:'fragment', targets:[{
      format, blend:{ color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
        alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'} }
    }] }, primitive:{topology:'triangle-list'}
  });
  const pipelineError = await device.popErrorScope();
  if (pipelineError) { context.unconfigure(); device.destroy(); throw new Error(`Pipeline validation failed: ${pipelineError.message}`); }
  const uniformBuffer = device.createBuffer({ label:'throw-r1-frame-64', size:64,
    usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST });
  const observerBuffer=device.createBuffer({label:'throw-r1-observer-controls',size:16,
    usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});

  function releaseTargets() {
    sceneTex?.destroy(); emissionTex?.destroy(); sceneTex=emissionTex=bindGroup=undefined;
  }
  async function resize() {
    const dpr=Math.min(globalThis.devicePixelRatio||1,2);
    const w=Math.max(1,Math.round(canvas.clientWidth*dpr)), h=Math.max(1,Math.round(canvas.clientHeight*dpr));
    if (w===width&&h===height) return;
    await lastFence;
    releaseTargets(); width=w;height=h;canvas.width=w;canvas.height=h;
    sceneTex=device.createTexture({label:'throw-r1-scene',size:[w,h],format:FLOAT,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
    emissionTex=device.createTexture({label:'throw-r1-emission',size:[w,h],format:FLOAT,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
    bindGroup=device.createBindGroup({layout:observerPipeline.getBindGroupLayout(0),entries:[
      {binding:0,resource:sceneTex.createView()},{binding:1,resource:emissionTex.createView()},
      {binding:2,resource:{buffer:observerBuffer}}
    ]});
    onStatus({type:'resize',width:w,height:h,format:FLOAT});
  }
  async function render({ event, nowMs, sourceEnabled = true, observerEnabled = true,
    width:worldWidth, height:worldHeight, worldToPixel = 1, wakeGain = 1, receiverGain = 1,
    reducedMotion = false, project = point => point } = {}) {
    if (destroyed) throw new Error('Throw R1 runtime disposed');
    await resize();
    const w=worldWidth??width,h=worldHeight??height;
    const planned=eventAt(event,nowMs,{width:w,height:h,worldToPixel,sourceEnabled,wakeGain,receiverGain,reducedMotion,project});
    device.queue.writeBuffer(observerBuffer,0,new Float32Array([observerEnabled?1:0,0,0,0]));
    const encoder=device.createCommandEncoder({label:'throw-r1-frame'});
    const worldPass=encoder.beginRenderPass({label:'throw-r1-mrt-pass',colorAttachments:[
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
    const observerPass=encoder.beginRenderPass({label:'throw-r1-observer-pass',colorAttachments:[{
      view:context.getCurrentTexture().createView(),clearValue:{r:0.012,g:0.02,b:0.03,a:1},loadOp:'clear',storeOp:'store'
    }]});
    observerPass.setPipeline(observerPipeline); observerPass.setBindGroup(0,bindGroup); observerPass.draw(3); observerPass.end();
    const command=encoder.finish(); device.queue.submit([command]);
    lastFence=device.queue.onSubmittedWorkDone().then(()=>true,error=>{
      onStatus({type:'queue-fence-error',message:String(error?.message||error)}); return false;
    });
    const receipt={status:planned.status,eventId:planned.eventId,ageMs:planned.ageMs??null,durationMs:planned.durationMs??null,
      speedWorldPerMs:planned.speedWorldPerMs??null,sourceEnabled,observerEnabled,submitted:true,width,height,
      targetFormats:[FLOAT,FLOAT],frameUniformBytes:64,uncapturedErrorCount:uncapturedErrors.length};
    onStatus({type:'frame-submitted',...receipt});
    return {...receipt,completed:lastFence};
  }
  async function dispose() {
    if(destroyed)return; destroyed=true;
    await lastFence.catch(()=>{}); releaseTargets(); uniformBuffer.destroy(); observerBuffer.destroy(); context.unconfigure(); device.destroy();
  }
  return Object.freeze({adapter,device,format,worldSource,worldCompilation:worldInfo,observerCompilation:observerInfo,
    pipelineValidationError:pipelineError, get uncapturedErrors(){return [...uncapturedErrors];},
    render,resize,dispose,lost:lostPromise,get size(){return {width,height};}});
}




