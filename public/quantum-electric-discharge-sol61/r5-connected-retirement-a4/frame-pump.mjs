export function createFramePump(requestAnimationFrame,step,onError=()=>{},cancelAnimationFrame=()=>{}){
 let queued=false,running=false,requested=false,disposed=false,handle=null,work=Promise.resolve();
 const schedule=()=>{if(disposed)return false;if(queued||running){requested=true;return false;}queued=true;
 handle=requestAnimationFrame(()=>{handle=null;queued=false;if(disposed)return;requested=false;running=true;
 work=Promise.resolve().then(step).catch(onError).finally(()=>{running=false;if(requested&&!disposed){requested=false;schedule();}});});return true;};
 return Object.freeze({schedule,dispose(){disposed=true;requested=false;if(handle!==null){cancelAnimationFrame(handle);handle=null;}queued=false;},drain:()=>work,getState:()=>Object.freeze({queued,running,requested,disposed})});
}