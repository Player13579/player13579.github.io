import {fixturePair,makeGate as makeSelectionGate} from './selection.mjs';
export {version,lifetimeMs,makeCue} from './selection.mjs';
export function fixtureEvent(mode,id){return fixturePair(mode,id);}
function bridgeMakeGate(){const accept=makeSelectionGate();return pair=>Array.isArray(pair)&&pair.length===2?accept(pair[0],pair[1]):null;}
export {bridgeMakeGate as makeGate};
