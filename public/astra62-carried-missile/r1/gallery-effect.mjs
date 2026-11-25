import {fixtureProjection as projectFixture,createMissileGate as makeSourceGate,makeFlightPcm} from './missile.mjs';
export {version,lifetimeMs} from './missile.mjs';
export {makeFlightPcm as makeCue};
export function fixtureEvent(mode,id) {
  if(mode!=='upper'||!Number.isSafeInteger(id)||id<=0) return null;
  const pair=projectFixture(mode);
  if(!pair) return null;
  return {serial:id,kind:'gunner-missile',pair};
}
export function makeGate() {
  const accept=makeSourceGate();
  return input=>accept(input)===true ? Object.freeze({id:input.serial,pair:input.pair}) : null;
}
