import {pack,VERSION} from './model.mjs';
const FRAME_SCOPE_HISTORY_LIMIT=192;
const PIPELINE_SCOPE_RECORD_LIMIT=8;
const SHADER_MODULE_RECORD_LIMIT=2;
const SHADER_MESSAGES_PER_MODULE_LIMIT=64;
const DIAGNOSTIC_TEXT_LIMIT=1024;
const boundedText=(value,limit=DIAGNOSTIC_TEXT_LIMIT)=>{const text=String(value??'');return text.length>limit?{value:text.slice(0,limit),truncated:true}:{value:text,truncated:false};};
const safeCoordinate=value=>Number.isFinite(value)?value:null;
const cloneErrorEvidence=value=>value?{...value}:null;

export function createDiagnosticHistory({frameScopeLimit=FRAME_SCOPE_HISTORY_LIMIT}={}){
 if(!Number.isSafeInteger(frameScopeLimit)||frameScopeLimit<0)throw new RangeError('frameScopeLimit must be a non-negative safe integer');
 const pipelineRecords=[];const frameRecords=[];const shaderRecords=[];
 let scopeRecordsTotal=0,scopeRecordsDropped=0,scopeErrors=0,pipelineRecordsDropped=0;
 let shaderMessagesTotal=0,shaderMessagesDropped=0,shaderErrors=0,shaderModulesDropped=0;
 let firstError=null,lastError=null;
 function rememberError(value){const copy={...value};if(firstError===null)firstError=copy;lastError=copy;}
 function recordScope(record){
  scopeRecordsTotal++;
  const errorText=record?.error===null||record?.error===undefined?null:boundedText(record.error);
  const clean={stage:boundedText(record?.stage,128).value,filter:boundedText(record?.filter,128).value,error:errorText?.value??null};
  if(Number.isSafeInteger(record?.submission))clean.submission=record.submission;
  if(record?.stage==='pipeline'){
   if(pipelineRecords.length<PIPELINE_SCOPE_RECORD_LIMIT)pipelineRecords.push(clean);else pipelineRecordsDropped++;
  }else if(frameScopeLimit===0){scopeRecordsDropped++;}
  else{if(frameRecords.length===frameScopeLimit){frameRecords.shift();scopeRecordsDropped++;}frameRecords.push(clean);}
  if(errorText){scopeErrors++;rememberError({kind:'scope',...clean,errorTruncated:errorText.truncated});}
 }
 function recordShaderDiagnostics(name,messages){
  const moduleName=boundedText(name,128).value;
  let module=shaderRecords.find(item=>item.name===moduleName);
  if(!module){if(shaderRecords.length<SHADER_MODULE_RECORD_LIMIT){module={name:moduleName,messages:[]};shaderRecords.push(module);}else{shaderModulesDropped++;module=null;}}
  for(const item of messages??[]){
   shaderMessagesTotal++;
   const type=boundedText(item?.type,128).value;const message=boundedText(item?.message);
   const clean={type,message:message.value,lineNum:safeCoordinate(item?.lineNum),linePos:safeCoordinate(item?.linePos),offset:safeCoordinate(item?.offset),length:safeCoordinate(item?.length)};
   if(message.truncated)clean.messageTruncated=true;
   if(module&&module.messages.length<SHADER_MESSAGES_PER_MODULE_LIMIT)module.messages.push(clean);else shaderMessagesDropped++;
   if(type==='error'){shaderErrors++;rememberError({kind:'wgsl',name:moduleName,...clean});}
  }
 }
 function snapshot(){
  const shaderDiagnostics=shaderRecords.map(item=>({name:item.name,messages:item.messages.map(message=>({...message}))}));
  const actualScopes=[...pipelineRecords,...frameRecords].map(record=>({...record}));
  const dropped=scopeRecordsDropped+shaderMessagesDropped+pipelineRecordsDropped+shaderModulesDropped;
  const total=scopeRecordsTotal+shaderMessagesTotal;
  const errors=scopeErrors+shaderErrors;
  const preservedErrorRecords=firstError===null?[]:lastError===firstError?[cloneErrorEvidence(firstError)]:[cloneErrorEvidence(firstError),cloneErrorEvidence(lastError)];
  return {shaderDiagnostics,actualScopes,historyComplete:dropped===0,preservedErrorRecords,
   diagnosticCounters:{total,dropped,errors,scopeRecordsTotal,scopeRecordsDropped,scopeErrors,pipelineRecordsDropped,shaderMessagesTotal,shaderMessagesDropped,shaderErrors,shaderModulesDropped},
   firstError:cloneErrorEvidence(firstError),lastError:cloneErrorEvidence(lastError)};
 }
 return Object.freeze({recordScope,recordShaderDiagnostics,snapshot});
}
export async function createGboLayer({device,format,shaders}){
 if(!device?.queue||!format||!shaders?.common||!shaders?.world||!shaders?.observer)throw new TypeError('device/format/exact shader source required');
 const history=createDiagnosticHistory();let uniform,worldTexture,worldBind,presentBind,worldPipeline,presentPipeline,busy=false,disposed=false,width=0,height=0,submitted=0,completed=0;
 const modules=[];
 try{
  for(const [name,body] of [['world',shaders.world],['observer',shaders.observer]]){
   const module=device.createShaderModule({label:`${VERSION}:${name}`,code:shaders.common+'\n'+body});modules.push(module);
   const info=await module.getCompilationInfo();history.recordShaderDiagnostics(name,info.messages);
   if(info.messages.some(m=>m.type==='error'))throw new Error(`${name} WGSL compilation failed: ${JSON.stringify(history.snapshot().shaderDiagnostics)}`);
  }
  device.pushErrorScope('validation');
  try{
   worldPipeline=await device.createRenderPipelineAsync({label:VERSION+' world',layout:'auto',vertex:{module:modules[0],entryPoint:'vertex'},fragment:{module:modules[0],entryPoint:'fragment',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
   presentPipeline=await device.createRenderPipelineAsync({label:VERSION+' observer',layout:'auto',vertex:{module:modules[1],entryPoint:'vertex'},fragment:{module:modules[1],entryPoint:'fragment',targets:[{format}]},primitive:{topology:'triangle-list'}});
  }finally{const error=await device.popErrorScope();history.recordScope({stage:'pipeline',filter:'validation',error:error?.message??null});if(error)throw error;}
  uniform=device.createBuffer({label:VERSION+' uniform',size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  worldBind=device.createBindGroup({layout:worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
 }catch(error){uniform?.destroy();worldTexture?.destroy();throw error;}
 function targets(w,h){
  if(w===width&&h===height&&worldTexture)return;
  worldTexture?.destroy();width=w;height=h;
  worldTexture=device.createTexture({label:VERSION+' linear radiant field',size:[w,h],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  presentBind=device.createBindGroup({layout:presentPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:worldTexture.createView()}]});
 }
 function record({encoder,targetView,frame,presentation='preview'}){
  if(disposed||busy)throw new Error('GBO layer disposed or previous frame not settled');
  const data=pack(frame);if(!encoder?.beginRenderPass||!['preview','world-only'].includes(presentation)||(presentation==='preview'&&!targetView))throw new TypeError('encoder/targetView/presentation');
  busy=true;const serial=++submitted;const pops=[];
  try{
   for(const filter of ['validation','internal','out-of-memory'])device.pushErrorScope(filter);
   targets(frame.width,frame.height);device.queue.writeBuffer(uniform,0,data);
   const world=encoder.beginRenderPass({label:VERSION+' PH',colorAttachments:[{view:worldTexture.createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,0]}]});world.setPipeline(worldPipeline);world.setBindGroup(0,worldBind);world.draw(3);world.end();
   if(presentation==='preview'){const present=encoder.beginRenderPass({label:VERSION+' OBS',colorAttachments:[{view:targetView,loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}]});present.setPipeline(presentPipeline);present.setBindGroup(0,presentBind);present.draw(3);present.end();}
  }catch(error){busy=false;throw error;}
  finally{for(let i=0;i<3;i++)pops.push(device.popErrorScope());}
  let settled=false;
  return Object.freeze({submission:serial,sourceTextureView:worldTexture.createView(),uniformBuffer:uniform,presentation,async settle(){
   if(settled)throw new Error('GBO frame already settled');settled=true;
   try{await device.queue.onSubmittedWorkDone();const errors=await Promise.all(pops);const actual=errors.map((e,i)=>({stage:'frame',submission:serial,filter:['out-of-memory','internal','validation'][i],error:e?.message??null}));actual.forEach(record=>history.recordScope(record));if(errors.some(Boolean))throw new Error(errors.filter(Boolean).map(e=>e.message).join('; '));completed++;return Object.freeze({submission:serial,completed:true,ageMs:frame.ageMs,stage:frame.stage,cause:frame.cause,generation:frame.generation,source:frame.options.source,observer:frame.options.observer,width:frame.width,height:frame.height});}finally{busy=false;}
  }});
 }
 return Object.freeze({record,snapshot:()=>({versionId:VERSION,disposed,busy,width,height,submitted,completed,...history.snapshot()}),async dispose(){if(disposed)return;disposed=true;await device.queue.onSubmittedWorkDone();uniform?.destroy();worldTexture?.destroy();busy=false;}});
}
