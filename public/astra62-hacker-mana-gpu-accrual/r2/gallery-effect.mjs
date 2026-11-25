import {makeCue as makeAccrualCue} from './accrual.mjs?rev=mana-gpu-accrual-gallery-embed-r2';
export {version,lifetimeMs,fixtureEvent,makeGate} from './accrual.mjs?rev=mana-gpu-accrual-gallery-embed-r2';
function makeSingleCue(rate){return makeAccrualCue(rate,1);}
export {makeSingleCue as makeCue};