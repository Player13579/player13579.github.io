export const BUST_VERSION='bust-zero-sol61-r3';
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

export const BUST_CONTACT_MS=Object.freeze([200,250,300]);
export const BUST_CUT_MS=Object.freeze([48,18,78]);
const smooth=(a,b,x)=>{const q=Math.max(0,Math.min(1,(x-a)/(b-a)));return q*q*(3-2*q);};
// An inspectable CPU state contract, not a CPU renderer or native pixel proof.
export function sampleBustState(variant,ageMs,{reducedMotion=false}={}) {
  const basic=sampleBust(variant,ageMs),motion=reducedMotion?0.35:1;
  if(variant==='timed-bust-start') return Object.freeze({...basic,
    phase:ageMs<200?'insertion':ageMs<365?'registration':ageMs<440?'registered':ageMs<650?'erasure':'ended',
    socketTravelH:0.20*(1-smooth(25,200,ageMs))*motion,
    contacts:Object.freeze(BUST_CONTACT_MS.map(at=>smooth(at-8,at+8,ageMs)*(1-smooth(at+70,at+150,ageMs)))),
    erasure:smooth(440,650,ageMs),bodyClearHalfWidthH:0.315});
  return Object.freeze({...basic,phase:ageMs<18?'connected':ageMs<78?'rupture':ageMs<258?'separation':ageMs<480?'erasure':'ended',
    cells:Object.freeze(BUST_CUT_MS.map((cutMs,row)=>Object.freeze({row,cutMs,
      separated:smooth(cutMs,cutMs+190,ageMs),
      shiftOutH:0.22*smooth(cutMs,cutMs+190,ageMs)*motion,
      erasure:smooth(cutMs+180,480,ageMs)})))});
}

export const BUST_MEDIUM=Object.freeze({depthSamples:48,registrationSpeedHPerS:2.70,releaseSpeedHPerS:2.90,minimumHalfDepthH:0.025,maximumHalfDepthH:0.061});
// Conservative transformed source bounds. PSF support includes AA, and remains
// identical under observer intervention to preserve the world quadrature.
export function bustSupportBounds(variant,actorHeight,{sourceEnabled=true,observerEnabled=true}={}) {
  if(!BUST_DURATIONS[variant]||!Number.isFinite(actorHeight)||actorHeight<=0)throw new TypeError('Invalid support dimensions');
  const source=variant==='timed-bust-start'?[0.90,0.27,0.24]:[0.80,0.66,0.22];
  const sigmaH=Math.sqrt(0.016**2+1/(12*actorHeight**2)),psfRadiusH=5*sigmaH;
  return Object.freeze({sourceEnabled,observerEnabled,sourceHalfExtentsH:Object.freeze(source),psfRadiusH,halfExtentsH:Object.freeze(source.map(v=>v+psfRadiusH))});
}
export function sampleBustMaterial(variant,ageMs,{row=1,pathH=0}={}) {
  const basic=sampleBust(variant,ageMs);
  if(!Number.isInteger(row)||row<0||row>2||!Number.isFinite(pathH)||pathH<0)throw new TypeError('Invalid material path/row');
  if(!basic.active)return Object.freeze({active:false,received:0,front:0});
  if(variant==='timed-bust-start') {
    let received=0,front=0;
    for(const at of BUST_CONTACT_MS) {
      const radius=Math.max(0,(ageMs-at)/1000)*2.70,onset=smooth(at,at+12,ageMs);
      received=Math.max(received,(1-smooth(radius-0.026,radius+0.026,pathH))*onset);
      front=Math.max(front,Math.exp(-0.5*((pathH-radius)/0.036)**2)*onset);
    }
    return Object.freeze({active:true,received,front});
  }
  const at=BUST_CUT_MS[row],radius=Math.max(0,(ageMs-at)/1000)*2.90,onset=smooth(at,at+9,ageMs);
  return Object.freeze({active:true,received:(1-smooth(radius-0.030,radius+0.030,pathH))*onset,front:Math.exp(-0.5*((pathH-radius)/0.052)**2)*onset});
}
