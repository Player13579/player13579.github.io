import {ManaRenderer} from '../src/renderer.js';
const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}};
export class PreviewViewport {
  static async create(device,baseFormat,canvas,{scale,light}){
    const v=new PreviewViewport();Object.assign(v,{device,canvas,scale,light});
    v.targetFormat=baseFormat.endsWith('-srgb')?baseFormat:baseFormat+'-srgb';
    v.context=canvas.getContext('webgpu');v.context.configure({device,format:baseFormat,viewFormats:[v.targetFormat],alphaMode:'opaque'});
    const response=await fetch(new URL('./scene.wgsl',import.meta.url));if(!response.ok)throw new Error('Missing scene shader');
    const module=device.createShaderModule({code:await response.text(),label:'preview-dummy-scene'});const info=await module.getCompilationInfo();
    const errors=info.messages.filter(m=>m.type==='error');if(errors.length)throw new Error(errors.map(e=>e.message).join('\n'));
    v.pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:v.targetFormat,blend}]},primitive:{topology:'triangle-list'}});
    // Separate uniform buffers: queue.writeBuffer is not an in-command-buffer state change.
    v.stages=[0,1,2].map(()=>{const buffer=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});return {buffer,group:device.createBindGroup({layout:v.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]})};});
    v.effect=await ManaRenderer.create({device,format:v.targetFormat,onDiagnostic:m=>window.dispatchEvent(new CustomEvent('mana-diagnostic',{detail:m}))});
    return v;
  }
  render(items,{occluded=false,visible=true}={}){
    const rect=this.canvas.getBoundingClientRect(),width=rect.width,height=rect.height,dpr=Math.min(3,window.devicePixelRatio||1);
    if(width<=0||height<=0)return null;
    const w=Math.max(1,Math.round(width*dpr)),h=Math.max(1,Math.round(height*dpr));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
    const view={width,height,dpr,scale:this.scale,originX:width*0.64,originY:height/2+64*this.scale*0.4};
    this.effect.prepare(items,view);
    this.stages.forEach((stage,i)=>this.device.queue.writeBuffer(stage.buffer,0,new Float32Array([width,height,this.scale,dpr,view.originX,view.originY,0,0,i,this.light?1:0,visible?1:0,occluded?1:0])));
    const enc=this.device.createCommandEncoder();const pass=enc.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView({format:this.targetFormat}),loadOp:'clear',clearValue:{r:0,g:0,b:0,a:1},storeOp:'store'}]});
    const scene=i=>{pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.stages[i].group);pass.draw(3);};
    scene(0);this.effect.drawBehindCharacters(pass);scene(1);this.effect.drawAboveCharacters(pass);scene(2);pass.end();this.device.queue.submit([enc.finish()]);
    this.lastView=view;return view;
  }
  dispose(){this.effect.dispose();this.stages.forEach(s=>s.buffer.destroy());this.context.unconfigure();}
}
