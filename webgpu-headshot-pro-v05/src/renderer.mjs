import {LIMITS,LAYERS} from './contract.mjs';
import {packForm} from './form.mjs';
export const INSTANCE_FLOATS=24;
export function validateProjection(p){
  for(const key of ['center','axisX','axisY'])if(!Array.isArray(p?.[key])||p[key].length!==2||!p[key].every(Number.isFinite))throw new TypeError(`projection.${key}`);
  const [a,b]=p.axisX,[c,d]=p.axisY,det=a*d-b*c;
  if(Math.abs(det)<.0001||Math.max(Math.hypot(a,b),Math.hypot(c,d))>1e6)throw new RangeError('degenerate/oversized projection');
  return {det,inverse:[d/det,-c/det,-b/det,a/det],nativeRadius:Math.min(Math.hypot(a,b),Math.hypot(c,d))};
}
/** 正規x/yから投影する。現在の対象座標や推定射線に追従しない。worldToScreenはホスト実装。 */
export function projectContact(event,worldToScreen){
  if(typeof worldToScreen!=='function')throw new TypeError('worldToScreen');
  const c=worldToScreen(event.x,event.y),x=worldToScreen(event.x+event.radius,event.y),y=worldToScreen(event.x,event.y+event.radius);
  const p={center:c,axisX:[x[0]-c[0],x[1]-c[1]],axisY:[y[0]-c[0],y[1]-c[1]]};validateProjection(p);return p;
}
export function packInstance(frame,projection,flags=LAYERS.all){
  if(!Number.isSafeInteger(flags)||flags<0||flags>15)throw new TypeError('layer flags');
  const m=validateProjection(projection),s=frame.envelope;
  if(!s||!['u','body','source','spread','fold','pressure'].every(k=>Number.isFinite(s[k])))throw new TypeError('finite state required');
  // 10variantはここへ一切格納しない。入力eventのIDも乱数seedにしない。
  return new Float32Array([...projection.center,...projection.axisX,...projection.axisY,s.u,Number(frame.reducedMotion),
    s.body,s.source,s.spread,s.fold,s.pressure,0,m.nativeRadius,flags,...m.inverse,0,0,0,0]);
}
async function source(url){const r=await fetch(url);if(!r.ok)throw new Error(`WGSL HTTP ${r.status}`);return r.text();}
/** 同一deviceで複数の原寸観測を共有できる。未対応機能の必須化はしない。 */
export async function createGPUResources({device=null,shaderRoot=new URL('../shaders/',import.meta.url)}={}){
  let adapter=null;
  if(!device){if(!globalThis.navigator?.gpu)throw new Error('WebGPU unavailable');adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('WebGPU adapter unavailable');device=await adapter.requestDevice();}
  const codes=await Promise.all(['contact.wgsl','composite.wgsl'].map(p=>source(new URL(p,shaderRoot))));
  const modules=codes.map((code,i)=>device.createShaderModule({label:i?'v5-observation':'v5-contact',code}));
  const info=await Promise.all(modules.map(m=>m.getCompilationInfo()));
  const compilation=info.map((v,i)=>({file:i?'composite.wgsl':'contact.wgsl',messages:v.messages.map(m=>({type:m.type,line:m.lineNum,column:m.linePos,message:m.message}))}));
  if(compilation.some(v=>v.messages.some(m=>m.type==='error')))throw new Error('WGSL compile failed: '+JSON.stringify(compilation));
  device.pushErrorScope('validation');
  let formPipeline,compositePipeline;
  const format=navigator.gpu.getPreferredCanvasFormat();
  try{
    [formPipeline,compositePipeline]=await Promise.all([
      device.createRenderPipelineAsync({label:'v5-body-emission-receiver',layout:'auto',vertex:{module:modules[0],entryPoint:'vs_form'},fragment:{module:modules[0],entryPoint:'fs_form',targets:[{format:'rgba16float'},{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}}),
      device.createRenderPipelineAsync({label:'v5-uncompressed-SDR',layout:'auto',vertex:{module:modules[1],entryPoint:'vs_comp'},fragment:{module:modules[1],entryPoint:'fs_comp',targets:[{format}]},primitive:{topology:'triangle-list'}})
    ]);
  }finally{const error=await device.popErrorScope();if(error)throw new Error(error.message);}
  return {device,adapterInfo:adapter?.info??null,format,formPipeline,compositePipeline,compilation};
}
export class ContactRenderer {
  #r;#canvas;#context;#instances;#globals;#form;#masks;#textures;#views;#scene;#groups;#width=0;#height=0;#disposed=false;#lost=false;
  constructor(canvas,resources){
    if(!canvas?.getContext||!resources?.device)throw new TypeError('canvas/resources');
    this.#canvas=canvas;this.#r=resources;this.#context=canvas.getContext('webgpu');if(!this.#context)throw new Error('canvas WebGPU context unavailable');
    const d=resources.device;d.lost.then(()=>{this.#lost=true;});
    this.#context.configure({device:d,format:resources.format,alphaMode:'opaque',colorSpace:'srgb',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
    this.#instances=d.createBuffer({label:'v5-instances-no-variant',size:LIMITS.maxActive*INSTANCE_FLOATS*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
    this.#globals=d.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    const form=packForm();this.#form=d.createBuffer({size:form.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});d.queue.writeBuffer(this.#form,0,form);
    this.#masks=d.createTexture({size:[LIMITS.maskSize,LIMITS.maskSize,LIMITS.maxActive],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});
    this.#textures=Array.from({length:3},()=>d.createTexture({size:[LIMITS.maskSize,LIMITS.maskSize,LIMITS.maxActive],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));
    this.#views=Array.from({length:LIMITS.maxActive},(_,layer)=>this.#textures.map(t=>t.createView({dimension:'2d',baseArrayLayer:layer,arrayLayerCount:1})));
    this.#groups={form:d.createBindGroup({layout:resources.formPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.#instances}},{binding:1,resource:{buffer:this.#globals}},{binding:2,resource:this.#masks.createView({dimension:'2d-array'})},{binding:3,resource:{buffer:this.#form}}]})};
    this.resize(canvas.width,canvas.height);
  }
  get isLost(){return this.#lost;}
  get size(){return [this.#width,this.#height];}
  resize(width,height){
    if(this.#disposed)throw new Error('disposed');
    if(![width,height].every(n=>Number.isSafeInteger(n)&&n>0&&n<=this.#r.device.limits.maxTextureDimension2D))throw new RangeError('resolution');
    if(width===this.#width&&height===this.#height)return;
    this.#canvas.width=this.#width=width;this.#canvas.height=this.#height=height;this.#scene?.destroy();
    this.#scene=this.#r.device.createTexture({size:[width,height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});
    this.useHostSceneView(this.#scene.createView());
  }
  /** 同じdevice、同解像度のrgba8unorm、sRGB符号値を格納したsceneのみ。 */
  useHostSceneView(view){this.#groups.composite=this.#r.device.createBindGroup({layout:this.#r.compositePipeline.getBindGroupLayout(0),entries:[
    {binding:0,resource:{buffer:this.#instances}},{binding:1,resource:{buffer:this.#globals}},{binding:2,resource:this.#masks.createView({dimension:'2d-array'})},
    ...this.#textures.map((t,i)=>({binding:3+i,resource:t.createView({dimension:'2d-array'})})),{binding:6,resource:view}]});}
  setScenePixels(pixels){
    if(!(pixels instanceof Uint8Array||pixels instanceof Uint8ClampedArray)||pixels.byteLength!==this.#width*this.#height*4)throw new TypeError('scene RGBA8');
    this.#r.device.queue.writeTexture({texture:this.#scene},pixels,{bytesPerRow:this.#width*4,rowsPerImage:this.#height},[this.#width,this.#height]);
  }
  /** recordsはこのframeの可視frame+投影+mask。永続的な旧maskは再利用しない。 */
  render(records,{layerMask=LAYERS.all,capture=false}={}){
    if(this.#disposed||this.#lost)throw new Error('renderer unavailable');
    if(!Array.isArray(records)||records.length>LIMITS.maxActive)throw new RangeError('records');
    const d=this.#r.device,packed=new Float32Array(Math.max(1,records.length)*INSTANCE_FLOATS);
    for(let i=0;i<records.length;i++){
      const v=records[i];if(!(v.mask instanceof Uint8Array)||v.mask.length!==LIMITS.maskSize**2*4)throw new TypeError('current visibility mask required');
      packed.set(packInstance(v.frame,v.projection,layerMask),i*INSTANCE_FLOATS);
      d.queue.writeTexture({texture:this.#masks,origin:[0,0,i]},v.mask,{bytesPerRow:LIMITS.maskSize*4,rowsPerImage:LIMITS.maskSize},[LIMITS.maskSize,LIMITS.maskSize,1]);
    }
    d.queue.writeBuffer(this.#instances,0,packed);d.queue.writeBuffer(this.#globals,0,new Float32Array([this.#width,this.#height,records.length,LIMITS.maskSize,0,0,0,0]));
    const encoder=d.createCommandEncoder({label:'v5-contact-frame'});
    for(let i=0;i<records.length;i++){
      const pass=encoder.beginRenderPass({colorAttachments:this.#views[i].map(view=>({view,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}))});
      pass.setPipeline(this.#r.formPipeline);pass.setBindGroup(0,this.#groups.form);pass.draw(6,1,0,i);pass.end();
    }
    const output=this.#context.getCurrentTexture();
    const pass=encoder.beginRenderPass({colorAttachments:[{view:output.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
    pass.setPipeline(this.#r.compositePipeline);pass.setBindGroup(0,this.#groups.composite);pass.draw(3);pass.end();
    let readback;
    if(capture){const bytesPerRow=Math.ceil(this.#width*4/256)*256;const buffer=d.createBuffer({size:bytesPerRow*this.#height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});encoder.copyTextureToBuffer({texture:output},{buffer,bytesPerRow},[this.#width,this.#height]);readback={buffer,bytesPerRow,width:this.#width,height:this.#height};}
    d.queue.submit([encoder.finish()]);return readback?this.#readback(readback):null;
  }
  async #readback(r){
    try{await r.buffer.mapAsync(GPUMapMode.READ);const raw=new Uint8Array(r.buffer.getMappedRange()),pixels=new Uint8Array(r.width*r.height*4);
      for(let y=0;y<r.height;y++)pixels.set(raw.subarray(y*r.bytesPerRow,y*r.bytesPerRow+r.width*4),y*r.width*4);
      if(this.#r.format.startsWith('bgra'))for(let i=0;i<pixels.length;i+=4){const t=pixels[i];pixels[i]=pixels[i+2];pixels[i+2]=t;}
      return {pixels,width:r.width,height:r.height};
    }finally{r.buffer.unmap();r.buffer.destroy();}
  }
  async submitted(){await this.#r.device.queue.onSubmittedWorkDone();}
  dispose(){if(this.#disposed)return;this.#disposed=true;for(const v of [this.#instances,this.#globals,this.#form,this.#masks,this.#scene,...this.#textures])v?.destroy();this.#context.unconfigure();}
}
