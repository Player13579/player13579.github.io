import {FacilityController} from '../src/runtime/controller.mjs';import {MemoryCauseLedger} from '../src/runtime/ledger.mjs';import {TARGETS} from '../src/runtime/contracts.mjs';
export function rig(options={}){
 const state={now:10000,base:1800000000000,uncertainty:0,known:true,missing:false};
 const calls={audio:[],generic:[],diagnostics:[]};
 const clock={monotonicMs:()=>state.now,serverNowMs:()=>state.base+state.now,uncertaintyMs:()=>state.uncertainty};
 const approved=new WeakMap();const ledger=options.ledger??new MemoryCauseLedger();
 const getActorAnchor=(id,now)=>state.missing?null:{playerId:id,world:{x:3800+(now-10000)/1000*20,y:400},heightWorld:64,sampledAtMonotonicMs:now};
 const args={serverEpoch:'test-server-epoch',authenticateAndNormalize:raw=>approved.get(raw)??null,ledger,clock,
  isPlayerKnown:id=>state.known&&(id==='p1'||id==='p2'),getActorAnchor,audio:{playOnce:x=>calls.audio.push(x)},
  dispatchGeneric:x=>calls.generic.push(x),onDiagnostic:x=>calls.diagnostics.push(x),allowMemoryLedger:true,...options};
 const controller=new FacilityController(args);
 function make(key='A',patch={}){
  const target=Object.values(TARGETS).find(x=>x.key===key);const r={status:'success',objectId:target.objectId,type:target.type,effectKind:target.effectKind,
   playerId:'p1',objectCausalId:`cause-${key}`,capturedTime:state.base+state.now,worldOrigin:{...target.origin},...patch};
  const raw={transportTestEnvelope:true};approved.set(raw,r);return {raw,receipt:r};
 }
 return {state,calls,clock,approved,ledger,args,controller,make};
}
