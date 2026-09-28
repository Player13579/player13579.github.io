import {SwitchEController} from './controller.mjs';
import {SwitchAudio} from './audio.mjs';

/**
 * 既存ゲームを編集しないための明示port境界。
 * installSoundOwnership は実際に旧一般select/Philia BODY三段音の呼出し元を抑止してから成功を返す。
 * receipt後に「既に鳴った音」を消して二重再生を防げたとは扱わない。
 */
export function bindSwitchE({ports,audio = null,clock,ledger,maxActive=512} = {}) {
  const required=['readVisibility','readSelection','setSelection','startBodySwitch','cancelBodySwitch','installSoundOwnership','clearEffectSurface'];
  for (const name of required) if (typeof ports?.[name] !== 'function') throw new TypeError(`host_port_required:${name}`);
  const audioOwned = !audio;
  const sound = audio ?? new SwitchAudio({settings:{muted:true}});
  const lease = ports.installSoundOwnership(Object.freeze({actionType:'action-weapon-switch',owner:'switch-E',
    suppressGeneralSelect:true,suppressPhiliaBodyThreeStage:true,receiptIsSoleTrigger:true,noDedicatedServerSoundReceipt:true}));
  if (!lease || lease.installed !== true || typeof lease.release !== 'function') {
    if (audioOwned) void sound.dispose();
    throw new Error('legacy_sound_routes_not_exclusively_replaced');
  }
  let controller;
  try { controller=new SwitchEController({clock,ledger,maxActive,audio:sound,
    readVisibility:ports.readVisibility,readSelection:ports.readSelection,onSelection:ports.setSelection,
    onBodySwitch:ports.startBodySwitch,onCancelBody:ports.cancelBodySwitch,
    onPrivacyClear:ports.clearEffectSurface,onDiagnostic:ports.onDiagnostic});
  } catch(error) {lease.release();if(audioOwned)void sound.dispose();throw error;}
  let disposed=false;
  return {
    controller,audio:sound,
    enterRoom:roomKey=>controller.enterRoom(roomKey),
    receive:(receipt,context)=>controller.receive(receipt,context),
    frame:viewport=>controller.frame(viewport),
    actorInvalidated:(playerId,reason)=>controller.cancelActor(playerId,reason),
    bodyCompleted:id=>controller.releaseBody(id),
    setPageVisible:visible=>controller.setPageVisible(visible),
    async dispose(){if(disposed)return;disposed=true;controller.dispose();lease.release();if(audioOwned)await sound.dispose();}
  };
}
