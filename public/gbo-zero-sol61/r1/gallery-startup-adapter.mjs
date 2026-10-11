const context = window.__dvaGalleryStartupContext;
if (!context) throw new Error('R880 bootstrap was not installed before the module');
const VERSION = 'gbo-zero-sol61-r1';
const VERSION_DIRECTORY = 'public/gbo-zero-sol61/r1/source/';
const CLOSURE = Object.freeze([
  ['common.wgsl','22802bead58af0fa393e4a1c73e67424030720ff1e156ef1402b0d0a1d80a03a'],
  ['index.html','b57b8b896fdb313630ab094cf517b74d3b47fbdcc94585f0e3ee7a18d25b2f82'],
  ['model.mjs','21f94c0f61177d5f2e56c743d9ad4a339bbfa82bb65ac04c5e4ef7dc137ebd08'],
  ['observer.wgsl','b04e724c05b9b3e4c1872278a3b2b3c5276f4e4e7f6a4433a47866038190906f'],
  ['renderer.mjs','2f3ea9b597336875fa8e5f0d58eeffeb7302aaf78387ef3790b4c890c2a1b563'],
  ['runtime.mjs','45bf627e335a3f63abd1f8904d5f61dae0e99e6e9220e93fbc56435f53926962'],
  ['sfx.mjs','df2f026bcff21f306787f956035e653eb49fcdac89d0fd6a0a36b8b545c1dbfa'],
  ['world.wgsl','99903c6b54051763556a018db5153400a508ae6e14e371e2c1ead17dc606d0d4']
]);
if (context.versionId !== VERSION || !context.token || !Number.isSafeInteger(context.attemptEpoch) || context.attemptEpoch < 1)
  throw new Error('gallery token/version/epoch is absent or does not match the R880 version');

const phases = ['child-document','adapter','device','assets','pipelines','first-frame','playing'];
const state = { sequence:context.sequence || 0, rank:context.rank ?? -1, retired:Boolean(context.retired), ready:false,
  sourcePins:null, firstFrame:null, retirement:null, error:null, timer:0 };
