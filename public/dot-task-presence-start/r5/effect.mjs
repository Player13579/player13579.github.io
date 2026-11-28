import {VERSION,admit,stateAt,LIFE} from './plan.mjs';
import {buildPresence} from './mesh.mjs';
export {fillSfx} from './sfx.mjs';
export {VERSION,LIFE};
export const TYPE='local-task-presence-start-preview', HEIGHT=1.7, CSS_PX_PER_M=64/HEIGHT;
export function fixtureReceipt(serial){
 const stamp=Date.now(), taskId='task_sample_'+serial;
 return {source:'self-task-presence-replay',stale:false,viewerId:'fixture-self',observedAt:stamp,snapshot:{
   roomId:'fixture-room',phase:'playing',selfId:'fixture-self',
   self:{id:'fixture-self',role:'defender',special:'fighter',alive:true,ejected:false,inVent:false,
      taskPresenceTaskId:taskId,taskPresenceSince:stamp-1,tasks:[{id:taskId,done:false}]}
 }};
}
export function receipt(raw,now=Date.now()){
 const e=admit(raw);
 if(!e||!Number.isFinite(now)||now<e.at||now>=e.at+LIFE)return null;
 return Object.freeze({...e,life:LIFE});
}
export class Mesh{constructor(){this.data=new Float32Array(16384);this.length=0;}}
export function basis(){return {p:[0,0]};}
export function drawFixture(mesh){
  const col=[.099,.137,.17,.78,0,0];
  const points=[[-.17,.18],[.17,.18],[.23,.57],[-.17,.18],[.23,.57],[-.23,.57],
    [-.124,.18],[.124,.18],[.123,.02],[-.124,.18],[.123,.02],[-.123,.02]];
  for(const [x,y] of points){mesh.data.set([x,y,...col],mesh.length);mesh.length+=8;}
}
export function buildReceipt(mesh,e,t,{reduced=false}={}){
 const data=buildPresence(e,t,{reduced}),q=stateAt(t,{reduced});
 if(mesh.length+data.length>mesh.data.length){
  const b=new Float32Array(2**Math.ceil(Math.log2(mesh.length+data.length)));b.set(mesh.data);mesh.data=b;
 }
 mesh.data.set(data,mesh.length);mesh.length+=data.length;
 return {p:[0,0],contact:[0,0],lum:q.alpha*(.22+.4*q.contact),triangles:data.length/24,progress:q.reach,
 stage:!data.length?'off':t<370?'contact-spread':'rest',branches:[]};
}
