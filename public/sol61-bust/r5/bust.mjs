export const BUST_VERSION='bust-zero-sol61-r5';
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
    erasure:smooth(440,650,ageMs),bodyClearHalfWidthH:0.134,receiverInterfaceHalfWidthH:0.16});
  return Object.freeze({...basic,phase:ageMs<18?'connected':ageMs<78?'rupture':ageMs<258?'separation':ageMs<480?'erasure':'ended',
    cells:Object.freeze(BUST_CUT_MS.map((cutMs,row)=>Object.freeze({row,cutMs,
      separated:smooth(cutMs,cutMs+190,ageMs),
      shiftOutH:0.12*smooth(cutMs,cutMs+190,ageMs)*motion,
      erasure:smooth(cutMs+180,480,ageMs)})))});
}


export const BUST_MEDIUM=Object.freeze({depthSamples:48,registrationSpeedHPerS:2.70,releaseSpeedHPerS:2.90,minimumHalfDepthH:0.032,maximumHalfDepthH:0.075});
export function bustSupportBounds(variant,actorHeight,{sourceEnabled=true,observerEnabled=true}={}) {
  if(!BUST_DURATIONS[variant]||!Number.isFinite(actorHeight)||actorHeight<=0)throw new TypeError('Invalid support dimensions');
  const source=variant==='timed-bust-start'?[0.72,0.50,0.25]:[0.67,0.55,0.25];
  const sigmaH=Math.sqrt(0.011**2+1/(12*actorHeight**2)),psfRadiusH=5*sigmaH;
  return Object.freeze({sourceEnabled,observerEnabled,sourceHalfExtentsH:Object.freeze(source),psfRadiusH,halfExtentsH:Object.freeze(source.map((v,i)=>v+(variant==='timed-bust-start'&&i<2?Math.max(psfRadiusH,0.12):psfRadiusH)))});
}
// Row now means that physical cell's contact, not max(all contacts). It remains
// a state diagnostic: native visibility/brightness and cost require real GPU.
export function sampleBustMaterial(variant,ageMs,{row=1,pathH=0}={}) {
  if(!Number.isInteger(row)||row<0||row>2)throw new TypeError('Invalid material row');
  const branch=variant==='timed-bust-start'?row:[1,0,2][row];
  return sampleBustNetworkState(variant,ageMs,{branch,pathH});
}
// Legacy swept-cell utility and endpoint constants remain ABI-compatible.
// R5 rendering uses sampleBustNetwork/channelAt, not these old cell coordinates.
// Shared numerical definition used to reject disconnected contact and support
// errors. This scalar diagnostic is not an image renderer.
export function sampleBustCell(point,a,b,width,depth) {
  if(![point,a,b].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))||!Number.isFinite(width)||width<=0||!Number.isFinite(depth)||depth<=0)throw new TypeError('Invalid cell geometry');
  const e=[b[0]-a[0],b[1]-a[1]],len=Math.hypot(...e);if(!len)throw new TypeError('Cell axis required');
  const axis=e.map(v=>v/len),along=(point[0]-a[0])*axis[0]+(point[1]-a[1])*axis[1],h=Math.max(0,Math.min(1,along/len));
  const center=a.map((v,i)=>v+(b[i]-v)*h),delta=point.map((v,i)=>v-center[i]);
  const across=delta[0]*-axis[1]+delta[1]*axis[0],w=width*(0.74+0.26*Math.sin(Math.PI*h)),z=delta[2]*w/depth;
  const round=Math.hypot(delta[0],delta[1],z),facet=(Math.abs(delta[0]*axis[0]+delta[1]*axis[1])+Math.abs(across)+Math.abs(z))*0.73;
  return Object.freeze({d:round*0.68+facet*0.32-w,path:h*len,across,depth:delta[2]});
}
export const BUST_CELL_CONTACT_X=0.485+0.060*0.74/(0.68+0.32*0.73);
export const BUST_CELL_OUTER_ENDPOINT_X=0.485+(0.060+0.065)*0.74/(0.68+0.32*0.73);

