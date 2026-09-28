import {packedSamples} from './sampler.mjs';
/** WebGPU提出層。権威時計は引数で受け、wall-clockで寿命を延長しない。 */
export class ERenderer {
  static async create(canvas,{shaderURL=new URL('../shaders/effects.wgsl',import.meta.url),onLost=()=>{}}={}) {
    if (!navigator.gpu) throw new Error('WebGPUを利用できません。localhost/HTTPS上の対応ブラウザーで開いてください。Canvas2Dへの代替描画は行いません。');
    const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
    if (!adapter) throw new Error('WebGPU adapterを取得できません。');
    const device=await adapter.requestDevice();
    const renderer=new ERenderer(canvas,device,adapter);
    device.lost.then(info=>{renderer.lost=true;onLost(info);});
    device.addEventListener('uncapturederror',e=>{renderer.errors.push(e.error.message);onLost({message:e.error.message});});
    const response=await fetch(shaderURL);if(!response.ok) throw new Error(`WGSLの取得に失敗: ${response.status}`);
    const code=await response.text();
    device.pushErrorScope('validation');
    const module=device.createShaderModule({label:'DVA original procedural E / PH-OBS separated',code});
    const compilation=await module.getCompilationInfo();
    renderer.compilation=[...compilation.messages].map(m=>({type:m.type,line:m.lineNum,position:m.linePos,message:m.message}));
    if(renderer.compilation.some(m=>m.type==='error')) throw new Error(JSON.stringify(renderer.compilation));
    renderer.pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:renderer.format}]},primitive:{topology:'triangle-list'}});
    const problem=await device.popErrorScope();if(problem)throw new Error(problem.message);
    renderer.bindGroup=device.createBindGroup({layout:renderer.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:renderer.frameBuffer}},{binding:1,resource:{buffer:renderer.eventBuffer}}]});
    return renderer;
  }
  constructor(canvas,device,adapter) {
    this.canvas=canvas;this.device=device;this.adapter=adapter;this.errors=[];this.lost=false;this.destroyed=false;this.submissions=[];
    this.context=canvas.getContext('webgpu');if(!this.context)throw new Error('GPUCanvasContext unavailable');
    this.format=navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({device,format:this.format,alphaMode:'opaque',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
    this.frameBuffer=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.eventBuffer=device.createBuffer({size:32*64,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
  }
  resize(width,height,dpr=1) {
    const max=this.device.limits.maxTextureDimension2D;
    this.canvas.width=Math.max(1,Math.min(max,Math.round(width*dpr)));
    this.canvas.height=Math.max(1,Math.min(max,Math.round(height*dpr)));
    this.dpr=dpr;
  }
  /** callerは遅延待機後にsnapshotを生成する。ここで過去snapshotを再評価しない。 */
  async draw(snapshot,{readback=false}={}) {
    if(this.destroyed||this.lost)throw new Error('WebGPU device unavailable');
    const {samples,actorNowMs,scale=1,background=0,fixture=true,observation=true,localLight=true,exposure=1,camera=[0,0]}=snapshot;
    if(samples.length>32)throw new RangeError('GPU同時発生上限32');
    const uniforms=new Float32Array([this.canvas.width,this.canvas.height,this.dpr??1,scale,camera[0],camera[1],background,fixture?1:0,samples.length,exposure,observation?1:0,localLight?1:0,0,0,64,0]);
    this.device.queue.writeBuffer(this.frameBuffer,0,uniforms);
    if(samples.length)this.device.queue.writeBuffer(this.eventBuffer,0,packedSamples(samples));
    const texture=this.context.getCurrentTexture();const encoder=this.device.createCommandEncoder();
    const pass=encoder.beginRenderPass({colorAttachments:[{view:texture.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
    pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.bindGroup);pass.draw(3);pass.end();
    let buffer,bytesPerRow;
    if(readback){
      bytesPerRow=Math.ceil(this.canvas.width*4/256)*256;
      buffer=this.device.createBuffer({size:bytesPerRow*this.canvas.height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
      encoder.copyTextureToBuffer({texture},{buffer,bytesPerRow,rowsPerImage:this.canvas.height},{width:this.canvas.width,height:this.canvas.height});
    }
    this.device.queue.submit([encoder.finish()]);
    this.submissions.push({actorNowMs,causes:samples.map(s=>s.causeId),ages:samples.map(s=>s.ageActorMs)});
    if(this.submissions.length>256)this.submissions.shift();
    if(buffer){
      await buffer.mapAsync(GPUMapMode.READ);const mapped=new Uint8Array(buffer.getMappedRange());const pixels=new Uint8Array(this.canvas.width*this.canvas.height*4);
      for(let y=0;y<this.canvas.height;y++)pixels.set(mapped.subarray(y*bytesPerRow,y*bytesPerRow+this.canvas.width*4),y*this.canvas.width*4);
      buffer.unmap();buffer.destroy();
      if(this.format.startsWith('bgra'))for(let i=0;i<pixels.length;i+=4){const b=pixels[i];pixels[i]=pixels[i+2];pixels[i+2]=b;}
      return pixels;
    }
    await this.device.queue.onSubmittedWorkDone();
  }
  destroy(){this.destroyed=true;this.frameBuffer.destroy();this.eventBuffer.destroy();this.context.unconfigure();this.device.destroy();}
}
