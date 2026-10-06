export const SFX_EDITION='excalibur-zero-swing-sol61-r7-sfx';
export const AUDIO_CUES=Object.freeze([{id:'gather',atMs:0,durationMs:230},{id:'receive',atMs:124,durationMs:226.5},{id:'swing',atMs:240,durationMs:156},{id:'release',atMs:350.5,durationMs:299.5}]);
/** Fresh edition PCM synthesis, no reused asset or old Excalibur sound recipe. */
export function synthesizeCue(kind,sampleRate=48000){
 const cue=AUDIO_CUES.find(x=>x.id===kind);if(!cue||!Number.isFinite(sampleRate)||sampleRate<8000)throw new TypeError('known cue and sample rate required');
 const pcm=new Float32Array(Math.ceil(cue.durationMs*sampleRate/1000));let seed=kind==='gather'?8173:kind==='swing'?29741:51749,filtered=0,phase=0;
 for(let i=0;i<pcm.length;i++){
  const t=i/sampleRate,u=i/Math.max(1,pcm.length-1);seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;
  let sample=0;
  if(kind==='gather'){
   filtered+=.12*(noise-filtered);phase+=2*Math.PI*(480+940*u*u)/sampleRate;
   const envelope=Math.pow(Math.sin(Math.PI*u),1.15)*(.3+.7*u);
   sample=envelope*(.115*filtered+.046*Math.sin(phase)+.027*Math.sin(phase*1.417));
  }else if(kind==='receive'){
   const beat=Math.floor(t*1000/16);const local=(t*1000-beat*16)/16;const arrivals=beat<7?Math.sin(Math.PI*local)*Math.exp(-local*3):0;const envelope=Math.sin(Math.PI*u)*Math.exp(-u*2.0)*.55+arrivals*.45;
   sample=envelope*(.060*Math.sin(2*Math.PI*972*t)+.025*Math.sin(2*Math.PI*1471*t));
  }else if(kind==='swing'){
   filtered+=(.55-.44*u)*(noise-filtered);
   const high=noise-filtered;const envelope=Math.pow(Math.sin(Math.PI*u),.72)*Math.exp(-u*1.0);
   sample=envelope*(.16*high+.06*filtered);
  }else{
   filtered+=.23*(noise-filtered);const attack=Math.min(1,t/.004);const finite=Math.pow(1-u,1.5);
   const ring=Math.sin(2*Math.PI*1180*t)*Math.exp(-t*18)+.42*Math.sin(2*Math.PI*1703*t)*Math.exp(-t*24);
   const pressure=Math.sin(2*Math.PI*92*t)*Math.exp(-t*14)+.32*Math.sin(2*Math.PI*184*t)*Math.exp(-t*22);
   sample=attack*finite*(.072*ring+.155*filtered*Math.exp(-t*5)+.085*pressure);
  }
  pcm[i]=sample;
 }
 pcm[0]=0;pcm[pcm.length-1]=0;return pcm;
}

const now=()=>globalThis.performance?.now?.()??Date.now();
const isThenable=x=>x!==null&&x!==undefined&&(typeof x==='object'||typeof x==='function')&&typeof x.then==='function';

