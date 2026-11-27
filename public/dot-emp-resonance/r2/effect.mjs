import {VERSION,admit,stateAt,LIFE} from './plan.mjs';
import {buildBridge} from './mesh.mjs';
export {fillSfx} from './sfx.mjs';
export {VERSION,LIFE};
export const TYPE='local-emp-resonance-preview', HEIGHT=1.7, CSS_PX_PER_M=64/HEIGHT;
export function fixtureReceipt(serial){
 const stamp=Date.now();
 return {source:'visible-magic-event-replay',phase:'playing',stale:false,observedAt:stamp,event:{
 id:'magic_emp_resonance_fixture_'+serial,type:'emp-resonance',variant:'positive',radius:520,durationMs:0,at:stamp-1,x:0,y:0,empSourceAxis:.24,resolvedEmpPulseIds:['fixture-east','fixture-west']}};
}
export function receipt(raw,now=Date.now()){
 const e=admit(raw);
 if(!e||!Number.isFinite(now)||now<e.at||now>=e.at+LIFE)return null;
 return Object.freeze({...e,life:LIFE});
}
export class Mesh{constructor(){this.data=new Float32Array(16384);this.length=0;}}
export function basis(){return {p:[0,0]};}
export function drawFixture(){}
export function buildReceipt(mesh,e,t,{reduced=false}={}){
 const data=buildBridge(e,t,{reduced}),q=stateAt(t,{reduced});
 if(mesh.length+data.length>mesh.data.length){
  const b=new Float32Array(2**Math.ceil(Math.log2(mesh.length+data.length)));b.set(mesh.data);mesh.data=b;
 }
 mesh.data.set(data,mesh.length);mesh.length+=data.length;
 return {p:[0,0],contact:[0,0],lum:q.alpha*(.22+.4*q.contact),triangles:data.length/24,progress:q.reach,
 stage:!data.length?'off':t<330?'interlocking':t<510?'shared-seam':'afterglow',branches:[]};
}
