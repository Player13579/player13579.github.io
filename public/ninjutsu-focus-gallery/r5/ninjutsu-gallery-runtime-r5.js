/* Private Ninjutsu gallery runtime. Visuals use the shared production renderer;
 * audio is receipt-gated and allocated only after an explicit normal-mode gesture. */
(function(root){'use strict';
 const DURATION=1.2,TAU=Math.PI*2,TYPE='action-ninjutsu-focus',clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
 const verifyFromUrl=()=>{try{return new URLSearchParams(root.location?.search||'').has('verify');}catch{return false;}};
 function synthesize(samples, sampleRate){
  if(!Number.isInteger(samples)||samples<1||!Number.isFinite(sampleRate)||sampleRate<8000)throw new RangeError('Invalid native AudioBuffer dimensions');
  let seed=797>>>0,z1=0,z2=0,phase=0,peak=0;const data=new Float32Array(samples);const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2147483648-1;};
  for(let i=0;i<samples;i++){
   const age=i/sampleRate,p=age/DURATION;let f0=1800,f1=3100,q0=.7,q1=2.4,bodyHz=280,noiseGain=0,bodyGain=0;
   if(age<.12){const t=smooth(age/.096);f0=1200+(2000-1200)*t;f1=f0;q0=q1=.7;bodyHz=180+(240-180)*clamp(age/.096);if(age<=.096){const attack=smooth(age/.012),crest=age<=.032?Math.sin(Math.PI*.5*clamp(age/.032))**2:1-smooth((age-.032)/.064);const env=attack*crest;noiseGain=.055*env;bodyGain=.018*env;}}
   else if(age<.864){const t=smooth(clamp((age-.12)/.744));f0=1800+(3100-1800)*t;f1=f0;q0=.7+(2.4-.7)*t;q1=q0;bodyHz=280+(420-280)*t;const entry=smooth(clamp((age-.12)/.048)),lock=Math.sin(Math.PI*clamp((p-.22)/.26))**2;noiseGain=entry*(.040+.025*lock);bodyGain=entry*(.014+.006*lock);}
   else{const t=smooth(clamp((age-.864)/.336));f0=3100+(900-3100)*t;f1=f0;q0=2.4+(.7-2.4)*t;q1=q0;bodyHz=420+(240-420)*clamp((age-.864)/.336);const tail=1-smooth((age-.864)/.336);noiseGain=.040*tail;bodyGain=.014*tail;}
   // Time-varying RBJ band-pass, direct-form II transposed; one seeded noise stream.
   const freq=clamp(f0,20,sampleRate*.45),q=Math.max(.3,q0),w=TAU*freq/sampleRate,alpha=Math.sin(w)/(2*q),a0=1+alpha;
   const b0=alpha/a0,b1=0,b2=-alpha/a0,a1=-2*Math.cos(w)/a0,a2=(1-alpha)/a0,x=rand(),y=b0*x+z1;
   z1=b1*x-a1*y+z2;z2=b2*x-a2*y;
   phase+=TAU*bodyHz/sampleRate;if(phase>=TAU)phase-=TAU;
   let v=y*noiseGain+Math.sin(phase)*bodyGain;if(age>=DURATION-1/sampleRate)v=0;
   data[i]=v;peak=Math.max(peak,Math.abs(v));
  }
  return {data,peak,sampleRate,durationSeconds:samples/sampleRate,seed:797};
 }
  function stableCause(value){if(typeof value==='string'&&value)return value;if(Array.isArray(value)&&value.length)return value.map(x=>String(x)).join('|');if(value&&typeof value==='object'){const keys=['roomId','roomSessionGeneration','effectId'];if(keys.every(k=>value[k]!==undefined))return keys.map(k=>String(value[k])).join('|');}throw new TypeError('Ninjutsu audio cause key is incomplete');}
 function create({renderer,canvas,shapes,viewerId='ninjutsu-gallery-viewer',verify=verifyFromUrl(),audioContextFactory,requestAnimationFrame:raf=root.requestAnimationFrame?.bind(root),cancelAnimationFrame:caf=root.cancelAnimationFrame?.bind(root),now=()=>root.performance.now(),onState=()=>{},observerPostEffects=true}={}){
  if(!renderer||!canvas||!shapes||typeof raf!=='function'||typeof caf!=='function'||typeof now!=='function')throw new TypeError('Gallery runtime requires the shared renderer, canvas, shapes and animation clock');
  let destroyed=false,running=false,rafId=0,effectPass=null,age=0,rate=1,lastNow=0,startedAt=10000,replayNumber=0,lastAcceptedAge=-1,ctx=null,buffer=null,muted=false,sensoryBlocked=false,observer=observerPostEffects,reducedMotion=false,lastNativeFrame=null;
  const voices=new Map();
  const consumed=new Set();let state={status:'created',frameId:null,ageSeconds:0,audio:'muted-or-locked',drawn:false};
  const update=(patch={})=>{state={...state,...patch};try{onState(Object.freeze({...state}));}catch{}};
  const verifyMode=Boolean(verify||verifyFromUrl());
  const startup=root.__dvaGalleryStartup;
  const openContext=audioContextFactory||(()=>{const C=root.AudioContext||root.webkitAudioContext;if(!C)throw new Error('AudioContext is unavailable');return new C();});
  function updateVoiceMix(){if(!ctx)return;const target=1/Math.sqrt(Math.max(1,voices.size)),t=ctx.currentTime;for(const v of voices.values()){try{v.gain.gain.cancelScheduledValues(t);v.gain.gain.setValueAtTime(v.gain.gain.value,t);v.gain.gain.linearRampToValueAtTime(v.paused?0:target,t+.012);v.panner?.pan.setValueAtTime(v.pan,t);}catch{}}}
  function releaseVoice(fade=true,cause=null){const list=cause===null?[...voices.values()]:[voices.get(cause)].filter(Boolean),t=ctx?.currentTime||0;for(const v of list){voices.delete(v.cause);try{if(fade){v.gain.gain.cancelScheduledValues(t);v.gain.gain.setValueAtTime(v.gain.gain.value,t);v.gain.gain.linearRampToValueAtTime(0,t+.012);v.source.stop(t+.013);}else v.source.stop(t);}catch{}}updateVoiceMix();}
  function makeVoice(cause,ageSeconds,playRate,pan,distance){if(!ctx||!buffer||ctx.state!=='running'||ageSeconds>=DURATION||playRate<0)return false;
   const source=ctx.createBufferSource(),gain=ctx.createGain(),panner=typeof ctx.createStereoPanner==='function'?ctx.createStereoPanner():null;source.buffer=buffer;source.playbackRate.setValueAtTime(playRate,ctx.currentTime);
   gain.gain.setValueAtTime(0,ctx.currentTime);
   if(panner){panner.pan.setValueAtTime(pan,ctx.currentTime);source.connect(panner);panner.connect(gain);}else source.connect(gain);gain.connect(ctx.destination);
   const v={cause,source,gain,panner,age:ageSeconds,rate:playRate,at:ctx.currentTime,pan,distance,paused:playRate===0};
   source.onended=()=>{try{source.disconnect();gain.disconnect();panner?.disconnect();}catch{}if(voices.get(cause)?.source===source){voices.delete(cause);updateVoiceMix();}};
   source.start(0,Math.max(0,ageSeconds));voices.set(cause,v);updateVoiceMix();return true;}
  async function unlockFromGesture(){if(verifyMode||destroyed)return false;if(!ctx){ctx=openContext();}try{if(ctx.state==='suspended')await ctx.resume();}catch(error){update({audio:'gesture-unlock-failed',audioError:String(error?.message||error)});return false;}
   if(ctx.state!=='running'){update({audio:'context-not-running'});return false;}if(!buffer){const made=synthesize(Math.round(ctx.sampleRate*DURATION),ctx.sampleRate);buffer=ctx.createBuffer(1,made.data.length,ctx.sampleRate);buffer.copyToChannel(made.data,0);}
   update({audio:'unlocked',audioPeak:buffer.length?Math.max(...buffer.getChannelData(0).filter((_,i)=>i%64===0).map(Math.abs)):0,audioSampleRate:ctx.sampleRate});return true;}
  function admitReceipts(rows){if(!Array.isArray(rows))throw new TypeError('Audio receipt batch must be an array');
   const batch=rows.map(row=>{const key=stableCause(row.causeKey),{ageSeconds,displayETimeScale,receipt}=row;if(!receipt||receipt.submitted!==true||receipt.validation!=='clean'||!Number.isInteger(receipt.frameId)||receipt.frameId<1||receipt.effectVisible!==true)throw new TypeError('Audio admission needs a clean actual submitted visible-frame receipt');if(!Number.isFinite(ageSeconds)||ageSeconds<0||!Number.isFinite(displayETimeScale)||displayETimeScale<0)throw new RangeError('Audio receipt phase/rate is invalid');const sx=row.sourceX??0,sy=row.sourceY??0,lx=row.listenerX??0,ly=row.listenerY??0;if(![sx,sy,lx,ly].every(Number.isFinite))throw new RangeError('Audio source/listener position is invalid');const dx=sx-lx,dy=sy-ly;return{key,ageSeconds,displayETimeScale,receipt,distance:Math.hypot(dx,dy),pan:row.pan===undefined?clamp(dx/1000,-1,1):clamp(row.pan,-1,1)};});
    const result=new Map(),fresh=[];
    for(const row of batch){const {key,ageSeconds,displayETimeScale}=row;if(key.startsWith('ninjutsu-gallery|')&&!isCurrentGalleryCause(key)){result.set(key,{admitted:false,stale:true});continue;}const v=voices.get(key);if(consumed.has(key)){if(v&&ctx){const t=ctx.currentTime;if(displayETimeScale===0){v.source.playbackRate.setValueAtTime(0,t);v.paused=true;v.rate=0;v.age=ageSeconds;v.at=t;}
      else if(v.rate===0){v.source.playbackRate.setValueAtTime(displayETimeScale,t);v.paused=false;v.rate=displayETimeScale;v.age=ageSeconds;v.at=t;}
      else{const expected=v.age+Math.max(0,t-v.at)*v.rate;if(Math.abs(ageSeconds-expected)>.08){releaseVoice(true,key);makeVoice(key,ageSeconds,displayETimeScale,row.pan,row.distance);}else{v.source.playbackRate.setValueAtTime(displayETimeScale,t);v.rate=displayETimeScale;v.age=ageSeconds;v.at=t;v.pan=row.pan;v.distance=row.distance;}}
     }result.set(key,{admitted:false,duplicate:true});continue;}
    consumed.add(key);fresh.push(row);result.set(key,{admitted:false,consumed:true});}
   if(verifyMode||muted||sensoryBlocked||!ctx||!buffer||ctx.state!=='running'){update({audio:verifyMode?'verify-muted':muted?'muted':sensoryBlocked?'sensory-blocked':!ctx?'gesture-locked':'context-not-running'});return batch.map(row=>result.get(row.key));}
   const candidates=[...voices.values()].map(v=>({key:v.cause,distance:v.distance,existing:true}));for(const row of fresh)if(row.ageSeconds<DURATION)candidates.push({key:row.key,distance:row.distance,row,existing:false});
   candidates.sort((a,b)=>a.distance-b.distance||a.key.localeCompare(b.key));const keep=new Set(candidates.slice(0,4).map(row=>row.key));for(const v of [...voices.values()])if(!keep.has(v.cause))releaseVoice(true,v.cause);
   for(const candidate of candidates.slice(0,4)){if(candidate.existing)continue;const row=candidate.row;if(makeVoice(row.key,row.ageSeconds,row.displayETimeScale,row.pan,row.distance))result.set(row.key,{admitted:true,consumed:true});}
   updateVoiceMix();update({audio:voices.size?'playing':'phase-consumed-silent',activeVoices:voices.size});return batch.map(row=>result.get(row.key));
  }
  function admitReceipt(causeKey,ageSeconds,displayETimeScale,receipt,position={}){return admitReceipts([{causeKey,ageSeconds,displayETimeScale,receipt,...position}])[0];}
  function setMuted(value){muted=Boolean(value);if(muted)releaseVoice(true);update({audio:muted?'muted':ctx?.state==='running'?'unlocked':'gesture-locked'});}
  function setSensoryBlocked(value){sensoryBlocked=Boolean(value);if(sensoryBlocked)releaseVoice(true);update({audio:sensoryBlocked?'sensory-blocked':muted?'muted':ctx?.state==='running'?'unlocked':'gesture-locked'});}
  function makeEvent(){replayNumber++;startedAt=10000;age=0;lastNow=0;lastAcceptedAge=-1;const key=`gallery|${replayNumber}`;return {id:`ninjutsu-gallery-${replayNumber}`,key,type:TYPE,x:490,y:310,radius:115,startedAt,duration:1200,durationMs:0,playerId:'gallery-assassin',targetId:'',viewerId:''};}
  let currentEffect=makeEvent();
  function isCurrentGalleryCause(key){return key===stableCause({roomId:'ninjutsu-gallery',roomSessionGeneration:replayNumber,effectId:currentEffect?.id})&&running&&age<DURATION;}
  async function init(){if(effectPass)return;startup?.publish('adapter','pending');renderer.registerTarget('main',canvas,{format:renderer.format,width:980,height:620,logicalWidth:980,logicalHeight:620});effectPass=DvaWebGPUNinjutsuFocusE.create({renderer,observerPostEffects:true});await effectPass.ready;startup?.publish('first-frame','pending');update({status:'ready',audio:verifyMode?'verify-muted':'gesture-locked'});}
  function schedule(){if(!destroyed&&running)rafId=raf(drawFrame);}
  function drawFrame(timestamp){rafId=0;if(destroyed||!running)return;if(startup?.enabled&&!startup.isCurrent()){running=false;releaseVoice(true);update({status:'retired'});return;}const t=Number.isFinite(timestamp)?timestamp:now();if(lastNow){age+=Math.max(0,t-lastNow)*.001*rate;}lastNow=t;const elapsedMs=age*1000;let frame=null,outcome=null,proof=null,proofError=null;
   try{frame=renderer.beginFrame('Ninjutsu gallery automatic frame',true);frame.clear('main',[.012,.019,.031,1]);
    const effect={...currentEffect,startedAt,duration:1200,durationMs:0};const actor={id:'gallery-assassin',x:effect.x,y:effect.y,alive:true,ejected:false,inVent:false,invisible:false};
    outcome=effectPass.record({effect,sourceFields:Object.fromEntries(Object.entries(effect)),viewerId,phase:'playing',scene:{phase:'playing',effects:[effect],players:[actor],nowMs:startedAt+elapsedMs,reducedMotion},camera:{x:0,y:0},zoom:1,viewport:{kind:'main',width:980,height:620,pixelWidth:980,pixelHeight:620},frame,target:'main',shapes,observerPostEffects:observer});
    frame.addEncoder({label:'Gallery shared submission receipt observer',reads:[],writes:['main'],encode(){},onSubmitted(value){proof=value;},onProofError({error}){proofError=error;}});
    const count=frame.submit(false);frame=null;if(!proof||!proof.validation||!proof.done)throw new Error('Shared renderer returned no submitted-frame proof');
    const batch=outcome.batch,capturedAge=age,capturedRate=rate,capturedEffectId=currentEffect.id,capturedReplay=replayNumber;
    Promise.all([proof.validation,proof.done]).then(([validation])=>{batch?.destroy();if(destroyed||!running||capturedReplay!==replayNumber||startup?.enabled&&!startup.isCurrent())return;if(validation||proofError)throw validation||proofError;lastNativeFrame=Object.freeze({submitted:true,completed:true,validation:'clean',frameId:proof.frameId,eventId:capturedEffectId,causeId:stableCause({roomId:'ninjutsu-gallery',roomSessionGeneration:capturedReplay,effectId:capturedEffectId}),replayNumber:capturedReplay,ageMs:capturedAge*1000,commandCount:count,observerPostEffects:observer,reducedMotion,fieldGeometry:outcome.sourceGeometry?.fieldGeometry??null,display:{cssRect:(()=>{const r=canvas.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height};})(),cssClient:{width:canvas.clientWidth,height:canvas.clientHeight},backing:{width:canvas.width,height:canvas.height},devicePixelRatio:root.devicePixelRatio||1}});if(!outcome.drawn||outcome.resultClaim!=='focus-attempt-only')return;
      lastAcceptedAge=Math.max(lastAcceptedAge,capturedAge);const latestPhase=Math.max(capturedAge,age);const receipt={submitted:true,frameId:proof.frameId,validation:'clean',effectVisible:true,commandCount:count};admitReceipt({roomId:'ninjutsu-gallery',roomSessionGeneration:capturedReplay,effectId:capturedEffectId},latestPhase,rate,receipt);update({frameId:proof.frameId,drawn:true,ageSeconds:latestPhase,commandCount:count,resultClaim:'focus-attempt-only'});
      if(!state.startupReady){const rect=canvas.getBoundingClientRect(),viewportWidth=Number(rect.width),viewportHeight=Number(rect.height);if(!canvas.isConnected||!(viewportWidth>0)||!(viewportHeight>0)||!(canvas.width>0)||!(canvas.height>0))throw new Error('First WebGPU frame submitted but canvas is not presentable');const firstFrame={recorded:true,submitted:true,completed:true,canvasConnected:true,viewportWidth,viewportHeight,backingWidth:canvas.width,backingHeight:canvas.height,passes:count,submit:proof.frameId};startup?.publish('playing','ready',{firstFrame});update({startupReady:true,firstFrame});}
    }).catch(error=>{try{batch?.destroy();}catch{}update({status:'frame-validation-failed',frameError:String(error?.message||error)});try{startup?.fail(error,'first-frame');}catch{}});
    update({status:'running',ageSeconds:age,frameId:proof.frameId,drawn:Boolean(outcome.drawn),resultClaim:outcome.resultClaim});
   }catch(error){try{frame?.discard();}catch{}try{outcome?.batch?.destroy();}catch{}running=false;update({status:'render-failed',frameError:String(error?.stack||error)});try{startup?.fail(error,'first-frame');}catch{}return;}
   if(age>=DURATION){running=false;releaseVoice(true);update({status:'expired',ageSeconds:DURATION,drawn:false});return;}schedule();}
  function stopForHidden(){if(destroyed)return;running=false;if(rafId)caf(rafId);rafId=0;try{consumed.add(stableCause({roomId:'ninjutsu-gallery',roomSessionGeneration:replayNumber,effectId:currentEffect.id}));}catch{}releaseVoice(true);update({status:'hidden-paused',audio:'cancelled-on-hide'});}
  root.document?.addEventListener?.('visibilitychange',()=>{if(root.document.hidden)stopForHidden();});
  async function start(){if(destroyed)throw new Error('Gallery runtime is disposed');if(root.document?.hidden)throw new Error('Gallery is hidden; wait until visible before replay');if(rafId)caf(rafId);rafId=0;await init();const retiredKey=currentEffect?.id?stableCause({roomId:'ninjutsu-gallery',roomSessionGeneration:replayNumber,effectId:currentEffect.id}):null;releaseVoice(true);if(retiredKey)consumed.delete(retiredKey);currentEffect=makeEvent();age=0;lastNow=0;running=true;update({status:'running',ageSeconds:0,audio:verifyMode?'verify-muted':muted?'muted':ctx?'unlocked':'gesture-locked'});schedule();return Object.freeze({...currentEffect});}
  async function replay(){return start();}
  function setPlaybackRate(value){if(!Number.isFinite(value)||value<0||value>4)throw new RangeError('Gallery playback rate must be 0..4');rate=value;if(ctx){const t=ctx.currentTime;for(const v of voices.values()){v.source.playbackRate.setValueAtTime(value,t);v.rate=value;v.paused=value===0;v.at=t;}}updateVoiceMix();update({playbackRate:value});}
  function setObserverPostEffects(value){observer=Boolean(value);update({observerPostEffects:observer});}
  function setReducedMotion(value){reducedMotion=Boolean(value);update({reducedMotion});}
  function getState(){return Object.freeze({...state,ageSeconds:age,playbackRate:rate,verify:verifyMode,audioAllocated:Boolean(ctx),audioBufferAllocated:Boolean(buffer),consumedCauseCount:consumed.size,activeVoices:voices.size,openFrames:running?1:0});}
  function getNativeReviewState(){return Object.freeze({eventId:currentEffect.id,causeId:stableCause({roomId:'ninjutsu-gallery',roomSessionGeneration:replayNumber,effectId:currentEffect.id}),replayNumber,ageSeconds:age,playbackRate:rate,running,observerPostEffects:observer,reducedMotion,verify:verifyMode,lastCompletedFrame:lastNativeFrame,getState:getState()});}
  function holdCurrentActualPhase(){const sampled=getNativeReviewState();setPlaybackRate(0);return Object.freeze({requestedPhase:false,sampledAgeMs:sampled.ageSeconds*1000,eventId:sampled.eventId,causeId:sampled.causeId,replayNumber:sampled.replayNumber,lastCompletedFrame:sampled.lastCompletedFrame,pausedState:getNativeReviewState()});}
  async function dispose(){if(destroyed)return;destroyed=true;running=false;if(rafId)caf(rafId);rafId=0;releaseVoice(true);consumed.clear();try{effectPass?.destroy();}catch{}if(ctx){await new Promise(resolve=>root.setTimeout(resolve,15));try{await ctx.close?.();}catch{}}effectPass=null;buffer=null;ctx=null;update({status:'disposed',audio:'disposed'});}
  return Object.freeze({init,start,replay,unlockFromGesture,admitReceipt,admitReceipts,setPlaybackRate,setObserverPostEffects,setReducedMotion,setMuted,setSensoryBlocked,getState,getNativeReviewState,holdCurrentActualPhase,dispose,
    get ready(){return effectPass?.ready||Promise.resolve();}});
 }
 const api=Object.freeze({DURATION_SECONDS:DURATION,synthesize,create});root.DvaNinjutsuGalleryRuntime=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
