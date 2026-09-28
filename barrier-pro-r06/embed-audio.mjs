// Gallery-only audio gate. AudioContext creation is deferred until an explicit
// user gesture; verification routes remain silent even if unlock is called.
export function createReplayAudioGate({verifyMode,sfx,onError=()=>{}}){
  let enabled=false;
  let currentBranch=null;
  let unlocking=null;

  async function unlock(){
    if(verifyMode||enabled)return false;
    if(unlocking)return unlocking;
    unlocking=(async()=>{
      try{
        await sfx.ensure();
        enabled=true;
        return true;
      }catch(error){
        onError(error);
        return false;
      }finally{
        unlocking=null;
      }
    })();
    return unlocking;
  }

  function enter(branch){
    const changed=branch!==currentBranch;
    currentBranch=branch;
    if(verifyMode||!enabled||!changed)return false;
    Promise.resolve().then(()=>sfx.play(branch)).catch(onError);
    return true;
  }

  return {unlock,enter,get enabled(){return enabled;}};
}
