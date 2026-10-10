export const META=Object.freeze({groupID:'gunner-aim-acquisition-sol61',versionID:'gunner-aim-acquisition-sol61-r1',title:'ガンナー照準ロック',edition:1,durationMs:900,creativeCap:{maximum:5,consumed:1,remaining:4},authorDisplayName:'GPT-6.1-Sol'});
export const VARIANTS=Object.freeze(['handgun','smg','assault','sniper','taser']);
export function validateSource(s){
 if(!s||s.type!=='gunner-passive-aim'||!String(s.id||'')||!String(s.playerId||'')||!String(s.targetId||'')||!VARIANTS.includes(s.variant)||s.duration!==900||s.durationMs!==900||![s.x,s.y,s.targetX,s.targetY,s.startedAt].every(Number.isFinite))return false;
 return s.playerId!==s.targetId;
}
export function makeFixtureSource(serial=1,variant='handgun',startedAt=0){return {id:`aim-fixture-${serial}`,cause:`aim-fixture-${serial}`,type:'gunner-passive-aim',playerId:'fixture-gunner',targetId:'fixture-visible-living-target',variant,x:150,y:160,targetX:420,targetY:160,startedAt,duration:900,durationMs:900,fixture:true};}
export function plan(s,age,fixtureHeight=64){if(!validateSource(s)||!Number.isFinite(age)||![64,128].includes(fixtureHeight))throw new TypeError('Invalid source/age/fixture');return {active:age>=0&&age<900,ageMs:age,progress:age/900,phase:age<0?'before':age<210?'acquiring':age<430?'confirmed':age<670?'locked':age<900?'release':'expired',source:structuredClone(s),fixtureHeight,scale:fixtureHeight/64};}
export function synthesizeLock(sampleRate=48000){
 const frames=Math.round(sampleRate*.145),pcm=new Float32Array(frames);let seed=19477;
 for(let i=0;i<frames;i++){const t=i/sampleRate;seed=(Math.imul(seed,1664525)+1013904223)|0; const n=(seed>>>0)/4294967296*2-1;
 const latch=n*Math.exp(-t*240)*.22 + Math.sin(2*Math.PI*1780*t)*Math.exp(-t*115)*.13;
 const gate=t>=.018&&t<.105?Math.sin(Math.PI*(t-.018)/.087)**2:0;
 const electronic=(Math.sin(2*Math.PI*1180*t)*.11+Math.sin(2*Math.PI*2360*t)*.035)*gate;
 pcm[i]=latch+electronic; }return pcm;
}
export function createAudio({verify=false,AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext}={}){
 let context=null,muted=verify,unlocked=false,disposed=false;const heard=new Set(),events=[],nodes=new Set();
 function snapshot(){return {verify,muted,unlocked,contextState:context?.state||'not-created',events:structuredClone(events),activeNodes:nodes.size};}
 async function unlock(){if(verify||disposed)return {ok:false,reason:verify?'verify-hard-mute':'disposed',snapshot:snapshot()};if(!AudioContextClass)return {ok:false,reason:'unsupported',snapshot:snapshot()};context??=new AudioContextClass();try{await context.resume();}catch(e){events.push({kind:'unlock-error',message:String(e)});return {ok:false,reason:'resume-rejected',snapshot:snapshot()};}unlocked=!disposed&&context.state==='running';return {ok:unlocked,reason:unlocked?'running':'not-running',snapshot:snapshot()};}
 function mute(value){muted=verify||Boolean(value);if(muted)for(const n of nodes){try{n.stop();}catch{}}return {ok:!verify||Boolean(value),reason:verify?'verify-hard-mute':'updated',snapshot:snapshot()};}
 function play(source,age){if(disposed||verify||muted||!unlocked||context?.state!=='running'||!validateSource(source)||age<0||age>=900||heard.has(source.id))return false;
 const pcm=synthesizeLock(context.sampleRate),buffer=context.createBuffer(1,pcm.length,context.sampleRate);buffer.getChannelData(0).set(pcm);const node=context.createBufferSource();node.buffer=buffer;node.connect(context.destination);node.onended=()=>{nodes.delete(node);node.disconnect();};nodes.add(node);node.start();heard.add(source.id);events.push({kind:'lock',cause:source.id,playerId:source.playerId,targetId:source.targetId,variant:source.variant,ageMs:age,atAudioTime:context.currentTime,synthesized:true});if(events.length>128)events.shift();return true;}
 async function dispose(){disposed=true;mute(true);if(context)await context.close();unlocked=false;}
 return {snapshot,unlock,mute,play,dispose};
}
