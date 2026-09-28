// Mock authority and auto-loop are isolated here. Nothing in src/ imports preview/.
import {ManaGainLedger} from '../src/events.js';
import {bodyFixture} from './fixture.js';
export class PreviewController {
  constructor(audio=null){this.audio=audio;this.clock={timeMs:1000,rate:1};this.body=bodyFixture();this.duration=1500;this.scenario='single';this.group=0;this.session='preview-session-1';this.events=[];this.inspectAt=null;this.running=true;this.loop=true;this.createLedger();this.restart();}
  createLedger(){this.ledger=new ManaGainLedger({sessionId:this.session,getActorClock:()=>({timeMs:this.clock.timeMs,rate:this.running?this.clock.rate:0}),getBeneficiary:()=>this.body,audio:this.audio,onDiagnostic:m=>this.note(m)});}
  note(m){this.events.push({...m,at:this.clock.timeMs});if(this.events.length>30)this.events.shift();}
  get offsets(){return this.scenario==='burst'?[0,160,320]:[0];}
  get span(){return this.duration+this.offsets.at(-1)+440;}
  get phaseMs(){return this.inspectAt??this.clock.timeMs-this.base;}
  restart(){this.ledger.cancelBeneficiary('beneficiary','preview-restart');Object.assign(this.body,bodyFixture());this.base=this.clock.timeMs;this.group++;this.next=0;this.inspectAt=null;this.running=true;this.loop=true;this.audio?.setMuted(false);this.submitDue();}
  event(i){return {committed:true,manaDelta:6,sessionId:this.session,eventId:`group-${this.group}-gain-${i}`,beneficiaryPlayerId:'beneficiary',actorPlayerId:'cause-owner',startedAtActorMs:this.base+this.offsets[i],durationMs:this.duration,route:'shared-acquisition'};}
  submitDue(){while(this.next<this.offsets.length&&this.clock.timeMs-this.base>=this.offsets[this.next]){const e=this.event(this.next++),result=this.ledger.commit(e);this.note({type:'mock-authoritative-gain',id:e.eventId,result});}}
  step(wallMs){
    if(this.running&&this.inspectAt===null){this.clock.timeMs+=Math.max(0,wallMs)*this.clock.rate;this.submitDue();if(this.loop&&this.clock.timeMs-this.base>=this.span){this.restart();}}
    return this.inspectAt===null?this.ledger.update():this.inspection(this.inspectAt);
  }
  inspection(ms){return this.offsets.filter(o=>ms>=o&&ms-o<this.duration).map((o,i)=>({key:`inspection-${i}`,eventId:`inspection-${i}`,causeId:`inspection-${i}`,beneficiaryPlayerId:'beneficiary',actorPlayerId:'cause-owner',ageMs:ms-o,durationMs:this.duration,rate:this.clock.rate,radiusPx:82,manaDelta:6,body:structuredClone(this.body)}));}
  seek(ms){this.inspectAt=ms;this.running=false;this.ledger.update();this.audio?.setMuted(true);return this.inspection(ms);}
  toggle(){if(this.inspectAt!==null){this.restart();return;}this.running=!this.running;this.ledger.update();this.audio?.setMuted(!this.running);}
  duplicate(){const i=Math.max(0,this.next-1),result=this.ledger.commit(this.event(i));this.note({type:'duplicate-probe',result});return result;}
  remove(kind){
    this.loop=false;this.next=this.offsets.length;this.inspectAt=null;
    if(kind==='dead')this.body.alive=false;if(kind==='departed')this.body.present=false;if(kind==='vent')this.body.inVent=true;if(kind==='invisible')this.body.invisible=true;
    if(kind==='session'){this.session=`preview-session-${this.group+1}-${this.clock.timeMs}`;this.ledger.resetSession(this.session);}else this.ledger.cancelBeneficiary('beneficiary',kind);
    this.note({type:'lifecycle',kind});
  }
  restore(){this.body=bodyFixture();this.note({type:'restore-without-retrigger'});}
  dispose(){this.ledger.dispose();}
}
