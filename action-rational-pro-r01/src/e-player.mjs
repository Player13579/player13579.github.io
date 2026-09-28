import {EventLedger} from './contract.mjs';
import {LatestSubmissionGate} from './actor-clock.mjs';
import {sampleEffect} from './sampler.mjs';
/** ゲーム非接続の公開境界。呼び出し側が正規イベントとplayer別actor時計を供給する。 */
export class EPlayer {
  constructor({clockProvider,renderer,audio=null,delay=async()=>{},onError=e=>{throw e;}}){
    this.clock=clockProvider;this.renderer=renderer;this.audio=audio;this.ledger=new EventLedger();
    this.gate=new LatestSubmissionGate({delay,submit:frame=>renderer.draw(frame),onError});
  }
  receive(event){
    const receipt=this.ledger.accept(event,this.clock.now(event.playerId));
    if(receipt.accepted&&receipt.reason!=='expired_on_arrival')this.audio?.accept(receipt.event);
    return receipt;
  }
  readSnapshot(view={}){
    const timeByPlayer={};
    const samples=this.ledger.all().map(e=>{
      const now=this.clock.now(e.playerId);timeByPlayer[`${typeof e.playerId}:${String(e.playerId)}`]=now;
      return sampleEffect(e,now,{reducedMotion:view.reducedMotion??false});
    }).filter(s=>s.active);
    if(samples.length>32)throw new RangeError('player横断のGPU同時上限32。silent truncationしない');
    return {...view,samples,timeByPlayer,actorNowMs:null};
  }
  requestRender(view={}){this.audio?.sync();return this.gate.request(()=>this.readSnapshot(view));}
  dispose(){this.gate.dispose();this.renderer.destroy();void this.audio?.destroy();}
}
