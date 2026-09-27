import {LIMITS,OBSERVATION_BUDGET} from './profiles.mjs';
import {GEOMETRY_LAYOUT,buildContactGeometry,encodeContactGeometry} from './contact-geometry.mjs';
const STRIDE=24; // 6 vec4 / 96 byte。WGSLとtests/design-runtime.test.mjsで照合。
const FORMATS=['rgba16float','rgba16float','rgba16float'];
function finiteArray(a,n){return Array.isArray(a)&&a.length===n&&a.every(Number.isFinite);}
export function validateProjection(p){
  if(!p||!finiteArray(p.center,2)||!finiteArray(p.axisX,2)||!finiteArray(p.axisY,2))throw new TypeError('project(): center/axisX/axisYが必要');
  const [a,c]=p.axisX,[b,d]=p.axisY;const det=a*d-b*c;
  if(!Number.isFinite(det)||Math.abs(det)<1e-6||Math.max(...p.axisX.map(Math.abs),...p.axisY.map(Math.abs))>16384)throw new RangeError('投影が退化/過大');
  return {inverse:[d/det,-b/det,-c/det,a/det],halfExtent:Math.max(1,Math.min(Math.hypot(a,c),Math.hypot(b,d)))};
}
export function packInstance(frame,projection,layerMask=15){
  if(!Number.isSafeInteger(layerMask)||layerMask<0||layerMask>15)throw new RangeError('diagnostic layer mask');
  const {inverse,halfExtent}=validateProjection(projection);const p=frame.profile;const s=frame.envelope;
  return new Float32Array([...projection.center,...projection.axisX,...projection.axisY,s.u,s.body,
    s.emission,s.release,s.length,s.width,p.weaponIndex,p.aim?1:0,frame.reducedMotion?1:0,p.skew,
    p.spread,halfExtent,layerMask,0,...inverse]);
}
/**
 * RGB=sceneのsRGB符号値、alpha=1を前提。ホスト所有sceneを破壊せず別targetへ出力。
 * mask RGBA: R=E可視許可(255のみ可)、G=実在受光面coverage、B=ホスト光応答、A=保護(0のみ可)。
 * 無mask/古い権限/未知投影では描画せず、CPUの権限はSystem側でも毎frame検査する。
 */
