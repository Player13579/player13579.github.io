import {makeCue as makeTransferCue} from './transfer.mjs';
export {version,lifetimeMs,fixtureEvent,makeGate} from './transfer.mjs';
function makePartialCue(rate){return makeTransferCue(rate,1);}
export {makePartialCue as makeCue};
