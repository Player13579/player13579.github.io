import {ManaGainRenderer,loadWGSL} from '../src/gpu.js';
export function bodyFixture(){return {x:0,y:0,heightPx:64,angleRad:0,alive:true,present:true,inVent:false,invisible:false,torsoPolygon:[[-8.2,-48],[8.2,-48],[10,-46.2],[10,-21.8],[8.2,-20],[-8.2,-20],[-10,-21.8],[-10,-46.2]]};}
const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}};
export class InspectionView {
  static async create(device,format,canvas,scale,light){const v=new InspectionView();Object.assign(v,{device,format,canvas,scale,light});try{await v.init();return v;}catch(e){v.dispose();throw e;}}
  async init(){const d=this.device;
    this.context=this.canvas.getContext('webgpu');this.context.configure({device:d,format:this.format,alphaMode:'opaque'});
    this.effect=await ManaGainRenderer.create({device:d,presentationFormat:this.format,onDiagnostic:m=>window.dispatchEvent(new CustomEvent('mana-error',{detail:m}))});
    const {module,report}=await loadWGSL(d,new URL('./fixture.wgsl',import.meta.url),'preview-only-calibration-body');this.compilation=[...this.effect.compilation,report];
    d.pushErrorScope('validation');
    try{this.pipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:'rgba16float',blend}]},primitive:{topology:'triangle-list'}});}
    finally{const err=await d.popErrorScope();if(err)throw Error(err.message);}
    this.stages=[0,1].map(()=>{const buffer=d.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const group=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});return {buffer,group};});
  }
  render(instances,{visible=true,occlusion=false,bloom=true,debugLabels=null}={}){
    const rect=this.canvas.getBoundingClientRect(),width=rect.width,height=rect.height,dpr=Math.min(2,devicePixelRatio||1);
    const w=Math.max(1,Math.round(width*dpr)),h=Math.max(1,Math.round(height*dpr));
    if(!this.hdr||this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.hdr?.destroy();this.hdr=this.device.createTexture({label:'preview-linear-HDR-scene',size:[w,h],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});}
    const originX=width*0.52,originY=height/2+32*this.scale;
    this.effect.prepare(instances,{width,height,dpr,scale:this.scale,originX,originY,postEffects:bloom,debugLabels});
    this.stages.forEach((s,i)=>this.device.queue.writeBuffer(s.buffer,0,new Float32Array([width,height,this.scale,dpr,originX,originY,0,0,i,occlusion?1:0,visible?1:0,0])));
    const enc=this.device.createCommandEncoder();const clear=this.light?{r:0.70,g:0.73,b:0.78,a:1}:{r:0.006,g:0.012,b:0.025,a:1};
    const pass=enc.beginRenderPass({colorAttachments:[{view:this.hdr.createView(),clearValue:clear,loadOp:'clear',storeOp:'store'}]});
    this.effect.draw(pass,'back');
    pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.stages[0].group);pass.draw(3);
    this.effect.draw(pass,'front');
    pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.stages[1].group);pass.draw(3);pass.end();
    this.effect.present(enc,this.hdr.createView(),this.context.getCurrentTexture().createView());this.device.queue.submit([enc.finish()]);
  }
  dispose(){this.effect?.dispose();this.hdr?.destroy();this.stages?.forEach(s=>s.buffer.destroy());this.context?.unconfigure();}
}
