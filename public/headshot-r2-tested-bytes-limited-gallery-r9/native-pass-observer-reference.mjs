// CPU-review reference only. No GPU commands are created by this observer.
// Install in the ORIGINAL child's realm after its completed initial clear.
export function installPassObserver(realm, readSourceSnapshot, {documentId, limit=160}={}) {
  const encoders=new WeakMap(), passes=new WeakMap(), buffers=new WeakMap();
  const devices=new WeakMap(), queues=new WeakMap(), pending=new WeakMap();
  const records=new Map(), restorers=[];
  let ownerSerial=0, fault=null, closed=false;
  const fail=reason=>{fault??=String(reason);};
  const now=()=>realm.performance.now();
  const safe=fn=>{try {if(!closed)fn();}catch(error){fail(error.message);}};
  function owner(device) {
    if(!devices.has(device)) {
      const id=`${documentId}:device-${++ownerSerial}`, queue=device.queue;
      const result={deviceId:id,queueId:`${id}:queue`,queue};
      devices.set(device,result);queues.set(queue,result);
    }
    return devices.get(device);
  }
  function patch(className,method,observe) {
    const prototype=realm[className]?.prototype;
    const descriptor=prototype&&Object.getOwnPropertyDescriptor(prototype,method);
    if(!descriptor||typeof descriptor.value!=='function'||!descriptor.writable) {
      throw new Error(`Observation unavailable: ${className}.${method}`);
    }
    const original=descriptor.value;
    function wrapped(...args) {
      // A synchronous native throw passes through unchanged, with no invented result.
      const result=Reflect.apply(original,this,args);
      safe(()=>observe(this,args,result));
      return result; // Including the exact native Promise, when one is returned.
    }
    Object.defineProperty(prototype,method,{...descriptor,value:wrapped});
    restorers.push(()=>{
      if(Object.getOwnPropertyDescriptor(prototype,method)?.value===wrapped)
        Object.defineProperty(prototype,method,descriptor);
    });
  }
  try {
    patch('GPUDevice','createCommandEncoder',(device,args,encoder)=>{
      const match=/^contact-([1-9][0-9]*)$/.exec(args[0]?.label??'');
      if(!match)return;
      const submitSerial=Number(match[1]);
      if(!Number.isSafeInteger(submitSerial)||records.has(submitSerial))throw new Error('Duplicate/invalid source serial');
      const identity=owner(device);
      const record={submitSerial,documentId,deviceId:identity.deviceId,queueId:identity.queueId,
        encodedAt:now(),passes:[],finished:false,submitted:false,fence:'absent'};
      encoders.set(encoder,record);records.set(submitSerial,record);
      if(records.size>limit) {
        const [key,oldest]=records.entries().next().value;
        if(oldest.fence!=='fulfilled')fail('Observation capacity would evict incomplete work');
        records.delete(key);
      }
    });
    patch('GPUCommandEncoder','beginRenderPass',(encoder,args,pass)=>{
      const record=encoders.get(encoder);if(!record)return;
      const observed={index:record.passes.length,draws:[],ended:false,pipeline:null};
      record.passes.push(observed);passes.set(pass,{record,observed});
    });
    patch('GPURenderPassEncoder','setPipeline',(pass,args)=>{
      const entry=passes.get(pass);if(entry)entry.observed.pipeline=args[0]?.label??null;
    });
    patch('GPURenderPassEncoder','draw',(pass,args)=>{
      const entry=passes.get(pass);if(entry)entry.observed.draws.push({args:[...args],pipeline:entry.observed.pipeline});
    });
    patch('GPURenderPassEncoder','end',pass=>{
      const entry=passes.get(pass);if(entry)entry.observed.ended=true;
    });
    patch('GPUCommandEncoder','finish',(encoder,args,buffer)=>{
      const record=encoders.get(encoder);if(!record)return;
      record.finished=true;record.finishedAt=now();buffers.set(buffer,record);
    });
    patch('GPUQueue','submit',(queue,args)=>{
      if(!queues.has(queue))return;
      // The pinned source uses a one-element Array. Never consume an iterable.
      if(!Array.isArray(args[0])||args[0].length!==1)throw new Error('Unexpected submit argument shape');
      const record=buffers.get(args[0][0]),identity=queues.get(queue);
      if(!record||record.queueId!==identity.queueId)throw new Error('Command-buffer/queue ownership mismatch');
      const receipt=readSourceSnapshot()?.diagnostics?.submissions?.find(r=>r.submitSerial===record.submitSerial);
      if(!receipt)throw new Error('Native submit has no original source receipt');
      record.sourceReceipt=receipt;record.submitted=true;record.submitReturnedAt=now();
      pending.set(queue,record);
    });
    patch('GPUQueue','onSubmittedWorkDone',(queue,args,promise)=>{
      if(!queues.has(queue))return;
      const record=pending.get(queue);
      if(!record||record.fence!=='absent')throw new Error('Fence does not follow a unique source submit');
      record.fence='pending';record.fenceObservedAt=now();
      // Observe settlement; return the original Promise to the source unchanged.
      Reflect.apply(realm.Promise.prototype.then,promise,[
        ()=>safe(()=>{record.fence='fulfilled';record.fenceObservedFulfilledAt=now();}),
        error=>safe(()=>{record.fence='rejected';record.fenceError={name:error.name,message:error.message};})
      ]);
    });
  } catch(error) {
    for(const restore of restorers.reverse())restore();
    throw error; // Setup stops BEFORE Replay if coverage is unavailable.
  }
  return {
    get fault(){return fault;},
    record:serial=>records.get(serial),
    retire(){closed=true;for(const restore of restorers.reverse())restore();records.clear();},
    get size(){return records.size;}
  };
}
