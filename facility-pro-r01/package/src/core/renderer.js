import {rgbaLut} from './math.js';
import {FOOTPRINT} from './contracts.js';
let sharedGPU=null;
export async function getGPU(){
 if(sharedGPU)return sharedGPU;
 if(!globalThis.navigator?.gpu)throw new Error('WebGPUがありません。localhost/HTTPSと対応ブラウザーを確認してください。');
 const adapter=await navigator.gpu.requestAdapter({powerPreference:'low-power'});
 if(!adapter)throw new Error('GPUAdapterを取得できませんでした。実GPU未検査のままCPU成功を代用しません。');
 const device=await adapter.requestDevice();const info=adapter.info||{};
 const description=[info.vendor,info.architecture,info.device,info.description].filter(Boolean).join(' / ');
 const audit={adapter:{vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description,isFallbackAdapter:info.isFallbackAdapter},description,softwareSuspected:/swiftshader|llvmpipe|software|lavapipe/i.test(description),uncapturedErrors:[],deviceLost:null,compilations:[]};
 device.addEventListener('uncapturederror',e=>audit.uncapturedErrors.push(e.error.message));
 device.lost.then(info=>{audit.deviceLost={reason:info.reason,message:info.message};});
 sharedGPU={adapter,device,audit};return sharedGPU;
}
async function pipeline(device,url,targets,audit){
 const response=await fetch(url);if(!response.ok)throw new Error(`shaderを読めません: ${url}`);
 const code=await response.text();const module=device.createShaderModule({label:String(url),code});
 const info=await module.getCompilationInfo();const messages=info.messages.map(m=>({type:m.type,line:m.lineNum,column:m.linePos,message:m.message}));
 audit.compilations.push({source:String(url),messages});
 if(messages.some(m=>m.type==='error'))throw new Error(JSON.stringify(messages));
 device.pushErrorScope('validation');let result;
 try{result=await device.createRenderPipelineAsync({label:String(url),layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:targets.map(format=>({format}))},primitive:{topology:'triangle-list'}});}finally{const error=await device.popErrorScope();if(error)throw error;}
 return result;
}
/** 比較用の簡略受光体。元ゲームのspriteではない。Eパスの素材でもない。 */
export function makePreviewScene(key,theme='dark',showProxy=true){
 const w=110,h=76,rgba=new Uint8Array(w*h*4),mask=new Uint8Array(w*h*4);
 const bg=theme==='dark'?[16,24,35]:[213,222,229];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const px=x-w/2,py=h/2-y;let obj=false,ink=false;
  if(key==='bookshelf') {obj=Math.abs(px)<21&&Math.abs(py)<9;ink=obj&&(Math.abs(py+5)<1||(Math.floor((px+21)/6)%3===0));}
  if(key==='reading-lamp') {obj=(Math.abs(px+18)<4&&py>-10&&py<16)||(px>-31&&px<-4&&py>11&&py<22)||(Math.abs(px+12)<16&&Math.abs(py+17)<3);ink=obj&&Math.abs(py-13)<2;}
  if(key==='security-console') {obj=Math.abs(px)<15&&Math.abs(py)<15;ink=obj&&(Math.abs(py-9)<2||Math.abs(py+9)<2||Math.abs(px+10)<2);}
  const i=(y*w+x)*4;const q=obj&&showProxy?(ink?[74,89,103]:[57,69,82]):bg;
  rgba.set([...q,255],i);mask.set([obj&&showProxy?255:0,0,0,255],i);
 }
 return{rgba,mask,width:w,height:h};
}
/**
 * WebGPU本体。入力は局所scene色(sRGB符号値)とreceiver maskで、出力は合成済みtile。
 * 本編へは同寸法のunderlayView/receiverViewをホストが明示供給する必要がある。
 * renderAgeは純描画。receipt承認・音声・近接判定を持たない。
 */
