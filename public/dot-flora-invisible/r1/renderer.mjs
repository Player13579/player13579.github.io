import {worldWGSL} from './world.mjs';
import {observerWGSL} from './observer.mjs';
import {pack} from './plan.mjs';

const vertex=`struct V{@builtin(position) position:vec4f};
@vertex fn vs(@builtin(vertex_index)i:u32)->V{let a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:V;o.position=vec4f(a[i],0,1);return o;}`;
export const shaderPrefix=`struct Params{view:vec4f,geometry:vec4f,state:vec4f,extra:vec4f};
@group(0) @binding(0) var<uniform> p:Params;`;
export const shaderSuffix=`@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f{
let q=(pixel.xy-p.view.zw)/p.geometry.xy;
return worldRadiance(q,p.state.x,p.state.z>.5)*p.state.w;}`;

export function createRenderer({device,context,format,width,height}){
  if(!device?.queue?.onSubmittedWorkDone||!context?.getCurrentTexture||!format||
     format.endsWith('-srgb')||![width,height].every(n=>Number.isInteger(n)&&n>0))throw new TypeError('ready device/context and positive non-sRGB backing dimensions required');
  const source=device.createTexture({label:'Flora private source HDR',size:[width,height],format:'rgba16float',usage:0x10|0x04});
  const uniform=device.createBuffer({label:'Flora source uniform',size:64,usage:0x40|0x08});
  const obs=device.createBuffer({label:'Flora observer uniform',size:16,usage:0x40|0x08});
  const wm=device.createShaderModule({label:'Flora private world',code:shaderPrefix+vertex+worldWGSL+shaderSuffix});
  const om=device.createShaderModule({label:'Flora source-bound OBS',code:observerWGSL});
  const make=(module,target)=>device.createRenderPipeline({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:target}]},primitive:{topology:'triangle-list'}});
  const world=make(wm,'rgba16float'),observer=make(om,format);
  const sourceView=source.createView();
  const wb=device.createBindGroup({layout:world.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
  const ob=device.createBindGroup({layout:observer.getBindGroupLayout(0),entries:[{binding:0,resource:sourceView},{binding:1,resource:device.createSampler({magFilter:'linear',minFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'})},{binding:2,resource:{buffer:obs}}]});
  let disposed=false,busy=false,sequence=0,retirement=null,lastWork=Promise.resolve();
  async function render(plan){
    if(disposed||busy)throw new Error('renderer disposed or frame still pending');
    if(plan.pixelWidth!==width||plan.pixelHeight!==height)throw new TypeError('backing dimensions mismatch');
    const values=pack(plan);busy=true;let scopes=0,errors=[],receipt,written=false,fenced=false;
    try{
      for(const filter of ['validation','out-of-memory','internal']){device.pushErrorScope(filter);scopes++;}
      device.queue.writeBuffer(uniform,0,values);written=true;
      device.queue.writeBuffer(obs,0,new Float32Array([width,height,1,.35]));
      const encoder=device.createCommandEncoder({label:'Flora private two-pass frame'});
      for(const [view,pipeline,bind] of [[sourceView,world,wb],[context.getCurrentTexture().createView(),observer,ob]]){
        const pass=encoder.beginRenderPass({colorAttachments:[{view,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});
        pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();
      }
      device.queue.submit([encoder.finish()]);lastWork=device.queue.onSubmittedWorkDone();fenced=true;await lastWork;
      receipt={effectId:plan.effectId,completed:true,submissionSequence:++sequence,passes:2,width,height,sourceOrigin:plan.sourceOrigin,ageAtSubmit:plan.progress*plan.durationMs};
    }finally{
      if(written&&!fenced){lastWork=device.queue.onSubmittedWorkDone();await lastWork;}
      try{while(scopes-->0)errors.push(await device.popErrorScope());}finally{busy=false;}
    }
    if(errors.some(Boolean))throw new Error('WebGPU scoped error: '+errors.filter(Boolean).map(e=>e.message).join('; '));
    return Object.freeze({...receipt,errorScopes:errors});
  }
  function dispose(){
    if(retirement)return retirement;disposed=true;
    retirement=(async()=>{try{await lastWork;}catch(error){if(!device.lost)throw error;await device.lost;}
      source.destroy();uniform.destroy();obs.destroy();})();return retirement;
  }
  async function clear(){
    if(disposed||busy)throw new Error('renderer disposed or frame still pending');
    busy=true;try{const encoder=device.createCommandEncoder({label:'Flora terminal clear'});
      const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.end();
      device.queue.submit([encoder.finish()]);lastWork=device.queue.onSubmittedWorkDone();await lastWork;return {blank:true,completed:true};
    }finally{busy=false;}
  }
  return Object.freeze({render,clear,dispose,get state(){return disposed?'disposed':busy?'pending':'ready';},async compilationInfo(){return Promise.all([wm.getCompilationInfo(),om.getCompilationInfo()]);}});
}
