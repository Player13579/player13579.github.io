export const VARIANTS=Object.freeze(['mineral-water','seawater','antidote','molotov','frag-grenade','stun-grenade','vending-evade','vending-speed','warp','vending-mystery','fire','protect','heal','vending-mana','stamina','vending-railgun','vending-particle-cannon','vending-excalibur','vending-exile','vending-hack','vending-handgun','vending-smg','vending-assault','vending-sniper','vending-taser','mercury','lead','uranium','plutonium','orichalcum-sword','iai','vending-ice','vending-heated-water','gold','vending-rpg','vending-missile','hack-credits-delete','hack-credits-duplicate','hack-items-delete','hack-items-duplicate','hack-hp-delete','hack-hp-duplicate','hack-mana-delete','hack-mana-duplicate','hack-status-recover','revive']);
export const ABI=Object.freeze({bytes:128,vec4:['viewport','sourceAge','gates','observer','phase','bounds','owner','reserved'],worldFormats:['rgba16float','rgba16float','rgba16float'],lifetimeEms:1200,visualEndEms:1180});
export const STAR_ANGLE=37*Math.PI/180;
const allowed=new Set(VARIANTS);
const finite=Number.isFinite;
export function snapshotReceipt(e,roomId){
  if(!e||typeof roomId!=='string'||!roomId||typeof e.id!=='string'||!e.id.startsWith('magic_')||e.id.length<=6||e.type!=='action-vibe-coding'||!allowed.has(e.variant)||typeof e.playerId!=='string'||!e.playerId||!Number.isSafeInteger(e.x)||!Number.isSafeInteger(e.y)||e.radius!==145||!finite(e.at)||e.at<0||e.durationMs!==0||e.targetX!==null||e.targetY!==null||e.targetId!==''||e.objectId!==''||e.viewerId!==''||e.mode!==''||e.effectKind!==''||e.completionKind!==''||e.markerCount!==1)return Object.freeze({status:'unsupported',reason:'exact producer receipt required'});
  return Object.freeze({status:'supported',roomId,id:e.id,type:e.type,playerId:e.playerId,variant:e.variant,originalX:e.x,originalY:e.y,originalAt:e.at,radius:145,lifetimeEms:1200,key:JSON.stringify([roomId,e.id])});
}
export function prepare(receipt,frame){
  if(receipt?.status!=='supported'||!frame||frame.roomId!==receipt.roomId||frame.ownerId!==receipt.playerId||frame.phase!=='playing'||frame.actorPresent!==true||frame.actorVisible!==true||frame.coverageStatus!=='actual-alpha'||!finite(frame.ageEms)||frame.ageEms<0||frame.ageEms>=1200||!finite(frame.rate)||frame.rate<0||!finite(frame.H)||frame.H<=0||!Array.isArray(frame.sourcePx)||frame.sourcePx.length!==2||!frame.sourcePx.every(finite)||frame.projectedOriginalX!==receipt.originalX||frame.projectedOriginalY!==receipt.originalY||frame.actualSourceCoverage<=0||frame.actualSourceCoverage>1||!finite(frame.actualSourceCoverage)||!Array.isArray(frame.viewport)||frame.viewport.length!==2||!frame.viewport.every(v=>finite(v)&&v>0))return Object.freeze({status:'unsupported',...(receipt?.status==='supported'?{receipt}:{}),reason:'actual source/owner/clock/coverage incomplete'});
  const [x,y]=frame.sourcePx,H=frame.H,[w,h]=frame.viewport;
  const rect=[Math.max(0,Math.floor(x-.9*H)),Math.max(0,Math.floor(y-1.4*H)),Math.min(w,Math.ceil(x+1.3*H)),Math.min(h,Math.ceil(y+.4*H))];
  if(rect[2]<=rect[0]||rect[3]<=rect[1])return Object.freeze({status:'offscreen',key:receipt.key});
  return Object.freeze({status:'prepared',receipt,ageEms:frame.ageEms,rate:frame.rate,H,sourcePx:Object.freeze([...frame.sourcePx]),viewport:Object.freeze([...frame.viewport]),sourceVisibility:frame.actualSourceCoverage,scissor:Object.freeze([rect[0],rect[1],rect[2]-rect[0],rect[3]-rect[1]]),live:frame.ageEms<1180,sourceCurrent:true});
}
export function phaseState(ms){
  const t=ms/1000,clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  const assembled=[0,.16,.32].map(a=>smooth((t-a)/.16));
  const dissolve=[0,.045,.09].map(a=>1-smooth((t-.9-a)/(.28-a)));
  const live=ms>=0&&ms<1180;
  return {live,assembled:assembled.map((x,i)=>live?x*dissolve[i]:0),execution:[0,.14,.28].map(a=>live?smooth((t-.48-a)/.035)*(1-smooth((t-.62-a)/.12)):0),starAngle:STAR_ANGLE};
}
export function uniformFloats(p,{layer=1,main=true,sparkle=true,receiver=true,near=true,flare=true,observerCentre=[0,0],source=true}={}){
  if(p.status!=='prepared')throw Error('strict unsupported frame');
  if(![-1,1].includes(layer)||!observerCentre.every(finite))throw Error('invalid layer/observer');
  const [w,h]=p.viewport,[x,y]=p.sourcePx;
  return new Float32Array([w,h,p.H,1,x,y,p.ageEms/1000,p.live?1:0,source?p.sourceVisibility:0,main?1:0,sparkle?1:0,receiver?1:0,near?1:0,flare?1:0,...observerCentre,p.rate,1.2,layer,0,-.9,-1.4,1.3,.4,0,0,0,0,0,0,0,0]);
}