export async function createEffectRenderer(canvas,definition,{theme='dark',dpr=Math.min(globalThis.devicePixelRatio||1,2),showProxy=true,gpu=null}={}){
 const {device,audit}=gpu||await getGPU();
 const W=Math.round(FOOTPRINT.width*dpr),H=Math.round(FOOTPRINT.height*dpr);
 canvas.width=W;canvas.height=H;canvas.style.width='110px';canvas.style.height='76px';
 const context=canvas.getContext('webgpu');if(!context)throw new Error('GPUCanvasContextがありません');
 const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
 const resources=[];let disposed=false;
 const texture=(name,format='rgba16float',w=W,h=H,upload=false)=>{
  const t=device.createTexture({label:name,size:[w,h],format,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|(upload?0:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC)});resources.push(t);return t;
 };
 const [body,emission,irradiance,blurA,blurB]=['body','emission','receiver-irradiance','OBS-blur-x','OBS-blur-y'].map(n=>texture(n));
 const lut=texture('four-envelope-numerical-LUT','rgba8unorm',256,1,true);
 device.queue.writeTexture({texture:lut},rgbaLut(definition.sample),{bytesPerRow:1024},[256,1]);
 const underlay=texture('preview-scene-fixture','rgba8unorm',110,76,true),receiver=texture('preview-numerical-receiver-mask','rgba8unorm',110,76,true);
 const sampler=device.createSampler({label:'linear-clamp-envelope-and-source-sampling',magFilter:'linear',minFilter:'linear',mipmapFilter:'nearest',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
 const makeBuffer=(label,n)=>{const b=device.createBuffer({label,size:n,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});resources.push(b);return b;};
 const uniform=makeBuffer('event-age-and-resolution',32),blurX=makeBuffer('horizontal-spread',16),blurY=makeBuffer('vertical-spread',16),compositeU=makeBuffer('OBS-budget',16);
 device.queue.writeBuffer(blurX,0,new Float32Array([1.25/110,0,0,0]));device.queue.writeBuffer(blurY,0,new Float32Array([0,1.25/76,0,0]));
 const worldP=await pipeline(device,definition.shaderURL,['rgba16float','rgba16float','rgba16float'],audit);
 const blurP=await pipeline(device,new URL('../../shaders/blur.wgsl',import.meta.url),['rgba16float'],audit);
 const compositeP=await pipeline(device,new URL('../../shaders/composite.wgsl',import.meta.url),[format],audit);
 const bind=(p,entries)=>device.createBindGroup({layout:p.getBindGroupLayout(0),entries:entries.map((resource,binding)=>({binding,resource}))});
 const worldB=bind(worldP,[{buffer:uniform},lut.createView(),sampler]);
 const blurXB=bind(blurP,[{buffer:blurX},emission.createView(),sampler]),blurYB=bind(blurP,[{buffer:blurY},blurA.createView(),sampler]);
 let sceneView=underlay.createView(),maskView=receiver.createView();
 let compB;const rebuildComposite=()=>{compB=bind(compositeP,[{buffer:compositeU},body.createView(),emission.createView(),blurB.createView(),irradiance.createView(),sceneView,maskView,sampler]);};rebuildComposite();
 function setPreviewScene(nextTheme=theme,proxy=showProxy){theme=nextTheme;showProxy=proxy;const fixture=makePreviewScene(definition.key,theme,showProxy);device.queue.writeTexture({texture:underlay},fixture.rgba,{bytesPerRow:440},[110,76]);device.queue.writeTexture({texture:receiver},fixture.mask,{bytesPerRow:440},[110,76]);}
 setPreviewScene();
 function pass(encoder,label,targets,p,b){const r=encoder.beginRenderPass({label,colorAttachments:targets.map(view=>({view,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}))});r.setPipeline(p);r.setBindGroup(0,b);r.draw(3);r.end();}
 function renderAge(ageMs,{reducedMotion=false,copyTo=null,bloom=true}={}){
  if(disposed)throw new Error('disposed renderer');
  const state=definition.sample(ageMs,{reducedMotion});
  device.queue.writeBuffer(uniform,0,new Float32Array([ageMs/1000,state.alive?1:0,reducedMotion?1:0,0,W,H,0,0]));
  device.queue.writeBuffer(compositeU,0,new Float32Array([bloom?state.bloom*.30:0,showProxy?1:0,state.alive?1:0,0]));
  const encoder=device.createCommandEncoder({label:`${definition.key}/age=${ageMs}`});
  pass(encoder,'PH-body-source-receiver', [body.createView(),emission.createView(),irradiance.createView()],worldP,worldB);
  pass(encoder,'OBS1-horizontal', [blurA.createView()],blurP,blurXB);pass(encoder,'OBS1-vertical',[blurB.createView()],blurP,blurYB);
  const output=context.getCurrentTexture();pass(encoder,'OBS2-OBS3-composite',[output.createView()],compositeP,compB);
  if(copyTo)encoder.copyTextureToBuffer({texture:output},{buffer:copyTo.buffer,bytesPerRow:copyTo.bytesPerRow},[W,H]);
  device.queue.submit([encoder.finish()]);return state;
 }
 async function readPixels(ageMs,options={}){
  const bytesPerRow=Math.ceil(W*4/256)*256;const buffer=device.createBuffer({size:bytesPerRow*H,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
  renderAge(ageMs,{...options,copyTo:{buffer,bytesPerRow}});await buffer.mapAsync(GPUMapMode.READ);
  const mapped=new Uint8Array(buffer.getMappedRange()),out=new Uint8Array(W*H*4);
  for(let y=0;y<H;y++)out.set(mapped.subarray(y*bytesPerRow,y*bytesPerRow+W*4),y*W*4);
  buffer.unmap();buffer.destroy();if(format.startsWith('bgra'))for(let i=0;i<out.length;i+=4){const b=out[i];out[i]=out[i+2];out[i+2]=b;}
  return {width:W,height:H,rgba:out,state:definition.sample(ageMs,options)};
 }
 function setSceneInputs({underlayView,receiverView}){if(!underlayView||!receiverView)throw new Error('ホストのscene色とreceiver maskの両方が必要です');sceneView=underlayView;maskView=receiverView;rebuildComposite();}
 function dispose(){disposed=true;for(const r of resources)r.destroy();context.unconfigure();}
 return {definition,canvas,renderAge,readPixels,setPreviewScene,setSceneInputs,dispose,width:W,height:H,audit,samplerContract:{magFilter:'linear',minFilter:'linear',addressMode:'clamp-to-edge',LUTChannels:['source','body','localLight','bloom']}};
}
