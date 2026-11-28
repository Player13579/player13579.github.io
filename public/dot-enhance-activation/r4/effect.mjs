import {VERSION,admit,stateAt,LIFE} from './plan.mjs';
import {buildMarker} from './mesh.mjs';
export {fillSfx} from './sfx.mjs';
export {VERSION,LIFE};
export const TYPE='local-enhance-activation-preview', HEIGHT=1.7, CSS_PX_PER_M=64/HEIGHT;
export function fixtureReceipt(serial){
 const stamp=Date.now();
 return {source:'visible-magic-event-replay',phase:'playing',stale:false,observedAt:stamp,
 actor:{id:'fixture-enhance',alive:true,ejected:false,inVent:false,invisible:false},
 event:{id:'magic_enhance_fixture_'+serial,type:'enhance-activation',variant:'gesture:sample-'+serial,
 playerId:'fixture-enhance',radius:0,markerCount:1,durationMs:1200,at:stamp-1,x:0,y:0}};
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
 const data=buildMarker(e,t,{reduced}),q=stateAt(t,{reduced});
 if(mesh.length+data.length>mesh.data.length){
  const b=new Float32Array(2**Math.ceil(Math.log2(mesh.length+data.length)));b.set(mesh.data);mesh.data=b;
 }
 mesh.data.set(data,mesh.length);mesh.length+=data.length;
 return {p:[0,0],contact:[0,0],lum:q.alpha*(.22+.4*q.contact),triangles:data.length/24,progress:q.reach,
 stage:!data.length?'off':t<196?'imprint':t<623?'settle':'dissolve',branches:[]};
}
