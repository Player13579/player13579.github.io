export const version='match-opening-pennant-astra62-r1';
export const lifetimeMs=1270;

export function makeGate(){
  let lastGeneration=0;
  return (room,event)=>{
    if (!room || !event || room.owned!==true || room.current!==true || room.mode!=='ordinary-match' ||
        !Number.isSafeInteger(room.generation) || room.generation<=lastGeneration ||
        typeof room.match!=='string' || !room.match || room.match!==event.match ||
        room.generation!==event.generation || event.kind!=='battle-started' || event.committed!==true ||
        event.before!=='selecting' || event.after!=='playing' || event.round!==1 ||
        !Number.isFinite(event.startedAt) || event.startedAt<=0) return null;
    lastGeneration=room.generation;
    return Object.freeze({id:room.generation});
  };
}

export function fixturePair(mode,id){
  const match='gallery-match-'+id;
  const room={owned:true,current:true,mode:mode==='training'?'training':'ordinary-match',generation:id,match};
  const event={match:mode==='stale'?'old-session':match,generation:id,
    kind:mode==='resume'?'round-resumed':mode==='snapshot'?'snapshot':mode==='preparation'?'preparation-ended':'battle-started',
    committed:['opening','resume','snapshot','preparation','stale','training'].includes(mode),
    before:mode==='resume'?'meeting':'selecting',after:'playing',round:mode==='resume'?2:1,startedAt:1000+id};
  return [room,event];
}

export function makeCue(rate){
  if(!Number.isFinite(rate)||rate<8000||rate>192000)throw new RangeError('sample rate');
  const pcm=new Float32Array(Math.ceil(rate*0.95));
  let state=719429;
  let slow=0,fast=0;
  const lpSlow=1-Math.exp(-2*Math.PI*310/rate);
  const lpFast=1-Math.exp(-2*Math.PI*2500/rate);
  for(let i=0;i<pcm.length;i++){
    const t=i/rate;
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const random=state/2147483648-1;
    slow+=lpSlow*(random-slow);
    fast+=lpFast*(random-fast);
    const draw=Math.max(0,Math.min(1,(t-.13)/.36));
    const cloth=t>=.13&&t<=.49?Math.sin(Math.PI*draw)**2:0;
    const u=Math.max(0,t-.49);
    const settle=Math.min(1,u/.004)*Math.exp(-34*u);
    const tail=Math.max(0,Math.min(1,(.90-t)/.05));
    pcm[i]=tail*(.14*(fast-slow)*cloth+settle*(.08*Math.sin(2*Math.PI*324*u)+.031*Math.sin(2*Math.PI*718*u)));
  }
  return pcm;
}