export class ExcaliburSfxAdapter {
 constructor({verify=false,audioContextFactory=()=>new AudioContext(),record=()=>{}}={}){
  this.verify=verify;this.factory=audioContextFactory;this.record=record;this.context=null;this.contextPromise=null;this.activationGeneration=0;this.enabled=false;this.disposed=false;this.eventSerial=0;this.event=null;this.sources=new Map();this.buffers=new Map();this.diagnostics=[];
 }
 log(kind,detail={}){if(this.diagnostics.length>=32)this.diagnostics.shift();this.diagnostics.push(Object.freeze({kind,at:now(),...detail}));try{this.record('sfx',kind,detail.error);}catch{}}
 get hasLiveEvent(){return !!this.event?.live;}
 get hasPendingTickets(){return !!this.event?.tickets.some(t=>t.state==='pending'&&!t.observedFrame);}
 get currentEventToken(){return this.event?.token??null;}
 beginEvent({causeId,sourceEpoch,startedAtMs=now(),audioAllowed=this.enabled}={}){
  this.cancelEvent('superseded');
  if(typeof causeId!=='string'||!causeId||typeof sourceEpoch!=='string'||!sourceEpoch||!Number.isFinite(startedAtMs))return null;
  const e={serial:++this.eventSerial,causeId,sourceEpoch,startedAtMs,audioGeneration:this.activationGeneration,ageCursor:-Infinity,live:true,audioAllowed:audioAllowed===true,terminal:new Map(),tickets:[],started:new Set(),acceptedFrameSerial:-1,initialObservation:true};
  e.token=Object.freeze({serial:e.serial,causeId,sourceEpoch,startedAtMs});this.event=e;this.log('event-start',{serial:e.serial,causeId,sourceEpoch});return e.token;
 }
 cancelEvent(reason='cancelled'){
  const e=this.event;if(e){e.live=false;for(const t of e.tickets)if(t.state==='pending')t.state='cancelled';this.log('event-cancel',{serial:e.serial,reason});this.stopEventSources(e.serial);}
  this.event=null;return true;
 }
 setEnabled(value){const next=value===true&&!this.verify&&!this.disposed;if(this.enabled===next)return;this.enabled=next;this.activationGeneration++;if(!next){if(this.event){this.event.audioAllowed=false;for(const t of this.event.tickets)if(t.state==='pending'){t.state='suppressed';this.event.terminal.set(t.id,'suppressed');}this.stopEventSources(this.event.serial);}this.log('audio-disabled');}else if(this.event){this.event.audioAllowed=true;this.event.audioGeneration=this.activationGeneration;}}
 async enableFromGesture({isCurrent=()=>true}={}){
  if(this.verify||this.disposed)return false;
  if(typeof isCurrent!=='function'||!isCurrent())return false;
  const generation=this.activationGeneration;
  if(this.contextPromise)return this.contextPromise;
  let ctx=this.context;
  try{
   if(!ctx){ctx=this.factory();if(!ctx||typeof ctx.resume!=='function')return false;this.context=ctx;}
   const resume=ctx.resume();if(!isThenable(resume))return false;
   const pending=Promise.resolve(resume).then(()=>{
    if(this.disposed||generation!==this.activationGeneration||!isCurrent()||ctx!==this.context||ctx.state!=='running')return false;
    if(this.buffers.size===0){for(const cue of AUDIO_CUES){const pcm=synthesizeCue(cue.id,ctx.sampleRate),buffer=ctx.createBuffer(1,pcm.length,ctx.sampleRate);buffer.copyToChannel(pcm,0);this.buffers.set(cue.id,buffer);}}
    this.log('audio-unlocked');return true;
   }).catch(error=>{this.log('audio-unlock-failed',{error:String(error?.message||error)});return false;}).finally(()=>{if(this.contextPromise===pending)this.contextPromise=null;});
   this.contextPromise=pending;return pending;
  }catch(error){this.log('audio-unlock-failed',{error:String(error?.message||error)});return false;}
 }
 onMotionSample({eventToken,causeId,sourceEpoch,ageMs,playbackAllowed=false}={}){
  const e=this.event;if(!e||!e.live||!eventToken||eventToken.serial!==e.serial||eventToken.causeId!==e.causeId||eventToken.sourceEpoch!==e.sourceEpoch||causeId!==e.causeId||sourceEpoch!==e.sourceEpoch||!Number.isFinite(ageMs)||ageMs<0)return;
  const prior=e.ageCursor,initial=e.initialObservation;e.initialObservation=false;e.ageCursor=Math.max(prior,ageMs);if(!playbackAllowed||!this.enabled||this.verify||!e.audioAllowed||this.context?.state!=='running'){
   for(const cue of AUDIO_CUES){const crossed=initial?cue.id==='gather'&&ageMs<=12:prior<cue.atMs&&ageMs>=cue.atMs;if(crossed&&!e.terminal.has(cue.id)){e.terminal.set(cue.id,'suppressed');this.log('cue-suppressed',{serial:e.serial,cue:cue.id,ageMs});}}
   return;
  }
  for(const cue of AUDIO_CUES){
   const crossed=initial?cue.id==='gather'&&ageMs<=12:prior<cue.atMs&&ageMs>=cue.atMs;
   if(!crossed||e.terminal.has(cue.id)||e.started.has(cue.id))continue;
   if(ageMs-cue.atMs>45){e.terminal.set(cue.id,'missed');this.log('cue-missed',{serial:e.serial,cue:cue.id,ageMs});continue;}
   const t={serial:e.serial,causeId:e.causeId,sourceEpoch:e.sourceEpoch,audioGeneration:e.audioGeneration,id:cue.id,onset:cue.atMs,deadline:cue.atMs+45,state:'pending',observedFrame:0};e.tickets.push(t);e.terminal.set(cue.id,'pending');
  }
  if(e.tickets.length>4){const t=e.tickets.shift();if(t.state==='pending'){t.state='dropped';e.terminal.set(t.id,'capacity');this.log('ticket-capacity',{serial:e.serial,cue:t.id});}}
 }
 reserveTicketForFrame({eventToken,frameSerial}={}){
  const e=this.event;if(!e||!e.live||!eventToken||eventToken.serial!==e.serial||!Number.isSafeInteger(frameSerial))return null;
  const t=e.tickets.find(x=>x.state==='pending'&&!x.observedFrame&&x.serial===e.serial);if(!t)return null;t.observedFrame=frameSerial;
  return Object.freeze({serial:t.serial,causeId:t.causeId,sourceEpoch:t.sourceEpoch,audioGeneration:t.audioGeneration,id:t.id,onset:t.onset,deadline:t.deadline,frameSerial});
 }
 validateReservedTicket(ticket,{eventToken,plan,frameAge,emitting=true}={}){
  const e=this.event,t=e?.tickets.find(x=>x.id===ticket?.id&&x.serial===ticket?.serial);if(!t||t.state!=='pending'||t.observedFrame!==ticket.frameSerial)return null;
  if(!e.live||!eventToken||eventToken.serial!==e.serial||!plan||!emitting||plan.active!==true||plan.emitting!==true||plan.causeId!==e.causeId)return null;
  if(!Number.isFinite(frameAge)||frameAge<t.onset||frameAge>t.deadline){t.state='dropped';e.terminal.set(t.id,'deadline');this.log('cue-missed',{serial:e.serial,cue:t.id,ageMs:frameAge});return null;}
  return ticket;
 }
 releaseTicketReservation(ticket){const t=this.event?.tickets.find(x=>x.id===ticket?.id&&x.serial===ticket?.serial);if(t?.state==='pending'&&t.observedFrame===ticket.frameSerial)t.observedFrame=0;}
 completeObservedTicket(ticket,{proof,validationValue,doneFulfilled,frameSerial,plan,currentAge,currentToken,currentControls,context=this.context}={}){
  const e=this.event,t=e?.tickets.find(x=>x.id===ticket?.id&&x.serial===ticket?.serial);
  const fail=reason=>{if(t&&t.state==='pending'){t.state='dropped';e.terminal.set(t.id,reason);}this.log('cue-proof-rejected',{cue:ticket?.id,reason,frameSerial});return false;};
  if(!t||t.state!=='pending')return false;
  if(validationValue!==null)return fail('validation');if(doneFulfilled!==true)return fail('queue-done');
  if(!proof||proof.submitted!==true||proof.passes!==3||proof.frameSerial!==frameSerial)return fail('proof');
  if(!e.live||this.event!==e||!currentToken||currentToken.serial!==e.serial||ticket.serial!==e.serial||ticket.causeId!==e.causeId||ticket.sourceEpoch!==e.sourceEpoch||ticket.audioGeneration!==e.audioGeneration||this.activationGeneration!==e.audioGeneration)return fail('identity');
  if(!currentControls?.allowed||!e.audioAllowed||!this.enabled||this.verify||!context||context!==this.context||context.state!=='running')return fail('disabled');
  if(!plan?.active||plan.emitting!==true||plan.causeId!==e.causeId||!Number.isFinite(plan.ageMs)||plan.ageMs<ticket.onset||plan.ageMs>ticket.deadline||!Number.isFinite(currentAge)||currentAge<plan.ageMs||currentAge<ticket.onset||currentAge>ticket.deadline||currentAge>=650)return fail('age');
  if(t.observedFrame!==frameSerial||frameSerial<e.acceptedFrameSerial)return fail('frame-order');
  t.state='started';e.started.add(t.id);e.terminal.set(t.id,'started');e.acceptedFrameSerial=frameSerial;
  let src;
  try{src=context.createBufferSource();src.buffer=this.buffers.get(t.id);if(!src.buffer)throw new Error('cue buffer unavailable');src.connect(context.destination);const owned=this.sources.get(e.serial)||new Set();owned.add(src);this.sources.set(e.serial,owned);src.onended=()=>{owned.delete(src);if(!owned.size)this.sources.delete(e.serial);try{src.disconnect();}catch{}};src.start(context.currentTime);this.log('cue-started',{serial:e.serial,cue:t.id,frameSerial,ageMs:currentAge});return true;}
  catch(error){try{src?.stop?.();}catch{}try{src?.disconnect?.();}catch{}const owned=this.sources.get(e.serial);owned?.delete(src);if(owned&&!owned.size)this.sources.delete(e.serial);t.state='failed';e.terminal.set(t.id,'failed');this.log('cue-start-failed',{serial:e.serial,cue:t.id,error:String(error?.message||error)});return false;}
 }
 stopEventSources(serial){const owned=this.sources.get(serial);if(!owned)return;for(const src of [...owned]){try{src.stop();}catch{}try{src.disconnect();}catch{}}this.sources.delete(serial);}
 cancelCause(causeId){if(this.event?.causeId===causeId)this.invalidate('cause-stopped');}
 invalidate(reason='invalidated'){this.activationGeneration++;this.cancelEvent(reason);}
 dropPending(reason='capacity') {const e=this.event;if(!e)return 0;let count=0;for(const t of e.tickets)if(t.state==='pending'&&!t.observedFrame){t.state='dropped';e.terminal.set(t.id,reason);count++;}if(count)this.log('tickets-dropped',{serial:e.serial,count,reason});return count;}
 async dispose(){if(this.disposed)return;this.disposed=true;this.activationGeneration++;this.enabled=false;this.cancelEvent('dispose');this.stopEventSources(this.eventSerial);this.buffers.clear();const ctx=this.context;this.context=null;try{await ctx?.close?.();}catch(error){this.log('audio-close-failed',{error:String(error?.message||error)});}}
}
