/** Runnable host adapter skeleton. No mock, RAF, mana mutation or event transport.
 * The host supplies its real resource authority, body polygons, actor clocks and HDR pass.
 */
import {ManaGainLedger,ManaGainRenderer,ManaGainAudio} from '../src/index.js';
export async function createManaGainSlot({device,presentationFormat,beneficiaryPlayerId,sessionId,getActorClock,getBeneficiary,audio,diagnostic=()=>{}}){
  if(typeof beneficiaryPlayerId!=='string'||!beneficiaryPlayerId)throw new TypeError('One real beneficiary per rendering slot required');
  // Share ONE ledger/audio externally for multiple owners so a shared cause still has only one sound.
  const ownAudio=audio??new ManaGainAudio({onDiagnostic:diagnostic});
  const ledger=new ManaGainLedger({sessionId,getActorClock,getBeneficiary,audio:ownAudio,onDiagnostic:diagnostic});
  let renderer;
  try{renderer=await ManaGainRenderer.create({device,presentationFormat,onDiagnostic:diagnostic});}
  catch(e){ledger.dispose();if(!audio)await ownAudio.dispose();throw e;}
  return {
    // Call AFTER the authority has actually committed positive mana.
    commit(event){if(event.beneficiaryPlayerId!==beneficiaryPlayerId)throw new Error('Wrong renderer-slot owner');return ledger.commit(event);},
    prepare(view){return renderer.prepare(ledger.update(),view);},
    behindBody(pass){renderer.draw(pass,'back');},
    aboveBodyBeforeForeground(pass){renderer.draw(pass,'front');},
    present(encoder,sceneView,outputView){renderer.present(encoder,sceneView,outputView);},
    cancel(reason){ledger.cancelBeneficiary(beneficiaryPlayerId,reason);renderer.invalidate();},
    actorGone(actorId,reason){ledger.cancelActor(actorId,reason);renderer.invalidate();},
    sessionChanged(nextId){ledger.resetSession(nextId);renderer.invalidate();},
    unlockAudioFromUserGesture(){return ownAudio.unlock();},
    get state(){return ledger.snapshot();},
    get stats(){return ledger.stats;},
    async dispose(){ledger.dispose();renderer.dispose();if(!audio)await ownAudio.dispose();}
  };
}
// Multi-owner host integration must instead create one ManaGainLedger + one
// ManaGainAudio globally for this E, group ledger.update() by beneficiaryPlayerId,
// and use one ManaGainRenderer per owner. Draw each owner's back/body/front in
// the host's actual z order; draw foreground after these. Present the HDR scene
// once, not once per owner. This example is a SINGLE-owner slot only.
