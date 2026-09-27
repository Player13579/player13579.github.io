import {PROFILES,LIMITS,hashId} from './profiles.js';
import {projectedShot,validateCamera} from './geometry.js';
const cache=new WeakMap();
async function programs(device,format){
  let entries=cache.get(device);if(!entries){entries=new Map();cache.set(device,entries);}
  if(entries.has(format))return entries.get(format);
  const pending=(async()=>{
    const texts=await Promise.all(['world','bloom','composite'].map(async name=>{
      const r=await fetch(new URL(`../shaders/${name}.wgsl`,import.meta.url));if(!r.ok)throw new Error(`${name}.wgsl HTTP ${r.status}`);return r.text();
    }));
    const modules=texts.map((code,i)=>device.createShaderModule({label:['world_PH','finite_OBS_bloom','composite_OBS'][i],code}));
    const diagnostics=await Promise.all(modules.map(m=>m.getCompilationInfo()));
    const messages=diagnostics.flatMap((v,i)=>v.messages.map(m=>({shader:['world','bloom','composite'][i],type:m.type,line:m.lineNum,message:m.message})));
    if(messages.some(m=>m.type==='error'))throw new Error(JSON.stringify(messages));
    device.pushErrorScope('validation');
    const over={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
    const add={color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'zero',dstFactor:'one',operation:'add'}};
    const worldLayout=device.createBindGroupLayout({entries:[
      {binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},
      {binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'read-only-storage'}},
      {binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'unfilterable-float'}},
      {binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
      {binding:4,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'read-only-storage'}}
    ]});
    const world=await device.createRenderPipelineAsync({label:'PH separated MRT',layout:device.createPipelineLayout({bindGroupLayouts:[worldLayout]}),vertex:{module:modules[0],entryPoint:'vs'},fragment:{module:modules[0],entryPoint:'fs',targets:[{format:'rgba16float',blend:over},{format:'rgba16float',blend:add},{format:'rgba16float',blend:add}]},primitive:{topology:'triangle-list'}});
    const bloom=await device.createComputePipelineAsync({label:'source bound finite bloom',layout:'auto',compute:{module:modules[1],entryPoint:'cs'}});
    const composite=await device.createRenderPipelineAsync({label:'linear premultiplied composite',layout:'auto',vertex:{module:modules[2],entryPoint:'vs'},fragment:{module:modules[2],entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
    const error=await device.popErrorScope();if(error)throw new Error(error.message);
    return {world,bloom,composite,messages};
  })();entries.set(format,pending);return pending;
}
export async function requestWebGPU(){
  if(!navigator.gpu)throw new Error('WebGPUが利用できません。localhost/HTTPSと対応ブラウザーを確認してください。');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  if(!adapter)throw new Error('WebGPU adapterを取得できません。ソフトウェア描画へ無断で代替しません。');
  const device=await adapter.requestDevice();return {adapter,device,info:adapter.info};
}
/** Canvas専用のWebGPU E。ゲームシーン・銃口・受光面を作成しない。 */
export class ShotRenderer {
  static async create(canvas,{device,adapterInfo=null,worldUnitsPerMeter=64}={}){
    const ownedDevice=!device;
    if(!Number.isFinite(worldUnitsPerMeter)||worldUnitsPerMeter<=0||worldUnitsPerMeter>1e6)throw new RangeError('worldUnitsPerMeter');
    if(!device){const gpu=await requestWebGPU();device=gpu.device;adapterInfo=gpu.info;}
    const r=new ShotRenderer(canvas,device,adapterInfo);r.ownsDevice=ownedDevice;r.worldScale=worldUnitsPerMeter/64;try{await r.init();return r;}catch(e){r.dispose();throw e;}
  }
  constructor(canvas,device,adapterInfo){
    this.canvas=canvas;this.device=device;this.adapterInfo=adapterInfo;this.format=navigator.gpu.getPreferredCanvasFormat();
    this.context=canvas.getContext('webgpu');if(!this.context)throw new Error('WebGPU canvas contextがありません');
    this.textures=[];this.buffers=[];this.width=0;this.height=0;this.disposed=false;this.fatal=null;
    this.stats={frames:0,visibleShots:0,culledShots:0,submitCpuMs:0};
    this.onError=e=>{this.fatal=e.error?.message??String(e);};device.addEventListener('uncapturederror',this.onError);
    device.lost.then(info=>{if(!this.disposed)this.fatal=`device lost: ${info.reason}: ${info.message}`;});
  }
  buffer(size,usage,label){const b=this.device.createBuffer({size,usage,label});this.buffers.push(b);return b;}
  async init(){
    this.programs=await programs(this.device,this.format);
    this.globals=this.buffer(64,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,'共通座標・LDM');
    this.shots=this.buffer(LIMITS.maxShots*112,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,'source instances');
    this.occluders=this.buffer(LIMITS.maxOccluders*32,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,'host light occluders');
    this.blurH=this.buffer(32,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,'OBS H');
    this.blurV=this.buffer(32,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,'OBS V');
    this.compositeParams=this.buffer(16,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,'共通IntensityBudget');
    this.resize(this.canvas.width,this.canvas.height);
  }
  tex(label,format,usage){const t=this.device.createTexture({label,size:[this.width,this.height],format,usage});this.textures.push(t);return t;}
  resize(width,height){
    if(this.disposed)throw new Error('renderer disposed');
    if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||Math.max(width,height)>this.device.limits.maxTextureDimension2D)throw new RangeError('canvas size');
    if(this.width===width&&this.height===height)return;
    for(const t of this.textures)t.destroy();this.textures=[];this.width=width;this.height=height;this.canvas.width=width;this.canvas.height=height;
    this.context.configure({device:this.device,format:this.format,alphaMode:'opaque',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_DST});
    const upload=GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST;
    const hdr=GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT;
    const store=GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING;
    this.scene=this.tex('既存scene albedo','rgba8unorm',upload);
    this.sceneDepth=this.tex('host depth','r32float',upload);
    this.receiver=this.tex('既存受光面mask','r8unorm',upload);
    this.protected=this.tex('OBS保護mask','r8unorm',upload);
    this.body=this.tex('PH body premultiplied','rgba16float',hdr);
    this.emission=this.tex('PH radiance','rgba16float',hdr);
    this.illumination=this.tex('PH receiver response','rgba16float',hdr);
    this.bloomH=this.tex('OBS horizontal','rgba16float',store);
    this.bloomV=this.tex('OBS vertical','rgba16float',store);
    this.output=this.tex('検証可能な最終画素',this.format,GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC);
    const bg=(pipeline,entries)=>this.device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:entries.map((resource,binding)=>({binding,resource:resource.createView?resource.createView():{buffer:resource}}))});
    this.worldBG=bg(this.programs.world,[this.globals,this.shots,this.sceneDepth,this.receiver,this.occluders]);
    this.hBG=bg(this.programs.bloom,[this.blurH,this.emission,this.bloomH]);
    this.vBG=bg(this.programs.bloom,[this.blurV,this.bloomH,this.bloomV]);
    // 未使用のdepth bindingは最適化でlayoutに残らないため、実使用のbindingのみ渡す。
    this.compositeBG=bg(this.programs.composite,[this.compositeParams,this.scene,this.body,this.emission,this.illumination,this.bloomV,this.protected]);
    this.sceneReady=false;
  }
  uploadScene({color,depth,receiverMask,protectedMask,occluders=[]}){
    const pixels=this.width*this.height;
    if(!(color instanceof Uint8Array)||color.length!==pixels*4||!(depth instanceof Float32Array)||depth.length!==pixels||!(receiverMask instanceof Uint8Array)||receiverMask.length!==pixels||!(protectedMask instanceof Uint8Array)||protectedMask.length!==pixels)throw new TypeError('sceneの型・寸法がcanvasと不一致');
    if(occluders.length>LIMITS.maxOccluders)throw new RangeError('光遮蔽矩形は最大32。黙って切り捨てない');
    for(const d of depth)if(!Number.isFinite(d)||d<0||d>1)throw new RangeError('scene depthは0〜1');
    const occ=new Float32Array(LIMITS.maxOccluders*8);
    occluders.forEach((o,i)=>{for(const k of ['x0','y0','x1','y1'])if(!Number.isFinite(o[k]))throw new TypeError(`occluder.${k}`);if(o.x0>o.x1||o.y0>o.y1)throw new RangeError('occluder bounds');occ.set([o.x0,o.y0,o.x1,o.y1,o.blocksLight===false?0:1,0,0,0],i*8);});
    const write=(texture,data,bpp)=>this.device.queue.writeTexture({texture},data,{bytesPerRow:this.width*bpp,rowsPerImage:this.height},[this.width,this.height]);
    write(this.scene,color,4);write(this.sceneDepth,depth,4);write(this.receiver,receiverMask,1);write(this.protected,protectedMask,1);
    this.device.queue.writeBuffer(this.occluders,0,occ);this.occluderCount=occluders.length;this.sceneOccluders=occluders.map(o=>({...o}));this.sceneReady=true;
  }
  render(shots,camera,{reducedMotion=false,bloom=true}={}){
    if(this.disposed||this.fatal)throw new Error(this.fatal??'renderer disposed');
    if(!this.sceneReady)throw new Error('先にhost sceneをuploadSceneする必要があります。受光面は捏造しません');
    validateCamera(camera,this.width,this.height);if(shots.length>LIMITS.maxShots)throw new RangeError('64 source budget exceeded');
    const t0=performance.now();const rows=[];let culled=0;
    // 2.5Dのsource planeを奥から手前へ。同一planeはsourceIdで安定させる。
    const order=[...shots].sort((a,b)=>(b.startDepth+b.endDepth)-(a.startDepth+a.endDepth)||a.id.localeCompare(b.id));
    for(const s of order){
      if(s.age<0||s.age>=s.life)continue;
      const q=projectedShot(s,camera,this.width,this.height,this.worldScale);if(q.culled){culled++;continue;}
      const p=PROFILES[s.variant],ppu=camera.pixelsPerUnit,refPpu=ppu*this.worldScale;
      rows.push(q.a.x,q.a.y,q.direction.x,q.direction.y,
        q.length,s.age,s.life,p.transit,
        p.width*refPpu,p.muzzleLength*refPpu,p.index,(hashId(s.id)%65536)/65536,
        s.startDepth,s.endDepth,ppu,refPpu,
        ...p.body,p.peak,...p.light,this.worldScale,
        s.start.x-camera.x,s.start.y-camera.y,s.dir.x,s.dir.y);
    }
    const rebased=new Float32Array(LIMITS.maxOccluders*8);
    this.sceneOccluders.forEach((o,i)=>rebased.set([o.x0-camera.x,o.y0-camera.y,o.x1-camera.x,o.y1-camera.y,o.blocksLight===false?0:1,0,0,0],i*8));
    this.device.queue.writeBuffer(this.occluders,0,rebased);
    const count=rows.length/28;
    if(count)this.device.queue.writeBuffer(this.shots,0,new Float32Array(rows));
    this.device.queue.writeBuffer(this.globals,0,new Float32Array([this.width,this.height,camera.pixelsPerUnit,0,0,0,Math.cos(camera.rotation),Math.sin(camera.rotation),reducedMotion?1:0,this.occluderCount,0.085,0.46,0,0,0,0]));
    const blurParams=(x,y,threshold)=>{const a=new ArrayBuffer(32);const u=new Uint32Array(a),i=new Int32Array(a),f=new Float32Array(a);u[0]=this.width;u[1]=this.height;i[2]=x;i[3]=y;f[4]=Math.min(14,Math.max(2.0,camera.pixelsPerUnit*this.worldScale*3.2));f[5]=threshold;return a;};
    this.device.queue.writeBuffer(this.blurH,0,blurParams(1,0,1.10));this.device.queue.writeBuffer(this.blurV,0,blurParams(0,1,0));
    this.device.queue.writeBuffer(this.compositeParams,0,new Float32Array([bloom?(reducedMotion?0.040:0.085):0,0,0,0]));
    const encoder=this.device.createCommandEncoder({label:'射撃E PH→OBS'});
    const pass=encoder.beginRenderPass({colorAttachments:[this.body,this.emission,this.illumination].map(t=>({view:t.createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,0]}))});
    pass.setPipeline(this.programs.world);pass.setBindGroup(0,this.worldBG);if(count)pass.draw(6,count);pass.end();
    const compute=encoder.beginComputePass();compute.setPipeline(this.programs.bloom);compute.setBindGroup(0,this.hBG);compute.dispatchWorkgroups(Math.ceil(this.width/8),Math.ceil(this.height/8));compute.setBindGroup(0,this.vBG);compute.dispatchWorkgroups(Math.ceil(this.width/8),Math.ceil(this.height/8));compute.end();
    const composite=encoder.beginRenderPass({colorAttachments:[{view:this.output.createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}]});
    composite.setPipeline(this.programs.composite);composite.setBindGroup(0,this.compositeBG);composite.draw(3);composite.end();
    encoder.copyTextureToTexture({texture:this.output},{texture:this.context.getCurrentTexture()},[this.width,this.height]);
    this.device.queue.submit([encoder.finish()]);
    this.stats={frames:this.stats.frames+1,visibleShots:count,culledShots:culled,submitCpuMs:performance.now()-t0};return this.stats;
  }
  async readPixels(){
    const {width,height}=this;const rowBytes=Math.ceil(width*4/256)*256;
    const b=this.device.createBuffer({size:rowBytes*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    try{const e=this.device.createCommandEncoder();e.copyTextureToBuffer({texture:this.output},{buffer:b,bytesPerRow:rowBytes,rowsPerImage:height},[width,height]);this.device.queue.submit([e.finish()]);await b.mapAsync(GPUMapMode.READ);
      const src=new Uint8Array(b.getMappedRange());const out=new Uint8Array(width*height*4);for(let y=0;y<height;y++)out.set(src.subarray(y*rowBytes,y*rowBytes+width*4),y*width*4);
      if(this.format==='bgra8unorm')for(let i=0;i<out.length;i+=4)[out[i],out[i+2]]=[out[i+2],out[i]];
      b.unmap();return {width,height,rgba:out};
    }finally{b.destroy();}
  }
  dispose(){if(this.disposed)return;this.disposed=true;for(const t of this.textures)t.destroy();for(const b of this.buffers)b.destroy();this.device.removeEventListener('uncapturederror',this.onError);this.context.unconfigure();if(this.ownsDevice)this.device.destroy();}
}
