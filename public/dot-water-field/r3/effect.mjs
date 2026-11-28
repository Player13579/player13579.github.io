import {VERSION,admit,stateAt} from './plan.mjs';
import {buildWaterSheet} from './mesh.mjs';
export {fillSfx} from './sfx.mjs';
export {VERSION};
export const TYPE='local-water-field-preview', LIFE=4500, HEIGHT=1.70, CSS_PX_PER_M=.7396;

export function fixtureReceipt(serial){
 const stamp=Date.now();
 return {source:'visible-hazard-field-replay',phase:'playing',stale:false,observedAt:stamp,
   field:{id:'hazard_water_fixture_'+serial,kind:'water',x:0,y:0,radius:135,createdAt:stamp-1,endsAt:stamp+LIFE-1}};
}
export function receipt(raw,now=Date.now()){
 const f=admit(raw);
 if(!f||!Number.isFinite(now)||now<f.createdAt||now>=f.endsAt)return null;
 return Object.freeze({...f,at:f.createdAt,life:f.endsAt-f.createdAt});
}
export class Mesh{
 constructor(){this.data=new Float32Array(32768);this.length=0;}
}
export function basis(){return {p:[0,0]};}
export function drawFixture(){}
export function buildReceipt(mesh,f,time,{reduced=false}={}){
 const now=f.createdAt+time, data=buildWaterSheet(f,now,{reduced}), q=stateAt(f,now,{reduced});
 if(mesh.length+data.length>mesh.data.length){
   const buffer=new Float32Array(2**Math.ceil(Math.log2(mesh.length+data.length)));buffer.set(mesh.data);mesh.data=buffer;
 }
 mesh.data.set(data,mesh.length);mesh.length+=data.length;
 return {p:[0,0],contact:[0,0],lum:q.opacity*.43,stage:data.length?(q.opacity<1?'fade':q.settled<1?'reflect-settling':'settled'):'off',
   progress:q.settled,triangles:data.length/24,branches:[]};
}
