import {strict as a} from 'node:assert';
import {TYPE, LIFE, admit, phaseAt} from './plan.mjs';
const at=1795776100000,owner='the-actor',v={now:at,owner},e={id:'magic_event_1',type:TYPE, playerId:owner,x:100,y:90,at,radius:175,durationMs:1450};
for(const w of ['handgun','smg','assault','sniper']){
 const hit={...e,variant:'magazine-commit:weapon:'+w};
 a.deepEqual(admit(hit,v),{id:e.id,x:100,y:90,at,age:0});
 for(const p of [{variant:'destroyed:weapon:'+w},{variant:'impact:'+w},{variant:'magazine-commit:weapon:heavy'},{type:'action-shoot'},{playerId:'any-other'},{radius:185},{durationMs:0},{at:at-LIFE},{at:at+126}]) a.equal(admit({...hit,...p},v),null);
}
for(let t=-10;t<=LIFE+1;t++)for(const reduced of [false,true]){
 const v=phaseAt(t,{reduced}); for(const x of [v.stamp,v.pressure,v.alpha])a.ok(x>=0&&x<=1);
 if(t<0||t>=LIFE)a.equal(v.alpha,0);
}
console.log('four exact gunner variants; foreign owners, destruction, impact, normal shooting and invalid time excluded');
const {Mesh,buildReceipt,fillSfx}=await import('./effect.mjs');
for(const reduced of [false,true])for(let t=0;t<=1450;t++){
 const m=new Mesh(),z=buildReceipt(m,{},t,{reduced});
 a.ok(z.triangles<=160);a.ok(m.data.subarray(0,m.length).every(Number.isFinite));
 if(t>=1355)a.equal(z.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate,'smg',9);
 a.ok(peak>.04&&peak<.45&&data.every(Number.isFinite));
 a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('2902 meshes and six audio sample rates passed');
