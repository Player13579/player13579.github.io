import {createMeetingGate as makeSourceGate,makeBellPcm} from './announcement.mjs';
export {version,lifetimeMs} from './announcement.mjs';
export {makeBellPcm as makeCue};

export function fixtureEvent(mode,id) {
  if (mode !== 'emergencyMeetingStarted' || !Number.isSafeInteger(id) || id <= 0) return null;
  return {id,kind:'emergencyMeetingStarted',meetingId:'preview-'+id,phase:'meeting'};
}

export function makeGate() {
  const accept=makeSourceGate();
  return receipt=>{
    const id=receipt?.id;
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    return accept(receipt) === true ? Object.freeze({id}) : null;
  };
}
