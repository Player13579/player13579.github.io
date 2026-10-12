export function createFramePump(requestAnimationFrame,step,onError=()=>{}){
  if(typeof requestAnimationFrame!=='function'||typeof step!=='function')throw new TypeError('frame pump requires requestAnimationFrame and step functions');
  let queued=false,running=false,requested=false,disposed=false;
  const report=error=>{try{onError(error)}catch{}};
  const schedule=()=>{
    if(disposed)return false;
    if(queued||running){requested=true;return false;}
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;if(disposed)return;
      requested=false;running=true;
      let work;try{work=step()}catch(error){report(error)}
      Promise.resolve(work).catch(report).finally(()=>{
        running=false;
        if(requested&&!disposed){requested=false;schedule();}
      });
    });
    return true;
  };
  return Object.freeze({schedule,dispose(){disposed=true;requested=false;},getState(){return Object.freeze({queued,running,requested,disposed})}});
}
