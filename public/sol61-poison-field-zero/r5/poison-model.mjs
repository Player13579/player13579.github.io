export const VERSION = 'poison-field-quality-sol61-r5';
const finite = n => typeof n === 'number' && Number.isFinite(n);
const identity = x => (typeof x === 'string' && x.length > 0) || (finite(x) && x !== 0);
const clamp = (x,a,b)=>Math.min(b,Math.max(a,x));
const smooth = (a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

export function planPoisonField(field, frame) {
  const base={version:VERSION,active:false,reason:'invalid-input',generation:frame?.generation,targetGeneration:frame?.targetGeneration,
    viewport:frame?.viewport,causeId:null,observerEnabled:false};
  if (!field || !frame || field.kind !== 'poison' || !identity(field.id) || !identity(field.sourceId)) return base;
  if (!['x','y','radius','strength','createdAt','endsAt'].every(k=>finite(field[k])) || field.radius<=0 || field.strength<=0 || field.endsAt<=field.createdAt) return base;
  if (!finite(frame.nowMs) || !Number.isInteger(frame.generation) || frame.expectedGeneration!==frame.generation || frame.targetGeneration!==frame.generation) return {...base,reason:'generation'};
  if (!frame.viewport || !finite(frame.viewport.width) || !finite(frame.viewport.height) || frame.viewport.width<=0 || frame.viewport.height<=0) return {...base,reason:'viewport'};
  const causeId=JSON.stringify([field.id,field.sourceId,field.createdAt]);
  const validated={...base,causeId,fieldId:field.id,sourceId:field.sourceId,createdAt:field.createdAt,endsAt:field.endsAt,
    ageMs:frame.nowMs-field.createdAt,radius:field.radius,strength:field.strength,world:{x:field.x,y:field.y}};
  if(frame.roomCurrent!==true || frame.visible!==true) return {...validated,reason:'visibility-or-room'};
  if(frame.sourceEnabled===false || frame.mainEnabled===false) return {...validated,reason:'source-or-main-off'};
  if(frame.nowMs<field.createdAt || frame.nowMs>=field.endsAt) return {...validated,reason:'outside-lifetime'};
  if(typeof frame.project!=='function') return {...validated,reason:'projection'};
  const p=frame.project(field.x,field.y);
  if(!p || !finite(p.x) || !finite(p.y) || !finite(p.scale) || p.scale<=0) return {...validated,reason:'projection'};
  const radiusPx=field.radius*p.scale;
  if(!finite(radiusPx) || radiusPx<=0) return {...validated,reason:'projection'};
  // 世界寿命はserver ms。描画の内部剪断だけをreduced motionで固定する。
  const t=validated.ageMs/1000;
  if(![frame.viewport.width,frame.viewport.height,p.x,p.y,radiusPx,t,field.strength,.65+.35*field.strength,.4+.6*field.strength].every(n=>Number.isFinite(Math.fround(n)))) return {...validated,reason:'float32-range'};
  const light=frame.lightDirection??[-.35,.82,-.45];
  if(!Array.isArray(light)||light.length!==3||!light.every(n=>finite(n)&&Number.isFinite(Math.fround(n)))||Math.hypot(...light)===0 || !finite(frame.observerGain??.13) || (frame.observerGain??.13)<0 || !Number.isFinite(Math.fround(frame.observerGain??.13))) return {...validated,reason:'optics-input'};
  return {...validated,active:true,reason:'active',centerPx:{x:p.x,y:p.y},radiusPx,
    timeSeconds:t,motionSeconds:frame.reducedMotion?0:t,build:smooth(0,.42,t),
    densityGain:.65+.35*field.strength,emissionGain:.4+.6*field.strength,
    observerEnabled:frame.observerEnabled!==false,held:frame.held===true,
    // 偏向角を変えた検査でもreflection/散乱の条件へ実伝達。
    lightDirection:light.map(n=>n/Math.hypot(...light)),observerGain:frame.observerGain??.13,
    memberIds:Array.isArray(field.memberIds)?[...field.memberIds]:null};
}

export function packUniforms(plan) {
  const u=new Float32Array(32),v=plan.viewport??{width:1,height:1};
  const light=plan.lightDirection??[-.35,.82,-.45];
  u.set([v.width,v.height,plan.centerPx?.x??0,plan.centerPx?.y??0],0);
  u.set([plan.radiusPx??1,plan.timeSeconds??0,plan.motionSeconds??0,plan.active?1:0],4);
  u.set([plan.strength??0,plan.build??0,plan.densityGain??0,plan.emissionGain??0],8);
  u.set([plan.observerEnabled?1:0,plan.observerGain??.13,.56,.9],12);
  u.set([...light,0],16);
  // 稀薄olive、密な青緑、源lime。線形RGB、役割は密度/供給へ結ぶ。
  u.set([.15,.30,.075,0],20);u.set([.035,.18,.13,0],24);u.set([.32,1,.075,0],28);
  // 拒否済みplanのinactive clearにもNaN/Infを転送しない。
  for(let i=0;i<u.length;i++)if(!Number.isFinite(u[i]))u[i]=0;
  return u;
}

// 合成: 実録ではない。鈍い粒状接触＋圧力抜け、電子発振なし。
export function makeImpactSamples(sampleRate=48000,strength=1) {
  if(!finite(sampleRate)||sampleRate<8000||sampleRate>192000) throw new RangeError('sampleRate');
  if(!finite(strength)||strength<=0) throw new RangeError('strength');
  const samples=new Float32Array(Math.round(sampleRate*.62));
  let seed=0x71a98f31,lp=0,slower=0;
  const events=[0,.019,.047,.083,.142];
  for(let i=0;i<samples.length;i++) {
    seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const noise=(seed>>>0)/2147483648-1,t=i/sampleRate;
    lp+=.055*(noise-lp);slower+=.012*(noise-slower);
    let contacts=0;
    for(let k=0;k<events.length;k++) {const a=t-events[k];if(a>=0) contacts+=(lp-slower)*Math.exp(-a/(.031+k*.006))*(1-k*.13)*smooth(0,.0015,a);}
    const release=(noise-lp)*smooth(.022,.060,t)*Math.exp(-t/.13)*.08;
    const end=1-smooth(.50,.62,t),attack=smooth(0,.003,t);
    samples[i]=(contacts*.72+release)*attack*end*(1+.4*Math.tanh(Math.log(strength)));
  }
  return samples;
}

export function createPoisonAudio({contextFactory,verify=false,muted=false}={}) {
  let context=null,unlocked=false,disposed=false,unlockToken=0,mutedState=muted;
  const played=new Map(),voices=new Map();
  function stopAll(){for(const voice of voices.values()){try{voice.stop();}catch{}try{voice.disconnect();}catch{}}voices.clear();}
  return {
    async unlock(){if(disposed||verify)return false;const token=++unlockToken;
      try{context??=contextFactory?.()??new globalThis.AudioContext();await context.resume();
        if(disposed||token!==unlockToken){return false;}unlocked=context.state==='running';return unlocked;
      }catch{unlocked=false;return false;}},
    setMuted(value){mutedState=!!value;if(mutedState)stopAll();},
    completed(plan,receipt){
      const same=receipt?.submitted===true&&receipt?.completed===true&&receipt?.active===true&&receipt.current===true&&receipt.scopeErrors===null&&receipt.passes===2&&receipt.causeId===plan.causeId&&receipt.generation===plan.generation&&receipt.targetGeneration===plan.targetGeneration&&receipt.width===plan.viewport.width&&receipt.height===plan.viewport.height;
      if(disposed||verify||mutedState||!unlocked||!context||!same||!plan.active||plan.held||!finite(receipt.ageMs)||receipt.ageMs<0||receipt.ageMs>180||played.has(plan.causeId))return false;
      const now=plan.createdAt+receipt.ageMs;
      for(const [id,createdAt] of played)if(now>createdAt+180)played.delete(id);
      // 同時音と短時間の重複receiptを有限に保つ。容量超過は新音を拒否。
      if(played.size>=128||voices.size>=8)return false;
      played.set(plan.causeId,plan.createdAt);
      const wave=makeImpactSamples(context.sampleRate,plan.strength),buffer=context.createBuffer(1,wave.length,context.sampleRate);
      buffer.getChannelData(0).set(wave);const voice=context.createBufferSource(),gain=context.createGain();
      voice.buffer=buffer;gain.gain.value=.34;voice.connect(gain);gain.connect(context.destination);
      voice.onended=()=>{voices.delete(plan.causeId);voice.disconnect();gain.disconnect();};
      voices.set(plan.causeId,voice);voice.start();return true;
    },
    reconcile(plans){const active=new Set(plans.filter(p=>p.active).map(p=>p.causeId));for(const [id,v] of voices)if(!active.has(id)){try{v.stop();}catch{}voices.delete(id);}},
    stop(){stopAll();},
    async dispose(){disposed=true;++unlockToken;stopAll();unlocked=false;await context?.close();},
    get diagnostics(){return {verify,muted:mutedState,unlocked,disposed,playedCount:played.size,voiceCount:voices.size};}
  };
}
