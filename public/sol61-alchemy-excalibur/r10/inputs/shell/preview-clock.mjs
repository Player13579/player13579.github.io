// Preview-only backpressure clock. Authored time advances at the selected rate
// only between completed submissions. Rendering waits are measured separately;
// this fixture is not a real-time game clock or a performance acceptance route.
export const SLASH_LIFETIME_MS = 620;
export const E_LIFETIME_MS = 1200;
export function createExcaliburPreviewClock({now=()=>performance.now(),requestFrame=callback=>requestAnimationFrame(callback),cancelFrame=handle=>cancelAnimationFrame(handle),render,dispose=()=>{},onFailure=()=>{}}={}) {
  if (![now,requestFrame,cancelFrame,render,dispose,onFailure].every(f=>typeof f==='function')) throw new TypeError('preview clock requires callbacks');
  let state='idle',reason=null,generation=0,handle=null,epoch=0,elapsed=0,viewport=null,closed=false,cleanupCalled=false;
  let pending=null,dirty=null,startedAt=0,renderWaitMs=0,renderFailure=null;
  const cancel=()=>{if(handle!==null)cancelFrame(handle);handle=null;};
  const age=()=>pending||state!=='running'?elapsed:Math.min(E_LIFETIME_MS,Math.max(0,elapsed+now()-epoch));
  const snapshot=(value,phase)=>Object.freeze({phase,state,generation,viewport,elapsedMs:value,slashActive:value<SLASH_LIFETIME_MS,
    slashProgress:Math.min(1,value/SLASH_LIFETIME_MS),eActive:value<E_LIFETIME_MS,eAgeMs:value,eProgress:Math.min(1,value/E_LIFETIME_MS),
    scope:'standalone-preview-only',clockMode:'preview-render-backpressure',renderWaitMs,wallClockScaledElapsedMs:Math.max(0,now()-startedAt)});
  const cleanup=details=>{if(!cleanupCalled){cleanupCalled=true;dispose(details);}};
  function schedule(){if(state==='running'&&!pending&&handle===null&&!closed){const selected=generation;handle=requestFrame(()=>{
    handle=null;if(closed||selected!==generation||state!=='running')return;
    const value=age();if(value>=E_LIFETIME_MS){state='ended';reason='expired';emit(E_LIFETIME_MS,'expired');}else emit(value,'frame');
  });}}
  function emit(value,phase){
    elapsed=value;
    if(pending){dirty={value,phase,generation};return snapshot(value,phase);}
    const selected=generation,start=now();
    let result;try{result=render(snapshot(value,phase));}catch(error){fail(error);throw error;}
    const task=Promise.resolve(result).then(()=>{
      if(closed||selected!==generation)return;
      renderWaitMs+=Math.max(0,now()-start);epoch=now();
    },error=>{fail(error);}).finally(()=>{
      if(pending!==task)return;pending=null;
      if(closed)return;
      const next=dirty;dirty=null;
      if(next&&next.generation===generation)emit(next.value,next.phase);else schedule();
    });
    pending=task;return snapshot(value,phase);
  }
  function fail(error){renderFailure=error;cancel();state='ended';reason='render-failed';closed=true;dirty=null;onFailure(error);cleanup(Object.freeze({generation,elapsedMs:elapsed,reason}));}
  const ensure=()=>{if(closed)throw renderFailure||new Error('preview clock is disposed');};
  return Object.freeze({
    play(){ensure();if(pending)throw new Error('Drain the previous actual submission before starting a fresh preview cause');cancel();generation++;state='running';reason=null;
      elapsed=0;epoch=startedAt=now();renderWaitMs=0;emit(0,'start');return snapshot(0,'start');},
    hold(){ensure();if(state!=='running')return snapshot(age(),'hold-ignored');const value=age();cancel();state='held';emit(value,'hold');return snapshot(value,'hold');},
    resume(){ensure();if(state!=='held')return snapshot(age(),'resume-ignored');state='running';epoch=now();emit(elapsed,'resume');return snapshot(elapsed,'resume');},
    resize(next){ensure();if(!next||![next.width,next.height,next.pixelWidth,next.pixelHeight,next.dpr].every(v=>Number.isFinite(v)&&v>0))throw new TypeError('positive physical viewport required');
      const value=age();viewport=Object.freeze({...next,generation:(viewport?.generation||0)+1});if(state==='running'||state==='held')emit(value,'resize');return viewport;},
    end(){ensure();const value=age();cancel();state='ended';reason='ended';emit(value,'ended');return snapshot(value,'ended');},
    async drain(){while(pending)await pending;if(renderFailure)throw renderFailure;},
    dispose(){if(closed)return;cancel();state='disposed';reason='disposed';closed=true;dirty=null;cleanup(Object.freeze({generation,elapsedMs:elapsed,reason}));},
    getState:()=>Object.freeze({state,reason,generation,viewport,clockMode:'preview-render-backpressure',renderPending:Boolean(pending),renderWaitMs})
  });
}
