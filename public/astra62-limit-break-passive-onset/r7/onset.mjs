export const version = 'limit-break-passive-onset-sol61-r7';
export const lifetimeMs = 1320;

const cases = Object.freeze({
  fighter: {}, shop: {entitlement:'shop'},
  already: {before:true}, meeting: {phase:'meeting',committed:false},
  manual: {kind:'manual-request',committed:false}, ineligible: {entitlement:'none'},
  'not-rational': {rational:false}, other: {owner:'other'}, snapshot: {kind:'snapshot'}
});

export function fixtureEvent(choice,id) {
  if (!Object.hasOwn(cases,choice)) return null;
  return {kind:'passive-step',owner:'self',current:true,phase:'playing',committed:true,
    entitlement:'fighter',alive:true,ejected:false,rational:true,apex:false,
    before:false,after:true,capacityBefore:2,capacityAfter:1,elapsedMs:100,
    bonusBefore:0,bonusAfter:.01,id,...cases[choice]};
}

// The panel models one ordinary first positive-duration passive step.
export function makeGate() {
  let lastId=0;
  return event => {
    if (!event || event.owner!=='self' || event.current!==true ||
        event.kind!=='passive-step' || event.phase!=='playing' || event.committed!==true ||
        event.alive!==true || event.ejected!==false || event.rational!==true ||
        event.apex!==false || !['fighter','shop'].includes(event.entitlement)) return null;
    if (event.before!==false || event.after!==true || event.capacityBefore!==2 ||
        event.capacityAfter!==1 || event.bonusBefore!==0 || !Number.isFinite(event.elapsedMs) ||
        event.elapsedMs<=0 || !Number.isFinite(event.bonusAfter) || event.bonusAfter<=0) return null;
    const expected=event.elapsedMs/1000*.1;
    if (Math.abs(event.bonusAfter-expected)>1e-9*Math.max(1,expected)) return null;
    const id=event.id;
    if (!Number.isSafeInteger(id) || id<=lastId) return null;
    lastId=id;
    return {id};
  };
}

export function makeCue(rate) {
  const samples=new Float32Array(Math.ceil(rate*.86));
  const turn=2*Math.PI;
  for(let i=0;i<samples.length;i++) {
    const t=i/rate;
    if (t>.14 && t<.425) {
      const u=(t-.14)/.285;
      samples[i]+=.034*Math.sin(Math.PI*u)**2*
        (Math.sin(turn*244*t+.85*Math.sin(turn*650*t))+.3*Math.sin(turn*491*t));
    }
    if(t>=.425 && t<.59) {
      const d=t-.425;
      const env=(1-Math.exp(-d*1100))*Math.exp(-d*42)*Math.min(1,(.59-t)/.03);
      samples[i]+=env*(.12*Math.sin(turn*332*d)+.035*Math.sin(turn*990*d));
    }
    if (t>.43 && t<.84) {
      const d=t-.43;
      const env=Math.sin(Math.PI*d/.41)**2;
      samples[i]+=.038*env*Math.sin(turn*(392*d+128*d*d));
    }
  }
  return samples;
}
