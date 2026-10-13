// Sol Levitation support-volume current series R3: explicit later user grant total5.
// Old E/T/history remain intact; historical total is unknown, not reset to zero.
export const VERSION='levitation-support-volume-sol61-r3-20261013';
export const AUTHORITY=Object.freeze({humanReply:'しかしリビテーションって今まで作ってないんだから5まで作るべきじゃね',scope:'Current support-volume series total5 including first version',currentSeriesCreativeEdition:3,currentSeriesCreativeEditionLimit:5,currentSeriesCreativeEditionsRemaining:2,supersededPriorAdditionalOnlyCap:1,historicalCreativeTotal:null,oldCounterReset:false,oldEReusedAsCreativeInput:false,newSeriesR1ReusedAsCreativeInput:true});
export const ONSET_MS=360,END_MS=420,UNIFORM_BYTES=128;
export const MATERIAL=Object.freeze({color:Object.freeze([.14,.75,.86]),core:Object.freeze([.42,.90,.98]),extinction:.72,emission:2.20,flowRadiansPerSecond:1.30,opticalFraction:.14,opticalSigmaCss:1.15,supportCenterUpSpan:-.20,supportHalfHeightSpan:.22});
const finite=(x,name)=>{if(!Number.isFinite(x))throw new TypeError(name+': finite required');return x;};
const smooth=x=>{const q=Math.max(0,Math.min(1,x));return q*q*(3-2*q);};
const point=(p,name)=>{if(!p||![p.x,p.y].every(Number.isFinite))throw new TypeError(name+': actual measured airborne point required');return {x:p.x,y:p.y};};
export function validateSource(a){
 if(a?.type!=='gravity-levitation'||typeof a.id!=='string'||!a.id)throw new TypeError('explicit gravity-levitation source ID required');
 const startedAt=finite(a.startedAt,'startedAt'),bodyWorld=point(a.bodyWorld,'bodyWorld'),feetWorld=point(a.feetWorld,'feetWorld');
 if(feetWorld.y-bodyWorld.y<=.5)throw new RangeError('measured airborne body must be above measured feet');
 if(typeof a.active!=='boolean')throw new TypeError('active boolean required');
 const endedAt=a.active?null:finite(a.endedAt,'explicit endedAt');if(endedAt!==null&&endedAt<startedAt)throw new RangeError('end precedes start');
 const causeId=typeof a.causeId==='string'&&a.causeId?a.causeId:a.id+'@'+startedAt;
 const generation=a.generation??1;if(!Number.isSafeInteger(generation)||generation<1)throw new RangeError('positive generation required');
 return Object.freeze({type:a.type,id:a.id,playerId:String(a.playerId??a.id),causeId,generation,active:a.active,startedAt,endedAt,bodyWorld:Object.freeze(bodyWorld),feetWorld:Object.freeze(feetWorld)});
}
export function phaseFor(actor,nowMs,{reducedMotion=false}={}){
 const a=validateSource(actor),now=finite(nowMs,'same producer clock nowMs');
 if(now<a.startedAt)return Object.freeze({stage:'not-started',visible:false,gain:0,onset:0,end:0,flow:0,sourceAgeMs:now-a.startedAt});
 if(!a.active&&now<a.endedAt)throw new RangeError('inactive source has future endedAt');
 const age=now-a.startedAt,atEnd=a.active?age:a.endedAt-a.startedAt,rise=smooth(atEnd/ONSET_MS),end=a.active?0:Math.min(1,(now-a.endedAt)/END_MS),gain=rise*(1-smooth(end));
 const onset=smooth(Math.min(age,atEnd)/ONSET_MS),flow=reducedMotion?0:((Math.max(0,Math.min(age,atEnd)-ONSET_MS)/1000*MATERIAL.flowRadiansPerSecond)%(Math.PI*2));
 return Object.freeze({stage:!a.active&&end>=1?'expired':!a.active?'ending':age<ONSET_MS?'onset':'sustain',visible:gain>0,gain,onset,end,flow,sourceAgeMs:age});
}
// Bytes are a fresh snapshot per frame. Coordinates are actual projected body/feet,
// not a inferred floor, skeleton, gait, lift height or game-force estimate.
export function uniformFor({actor,nowMs,camera={x:0,y:0},zoom=1,width,height,pixelRatio=1,sourceOn=true,observerOn=true,reducedMotion=false}){
 const a=validateSource(actor),p=phaseFor(a,nowMs,{reducedMotion});point(camera,'camera');
 for(const [k,x]of Object.entries({zoom,width,height,pixelRatio}))finite(x,k);
 if(zoom<=0||pixelRatio<=0||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)throw new RangeError('positive physical viewport/projection required');
 for(const x of [sourceOn,observerOn,reducedMotion])if(typeof x!=='boolean')throw new TypeError('control boolean required');
 const scale=zoom*pixelRatio,project=v=>[(v.x-camera.x)*scale,(v.y-camera.y)*scale],feet=project(a.feetWorld),body=project(a.bodyWorld),span=Math.hypot(body[0]-feet[0],body[1]-feet[1]);
 if(span<1e-3)throw new RangeError('nonzero projected measured span required');
 const u=new Float32Array(32);
 u.set([width,height,pixelRatio,p.sourceAgeMs/1000],0);u.set([...feet,...body],4);
 u.set([p.onset,p.end,p.gain,p.flow],8);u.set([Number(sourceOn&&p.visible),Number(observerOn),Number(reducedMotion),Number(p.visible)],12);
 u.set([...MATERIAL.color,MATERIAL.emission],16);u.set([span,MATERIAL.extinction,.84,48],20);
 u.set([MATERIAL.opticalFraction,MATERIAL.opticalSigmaCss*pixelRatio,MATERIAL.supportCenterUpSpan,MATERIAL.supportHalfHeightSpan],24);u.set([a.generation,0,0,0],28);
 if(!u.every(Number.isFinite))throw new RangeError('projection exceeds finite float32');
 return Object.freeze({version:VERSION,sourceId:a.id,causeId:a.causeId,generation:a.generation,stage:p.stage,active:p.visible,sourceAgeMs:p.sourceAgeMs,uniform:u,uniformBytes:new Uint8Array(u.buffer.slice(0)),uniformByteLength:UNIFORM_BYTES,clockKind:'producer-transition-clock',bodyWorld:a.bodyWorld,feetWorld:a.feetWorld});
}
export function fixtureSource({nowMs=0,startedAt=0,endedAt=null,id='synthetic-levitation-support-source',generation=1,bodyWorld={x:320,y:150},feetWorld={x:320,y:182}}={}){
 return {type:'gravity-levitation',id,causeId:id+'@'+startedAt,generation,active:endedAt===null,startedAt,endedAt,bodyWorld,feetWorld,synthetic:true};
}
