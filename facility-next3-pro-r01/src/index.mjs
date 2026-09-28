import {createFacilityAdapter} from './host-adapter.mjs';
import {FacilityAudio} from './audio.mjs';
import {GPUHub,FacilityRenderer} from './renderer.mjs';
export {FACILITIES,LIFE_MS,MASK_SIZE} from './contract.mjs';
export {createFacilityAdapter,normalizeDvaMagicReceipt,normalizeDvaSoundReceipt} from './host-adapter.mjs';
export {FacilityRuntime} from './runtime.mjs';
export {FacilityAudio,synthesize,AUDIO_PROFILES} from './audio.mjs';
export {GPUHub,FacilityRenderer} from './renderer.mjs';

/**
 * 本編向けの組立済み境界。購読/認証と画面の所有者はホストのまま。
 * tickはホストのRAFから呼ぶ。WebGPU未対応や音声失敗でも本編RAFは止めない。
 * exact objectIdのgeneric音の前にingestする。後から既存の音を取り消す方式ではない。
 */
export async function createFacilityEffects({canvas,scope,listener,audibility,masksFor,device=null,audioContext=null,verify=false,clock=()=>performance.now(),onDiagnostic=()=>{}}={}){
  const report=data=>{try{onDiagnostic(data);}catch{}};
  const audio=new FacilityAudio({verify,listener,audibility,clock,context:audioContext});
  const adapter=createFacilityAdapter({scope,clock,audio,onDiagnostic:report});
  let hub=null,renderer=null,disposed=false,lastError=null;
  try {hub=await GPUHub.create({device,onDiagnostic:report});renderer=new FacilityRenderer(canvas,hub,{masksFor,onDiagnostic:report});}
  catch(error){lastError=String(error);hub?.dispose();hub=null;report({type:'GPU_NOT_RUN',message:lastError});}
  return {
    ingest(receipt,envelope){return adapter.ingest(receipt,envelope);},
    async enableAudio(){if(disposed)return false;return audio.enable();},
    changeScope(next){adapter.runtime.changeScope(next);},
    tick(view,{reducedMotion=false,dpr=globalThis.devicePixelRatio||1}={}){
      if(disposed)return {rendered:false,reason:'disposed'};
      const events=adapter.runtime.snapshot(clock());
      try {audio.updateSpatial();}catch(error){report({type:'audio_spatial_error',message:String(error)});}
      if(!renderer)return {rendered:false,reason:'GPU_NOT_RUN'};
      try{return renderer.render(events,view,{reducedMotion,dpr});}
      catch(error){lastError=String(error);report({type:'gpu_frame_error',message:lastError});return {rendered:false,reason:'gpu_frame_error'};}
    },
    suspendAudio(){return audio.suspend();},
    get status(){return {disposed,gpuReady:!!renderer&&!hub?.lost&&!hub?.disposed,lastError,
      events:{...adapter.runtime.stats},audio:{...audio.stats},renderer:renderer?{...renderer.stats}:null};},
    async dispose(){if(disposed)return;disposed=true;adapter.dispose();renderer?.dispose();hub?.dispose();await audio.dispose();renderer=null;hub=null;}
  };
}
