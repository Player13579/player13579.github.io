const ID='luminous-sol61-r1';
const UNAVAILABLE=Object.freeze({state:'unavailable'});
const STALE=Object.freeze({state:'stale'});
const ACTIVE=Object.freeze({state:'active'});
const SILENT=Object.freeze({state:'silent'});

function readRuntime(){
 try{
  const runtime=window.__DVA_LUMINOUS_R1__;
  if(!runtime||typeof runtime.snapshot!=='function')return {state:'missing'};
  const snapshot=runtime.snapshot();
  if(!snapshot||typeof snapshot!=='object')return {state:'unavailable'};
  if(snapshot.verify===true||snapshot.audio?.verify===true)return SILENT;
  if(runtime.version!==ID||snapshot.version!==ID)return {state:'stale'};
  if(snapshot.disposed===true||snapshot.disposedRequested===true||snapshot.mode==='disposed'||snapshot.audio?.disposed===true)return {state:'stale'};
  return {state:'ready',runtime,snapshot};
 }catch{return {state:'unavailable'};}
}

function waitForRuntime(){
 return new Promise(resolve=>{
  const started=Date.now();
  let timer=0,settled=false;
  const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
  const poll=()=>{
   const result=readRuntime();
   if(result.state==='ready'||result.state==='stale'||result.state==='silent'||result.state==='unavailable'){finish(result);return;}
   if(Date.now()-started>=400){finish({state:'missing'});return;}
   timer=setTimeout(poll,20);
  };
  poll();
 });
}

function observe(runtime){
 return new Promise(resolve=>{
  const started=Date.now();
  let timer=0,settled=false;
  const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
  const poll=()=>{
   let result;
   try{
    const snapshot=runtime.snapshot();
    if(snapshot?.verify===true||snapshot?.audio?.verify===true){finish(SILENT);return;}
    if(!snapshot||runtime.version!==ID||snapshot.version!==ID||snapshot.disposed===true||snapshot.disposedRequested===true||snapshot.mode==='disposed'||snapshot.audio?.disposed===true){finish(STALE);return;}
    if(snapshot.audio?.unlocked===true&&snapshot.audio.state==='running'&&snapshot.audio.disposed===false&&snapshot.audio.verify===false&&snapshot.verify===false){finish(ACTIVE);return;}
    result=UNAVAILABLE;
   }catch{result=UNAVAILABLE;}
   if(Date.now()-started>=1600){finish(result);return;}
   timer=setTimeout(poll,40);
  };
  poll();
 });
}

function activateFromGesture(item){
 if(!item||typeof item!=='object'||item.id!==ID||(item.versionId!==undefined&&item.versionId!==ID))return Promise.resolve(STALE);
 const initial=readRuntime();
 if(initial.state==='missing')return waitForRuntime().then(result=>result.state==='stale'?STALE:result.state==='silent'?SILENT:UNAVAILABLE,()=>UNAVAILABLE);
 if(initial.state==='stale')return Promise.resolve(STALE);
 if(initial.state==='silent')return Promise.resolve(SILENT);
 if(initial.state!=='ready')return Promise.resolve(UNAVAILABLE);
 const button=document.getElementById('audio');
 if(!button||button.disabled||typeof button.click!=='function')return Promise.resolve(UNAVAILABLE);
 try{button.click()}catch{return Promise.resolve(UNAVAILABLE)}
 return observe(initial.runtime).catch(()=>UNAVAILABLE);
}

const bridge=Object.freeze({activateFromGesture});
try{Object.defineProperty(window,'__gallerySfx',{value:bridge,writable:false,configurable:false,enumerable:false})}catch{}
