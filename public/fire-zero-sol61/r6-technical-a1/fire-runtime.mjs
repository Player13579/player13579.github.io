import {firePlan,FIRE_ID} from './fire-plan.mjs';
const shaderURLs=[new URL('./fire-volume.wgsl',import.meta.url),new URL('./fire-observer.wgsl',import.meta.url)];
export async function createFireRuntime(canvas,{onReceipt=()=>{},onError=()=>{},onStage=()=>{},expectedHashes={}}={}) {
  if(!canvas||canvas.tagName!=='CANVAS')throw Error('canvas required');
  if(!navigator.gpu)throw Error('WebGPU required');
  const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('WebGPU adapter unavailable');
  const device=await adapter.requestDevice(),context=canvas.getContext('webgpu');if(!context){await device.queue.onSubmittedWorkDone();device.destroy();const lost=await device.lost;const e=Error('WebGPU context unavailable');e.fireLifecycle={neverCreated:false,retired:true,drained:true,sameOwnedDevice:true,destroyCalled:true,pending:0,submission:0,completedSubmission:0,contextUnconfigured:true,resourcesRemaining:0,lost:{reason:lost.reason,message:lost.message},errors:[e.message]};throw e;}
  onStage('device');
  let retired=false,retiring=false,destroyCalled=false,lost=null,generation=0,serial=0,pending=0,tail=Promise.resolve(),lastReceipt=null;
  const receipts=[],errors=[],compile=[];let textures=[],worldBind,observerBind,width=0,height=0;
  const error=(e)=>{const text=String(e?.message??e);errors.push(text);onError(text);};
  device.addEventListener('uncapturederror',e=>error(e.error));
  const lostPromise=device.lost.then(info=>{lost={reason:info.reason,message:info.message,destroyCalled,retiring,retired};if(!destroyCalled||info.reason!=='destroyed')error('Unexpected device loss: '+info.reason);return lost;});
  try{
    const texts=await Promise.all(shaderURLs.map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('shader '+r.status+' '+url);const bytes=await r.arrayBuffer();const name=url.pathname.split('/').at(-1);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');if(expectedHashes[name]&&expectedHashes[name]!==hash)throw Error('Shader hash mismatch '+name);return new TextDecoder().decode(bytes);}));
    const modules=texts.map((code,i)=>device.createShaderModule({code,label:shaderURLs[i].pathname}));
    for(let i=0;i<modules.length;i++){const info=await modules[i].getCompilationInfo();compile.push({url:String(shaderURLs[i]),messages:info.messages.map(m=>({type:m.type,message:m.message,lineNum:m.lineNum,linePos:m.linePos}))});if(info.messages.some(m=>m.type==='error'))throw Error('Shader compile failed '+JSON.stringify(compile[i]));}
    const buffer=device.createBuffer({label:'Fire shared causal uniforms',size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    const sampler=device.createSampler({magFilter:'linear',minFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
    const format=navigator.gpu.getPreferredCanvasFormat();
    device.pushErrorScope('validation');
    const worldPipeline=await device.createRenderPipelineAsync({label:'Fire PH world',layout:'auto',vertex:{module:modules[0],entryPoint:'vertexMain'},fragment:{module:modules[0],entryPoint:'fragmentMain',targets:[{format:'rgba16float'},{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
    const observerPipeline=await device.createRenderPipelineAsync({label:'Fire source-bound OBS',layout:'auto',vertex:{module:modules[1],entryPoint:'vertexMain'},fragment:{module:modules[1],entryPoint:'fragmentMain',targets:[{format}]},primitive:{topology:'triangle-list'}});
    const pipelineError=await device.popErrorScope();if(pipelineError)throw pipelineError;
    onStage('pipelines');
    async function ensureSize() {
      const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
      const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
      if(w===width&&h===height)return {rect,dpr};
      await device.queue.onSubmittedWorkDone();for(const t of textures)t.destroy();
      width=w;height=h;canvas.width=w;canvas.height=h;generation++;
      context.configure({device,format,alphaMode:'opaque'});
      textures=[0,1,2].map(i=>device.createTexture({label:'Fire HDR '+i,size:[w,h],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));
      worldBind=device.createBindGroup({layout:worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});
      observerBind=device.createBindGroup({layout:observerPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:textures[0].createView()},{binding:2,resource:textures[1].createView()},{binding:3,resource:textures[2].createView()},{binding:4,resource:sampler}]});
      return {rect,dpr};
    }
    function render(input) {
      if(retired||retiring)return Promise.reject(Error('Fire retired'));
      const plan=firePlan(input);pending++;
      const job=tail.then(async()=>{
        if(retired||retiring)return {cancelled:true,causeId:plan.causeId};
        const {rect,dpr}=await ensureSize();if(retiring)return {cancelled:true,causeId:plan.causeId};
        const ownGeneration=generation,submission=++serial,submittedAt=performance.now();
        const values=new Float32Array([width,height,plan.actorHeightCss*dpr,dpr,plan.ageEms,plan.lifetimeEms,plan.extentWorld,plan.heatRefraction?1:0,plan.source?1:0,plan.observer?1:0,plan.receivedLight?1:0,plan.mainOnly?1:0,plan.sourceX,plan.bright?1:0,plan.reducedMotion?1:0,plan.glare?1:0,plan.depthSamples,0,0,0]);
        device.queue.writeBuffer(buffer,0,values);
        for(const type of ['validation','internal','out-of-memory'])device.pushErrorScope(type);
        let submissionError=null;try{
          const encoder=device.createCommandEncoder({label:'Fire '+plan.causeId+' '+submission});
          const world=encoder.beginRenderPass({colorAttachments:textures.map(t=>({view:t.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}))});world.setPipeline(worldPipeline);world.setBindGroup(0,worldBind);world.draw(3);world.end();
          const obs=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});obs.setPipeline(observerPipeline);obs.setBindGroup(0,observerBind);obs.draw(3);obs.end();device.queue.submit([encoder.finish()]);await device.queue.onSubmittedWorkDone();
        }catch(e){submissionError=String(e.message);error(e);}
        const scopes=[];for(let i=0;i<3;i++){const value=await device.popErrorScope();scopes.push(value?{message:value.message}:null);if(value)error(value);}
        const receipt=Object.freeze({id:FIRE_ID,causeId:plan.causeId,plan:structuredClone(plan),submittedAgeEms:plan.ageEms,submission,generation:ownGeneration,target:{width,height,cssWidth:rect.width,cssHeight:rect.height,dpr,actorHeightCss:plan.actorHeightCss,registeredActorWorldHeight:1,projectionCssPerWorld:plan.actorHeightCss},submittedAt,completedAt:performance.now(),gpuCompleted:!submissionError&&!scopes.some(Boolean),scopes,passes:2,canvasConnected:canvas.isConnected,retired:false});
        lastReceipt=receipt;receipts.push(receipt);if(receipts.length>240)receipts.shift();onReceipt(receipt);return receipt;
      });
      tail=job.catch(()=>{}).finally(()=>pending--);return job;
    }
    let retirementPromise=null;
    function retire(){
      if(retirementPromise)return retirementPromise;
      retiring=true;
      retirementPromise=(async()=>{await tail;await device.queue.onSubmittedWorkDone();for(const t of textures)t.destroy();textures=[];buffer.destroy();context.unconfigure();destroyCalled=true;device.destroy();retired=true;const value=await lostPromise;return {id:FIRE_ID,retired:true,drained:true,sameOwnedDevice:true,destroyCalled,pending,submission:serial,completedSubmission:lastReceipt?.submission??0,generation,contextUnconfigured:true,resourcesRemaining:0,lost:structuredClone(value),errors:[...errors]};})();return retirementPromise;
    }
    return Object.freeze({render,retire,snapshot:()=>({id:FIRE_ID,ready:true,retiring,retired,destroyCalled,lost:lost?structuredClone(lost):null,generation,submission:serial,pending,compile:structuredClone(compile),errors:[...errors],lastReceipt:lastReceipt?structuredClone(lastReceipt):null,receipts:structuredClone(receipts)})});
  }catch(e){retiring=true;await tail;await device.queue.onSubmittedWorkDone();for(const t of textures)t.destroy();textures=[];context.unconfigure();destroyCalled=true;device.destroy();retired=true;const value=await lostPromise;error(e);e.fireLifecycle={neverCreated:false,retired:true,drained:true,sameOwnedDevice:true,destroyCalled,pending,submission:serial,completedSubmission:lastReceipt?.submission??0,contextUnconfigured:true,resourcesRemaining:0,lost:structuredClone(value),errors:[...errors]};throw e;}
}