export class HeadshotRenderer {
  #device;#canvas;#context;#format;#instances;#globals;#masks;#textures;#scene;
  #geometry;#formPipeline;#compositePipeline;#formGroup;#compositeGroup;#views=[];#disposed=false;
  #width=0;#height=0;#generation=0;#lost=false;
  diagnostics={shaderMessages:[],uncapturedErrors:[],deviceLost:null};
  static async create({canvas,device=null,shaderSources=null,format=null}){
    if(!canvas)throw new TypeError('canvas');
    let adapterInfo=null;
    if(!device){
      if(!globalThis.navigator?.gpu)throw new Error('WebGPU unavailable: secure contextで対応ブラウザーを使用してください');
      const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
      if(!adapter)throw new Error('WebGPU adapter unavailable');
      adapterInfo=adapter.info?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description,isFallbackAdapter:adapter.info.isFallbackAdapter}:null;
      device=await adapter.requestDevice();
    }
    const sources=shaderSources??{
      contact:await loadText(new URL('../shaders/contact.wgsl',import.meta.url)),
      composite:await loadText(new URL('../shaders/composite.wgsl',import.meta.url)),
    };
    const renderer=new HeadshotRenderer();renderer.#device=device;renderer.#canvas=canvas;
    renderer.#format=format??navigator.gpu.getPreferredCanvasFormat();
    if(!['rgba8unorm','bgra8unorm'].includes(renderer.#format))throw new TypeError('sRGB符号化先は非sRGB unorm canvas formatに限定');
    renderer.diagnostics.adapterInfo=adapterInfo;
    await renderer.#initialize(sources);return renderer;
  }
  get device(){return this.#device;}
  get isLost(){return this.#lost;}
  async #initialize(sources){
    const d=this.#device;this.#context=this.#canvas.getContext('webgpu');if(!this.#context)throw new Error('webgpu canvas context');
    this.#context.configure({device:d,format:this.#format,alphaMode:'opaque',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
    d.addEventListener('uncapturederror',e=>{this.diagnostics.uncapturedErrors.push(String(e.error?.message??e.error));this.#lost=true;});
    d.lost.then(info=>{this.#lost=true;this.diagnostics.deviceLost={reason:info.reason,message:info.message};});
    const modules={};
    for(const name of ['contact','composite']){
      const m=d.createShaderModule({label:`headshot/${name}`,code:sources[name]});
      const report=await m.getCompilationInfo();const messages=[...report.messages].map(x=>({type:x.type,message:x.message,lineNum:x.lineNum,linePos:x.linePos}));
      this.diagnostics.shaderMessages.push({shader:name,messages});
      if(messages.some(x=>x.type==='error'))throw new Error(`WGSL ${name}: ${messages.map(x=>x.message).join('; ')}`);modules[name]=m;
    }
    d.pushErrorScope('validation');
    this.#formPipeline=await d.createRenderPipelineAsync({label:'PH1/PH2 form-source-receiver',layout:'auto',
      vertex:{module:modules.contact,entryPoint:'vs_main'},fragment:{module:modules.contact,entryPoint:'fs_form',targets:FORMATS.map(format=>({format}))},primitive:{topology:'triangle-list'}});
    this.#compositePipeline=await d.createRenderPipelineAsync({label:'OBS local source-bound composite',layout:'auto',
      vertex:{module:modules.composite,entryPoint:'vs_full'},fragment:{module:modules.composite,entryPoint:'fs_composite',targets:[{format:this.#format}]},primitive:{topology:'triangle-list'}});
    const err=await d.popErrorScope();if(err)throw new Error(err.message);
    this.#instances=d.createBuffer({size:LIMITS.maxActive*STRIDE*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
    this.#globals=d.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.#geometry=d.createBuffer({label:'v3-contact-convex-faces',size:LIMITS.maxActive*GEOMETRY_LAYOUT.maxPieces*GEOMETRY_LAYOUT.bytesPerPiece,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
    this.#masks=d.createTexture({label:'event-local-authority-masks',size:[LIMITS.maskSize,LIMITS.maskSize,LIMITS.maxActive],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});
    this.#textures=FORMATS.map((format,i)=>d.createTexture({label:['body','source','receiver'][i],size:[LIMITS.maskSize,LIMITS.maskSize,LIMITS.maxActive],format,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC}));
    this.#views=Array.from({length:LIMITS.maxActive},(_,i)=>this.#textures.map(t=>t.createView({dimension:'2d',baseArrayLayer:i,arrayLayerCount:1})));
    this.#formGroup=d.createBindGroup({layout:this.#formPipeline.getBindGroupLayout(0),entries:[
      {binding:0,resource:{buffer:this.#instances}},{binding:1,resource:{buffer:this.#globals}},{binding:2,resource:this.#masks.createView({dimension:'2d-array'})},{binding:3,resource:{buffer:this.#geometry}}]});
    this.resize(this.#canvas.width,this.#canvas.height);
  }
  resize(width,height){
    if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>this.#device.limits.maxTextureDimension2D||height>this.#device.limits.maxTextureDimension2D)throw new RangeError('resolution');
    if(width===this.#width&&height===this.#height)return;
    this.#canvas.width=width;this.#canvas.height=height;this.#width=width;this.#height=height;
    this.#scene?.destroy();this.#scene=this.#device.createTexture({label:'host-scene-srgb-values',size:[width,height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});
    this.#bindScene(this.#scene.createView());this.#generation++;
  }
  #bindScene(sceneView){
    this.#compositeGroup=this.#device.createBindGroup({layout:this.#compositePipeline.getBindGroupLayout(0),entries:[
      {binding:0,resource:{buffer:this.#instances}},{binding:1,resource:{buffer:this.#globals}},{binding:2,resource:this.#masks.createView({dimension:'2d-array'})},
      ...this.#textures.map((t,i)=>({binding:i+3,resource:t.createView({dimension:'2d-array'})})),{binding:6,resource:sceneView}]});
  }
  /** RGBA8 sRGB符号のホストscene。decode済みlinear textureはここへ渡さない。 */
  setScenePixels(data){
    if(!(data instanceof Uint8Array||data instanceof Uint8ClampedArray)||data.byteLength!==this.#width*this.#height*4)throw new TypeError('scene RGBA8 size');
    this.#device.queue.writeTexture({texture:this.#scene},data,{bytesPerRow:this.#width*4,rowsPerImage:this.#height},[this.#width,this.#height]);
  }
  /** 本番ホストのscene viewを使う。viewは同一GPUDevice / rgba8unorm / 同一解像度であること。 */
  useHostSceneView(view){this.#bindScene(view);}
  /**
   * records = [{frame: System.frame()の要素, projection, mask:Uint8Array(128*128*4)}]
   * maskは現在frame用。rendererが過去のmaskをキャッシュして再利用することはない。
   */
  render(records,{layerMask=15,capture=false}={}){
    if(this.#disposed||this.#lost)throw new Error('renderer disposed/device lost');
    if(!Array.isArray(records)||records.length>LIMITS.maxActive)throw new RangeError('records');
    const d=this.#device;const packed=new Float32Array(Math.max(1,records.length)*STRIDE);const active=[];
    for(const r of records){
      if(!r||!(r.mask instanceof Uint8Array)||r.mask.length!==LIMITS.maskSize*LIMITS.maskSize*4)continue;
      const i=active.length;packed.set(packInstance(r.frame,r.projection,layerMask),i*STRIDE);
      const geometry=encodeContactGeometry(buildContactGeometry(r.frame.profile,r.frame.envelope,r.frame.reducedMotion));
      d.queue.writeBuffer(this.#geometry,i*GEOMETRY_LAYOUT.maxPieces*GEOMETRY_LAYOUT.bytesPerPiece,geometry);
      d.queue.writeTexture({texture:this.#masks,origin:[0,0,i]},r.mask,{bytesPerRow:LIMITS.maskSize*4,rowsPerImage:LIMITS.maskSize},[LIMITS.maskSize,LIMITS.maskSize,1]);active.push(r);
    }
    d.queue.writeBuffer(this.#instances,0,packed);
    d.queue.writeBuffer(this.#globals,0,new Float32Array([this.#width,this.#height,active.length,LIMITS.maskSize,OBSERVATION_BUDGET.nearLight,OBSERVATION_BUDGET.bloom,OBSERVATION_BUDGET.maxAddedLuminance,OBSERVATION_BUDGET.sourceThreshold]));
    const encoder=d.createCommandEncoder({label:'headshot-frame'});
    for(let i=0;i<active.length;i++){
      const pass=encoder.beginRenderPass({colorAttachments:this.#views[i].map(view=>({view,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}))});
      pass.setPipeline(this.#formPipeline);pass.setBindGroup(0,this.#formGroup);pass.draw(6,1,0,i);pass.end();
    }
    const canvasTexture=this.#context.getCurrentTexture();
    const final=encoder.beginRenderPass({colorAttachments:[{view:canvasTexture.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
    final.setPipeline(this.#compositePipeline);final.setBindGroup(0,this.#compositeGroup);final.draw(3);final.end();
    let readback=null;
    if(capture){const bytesPerRow=Math.ceil(this.#width*4/256)*256;
      const buffer=d.createBuffer({size:bytesPerRow*this.#height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
      encoder.copyTextureToBuffer({texture:canvasTexture},{buffer,bytesPerRow},[this.#width,this.#height]);readback={buffer,bytesPerRow,width:this.#width,height:this.#height,format:this.#format};}
    d.queue.submit([encoder.finish()]);
    return readback?this.#readback(readback):null;
  }
  async #readback(r){
    try{await r.buffer.mapAsync(GPUMapMode.READ);const raw=new Uint8Array(r.buffer.getMappedRange());const pixels=new Uint8Array(r.width*r.height*4);
      for(let y=0;y<r.height;y++)pixels.set(raw.subarray(y*r.bytesPerRow,y*r.bytesPerRow+r.width*4),y*r.width*4);
      if(r.format.startsWith('bgra'))for(let i=0;i<pixels.length;i+=4){const t=pixels[i];pixels[i]=pixels[i+2];pixels[i+2]=t;}
      return {pixels,width:r.width,height:r.height};
    }finally{r.buffer.unmap();r.buffer.destroy();}
  }
  async submitted(){await this.#device.queue.onSubmittedWorkDone();}
  dispose(){if(this.#disposed)return;this.#disposed=true;this.#generation++;this.#geometry?.destroy();this.#instances?.destroy();this.#globals?.destroy();this.#masks?.destroy();this.#scene?.destroy();this.#textures?.forEach(t=>t.destroy());this.#context?.unconfigure();}
}
async function loadText(url){const r=await fetch(url);if(!r.ok)throw new Error(`shader load ${r.status}`);return r.text();}
