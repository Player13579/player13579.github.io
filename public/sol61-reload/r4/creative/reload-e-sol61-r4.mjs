export const RELOAD_VERSION='reload-e-zero-sol61-r4';
export const UNIFORM_BYTES=128;
export const START_TRANSIENT_MS=480;
export const COMPLETE_TRANSIENT_MS=620;
export const WEAPONS=Object.freeze(['handgun','smg','assault','sniper','taser']);
export const SHADER_ENTRIES=Object.freeze({vertex:'vsFullscreen',world:'fsWorld',blurX:'fsBlurX',blurY:'fsBlurY',composite:'fsComposite',vertices:3});
const finite=(v,name)=>{ if(!Number.isFinite(v))throw new TypeError(`${name}: finite number required`); return v; };
const unit=(v,name)=>{ finite(v,name); if(v<0||v>1)throw new RangeError(`${name}: [0,1] required`); return v; };
const positive=(v,name)=>{ finite(v,name); if(v<=0)throw new RangeError(`${name}: positive required`); return v; };
export const GEOMETRY_CONTRACT=Object.freeze({receiverWidthH:.76,receiverTopH:.46,mouthYH:0,supplyWidthH:.40,supplyHeightH:.60,supplyStartCenterYH:-.78,supplyStagedCenterYH:-.25,supplySeatedCenterYH:.025,seatEndMs:240,latchStartMs:260,latchEndMs:380,completeFadeStartMs:420,completeEndMs:620,physicalAmmoCount:null});
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function sampleReloadMechanism(plan){
  if(plan?.version!==RELOAD_VERSION)throw new TypeError('R4 plan required');
  const complete=plan.phase==='complete',age=Math.max(0,plan.ageMs),approach=complete?1:smooth(age/480),seat=complete?smooth(age/240):0;
  const latch=complete?smooth((age-260)/120):0;
  const startY=plan.reducedMotion?-.40:-.78,centerY=complete?-.25+.275*seat:startY+(-.25-startY)*approach;
  return Object.freeze({active:plan.active,approach,seat,latch,supplyCenterYH:centerY,supplyTopYH:centerY+.30,supplyBottomYH:centerY-.30,contactFraction:smooth(Math.max(0,centerY+.30)/.05),
    receiverWidthPx:.76*plan.heightPx,supplyWidthPx:.40*plan.heightPx,supplyHeightPx:.60*plan.heightPx,stage:!plan.active?'inactive':complete?(age<240?'seating':age<260?'seated':age<380?'latching':age<420?'locked':'clear-decay'):age<160?'opening':age<480?'aligning':'pending-open',physicalAmmoCount:null});
}
export function planReloadFrame(input){
  if(!input||typeof input.causeId!=='string'||!input.causeId)throw new TypeError('causeId required');
  if(!['game','fixture'].includes(input.clockKind))throw new TypeError('explicit game or fixture clock required');
  if(!['start','complete'].includes(input.phase))throw new TypeError('phase must be start or complete');
  if(!WEAPONS.includes(input.weaponId))throw new TypeError('registered weapon required');
  const ageMs=finite(input.ageMs,'ageMs');
  const pending=input.pending===true;
  const active=ageMs>=0&&(input.phase==='complete'?ageMs<COMPLETE_TRANSIENT_MS:(pending||ageMs<START_TRANSIENT_MS));
  const sourceOn=input.sourceOn!==false&&active&&input.cancelled!==true;
  const heightPx=positive(input.heightPx,'heightPx');
  const viewport=input.viewport;
  if(!Array.isArray(viewport)||viewport.length!==2)throw new TypeError('viewport [w,h] required');
  viewport.forEach((v,i)=>positive(v,`viewport${i}`));
  const anchor=input.anchor;
  if(!Array.isArray(anchor)||anchor.length!==2)throw new TypeError('authority-projected anchor [x,y] required');
  anchor.forEach((v,i)=>finite(v,`anchor${i}`));
  const visibility=unit(input.visibility??1,'visibility');
  const strength=finite(input.strength??1,'strength'); if(strength<0)throw new RangeError('strength >=0 required');
  const angleRad=finite(input.angleRad??0.18,'angleRad');
  const obsOn=input.obsOn!==false;
  const mainOn=input.mainOn!==false;
  const sigmaPx=Math.max(0.65,Math.min(3.6,heightPx*0.043));
  const radiusPx=Math.min(10,Math.ceil(sigmaPx*2.6));
  const rawMaterial=input.material??{};
  const roughness=rawMaterial.roughness??.28,keyIntensity=rawMaterial.keyIntensity??1.4,environmentIntensity=rawMaterial.environmentIntensity??.8;
  const keyDirection=rawMaterial.keyDirection??[-.45,-.35,.82],reflectionOn=rawMaterial.reflectionOn??true;
  if(!Number.isFinite(roughness)||roughness<.18||roughness>.8||![keyIntensity,environmentIntensity].every(x=>Number.isFinite(x)&&x>=0&&x<=4)||!Array.isArray(keyDirection)||keyDirection.length!==3||!keyDirection.every(Number.isFinite)||Math.hypot(...keyDirection)<1e-8||typeof reflectionOn!=='boolean')throw new TypeError('bounded actual material/light required');
  const material=Object.freeze({roughness,keyIntensity,environmentIntensity,keyDirection:Object.freeze(keyDirection.map(x=>x/Math.hypot(...keyDirection))),reflectionOn,model:'2.5D bevel metallic proxy GGX/Smith/Schlick, neutral authored studio'});
  return Object.freeze({material,version:RELOAD_VERSION,causeId:input.causeId,clockKind:input.clockKind,phase:input.phase,weaponId:input.weaponId,ageMs,pending,active:sourceOn&&mainOn&&visibility>0,viewport:Object.freeze([...viewport]),anchor:Object.freeze([...anchor]),heightPx,sourceOn,obsOn,mainOn,visibility,strength,angleRad,reducedMotion:input.reducedMotion===true,sigmaPx,radiusPx,sourceOwner:RELOAD_VERSION,obsSourceId:input.causeId,coordinatePolicy:'authority-projected digital reload field; no actual hand or physical ammo claim',validity:'2.5D oblique orthographic field; world surface occlusion supplied by same-source visibility'});
}
export function packReloadUniform(plan){
  if(plan?.version!==RELOAD_VERSION||plan.sourceOwner!==RELOAD_VERSION||plan.obsSourceId!==plan.causeId)throw new TypeError('same-source plan required');
  const out=new Float32Array(UNIFORM_BYTES/4);
  out.set([...plan.viewport,...plan.anchor],0);
  out.set([plan.heightPx,Math.max(0,plan.ageMs),plan.phase==='complete'?1:0,plan.pending?1:0],4);
  out.set([plan.sourceOn?1:0,plan.obsOn?1:0,plan.mainOn?1:0,plan.visibility],8);
  out.set([plan.strength,plan.angleRad,plan.reducedMotion?1:0,plan.material.reflectionOn?1:0],12);
  out.set([plan.sigmaPx,plan.radiusPx,0,0],16);
  out.set([...plan.material.keyDirection,plan.material.roughness],20);
  out.set([plan.material.keyIntensity,plan.material.environmentIntensity,0,0],24);
  if(!out.every(Number.isFinite))throw new RangeError('f32 overflow');
  return out;
}
export function createReloadReceiptState({maxActive=32}={}){
  if(!Number.isInteger(maxActive)||maxActive<1||maxActive>256)throw new RangeError('maxActive [1,256] required');
  const seen=new Map(),runs=new Map(); let lastNow=-Infinity,disposed=false;
  const clock=(now)=>{ finite(now,'gameNowMs'); if(now<lastNow)throw new RangeError('game clock must be monotonic'); lastNow=now; };
  return Object.freeze({
    admit(receipt,gameNowMs){
      if(disposed)throw new Error('disposed'); clock(gameNowMs);
      if(receipt?.type!=='action-reload'||typeof receipt.id!=='string'||!receipt.id||typeof receipt.playerId!=='string'||!receipt.playerId)throw new TypeError('reload receipt id/playerId required');
      const [weaponId,phase,...rest]=String(receipt.variant).split(':');
      if(rest.length||!WEAPONS.includes(weaponId)||!['start','complete'].includes(phase))throw new TypeError('reload variant invalid');
      if(seen.has(receipt.id))return {admitted:false,reason:'duplicate'};
      finite(receipt.x,'receipt.x');finite(receipt.y,'receipt.y');
      const key=`${receipt.playerId}:${weaponId}`;
      if(!runs.has(key)&&runs.size>=maxActive)return {admitted:false,reason:'capacity'};
      seen.set(receipt.id,gameNowMs); while(seen.size>256)seen.delete(seen.keys().next().value);
      const run={causeId:receipt.id,playerId:receipt.playerId,weaponId,phase,startedAtMs:gameNowMs,pending:false,cancelled:false,x:receipt.x,y:receipt.y};
      // completeは同じ武器のstartを退役させる。取引IDが無いため同一causeと捏造しない。
      runs.set(key,run);return {admitted:true,run:{...run},sfxPhase:phase};
    },
    syncPending(snapshot,gameNowMs){
      if(disposed)throw new Error('disposed');clock(gameNowMs);
      if(!snapshot||typeof snapshot.playerId!=='string'||typeof snapshot.pending!=='boolean')throw new TypeError('authoritative pending snapshot required');
      if(snapshot.pending&&!WEAPONS.includes(snapshot.weaponId))throw new TypeError('pending registered weapon required');
      for(const run of runs.values()){
        if(run.playerId!==snapshot.playerId||run.phase!=='start')continue;
        if(snapshot.pending&&snapshot.weaponId===run.weaponId)run.pending=true;
        else {run.pending=false;run.cancelled=true;}
      }
    },
    sample(gameNowMs,geometry){
      if(disposed)return [];clock(gameNowMs);const plans=[];
      for(const [key,run] of runs){
        const ageMs=gameNowMs-run.startedAtMs;
        if(run.cancelled||(!run.pending&&ageMs>=(run.phase==='start'?START_TRANSIENT_MS:COMPLETE_TRANSIENT_MS))){runs.delete(key);continue;}
        const g=geometry(run);if(!g)continue;
        plans.push(planReloadFrame({...g,causeId:run.causeId,clockKind:'game',weaponId:run.weaponId,phase:run.phase,ageMs,pending:run.pending}));
      }
      return plans;
    },
    clear(){runs.clear();},
    dispose(){disposed=true;runs.clear();seen.clear();},
    snapshot(){return {disposed,runs:[...runs.values()].map(r=>({...r})),seenCount:seen.size,lastNow};}
  });
}
