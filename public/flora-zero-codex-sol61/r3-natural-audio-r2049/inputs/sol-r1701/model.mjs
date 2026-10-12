// GPT-6.1-Sol: new Flora zero-loop creative R3; R2 material/time equations preserved.
export const VERSION='flora-invisible-codex-sol61-zero-r3';
export const AUTHOR='GPT-6.1-Sol';
export const LIFE_MS=1600;
export const ALPHA_SUPPORT=Object.freeze({top:16/256,height:224/256,left:57/256,width:141/256});
export const DESIGN=Object.freeze({frontWidthCssAtH64:1.15,nearWidthCssAtH64:7.5,coatingFadeStartMs:1120,coatingFadeEndMs:1560,creaseEndMs:1460,sourcePeak:3.6,nearGain:.72,sensorGain:.16,normalGhostOpacity:.28});
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export const ABI=Object.freeze({uniformBytes:160,worldFormat:'rgba16float',lightFormat:'rgba16float',presentation:['bgra8unorm','rgba8unorm'],passes:['WORLD','GAUSSIAN_X','OBSERVER_Y'],blend:'opaque world then opaque sensor output',buffers:40,reservedSlots:Object.freeze({35:'physical pixels per registered CSS pixel',37:'E-only coating envelope',38:'registered alpha support top in crop',39:'registered alpha support height in crop'})});
export function stateAt(ageMs){
 if(!Number.isFinite(ageMs))throw Error('FINITE_E_AGE_REQUIRED');
 const t=ageMs/1000,active=t>=0&&t<1.6,activation=smooth((t-.035)/.075),front=smooth((t-.08)/.88);
 const flux=active?activation*(1-smooth((t-.60)/.62)):0;
 const fold=active&&t>.06&&t<1.46?Math.sin(Math.PI*smooth((t-.06)/1.4)):0;
 const coating=active?1-smooth((t-1.120)/.440):0;
 return {ageMs,t,active,front:active?front:1,flux,fold,coating,transitionOpacity:active?1-.72*smooth((t-.04)/.9):.28,phase:!active?'idle':t<.12?'engage':t<.96?'cloak-front':t<1.12?'close':'settle'};
}
export function admit(event,{selfId,generation,nowMs}={}){if(event?.type!=='flora-invisible'||!event.id||!event.playerId||String(event.playerId)!==String(selfId)||String(event.viewerId)!==String(selfId)||!Number.isFinite(event.at)||event.durationMs!==LIFE_MS||!Number.isInteger(generation)||generation<1||!Number.isFinite(nowMs)||nowMs<event.at||nowMs-event.at>=LIFE_MS)return null;return Object.freeze({sourceId:String(event.playerId),causeId:String(event.id),generation,startedAtMs:event.at,durationMs:LIFE_MS,selfId:String(selfId),version:VERSION});}
export function uniformFor({width,height,elapsedMs,caster,crop=[0,0,.25,1],sourceOn=true,observerOn=true,nearOn=true,concealedContext=false,background='dark',light=[-.45,-.62,.64],exposure=1}){
 if(![width,height,elapsedMs].every(Number.isFinite)||width<=0||height<=0||!caster||![caster.x,caster.y,caster.width,caster.height].every(Number.isFinite)||caster.width<=0||caster.height<=0)throw Error('REGISTERED_CASTER_AND_VIEW_REQUIRED');
 const physicalSupport=caster.height*ALPHA_SUPPORT.height,cssSupport=caster.supportHeight??physicalSupport,projectionScale=physicalSupport/cssSupport;
 if(!Number.isFinite(cssSupport)||cssSupport<=0||!crop.every(Number.isFinite)||crop.length!==4||!light.every(Number.isFinite)||light.length!==3||!Number.isFinite(exposure)||exposure<=0)throw Error('REGISTERED_SUPPORT_AND_OPTICAL_INPUT_REQUIRED');
 const s=stateAt(elapsedMs),u=new Float32Array(40);u.set([width,height,s.t,background==='light'?1:0],0);u.set([caster.x,caster.y,caster.width,caster.height],4);u.set(crop,8);u.set([s.front,s.flux,s.fold,s.transitionOpacity],12);u.set([sourceOn&&s.active?1:0,observerOn?1:0,nearOn?1:0,concealedContext?1:0],16);u.set([...light,exposure],20);u.set([.46,.88,.71,1.46],24);u.set([.23,.07,.035,.28],28);u.set([2.4,1.25,cssSupport/64,projectionScale],32);u.set([s.active?1:0,s.coating,ALPHA_SUPPORT.top,ALPHA_SUPPORT.height],36);return u;
}
// Useful for CPU width/continuity tests; actual GPU output still required.
export function frontRadianceProfile({distanceCss,heightCss=64,ageMs,alpha=1,sourceOn=true}){const s=stateAt(ageMs);if(![distanceCss,heightCss,alpha].every(Number.isFinite)||heightCss<=0)throw Error('FINITE_REGISTERED_PROFILE_REQUIRED');return sourceOn&&s.active?Math.exp(-((distanceCss/(DESIGN.frontWidthCssAtH64*heightCss/64))**2))*alpha*s.flux*DESIGN.sourcePeak:0;}
export function creaseSupport({supportX,supportY,ageMs,alpha=1}){if(![supportX,supportY,ageMs,alpha].every(Number.isFinite))throw Error('FINITE_MATERIAL_COORDINATES_REQUIRED');const s=stateAt(ageMs),close=smooth((s.t-.16)/.80),leftCenter=.10+.14*close+.045*Math.sin(supportY*2.7+s.t*.9),rightCenter=.91-.18*close-.035*Math.sin(supportY*2.2+s.t*.7),leftTaper=smooth((supportY-.30)/.13)*(1-smooth((supportY-.70)/.15)),rightTaper=smooth((supportY-.48)/.13)*(1-smooth((supportY-.86)/.13));const width=141/224*64,left=Math.exp(-(((supportX-leftCenter)*width/1.2)**2))*leftTaper,right=Math.exp(-(((supportX-rightCenter)*width/.95)**2))*rightTaper;return {left:left*alpha*s.fold,right:right*alpha*s.fold*.72};}
export const PREVIEW_REGISTRATION=Object.freeze({asset:'reference/philia-front-heal-v822.png',assetSha256:'b11a26d4ea3339ec91c65ebcc78b3268063727cc98c5bbdfa2eb939eaef726c1',sourceRect:{x:0,y:0,width:256,height:256},alphaSupport:{x:57,y:16,width:141,height:224},visibleSupportHeight:64,scale:64/224,scope:'existing non-E cast sprite reference only, not main pose registration'});
export function previewCaster({widthPhysical,heightPhysical,supportHeightCss=64,dpr=1}){if(![widthPhysical,heightPhysical,supportHeightCss,dpr].every(Number.isFinite)||Math.min(widthPhysical,heightPhysical,supportHeightCss,dpr)<=0)throw Error('ACTUAL_PREVIEW_PROJECTION_REQUIRED');const scale=supportHeightCss*dpr/224;return{x:widthPhysical*.5-128*scale,y:heightPhysical*.60-239*scale,width:256*scale,height:256*scale,supportHeight:supportHeightCss};}
