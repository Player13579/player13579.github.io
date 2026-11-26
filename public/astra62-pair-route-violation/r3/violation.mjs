export const version = 'pair-route-violation-astra62-r3';
export const lifetimeMs = 940;

export function projectReceipt(event) {
  if (event?.kind !== 'pair-route-violation' || event.confirmed !== true ||
      event.subject !== 'self' || event.visible !== true || event.current !== true ||
      !Number.isSafeInteger(event.serial) || event.serial <= 0) return null;
  const position = event.position;
  if (!Array.isArray(position) || position.length !== 2 ||
      ![position[0],position[1]].every(n => Number.isFinite(n) && Math.abs(n) <= 40)) return null;
  return Object.freeze({id:event.serial, position:Object.freeze([...position])});
}

export function makeGate() {
  let lastSerial = 0;
  return event => {
    const receipt = projectReceipt(event);
    if (!receipt || receipt.id <= lastSerial) return null;
    lastSerial = receipt.id;
    return receipt;
  };
}

export function fixtureEvent(mode, serial) {
  return {kind:'pair-route-violation', serial,
    confirmed:mode === 'confirmed' || mode === 'other' || mode === 'private',
    subject:mode === 'other' ? 'other' : 'self', visible:mode !== 'private', current:true,
    position:[0,14]};
}

export function makeCue(sampleRate) {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
    throw new RangeError('Unsupported sample rate');
  }
  const out = new Float32Array(Math.ceil(sampleRate * 0.83));
  const tau = 2 * Math.PI;
  for (let i=0; i<out.length; i++) {
    const t = i / sampleRate;
    const rise = Math.min(1,t / 0.023);
    const guide = Math.max(0,1 - Math.abs(t-0.098)/0.103) * rise;
    const onset = Math.max(0,t-0.245);
    const contact = Math.min(1,onset/0.004) * Math.exp(-onset*24);
    const tail = Math.min(1,Math.max(0,(0.72-t)/0.06));
    out[i] = tail * (0.044 * guide * Math.sin(tau*(328*t+34*t*t)) +
      contact * (0.129*Math.sin(tau*486*onset) + 0.066*Math.sin(tau*771*onset)));
  }
  return out;
}
