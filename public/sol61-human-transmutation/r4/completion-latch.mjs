// Diagnostic-only synchronous latch for fulfilled renderer calls.
export function createCompletionLatch({capacity=256,now=()=>performance.now(),origin=()=>performance.timeOrigin,sourceHashes={}}={}) {
  const events=[], outcomes=[],requests=[]; let overflow=false, serial=0;
  const sessionId=`human-r4:${origin()}`,frozenSourceHashes=Object.freeze({...sourceHashes});
  const stamp=()=>{const t=now();return {performanceNow:t,epochMs:origin()+t};};
  const copy=value=>{if(Array.isArray(value))return Object.freeze(value.map(copy));if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value))out[k]=copy(v);return Object.freeze(out);}return value;};
  function room(){if(events.length+outcomes.length+requests.length>=capacity){overflow=true;return false;}return true;}
  function outcome(value){if(!room())return false;outcomes.push(Object.freeze(value));return true;}
  return Object.freeze({
    request(request){const token={serial:++serial,sessionId,requestAt:Object.freeze(stamp()),request:copy(request)};if(room())requests.push({serial:token.serial,sessionId,requestAt:token.requestAt,request:token.request,status:'pending'});return token;},
    fulfilled(token,receipt){
      const req=requests.find(r=>r.serial===token.serial);if(req)req.status='fulfilled';
      if(receipt?.skipped){outcome({serial:token.serial,status:'skipped',reason:receipt.reason,request:token.request});return null;}
      if(!receipt||receipt.queueCompleted!==true||receipt.causeId!==token.request.input.event.id||receipt.generation!==token.request.input.scope.generation||receipt.targetId!==token.request.input.event.targetId){outcome({serial:token.serial,status:'nonmatching-or-incomplete',request:token.request});return null;}
      const event=Object.freeze({serial:token.serial,sessionId:token.sessionId,sourceHashes:frozenSourceHashes,requestAt:token.requestAt,fulfilledAt:Object.freeze(stamp()),request:token.request,receipt:copy(receipt)});
      if(!room()){outcome({serial:token.serial,status:'overflow',request:token.request});return null;}events.push(event);
      return event;
    },
    failed(token,error){const req=requests.find(r=>r.serial===token.serial);if(req)req.status='rejected';outcome({serial:token.serial,status:'rejected',error:String(error?.message??error),request:token.request});},
    cancelled(token,reason){const req=requests.find(r=>r.serial===token.serial);if(req)req.status=reason;outcome({serial:token.serial,status:reason,request:token.request});},
    snapshot(){return Object.freeze({events:Object.freeze(events.slice()),outcomes:Object.freeze(outcomes.slice()),requests:Object.freeze(requests.map(r=>Object.freeze({...r}))),overflow});}
  });
}

const valid=(e,identity)=>{
  if(!e||e.receipt.version!==identity.version||e.receipt.targetId!==identity.targetId||e.receipt.sourceSha256!==identity.sourceSha256||e.request.input.event.id!==identity.causeId||e.request.input.event.targetId!==identity.targetId||e.request.input.scope.generation!==identity.generation||e.receipt.scopeId!==e.request.input.scope.id||e.receipt.queueCompleted!==true||!Number.isInteger(e.receipt.submitted)||e.receipt.submitted<=0||e.receipt.completed!==e.receipt.submitted||e.receipt.passes!==4||!Number.isFinite(e.receipt.elapsedMs)||e.receipt.elapsedMs!==e.request.elapsedMs||e.request.input.sprite.sourceSha256!==identity.sourceSha256)return false;
  const [pw,ph]=e.receipt.physicalExtent??[],[cw,ch]=e.receipt.cssExtent??[],dpr=e.receipt.dpr;
  return [pw,ph,cw,ch,dpr].every(x=>Number.isFinite(x)&&x>0)&&pw===Math.max(1,Math.round(cw*dpr))&&ph===Math.max(1,Math.round(ch*dpr));
};
export function assessCompletion(snapshot,identity,durationMs=1200){
  if(snapshot.overflow)return {status:'UNKNOWN',reason:'recorder-overflow'};
  const events=snapshot.events.filter(e=>valid(e,identity)).sort((a,b)=>a.serial-b.serial);
  const initial=events.find(e=>e.receipt.elapsedMs<durationMs);
  const terminal=events.find(e=>e.receipt.elapsedMs>=durationMs&&e.receipt.active===false);
  const next=snapshot.events.find(e=>e.receipt.causeId!==identity.causeId&&valid(e,{...identity,causeId:e.receipt.causeId,generation:identity.generation+1}));
  const terminalRequested=(snapshot.requests?.some(r=>r.request?.input?.event?.id===identity.causeId&&r.request.elapsedMs>=durationMs))??(snapshot.outcomes.some(o=>o.request?.input?.event?.id===identity.causeId&&o.request.elapsedMs>=durationMs)||snapshot.events.some(e=>e.request.input.event.id===identity.causeId&&e.request.elapsedMs>=durationMs));
  const terminalPending=snapshot.requests?.some(r=>r.status==='pending'&&r.request?.input?.event?.id===identity.causeId&&r.request.elapsedMs>=durationMs);
  const nextPending=snapshot.requests?.some(r=>r.status==='pending'&&r.request?.input?.event?.id!==identity.causeId&&r.request?.input?.scope?.generation===identity.generation+1);
  return {status:initial&&terminal&&next?'complete':terminalPending?'TERMINAL_COMPLETION_PENDING/FAILED':nextPending&&!terminal&&!terminalRequested?'TERMINAL_REQUEST_SKIPPED':nextPending?'NEXT_COMPLETION_PENDING':next&&!terminal?terminalRequested?'TERMINAL_COMPLETION_PENDING/FAILED':'TERMINAL_REQUEST_SKIPPED':initial&&!terminal?terminalRequested?'TERMINAL_COMPLETION_PENDING/FAILED':'TERMINAL_REQUEST_SKIPPED':'incomplete',initialSerial:initial?.serial??null,terminalSerial:terminal?.serial??null,nextSerial:next?.serial??null,terminalRequested};
}
