// GPT-6-Astra original status cleanse, revision r0.9. No raster assets.
export const VERSION='astra-status-cleanse-r0.9';
export const DURATION_MS=1740;
import {shader} from './field-r09.mjs';
export {shader};
export function validateEvent(e,sessionId){
 return Boolean(e&&e.type==='gain-statusRecovery'&&typeof e.id==='string'&&e.id&&typeof e.playerId==='string'&&e.playerId&&e.sessionId===sessionId&&Number.isFinite(e.startedAt)&&Number.isFinite(e.durationMs)&&e.durationMs>=900&&e.durationMs<=6000);
}
export class Lifecycle {
 constructor(sessionId){this.sessionId=sessionId;this.events=new Map();this.seen=new Set();}
 enterSession(id){this.sessionId=id;this.events.clear();this.seen.clear();}
 admit(e){if(!validateEvent(e,this.sessionId)||this.seen.has(e.id))return false;this.seen.add(e.id);this.events.set(e.id,Object.freeze({...e}));return true;}
 plan(id,now,anchor){const e=this.events.get(id);if(!e)return null;const elapsed=now-e.startedAt;if(elapsed>=e.durationMs){this.events.delete(id);return null;}
  if(elapsed<0||!anchor||anchor.playerId!==e.playerId||anchor.visible!==true||![anchor.x,anchor.y,anchor.height].every(Number.isFinite)||anchor.height<=0)return null;
  return {id:e.id,playerId:e.playerId,sessionId:this.sessionId,phase:elapsed/e.durationMs,elapsedMs:elapsed,durationMs:e.durationMs,x:anchor.x,y:anchor.y,height:anchor.height};}
}
export async function createRenderer(canvas){
 if(!navigator.gpu)throw Error('WebGPU unavailable');const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw Error('No WebGPU adapter');
 const device=await adapter.requestDevice();const errors=[];device.addEventListener('uncapturederror',e=>errors.push(e.error.message));device.lost.then(x=>{if(x.reason!=='destroyed')errors.push('device lost: '+x.message);});
 const context=canvas.getContext('webgpu');const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
 device.pushErrorScope('validation');const module=device.createShaderModule({code:shader});const compilation=await module.getCompilationInfo();const failures=compilation.messages.filter(x=>x.type==='error');if(failures.length)throw Error(failures.map(x=>x.message).join('\n'));
 const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
 const bitmap=await createImageBitmap(await (await fetch(new URL('./actor.webp',import.meta.url))).blob());const texture=device.createTexture({size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});device.queue.copyExternalImageToTexture({source:bitmap},{texture},[bitmap.width,bitmap.height]);bitmap.close();const sampler=device.createSampler({minFilter:'linear',magFilter:'linear'});
 const buffer=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:texture.createView()},{binding:2,resource:sampler}]});const error=await device.popErrorScope();if(error)throw Error(error.message);
 let submissions=0;let serial=0;let disposed=false;
 return {device,errors,adapter:adapter.info,version:VERSION,get submissions(){return submissions;},
  draw(plan,{light=false,reduced=false,height=64}={}){if(disposed)throw Error('Disposed renderer');const phase=plan?.phase??-1;
   device.queue.writeBuffer(buffer,0,new Float32Array([canvas.width,canvas.height,plan?.x??canvas.width/2,plan?.y??canvas.height/2,plan?.height??height,phase,Number(light),Number(reduced)]));
   const enc=device.createCommandEncoder();const pass=enc.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();device.queue.submit([enc.finish()]);submissions++;
   return plan?Object.freeze({submitted:true,visible:true,version:VERSION,frameToken:++serial,sessionId:plan.sessionId,causeId:plan.id,ownerId:plan.playerId,effectKind:'statusRecovery',elapsedMs:plan.elapsedMs,durationMs:plan.durationMs}):null;
  },async check(){await device.queue.onSubmittedWorkDone();return [...errors];},dispose(){if(disposed)return;disposed=true;buffer.destroy();texture.destroy();context.unconfigure();device.destroy();}
 };
}









