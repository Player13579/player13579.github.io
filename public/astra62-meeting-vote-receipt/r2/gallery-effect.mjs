import {createAcknowledgements,makeReceiptPcm} from './receipt.mjs';
export {version,lifetimeMs} from './receipt.mjs';
export const makeCue=makeReceiptPcm;
export function fixtureEvent(mode,id){
  if(mode==='accepted')return {serial:id,accepted:true,own:true};
  if(mode==='denied')return {serial:id,accepted:false,own:true};
  if(mode==='foreign')return {serial:id,accepted:true,own:false};
  return null;
}
export function makeGate(){
  const accept=createAcknowledgements();
  return event=>{
    if(event===null||typeof event!=='object')return null;
    let accepted,own,serial;
    try{({accepted,own,serial}=event);}catch{return null;}
    return accept({accepted,own,serial})?Object.freeze({id:serial}):null;
  };
}
