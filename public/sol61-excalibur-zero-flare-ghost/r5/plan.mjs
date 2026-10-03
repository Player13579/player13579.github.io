export const VERSION='excalibur-zero-flare-ghost-sol61-r5';
export const DURATION_MS=1200;
export const VARIANTS=Object.freeze({normal:Object.freeze({halfWidth:36,radiusMetadata:900}),GBO:Object.freeze({halfWidth:58,radiusMetadata:9000})});
const finite=(v,n)=>{if(!Number.isFinite(v))throw new TypeError(n);return v;};
const point=(p,n)=>Object.freeze({x:finite(p?.x,n+'.x'),y:finite(p?.y,n+'.y')});
const smooth=(a,b,t)=>{const q=Math.max(0,Math.min(1,(t-a)/(b-a)));return q*q*(3-2*q);};
export function freezeReceipt(input){
 const source=point(input.source,'source'),pathEnd=point(input.pathEnd,'pathEnd'),direction=point(input.direction,'direction');
 if(Math.abs(Math.hypot(direction.x,direction.y)-1)>1e-6)throw new TypeError('normalized direction required');
 const dx=pathEnd.x-source.x,dy=pathEnd.y-source.y,L=dx*direction.x+dy*direction.y;
 if(L<=0||Math.abs(dx*direction.y-dy*direction.x)>1e-5)throw new TypeError('authoritative ray endpoint required');
 if(!VARIANTS[input.variant])throw new TypeError('receipt variant normal/GBO required');
 if(!input.causeId||!input.handSnapshotId)throw new TypeError('cause and frozen hand snapshot required');
 return Object.freeze({causeId:String(input.causeId),handSnapshotId:String(input.handSnapshotId),source,pathEnd,direction,variant:input.variant,pathLength:L,deathBinding:'unaccepted-game-binding'});
}
export function makeFixture(variant='normal'){return freezeReceipt({causeId:'gallery-synthetic-1',handSnapshotId:'aligned-synthetic-hand-1',source:{x:0,y:0},pathEnd:{x:720,y:0},direction:{x:1,y:0},variant});}
export function sample(receipt,effectAgeMs,controls={}){
 finite(effectAgeMs,'caller-owned effect age');
 const age=Math.max(0,effectAgeMs),alive=age<DURATION_MS,reducedMotion=controls.reducedMotion===true;
 const front=1-Math.pow(1-Math.min(1,Math.max(0,(age-45)/475)),2);
 const gain=alive?Math.min(1,age/55)*Math.pow(Math.max(0,1-age/1200),0.7):0;
 return Object.freeze({version:VERSION,effectAgeMs:age,alive,frontFraction:reducedMotion?1:front,releaseFraction:reducedMotion?0:smooth(560,1130,age),materialAgeMs:reducedMotion?180:age,emissionGain:gain,source:receipt.source,pathEnd:receipt.pathEnd,direction:receipt.direction,pathLength:receipt.pathLength,halfWidth:VARIANTS[receipt.variant].halfWidth,reducedMotion,sourceOn:controls.sourceOn!==false,sourceVisibility:Math.min(1,Math.max(0,finite(controls.sourceVisibility??1,'finite source visibility'))),postOn:controls.postOn!==false,flareOn:controls.flareOn!==false,ghostOn:controls.ghostOn!==false,nearOn:controls.nearOn!==false});
}
export function packUniforms(receipt,effectAgeMs,view={},controls={}){
 const width=finite(view.width??960,'width'),height=finite(view.height??480,'height'),scale=finite(view.scale??0.9,'scale');
 if(width<=0||height<=0||scale<=0)throw new TypeError('positive view dimensions/scale');
 const hand=point(view.hand??{x:width*.18,y:height*.62},'projected hand'),center=point(controls.opticalCenter??{x:width*.5,y:height*.5},'optical center');
 const s=sample(receipt,effectAgeMs,controls),end={x:hand.x+receipt.direction.x*receipt.pathLength*scale,y:hand.y+receipt.direction.y*receipt.pathLength*scale};
 const u=new Float32Array(32);
 u.set([width,height,s.effectAgeMs,s.sourceOn?1:0,hand.x,hand.y,end.x,end.y,receipt.direction.x,receipt.direction.y,s.halfWidth*scale,scale,center.x,center.y,s.sourceVisibility,s.postOn?1:0,s.flareOn?1:0,s.ghostOn?1:0,s.nearOn?1:0,s.reducedMotion?1:0,.025,.035,.06,1],0);
 return u;
}
