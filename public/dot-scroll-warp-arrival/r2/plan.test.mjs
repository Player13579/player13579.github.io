import {strict as a} from 'node:assert';
import {TYPE,LIFE,admit,stateAt} from './plan.mjs';
const at=1795777800000,owner='actor',e={type:TYPE,id:'magic_e1',x:148,y:33,radius:125,playerId:owner,variant:'arrival',durationMs:0,at,targetId:'',targetX:null,targetY:null};const v={owner,now:at};
a.deepEqual(admit(e,v),{id:e.id,at,x:148,y:33,age:0});
for(const p of [{type:'action-teleport'},{type:'action-heart-teleport'},{type:'instant-warp-acquired'},{variant:''},{targetX:0},{targetY:0},{targetId:'second'},{playerId:'other'},{radius:124},{durationMs:640},{at:at-LIFE},{at:at+126},{y:NaN}])a.equal(admit({...e,...p},v),null);
for(const reduced of [false,true])for(let t=-1;t<=LIFE;t++){
 const o=stateAt(t,{reduced});
 for(const x of [o.fold,o.alpha,o.touch])a.ok(x>=0&&x<=1);
 if(t<0||t>=620)a.equal(o.alpha,0);
}
console.log('only authoritative arrival owner; no origin or destination-pair data; 1284 bounded visual samples');
const {Mesh,buildReceipt,fillSfx}=await import('./effect.mjs');
for(const reduced of [false,true])for(let t=0;t<=LIFE;t++){
 const m=new Mesh(),z=buildReceipt(m,{},t,{reduced});
 a.ok(z.triangles<=12);a.ok(m.data.subarray(0,m.length).every(Number.isFinite));
 if(t>=620)a.equal(z.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate,'arrival',9);
 a.ok(peak>.03&&peak<.36&&data.every(Number.isFinite));
 a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('1282 meshes, six audio sample rates');
