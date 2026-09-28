import {VARIANTS,LIFETIME_MS} from './contract.mjs';
const CAP=128; // 64原因×2校正ビュー。ゲームでは通常1ビュー。
const zero={r:0,g:0,b:0,a:0};
async function loadShader(name){const r=await fetch(new URL(`../shaders/${name}`,import.meta.url));if(!r.ok)throw new Error(`shader ${name}: HTTP ${r.status}`);return r.text();}
/** WebGPU専用。非対応時にCanvas2DをWebGPU成功と偽らず、明示エラーで停止する。 */
export class UseRenderer {
  static async create(canvas,{shaderLoader=loadShader,onDeviceLost=()=>{}}={}){
    if(!globalThis.isSecureContext||!navigator.gpu)throw new Error('WebGPUには対応ブラウザとHTTPSまたはlocalhostが必要です。');
    const adapter=await navigator.gpu.requestAdapter({powerPreference:'low-power'});
    if(!adapter)throw new Error('WebGPU adapterを取得できません。');
    const device=await adapter.requestDevice();
    const r=new UseRenderer(canvas,adapter,device,onDeviceLost);
    try{await r.initialize(shaderLoader);return r;}catch(e){r.dispose();throw e;}
  }
  constructor(canvas,adapter,device,onDeviceLost){
    this.canvas=canvas;this.adapter=adapter;this.device=device;this.context=canvas.getContext('webgpu');
    if(!this.context)throw new Error('GPUCanvasContext unavailable');
    this.format=navigator.gpu.getPreferredCanvasFormat();this.width=0;this.height=0;this.lost=false;
    this.errors=[];this.shaderInfo={};this.frameCount=0;this.lastDrawCount=0;this.lastFrameId=-1;
    device.addEventListener('uncapturederror',e=>{this.errors.push(String(e.error?.message??e.error));});
    device.lost.then(info=>{this.lost=true;onDeviceLost(info);});
  }
  async initialize(loader){
    const d=this.device;d.pushErrorScope('validation');
    const modules={};
    for(const name of ['field','diffusion','composite']){
      const code=await loader(`${name}.wgsl`);const m=d.createShaderModule({label:name,code});
      const info=await m.getCompilationInfo();this.shaderInfo[name]=info.messages.map(x=>({type:x.type,line:x.lineNum,column:x.linePos,message:x.message}));
      if(info.messages.some(x=>x.type==='error'))throw new Error(`${name}: ${info.messages.filter(x=>x.type==='error').map(x=>x.message).join('; ')}`);
      modules[name]=m;
    }
    const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
    const add={color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one',operation:'add'}};
    this.field=await d.createRenderPipelineAsync({label:'PH1-field',layout:'auto',vertex:{module:modules.field,entryPoint:'vs'},fragment:{module:modules.field,entryPoint:'fs',targets:[{format:'rgba16float',blend},{format:'rgba16float',blend:add}]},primitive:{topology:'triangle-list'}});
    this.blur=await d.createRenderPipelineAsync({label:'OBS1-PSF',layout:'auto',vertex:{module:modules.diffusion,entryPoint:'vs'},fragment:{module:modules.diffusion,entryPoint:'fs',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
    this.compose=await d.createRenderPipelineAsync({label:'OBS2-output',layout:'auto',vertex:{module:modules.composite,entryPoint:'vs'},fragment:{module:modules.composite,entryPoint:'fs',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
    this.globals=d.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.instances=d.createBuffer({size:CAP*32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
    this.blurH=d.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.blurV=d.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    const err=await d.popErrorScope();if(err)throw new Error(err.message);
    this.resize(this.canvas.width,this.canvas.height);
  }
  resize(width,height){
    if(this.lost)return;
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>this.device.limits.maxTextureDimension2D||height>this.device.limits.maxTextureDimension2D)throw new RangeError('invalid viewport');
    if(width===this.width&&height===this.height)return;
    this.destroyTargets();this.width=width;this.height=height;this.canvas.width=width;this.canvas.height=height;
    const d=this.device;this.context.configure({device:d,format:this.format,alphaMode:'premultiplied',colorSpace:'srgb',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
    const make=(label,format)=>d.createTexture({label,size:[width,height],format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.COPY_SRC});
    this.core=make('PH1-color','rgba16float');this.radiance=make('PH1-emission','rgba16float');this.ping=make('PSF-horizontal','rgba16float');this.glow=make('PSF-vertical','rgba16float');
    this.mask=d.createTexture({label:'current-visibility-and-body-mask',size:[width,height],format:'r8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});
    const group=(pipeline,entries)=>d.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries});
    this.fieldGroup=group(this.field,[{binding:0,resource:{buffer:this.globals}},{binding:1,resource:{buffer:this.instances}},{binding:2,resource:this.mask.createView()}]);
    this.blurHGroup=group(this.blur,[{binding:0,resource:this.radiance.createView()},{binding:1,resource:{buffer:this.blurH}}]);
    this.blurVGroup=group(this.blur,[{binding:0,resource:this.ping.createView()},{binding:1,resource:{buffer:this.blurV}}]);
    this.composeGroup=group(this.compose,[{binding:0,resource:this.core.createView()},{binding:1,resource:this.glow.createView()},{binding:2,resource:this.mask.createView()}]);
    d.queue.writeBuffer(this.globals,0,new Float32Array([width,height,1/width,1/height]));
    this.maskStride=Math.ceil(width/256)*256;
    this.maskStaging=new Uint8Array(this.maskStride*height);
  }
  /** draw recordsはruntime.frame()の承認済み原因からhostが投影する。maskは毎frame必須。 */
  render(draws,{frameId,mask,devicePixelRatio=1}={}){
    if(this.lost)return false;
    const w=this.width,h=this.height;
    const freshFrame=Number.isSafeInteger(frameId)&&frameId>=0&&frameId>this.lastFrameId;
    if(freshFrame)this.lastFrameId=frameId;
    const goodMask=freshFrame&&mask?.frameId===frameId&&mask.width===w&&mask.height===h&&mask.data instanceof Uint8Array&&mask.data.length===w*h;
    const selected=goodMask&&Array.isArray(draws)?draws.filter(e=>VARIANTS.includes(e.variant)&&[e.xPx,e.yPx,e.worldToPixel,e.ageMs].every(Number.isFinite)&&e.worldToPixel>0&&e.worldToPixel<=16&&e.ageMs>=0&&e.ageMs<LIFETIME_MS&&e.xPx>=0&&e.xPx<w&&e.yPx>=0&&e.yPx<h).slice(0,CAP):[];
    this.lastDrawCount=selected.length;
    // 未確認maskでは以前のframeのGPU画素も消す。古いmaskを保持して描かない。
    this.maskStaging.fill(0);
    if(goodMask)for(let y=0;y<h;y++)this.maskStaging.set(mask.data.subarray(y*w,(y+1)*w),y*this.maskStride);
    this.device.queue.writeTexture({texture:this.mask},this.maskStaging,{bytesPerRow:this.maskStride,rowsPerImage:h},[w,h]);
    const a=new Float32Array(Math.max(1,selected.length)*8);
    selected.forEach((e,j)=>a.set([e.xPx,e.yPx,e.worldToPixel,e.ageMs/1000,VARIANTS.indexOf(e.variant),e.reducedMotion?1:0,0,0],j*8));
    this.device.queue.writeBuffer(this.instances,0,a);
    const spread=Number.isFinite(devicePixelRatio)?Math.max(1,Math.min(2,devicePixelRatio)):1;
    this.device.queue.writeBuffer(this.blurH,0,new Float32Array([spread,0,w,h]));
    this.device.queue.writeBuffer(this.blurV,0,new Float32Array([0,spread,w,h]));
    const encoder=this.device.createCommandEncoder({label:'action-item-use-frame'});
    let pass=encoder.beginRenderPass({label:'world-field',colorAttachments:[this.core,this.radiance].map(t=>({view:t.createView(),clearValue:zero,loadOp:'clear',storeOp:'store'}))});
    pass.setPipeline(this.field);pass.setBindGroup(0,this.fieldGroup);if(selected.length)pass.draw(6,selected.length);pass.end();
    for(const [target,group] of [[this.ping,this.blurHGroup],[this.glow,this.blurVGroup]]){
      pass=encoder.beginRenderPass({colorAttachments:[{view:target.createView(),clearValue:zero,loadOp:'clear',storeOp:'store'}]});pass.setPipeline(this.blur);pass.setBindGroup(0,group);pass.draw(3);pass.end();
    }
    pass=encoder.beginRenderPass({label:'protected-composite',colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:zero,loadOp:'clear',storeOp:'store'}]});
    pass.setPipeline(this.compose);pass.setBindGroup(0,this.composeGroup);pass.draw(3);pass.end();
    this.device.queue.submit([encoder.finish()]);this.frameCount++;
    return goodMask;
  }
  async checkpoint(){await this.device.queue.onSubmittedWorkDone();return {submittedFrames:this.frameCount,drawCount:this.lastDrawCount,shaderInfo:this.shaderInfo,errors:[...this.errors],adapter:{vendor:this.adapter.info?.vendor??'',architecture:this.adapter.info?.architecture??'',device:this.adapter.info?.device??'',description:this.adapter.info?.description??'',isFallbackAdapter:this.adapter.info?.isFallbackAdapter??null}};}
  destroyTargets(){for(const key of ['core','radiance','ping','glow','mask'])this[key]?.destroy();}
  dispose(){this.destroyTargets();for(const key of ['globals','instances','blurH','blurV'])this[key]?.destroy();this.context?.unconfigure();this.device?.destroy();this.lost=true;}
}
