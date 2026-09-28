import {projectEvent,validateView} from '../runtime/projection.mjs';
const STRIDE=16; // 4 vec4f。GPU側のEventと64bytesで一致。
const shaderFiles={A:new URL('../effects/reactor/reactor.wgsl',import.meta.url),B:new URL('../effects/recycling/recycling.wgsl',import.meta.url)};
const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
const nextPower=n=>2**Math.ceil(Math.log2(Math.max(16,n)));
/** ネイティブWebGPU専用。Canvas2D/WebGL/CPU描画/ラスタ素材へフォールバックしない。 */
export class NativeFacilityRenderer {
  static async create(canvas,{device=null,adapter=null,onDiagnostic=()=>{},fetchSource=async url=>{
    const response=await fetch(url);if(!response.ok)throw new Error(`shader fetch: ${response.status}`);return response.text();
  }}={}){
    if(!navigator.gpu)throw new Error('WebGPUがありません。代替レンダラへ切替えません。');
    const ownsDevice=!device;
    if(!device){
      adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance',forceFallbackAdapter:false});
      if(!adapter)throw new Error('ハードウェアWebGPU adapterが取得できません。');
      const info=adapter.info??{};
      const label=[info.vendor,info.architecture,info.device,info.description].join(' ');
      if(adapter.isFallbackAdapter||/swiftshader|llvmpipe|lavapipe|software|microsoft basic render/i.test(label))
        throw new Error('ソフトウェアadapterを棄却しました。実GPU検証はnot_runです。');
      device=await adapter.requestDevice();
    }
    const context=canvas.getContext('webgpu');if(!context)throw new Error('WebGPU canvas contextがありません');
    const renderer=new NativeFacilityRenderer(canvas,context,device,onDiagnostic);
    renderer.ownsDevice=ownsDevice;
    renderer.adapterInfo=adapter?.info??{description:'host-supplied device; hardware provenance belongs to host'};
    await renderer.initialize(fetchSource);return renderer;
  }
  constructor(canvas,context,device,onDiagnostic){
    this.canvas=canvas;this.context=context;this.device=device;this.diagnostic=onDiagnostic;
    this.format=navigator.gpu.getPreferredCanvasFormat();this.pipelines={};this.stores={};this.lost=false;
    this.compilation={};this.lastFrameStats={visibleA:0,visibleB:0,offscreen:0};
    device.lost.then(info=>{this.lost=true;try{onDiagnostic({code:'device_lost',message:info.message});}catch{}});
    this.context.configure({device,format:this.format,alphaMode:'opaque',colorSpace:'srgb'});
    this.viewBuffer=device.createBuffer({label:'E viewport',size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  }
  async compile(url,fetchSource){
    const code=await fetchSource(url);const module=this.device.createShaderModule({label:url.pathname,code});
    const info=await module.getCompilationInfo();
    this.compilation[url.pathname]=info.messages.map(m=>({type:m.type,lineNum:m.lineNum,linePos:m.linePos,message:m.message}));
    if(info.messages.some(m=>m.type==='error'))throw new Error(`WGSL compilation failed: ${url.pathname}: ${info.messages.map(m=>m.message).join('; ')}`);
    return module;
  }
  async initialize(fetchSource){
    for(const key of ['A','B']){
      const module=await this.compile(shaderFiles[key],fetchSource);
      this.pipelines[key]=await this.device.createRenderPipelineAsync({label:`Independent ${key}`,layout:'auto',
        vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:'rgba16float',blend}]},primitive:{topology:'triangle-list'}});
      this.ensureStore(key,16);
    }
    const module=await this.compile(new URL('./composite.wgsl',import.meta.url),fetchSource);
    this.compositor=await this.device.createRenderPipelineAsync({label:'Shared HDR display',layout:'auto',vertex:{module,entryPoint:'vs'},
      fragment:{module,entryPoint:'fs',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
    this.resize();
  }
  ensureStore(key,count){
    if(this.stores[key]?.capacity>=count)return;
    const capacity=nextPower(count);const bytes=capacity*STRIDE*4;
    if(bytes>this.device.limits.maxStorageBufferBindingSize)throw new RangeError('E event storageのデバイス上限');
    const buffer=this.device.createBuffer({label:`${key} visible events`,size:bytes,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
    const bind=this.device.createBindGroup({layout:this.pipelines[key].getBindGroupLayout(0),entries:[
      {binding:0,resource:{buffer:this.viewBuffer}},{binding:1,resource:{buffer}}]});
    this.stores[key]?.buffer.destroy();this.stores[key]={capacity,buffer,bind,cpu:new Float32Array(capacity*STRIDE)};
  }
  resize(){
    const width=this.canvas.width,height=this.canvas.height;
    if(this.width===width&&this.height===height)return;
    if(width<1||height<1||width>this.device.limits.maxTextureDimension2D||height>this.device.limits.maxTextureDimension2D)throw new RangeError('canvas寸法');
    this.hdr?.destroy();this.width=width;this.height=height;
    this.hdr=this.device.createTexture({label:'native HDR attachment, no external raster',size:{width,height},format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
    this.hdrView=this.hdr.createView();
    this.compositeBind=this.device.createBindGroup({layout:this.compositor.getBindGroupLayout(0),entries:[{binding:0,resource:this.hdrView}]});
  }
  prepare(frames,view,{glow=true,reducedMotion=false}={}){
    validateView(view);const lists={A:[],B:[]};let offscreen=0;
    for(const frame of frames){
      if(frame.ageMs<0||frame.ageMs>=2200)continue;
      if(frame.targetKey!=='A'&&frame.targetKey!=='B')continue;
      const p=projectEvent(frame,view);
      if(!p.visible){offscreen++;continue;} // offscreenはGPU slotを消費せず、controllerの寿命は進む。
      lists[frame.targetKey].push(p);
    }
    this.device.queue.writeBuffer(this.viewBuffer,0,new Float32Array([view.width,view.height,0,0]));
    for(const key of ['A','B']){
      const list=lists[key];this.ensureStore(key,list.length);const {cpu,buffer}=this.stores[key];
      for(let n=0;n<list.length;n++){
        const x=list[n],base=n*STRIDE;
        cpu.set([...x.src,...x.dst,x.H,x.ageSeconds,x.hasReceiver,reducedMotion?1:0,...x.bounds,glow?1:0,0,0,0],base);
      }
      if(list.length)this.device.queue.writeBuffer(buffer,0,cpu,0,list.length*STRIDE);
    }
    this.lastFrameStats={visibleA:lists.A.length,visibleB:lists.B.length,offscreen};return lists;
  }
  /** ホストの同一GPUDevice/linear rgba16float/sampleCount1のpassへ組み込む経路。画像取得は行わない。 */
  encodeToPass(pass,frames,view,options={}){
    if(this.lost)return;
    const lists=this.prepare(frames,view,options);
    for(const key of ['A','B'])if(lists[key].length){pass.setPipeline(this.pipelines[key]);pass.setBindGroup(0,this.stores[key].bind);pass.draw(6,lists[key].length);}
  }
  /** 隔離検査canvas用。beforeEffectsは同じnative render passへ既存シーンを描く任意callback。 */
  render(frames,view,{background=[.02,.025,.035],beforeEffects=null,...options}={}){
    if(this.lost)return false;
    this.resize();if(view.width!==this.width||view.height!==this.height)throw new Error('viewとcanvas backing寸法不一致');
    const encoder=this.device.createCommandEncoder({label:'facility E frame'});
    const pass=encoder.beginRenderPass({label:'linear world then E',colorAttachments:[{view:this.hdrView,
      clearValue:{r:background[0],g:background[1],b:background[2],a:1},loadOp:'clear',storeOp:'store'}]});
    beforeEffects?.(pass,view);this.encodeToPass(pass,frames,view,options);pass.end();
    const display=encoder.beginRenderPass({label:'OBS display',colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',clearValue:{r:0,g:0,b:0,a:1},storeOp:'store'}]});
    display.setPipeline(this.compositor);display.setBindGroup(0,this.compositeBind);display.draw(3);display.end();
    this.device.queue.submit([encoder.finish()]);return true;
  }
  destroy(){this.lost=true;for(const s of Object.values(this.stores))s.buffer.destroy();this.viewBuffer.destroy();this.hdr?.destroy();this.context.unconfigure();if(this.ownsDevice)this.device.destroy();}
}
