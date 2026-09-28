import {MAX_ACTIVE_EVENTS, CONTRACT} from './contract.mjs';
import {loadShaderSource} from './shader-source.mjs';
let globalFrameId=0;
const align=(n,a)=>Math.ceil(n/a)*a;
/** 実装はWebGPUのみ。textureはGPU中間render targetであり画像素材ではない。 */
export class ManaWebGPURenderer {
  static async create(canvas,{adapterOptions={},diagnosticAllowHidden=false}={}) {
    if(!globalThis.navigator?.gpu)throw new Error('WebGPUがありません。HTTPS/localhostとWebGPU対応環境で開いてください。');
    const adapter=await navigator.gpu.requestAdapter(adapterOptions);
    if(!adapter)throw new Error('WebGPU adapterを取得できません。Canvas 2Dへのfallbackはありません。');
    const device=await adapter.requestDevice();
    const renderer=new ManaWebGPURenderer(canvas,device,adapter,diagnosticAllowHidden);
    try { await renderer.init();return renderer; }
    catch(error) {
      error.gpuStage=renderer.validationStage ?? 'initialization';
      error.compilationMessages=[...renderer.compilation];
      renderer.dispose();throw error;
    }
  }
  constructor(canvas,device,adapter,diagnosticAllowHidden) {
    this.canvas=canvas;this.device=device;this.adapter=adapter;this.diagnosticAllowHidden=diagnosticAllowHidden;
    this.context=canvas.getContext('webgpu');if(!this.context)throw new Error('WebGPU canvas context作成失敗');
    this.format=navigator.gpu.getPreferredCanvasFormat();this.generation=1;this.lost=false;this.busy=false;
    this.viewResources=[];this.compilation=[];this.validationErrors=[];
    this.context.configure({device,format:this.format,alphaMode:'premultiplied'});
    device.lost.then(info=>{this.lost=true;this.hide();this.onFailure?.(`device-lost: ${info.message}`);});
    device.addEventListener('uncapturederror',e=>{this.validationErrors.push(e.error.message);this.onFailure?.(e.error.message);});
  }
  async init() {
    this.validationStage='shader-fetch';
    const sources=await loadShaderSource(),d=this.device;
    this.validationStage='shader-compilation';
    const module=d.createShaderModule({label:'independent-mana-r02-continuous-transfer',code:sources.world});
    const present=d.createShaderModule({label:'mana-present',code:sources.present});
    for(const [name,m] of [['mana',module],['present',present]]){
      const info=await m.getCompilationInfo();
      for(const x of info.messages)this.compilation.push({module:name,type:x.type,line:x.lineNum,message:x.message});
    }
    if(this.compilation.some(m=>m.type==='error'))throw new Error(JSON.stringify(this.compilation));
    this.validationStage='pipeline-compilation';
    this.pipeline=await d.createRenderPipelineAsync({label:'mana-world-OBS-MRT',layout:'auto',vertex:{module,entryPoint:'vertexMain'},fragment:{module,entryPoint:'fragmentMain',targets:[{format:'rgba8unorm'},{format:'r32uint'}]},primitive:{topology:'triangle-list'}});
    this.presentPipeline=await d.createRenderPipelineAsync({label:'mana-present',layout:'auto',vertex:{module:present,entryPoint:'vertexMain'},fragment:{module:present,entryPoint:'fragmentMain',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
    this.resizeTargets();this.validationStage='ready';
  }
  isCanvasVisible() {
    if(this.diagnosticAllowHidden)return false; // verify用のoffscreen読取に発音許可を出さない。
    const c=this.canvas, r=c.getBoundingClientRect();
    if(document.visibilityState!=='visible' || !c.isConnected || r.width<=0 || r.height<=0 || r.top<0 || r.left<0 || r.bottom>innerHeight || r.right>innerWidth)return false;
    for(let e=c;e instanceof Element;e=e.parentElement){
      const s=getComputedStyle(e);if(s.display==='none' || ['hidden','collapse'].includes(s.visibility) || Number(s.opacity)<=0)return false;
      // 原寸判定と発音を、DOMの一部だけ見えるcanvasへ与えない（安全側）。
      if(e!==c){const b=e.getBoundingClientRect();
        const clipX=['hidden','clip','auto','scroll'].includes(s.overflowX);
        const clipY=['hidden','clip','auto','scroll'].includes(s.overflowY);
        if((clipX&&(r.left<b.left+e.clientLeft||r.right>b.left+e.clientLeft+e.clientWidth)) ||
           (clipY&&(r.top<b.top+e.clientTop||r.bottom>b.top+e.clientTop+e.clientHeight)))return false;
      }
    }
    return true;
  }
  hide(){this.generation++;this.canvas.style.visibility='hidden';}
  allowPresentation(){this.canvas.style.visibility='';}
  resizeTargets(){
    const w=Math.max(1,this.canvas.width),h=Math.max(1,this.canvas.height);
    if(this.targetWidth===w && this.targetHeight===h)return;
    this.scene?.destroy();this.witness?.destroy();this.targetWidth=w;this.targetHeight=h;
    this.scene=this.device.createTexture({label:'linear-composed-srgb-encoded-color',size:[w,h],format:'rgba8unorm',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});
    this.witness=this.device.createTexture({label:'actual-fragment-event-token',size:[w,h],format:'r32uint',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
    this.presentBind=this.device.createBindGroup({layout:this.presentPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:this.scene.createView()}]});
  }
  resources(index){
    if(!this.viewResources[index]){
      const d=this.device;
      const uniforms=d.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      const events=d.createBuffer({size:MAX_ACTIVE_EVENTS*48,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
      const bind=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniforms}},{binding:1,resource:{buffer:events}}]});
      this.viewResources[index]={uniforms,events,bind};
    }return this.viewResources[index];
  }
  /**
   * views: [{rect:[x,y,width,height] physical px, background:[linearR,G,B,A],
   *          project:(worldX,worldY)=>[pixelX,pixelY], scale:physicalPixelsPerWorld}]
   * isCurrentをoffscreen生成後・canvas提出前・完了後に再検査する。
   */
  async render(frame,views,{isCurrent=()=>true,capture=false,world=true,observation=true,lighting=true,verify=false,inspectionLayer=0}={}) {
    if(this.busy)throw new Error('同一rendererへの並列renderは不可です');
    if(this.lost)throw new Error('device lost');
    if(![0,1,2,3].includes(inspectionLayer))throw new RangeError('inspectionLayerは0..3');
    if(inspectionLayer!==0&&!verify)throw new Error('層分解はverify専用');
    if(frame.items.length>MAX_ACTIVE_EVENTS)throw new RangeError('event capacity');
    if(!Array.isArray(views)||!views.length)throw new TypeError('viewを最低1つ指定してください');
    this.busy=true;const generation=this.generation,frameId=++globalFrameId,d=this.device;
    const readBuffers=[];let errorScopeOpen=false;
    try{
      this.resizeTargets();d.pushErrorScope('validation');errorScopeOpen=true;
      const encoder=d.createCommandEncoder({label:`mana-frame-${frameId}`});
      const pass=encoder.beginRenderPass({colorAttachments:[
        {view:this.scene.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'},
        {view:this.witness.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
      pass.setPipeline(this.pipeline);
      for(let v=0;v<views.length;v++){
        const view=views[v], [x,y,w,h]=view.rect;
        if(!(view.scale>0) || ![x,y,w,h,view.scale].every(Number.isFinite) || x<0 || y<0 || w<=0 || h<=0 || x+w>this.targetWidth || y+h>this.targetHeight)throw new RangeError('view範囲/scale不正');
        const res=this.resources(v),packed=new Float32Array(Math.max(1,frame.items.length)*12);
        for(let j=0;j<frame.items.length;j++){
          const e=frame.items[j],pos=view.project(e.worldX,e.worldY);
          if(!pos || !pos.every(Number.isFinite))throw new RangeError('world→screen座標不正');
          packed.set([pos[0],pos[1],view.scale,e.phase,e.token,e.seed,e.reducedMotion?1:0,1,CONTRACT.receiverOffset.x,CONTRACT.receiverOffset.y,0,0],j*12);
        }
        d.queue.writeBuffer(res.uniforms,0,new Float32Array([this.targetWidth,this.targetHeight,frame.items.length,observation?1:0,...view.background,world?1:0,lighting?1:0,inspectionLayer,0]));
        d.queue.writeBuffer(res.events,0,packed);
        pass.setViewport(x,y,w,h,0,1);pass.setScissorRect(x,y,w,h);pass.setBindGroup(0,res.bind);pass.draw(3);
      }
      pass.end();
      const needWitness=capture||frame.items.some(i=>i.pending);
      const stride=align(this.targetWidth*4,256),size=stride*this.targetHeight;
      let witnessRead=null,colorRead=null;
      const copy=(texture,label)=>{
        const b=d.createBuffer({label,size,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});readBuffers.push(b);
        encoder.copyTextureToBuffer({texture},{buffer:b,bytesPerRow:stride,rowsPerImage:this.targetHeight},[this.targetWidth,this.targetHeight]);return b;
      };
      if(needWitness)witnessRead=copy(this.witness,'event-visibility-readback');
      if(capture)colorRead=copy(this.scene,'pixel-evidence-readback');
      d.queue.submit([encoder.finish()]);await d.queue.onSubmittedWorkDone();
      const gpuError=await d.popErrorScope();errorScopeOpen=false;
      if(gpuError)throw new Error(gpuError.message);
      const tokenCounts=new Map();let pixels=null;
      if(witnessRead){
        await witnessRead.mapAsync(GPUMapMode.READ);const data=new Uint32Array(witnessRead.getMappedRange());
        for(let y=0;y<this.targetHeight;y++)for(let x=0;x<this.targetWidth;x++){
          const token=data[y*(stride/4)+x];if(token)tokenCounts.set(token,(tokenCounts.get(token)||0)+1);
        }witnessRead.unmap();
      }
      if(colorRead){
        await colorRead.mapAsync(GPUMapMode.READ);const data=new Uint8Array(colorRead.getMappedRange());
        pixels=new Uint8Array(this.targetWidth*this.targetHeight*4);
        for(let y=0;y<this.targetHeight;y++)pixels.set(data.subarray(y*stride,y*stride+this.targetWidth*4),y*this.targetWidth*4);
        colorRead.unmap();
      }
      const live=()=>generation===this.generation && !this.lost && isCurrent();
      if(!live())return {kind:'cancelled-frame',frameId,epoch:frame.epoch,pixels};
      let visible=this.isCanvasVisible();
      if(!visible && !verify && !this.diagnosticAllowHidden)return {kind:'hidden-frame',frameId,epoch:frame.epoch,pixels};
      // GPU中間像ではなく実canvasへの提出に成功した後にだけreceiptを発行する。
      d.pushErrorScope('validation');errorScopeOpen=true;
      const finalEncoder=d.createCommandEncoder({label:`mana-present-${frameId}`});
      const finalPass=finalEncoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
      finalPass.setPipeline(this.presentPipeline);finalPass.setBindGroup(0,this.presentBind);finalPass.draw(3);finalPass.end();
      d.queue.submit([finalEncoder.finish()]);await d.queue.onSubmittedWorkDone();
      const finalError=await d.popErrorScope();errorScopeOpen=false;if(finalError)throw new Error(finalError.message);
      visible=visible && this.isCanvasVisible() && live();
      return {kind:'webgpu-visible-frame',frameId,epoch:frame.epoch,gpuSucceeded:true,canvasVisible:visible,verify,
        visibleTokens:[...tokenCounts.entries()].filter(([,n])=>n>=2).map(([token])=>token),
        tokenCounts:Object.fromEntries(tokenCounts),pixels,width:this.targetWidth,height:this.targetHeight,
        limitation:'GPU提出完了・実画素readback・DOM可視性を確認。物理ディスプレイの走査時刻は未観測。'};
    }catch(error){this.validationErrors.push(String(error));this.onFailure?.(String(error));throw error;}
    finally{
      if(errorScopeOpen)try{await d.popErrorScope();}catch{}
      for(const b of readBuffers)b.destroy();this.busy=false;
    }
  }
  async clear(){
    if(this.lost)return;
    const e=this.device.createCommandEncoder();const p=e.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});p.end();this.device.queue.submit([e.finish()]);await this.device.queue.onSubmittedWorkDone();
  }
  dispose(){this.hide();this.scene?.destroy();this.witness?.destroy();for(const r of this.viewResources){r.uniforms.destroy();r.events.destroy();}this.context.unconfigure();this.device.destroy();}
}
