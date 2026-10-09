export const PASS_NAMES=Object.freeze(['world','source-downsample-4x4','filter-x-quarter','filter-y-quarter','optical-response-quarter','post']);
const QUERY_COUNT=PASS_NAMES.length*2,QUERY_BYTES=QUERY_COUNT*8;
const unknown=(reason,extra={})=>({status:'unknown',reason,...extra});

export async function requestOptionalTimestampDevice(adapter){
 let supported=false;try{supported=adapter?.features?.has?.('timestamp-query')===true;}catch{}
 if(!supported)return {device:await adapter.requestDevice(),requestStatus:'unsupported'};
 try{
  const device=await adapter.requestDevice({requiredFeatures:['timestamp-query']});
  const enabled=device?.features?.has?.('timestamp-query')===true;
  return {device,requestStatus:enabled?'enabled':'unknown',reason:enabled?undefined:'device-feature-absent-after-request'};
 }catch(error){
  const device=await adapter.requestDevice();
  return {device,requestStatus:'unknown',reason:'optional-feature-request-rejected',requestError:String(error?.message??error)};
 }
}

export class OptionalGpuTimestampInstrumentation{
 constructor({device,querySet,slots,now=()=>globalThis.performance?.now?.()??Date.now(),isOwnerCurrent=()=>true,requestStatus='enabled',mapMode=globalThis.GPUMapMode}){
  this.device=device;this.querySet=querySet;this.slots=slots;this.now=now;this.isOwnerCurrent=isOwnerCurrent;this.requestStatus=requestStatus;this.mapMode=mapMode;this.disposed=false;this.results=[];this.droppedFrames=0;
 }
 static create({device,requestStatus='enabled',reason=null,ringSize=4,now,isOwnerCurrent=()=>true,bufferUsage=globalThis.GPUBufferUsage,mapMode=globalThis.GPUMapMode}){
  let featureEnabled=false;try{featureEnabled=device?.features?.has?.('timestamp-query')===true;}catch{}
  if(requestStatus!=='enabled'||!featureEnabled)return {instrumentation:null,status:unknown(reason??(requestStatus==='enabled'?'device-feature-unavailable':requestStatus))};
  if(!Number.isSafeInteger(ringSize)||ringSize<1||ringSize>16)return {instrumentation:null,status:unknown('invalid-timestamp-ring-size')};
  if(!bufferUsage||!mapMode||typeof device.createQuerySet!=='function'||typeof device.createBuffer!=='function')return {instrumentation:null,status:unknown('timestamp-query-api-unavailable')};
  let querySet;const slots=[];
  try{
   querySet=device.createQuerySet({type:'timestamp',count:ringSize*QUERY_COUNT,label:'Donation R17 bounded timestamp ring'});
   for(let i=0;i<ringSize;i++){
    const resolveBuffer=device.createBuffer({size:QUERY_BYTES,usage:bufferUsage.QUERY_RESOLVE|bufferUsage.COPY_SRC,label:`Donation R17 timestamp resolve ${i}`});let readBuffer;
    try{readBuffer=device.createBuffer({size:QUERY_BYTES,usage:bufferUsage.MAP_READ|bufferUsage.COPY_DST,label:`Donation R17 timestamp readback ${i}`});}
    catch(error){try{resolveBuffer.destroy();}catch{}throw error;}
    slots.push({index:i,state:'free',resolveBuffer,readBuffer,mapPromise:null,record:null,frame:null,queryBase:i*QUERY_COUNT,mapped:false});
   }
   return {instrumentation:new OptionalGpuTimestampInstrumentation({device,querySet,slots,now,isOwnerCurrent,requestStatus,mapMode}),status:{status:'available',feature:'timestamp-query',ringSize,queryCount:ringSize*QUERY_COUNT}};
  }catch(error){
   for(const s of slots){try{s.resolveBuffer?.destroy?.();}catch{}try{s.readBuffer?.destroy?.();}catch{}}
   try{querySet?.destroy?.();}catch{}
   return {instrumentation:null,status:unknown('timestamp-resource-creation-rejected',{error:String(error?.message??error)})};
  }
 }
 beginFrame(metadata){
  const blank=unknown('timestamp-instrumentation-unavailable');
  if(this.disposed)return {record:unknown('timestamp-instrumentation-disposed'),slot:null};
  const slot=this.slots.find(s=>s.state==='free');
  if(!slot){this.droppedFrames++;return {record:unknown('timestamp-ring-full',{droppedFrames:this.droppedFrames}),slot:null};}
  slot.state='recording';slot.record={status:'pending',unit:'milliseconds',causeId:metadata.causeId??null,ageMs:metadata.ageMs,generation:metadata.generation,targetGeneration:metadata.targetGeneration,submit:metadata.submit,passNames:[...PASS_NAMES],gpuPassMs:null,queueWallMs:null,querySupport:'timestamp-query'};slot.frame=null;slot.mapPromise=null;slot.mapped=false;
  return {record:slot.record,slot};
 }
 #markUnknown(slot,reason,extra={}){
  const value=unknown(reason,extra);slot.record??={};
  for(const key of ['gpuPassMs','sumPassGpuMs','gpuSpanMs','timestampResolution'])delete slot.record[key];
  Object.assign(slot.record,value);if(slot.frame)slot.frame.timestamp=slot.record;return slot.record;
 }
 timestampWrites(token,passIndex){
  const slot=token?.slot;if(!slot||slot.state!=='recording'||slot.record?.status!=='pending')return null;
  if(!Number.isInteger(passIndex)||passIndex<0||passIndex>=PASS_NAMES.length)return null;
  return {querySet:this.querySet,beginningOfPassWriteIndex:slot.queryBase+passIndex*2,endOfPassWriteIndex:slot.queryBase+passIndex*2+1};
 }
 resolve(encoder,token){
  const slot=token?.slot;if(!slot||slot.state!=='recording'||slot.record?.status!=='pending')return false;
  try{encoder.resolveQuerySet(this.querySet,slot.queryBase,QUERY_COUNT,slot.resolveBuffer,0);encoder.copyBufferToBuffer(slot.resolveBuffer,0,slot.readBuffer,0,QUERY_BYTES);slot.state='resolved';return true;}
  catch(error){this.#markUnknown(slot,'timestamp-resolve-rejected',{causeId:slot.record.causeId,ageMs:slot.record.ageMs,generation:slot.record.generation,targetGeneration:slot.record.targetGeneration,submit:slot.record.submit,error:String(error?.message??error)});slot.state='free';return false;}
 }
 abandon(token,reason='frame-not-submitted'){
  const slot=token?.slot;if(!slot)return;
  if(slot.state==='recording'||slot.state==='resolved'){this.#markUnknown(slot,reason,{causeId:slot.record?.causeId??null,ageMs:slot.record?.ageMs,generation:slot.record?.generation,targetGeneration:slot.record?.targetGeneration,submit:slot.record?.submit});slot.state='free';}
 }
 submitted(token,frame){
  const slot=token?.slot;if(!slot)return;
  slot.frame=frame;
  if(slot.state!=='resolved'||slot.record?.status!=='pending'){
   if(slot.state==='recording'&&slot.record?.status==='pending')this.abandon(token,'timestamp-queries-incomplete');else if(slot.state==='recording')slot.state='free';
   frame.timestamp=slot.record??unknown('timestamp-queries-incomplete');return;
  }
  slot.state='mapping';slot.record.queueSubmittedAtMs=this.now();slot.record.queueTimingKind='host submit-to-queue-drain interval (all preceding submissions included)';frame.timestamp=slot.record;
  try{
   const wallStart=slot.record.queueSubmittedAtMs,record=slot.record;
   Promise.resolve(this.device.queue.onSubmittedWorkDone()).then(()=>{
    if(this.disposed||!this.isOwnerCurrent({generation:record.generation,targetGeneration:record.targetGeneration,submit:record.submit}))return;
    record.queueDrainWallMs=Math.max(0,this.now()-wallStart);
   },error=>{if(!this.disposed&&this.isOwnerCurrent({generation:record.generation,targetGeneration:record.targetGeneration,submit:record.submit}))record.queueWallStatus=unknown('queue-completion-rejected',{error:String(error?.message??error)});});
  }catch(error){slot.record.queueWallStatus=unknown('queue-completion-rejected',{error:String(error?.message??error)});}
  try{
   const promise=slot.readBuffer.mapAsync(this.mapModeRead());slot.mapPromise=Promise.resolve(promise).then(()=>{slot.mapped=true;this.#mapped(slot);},error=>this.#reject(slot,error)).finally(()=>this.#release(slot));
  }catch(error){this.#reject(slot,error);this.#release(slot);}
 }
 mapModeRead(){return this.mapMode?.READ??globalThis.GPUMapMode?.READ??1;}
 #isCurrent(slot){return !this.disposed&&this.slots.includes(slot)&&this.isOwnerCurrent({generation:slot.record?.generation,targetGeneration:slot.record?.targetGeneration,submit:slot.record?.submit});}
 #mapped(slot){
  if(!this.#isCurrent(slot)){this.#markUnknown(slot,this.disposed?'timestamp-disposed-before-readback':'timestamp-result-stale-owner',{causeId:slot.record?.causeId,ageMs:slot.record?.ageMs,generation:slot.record?.generation,targetGeneration:slot.record?.targetGeneration,submit:slot.record?.submit});return;}
  try{
   const data=slot.readBuffer.getMappedRange(0,QUERY_BYTES),values=new BigUint64Array(data,0,QUERY_COUNT),durations=[];
   for(let i=0;i<PASS_NAMES.length;i++){const start=values[i*2],end=values[i*2+1];if(end<start)throw Error(`nonmonotonic timestamp pair ${i}`);durations.push({pass:PASS_NAMES[i],gpuMs:Number(end-start)/1e6});}
   const total=durations.reduce((sum,row)=>sum+row.gpuMs,0),spanMs=Number(values[QUERY_COUNT-1]-values[0])/1e6;
   if(!Number.isFinite(total)||!Number.isFinite(spanMs)||spanMs<0)throw Error('nonfinite GPU duration');
   slot.record.status='measured';slot.record.gpuPassMs=durations;slot.record.sumPassGpuMs=total;slot.record.gpuSpanMs=spanMs;slot.record.timestampResolution='nanoseconds';
   this.results.push(slot.record);if(this.results.length>32)this.results.shift();
  }catch(error){this.#markUnknown(slot,'timestamp-readback-decode-rejected',{causeId:slot.record?.causeId,ageMs:slot.record?.ageMs,generation:slot.record?.generation,targetGeneration:slot.record?.targetGeneration,submit:slot.record?.submit,error:String(error?.message??error)});}
  try{slot.readBuffer.unmap();}catch{}slot.mapped=false;
 }
 #reject(slot,error){if(slot.record?.status==='pending')this.#markUnknown(slot,'timestamp-map-rejected',{causeId:slot.record?.causeId,ageMs:slot.record?.ageMs,generation:slot.record?.generation,targetGeneration:slot.record?.targetGeneration,submit:slot.record?.submit,error:String(error?.message??error)});}
 #release(slot){if(slot.mapped){try{slot.readBuffer.unmap();}catch{}slot.mapped=false;}if(slot.state==='mapping')slot.state='free';slot.mapPromise=null;slot.frame=null;}
 dispose(){
  if(this.disposed)return this.disposePromise??Promise.resolve();this.disposed=true;
  this.disposePromise=(async()=>{
   for(const slot of this.slots){if(slot.record?.status==='pending')this.#markUnknown(slot,'timestamp-disposed-before-readback',{causeId:slot.record.causeId,ageMs:slot.record.ageMs,generation:slot.record.generation,targetGeneration:slot.record.targetGeneration,submit:slot.record.submit});if(slot.state==='mapping'&&!slot.mapped){try{slot.readBuffer.unmap();}catch{}}}
   await Promise.allSettled(this.slots.map(s=>s.mapPromise).filter(Boolean));
   for(const slot of this.slots){try{if(slot.mapped)slot.readBuffer.unmap();}catch{}try{slot.resolveBuffer.destroy();}catch{}try{slot.readBuffer.destroy();}catch{}slot.state='free';}
   try{this.querySet.destroy();}catch{}
  })();return this.disposePromise;
 }
}

export function timestampedPassDescriptor(descriptor,instrumentation,token,passIndex){
 const timestampWrites=instrumentation?.timestampWrites(token,passIndex);
 return timestampWrites?{...descriptor,timestampWrites}:descriptor;
}
