import {ManaRenderer} from '../src/renderer.js';
export class PreviewScene {
  static async create(device,format,canvas,scale,light,scenePipelines,manaPipeline){
    const self=new PreviewScene();Object.assign(self,{device,format,canvas,scale,light,pipelines:scenePipelines,foreground:false,grid:true,mannequin:true});
    self.context=canvas.getContext('webgpu');if(!self.context)throw new Error('Cannot create WebGPU canvas context');
    self.context.configure({device,format,alphaMode:'premultiplied'});
    self.uniform=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    self.bindGroups={};for(const [name,pipeline]of Object.entries(scenePipelines)) self.bindGroups[name]=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:self.uniform}}]});
    self.mana=new ManaRenderer(device,manaPipeline);
    return self;
  }
  draw(effects){
    const rect=this.canvas.getBoundingClientRect(),dpr=Math.min(2,globalThis.devicePixelRatio||1),w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
    const width=rect.width,height=rect.height,originX=width/2,originY=height/2+32*this.scale;
    const params=new Float32Array(16);params.set([width,height,this.scale,this.light,originX,originY,this.foreground?1:0,this.grid?1:0,this.mannequin?1:0]);
    this.device.queue.writeBuffer(this.uniform,0,params);
    this.mana.prepare(effects,{width,height,scale:this.scale,originX,originY});
    const enc=this.device.createCommandEncoder();const pass=enc.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
    const scene=(name)=>{pass.setPipeline(this.pipelines[name]);pass.setBindGroup(0,this.bindGroups[name]);pass.draw(3);};
    scene('background');this.mana.drawBack(pass);scene('body');this.mana.drawFront(pass);scene('foreground');
    pass.end();this.device.queue.submit([enc.finish()]);
  }
  dispose(){this.mana.dispose();this.uniform.destroy();this.context.unconfigure();}
}
export async function createScenePipelines(device,format){
  const response=await fetch(new URL('./scene.wgsl',import.meta.url));const module=device.createShaderModule({code:await response.text(),label:'Calibration fixtures only'});
  const info=await module.getCompilationInfo();if(info.messages.some(m=>m.type==='error'))throw new Error(info.messages.map(m=>m.message).join('\n'));
  const pipelines={};for(const name of ['background','body','foreground'])pipelines[name]=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:name,targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list'}});
  return pipelines;
}
