// A sparse data-ingress braid followed by a textured execution latch. No old SFX input.
export const SCORE=Object.freeze([
  {id:'ingress',atE:24,endE:204,kind:'braid',hz:380,amplitude:.032},
  {id:'compile',atE:210,endE:450,kind:'granular',hz:1180,amplitude:.038},
  {id:'execute',atE:528,endE:816,kind:'latch',hz:196,amplitude:.064},
  {id:'seal',atE:820,endE:1020,kind:'release',hz:784,amplitude:.030},
]);
const TAU=2*Math.PI;
export function renderCue(cue,sampleRate=48000) {
  if(!SCORE.includes(cue)||!Number.isSafeInteger(sampleRate)||sampleRate<8000)throw new TypeError('Locked score/sample rate');
  const duration=(cue.endE-cue.atE)/1000, n=Math.ceil(duration*sampleRate), out=new Float32Array(n);
  let noise=0x6d2b79f5;
  for(let i=0;i<n;i++) {
    const t=i/sampleRate,u=t/duration;
    const attack=Math.min(1,t/.012), tail=Math.pow(Math.max(0,1-u),2.2), env=attack*tail;
    noise^=noise<<13;noise^=noise>>>17;noise^=noise<<5;const white=(noise>>>0)/2147483648-1;
    let value;
    if(cue.kind==='braid') value=.68*Math.sin(TAU*(cue.hz*t+115*t*t))+.25*Math.sin(TAU*cue.hz*1.503*t);
    else if(cue.kind==='granular') value=(.45*Math.sin(TAU*cue.hz*t)+.23*white)*(.64+.36*Math.sin(TAU*31*t));
    else if(cue.kind==='latch') value=.65*Math.sin(TAU*cue.hz*t)+.22*Math.sin(TAU*cue.hz*3.01*t)+.16*white*Math.exp(-t*24);
    else value=.7*Math.sin(TAU*(cue.hz*t-180*t*t))+.22*Math.sin(TAU*cue.hz*.501*t);
    out[i]=cue.amplitude*env*value;
  }return out;
}
export function eligibleCues(ageE,rate,provedCurrent,played=new Set()) {
  if(!provedCurrent||!Number.isFinite(rate)||rate<=0||rate>12)return [];
  return SCORE.filter(c=>!played.has(c.id)&&ageE>=c.atE&&ageE<c.atE+36);
}