const current = () => !state.retired && !context.retired && !window.__gboGalleryStartupHostRetired;
function post(stage,status,extra={}) {
  if (!current() || window.parent === window) return;
  const rank=phases.indexOf(stage); if(rank<state.rank) return;
  state.rank=rank; state.sequence++;
  context.rank=rank; context.sequence=state.sequence;
  context.current={schema:'dva-gallery-startup/v1',token:context.token,versionId:context.versionId,
    attemptEpoch:context.attemptEpoch,sequence:state.sequence,stage,status,...extra};
  window.parent.postMessage(context.current,location.origin);
}
async function verifyClosure() {
  const result=[];
  for (const [file,expected] of CLOSURE) {
    const response=await fetch(new URL('/'+VERSION_DIRECTORY+file,location.origin),{cache:'no-store'});
    if(!response.ok) throw new Error(`${file} HTTP ${response.status}`);
    const bytes=await response.arrayBuffer();
    const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
    if(digest!==expected) throw new Error(`${file} SHA-256 mismatch`);
    result.push({file,sha256:digest,bytes:bytes.byteLength});
  }
  return result;
}
function inspectCompletedHost(host) {
  const snap=host?.snapshot?.();
  const child=snap?.childSnapshot;
  const receipt=child?.lastReceipt;
  const renderer=child?.renderer;
  const frame=document.querySelector('#preview');
  const canvas=frame?.contentDocument?.querySelector('#effect');
  const r=canvas?.getBoundingClientRect?.();
  const visible=Boolean(canvas?.isConnected && canvas.width>0 && canvas.height>0 && r && r.width>0 && r.height>0 &&
    r.right>0 && r.bottom>0 && r.left<frame.contentWindow.innerWidth && r.top<frame.contentWindow.innerHeight);
  const good= snap?.versionId===VERSION && snap?.ready===true && snap?.disposed===false &&
    child?.versionId===VERSION && child?.ready===true && child?.disposed===false &&
    Number.isSafeInteger(child.cause) && child.cause>0 && Number.isSafeInteger(child.generation) && child.generation>0 &&
    receipt?.completed===true && receipt.cause===child.cause && receipt.generation===child.generation &&
    receipt.source===true && receipt.observer===true && Number.isSafeInteger(receipt.submission) && receipt.submission>0 &&
    renderer?.versionId===VERSION && renderer.disposed===false && renderer.submitted>=receipt.submission && renderer.completed>=1 &&
    Array.isArray(renderer.shaderDiagnostics) && renderer.shaderDiagnostics.length===2 &&
    renderer.shaderDiagnostics.every(row=>Array.isArray(row.messages) && row.messages.every(m=>m.type!=='error')) &&
    Array.isArray(renderer.actualScopes) && renderer.actualScopes.every(row=>row.error===null) && visible;
  return {good,host:snap,child,receipt,renderer,canvas:{connected:canvas?.isConnected===true,width:canvas?.width||0,height:canvas?.height||0},visible};
}
async function poll() {
  if(!current()) return;
  try {
    const host=window.__gboGalleryHostR880;
    if(!host) { state.timer=setTimeout(poll,25); return; }
    if(!state.sourcePins) {
      state.sourcePins=await verifyClosure();
      post('adapter','ready'); post('device','ready',{deviceReady:true});
      post('assets','ready',{sourceClosure:state.sourcePins});
      post('pipelines','ready',{versionId:VERSION});
    }
    const checked=inspectCompletedHost(host);
    if(checked.good) {
      state.ready=true;
      state.firstFrame=Object.freeze({recorded:true,submitted:true,completed:true,canvasConnected:true,
        passes:2,viewportWidth:checked.canvas.width,viewportHeight:checked.canvas.height,
        causeID:checked.child.cause,generation:checked.child.generation,submission:checked.receipt.submission,
        receipt:Object.freeze({...checked.receipt}),sourceClosure:state.sourcePins,visible:true,
        shaderDiagnostics:checked.renderer.shaderDiagnostics,actualScopes:checked.renderer.actualScopes});
      post('first-frame','ready',{causeID:checked.child.cause,firstFrame:state.firstFrame});
      post('playing','ready',{causeID:checked.child.cause,firstFrame:state.firstFrame});
      return;
    }
    const failure=checked.child?.fatal || checked.host?.error || null;
    if(failure) throw new Error(String(failure));
    state.timer=setTimeout(poll,20);
  } catch(error) {
    state.error=String(error?.message||error);
    post('playing','error',{error:{code:'GBO_R880_STARTUP_PROOF_FAILED',message:state.error}});
  }
}
function postRetirement(action, lifecycle, error) {
  const sequence = Math.max(state.sequence, context.sequence || 0) + 1;
  state.sequence = sequence; context.sequence = sequence;
  const data = { schema:'dva-gallery-startup/v1', token:context.token, versionId:VERSION,
    attemptEpoch:context.attemptEpoch, sequence, action, ...(lifecycle ? {lifecycle} : {}), ...(error ? {teardown:'unknown',error} : {}) };
  context.current = data;
  if (window.parent !== window) window.parent.postMessage(data, location.origin);
  return data;
}
async function retire() {
  if (state.retirement) return state.retirement;
  state.retired = true; context.retired = true;
  if (state.timer) clearTimeout(state.timer); state.timer = 0;
  state.retirement = (async () => {
    try {
      const host = window.__gboGalleryHostR880;
      if (!host?.dispose || !host?.snapshot) throw new Error('explicit host disposal API unavailable');
      const cleanup = await host.dispose();
      const loss = cleanup?.deviceLoss;
      const device = {
        status: cleanup?.pass === true && cleanup?.pendingTasks === 0 && cleanup?.activeVoices === 0 &&
          cleanup?.rendererDisposed === true && loss?.reason === 'destroyed' && loss?.expected === true
          ? 'destroyed-loss-settled' : 'unknown',
        drained: cleanup?.pass === true && cleanup?.pendingTasks === 0 && cleanup?.activeVoices === 0 && cleanup?.rendererDisposed === true,
        destroyCalled: loss?.expected === true, lostReason: loss?.reason || null
      };
      const lifecycle = {disposeSettled:true,teardown:device.status==='destroyed-loss-settled'?'disposed':'unknown',
        deviceLifecycle:device.status,device,hostCleanup:cleanup};
      if (device.status !== 'destroyed-loss-settled') {
        postRetirement('retire-error',null,{code:'CHILD_RETIREMENT_FAILED',message:'GBO cleanup did not prove task/audio drain, renderer disposal, explicit destroy, and destroyed loss.'});
        return lifecycle;
      }
      postRetirement('retired',lifecycle);
      return lifecycle;
    } catch (error) {
      postRetirement('retire-error',null,{code:'CHILD_RETIREMENT_FAILED',message:String(error?.message||error).slice(0,500)});
      return {disposeSettled:false,teardown:'unknown',error:String(error?.message||error)};
    }
  })();
  return state.retirement;
}
window.__dvaGboGalleryStartupR880=Object.freeze({snapshot:()=>Object.freeze({schema:'dva-gallery-startup/v1',token:context.token,
  versionId:VERSION,attemptEpoch:context.attemptEpoch,ready:state.ready,retired:state.retired,firstFrame:state.firstFrame,
  sourcePins:state.sourcePins,error:state.error,retirement:state.retirement}),retire});
window.addEventListener('dva-gallery-retire',()=>void retire());
window.addEventListener('pagehide',()=>void retire(),{once:true});
post('adapter','pending');
void poll();
