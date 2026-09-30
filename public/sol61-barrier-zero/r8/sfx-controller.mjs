const paths={create:'barrier-create-r8.wav',hit:'barrier-hit-r8.wav',break:'barrier-break-r8.wav'};
export function createSfxController({verification=false}={}){
  let context=null,unlocked=false,muted=false,armed=false,lastCause=null;const cache=new Map();
  const audit=()=>({verification,contextCreated:!!context,contextState:context?.state??'absent',unlocked,muted,armed,lastCause});
  const unlock=async()=>{if(verification)return false;if(!armed||muted)return false;if(!context){context=new AudioContext({latencyHint:'interactive'});}await context.resume();unlocked=context.state==='running';return unlocked;};
  const arm=canvas=>{if(verification)return;armed=true;canvas.addEventListener('pointerdown',unlock,{once:false});canvas.addEventListener('keydown',unlock,{once:false});};
  const cause=async(kind,startedAtMs=performance.now(),causeId=`${kind}:${startedAtMs}`)=>{
    if(verification||!unlocked||muted||!context||context.state!=='running'||!paths[kind]||!Number.isFinite(startedAtMs)||causeId===lastCause)return false;
    const response=await fetch(paths[kind]);if(!response.ok)return false;const bytes=await response.arrayBuffer();const buffer=await context.decodeAudioData(bytes.slice(0));if(!unlocked||muted)return false;
    const source=context.createBufferSource(),gain=context.createGain(),offset=Math.max(0,(performance.now()-startedAtMs)/1000);if(offset>=buffer.duration)return false;source.buffer=buffer;gain.gain.value=.18;source.connect(gain).connect(context.destination);lastCause=causeId;source.start(0,offset);return true;
  };
  return{arm,unlock,cause,setMuted(v){muted=!!v;if(muted&&context)context.suspend();else if(context&&unlocked)context.resume();},audit,destroy(){if(context){context.close();context=null;}unlocked=false;armed=false;}};
}
