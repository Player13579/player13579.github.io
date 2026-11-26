export const version='operator-selection-confirm-astra62-r2';
export const lifetimeMs=1070;

const cards=Object.freeze(['fixture-chevron','fixture-ring']);
export function makeGate(){
  let last=0;
  return (request,reply)=>{
    if (!request || !reply || request.action!=='manual-pick' || request.owner!=='self' ||
        request.current!==true || reply.ok!==true || reply.owner!=='self' || reply.current!==true ||
        !Number.isSafeInteger(request.id) || request.id<=last || request.id!==reply.requestId ||
        request.session!==reply.session || typeof request.session!=='string' || !request.session) return null;
    const slot=cards.indexOf(request.choice);
    if (slot<0 || reply.ready!==true || reply.acceptedChoice!==request.choice) return null;
    last=request.id;
    return Object.freeze({id:request.id,slot});
  };
}

export function fixturePair(mode,id){
  const choice=mode==='right'?cards[1]:cards[0];
  const request={action:mode==='auto'?'auto-pick':'manual-pick',owner:'self',current:true,
    session:'gallery-current',id,choice};
  const reply={ok:['left','right','auto','stale','mismatch'].includes(mode),owner:'self',
    current:mode!=='stale',requestId:id,session:'gallery-current',ready:true,
    acceptedChoice:mode==='mismatch'?cards[1]:choice};
  return [request,reply];
}

export function makeCue(rate){
  if(!Number.isFinite(rate)||rate<8000||rate>192000) throw new RangeError('sample rate');
  const a=new Float32Array(Math.ceil(rate*0.79));
  const tau=2*Math.PI;
  for(let i=0;i<a.length;i++){
    const t=i/rate;
    const s=t-0.055;
    const slip=s>0&&s<0.30?Math.sin(Math.PI*s/0.30)**2*Math.sin(tau*(270*s+120*s*s)):0;
    const u=Math.max(0,t-0.412);
    const seat=Math.min(1,u/0.003)*Math.exp(-25*u);
    const tail=Math.max(0,Math.min(1,(0.76-t)/0.06));
    a[i]=tail*(0.036*slip+seat*(0.123*Math.sin(tau*612*u)+0.048*Math.sin(tau*914*u)));
  }
  return a;
}