// R5 diagnostics describe the new runtime network; legacy cell exports remain
// for caller compatibility and are not used by the R5 shader.
export const BUST_NETWORK=Object.freeze({rootH:Object.freeze([0.16,0.04,0]),junctionH:Object.freeze([0.29,0.04,0]),segments:5,trunkLengthH:0.13,upperControlH:Object.freeze([0.53,0.11,0.070]),upperTipH:Object.freeze([0.35,0.39,0.030]),lowerControlH:Object.freeze([0.54,-0.12,-0.060]),lowerTipH:Object.freeze([0.34,-0.38,0.020]),sourceCutH:Object.freeze([0.065,0.120,0.120]),registrationAtMs:Object.freeze([200,250,300]),cutAtMs:Object.freeze([18,48,78])});
export function bustBranchPoint(s,branch,{travelH=0}={}) {
  if(!Number.isFinite(s)||s<0||s>1||![1,2].includes(branch)||!Number.isFinite(travelH)||travelH<0)throw new TypeError('Invalid branch point');
  const a=BUST_NETWORK.junctionH,b=branch===1?BUST_NETWORK.upperControlH:BUST_NETWORK.lowerControlH,c=branch===1?BUST_NETWORK.upperTipH:BUST_NETWORK.lowerTipH;
  return Object.freeze(a.map((v,i)=>(1-s)**2*v+2*(1-s)*s*b[i]+s*s*c[i]+(i===0?travelH*s:i===2?travelH*0.18*Math.sin(Math.PI*s):0)));
}
export function bustNetworkPoint(s,branch,{travelH=0}={}) {
  if(!Number.isFinite(s)||s<0||s>1||![0,1,2].includes(branch))throw new TypeError('Invalid network point');
  if(branch===0)return Object.freeze({pointH:Object.freeze([0.16+0.13*s,0.04,0]),pathH:0.13*s});
  const piece=Math.min(Math.floor(s*5),4),h=s*5-piece;let pathH=0,pointH;
  for(let i=0;i<5;i++){const a=bustBranchPoint(i/5,branch,{travelH}),b=bustBranchPoint((i+1)/5,branch,{travelH}),length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(i<piece)pathH+=length;if(i===piece){pointH=a.map((v,j)=>v+(b[j]-v)*h);pathH+=h*length;}}
  return Object.freeze({pointH:Object.freeze(pointH),pathH});
}
export function sampleBustNetwork(point,branch,{travelH=0}={}) {
  if(!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite)||![0,1,2].includes(branch)||!Number.isFinite(travelH)||travelH<0)throw new TypeError('Invalid network geometry');
  let best={d:Infinity};let offset=0;
  const segment=(a,b,w0,w1,depth)=>{
    const e=[b[0]-a[0],b[1]-a[1]],length=Math.hypot(...e),axis=e.map(v=>v/length),along=(point[0]-a[0])*axis[0]+(point[1]-a[1])*axis[1],h=Math.max(0,Math.min(1,along/length));
    const delta=point.map((v,i)=>v-(a[i]+(b[i]-a[i])*h)),across=delta[0]*-axis[1]+delta[1]*axis[0],width=w0+(w1-w0)*h;
    const d=Math.hypot(delta[0]*axis[0]+delta[1]*axis[1],across,delta[2]*width/depth)-width;
    const cell={d,path:offset+h*length,across,depth:delta[2],width};if(d<best.d)best=cell;offset+=length;
  };
  if(branch===0)segment(BUST_NETWORK.rootH,BUST_NETWORK.junctionH,0.026,0.043,0.055);
  else for(let i=0;i<5;i++){const s=i/5,n=(i+1)/5,w=v=>0.043+0.018*Math.sin(Math.PI*v)-0.025*v*v;segment(bustBranchPoint(s,branch,{travelH}),bustBranchPoint(n,branch,{travelH}),w(s),w(n),0.075-0.030*s);}
  return Object.freeze(best);
}
export function sampleBustNetworkState(variant,ageMs,{branch=0,pathH=0,reducedMotion=false}={}) {
  const basic=sampleBust(variant,ageMs);if(![0,1,2].includes(branch)||!Number.isFinite(pathH)||pathH<0)throw new TypeError('Invalid network state');
  const start=variant==='timed-bust-start',at=(start?BUST_NETWORK.registrationAtMs:BUST_NETWORK.cutAtMs)[branch],speed=start?2.70:2.90;
  const distance=start?pathH:Math.abs(pathH-BUST_NETWORK.sourceCutH[branch]),radius=Math.max(ageMs-at,0)*speed/1000,onset=smooth(at,at+12,ageMs);
  const reached=(1-smooth(radius-0.021,radius+0.021,distance))*onset,front=Math.exp(-0.5*((distance-radius)/0.028)**2)*onset;
  const open=start?0:smooth(at,at+190,ageMs),gapH=0.047*open,mask=basic.active?1:0;
  return Object.freeze({...basic,branch,received:reached*mask,front:front*mask,cutAtMs:start?null:at,gapH:gapH*mask,severed:basic.active&&!start&&Math.abs(pathH-BUST_NETWORK.sourceCutH[branch])<gapH,travelH:start?0.20*(1-smooth(25,200,ageMs))*(reducedMotion?0.35:1):0,recoilH:start?0:0.12*open*(reducedMotion?0.35:1)});
}
