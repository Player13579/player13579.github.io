export {ManaAcquireSystem,CONTRACT,inspectBody} from './state.js';
export {ManaRenderer,requestManaDevice} from './renderer.js?v=select-v3';
export {ManaAudio} from './audio.js';
export {synthesizeMana,encodeWav,soundEnvelope} from './synth.js';
export {sampleTime,sampleMana,sampleScene,packPrimitives,PHASES,PALETTE} from './sampler.js';
import {ManaAcquireSystem} from './state.js';
import {ManaRenderer} from './renderer.js?v=select-v3';
/** Integration entry point. Does not start an animation loop, create a dummy character, mutate mana, or unlock audio. */
export async function createManaAcquireEffect(options){
  const system=new ManaAcquireSystem(options);let renderer;
  try{renderer=await ManaRenderer.create(options);}catch(e){system.dispose();throw e;}
  return {
    onManaCommitted:e=>system.onManaCommitted(e),
    prepare:view=>renderer.prepare(system.advance(),view),
    drawBehindCharacters:pass=>renderer.drawBehindCharacters(pass),
    drawAboveCharacters:pass=>renderer.drawAboveCharacters(pass),
    invalidateBeneficiary:(id,reason)=>{system.invalidateBeneficiary(id,reason);renderer.invalidate();},
    invalidateActor:(id,reason)=>{system.invalidateActor(id,reason);renderer.invalidate();},
    setSession:id=>{system.setSession(id);renderer.invalidate();},
    snapshot:()=>system.snapshot(),stats:system.stats,
    dispose:()=>{system.dispose();renderer.dispose();}
  };
}
