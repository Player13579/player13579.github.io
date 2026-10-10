export const VERSION='item-use-e-zero-sol61-r3',UNIFORM_BYTES=96,LIFETIME_MS=780;
export const ENTRIES=Object.freeze({vertex:'vertexItemUse',world:'worldItemUse',spreadX:'spreadItemUseX',spreadY:'spreadItemUseY',composite:'compositeItemUse',vertices:3});
const number=(v,n)=>{if(!Number.isFinite(v))throw TypeError(`${n}: finite number required`);return v;};
const positive=(v,n)=>{number(v,n);if(v<=0)throw RangeError(`${n}: positive required`);return v;};
export function planItemUse(input){
 if(!input||typeof input.causeId!=='string'||!input.causeId||typeof input.itemId!=='string'||!input.itemId)throw TypeError('causeId/itemId required');
 if(!['authority-wall','fixture'].includes(input.clockKind))throw TypeError('calibrated authority-wall or explicit fixture clock required');
 const ageMs=number(input.ageMs,'ageMs'),h=positive(input.heightPx,'heightPx');
 if(!Array.isArray(input.viewport)||input.viewport.length!==2||!Array.isArray(input.anchor)||input.anchor.length!==2)throw TypeError('viewport and projected actor anchor required');
 input.viewport.forEach((v,i)=>positive(v,`viewport${i}`));input.anchor.forEach((v,i)=>number(v,`anchor${i}`));
 const visibility=number(input.visibility??1,'visibility');if(visibility<0||visibility>1)throw RangeError('visibility [0,1]');
 const intensity=number(input.intensity??1,'intensity');if(intensity<0)throw RangeError('intensity >=0');
 const sourceOn=input.sourceOn!==false&&ageMs>=0&&ageMs<LIFETIME_MS&&input.cancelled!==true;
 const mainOn=input.mainOn!==false,obsOn=input.obsOn!==false;
 const sigmaX=Math.max(.7,Math.min(4.2,h*.055)),sigmaY=Math.max(.65,Math.min(3.8,h*.045));
 return Object.freeze({version:VERSION,causeId:input.causeId,itemId:input.itemId,clockKind:input.clockKind,ageMs,heightPx:h,anchor:Object.freeze([...input.anchor]),viewport:Object.freeze([...input.viewport]),visibility,intensity,sourceOn,mainOn,obsOn,active:sourceOn&&mainOn&&visibility>0,reducedMotion:input.reducedMotion===true,angleRad:number(input.angleRad??-.30,'angleRad'),sigmaX,sigmaY,radius:Math.min(12,Math.ceil(Math.max(sigmaX,sigmaY)*2.6)),sourceOwner:VERSION,obsSourceId:input.causeId});
}
export function packItemUse(p){
 if(p?.version!==VERSION||p.sourceOwner!==VERSION||p.obsSourceId!==p.causeId)throw TypeError('same-source plan required');
 const a=new Float32Array(24);a.set([...p.viewport,...p.anchor]);a.set([p.heightPx,p.ageMs,p.sourceOn?1:0,p.visibility],4);a.set([p.obsOn?1:0,p.mainOn?1:0,p.reducedMotion?1:0,p.angleRad],8);a.set([p.intensity,p.sigmaX,p.sigmaY,p.radius],12);
 if(!a.every(Number.isFinite))throw RangeError('f32 overflow');return a;
}
// Callerのserver-clock校正結果を受ける。epoch atとperformance.nowは直接混ぜない。
export function createItemUseState({maxActive=32,maxSeen=512}={}){
 if(!Number.isInteger(maxActive)||maxActive<1||maxActive>256||!Number.isInteger(maxSeen)||maxSeen<maxActive||maxSeen>4096)throw RangeError('bounded capacity required');
 const active=new Map(),seen=new Set();let clockId=null,last=-Infinity,disposed=false;
 function clock(c){if(!c||typeof c.clockId!=='string'||!c.clockId)throw TypeError('calibrated clockId required');number(c.serverNowMs,'serverNowMs');if(clockId&&clockId!==c.clockId)throw Error('clock owner changed: clear then reinitialize');if(c.serverNowMs<last)throw RangeError('authority clock went backwards');clockId=c.clockId;last=c.serverNowMs;}
 function sweep(now){for(const [id,r] of active)if(now-r.at>=LIFETIME_MS)active.delete(id);}
 return Object.freeze({
  admit(r,c){if(disposed)throw Error('disposed');clock(c);sweep(c.serverNowMs);
   if(r?.type!=='action-item-use'||typeof r.id!=='string'||!r.id||typeof r.playerId!=='string'||!r.playerId||typeof r.variant!=='string'||!r.variant)throw TypeError('valid successful source receipt required');
   number(r.at,'source.at');number(r.x,'source.x');number(r.y,'source.y');if(r.at>c.serverNowMs)throw RangeError('future source time');
   if(seen.has(r.id))return {admitted:false,reason:'duplicate'};
   if(c.serverNowMs-r.at>=LIFETIME_MS)return {admitted:false,reason:'expired'};
   if(active.size>=maxActive)return {admitted:false,reason:'capacity'};
   const source=Object.freeze({causeId:r.id,itemId:r.variant,playerId:r.playerId,x:r.x,y:r.y,at:r.at,clockId:c.clockId});
   active.set(r.id,source);seen.add(r.id);if(seen.size>maxSeen)seen.delete(seen.values().next().value);return {admitted:true,source};
  },
  sample(c,geometry){if(disposed)return [];clock(c);sweep(c.serverNowMs);const plans=[];for(const r of active.values()){const g=geometry(r);if(g)plans.push(planItemUse({...g,causeId:r.causeId,itemId:r.itemId,clockKind:'authority-wall',ageMs:c.serverNowMs-r.at}));}return plans;},
  cancelActor(playerId){for(const [id,r] of active)if(r.playerId===playerId)active.delete(id);},
  clear(){active.clear();},dispose(){disposed=true;active.clear();seen.clear();},snapshot(){return {disposed,clockId,last,active:[...active.values()],seen:seen.size};}
 });
}
