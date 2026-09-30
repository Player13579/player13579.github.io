import { shader } from './shader.mjs';
export { shader };
export const metadata=Object.freeze({id:'quantum-transmutation-sol61-r1',authorModel:'gpt-6.1-sol',eventType:'quantum-transmutation',durationMs:3600,variants:['lead','mercury'],radius:150,quality:'not_run',adoption:'unadopted'});
const smooth=(a,b,x)=>{const u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u);};
export function phases(ageMs) {
  const t=ageMs/1000;
  return Object.freeze({onset:smooth(0,.16,t),input:1-smooth(.85,1.65,t),conversion:smooth(.72,1.65,t),result:smooth(1.35,1.8,t),end:1-smooth(3.02,3.6,t),discharge:Math.exp(-(((t-1.5)/.22)**2))});
}
// Pure projection. Host owns receipt rebasing, source/owner visibility, and event ID.
export function plan({effect,now,phase='playing',camera={x:0,y:0},zoom=1,viewport,reducedMotion=false,alpha=1,sourceVisible=true,world=true,glow=true,flare=true}={}) {
  if(phase!=='playing'||effect?.type!==metadata.eventType) return null;
  if(!effect.id||!effect.playerId||!metadata.variants.includes(effect.variant)) return null;
  if(![effect.x,effect.y,effect.startedAt,effect.duration,now,camera.x,camera.y,zoom,viewport?.width,viewport?.height,alpha].every(Number.isFinite)) return null;
  if(effect.duration!==3600 || effect.radius!==150 || zoom<=0 || viewport.width<=0 || viewport.height<=0 || alpha<=0 || !sourceVisible) return null;
  const ageMs=now-effect.startedAt;
  if(ageMs<0 || ageMs>=3600) return null;
  const x=(effect.x-camera.x)*zoom+viewport.width/2;
  const y=(effect.y-camera.y)*zoom+viewport.height/2;
  const bounds={left:x-64*zoom,right:x+64*zoom,top:y-96*zoom,bottom:y+32*zoom};
  if(bounds.right<=0||bounds.left>=viewport.width||bounds.bottom<=0||bounds.top>=viewport.height)return null;
  return Object.freeze({id:String(effect.id),playerId:String(effect.playerId),variant:effect.variant,ageMs,bounds:Object.freeze(bounds),values:new Float32Array([viewport.width,viewport.height,x,y,zoom,ageMs/1000,effect.variant==='mercury'?1:0,Math.min(1,alpha),world?1:0,glow?1:0,flare?1:0,reducedMotion?1:0])});
}
// Shared-device kernel. No canvas/context/adapter acquisition, submission, clear, or RAF.
// One uniform slot per caller-supplied record index, reset only after prior frame submission.
export function createQuantumPass({device,format,own=x=>x,release=()=>true}={}) {
  if(!device?.createShaderModule||!device?.queue?.writeBuffer||!format)throw new TypeError('Shared WebGPU device and target format required');
  const module=device.createShaderModule({label:metadata.id,code:shader});
  const layout=device.createBindGroupLayout({entries:[{binding:0,visibility:3,buffer:{type:'uniform'}}]});
  const pipeline=device.createRenderPipeline({label:metadata.id,layout:device.createPipelineLayout({bindGroupLayouts:[layout]}),vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
  const slots=[];let destroyed=false;
  const compilation=typeof module.getCompilationInfo==='function'?module.getCompilationInfo():Promise.resolve({messages:[],unverified:true});
  function record(pass,command,index=0) {
    if(destroyed)throw new Error('Quantum pass destroyed');
    if(!command)return false;
    if(!Number.isInteger(index)||index<0)throw new TypeError('Nonnegative record slot required');
    if(!slots[index]) {
      const buffer=own(device.createBuffer({label:`${metadata.id}:${index}`,size:48,usage:0x40|0x08}));
      slots[index]={buffer,bindGroup:device.createBindGroup({layout,entries:[{binding:0,resource:{buffer}}]})};
    }
    device.queue.writeBuffer(slots[index].buffer,0,command.values);
    pass.setPipeline(pipeline);pass.setBindGroup(0,slots[index].bindGroup);pass.draw(6);
    return true;
  }
  return Object.freeze({device,format,record,compilation,destroy(){if(destroyed)return;destroyed=true;for(const {buffer}of slots)if(release(buffer))buffer.destroy();slots.length=0;}});
}
// Finite source-caused sound. A granular metallic ingress resolves into a gold-field chord.
// These are sound synthesis phases, not authoritative game operations.
export function soundSample(seconds,variant='lead') {
  if(seconds<0||seconds>=3.45||!metadata.variants.includes(variant))return 0;
  const t=seconds;
  const ingress=smooth(0,.018,t)*(1-smooth(.65,1.5,t));
  const mass=variant==='mercury'?170:118;
  const phase=2*Math.PI*(mass*t+75*t*t);
  const body=(Math.sin(phase)+.27*Math.sin(phase*2.01)+.11*Math.sin(phase*3.07))*ingress*.08;
  const d=t-1.5;
  const envelope=d>=0?smooth(0,.009,d)*Math.exp(-d*2.7)*(1-smooth(3.02,3.45,t)):0;
  const result=(Math.sin(2*Math.PI*660*d)+.45*Math.sin(2*Math.PI*990*d)+.19*Math.sin(2*Math.PI*1320*d))*envelope*.105;
  const sweep=Math.sin(2*Math.PI*(620*t+180*t*t))*Math.exp(-(((t-1.42)/.14)**2))*.045;
  return body+result+sweep;
}
export function createSoundBuffer(context,variant) {
  if(!metadata.variants.includes(variant))throw new TypeError('Unknown Quantum variant');
  const count=Math.ceil(context.sampleRate*3.45);
  const buffer=context.createBuffer(1,count,context.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<count;i++)data[i]=soundSample(i/context.sampleRate,variant);
  return buffer;
}
