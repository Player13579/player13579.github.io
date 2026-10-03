export * from './r8/rpg-e.mjs';
export {createObserverPass,VERSION as OBSERVER_VERSION} from './observer.mjs';
export const CANDIDATE_VERSION='sol-rpg-heavy-quality-r11-impact';
import {createPass as createPhysicalPass} from './r8/rpg-e.mjs';
import {createObserverPass} from './observer.mjs';
// Ordinary R9 path requires its observer input; the R8 receipt/SFX ABI remains.
export async function createPass(options){
 const physical=await createPhysicalPass(options);let observer;
 try{observer=await createObserverPass({...options,isSubmitted:physical.isSubmitted})}catch(e){physical.destroy();throw e}
 const recordings=new WeakMap(),submissions=new WeakSet();let dead=false;
 return Object.freeze({version:CANDIDATE_VERSION,isSubmitted:x=>!dead&&submissions.has(x),
  prepare(plan,input){if(dead)throw Error('R9 disposed');const p=physical.prepare(plan,input);let o;try{o=observer.prepare(plan,input)}catch(e){p.release();throw e}
   return Object.freeze({plan,record(encoder,targetView,{lightingLease=null,observerLease,observerSourceOn=true,observerOn=true,intensity=1}={}){
    if(!observerLease?.sceneRadiance)throw Error('R9 ordinary path requires real observer lease');
    const r=p.record(encoder,observerLease.sceneRadiance,{loadOp:'clear',lightingLease});
    const obs=o.record(encoder,targetView,{observerLease,observerSourceOn,observerOn,intensity});
    recordings.set(r,{o,obs,current:()=>input.sourceCurrent()&&observerLease.isCurrent()});return r;
   },release(){p.release();o.release()}});
  },submit(record){const own=recordings.get(record);if(dead||!own||!own.current())throw Error('exact current R9 recording required');const r=physical.submit(record);own.o.bindSubmission(r);const receipt=Object.freeze({...r,candidateVersion:CANDIDATE_VERSION,observerVersion:own.obs.version,observerRecorded:true,observerEnabled:own.obs.observerEnabled,observerSourceEnabled:own.obs.observerSourceEnabled});submissions.add(receipt);recordings.delete(record);return receipt;},
  destroy(){if(dead)return;dead=true;physical.destroy();observer.destroy()}
 });
}
