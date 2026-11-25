import {makeCue as makeAccrualCue} from './accrual.mjs';
export {version,lifetimeMs,fixtureEvent,makeGate} from './accrual.mjs';
function makeSingleCue(rate){return makeAccrualCue(rate,1);}
export {makeSingleCue as makeCue};
