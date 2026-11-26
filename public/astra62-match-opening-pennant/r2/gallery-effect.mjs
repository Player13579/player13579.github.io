import {fixturePair,makeGate as makeOpeningGate} from './opening.mjs';
export {version,lifetimeMs,makeCue} from './opening.mjs';
export function fixtureEvent(mode,id){return fixturePair(mode,id);}
function bridgeMakeGate(){const accept=makeOpeningGate();return pair=>Array.isArray(pair)&&pair.length===2?accept(pair[0],pair[1]):null;}
export {bridgeMakeGate as makeGate};
