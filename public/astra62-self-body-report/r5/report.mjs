export const version='self-body-report-astra62-r5';
export const lifetimeMs=1120;
export function fixturePair(mode,n) {
  const match='example-match',meeting='example-meeting-'+n;
  const room={match,meeting,phase:'meeting',sequence:n,owned:true};
  const receipt={match,meeting,sequence:n,kind:mode==='emergency'?'emergency-call':mode==='near'?'body-in-range':'body-report',
    selfReporter:mode!=='other',human:true,current:mode!=='old',committed:mode==='confirmed'||mode==='other'||mode==='emergency'||mode==='old',
    before:'playing',after:'meeting'};
  return [room,receipt];
}
export function makeGate(){
  let last=0,previousMatch='',previousMeeting='';
  return (room,r)=>{
    if(!room||!r||room.owned!==true||room.phase!=='meeting'||r.kind!=='body-report'||
       r.selfReporter!==true||r.human!==true||r.current!==true||r.committed!==true||
       r.before!=='playing'||r.after!=='meeting'||!Number.isSafeInteger(r.sequence)||
       r.sequence<=last||r.sequence!==room.sequence||
       typeof r.match!=='string'||!r.match||room.match!==r.match||
       typeof r.meeting!=='string'||!r.meeting||room.meeting!==r.meeting||
       (r.match===previousMatch&&r.meeting===previousMeeting)) return null;
    last=r.sequence; previousMatch=r.match; previousMeeting=r.meeting;
    return Object.freeze({id:last});
  };
}
export function makeCue(rate){
  if(!Number.isFinite(rate)||rate<8000||rate>192000)throw new RangeError('sample rate');
  const pcm=new Float32Array(Math.ceil(rate*.82)),tau=2*Math.PI;
  for(let i=0;i<pcm.length;i++){
    const t=i/rate;
    const u=t-.16;
    const charge=u>0&&u<.19?Math.sin(Math.PI*u/.19)**2*Math.sin(tau*(438*u+180*u*u)):0;
    const v=t-.37;
    const tx=v>0&&v<.285?Math.min(1,v/.008,(.285-v)/.054)*Math.exp(-6*v)*
      (Math.sin(tau*642*v)+.23*Math.sin(tau*984*v)):0;
    pcm[i]=.051*charge+.108*tx;
  }
  return pcm;
}
