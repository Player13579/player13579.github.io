import { DESIGN, stateAt } from './design.mjs';
export { DESIGN, stateAt };
export const VERSION='sol61-item-pickup-r1';
export function plan(event){
 if(event?.type!==DESIGN.eventType||event.receipt?.confirmed!==true||!event.causeId||!event.recipient)return null;
 const r=event.recipient;if(![r.x,r.y,r.width,r.height].every(Number.isFinite)||r.width<=0||r.height<=0)return null;
 const source=event.source&&[event.source.x,event.source.y].every(Number.isFinite)?event.source:null;
 return {causeId:String(event.causeId),recipient:{...r},target:{x:r.x,y:r.y+r.height*.5},source:source||{x:r.x,y:r.y+r.height*.5},transport:Boolean(source),receipt:event.receipt};
}
export async function createRenderer(canvas){
 if(!navigator.gpu)throw new Error('WebGPU required');
 const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('No WebGPU adapter');
 const device=await adapter.requestDevice();const context=canvas.getContext('webgpu');
 const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
 const shader=await (await fetch(new URL('./item-pickup.wgsl',import.meta.url))).text();
 const module=device.createShaderModule({label:VERSION,code:shader});
 const compilation=await module.getCompilationInfo();const errors=compilation.messages.filter(m=>m.type==='error');
 if(errors.length)throw new Error(errors.map(m=>m.message).join('\n'));
 device.pushErrorScope('validation');
 const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
 const buffer=device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});
 const pipelineError=await device.popErrorScope();if(pipelineError)throw Error(pipelineError.message);
 const values=new Float32Array(20);let submits=0;const gpuErrors=[];device.addEventListener('uncapturederror',e=>gpuErrors.push(e.error.message));
 function draw(event,t,{background='dark',obs=true,reducedMotion=false,dpr=1}={}){
  const p=plan(event);if(!p)throw Error('Confirmed receipt and projected recipient required');
  values.set([canvas.width/dpr,canvas.height/dpr,dpr,t,p.source.x,p.source.y,p.target.x,p.target.y,p.recipient.x,p.recipient.y,p.recipient.width,p.recipient.height,0,0,0,0,background==='light'?1:0,obs?1:0,reducedMotion?1:0,p.transport?1:0]);
  device.queue.writeBuffer(buffer,0,values);const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});
  pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);submits++;
 }
 return {draw,device,context,shader,compilation:Array.from(compilation.messages,m=>({type:m.type,message:m.message})),get submits(){return submits;},gpuErrors,dispose(){buffer.destroy();device.destroy();}};
}
export function synthesize(sampleRate=48000){
 const duration=1.44,data=new Float32Array(Math.ceil(sampleRate*duration));let seed=20260930;
 for(let i=0;i<data.length;i++){
  const t=i/sampleRate;seed=(1664525*seed+1013904223)>>>0;const noise=seed/2147483648-1;
  const onset=t<.2?Math.exp(-t*38)*Math.sin(Math.PI*Math.min(1,t/.003)):0;
  const lift=Math.sin(Math.PI*Math.max(0,Math.min(1,(t-.1)/.69)))**2*(t>.1&&t<.79?1:0);
  const at=t-.78,arrival=at>=0?Math.exp(-at*8)*(1-Math.exp(-at*180)):0;
  const base=2040-540*Math.exp(-t*17),phase=2*Math.PI*(base*t);
  // Release: woody transient + inharmonic metal. Transport: band-shaping AM friction.
  const wood=Math.sin(2*Math.PI*270*t)*.17+Math.sin(2*Math.PI*731*t)*.08+noise*.07;
  const metal=Math.sin(phase)*.065+Math.sin(phase*1.47)*.022;
  const flow=lift*(noise*.04*Math.sin(2*Math.PI*1600*t)+Math.sin(2*Math.PI*(730*t+480*t*t))*.015);
  // Receipt: three deliberately unequal, short resonant partials with a soft attack.
  const bell=arrival*(Math.sin(2*Math.PI*1174*at)*.125+Math.sin(2*Math.PI*1768*at)*.07+Math.sin(2*Math.PI*2983*at)*.021);
  const fade=Math.min(1,Math.max(0,(duration-t)/.055));data[i]=(onset*(wood+metal)+flow+bell)*fade;
 }
 return {data,sampleRate,duration};
}
export function createSfx({verify=false}={}){
 let context=null;let gain=null;const played=new Set();const voices=[];
 async function unlock(){if(verify)return false;if(!context){context=new AudioContext();gain=context.createGain();gain.gain.value=.65;gain.connect(context.destination);}await context.resume();return context.state==='running';}
 function play(causeId){if(verify||played.has(causeId))return false;if(!context||context.state!=='running')return false;
  const {data,sampleRate}=synthesize(context.sampleRate);const buffer=context.createBuffer(1,data.length,sampleRate);buffer.copyToChannel(data,0);
  const node=context.createBufferSource();node.buffer=buffer;const vgain=context.createGain(),pan=context.createStereoPanner();node.connect(vgain);vgain.connect(pan);pan.connect(gain);pan.pan.setValueAtTime(-.45,context.currentTime);pan.pan.linearRampToValueAtTime(.45,context.currentTime+.78);node.start();voices.push({node,vgain});played.add(causeId);if(played.size>128)played.delete(played.values().next().value);
  if(voices.length>4){const old=voices.shift();old.vgain.gain.setTargetAtTime(0,context.currentTime,.008);old.node.stop(context.currentTime+.04);}node.onended=()=>{const i=voices.findIndex(v=>v.node===node);if(i>=0)voices.splice(i,1);};return true;}
 return {unlock,play,get state(){return verify?'verify-muted':context?.state||'gesture-required';},dispose(){voices.forEach(v=>v.node.stop());return context?.close();}};
}
