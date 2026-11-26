import {fixturePair,makeGate as makeReportGate} from './report.mjs?rev=self-body-report-gallery-embed-r5';
export {version,lifetimeMs,makeCue} from './report.mjs?rev=self-body-report-gallery-embed-r5';
export function fixtureEvent(mode,id){return fixturePair(mode,id);}
function bridgeMakeGate(){const accept=makeReportGate();return pair=>Array.isArray(pair)&&pair.length===2?accept(pair[0],pair[1]):null;}
export {bridgeMakeGate as makeGate};
