export const BUST_VERSION='bust-zero-sol61-r1';
export const BUST_DURATIONS=Object.freeze({'timed-bust-start':650,'timed-bust-break':480});
const finite=(n)=>typeof n==='number'&&Number.isFinite(n);
export function sampleBust(variant,ageMs) {
  const durationMs=BUST_DURATIONS[variant];
  if(!durationMs||!finite(ageMs)) throw new TypeError('Invalid Bust variant or age');
  return Object.freeze({variant,ageMs,durationMs,active:ageMs>=0&&ageMs<durationMs,progress:Math.max(0,Math.min(1,ageMs/durationMs))});
}
// All observed times come from now(), including input handlers and frame callbacks.
// RAF timestamp arguments are intentionally not accepted by sample().
export function createBustPlayback({now=()=>performance.now()}={}) {
  let state=null,disposed=false,serial=0;
  function read(){const t=now();if(!finite(t))throw new TypeError('Invalid monotonic clock');return t;}
  return {
    start(variant,causeId){if(disposed)throw new Error('Disposed playback');sampleBust(variant,0);if(!causeId)throw new TypeError('causeId required');state={variant,causeId,startMs:read(),serial:++serial};return this.sample();},
    sample(){if(disposed||!state)return null;const t=read();if(t<state.startMs)throw new Error('Clock moved backwards');const sampled=sampleBust(state.variant,t-state.startMs);return {...sampled,causeId:state.causeId,serial:state.serial};},
    stop(){state=null;serial++;},
    dispose(){state=null;disposed=true;serial++;}
  };
}
export async function createBustRenderer({device,format,shaderCode}={}) {
  if(!device||!format)throw new TypeError('Caller-owned WebGPU device/format required');
  const code=shaderCode??await fetch(new URL('./bust.wgsl',import.meta.url)).then(r=>{if(!r.ok)throw new Error(`Bust shader HTTP ${r.status}`);return r.text();});
  const module=device.createShaderModule({label:BUST_VERSION,code});
  const info=await module.getCompilationInfo();
  const errors=info.messages.filter(m=>m.type==='error');
  if(errors.length)throw new Error(errors.map(e=>`${e.lineNum}:${e.linePos} ${e.message}`).join('\n'));
  device.pushErrorScope('validation');
  let pipeline;
  try { pipeline=await device.createRenderPipelineAsync({label:BUST_VERSION,layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}}); }
  finally {const error=await device.popErrorScope();if(error)throw new Error(error.message);}
  const buffers=new Set();let disposed=false,serial=0,disposePromise=null;
  function validate(input){
    const {width,height,ageMs,variant,center,actorHeight}=input;
    sampleBust(variant,ageMs);
    if(![width,height,actorHeight].every(n=>finite(n)&&n>0)||!Array.isArray(center)||center.length!==2||!center.every(finite))throw new TypeError('Invalid Bust dimensions or center');
  }
  const renderer={
    shaderMessages:info.messages,
    record(pass,input){
      if(disposed)throw new Error('Disposed Bust renderer');validate(input);
      const {width,height,ageMs,variant,center,actorHeight,sourceEnabled=true,observerEnabled=true,reducedMotion=false}=input;
      const buffer=device.createBuffer({label:`Bust uniform ${serial+1}`,size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});buffers.add(buffer);
      const data=new Float32Array([width,height,...center,actorHeight,ageMs,variant==='timed-bust-break'?1:0,sourceEnabled?1:0,observerEnabled?1:0,reducedMotion?1:0,0,0]);
      device.queue.writeBuffer(buffer,0,data);
      const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});
      pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);
      let releasePromise=null;
      return {serial:++serial,variant,ageMs,releaseAfter(completion){
        if(!completion||typeof completion.then!=='function')throw new TypeError('GPU submission completion Promise required');
        if(!releasePromise)releasePromise=Promise.resolve(completion).then(()=>{if(buffers.delete(buffer))buffer.destroy();});
        return releasePromise;
      }};
    },
    render(input){
      if(!input.view)throw new TypeError('Current presentation view required');
      const encoder=device.createCommandEncoder({label:'Bust standalone'});
      const pass=encoder.beginRenderPass({colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});
      const receipt=renderer.record(pass,input);pass.end();device.queue.submit([encoder.finish()]);
      const completion=device.queue.onSubmittedWorkDone();
      // Rejection is retained in completion; failed fences are not safe release evidence.
      receipt.releaseAfter(completion).catch(()=>{});
      return {...receipt,completion};
    },
    dispose(){
      if(disposePromise)return disposePromise;disposed=true;
      disposePromise=device.queue.onSubmittedWorkDone().catch(async error=>{await device.lost;return {lost:true,error};}).then(()=>{for(const buffer of buffers)buffer.destroy();buffers.clear();});
      return disposePromise;
    }
  };
  return renderer;
}
