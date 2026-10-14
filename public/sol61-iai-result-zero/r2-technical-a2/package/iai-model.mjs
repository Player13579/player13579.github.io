export const VERSION='iai-result-zero-sol61-r2';
export const TYPE='iai-destruction-attack';
export const DURATION_E_MS=900;
export const VARIANTS=Object.freeze(['upgraded-to-destruction','existing-disappearance','existing-destruction']);
export const PASS_COUNT=2;
export const UNIFORM_BYTES=128;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const identity=v=>typeof v==='string'&&v.length>0||finite(v)&&v!==0;
const f32=n=>finite(n)&&Number.isFinite(Math.fround(n));
const smooth=(a,b,x)=>{const q=Math.min(1,Math.max(0,(x-a)/(b-a)));return q*q*(3-2*q);};
export function sourceKey(source){
 if(!source||source.type!==TYPE||!identity(source.id)||!identity(source.playerId)||!identity(source.targetId)||source.playerId===source.targetId||!VARIANTS.includes(source.variant))return null;
 if(!['x','y','targetX','targetY','radius','at','durationMs'].every(k=>finite(source[k]))||source.radius!==148||source.durationMs!==900||source.x!==source.targetX||source.y!==source.targetY)return null;
 return JSON.stringify([source.id,source.type,source.playerId,source.targetId,source.variant,source.x,source.y,source.targetX,source.targetY,source.radius,source.at,source.durationMs]);
}
// A receipt is CPU source admission, never native-ready/submit/completion proof.
// Clock selection is explicit; the core never silently changes clocks at runtime.
export function createReceipt(source,context){
 const key=sourceKey(source);
 if(!key)throw new TypeError('exact current Iai producer source required');
 const {roomId,generation,targetGeneration,lease,clockId,clockKind,clockOwnerId,receivedAtEms}=context??{};
 if(!identity(roomId)||!identity(lease)||!identity(clockId)||!Number.isSafeInteger(generation)||generation<1||!Number.isSafeInteger(targetGeneration)||targetGeneration<1||!finite(receivedAtEms)||!['attacker','wall','preview'].includes(clockKind))throw new TypeError('explicit current room/lease/generations/E clock receipt required');
 if(clockKind==='attacker'&&clockOwnerId!==source.playerId)throw new TypeError('attacker E clock owner mismatch');
 if(clockKind!=='attacker'&&clockOwnerId!=null)throw new TypeError('non-attacker clock has no actor owner');
 return Object.freeze({version:VERSION,sourceRef:source,sourceKey:key,id:source.id,causeId:JSON.stringify([source.id,key,roomId,clockId,receivedAtEms]),roomId,generation,targetGeneration,lease,clockId,clockKind,clockOwnerId:clockOwnerId??null,receivedAtEms});
}
export const CREATIVE_EDITION=2;
export function phase(ageEms,reducedMotion=false){
 if(!finite(ageEms))throw new TypeError('finite explicit E age required');
 const t=ageEms/1000,active=ageEms>=0&&ageEms<DURATION_E_MS;
 // A finite fictional pressure-transfer volume: inward compression precedes
 // release. Fractions are target-radius units, never extra gameplay damage.
 const compression=1-smooth(0,.18,t), release=smooth(.18,.62,t);
 const focus=smooth(.015,.12,t)*(1-smooth(.16,.28,t));
 const tail=1-smooth(.66,.90,t);
 const supply=1-smooth(.42,.78,t);
 const frontGain=smooth(.185,.26,t)*(1-smooth(.58,.85,t));
 const wakeGain=0;
 return {active,ageEms,stage:!active?'off':t<.18?'concentrated-reinforcement':t<.62?'finite-field-release':'residual-decay',
  foldRadius:reducedMotion?.34:.17+.59*compression, foldGain:compression*(1-smooth(.18,.29,t)),
  coreRadius:.12+.035*(1-focus), coreGain:(.3+8.4*focus)*supply*tail,
  frontRadius:reducedMotion?.53:.18+.63*release, frontGain,tail,
  shellWidth:.052,wakeGain,wakeOffset:.0,
  frontSkew:.0, reducedMotion};
}
export function planIai(source,receipt,frame){
 const base={version:VERSION,active:false,reason:'invalid-input',causeId:receipt?.causeId??null,viewport:frame?.viewport};
 if(!sourceKey(source)||!receipt||receipt.version!==VERSION||receipt.sourceRef!==source||receipt.sourceKey!==sourceKey(source))return base;
 const current=frame?.currentSource===source&&frame.roomCurrent===true&&frame.visible===true&&frame.roomId===receipt.roomId&&frame.generation===receipt.generation&&frame.targetGeneration===receipt.targetGeneration&&frame.lease===receipt.lease;
 if(!current)return {...base,reason:'stale-source-room-lease-or-visibility'};
 if(frame.clockId!==receipt.clockId||frame.clockKind!==receipt.clockKind||(frame.clockOwnerId??null)!==receipt.clockOwnerId||frame.clockRoomId!==receipt.roomId||!finite(frame.eNowMs)||!f32(frame.eTimeScale)||Math.fround(frame.eTimeScale)<=0||frame.eTimeScale>4)return {...base,reason:'clock'};
 const ageEms=frame.eNowMs-receipt.receivedAtEms;
 const validated={...base,id:source.id,causeId:receipt.causeId,roomId:receipt.roomId,generation:receipt.generation,targetGeneration:receipt.targetGeneration,lease:receipt.lease,clockId:receipt.clockId,clockKind:receipt.clockKind,clockOwnerId:receipt.clockOwnerId,sourceKey:receipt.sourceKey,ageEms,eTimeScale:frame.eTimeScale,receivedAtEms:receipt.receivedAtEms,sourceOn:frame.sourceEnabled!==false,observerEnabled:frame.observerEnabled!==false,held:frame.held===true};
 if(frame.sourceEnabled===false||frame.mainEnabled===false)return {...validated,reason:'source-or-main-off'};
 if(ageEms<0||ageEms>=900)return {...validated,reason:'outside-lifetime'};
 const v=frame.viewport;
 if(!v||!f32(v.width)||!f32(v.height)||Math.fround(v.width)<=0||Math.fround(v.height)<=0||typeof frame.project!=='function')return {...validated,reason:'projection'};
 let p;try{p=frame.project(source.targetX,source.targetY);}catch{return {...validated,reason:'projection'};}
 if(!p||!['x','y','scale'].every(k=>f32(p[k]))||Math.fround(p.scale)<=0||!f32(source.radius*p.scale)||Math.fround(source.radius*p.scale)<=0)return {...validated,reason:'projection'};
 const gain=frame.observerGain??.11;
 if(!f32(gain)||gain<0||gain>.5)return {...validated,reason:'observer-input'};
 return {...validated,active:true,reason:'active',radius:source.radius,radiusPx:source.radius*p.scale,centerPx:{x:p.x,y:p.y},world:{x:source.targetX,y:source.targetY},variant:source.variant,phase:phase(ageEms,frame.reducedMotion===true),observerGain:gain};
}
export function packUniforms(plan){
 const u=new Float32Array(32),v=plan.viewport??{},p=plan.phase??phase(-1);
 u.set([v.width??1,v.height??1,plan.centerPx?.x??0,plan.centerPx?.y??0],0);
 u.set([plan.radiusPx??1,plan.ageEms??0,plan.active?1:0,plan.observerEnabled?1:0],4);
 u.set([p.foldRadius,p.foldGain,p.coreRadius,p.coreGain],8);
 u.set([p.frontRadius,p.frontGain,p.tail,plan.observerGain??.11],12);
 u.set([.75,.38,.085,p.shellWidth??.052],16);u.set([1.,.78,.35,p.wakeGain??0],20);
 u.set([.92,.88,.68,p.wakeOffset??0],24);u.set([.78,.62,18,p.frontSkew??0],28);
 // Invalid/inactive uniforms must be safe to send to the actual transparent clear.
 for(let i=0;i<u.length;i++)if(!Number.isFinite(u[i]))u[i]=0;
 return u;
}
// CPU model of the chosen world emissive field, not native pixel evidence.
export function sampleField(point,p){
 if(!p.active||!Array.isArray(point)||point.length!==3||!point.every(finite))return {fold:0,core:0,front:0};
 const [x,y,z]=point;
 const ell=Math.sqrt(x*x+(y-p.frontSkew*z)**2/.20+z*z/.56);
 const boundary=1-smooth(.88,.94,Math.hypot(x,y,z));
 let fold=0;for(let k=0;k<3;k++){const r=.17+(p.foldRadius-.17)*(.5+.25*k);fold+=Math.exp(-(((ell-r)/.044)**2))*(1+.15*z)*p.foldGain;}
 const core=Math.exp(-((x/p.coreRadius)**2+(y/(p.coreRadius*.53))**2+(z/(p.coreRadius*.76))**2))*p.coreGain;
 const lead=Math.exp(-(((ell-p.frontRadius)/p.shellWidth)**2))*p.frontGain*.80;
 const wake=Math.exp(-(((ell-p.frontRadius+p.wakeOffset)/(p.shellWidth*.78))**2))*p.wakeGain*.42;
 return {fold:Math.max(0,fold*boundary),core:core*boundary,front:(lead+wake)*boundary};
}
export function makeReinforcementSamples(sampleRate=48000){
 if(!Number.isSafeInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
 const out=new Float32Array(Math.round(sampleRate*.82));let seed=0x1a170061,low=0,body=0,air=0;
 // Synthetic pressure/friction, no unrelated electronic pitch sweep or
 // real-recording claim. All components use the same .18s release epoch.
 const lowA=1-Math.exp(-2*Math.PI*850/sampleRate),bodyA=1-Math.exp(-2*Math.PI*145/sampleRate),airA=1-Math.exp(-2*Math.PI*2400/sampleRate);
 for(let i=0;i<out.length;i++){
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const noise=(seed>>>0)/2147483648-1,t=i/sampleRate;
  low+=lowA*(noise-low);body+=bodyA*(low-body);air+=airA*(noise-air);
  const concentration=smooth(0,.008,t)*Math.exp(-t/.095)*(1-smooth(.17,.23,t));
  const since=Math.max(0,t-.18),release=smooth(.18,.194,t)*Math.exp(-since/.10)*(1-smooth(.66,.78,t));
  const wake=0;
  const signal=(low-body)*1.6*concentration+(air-low)*1.1*release+body*1.2*release+(low-body)*.50*wake;
  out[i]=signal*smooth(0,.004,t)*(1-smooth(.78,.82,t));
 }return out;
}
export function createIaiAudio({contextFactory,verify=false,muted=false}={}){
 let ctx=null,unlocked=false,disposed=false,unlockSerial=0,mutedState=!!muted;
 const played=new Map(),voices=new Map();
 const stop=()=>{for(const v of voices.values()){try{v.voice.stop();}catch{}try{v.voice.disconnect();}catch{}try{v.gain.disconnect();}catch{}}voices.clear();};
 return {
  async unlock(){if(verify||disposed)return false;const serial=++unlockSerial;try{ctx??=contextFactory?.()??new globalThis.AudioContext();await ctx.resume();if(disposed||serial!==unlockSerial||mutedState)return false;unlocked=ctx.state==='running';return unlocked;}catch{unlocked=false;return false;}},
  completed(plan,proof){
   const exact=proof?.submitted===true&&proof.completed===true&&proof.current===true&&proof.active===true&&proof.scopeErrors===null&&proof.passes===2&&identity(proof.ticketId)&&proof.causeId===plan.causeId&&proof.roomId===plan.roomId&&proof.generation===plan.generation&&proof.targetGeneration===plan.targetGeneration&&proof.lease===plan.lease&&proof.clockId===plan.clockId&&proof.width===plan.viewport?.width&&proof.height===plan.viewport?.height;
   if(disposed||verify||mutedState||!unlocked||ctx?.state!=='running'||!plan.active||plan.held||!exact||!finite(proof.ageEms)||proof.ageEms<plan.ageEms||proof.ageEms<0||proof.ageEms>160||played.has(plan.causeId))return false;
   for(const [id,p] of played)if(p.roomId!==plan.roomId||p.generation!==plan.generation||p.clockId!==plan.clockId||proof.ageEms+plan.receivedAtEms>=p.receivedAtEms+900)played.delete(id);
   if(played.size>=128||voices.size>=8)return false;
   const wave=makeReinforcementSamples(ctx.sampleRate),buffer=ctx.createBuffer(1,wave.length,ctx.sampleRate);buffer.getChannelData(0).set(wave);
   const voice=ctx.createBufferSource(),gain=ctx.createGain();voice.buffer=buffer;voice.playbackRate.value=plan.eTimeScale;gain.gain.value=.52;voice.connect(gain);gain.connect(ctx.destination);
   voice.onended=()=>{voices.delete(plan.causeId);try{voice.disconnect();}catch{}try{gain.disconnect();}catch{}};
   voices.set(plan.causeId,{voice,gain});try{if(ctx.state!=='running')throw Error('audio stopped');voice.start(0,proof.ageEms/1000);}catch{voices.delete(plan.causeId);try{voice.disconnect();}catch{}try{gain.disconnect();}catch{}return false;}
   played.set(plan.causeId,{receivedAtEms:plan.receivedAtEms,roomId:plan.roomId,generation:plan.generation,clockId:plan.clockId});return true;
  },
  reconcile(plans){const allowed=new Map(plans.filter(p=>p.active&&!p.held).map(p=>[p.causeId,p]));for(const [id,v] of voices){const p=allowed.get(id);if(!p){try{v.voice.stop();}catch{}try{v.voice.disconnect();}catch{}try{v.gain.disconnect();}catch{}voices.delete(id);}else v.voice.playbackRate.value=p.eTimeScale;}},
  setMuted(value){const next=!!value;if(next&&!mutedState){++unlockSerial;stop();}mutedState=next;},stop,
  async dispose(){if(disposed)return;disposed=true;++unlockSerial;unlocked=false;stop();await ctx?.close();},
  get diagnostics(){return {verify,muted:mutedState,unlocked,disposed,contextCreated:!!ctx,contextState:ctx?.state??null,playedCount:played.size,voiceCount:voices.size};}
 };
}
