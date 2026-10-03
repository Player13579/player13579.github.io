'use strict';
(function(root){
  const EXPECTED_IMAGE='1d1618121e269801abe037f32ab873eb18394c7b6f4fbcffdb169dec55fec34f';
  const IMAGE_URL=new URL('../source/field-aurelia-corridor-objects-v318.webp',root.document.baseURI).href;
  const PHASES=['child-document','adapter','device','assets','pipelines','first-frame','playing'];
  function create(options={}){
    const win=options.window||root,doc=options.document||win.document,nav=options.navigator||win.navigator;
    const params=new URLSearchParams(win.location.search),token=params.get('galleryStartupToken')||'',versionId=params.get('galleryVersionId')||'',epoch=Number(params.get('galleryAttemptEpoch'));
    const entitled=/^[a-f0-9]{32}$/.test(token)&&versionId==='camera-tripod-observation-map-e-sol61-r3'&&Number.isSafeInteger(epoch)&&epoch>0;
    let sequence=0,lastPhase=-1,currentPhase='child-document',retired=false,readySent=false;const reportedErrors=new WeakSet();
    const state={adapter:null,device:null,canvas:null,canvasCurrent:false,passesStarted:0,passesEnded:0};
    function emit(stage,status,extra={}){
      const rank=PHASES.indexOf(stage);if(rank<0||retired||rank<lastPhase)return false;
      lastPhase=rank;currentPhase=stage;
      if(entitled)win.parent.postMessage({schema:'dva-gallery-startup/v1',token,versionId,attemptEpoch:epoch,sequence:++sequence,stage,status,...extra},win.location.origin);
      return true;
    }
    function fail(stage,error,status='error'){
      const e=error instanceof Error?error:new Error(String(error));
      if(reportedErrors.has(e))return e;reportedErrors.add(e);
      const errorStatus=status==='unsupported'?'unsupported':'error';
      emit(stage,errorStatus,{error:{code:errorStatus==='unsupported'?'WEBGPU_UNSUPPORTED':`CAMERA_TRIPOD_${stage.toUpperCase().replaceAll('-','_')}_FAILED`,message:e.message.slice(0,500)}});
      const node=doc.getElementById('status');if(node)node.textContent=`${stage}: ${e.message}`;
      doc.body.dataset.error=e.message;return e;
    }
    win.addEventListener('message',event=>{
      const data=event.data;
      if(event.source===win.parent&&event.origin===win.location.origin&&data?.schema==='dva-gallery-startup/v1'&&data.action==='retire'&&data.token===token&&data.versionId===versionId&&data.attemptEpoch===epoch)retired=true;
    });
    function patchMethod(receiver,name,wrap){
      let proto=receiver;
      while(proto&&proto!==Object.prototype){const desc=Object.getOwnPropertyDescriptor(proto,name);if(desc){if(typeof desc.value!=='function'||(!desc.configurable&&!desc.writable))throw new Error(`cannot observe WebGPU ${name}`);Object.defineProperty(proto,name,{...desc,value:wrap(desc.value)});return;}proto=Object.getPrototypeOf(proto);}
      throw new Error(`WebGPU method unavailable: ${name}`);
    }
    function installFrameObservation(device){
      const queue=device.queue;
      patchMethod(root.GPUCanvasContext?.prototype||Object.getPrototypeOf(doc.querySelector('canvas').getContext('webgpu')),'getCurrentTexture',original=>function(...args){
        const texture=Reflect.apply(original,this,args);state.canvas=this.canvas;state.canvasCurrent=Boolean(texture&&state.canvas?.isConnected);return texture;
      });
      patchMethod(root.GPUCommandEncoder?.prototype||Object.getPrototypeOf(device.createCommandEncoder()),'beginRenderPass',original=>function(...args){
        const pass=Reflect.apply(original,this,args);state.passesStarted++;const passProto=root.GPURenderPassEncoder?.prototype||Object.getPrototypeOf(pass);
        if(!state.endHooked){state.endHooked=true;patchMethod(passProto,'end',end=>function(...endArgs){const value=Reflect.apply(end,this,endArgs);state.passesEnded++;return value;});}
        return pass;
      });
      patchMethod(Object.getPrototypeOf(queue),'submit',original=>function(...args){
        const submittedPasses=state.passesEnded,canvas=state.canvas;const hasCanvas=state.canvasCurrent&&Boolean(canvas?.isConnected)&&Number(canvas.width)>0&&Number(canvas.height)>0;
        state.passesStarted=0;state.passesEnded=0;state.canvasCurrent=false;
        let value;
        try{value=Reflect.apply(original,this,args);}catch(error){throw fail('playing',error);}
        if(!readySent&&submittedPasses>0&&hasCanvas){
          readySent=true;emit('pipelines','ready');emit('first-frame','pending');emit('playing','pending');
          const completed=Reflect.apply(queue.onSubmittedWorkDone,queue,[]);
          Promise.resolve(completed).then(()=>{
            if(retired)return;
            emit('playing','ready',{firstFrame:{recorded:true,submitted:true,completed:true,canvasConnected:true,passes:submittedPasses,viewportWidth:canvas.width,viewportHeight:canvas.height}});
          },error=>fail('playing',error));
        } else if(!readySent&&args.length&&submittedPasses===0&&hasCanvas){
          // A canvas was acquired and submitted but no finished render pass was observed.
          fail('first-frame',new Error('no completed render pass was recorded'));
        }
        return value;
      });
      device.addEventListener?.('uncapturederror',event=>fail(currentPhase,event.error||new Error('uncaptured WebGPU error')));
    }
    async function bootstrap(){
      emit('child-document','pending');emit('child-document','ready');
      emit('adapter','pending');
      const gpu=nav?.gpu;if(!gpu||typeof gpu.requestAdapter!=='function')throw fail('adapter',new Error('WebGPU is unavailable'),'unsupported');
      const gpuProto=Object.getPrototypeOf(gpu),requestAdapter=gpu.requestAdapter.bind(gpu),adapterPromise=requestAdapter();
      patchMethod(gpuProto,'requestAdapter',original=>function(...args){return this===gpu?adapterPromise:Reflect.apply(original,this,args);});
      const adapter=await adapterPromise;if(!adapter)throw fail('adapter',new Error('no WebGPU adapter'),'unsupported');state.adapter=adapter;emit('adapter','ready');
      emit('device','pending');
      const adapterProto=Object.getPrototypeOf(adapter),requestDevice=adapter.requestDevice.bind(adapter),devicePromise=requestDevice();
      patchMethod(adapterProto,'requestDevice',original=>function(...args){return this===adapter?devicePromise:Reflect.apply(original,this,args);});
      const device=await devicePromise;if(!device)throw fail('device',new Error('WebGPU adapter returned no device'),'unsupported');state.device=device;
      installFrameObservation(device);emit('device','ready');
      emit('assets','pending');
      const originalFetch=win.fetch.bind(win),response=await originalFetch(IMAGE_URL,{cache:'no-store'});
      if(!response.ok)throw fail('assets',new Error(`source image HTTP ${response.status}`));
      const bytes=await response.arrayBuffer();
      const digest=[...new Uint8Array(await win.crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
      if(digest!==EXPECTED_IMAGE)throw fail('assets',new Error(`source image hash mismatch: ${digest}`));
      const bitmap=await win.createImageBitmap(new Blob([bytes]));const validDims=bitmap.width===4800&&bitmap.height===3400;bitmap.close();
      if(!validDims)throw fail('assets',new Error('source image dimensions mismatch'));
      win.fetch=function(input,init){let url='';try{url=new URL(typeof input==='string'?input:input.url,doc.baseURI).href;}catch(_){}if(url===IMAGE_URL)return Promise.resolve(new Response(bytes.slice(0),{status:200,headers:{'content-type':'image/webp'}}));return originalFetch(input,init);};
      emit('assets','ready');emit('pipelines','pending');
      return Object.freeze({device,assetSha256:digest});
    }
    return Object.freeze({bootstrap,emit,fail,state});
  }
  const api=Object.freeze({create});root.CameraTripodGalleryStartup=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
