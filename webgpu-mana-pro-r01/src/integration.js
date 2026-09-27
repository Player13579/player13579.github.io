import {ManaAcquireSystem} from './state.js';
import {ManaRenderer} from './renderer.js';
/** Thin integration surface. It never subscribes to a DVA event, creates a canvas, or starts a loop. */
export async function createManaAcquireEffect({device,format,sessionId,getActorClock,getBeneficiary,audio=null,onDiagnostic=()=>{},maxActive=64,maxSessionEvents=32768,depthStencil}={}) {
  const system=new ManaAcquireSystem({sessionId,getActorClock,getBeneficiary,audio,onDiagnostic,maxActive,maxSessionEvents});
  const renderer=await ManaRenderer.create({device,format,depthStencil});
  let disposed=false;
  return {
    /** Only the final host event adapter can assert that the mana delta has committed. */
    onManaCommitted(event){if(disposed)throw new Error('Effect disposed');return system.emit(event);},
    /** Call once per frame, even when no active effects remain. It uploads empty counts on cleanup. */
    prepare(view){if(disposed)throw new Error('Effect disposed');const instances=system.update();return renderer.prepare(instances,view);},
    drawBehindCharacters(pass){renderer.drawBack(pass);},
    drawAboveCharacters(pass){renderer.drawFront(pass);},
    invalidateBeneficiary(playerId,reason){system.cancelBeneficiary(playerId,reason);},
    invalidateActor(playerId,reason){system.cancelActor(playerId,reason);},
    setSession(sessionId){system.setSession(sessionId);},
    snapshot(){return system.snapshot();},
    get stats(){return {...system.stats};},
    dispose(){if(disposed)return;disposed=true;system.dispose();renderer.dispose();}
  };
}
