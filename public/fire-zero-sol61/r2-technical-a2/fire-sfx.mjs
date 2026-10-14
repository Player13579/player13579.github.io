// Fire zero R2 retains the new-zero-chain R1 synthetic PCM and envelope, with R2 edition binding. No context/source at import.
export const FIRE_SOUND_PLAN = Object.freeze({
  edition:'fire-zero-sol61-r2', provenance:'new synthetic PCM; not field recording',
  lifetimePreviewEms:2600, extentPreviewWorld:1.1,
  ignitionEndFraction:0.10, fuelStopFraction:0.78, extinctionFraction:1,
  maxAdmissionElapsedEms:160, ignitionGain:0.31, combustionGain:0.21,
  crackleGain:0.13, peakLimit:0.46, cracklesPerSecond:1/.190,
  filtersHz:Object.freeze({pressureLow:420, pressureHigh:65, airLow:3200,
    airHigh:850, combustionLow:1900, combustionHigh:160, crackleLow:4600}),
  quality:'authored / listening not accepted', audioFormat:'mono Float32 PCM'
});
const finite = Number.isFinite;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
function hashCause(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function random(seed){let s=seed||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
export function fireSoundEnvelope(ageEms,lifetimeEms){
  if(!finite(ageEms)||!finite(lifetimeEms)||lifetimeEms<=0||ageEms<0||ageEms>=lifetimeEms)
    return {ignition:0,combustion:0,crackle:0,fuel:0};
  const u=ageEms/lifetimeEms;
  const ignition=smooth(u/0.012)*(1-smooth((u-0.018)/0.082));
  const fuel=1-smooth((u-0.78)/0.055);
  const tail=1-smooth((u-0.78)/0.22);
  const combustion=smooth(u/0.10)*(u<0.78?1:tail);
  return {ignition,combustion,crackle:smooth(u/0.10)*fuel,fuel};
}
// Pure synthesis, also usable by CPU checks; no playback implied.
export function synthesizeFirePcm({causeId,lifetimeEms,sampleRate=48000}){
  if(typeof causeId!=='string'||!causeId||!finite(lifetimeEms)||lifetimeEms<200||lifetimeEms>10000||
    !finite(sampleRate)||sampleRate<8000||sampleRate>192000) throw Error('Invalid fire sound cue');
  const n=Math.ceil(lifetimeEms*sampleRate/1000)+1;
  const pcm=new Float32Array(n), rng=random(hashCause(causeId));
  const f=FIRE_SOUND_PLAN.filtersHz;
  const coefficient=hz=>1-Math.exp(-2*Math.PI*Math.min(hz,sampleRate*.45)/sampleRate);
  const cp=coefficient(f.pressureLow), hp=coefficient(f.pressureHigh),
    ca=coefficient(f.airLow), ha=coefficient(f.airHigh),
    cb=coefficient(f.combustionLow), hb=coefficient(f.combustionHigh), cc=coefficient(f.crackleLow);
  let pl=0,pbase=0,al=0,abase=0,bl=0,bbase=0,cl=0, crackAmplitude=0, crackDecay=1;
  // Sparse aperiodic fuel microfractures; onset distribution and widths are seeded per cause.
  let nextCrackle=(.10*lifetimeEms/1000)+.035+rng()*.10;
  const crackleTimes=[];
  let peak=0,sum=0;
  for(let i=0;i<n;i++){
    const age=i*1000/sampleRate, seconds=age/1000, e=fireSoundEnvelope(age,lifetimeEms);
    const white=rng()*2-1;
    pl+=cp*(white-pl);pbase+=hp*(pl-pbase);
    al+=ca*(white-al);abase+=ha*(al-abase);
    bl+=cb*(white-bl);bbase+=hb*(bl-bbase);
    cl+=cc*(white-cl);
    if(seconds>=nextCrackle&&age<.78*lifetimeEms){
      crackleTimes.push(age);crackAmplitude=.45+rng()*.55;
      crackDecay=Math.exp(-1/(sampleRate*(.007+rng()*.015)));
      nextCrackle=seconds+.09+rng()*.20;
    }
    crackAmplitude*=crackDecay;
    // Slow stochastic combustion amplitude: no oscillator and no pitched sweep.
    const breathing=.80+.20*Math.sin(seconds*7.1+.6*Math.sin(seconds*3.7));
    let x=FIRE_SOUND_PLAN.ignitionGain*e.ignition*((pl-pbase)*2.7+(al-abase)*.22)+
      FIRE_SOUND_PLAN.combustionGain*e.combustion*breathing*(bl-bbase)*1.55+
      FIRE_SOUND_PLAN.crackleGain*e.crackle*crackAmplitude*cl;
    x=clamp(x,-FIRE_SOUND_PLAN.peakLimit,FIRE_SOUND_PLAN.peakLimit);
    if(age>=lifetimeEms)x=0;
    pcm[i]=x;peak=Math.max(peak,Math.abs(x));sum+=x*x;
  }
  return {pcm,sampleRate,lifetimeEms,causeId,peak,rms:Math.sqrt(sum/n),crackleTimes,
    plan:FIRE_SOUND_PLAN,provenance:FIRE_SOUND_PLAN.provenance};
}
export function createFireSfx({verify=false,muted=false}={}){
  const hardMute=!!verify;
  let isMuted=!!muted||hardMute, disposed=false, ctx=null, master=null, unlockPending=null, unlockResolve=null;
  let disposePromise=null, accepted=0,rejected=0;
  const consumed=new Set(),voices=new Map(),errors=[];
  const note=e=>errors.push(String(e?.message||e));
  function stopVoice(v){
    if(v.finished)return;
    v.finished=true;voices.delete(v.causeId);
    try{v.source.stop();}catch(e){note(e);}
    try{v.source.disconnect();}catch(e){note(e);}
    v.resolveDone({causeId:v.causeId,status:'stopped'});
  }
  function unlock(){
    if(hardMute||isMuted||disposed)return Promise.resolve(false);
    if(ctx?.state==='running')return Promise.resolve(true);
    if(unlockPending)return unlockPending;
    let resolve;
    const promise=new Promise(r=>resolve=r);
    unlockPending=promise;unlockResolve=resolve;
    const settle=value=>{if(unlockPending===promise){unlockPending=null;unlockResolve=null;}resolve(value);};
    (async()=>{
      try{
        if(!ctx){
          const C=globalThis.AudioContext||globalThis.webkitAudioContext;
          if(!C){settle(false);return;}
          ctx=new C();master=ctx.createGain();master.gain.value=0.68;master.connect(ctx.destination);
        }
        await ctx.resume();
        settle(!disposed&&!isMuted&&!hardMute&&ctx.state==='running');
      }catch(e){note(e);settle(false);}
    })();
    return promise;
  }
  function start({causeId,lifetimeEms,elapsedEms=0}={}){
    // Gate rechecked for each cue: suspended/failed starts never consume cause identity.
    if(disposed||hardMute||isMuted||!ctx||ctx.state!=='running'||typeof causeId!=='string'||!causeId||
      !finite(lifetimeEms)||lifetimeEms<200||lifetimeEms>10000||!finite(elapsedEms)||elapsedEms<0||
      elapsedEms>FIRE_SOUND_PLAN.maxAdmissionElapsedEms||elapsedEms>=lifetimeEms||consumed.has(causeId)){
      rejected++;return false;
    }
    let source=null;
    try{
      const signal=synthesizeFirePcm({causeId,lifetimeEms,sampleRate:ctx.sampleRate});
      const buffer=ctx.createBuffer(1,signal.pcm.length,ctx.sampleRate);
      buffer.getChannelData(0).set(signal.pcm);
      source=ctx.createBufferSource();source.buffer=buffer;source.connect(master);
      let resolveDone;
      const donePromise=new Promise(r=>resolveDone=r);
      const v={source,causeId,finished:false,resolveDone};
      source.onended=()=>{
        if(v.finished)return;v.finished=true;voices.delete(causeId);
        try{source.disconnect();}catch(e){note(e);}
        resolveDone({causeId,status:'ended'});
      };
      if(disposed||isMuted||ctx.state!=='running'){source.disconnect();rejected++;return false;}
      source.start(ctx.currentTime,elapsedEms/1000);
      // Playback acceptance follows nonthrowing start, never precedes it.
      voices.set(causeId,v);consumed.add(causeId);accepted++;
      return {causeId,donePromise,stop:()=>stopVoice(v)};
    }catch(e){note(e);rejected++;try{source?.disconnect();}catch{}return false;}
  }
  function stop(causeId){const v=voices.get(causeId);if(v)stopVoice(v);}
  function setMuted(value){
    if(disposed)return;
    isMuted=hardMute||!!value;
    if(master)master.gain.value=isMuted?0:0.68;
    if(isMuted){for(const v of [...voices.values()])stopVoice(v);if(unlockResolve){unlockResolve(false);unlockResolve=null;unlockPending=null;}}
  }
  function dispose(){
    if(disposePromise)return disposePromise;
    disposed=true;isMuted=true;if(master)master.gain.value=0;
    if(unlockResolve){unlockResolve(false);unlockResolve=null;unlockPending=null;}
    for(const v of [...voices.values()])stopVoice(v);
    try{master?.disconnect();}catch(e){note(e);}
    disposePromise=Promise.resolve().then(()=>ctx&&ctx.state!=='closed'?ctx.close():undefined)
      .catch(e=>note(e)).then(()=>({disposed:true,voices:voices.size,unlockPending:!!unlockPending}));
    return disposePromise;
  }
  return {unlock,start,stop,setMuted,dispose,snapshot:()=>({edition:FIRE_SOUND_PLAN.edition,
    verify:hardMute,muted:isMuted,disposed,contextCreated:!!ctx,contextState:ctx?.state||'absent',
    pendingVoices:voices.size,pendingUnlocks:unlockPending?1:0,pendingTimers:0,
    accepted,rejected,consumedCauses:[...consumed],errors:[...errors],listeningAccepted:false})};
}
