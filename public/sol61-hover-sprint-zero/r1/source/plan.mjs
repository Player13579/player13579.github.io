export const VERSION='hover-sprint-zero-design-sol61-r1';
export const LIVE_MS=8000, ONSET_MS=360, END_MS=360;
const num=(x,n)=>{if(!Number.isFinite(x))throw new TypeError(n+' must be finite');return x;};
const xy=(p,n)=>Object.freeze({x:num(p?.x,n+'.x'),y:num(p?.y,n+'.y')});
const pair=(p,n)=>{if(!Array.isArray(p)||p.length!==2)throw new TypeError(n+' requires two authoritative anchors');return Object.freeze(p.map((x,i)=>xy(x,n+i)));};
const smooth=x=>{const v=Math.max(0,Math.min(1,x));return v*v*(3-2*v);};
export function freezeCause(c){
 if(!c?.causeId||!c?.actorId||!Number.isSafeInteger(c.roomGeneration)||c.roomGeneration<1)throw new TypeError('cause/actor/generation required');
 return Object.freeze({causeId:String(c.causeId),actorId:String(c.actorId),roomGeneration:c.roomGeneration,activeUntilServerMs:num(c.activeUntilServerMs,'activeUntilServerMs'),onsetLocalStartMs:c.onsetLocalStartMs==null?null:num(c.onsetLocalStartMs,'onsetLocalStartMs'),durationMs:LIVE_MS});
}
export function sampleJetState({cause,clock,geometry,alive=true,ejected=false,inVent=false,sourceOn=true,reducedMotion=false}={}){
 const localNowMs=num(clock?.localNowMs,'localNowMs'),serverNowMs=num(clock?.serverNowMs,'serverNowMs'),flowAgeMs=num(clock?.flowAgeMs,'caller-owned flowAgeMs');
 const feet=pair(geometry?.feet,'feet'),back=pair(geometry?.back,'back'),raw=xy(geometry?.heading,'heading'),m=Math.hypot(raw.x,raw.y);
 if(m<1e-6)throw new TypeError('heading must be nonzero');
 const heading=Object.freeze({x:raw.x/m,y:raw.y/m});
 const remainingMs=cause.activeUntilServerMs-serverNowMs;
 const localOnsetAge=cause.onsetLocalStartMs===null?null:localNowMs-cause.onsetLocalStartMs;
 const active=Boolean(alive&&!ejected&&!inVent&&sourceOn&&remainingMs>0);
 const onset=active&&localOnsetAge!==null&&localOnsetAge>=0&&localOnsetAge<ONSET_MS;
 const phase=!active?'off':onset?'onset':remainingMs<=END_MS?'end':'sustain';
 const endGain=phase==='end'?smooth(remainingMs/END_MS):1;
 const ignition=phase==='onset'?1+.75*(1-smooth(localOnsetAge/ONSET_MS)):1;
 const growth=phase==='onset'?.25+.75*smooth((localOnsetAge+45)/405):phase==='end'?.55+.45*endGain:1;
 return Object.freeze({version:VERSION,causeId:cause.causeId,actorId:cause.actorId,roomGeneration:cause.roomGeneration,active,phase,remainingMs,localOnsetAge,flowAgeMs,feet,back,heading,gain:active?endGain*ignition:0,lengthGain:active?growth:0,reducedMotion:Boolean(reducedMotion),sourceOn:Boolean(sourceOn)});
}
export function makeFixture(variant='normal',ageMs=1800,heading={x:1,y:0}){
 if(!['normal','reduced'].includes(variant))throw new TypeError('normal/reduced only; no invented HS GBO');
 const direction=xy(heading,'fixture heading'),m=Math.hypot(direction.x,direction.y);if(m<1e-6)throw new TypeError('nonzero heading');
 const n={x:-direction.y/m,y:direction.x/m},P={x:200,y:128};
 const anchors=(y,spacing)=>[-1,1].map(sign=>({x:P.x+n.x*spacing*sign,y:P.y+y+n.y*spacing*sign}));
 return {cause:freezeCause({causeId:'hs-zero-synthetic-1',actorId:'hs-synthetic-actor',roomGeneration:1,activeUntilServerMs:18000,onsetLocalStartMs:500}),clock:{localNowMs:500+ageMs,serverNowMs:10000+ageMs,flowAgeMs:ageMs},geometry:{feet:anchors(25.24,6),back:anchors(7.24,8),heading:direction},alive:true,ejected:false,inVent:false,sourceOn:true,reducedMotion:variant==='reduced'};
}
export function packUniforms(input,view={},controls={}){
 const s=sampleJetState(input),width=num(view.width??384,'view width'),height=num(view.height??256,'view height'),scale=num(view.scale??1,'world projection scale');
 if(width<=0||height<=0||scale<=0)throw new TypeError('positive view dimensions');
 const camera=xy(view.camera??{x:0,y:0},'camera'),origin=xy(view.origin??{x:0,y:0},'view origin');
 const project=p=>({x:origin.x+(p.x-camera.x)*scale,y:origin.y+(p.y-camera.y)*scale});
 const u=new Float32Array(40);u.set([width,height,scale,s.flowAgeMs,s.remainingMs,s.localOnsetAge??-1,s.active?1:0,s.reducedMotion?1:0,s.heading.x,s.heading.y,s.gain,s.lengthGain]);
 [...s.feet,...s.back].forEach((p,i)=>{const q=project(p);u.set([q.x,q.y,i<2?0:1,i*.9],12+i*4);});
 u.set([.012,.018,.025,1,controls.bodyOn===false?0:1,controls.emitterOn===false?0:1,controls.nearOn===false?0:1,controls.postOn===false?0:1],28);
 return u;
}
export function receiverIrradiance(input,worldPoint){
 const s=sampleJetState(input),q=xy(worldPoint,'receiver point');
 if(!s.active)return Object.freeze([0,0,0]);
 let light=0;for(const p of [...s.feet,...s.back])light+=Math.exp(-((q.x-p.x)**2+(q.y-p.y)**2)/(9*9))*s.gain;
 // Caller applies this to an actual registered receiving material. This does not invent a body mesh.
 return Object.freeze([light*.15,light*.32,light*.20]);
}
